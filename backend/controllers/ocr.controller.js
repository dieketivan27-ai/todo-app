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

const MODEL_NAME = 'gemini-2.0-flash';

const analyzeDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier image fourni' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'VOTRE_CLE_GEMINI_ICI') {
      return res.status(503).json({
        success: false,
        message: 'Clé API Gemini non configurée. Ajoutez GEMINI_API_KEY dans le fichier .env du backend.'
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
        message: 'Impossible de parser la réponse IA. Essayez avec une image plus nette ou un document mieux structuré.',
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

    // Clé API invalide
    if (err.message?.includes('API_KEY') || err.message?.includes('API key') || err.status === 401 || err.status === 403) {
      return res.status(401).json({
        success: false,
        message: 'Clé API Gemini invalide ou expirée. Vérifiez GEMINI_API_KEY dans le fichier .env du backend.'
      });
    }

    // Modèle introuvable / quota dépassé
    if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('not supported')) {
      return res.status(503).json({
        success: false,
        message: `Le modèle IA (${MODEL_NAME}) est temporairement indisponible. Réessayez dans quelques instants.`
      });
    }

    // Quota / limite de taux
    if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({
        success: false,
        message: 'Limite de requêtes Gemini atteinte. Attendez quelques secondes puis réessayez.'
      });
    }

    // Fichier image non supporté
    if (err.message?.includes('image') || err.message?.includes('INVALID_ARGUMENT')) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'image non supporté. Utilisez JPG, PNG ou WEBP, et assurez-vous que le fichier n\'est pas corrompu.'
      });
    }

    // Erreur générique
    return res.status(500).json({
      success: false,
      message: 'Une erreur est survenue lors de l\'analyse du document. Vérifiez votre connexion et réessayez.'
    });
  }
};

module.exports = { analyzeDocument };
