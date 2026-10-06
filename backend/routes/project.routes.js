const express = require('express');
const router = express.Router();
const Project = require('../models/project.model');

// Récupérer tous les projets de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { user_id: req.user.id } });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Créer un projet
router.post('/', async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, user_id: req.user.id });
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur création projet' });
  }
});

module.exports = router;
