const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const sharp = require('sharp');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Image limits before sending to Gemini
const MAX_IMAGE_PX  = 1600;  // max width or height in pixels
const MAX_IMAGE_KB  = 1500;  // max size in KB (~1.5 MB)
const GEMINI_TIMEOUT_MS = 25000; // 25s — below Render's 30s timeout

const PROMPT = `Tu es un assistant expert en extraction de données structurées depuis des documents RH et de planification.

Analyse cette image de document et extrait toutes les informations relatives aux objectifs annuels, actions et indicateurs.

Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans backticks) avec cette structure exacte :
{
  "goals": [
    {
      "title": "Titre court et clair de l'objectif (max 80 caractères)",
      "description": "Description complète de l'objectif tel qu'écrit dans le document",
      "category": "Une des valeurs: Général, Travail, Personnel, Dev, Études, Réunions, Administratif, Santé, Projets",
      "annual_target": 365,
      "color": "#6366f1",
      "actions": ["Action 1 extraite du document", "Action 2", "Action 3"]
    }
  ],
  "documentType": "type de document détecté (ex: Évaluation annuelle, Plan d'objectifs, etc.)",
  "year": 2026,
  "rawText": "Texte brut principal extrait du document"
}

Règles importantes:
- Si le document contient plusieurs objectifs, liste-les tous dans le tableau "goals"
- Pour "annual_target", estime un nombre réaliste de tâches/actions pour l'année (entre 12 et 365)
- Pour "category", choisis la plus pertinente selon le contexte
- Pour "color", assigne une couleur différente à chaque objectif parmi: #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6, #f43f5e, #14b8a6
- Extrait TOUT le texte visible même si partiellement illisible
- Si tu ne peux pas lire l'image ou qu'elle ne contient pas d'objectifs, retourne: {"error": "Aucun objectif trouvé dans ce document"}`;

const MODEL_NAME = 'gemini-3.8-flash';

/**
 * Compress and resize an image buffer using sharp.
 * Ensures the image fits within MAX_IMAGE_PX and MAX_IMAGE_KB.
 * Returns { buffer, mimeType } with the optimized image.
 */
async function compressImage(inputBuffer) {
  let img = sharp(inputBuffer).rotate(); // auto-orient from EXIF

  const meta = await img.metadata();
  const originalKB = Math.round(inputBuffer.length / 1024);
  console.log(`[OCR] Image reçue : ${originalKB} Ko, ${meta.width}x${meta.height}px`);

  // Resize only if necessary
  if (meta.width > MAX_IMAGE_PX || meta.height > MAX_IMAGE_PX) {
    img = img.resize(MAX_IMAGE_PX, MAX_IMAGE_PX, { fit: 'inside', withoutEnlargement: true });
  }

  // Convert to JPEG and compress
  let quality = 85;
  let outputBuffer = await img.jpeg({ quality }).toBuffer();

  // Reduce quality further if still too large
  while (outputBuffer.length > MAX_IMAGE_KB * 1024 && quality > 40) {
    quality -= 15;
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(MAX_IMAGE_PX, MAX_IMAGE_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  const finalKB = Math.round(outputBuffer.length / 1024);
  console.log(`[OCR] Image compressée : ${finalKB} Ko (qualité JPEG: ${quality}%)`);

  return { buffer: outputBuffer, mimeType: 'image/jpeg' };
}

/**
 * Wraps a promise with an AbortController-based timeout.
 * Throws a specific TIMEOUT error if the deadline is exceeded.
 */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('GEMINI_TIMEOUT');
      err.isTimeout = true;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const analyzeDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier image fourni' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'VOTRE_CLE_GEMINI_ICI') {
      return res.status(503).json({
        success: false,
        message: 'Configuration manquante : Clé API Gemini non configurée sur le serveur.'
      });
    }

    // Read and compress image
    const rawBuffer = fs.readFileSync(req.file.path);
    const { buffer: imageBuffer, mimeType } = await compressImage(rawBuffer);
    const base64Image = imageBuffer.toString('base64');

    // Call Gemini with exponential backoff retry
    let response;
    let retries = 0;
    const maxRetries = 3;
    const delays = [2000, 4000, 8000];

    while (true) {
      try {
        response = await withTimeout(
          genAI.models.generateContent({
            model: MODEL_NAME,
            contents: [
              {
                parts: [
                  { text: PROMPT },
                  { inlineData: { data: base64Image, mimeType } }
                ]
              }
            ]
          }),
          GEMINI_TIMEOUT_MS
        );
        break; // Success
      } catch (apiErr) {
        // Timeout: do not retry
        if (apiErr.isTimeout) throw apiErr;

        const errorMsg = (apiErr.message || '').toLowerCase();
        const isOverload =
          apiErr.status === 503 || apiErr.status === 429 ||
          errorMsg.includes('unavailable') || errorMsg.includes('high demand') ||
          errorMsg.includes('quota') || errorMsg.includes('exhausted');

        if (isOverload && retries < maxRetries) {
          console.warn(`[OCR] Surcharge Gemini (tentative ${retries + 1}/${maxRetries}). Retry dans ${delays[retries]}ms...`);
          await new Promise(resolve => setTimeout(resolve, delays[retries]));
          retries++;
        } else {
          throw apiErr; // Other error or max retries: propagate
        }
      }
    }

    const text = response.text.trim();

    // Clean potential markdown code blocks
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, '\nRaw text:', text);
      return res.status(422).json({
        success: false,
        message: 'L\'IA n\'a pas pu extraire des objectifs valides depuis ce document. Veuillez essayer avec une image plus claire.',
        rawResponse: text
      });
    }

    if (parsed.error) {
      return res.status(422).json({ success: false, message: parsed.error });
    }

    // Clean up temp file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('OCR error:', err.message || err);

    // Clean up temp file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }

    // Timeout (25s exceeded)
    if (err.isTimeout) {
      return res.status(504).json({
        success: false,
        message: 'Le traitement de l\'image a pris trop de temps. Essayez avec une image plus légère ou réessayez dans quelques instants.'
      });
    }

    const errorMsg = (err.message || '').toLowerCase();

    if (errorMsg.includes('api_key') || errorMsg.includes('api key') || err.status === 401 || err.status === 403) {
      return res.status(401).json({
        success: false,
        message: 'L\'accès au service IA est refusé (clé API invalide ou expirée).'
      });
    }

    if (err.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
      return res.status(503).json({
        success: false,
        message: 'Le modèle IA est introuvable ou incompatible. Veuillez contacter le support.'
      });
    }

    if (err.status === 429 || errorMsg.includes('quota') || errorMsg.includes('exhausted') || errorMsg.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        message: 'Le service IA est actuellement surchargé. Veuillez patienter quelques instants avant de réessayer.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Une erreur de communication avec l\'IA est survenue. Veuillez vérifier votre connexion et réessayer.'
    });
  }
};

module.exports = { analyzeDocument };
