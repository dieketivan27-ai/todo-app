const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const Goal = require('../models/goal.model');
const GoalStep = require('../models/goal_step.model');
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
  if (goal.goal_type !== 'actions') return;
  const total = await Task.count({ where: actionTaskWhere(goal.id, goal.user_id) });
  await goal.update({ annual_target: Math.max(total, 1) });
}

// Utilitaire: numéro de semaine ISO
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

// GET /api/goals
const getAllGoals = async (req, res) => {
  try {
    const goals = await Goal.findAll({ where: { user_id: req.user.id }, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: goals, count: goals.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/goals/:id
const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });
    res.json({ success: true, data: goal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/goals
const createGoal = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { title, category, annual_target, year, color, description, action_variables, goal_type } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Le titre est obligatoire' });

    const hasActions = Array.isArray(action_variables) && action_variables.length > 0;
    const resolvedType = goal_type === 'actions' ? 'actions' : 'habit';

    if (resolvedType === 'actions' && !hasActions) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Un objectif par actions requiert au moins une variable d\'action (une ligne par tâche).'
      });
    }

    let target = annual_target || 365;
    if (resolvedType === 'actions') {
      target = action_variables.length;
    }

    const goal = await Goal.create({
      title,
      category,
      annual_target: target,
      year,
      color,
      description,
      goal_type: resolvedType,
      user_id: req.user.id
    }, { transaction });

    if (hasActions) {
      const titles = action_variables.map(v => (typeof v === 'string' ? v : v.title)).filter(Boolean);
      await createActionVariablesFromList(goal, titles, req.user.id, transaction);
    }

    if (resolvedType !== 'actions') {
    // Generate steps and tasks for the next 4 weeks
    const now = new Date();
    const currentWeekNum = getISOWeek(now);
    const startYear = now.getFullYear();

    for (let i = 0; i < 4; i++) {
      let w = currentWeekNum + i;
      let y = startYear;
      if (w > 52) {
        w = w - 52;
        y = startYear + 1;
      }

      const { start, end } = getWeekBounds(y, w);
      const step = await GoalStep.create({
        goal_id: goal.id,
        week_number: w,
        year: y,
        week_start: start.toISOString().split('T')[0],
        week_end: end.toISOString().split('T')[0],
        weekly_target: 5,
        description: `Étape semaine ${w} — 1 tâche par jour (Lun-Ven)`,
        status: 'PENDING',
        user_id: req.user.id
      }, { transaction });

      // Generate 5 daily tasks (Monday to Friday)
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const taskDate = new Date(start);
        taskDate.setDate(start.getDate() + dayOffset);
        const dayLabel = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][dayOffset];

        await Task.create({
          title: `Étape ${goal.title} — S${w} (${dayLabel})`,
          description: `Tâche quotidienne liée à l'objectif : ${goal.title}`,
          priority: 'MEDIUM',
          status: 'TODO',
          category: goal.category,
          deadline: taskDate.toISOString().split('T')[0],
          goal_id: goal.id,
          goal_step_id: step.id,
          user_id: req.user.id
        }, { transaction });
      }
    }
    }

    await transaction.commit();
    const message = resolvedType === 'actions'
      ? 'Objectif par actions créé — les tâches apparaissent dans le planning chaque semaine'
      : 'Objectif et ses 4 premières étapes hebdomadaires créés avec succès';
    res.status(201).json({ success: true, data: goal, message });
  } catch (err) {
    await transaction.rollback();
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/goals/:id
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

// DELETE /api/goals/:id
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

// GET /api/goals/dashboard — Tableau de bord complet
const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const currentYear = now.getFullYear();

    let currentWeek, currentMonth;
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
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const mForBounds = Math.max(1, currentMonth);
    const wForBounds = Math.max(1, currentWeek);
    const { start: monthStart, end: monthEnd } = getMonthBounds(year, mForBounds);
    const { start: weekStart, end: weekEnd } = getWeekBounds(year, wForBounds);
    
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Pour chaque objectif, calculer les KPIs
    const goalsWithStats = await Promise.all(goals.map(async (goal) => {
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
      const elapsedMonths = Math.max(currentMonth - startMonth + 1, 0);
      const idealPacePct = Math.min((elapsedWeeks / totalWeeks) * 100, 100);

      let annualDone;
      let monthDone;
      let weekDone;
      let annualPct;
      let monthlyPct;
      let weeklyPct;
      let weeklyTarget;
      let monthlyTarget;
      let weeklyData;

      if (goal.goal_type === 'actions') {
        const actionTotal = await Task.count({ where: actionTaskWhere(goal.id, req.user.id) });
        const target = Math.max(actionTotal, goal.annual_target, 1);
        if (actionTotal !== goal.annual_target) {
          await goal.update({ annual_target: Math.max(actionTotal, 1) });
        }

        const doneBase = actionTaskWhere(goal.id, req.user.id, { status: 'DONE' });
        annualDone = await Task.count({ where: doneBase });
        monthDone = currentMonth > 0
          ? await Task.count({
            where: {
              ...doneBase,
              completed_at: { [Op.between]: [monthStart, monthEnd] }
            }
          })
          : 0;
        weekDone = currentWeek > 0
          ? await Task.count({
            where: {
              ...doneBase,
              completed_at: { [Op.between]: [weekStart, weekEnd] }
            }
          })
          : 0;

        annualPct = Math.min((annualDone / target) * 100, 100);
        monthlyPct = target > 0 ? Math.min((monthDone / Math.max(Math.ceil(target / totalMonths), 1)) * 100, 100) : 0;
        weeklyPct = target > 0 ? Math.min((weekDone / Math.max(Math.ceil(target / totalWeeks), 1)) * 100, 100) : 0;
        weeklyTarget = Math.max(Math.ceil(target / totalWeeks), 1);
        monthlyTarget = Math.max(Math.ceil(target / totalMonths), 1);

        weeklyData = [];
        const loopWeeks = Math.min(currentWeek, 52);
        for (let w = 1; w <= loopWeeks; w++) {
          const { end: we } = getWeekBounds(year, w);
          const wDone = await Task.count({
            where: {
              ...actionTaskWhere(goal.id, req.user.id, { status: 'DONE' }),
              completed_at: { [Op.between]: [yearStart, we] }
            }
          });
          let ideal = 0;
          if (w >= startWeek) {
            ideal = Math.round(((w - startWeek + 1) / totalWeeks) * target);
          }
          weeklyData.push({ week: w, actual: wDone, ideal: Math.min(ideal, target) });
        }
      } else {
        const whereBase = {
          user_id: req.user.id,
          goal_id: goal.id,
          status: 'DONE',
          completed_at: { [Op.between]: [yearStart, yearEnd] }
        };

        [annualDone, monthDone, weekDone] = await Promise.all([
          Task.count({ where: whereBase }),
          currentMonth > 0 ? Task.count({ where: { ...whereBase, completed_at: { [Op.between]: [monthStart, monthEnd] } } }) : 0,
          currentWeek > 0 ? Task.count({ where: { ...whereBase, completed_at: { [Op.between]: [weekStart, weekEnd] } } }) : 0
        ]);

        weeklyTarget = goal.annual_target / totalWeeks;
        monthlyTarget = goal.annual_target / totalMonths;
        annualPct = Math.min((annualDone / goal.annual_target) * 100, 100);
        monthlyPct = Math.min((monthDone / Math.ceil(monthlyTarget)) * 100, 100);
        weeklyPct = Math.min((weekDone / Math.ceil(weeklyTarget)) * 100, 100);

        weeklyData = [];
        const loopWeeks = Math.min(currentWeek, 52);
        for (let w = 1; w <= loopWeeks; w++) {
          const { end: we } = getWeekBounds(year, w);
          const wDone = await Task.count({
            where: {
              user_id: req.user.id,
              goal_id: goal.id,
              status: 'DONE',
              completed_at: { [Op.between]: [yearStart, we] }
            }
          });
          let ideal = 0;
          if (w >= startWeek) {
            ideal = Math.round(((w - startWeek + 1) / totalWeeks) * goal.annual_target);
          }
          weeklyData.push({
            week: w,
            actual: wDone,
            ideal: Math.min(ideal, goal.annual_target)
          });
        }
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
          weeklyTarget: Math.ceil(weeklyTarget || 1),
          monthlyTarget: Math.ceil(monthlyTarget || 1),
          idealPacePct: Math.round(idealPacePct),
          evolutionRate: parseFloat(evolutionRate),
          isLate,
          currentWeek
        },
        weeklyData
      };
    }));

    // Alertes journalières: tâches avec deadline = aujourd'hui et status != DONE
    const dailyAlerts = await Task.findAll({
      where: {
        user_id: req.user.id,
        deadline: {
          [Op.between]: [
            todayStart.toISOString().split('T')[0],
            todayEnd.toISOString().split('T')[0]
          ]
        },
        status: { [Op.ne]: 'DONE' }
      },
      order: [['priority', 'DESC']]
    });

    // Tâches en retard (deadline dépassée et non terminées)
    const overdueTasks = await Task.findAll({
      where: {
        user_id: req.user.id,
        deadline: { [Op.lt]: todayStart.toISOString().split('T')[0] },
        status: { [Op.notIn]: ['DONE'] }
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

const getGoalSteps = async (req, res) => {
  try {
    const goalId = req.params.id;
    const goal = await Goal.findOne({ where: { id: goalId, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const steps = await GoalStep.findAll({
      where: { goal_id: goalId, user_id: req.user.id },
      order: [['year', 'ASC'], ['week_number', 'ASC']]
    });

    const now = new Date();
    const currentWeekNum = getISOWeek(now);
    const currentYear = now.getFullYear();

    const stepsWithStats = await Promise.all(steps.map(async (step) => {
      const tasks = await Task.findAll({
        where: { goal_step_id: step.id, user_id: req.user.id },
        order: [['deadline', 'ASC']]
      });

      const totalTasks = tasks.length;
      const tasksCompleted = tasks.filter(t => t.status === 'DONE').length;
      const weeklyPct = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

      const stepDate = new Date(step.week_start);
      const month = stepDate.getMonth() + 1;
      const year = stepDate.getFullYear();
      const { start: mStart, end: mEnd } = getMonthBounds(year, month);

      const monthlyDone = await Task.count({
        where: {
          user_id: req.user.id,
          goal_id: goalId,
          status: 'DONE',
          completed_at: { [Op.between]: [mStart, mEnd] }
        }
      });
      const monthlyTarget = 30;
      const monthlyPct = Math.min(Math.round((monthlyDone / monthlyTarget) * 100), 100);

      let idealPct = 100;
      if (step.year === currentYear && step.week_number === currentWeekNum) {
        const day = now.getDay();
        let daysPassed = day;
        if (day === 0 || day === 6) {
          daysPassed = 5;
        }
        idealPct = Math.round((daysPassed / 5) * 100);
      } else if (step.year > currentYear || (step.year === currentYear && step.week_number > currentWeekNum)) {
        idealPct = 0;
      }

      const evolutionRate = idealPct > 0 ? Math.round((weeklyPct / idealPct) * 100) : 100;

      return {
        ...step.toJSON(),
        tasksCompleted,
        weeklyPct,
        monthlyPct,
        evolutionRate,
        dailyTasks: tasks
      };
    }));

    res.json({ success: true, data: stepsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/goals/:id/action-variables
const getActionVariables = async (req, res) => {
  try {
    const goal = await Goal.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ success: false, message: 'Objectif introuvable' });

    const tasks = await Task.findAll({
      where: {
        goal_id: goal.id,
        user_id: req.user.id,
        freq_type: 'weekly_until_done'
      },
      order: [['action_index', 'ASC'], ['id', 'ASC']]
    });

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/goals/:id/action-variables
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

    if (goal.goal_type === 'actions') {
      await syncActionsAnnualTarget(goal);
    }

    res.status(201).json({ success: true, data: task, message: 'Variable d\'action créée' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/goals/:id/action-variables/:taskId
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
    if (goal.goal_type === 'actions') {
      await syncActionsAnnualTarget(goal);
    }
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
  getGoalSteps,
  getActionVariables,
  createActionVariable,
  deleteActionVariable
};
