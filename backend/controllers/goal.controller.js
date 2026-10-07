const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const Goal = require('../models/goal.model');
const Task = require('../models/task.model');
const { createActionVariableTask, createActionVariablesFromList } = require('../services/actionVariable.service');

function actionTaskWhere(goalId, userId, extra = {}) {
  return {
    goal_id: goalId,
    user_id: userId,
    freq_type: 'weekly_until_done',
    ...extra
  };
}

async function syncActionsAnnualTarget(goal) {
  const total = await Task.count({ where: actionTaskWhere(goal.id, goal.user_id) });
  await goal.update({ annual_target: Math.max(total, 1) });
}

async function fetchActionVariablesForGoal(goal, userId) {
  return Task.findAll({
    where: actionTaskWhere(goal.id, userId),
    order: [['action_index', 'ASC'], ['id', 'ASC']]
  });
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getWeekBounds(year, week) {
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const start = new Date(startOfWeek1);
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthBounds(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

async function buildGoalDashboardEntry(goal, userId, ctx) {
  const { now, year, yearStart, currentWeek, currentMonth, monthStart, monthEnd, weekStart, weekEnd } = ctx;

  const createdAt = new Date(goal.created_at || now);
  let startWeek = 1;
  let startMonth = 1;
  if (createdAt.getFullYear() === year) {
    startWeek = getISOWeek(createdAt);
    startMonth = createdAt.getMonth() + 1;
  }

  const totalWeeks = Math.max(52 - startWeek + 1, 1);
  const elapsedWeeks = Math.max(currentWeek - startWeek + 1, 0);
  const totalMonths = Math.max(12 - startMonth + 1, 1);
  const idealPacePct = Math.min((elapsedWeeks / totalWeeks) * 100, 100);

  const actionTotal = await Task.count({ where: actionTaskWhere(goal.id, userId) });
  const target = Math.max(actionTotal, goal.annual_target, 1);
  if (actionTotal !== goal.annual_target) {
    await goal.update({ annual_target: Math.max(actionTotal, 1) });
  }

  const doneBase = actionTaskWhere(goal.id, userId, { status: 'DONE' });
  const annualDone = await Task.count({ where: doneBase });
  const monthDone = currentMonth > 0
    ? await Task.count({
      where: { ...doneBase, completed_at: { [Op.between]: [monthStart, monthEnd] } }
    })
    : 0;
  const weekDone = currentWeek > 0
    ? await Task.count({
      where: { ...doneBase, completed_at: { [Op.between]: [weekStart, weekEnd] } }
    })
    : 0;

  const annualPct = Math.min((annualDone / target) * 100, 100);
  const monthlyPct = target > 0
    ? Math.min((monthDone / Math.max(Math.ceil(target / totalMonths), 1)) * 100, 100)
    : 0;
  const weeklyPct = target > 0
    ? Math.min((weekDone / Math.max(Math.ceil(target / totalWeeks), 1)) * 100, 100)
    : 0;
  const weeklyTarget = Math.max(Math.ceil(target / totalWeeks), 1);
  const monthlyTarget = Math.max(Math.ceil(target / totalMonths), 1);

  const weeklyData = [];
  const loopWeeks = Math.min(currentWeek, 52);
  for (let w = 1; w <= loopWeeks; w++) {
    const { end: we } = getWeekBounds(year, w);
    const wDone = await Task.count({
      where: {
        ...actionTaskWhere(goal.id, userId, { status: 'DONE' }),
        completed_at: { [Op.between]: [yearStart, we] }
      }
    });
    let ideal = 0;
    if (w >= startWeek) {
      ideal = Math.round(((w - startWeek + 1) / totalWeeks) * target);
    }
    weeklyData.push({ week: w, actual: wDone, ideal: Math.min(ideal, target) });
  }

  const isLate = annualPct < idealPacePct * 0.85;
  const evolutionRate = idealPacePct > 0 ? ((annualPct / idealPacePct) * 100).toFixed(1) : 100;

  return {
    ...goal.toJSON(),
    stats: {
      annualDone,
      annualPct: Math.round(annualPct),
      monthDone,
      monthlyPct: Math.round(monthlyPct),
      weekDone,
      weeklyPct: Math.round(weeklyPct),
      weeklyTarget,
      monthlyTarget,
      idealPacePct: Math.round(idealPacePct),
      evolutionRate: parseFloat(evolutionRate),
      isLate,
      currentWeek
    },
    weeklyData
  };
}

const getAllGoals = async (req, res) => {
  try {
    const goals = await Goal.findAll({ where: { user_id: req.user.id }, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: goals, count: goals.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const action_variables = await fetchActionVariablesForGoal(goal, req.user.id);
    res.json({
      success: true,
      data: {
        ...goal.toJSON(),
        action_variables
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createGoal = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, category, year, color, description, action_variables } = req.body;
    if (!title) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Le titre est obligatoire' });
    }

    const hasActions = Array.isArray(action_variables) && action_variables.length > 0;
    const target = hasActions ? action_variables.length : 1;

    const goal = await Goal.create({
      title,
      category: category || 'Général',
      annual_target: target,
      year: year || new Date().getFullYear(),
      color,
      description,
      goal_type: 'actions',
      user_id: req.user.id
    }, { transaction });

    if (hasActions) {
      const titles = action_variables.map(v => (typeof v === 'string' ? v : v.title)).filter(Boolean);
      await createActionVariablesFromList(goal, titles, req.user.id, transaction);
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      data: goal,
      message: 'Objectif créé — ajoutez des actions depuis la fiche ou via le scan OCR'
    });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });
    const { title, category, annual_target, year, color, description } = req.body;
    await goal.update({ title, category, annual_target, year, color, description });
    res.json({ success: true, data: goal, message: 'Objectif mis à jour' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });
    await goal.destroy();
    res.json({ success: true, message: 'Objectif supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const currentYear = now.getFullYear();

    let currentWeek;
    let currentMonth;
    if (year < currentYear) {
      currentWeek = 52;
      currentMonth = 12;
    } else if (year > currentYear) {
      currentWeek = 0;
      currentMonth = 0;
    } else {
      currentWeek = getISOWeek(now);
      currentMonth = now.getMonth() + 1;
    }

    const goals = await Goal.findAll({ where: { year, user_id: req.user.id }, order: [['created_at', 'DESC']] });

    const yearStart = new Date(year, 0, 1);
    const mForBounds = Math.max(1, currentMonth);
    const wForBounds = Math.max(1, currentWeek);
    const { start: monthStart, end: monthEnd } = getMonthBounds(year, mForBounds);
    const { start: weekStart, end: weekEnd } = getWeekBounds(year, wForBounds);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ctx = {
      now,
      year,
      yearStart,
      currentWeek,
      currentMonth,
      monthStart,
      monthEnd,
      weekStart,
      weekEnd
    };

    const goalsWithStats = await Promise.all(
      goals.map(goal => buildGoalDashboardEntry(goal, req.user.id, ctx))
    );

    const dailyAlerts = await Task.findAll({
      where: {
        user_id: req.user.id,
        deadline: {
          [Op.between]: [
            todayStart.toISOString().split('T')[0],
            todayEnd.toISOString().split('T')[0]
          ]
        },
        status: { [Op.ne]: 'DONE' },
        freq_type: { [Op.ne]: 'weekly_until_done' }
      },
      order: [['priority', 'DESC']]
    });

    const overdueTasks = await Task.findAll({
      where: {
        user_id: req.user.id,
        deadline: { [Op.lt]: todayStart.toISOString().split('T')[0] },
        status: { [Op.notIn]: ['DONE'] },
        freq_type: { [Op.ne]: 'weekly_until_done' }
      },
      order: [['deadline', 'ASC']],
      limit: 10
    });

    const lateGoals = goalsWithStats.filter(g => g.stats.isLate);

    res.json({
      success: true,
      data: {
        goals: goalsWithStats,
        lateGoals,
        dailyAlerts,
        overdueTasks,
        summary: {
          totalGoals: goals.length,
          lateCount: lateGoals.length,
          dailyAlertsCount: dailyAlerts.length,
          overdueCount: overdueTasks.length,
          currentWeek,
          currentMonth,
          year
        }
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getActionVariables = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const tasks = await fetchActionVariablesForGoal(goal, req.user.id);
    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createActionVariable = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const { title, jours_assignes } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Le titre de la variable d\'action est obligatoire' });
    }

    const task = await createActionVariableTask({
      goal,
      title: String(title),
      userId: req.user.id,
      jours_assignes: jours_assignes || null
    });

    await syncActionsAnnualTarget(goal);

    res.status(201).json({ success: true, data: task, message: 'Variable d\'action créée' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteActionVariable = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const task = await Task.findOne({
      where: {
        id: req.params.taskId,
        goal_id: goal.id,
        user_id: req.user.id,
        freq_type: 'weekly_until_done'
      }
    });
    if (!task) return res.status(404).json({ success: false, message: 'Variable d\'action introuvable' });

    await task.destroy();
    await syncActionsAnnualTarget(goal);
    res.json({ success: true, message: 'Variable d\'action supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getDashboard,
  getActionVariables,
  createActionVariable,
  deleteActionVariable
};
