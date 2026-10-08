const { Op } = require('sequelize');
const Task = require('../models/task.model');
const SubTask = require('../models/subtask.model');

const subtaskInclude = {
  model: SubTask,
  as: 'subtasks',
  separate: true,
  order: [['ordre', 'ASC'], ['id', 'ASC']]
};

function taskWithSubtasksJson(task) {
  const json = task.toJSON ? task.toJSON() : task;
  json.subtasks = json.subtasks || [];
  return json;
}

async function findOwnedTask(taskId, userId) {
  return Task.findOne({ where: { id: taskId, user_id: userId } });
}

// GET /api/tasks
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, category, search, sortBy = 'created_at', order = 'DESC' } = req.query;
    const where = { user_id: req.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where,
      include: [subtaskInclude],
      order: [[sortBy, order.toUpperCase()]]
    });

    res.json({
      success: true,
      data: tasks.map(taskWithSubtasksJson),
      count: tasks.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [subtaskInclude]
    });
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });
    res.json({ success: true, data: taskWithSubtasksJson(task) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, deadline, start_time, end_time } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Le titre est obligatoire' });

    const task = await Task.create({
      title,
      description,
      priority,
      category,
      deadline,
      start_time,
      end_time,
      user_id: req.user.id
    });
    res.status(201).json({ success: true, data: { ...task.toJSON(), subtasks: [] }, message: 'Tâche créée avec succès' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    const { title, description, priority, status, category, deadline, start_time, end_time } = req.body;
    await task.update({ title, description, priority, status, category, deadline, start_time, end_time });
    const refreshed = await Task.findByPk(task.id, { include: [subtaskInclude] });
    res.json({ success: true, data: taskWithSubtasksJson(refreshed), message: 'Tâche mise à jour' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await task.destroy();
    res.json({ success: true, message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id/done
const markAsDone = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await task.update({ status: 'DONE', completed_at: new Date() });
    res.json({ success: true, data: task, message: 'Tâche marquée comme terminée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id/progress
const markInProgress = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await task.update({ status: 'IN_PROGRESS', completed_at: null });
    res.json({ success: true, data: task, message: 'Tâche en cours' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/:id/subtasks
const createSubtask = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    const { titre } = req.body;
    if (!titre || !String(titre).trim()) {
      return res.status(400).json({ success: false, message: 'Le titre de la sous-tâche est obligatoire' });
    }

    const maxOrdre = await SubTask.max('ordre', { where: { task_id: task.id } });
    const subtask = await SubTask.create({
      task_id: task.id,
      titre: String(titre).trim(),
      terminee: false,
      ordre: (maxOrdre ?? -1) + 1
    });

    res.status(201).json({ success: true, data: subtask, message: 'Sous-tâche créée' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/tasks/:id/subtasks/:subtaskId
const updateSubtask = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    const subtask = await SubTask.findOne({
      where: { id: req.params.subtaskId, task_id: task.id }
    });
    if (!subtask) return res.status(404).json({ success: false, message: 'Sous-tâche introuvable' });

    const { titre, terminee } = req.body;
    const patch = {};
    if (titre !== undefined) patch.titre = String(titre).trim();
    if (terminee !== undefined) patch.terminee = !!terminee;
    await subtask.update(patch);

    // ── Auto-complete / revert parent task ───────────────────────────────────
    if (terminee !== undefined) {
      const allSubtasks = await SubTask.findAll({ where: { task_id: task.id } });
      const allDone = allSubtasks.every(s => s.terminee);

      if (allDone && task.status !== 'DONE') {
        // Toutes les sous-tâches cochées → passer la tâche en DONE
        await task.update({ status: 'DONE', completed_at: new Date() });
      } else if (!allDone && task.status === 'DONE') {
        // Une sous-tâche décochée sur une tâche terminée → remettre EN_PROGRESS
        await task.update({ status: 'IN_PROGRESS', completed_at: null });
      }
    }

    res.json({ success: true, data: subtask, message: 'Sous-tâche mise à jour' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// DELETE /api/tasks/:id/subtasks/:subtaskId
const deleteSubtask = async (req, res) => {
  try {
    const task = await findOwnedTask(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    const subtask = await SubTask.findOne({
      where: { id: req.params.subtaskId, task_id: task.id }
    });
    if (!subtask) return res.status(404).json({ success: false, message: 'Sous-tâche introuvable' });

    await subtask.destroy();
    res.json({ success: true, message: 'Sous-tâche supprimée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const [total, todo, inProgress, done, late] = await Promise.all([
      Task.count({ where: { user_id: req.user.id } }),
      Task.count({ where: { user_id: req.user.id, status: 'TODO' } }),
      Task.count({ where: { user_id: req.user.id, status: 'IN_PROGRESS' } }),
      Task.count({ where: { user_id: req.user.id, status: 'DONE' } }),
      Task.count({ where: { user_id: req.user.id, status: 'LATE' } })
    ]);

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({
      success: true,
      data: { total, todo, inProgress, done, late, completionRate }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
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
};
