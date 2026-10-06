const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', notificationController.getAll);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.delete);

module.exports = router;
