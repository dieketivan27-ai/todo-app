const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DailyMetrics = sequelize.define('DailyMetrics', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  focus_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  deep_work_hours: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  alignment_score: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  tasks_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'daily_metrics',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = DailyMetrics;
