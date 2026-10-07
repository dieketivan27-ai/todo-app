const Task = require('../models/task.model');

/**
 * Crée une tâche « variable d'action » liée à un objectif (récurrente jusqu'à complétion).
 */
async function createActionVariableTask({
  goal,
  title,
  userId,
  jours_assignes = null,
  action_index = null,
  transaction = null
}) {
  const opts = transaction ? { transaction } : {};
  const existingCount = await Task.count({
    where: {
      goal_id: goal.id,
      user_id: userId,
      freq_type: 'weekly_until_done'
    },
    ...opts
  });

  const index = action_index != null ? action_index : existingCount + 1;

  return Task.create({
    title: title.trim(),
    description: `Variable d'action V${index} — objectif : ${goal.title}`,
    priority: 'MEDIUM',
    status: 'TODO',
    category: goal.category,
    goal_id: goal.id,
    user_id: userId,
    freq_type: 'weekly_until_done',
    recurrence_hebdomadaire: true,
    jours_assignes: jours_assignes && jours_assignes.length ? jours_assignes : null,
    action_index: index
  }, opts);
}

async function createActionVariablesFromList(goal, titles, userId, transaction = null) {
  const created = [];
  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    if (!title || !String(title).trim()) continue;
    const task = await createActionVariableTask({
      goal,
      title: String(title),
      userId,
      action_index: i + 1,
      transaction
    });
    created.push(task);
  }
  return created;
}

module.exports = { createActionVariableTask, createActionVariablesFromList };
