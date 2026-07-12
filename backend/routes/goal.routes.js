const express = require('express');
const router = express.Router();
const {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getDashboard,
  getGoalSteps
} = require('../controllers/goal.controller');

router.get('/dashboard', getDashboard);
router.get('/', getAllGoals);
router.get('/:id/steps', getGoalSteps);
router.get('/:id', getGoalById);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);

module.exports = router;
