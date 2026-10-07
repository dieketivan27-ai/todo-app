const express = require('express');
const router = express.Router();
const { getWeek } = require('../controllers/planning.controller');

router.get('/week', getWeek);

module.exports = router;
