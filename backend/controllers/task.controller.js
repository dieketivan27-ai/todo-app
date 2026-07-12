const { Op } = require('sequelize');
const Task = require('../models/task.model');

// GET /api/tasks
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, category, search, sortBy = 'created_at', order = 'DESC' } = req.query;

    const where = {};
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
      order: [[sortBy, order.toUpperCase()]]
    });

    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, priority, category, deadline } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Le titre est obligatoire' });

    const task = await Task.create({ title, description, priority, category, deadline });
    res.status(201).json({ success: true, data: task, message: 'Tâche créée avec succès' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    const { title, description, priority, status, category, deadline } = req.body;
    await task.update({ title, description, priority, status, category, deadline });
    res.json({ success: true, data: task, message: 'Tâche mise à jour' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
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
    const task = await Task.findByPk(req.params.id);
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
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Tâche introuvable' });

    await task.update({ status: 'IN_PROGRESS', completed_at: null });
    res.json({ success: true, data: task, message: 'Tâche en cours' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const [total, todo, inProgress, done, late] = await Promise.all([
      Task.count(),
      Task.count({ where: { status: 'TODO' } }),
      Task.count({ where: { status: 'IN_PROGRESS' } }),
      Task.count({ where: { status: 'DONE' } }),
      Task.count({ where: { status: 'LATE' } })
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

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask, markAsDone, markInProgress, getStats };
