const express = require('express');
const multer = require('multer');
const path = require('path');
const { analyzeDocument, getTaskStatus } = require('../controllers/ocr.controller');

const router = express.Router();

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, require('os').tmpdir());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'ocr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// POST /api/ocr/analyze — submit image, returns { taskId, status: 'pending' }
router.post('/analyze', upload.single('image'), analyzeDocument);

// GET /api/ocr/status/:taskId — poll for result
router.get('/status/:taskId', getTaskStatus);

module.exports = router;

