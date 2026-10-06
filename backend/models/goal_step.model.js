const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GoalStep = sequelize.define('GoalStep', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  goal_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  week_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  week_start: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  week_end: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  weekly_target: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'DONE'),
    defaultValue: 'PENDING'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'goal_steps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = GoalStep;
