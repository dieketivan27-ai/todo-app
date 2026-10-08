const { Op } = require('sequelize');
const Task    = require('../models/task.model');
const Goal    = require('../models/goal.model');
const SubTask = require('../models/subtask.model');
const {
  getMondayOfDate,
  addDays,
  toDateOnly,
  parseDateOnly,
  getISOWeek
} = require('../utils/weekUtils');

const WEEKDAY_LABELS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseJoursAssignes(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : null; } catch { return null; }
  }
  return null;
}

function getWeekDayDates(weekMonday) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekMonday, i));
}

/**
 * Date limite effective d'une tache :
 *   1. sa propre deadline
 *   2. la deadline / delai de l'objectif parent
 *   3. 31/12 de l'annee de l'objectif
 */
function getEffectiveDeadline(task, goalMap) {
  if (task.deadline) return String(task.deadline).slice(0, 10);
  const goal = task.goal_id ? goalMap[task.goal_id] : null;
  if (!goal) return null;
  const goalDue = goal.deadline || goal.delai;
  if (goalDue) return String(goalDue).slice(0, 10);
  return goal.year ? `${goal.year}-12-31` : null;
}

/**
 * Repartit equitablement la deadline d'objectif entre N variables restantes
 * sans deadline propre.
 */
function sharedDeadlineFor(goalDeadline, totalShared, indexAmongShared, cursorKey) {
  const start     = parseDateOnly(cursorKey);
  const end       = parseDateOnly(goalDeadline);
  const totalDays = Math.max(0, Math.round((end - start) / 86400000));
  const share     = totalShared > 0 ? Math.max(1, Math.floor(totalDays / totalShared)) : 0;
  const dueDate   = new Date(start);
  dueDate.setDate(start.getDate() + share * (indexAmongShared + 1));
  const clamped   = dueDate > end ? end : dueDate;
  return toDateOnly(clamped);
}

function taskToSlot(task, goalMap, occurrenceDate, extra = {}) {
  const goal = task.goal_id ? goalMap[task.goal_id] : null;
  return {
    id:                      task.id,
    title:                   task.title,
    description:             task.description,
    priority:                task.priority,
    status:                  task.status,
    category:                task.category,
    deadline:                occurrenceDate,
    occurrence_date:         occurrenceDate,
    task_deadline:           extra.task_deadline ?? (task.deadline ? String(task.deadline).slice(0, 10) : null),
    is_overdue:              !!extra.is_overdue,
    is_completed_occurrence: !!extra.is_completed_occurrence,
    start_time:              task.start_time,
    end_time:                task.end_time,
    goal_id:                 task.goal_id,
    freq_type:               task.freq_type,
    action_index:            task.action_index,
    is_action_variable:      task.freq_type === 'weekly_until_done' && !!task.goal_id,
    is_generated_slot:       false,
    goal_title:              goal ? goal.title : null,
    goal_color:              goal ? goal.color : null,
    // champs file sequentielle
    queue_state:             extra.queue_state         ?? null,
    subtasks:                extra.subtasks            ?? [],
    current_subtask_id:      extra.current_subtask_id  ?? null
  };
}

// â”€â”€â”€ Taches classiques (sans objectif) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Tache sans objectif : visible chaque jour de sa creation jusqu'a sa deadline,
 * puis "en retard" seulement jusqu'a aujourd'hui. Terminee : visible le jour de completion.
 */
