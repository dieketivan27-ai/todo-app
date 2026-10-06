const express = require('express');
const router = express.Router();
const DailyMetrics = require('../models/daily_metrics.model');

// Récupérer les métriques du jour
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let metrics = await DailyMetrics.findOne({ where: { user_id: req.user.id, date: today } });
    
    if (!metrics) {
      metrics = await DailyMetrics.create({ user_id: req.user.id, date: today });
    }
    
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
