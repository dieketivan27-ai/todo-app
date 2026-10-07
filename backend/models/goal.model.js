const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Goal = sequelize.define('Goal', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: "Le titre est obligatoire" }
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Général'
  },
  annual_target: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 52,
    validate: {
      min: { args: [1], msg: 'La cible annuelle doit être supérieure à 0' }
    }
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: () => new Date().getFullYear()
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#6366f1'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  goal_type: {
    type: DataTypes.ENUM('habit', 'actions'),
    defaultValue: 'habit',
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'goals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Goal;
