const express = require('express');
const router = express.Router();
const {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getDashboard,
  getActionVariables,
  createActionVariable,
  deleteActionVariable
} = require('../controllers/goal.controller');

router.get('/dashboard', getDashboard);
router.get('/', getAllGoals);
router.get('/:id/action-variables', getActionVariables);
router.post('/:id/action-variables', createActionVariable);
router.delete('/:id/action-variables/:taskId', deleteActionVariable);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
