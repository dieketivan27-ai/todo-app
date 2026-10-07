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
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getStats
} = require('../controllers/task.controller');

router.get('/stats', getStats);
router.get('/', getAllTasks);
router.post('/', createTask);
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/done', markAsDone);
router.patch('/:id/progress', markInProgress);
router.post('/:id/subtasks', createSubtask);
router.patch('/:id/subtasks/:subtaskId', updateSubtask);
router.delete('/:id/subtasks/:subtaskId', deleteSubtask);

module.exports = router;
