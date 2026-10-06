require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { connectDB, sequelize } = require('./config/database');
const taskRoutes = require('./routes/task.routes');
const goalRoutes = require('./routes/goal.routes');
const ocrRoutes = require('./routes/ocr.routes');
const authRoutes = require('./routes/auth.routes');
const authMiddleware = require('./middleware/auth.middleware');
const { startCronJobs } = require('./middleware/cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Associations
const Goal = require('./models/goal.model');
const GoalStep = require('./models/goal_step.model');
const Task = require('./models/task.model');
const User = require('./models/user.model');
const Project = require('./models/project.model');
const DailyMetrics = require('./models/daily_metrics.model');

Goal.hasMany(GoalStep, { foreignKey: 'goal_id', as: 'steps', onDelete: 'CASCADE' });
GoalStep.belongsTo(Goal, { foreignKey: 'goal_id', as: 'goal' });

GoalStep.hasMany(Task, { foreignKey: 'goal_step_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(GoalStep, { foreignKey: 'goal_step_id', as: 'step' });

Goal.hasMany(Task, { foreignKey: 'goal_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(Goal, { foreignKey: 'goal_id', as: 'goal' });

User.hasMany(Goal, { foreignKey: 'user_id', as: 'goals', onDelete: 'CASCADE' });
Goal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(GoalStep, { foreignKey: 'user_id', as: 'goal_steps', onDelete: 'CASCADE' });
GoalStep.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Task, { foreignKey: 'user_id', as: 'tasks', onDelete: 'CASCADE' });
Task.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Project, { foreignKey: 'user_id', as: 'projects', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(DailyMetrics, { foreignKey: 'user_id', as: 'daily_metrics', onDelete: 'CASCADE' });
DailyMetrics.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const Notification = require('./models/notification.model');
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Project.hasMany(Goal, { foreignKey: 'project_id', as: 'goals', onDelete: 'SET NULL' });
Goal.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
const projectRoutes = require('./routes/project.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const notificationRoutes = require('./routes/notification.routes');

app.use('/api/auth', authRoutes);
const protect = authMiddleware.protect || authMiddleware;
app.use('/api/tasks', protect, taskRoutes);
app.use('/api/goals', protect, goalRoutes);
app.use('/api/ocr', protect, ocrRoutes);
app.use('/api/projects', protect, projectRoutes);
app.use('/api/analytics', protect, analyticsRoutes);
app.use('/api/notifications', protect, notificationRoutes);

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
