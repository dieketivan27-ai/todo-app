const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  markAsDone,
  markInProgress,
  getStats
} = require('../controllers/task.controller');

router.get('/stats', getStats);
router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/done', markAsDone);
router.patch('/:id/progress', markInProgress);

module.exports = router;
