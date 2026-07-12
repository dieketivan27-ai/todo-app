require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, sequelize } = require('./config/database');
const taskRoutes = require('./routes/task.routes');
const goalRoutes = require('./routes/goal.routes');
const ocrRoutes = require('./routes/ocr.routes');
const { startCronJobs } = require('./middleware/cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Associations
const Goal = require('./models/goal.model');
const GoalStep = require('./models/goal_step.model');
const Task = require('./models/task.model');

Goal.hasMany(GoalStep, { foreignKey: 'goal_id', as: 'steps', onDelete: 'CASCADE' });
GoalStep.belongsTo(Goal, { foreignKey: 'goal_id', as: 'goal' });

GoalStep.hasMany(Task, { foreignKey: 'goal_step_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(GoalStep, { foreignKey: 'goal_step_id', as: 'step' });

Goal.hasMany(Task, { foreignKey: 'goal_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Goal, { foreignKey: 'goal_id', as: 'goal' });


// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/ocr', ocrRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Todo API' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} introuvable` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erreur serveur interne' });
});

// Start
const start = async () => {
  await connectDB();
  await sequelize.sync({ alter: true });
  console.log('📦 Modèles synchronisés');

  startCronJobs();

  app.listen(PORT, () => {
    console.log(`🚀 API démarrée sur http://localhost:${PORT}`);
  });
};

start().catch(err => {
  console.error('❌ Erreur démarrage:', err);
  process.exit(1);
});
