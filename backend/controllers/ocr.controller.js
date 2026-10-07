const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const sharp = require('sharp');
const { randomUUID } = require('crypto');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_IMAGE_PX      = 2000;
const MAX_IMAGE_KB      = 3000;
const JPEG_QUALITY_HIGH = 90;
const JPEG_QUALITY_MIN  = 65;
const GEMINI_TIMEOUT_MS = 95000;   // 95s — no Render timeout constraint with async
const TASK_TTL_MS       = 10 * 60 * 1000; // tasks live 10 min in memory

// ─── In-memory task store ─────────────────────────────────────────────────────
// { [taskId]: { status, result, error, createdAt } }
const tasks = new Map();

// Auto-clean stale tasks every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - TASK_TTL_MS;
  for (const [id, task] of tasks) {
    if (task.createdAt < cutoff) tasks.delete(id);
  }
}, 5 * 60 * 1000);

// ─── Prompt ───────────────────────────────────────────────────────────────────
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

// ─── Image compression ────────────────────────────────────────────────────────
async function compressImage(inputBuffer) {
  const meta = await sharp(inputBuffer).metadata();
  const originalKB = Math.round(inputBuffer.length / 1024);
  console.log(`[OCR] Image reçue : ${originalKB} Ko, ${meta.width}x${meta.height}px (format: ${meta.format})`);

  const needsResize = (meta.width || 0) > MAX_IMAGE_PX || (meta.height || 0) > MAX_IMAGE_PX;
  let pipeline = sharp(inputBuffer).rotate();

  if (needsResize) {
    pipeline = pipeline.resize(MAX_IMAGE_PX, MAX_IMAGE_PX, { fit: 'inside', withoutEnlargement: true });
    console.log(`[OCR] Redimensionnement : → ${MAX_IMAGE_PX}px max`);
  }

  let quality = JPEG_QUALITY_HIGH;
  let outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  while (outputBuffer.length > MAX_IMAGE_KB * 1024 && quality > JPEG_QUALITY_MIN) {
    quality -= 10;
    outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(MAX_IMAGE_PX, MAX_IMAGE_PX, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }

  const finalKB = Math.round(outputBuffer.length / 1024);
  const saving  = Math.round((1 - finalKB / originalKB) * 100);
  console.log(`[OCR] Image compressée : ${finalKB} Ko (qualité: ${quality}%) — gain: ${saving}%`);

  return { buffer: outputBuffer, mimeType: 'image/jpeg' };
}

// ─── Timeout helper ───────────────────────────────────────────────────────────
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

// ─── Background Gemini processing ─────────────────────────────────────────────
async function runGeminiInBackground(taskId, imageBuffer, mimeType, tempFilePath) {
  const base64Image = imageBuffer.toString('base64');
  const modelsToTry = [MODEL_NAME, 'gemini-2.5-flash'];
  let response;
  let finalModel = null;

  try {
    for (const [modelIndex, modelName] of modelsToTry.entries()) {
      let retries = 0;
      const maxRetries = modelIndex === 0 ? 3 : 2; // 3 retries for primary, 2 for fallback
      const delays = [3000, 6000, 12000];
      let success = false;

      while (true) {
        try {
          response = await withTimeout(
            genAI.models.generateContent({
              model: modelName,
              contents: [{ parts: [{ text: PROMPT }, { inlineData: { data: base64Image, mimeType } }] }]
            }),
            GEMINI_TIMEOUT_MS
          );
          success = true;
          finalModel = modelName;
          break; // success
        } catch (apiErr) {
          const errorMsg = (apiErr.message || '').toLowerCase();
          const isOverload =
            apiErr.isTimeout || apiErr.status === 503 || apiErr.status === 429 ||
            errorMsg.includes('unavailable') || errorMsg.includes('high demand') ||
            errorMsg.includes('quota') || errorMsg.includes('exhausted');

          if (isOverload && retries < maxRetries) {
            console.warn(`[OCR:${taskId}] Surcharge ${modelName} (tentative ${retries + 1}/${maxRetries}). Retry dans ${delays[retries]}ms...`);
            await new Promise(r => setTimeout(r, delays[retries]));
            retries++;
          } else if (isOverload && modelIndex < modelsToTry.length - 1) {
            console.warn(`[OCR:${taskId}] Echec des tentatives sur ${modelName}. Basculement sur modèle de secours...`);
            break; // break inner loop to try next model
          } else {
            throw apiErr; // Not an overload, or out of models/retries
          }
        }
      }

      if (success) break;
    }

    if (!response) {
      throw new Error("OVERLOAD_FATAL");
    }

    const text = response.text.trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      tasks.set(taskId, {
        ...tasks.get(taskId),
        status: 'failed',
        error: 'L\'IA n\'a pas pu extraire des objectifs valides depuis ce document. Essayez avec une image plus claire.'
      });
      return;
    }

    if (parsed.error) {
      tasks.set(taskId, { ...tasks.get(taskId), status: 'failed', error: parsed.error });
      return;
    }

    tasks.set(taskId, { ...tasks.get(taskId), status: 'completed', result: parsed });
    console.log(`[OCR:${taskId}] ✓ Terminé avec ${parsed.goals?.length || 0} objectif(s) via ${finalModel}.`);

  } catch (err) {
    console.error(`[OCR:${taskId}] Erreur:`, err.message);
    const errorMsg = (err.message || '').toLowerCase();

    let userMessage;
    if (err.message === 'OVERLOAD_FATAL' || err.isTimeout || err.status === 503 || err.status === 429 || errorMsg.includes('unavailable') || errorMsg.includes('high demand') || errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
      userMessage = "Le service d'analyse est temporairement surchargé, veuillez réessayer dans quelques minutes.";
    } else if (errorMsg.includes('api_key') || err.status === 401 || err.status === 403) {
      userMessage = 'Clé API Gemini invalide ou expirée.';
    } else if (err.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
      userMessage = 'Le modèle IA est introuvable. Veuillez contacter le support.';
    } else {
      userMessage = 'Une erreur de communication avec l\'IA est survenue. Réessayez.';
    }

    tasks.set(taskId, { ...tasks.get(taskId), status: 'failed', error: userMessage });
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/ocr/analyze
 * Accepts an image, compresses it, and fires background Gemini processing.
 * Returns immediately with { taskId, status: 'pending' }.
 */
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

    const taskId = randomUUID();
    tasks.set(taskId, { status: 'pending', result: null, error: null, createdAt: Date.now() });

    // Read and compress image synchronously before returning (fast operation)
    const rawBuffer = fs.readFileSync(req.file.path);
    const { buffer: imageBuffer, mimeType } = await compressImage(rawBuffer);

    // Fire background processing — do NOT await
    runGeminiInBackground(taskId, imageBuffer, mimeType, req.file.path);

    console.log(`[OCR:${taskId}] Tâche créée, traitement en arrière-plan...`);

    return res.json({ success: true, taskId, status: 'pending' });

  } catch (err) {
    console.error('[OCR] Erreur lors de la création de la tâche:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(500).json({
      success: false,
      message: 'Impossible de démarrer l\'analyse. Vérifiez votre connexion et réessayez.'
    });
  }
};

/**
 * GET /api/ocr/status/:taskId
 * Returns current task status: pending | completed | failed
 */
const getTaskStatus = (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ success: false, message: 'Tâche introuvable ou expirée.' });
  }

  if (task.status === 'completed') {
    return res.json({ success: true, status: 'completed', data: task.result });
  }

  if (task.status === 'failed') {
    return res.json({ success: true, status: 'failed', message: task.error });
  }

  return res.json({ success: true, status: 'pending' });
};

module.exports = { analyzeDocument, getTaskStatus };