function expandDeadlineTaskSlots(task, goalMap, weekMonday, todayKey = toDateOnly(new Date())) {
  const slots = [];
  const due = getEffectiveDeadline(task, goalMap);
  if (!due) return slots;

  const created  = toDateOnly(new Date(task.created_at));
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

// â”€â”€â”€ File sequentielle des variables d'action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Construit tous les slots de la file sequentielle pour toutes les variables
 * d'action de l'utilisateur, en ne gardant que ceux qui tombent dans la semaine
 * demandee (pour la coherence de la navigation).
 */
async function buildQueueSlots(userId, weekMonday, todayKey, goalMap, subtasksByTaskId) {
  const weekDays  = getWeekDayDates(weekMonday).map(d => toDateOnly(d));
  const weekStart = weekDays[0];
  const weekEnd   = weekDays[6];

  // Objectifs tries par (created_at ASC, id ASC)
  const goals = Object.values(goalMap)
    .sort((a, b) => {
      const ca = String(a.created_at); const cb = String(b.created_at);
      if (ca !== cb) return ca.localeCompare(cb);
      return a.id - b.id;
    });

  // Toutes les variables d'action triees par (action_index ASC, id ASC)
  const allActionVars = await Task.findAll({
    where: {
      user_id: userId,
      freq_type: 'weekly_until_done',
      goal_id: { [Op.ne]: null }
    },
    order: [['action_index', 'ASC'], ['id', 'ASC']]
  });

  const varsByGoal = {};
  for (const t of allActionVars) {
    if (!varsByGoal[t.goal_id]) varsByGoal[t.goal_id] = [];
    varsByGoal[t.goal_id].push(t);
  }

  const slots  = [];
  let cursor   = todayKey;

  for (const goal of goals) {
    const vars = varsByGoal[goal.id] || [];
    if (!vars.length) continue;

    const pending = vars.filter(v => v.status !== 'DONE');
    const done    = vars.filter(v => v.status === 'DONE');

    // Variables terminees : affichees uniquement le jour de completion
    for (const v of done) {
      if (!v.completed_at) continue;
      const doneDay = toDateOnly(new Date(v.completed_at));
      if (doneDay >= weekStart && doneDay <= weekEnd) {
        const subtasks = subtasksByTaskId[v.id] || [];
        slots.push(taskToSlot(v, goalMap, doneDay, {
          task_deadline:           getEffectiveDeadline(v, goalMap),
          is_completed_occurrence: true,
          queue_state:             'completed',
          subtasks,
          current_subtask_id:      null
        }));
      }
    }

    if (!pending.length) continue;

    // Deadline de repli de l'objectif
    const goalDue = (() => {
      const d = goal.deadline || goal.delai;
      if (d) return String(d).slice(0, 10);
      return goal.year ? `${goal.year}-12-31` : toDateOnly(new Date());
    })();

    const sharedCount = pending.filter(v => !v.deadline).length;
    let sharedIdx = 0;

    for (let vi = 0; vi < pending.length; vi++) {
      const v        = pending[vi];
      const subtasks = subtasksByTaskId[v.id] || [];
      const firstUnchecked = subtasks.find(s => !s.terminee);

      let effectiveDue;
      if (v.deadline) {
        effectiveDue = String(v.deadline).slice(0, 10);
      } else {
        effectiveDue = sharedDeadlineFor(goalDue, sharedCount, sharedIdx, cursor);
        sharedIdx++;
      }
      if (effectiveDue < cursor) effectiveDue = cursor;

      const isActive  = vi === 0;
      const isOverdue = effectiveDue < todayKey;

      if (isActive && isOverdue) {
        // Variable en retard active : affichee seulement aujourd'hui
        if (weekDays.includes(todayKey)) {
          slots.push(taskToSlot(v, goalMap, todayKey, {
            task_deadline:       effectiveDue,
            is_overdue:          true,
            queue_state:         'overdue',
            subtasks,
            current_subtask_id:  firstUnchecked ? firstUnchecked.id : null
          }));
        }
        cursor = toDateOnly(addDays(parseDateOnly(todayKey), 1));

      } else if (isActive) {
        // Variable active (non en retard)
        for (const day of weekDays) {
          if (day >= cursor && day <= effectiveDue) {
            slots.push(taskToSlot(v, goalMap, day, {
              task_deadline:       effectiveDue,
              queue_state:         'active',
              subtasks,
              current_subtask_id:  firstUnchecked ? firstUnchecked.id : null
            }));
          }
        }
        cursor = toDateOnly(addDays(parseDateOnly(effectiveDue), 1));

      } else {
        // Variable a venir (projetee sur des jours futurs)
        for (const day of weekDays) {
          if (day >= cursor && day <= effectiveDue) {
            slots.push(taskToSlot(v, goalMap, day, {
              task_deadline:       effectiveDue,
              queue_state:         'upcoming',
              subtasks,
              current_subtask_id:  null
            }));
          }
        }
        cursor = toDateOnly(addDays(parseDateOnly(effectiveDue), 1));
      }
    }
  }

  return slots;
}

// â”€â”€â”€ Point d'entree principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getWeekPlanning(userId, dateInput) {
  const ref = dateInput ? parseDateOnly(dateInput) : new Date();
  ref.setHours(0, 0, 0, 0);
  const weekMonday = getMondayOfDate(ref);
  const weekSunday = addDays(weekMonday, 6);
  weekSunday.setHours(23, 59, 59, 999);

  const weekNum  = getISOWeek(ref);
  const year     = ref.getFullYear();
  const todayKey = toDateOnly(new Date());

  // 1. Objectifs
  const goals = await Goal.findAll({ where: { user_id: userId } });
  const goalMap = Object.fromEntries(goals.map(g => {
    const j = g.toJSON();
    return [g.id, j];
  }));

  // 2. Taches classiques (goal_id NULL ou freq_type != weekly_until_done)
  const classicTasks = await Task.findAll({
    where: {
      user_id: userId,
      [Op.and]: [
        {
          [Op.or]: [
            { goal_id: null },
            { freq_type: { [Op.ne]: 'weekly_until_done' } }
          ]
        },
        { deadline: { [Op.ne]: null } },
        {
          [Op.or]: [
            { status: { [Op.ne]: 'DONE' } },
            { status: 'DONE', completed_at: { [Op.between]: [weekMonday, weekSunday] } }
          ]
        }
      ]
    },
    order: [['deadline', 'ASC'], ['start_time', 'ASC'], ['id', 'ASC']]
  });

  // 3. IDs de toutes les variables d'action (pour charger les sous-taches)
  const actionVarRows = await Task.findAll({
    attributes: ['id'],
    where: {
      user_id: userId,
      freq_type: 'weekly_until_done',
      goal_id: { [Op.ne]: null }
    }
  });

  // Collect ALL task IDs to fetch their subtasks without N+1
  const avIds = actionVarRows.map(t => t.id);
  const classicIds = classicTasks.map(t => t.id);
  const allTaskIds = [...avIds, ...classicIds];

  // 4. Sous-taches en une seule requete (evite le N+1)
  const subtasksByTaskId = {};
  if (allTaskIds.length > 0) {
    const allSubtasks = await SubTask.findAll({
      where: { task_id: { [Op.in]: allTaskIds } },
      order: [['ordre', 'ASC'], ['id', 'ASC']]
    });
    for (const st of allSubtasks) {
      if (!subtasksByTaskId[st.task_id]) subtasksByTaskId[st.task_id] = [];
      subtasksByTaskId[st.task_id].push({
        id:       st.id,
        titre:    st.titre,
        terminee: st.terminee,
        ordre:    st.ordre
      });
    }
  }

  // 5. Slots classiques
  const classicSlots = [];
  for (const task of classicTasks) {
    // Add subtasks explicitly for classic tasks
    task.subtasks = subtasksByTaskId[task.id] || [];
    classicSlots.push(...expandDeadlineTaskSlots(task, goalMap, weekMonday, todayKey));
  }

  // 6. Slots de la file sequentielle
  const queueSlots = await buildQueueSlots(userId, weekMonday, todayKey, goalMap, subtasksByTaskId);

  // 7. Fusionner et trier
  const allSlots = [...classicSlots, ...queueSlots];
  allSlots.sort((a, b) => {
    if (a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  // 8. Regrouper par jour
  const byDay = {};
  for (let i = 0; i < 7; i++) {
    const d = toDateOnly(addDays(weekMonday, i));
    byDay[d] = allSlots.filter(s => s.deadline === d);
  }

  return {
    week: {
      number: weekNum,
      year,
      start: toDateOnly(weekMonday),
      end:   toDateOnly(weekSunday),
      day_labels: WEEKDAY_LABELS
    },
    slots:  allSlots,
    by_day: byDay
  };
}

module.exports = { getWeekPlanning, parseJoursAssignes, WEEKDAY_LABELS, expandDeadlineTaskSlots };
