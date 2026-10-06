const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Le titre est obligatoire' },
      len: { args: [1, 255], msg: 'Le titre doit faire entre 1 et 255 caractères' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    defaultValue: 'MEDIUM'
  },
  status: {
    type: DataTypes.ENUM('TODO', 'IN_PROGRESS', 'DONE', 'LATE'),
    defaultValue: 'TODO'
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'Général'
  },
  deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  goal_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  goal_step_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: true
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: true
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Task;
