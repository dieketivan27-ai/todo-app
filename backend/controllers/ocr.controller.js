const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const MODEL_NAME = 'gemini-2.5-flash';

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

    // Read image file as base64
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');
    const mimeType = req.file.mimetype;

    // Call Gemini Vision with new @google/genai SDK
    const response = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

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

    return res.json({
      success: true,
      data: parsed
    });

  } catch (err) {
    console.error('OCR error:', err);

    // Clean up temp file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }

    const errorMsg = (err.message || '').toLowerCase();

    if (errorMsg.includes('api_key') || errorMsg.includes('api key') || err.status === 401 || err.status === 403) {
      return res.status(401).json({
        success: false,
        message: 'L\'accès au service IA est refusé (clé API invalide ou expirée).'
      });
    }

    if (err.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported') || errorMsg.includes('invalid_argument')) {
      return res.status(503).json({
        success: false,
        message: `L'analyse a échoué car le modèle IA utilisé est introuvable ou incompatible. Veuillez contacter le support.`
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
