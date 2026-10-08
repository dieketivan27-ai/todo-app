const { Op } = require('sequelize');
const Task = require('../models/task.model');
const Goal = require('../models/goal.model');
const {
  getMondayOfDate,
  addDays,
  toDateOnly,
  parseDateOnly,
  getISOWeek
} = require('../utils/weekUtils');

const WEEKDAY_LABELS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function parseJoursAssignes(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function getWeekDayDates(weekMonday) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
}

/**
 * Date limite effective d'une tâche :
 * - sa propre date limite si elle en a une ;
 * - sinon, celle de l'objectif parent (goal.deadline / goal.delai si ces champs existent) ;
 * - sinon, le 31/12 de l'année de l'objectif.
 */
function getEffectiveDeadline(task, goalMap) {
  if (task.deadline) return task.deadline;
  const goal = task.goal_id ? goalMap[task.goal_id] : null;
  if (!goal) return null;
  const goalDue = goal.deadline || goal.delai;
  if (goalDue) return String(goalDue).slice(0, 10);
  return goal.year ? `${goal.year}-12-31` : null;
}

function taskToSlot(task, goalMap, occurrenceDate, extra = {}) {
  const goal = task.goal_id ? goalMap[task.goal_id] : null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    category: task.category,
    deadline: occurrenceDate,
    occurrence_date: occurrenceDate,
    task_deadline: extra.task_deadline ?? task.deadline,
    is_overdue: !!extra.is_overdue,
    is_completed_occurrence: !!extra.is_completed_occurrence,
    start_time: task.start_time,
    end_time: task.end_time,
    goal_id: task.goal_id,
    freq_type: task.freq_type,
    action_index: task.action_index,
    is_action_variable: task.freq_type === 'weekly_until_done' && !!task.goal_id,
    is_generated_slot: false,
    goal_title: goal ? goal.title : null,
    goal_color: goal ? goal.color : null
  };
}

/**
 * Règle unique pour toutes les tâches (y compris les variables d'action) :
 * - non terminée : affichée chaque jour de sa création jusqu'à sa date limite incluse ;
 *   après la date limite, affichée "en retard" uniquement jusqu'à aujourd'hui (jamais sur les jours futurs) ;
 * - terminée : affichée uniquement le jour où elle a été terminée.
 */
function expandDeadlineTaskSlots(task, goalMap, weekMonday, todayKey = toDateOnly(new Date())) {
  const slots = [];
  const due = getEffectiveDeadline(task, goalMap);
  if (!due) return slots;

  const created = toDateOnly(new Date(task.created_at));
  const weekDays = getWeekDayDates(weekMonday).map(d => toDateOnly(d));

  if (task.status === 'DONE') {
    if (task.completed_at) {
      const doneDay = toDateOnly(new Date(task.completed_at));
      if (doneDay >= created && weekDays.includes(doneDay)) {
        slots.push(taskToSlot(task, goalMap, doneDay, {
          task_deadline: due,
          is_completed_occurrence: true
        }));
      }
    }
    return slots;
  }

  for (const day of weekDays) {
    if (day < created) continue;
    if (day <= due) {
      slots.push(taskToSlot(task, goalMap, day, { task_deadline: due }));
    } else if (day <= todayKey) {
      slots.push(taskToSlot(task, goalMap, day, { task_deadline: due, is_overdue: true }));
    }
  }
  return slots;
}

async function getWeekPlanning(userId, dateInput) {
  const ref = dateInput ? parseDateOnly(dateInput) : new Date();
  ref.setHours(0, 0, 0, 0);
  const weekMonday = getMondayOfDate(ref);
  const weekSunday = addDays(weekMonday, 6);
  weekSunday.setHours(23, 59, 59, 999);

  const weekNum = getISOWeek(ref);
  const year = ref.getFullYear();
  const todayKey = toDateOnly(new Date());

  const [tasks, goals] = await Promise.all([
    Task.findAll({
      where: {
        user_id: userId,
        [Op.and]: [
          // une date limite propre OU un objectif parent (qui fournit la date limite)
          { [Op.or]: [{ deadline: { [Op.ne]: null } }, { goal_id: { [Op.ne]: null } }] },
          // non terminée, ou terminée pendant la semaine affichée
          {
            [Op.or]: [
              { status: { [Op.ne]: 'DONE' } },
              { status: 'DONE', completed_at: { [Op.between]: [weekMonday, weekSunday] } }
            ]
          }
        ]
      },
      order: [['deadline', 'ASC'], ['start_time', 'ASC'], ['id', 'ASC']]
    }),
    Goal.findAll({ where: { user_id: userId } })
  ]);

  const goalMap = Object.fromEntries(goals.map(g => [g.id, g.toJSON()]));

  const slots = [];
  for (const task of tasks) {
    slots.push(...expandDeadlineTaskSlots(task, goalMap, weekMonday, todayKey));
  }

  slots.sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const byDay = {};
  for (let i = 0; i < 7; i++) {
    const d = toDateOnly(addDays(weekMonday, i));
    byDay[d] = slots.filter(s => s.deadline === d);
  }

  return {
    week: {
      number: weekNum,
      year,
      start: toDateOnly(weekMonday),
      end: toDateOnly(weekSunday),
      day_labels: WEEKDAY_LABELS
    },
    slots,
    by_day: byDay
  };
}

module.exports = { getWeekPlanning, parseJoursAssignes, WEEKDAY_LABELS, expandDeadlineTaskSlots };