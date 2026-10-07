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

const DAY_NAME_TO_INDEX = {
  lundi: 0,
  mardi: 1,
  mercredi: 2,
  jeudi: 3,
  vendredi: 4,
  samedi: 5,
  dimanche: 6
};

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

function getCandidateWeekdayIndices(weekMonday, referenceDate) {
  const weekDates = getWeekDayDates(weekMonday);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const isCurrentWeek = weekMonday.getTime() === getMondayOfDate(today).getTime();
  if (!isCurrentWeek) {
    return [0, 1, 2, 3, 4];
  }

  const remaining = [0, 1, 2, 3, 4].filter(i => weekDates[i] >= today);
  return remaining.length > 0 ? remaining : [0, 1, 2, 3, 4];
}

function computeAutoDayIndex(task, sortedTasks, weekMonday, referenceDate, loadByDay) {
  const candidates = getCandidateWeekdayIndices(weekMonday, referenceDate);
  const taskPosition = sortedTasks.findIndex(t => t.id === task.id);
  let best = candidates[0];
  let minLoad = Infinity;
  for (const idx of candidates) {
    const load = loadByDay[idx] || 0;
    if (load < minLoad || (load === minLoad && idx === (taskPosition % candidates.length))) {
      minLoad = load;
      best = idx;
    }
  }
  loadByDay[best] = (loadByDay[best] || 0) + 1;
  return best;
}

function buildWeeklyAssignments(sortedActiveTasks, weekMonday, referenceDate) {
  const weekDates = getWeekDayDates(weekMonday);
  const datesByTaskId = new Map();
  const loadByDay = {};

  for (const task of sortedActiveTasks) {
    const jours = parseJoursAssignes(task.jours_assignes);
    if (jours && jours.length > 0) {
      const indices = jours
        .map(j => DAY_NAME_TO_INDEX[String(j).toLowerCase().trim()])
        .filter(i => i !== undefined);
      const unique = [...new Set(indices)];
      datesByTaskId.set(
        task.id,
        unique.map(i => toDateOnly(weekDates[i]))
      );
      for (const i of unique) {
        loadByDay[i] = (loadByDay[i] || 0) + 1;
      }
    }
  }

  const autoTasks = sortedActiveTasks.filter(t => !parseJoursAssignes(t.jours_assignes)?.length);
  for (const task of autoTasks) {
    const idx = computeAutoDayIndex(task, sortedActiveTasks, weekMonday, referenceDate, loadByDay);
    datesByTaskId.set(task.id, [toDateOnly(weekDates[idx])]);
  }

  return datesByTaskId;
}

function taskToSlot(task, goalMap, occurrenceDate, generated, extra = {}) {
  const goal = task.goal_id ? goalMap[task.goal_id] : null;
  const taskDeadline = extra.task_deadline ?? task.deadline;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    category: task.category,
    deadline: occurrenceDate,
    occurrence_date: occurrenceDate,
    task_deadline: taskDeadline,
    is_overdue: !!extra.is_overdue,
    is_completed_occurrence: !!extra.is_completed_occurrence,
    start_time: task.start_time,
    end_time: task.end_time,
    goal_id: task.goal_id,
    freq_type: task.freq_type,
    action_index: task.action_index,
    is_action_variable: task.freq_type === 'weekly_until_done' && !!task.goal_id,
    is_generated_slot: generated,
    goal_title: goal ? goal.title : null,
    goal_color: goal ? goal.color : null
  };
}

/** Tâche ponctuelle : une occurrence par jour entre création et échéance ; après échéance, tous les jours en retard. */
function expandDeadlineTaskSlots(task, goalMap, weekMonday) {
  const slots = [];
  if (!task.deadline) return slots;

  const created = toDateOnly(new Date(task.created_at));
  const due = task.deadline;
  const weekDays = getWeekDayDates(weekMonday).map(d => toDateOnly(d));

  if (task.status === 'DONE') {
    if (task.completed_at) {
      const doneDay = toDateOnly(new Date(task.completed_at));
      if (weekDays.includes(doneDay)) {
        slots.push(taskToSlot(task, goalMap, doneDay, false, {
          task_deadline: due,
          is_completed_occurrence: true
        }));
      }
    }
    return slots;
  }

  for (const day of weekDays) {
    if (day < created) continue;
    const isOverdue = day > due;
    slots.push(taskToSlot(task, goalMap, day, false, {
      task_deadline: due,
      is_overdue: isOverdue
    }));
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

  const [deadlineTasks, activeActionTasks, goals] = await Promise.all([
    Task.findAll({
      where: {
        user_id: userId,
        freq_type: { [Op.ne]: 'weekly_until_done' },
        deadline: { [Op.ne]: null },
        [Op.or]: [
          { status: { [Op.notIn]: ['DONE'] } },
          {
            status: 'DONE',
            completed_at: { [Op.between]: [weekMonday, weekSunday] }
          }
        ]
      },
      order: [['deadline', 'ASC'], ['start_time', 'ASC'], ['id', 'ASC']]
    }),
    Task.findAll({
      where: {
        user_id: userId,
        freq_type: 'weekly_until_done',
        goal_id: { [Op.ne]: null },
        status: { [Op.notIn]: ['DONE'] }
      },
      order: [['action_index', 'ASC'], ['id', 'ASC']]
    }),
    Goal.findAll({ where: { user_id: userId } })
  ]);

  const goalMap = Object.fromEntries(goals.map(g => [g.id, g.toJSON()]));
  const assignments = buildWeeklyAssignments([...activeActionTasks], weekMonday, ref);

  const slots = [];

  for (const task of deadlineTasks) {
    slots.push(...expandDeadlineTaskSlots(task, goalMap, weekMonday));
  }

  for (const task of activeActionTasks) {
    const dates = assignments.get(task.id) || [];
    for (const d of dates) {
      slots.push(taskToSlot(task, goalMap, d, true));
    }
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

module.exports = { getWeekPlanning, parseJoursAssignes, WEEKDAY_LABELS };
