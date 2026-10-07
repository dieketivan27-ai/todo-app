const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SubTask = sequelize.define('SubTask', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  titre: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: { notEmpty: { msg: 'Le titre est obligatoire' } }
  },
  terminee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ordre: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'subtasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SubTask;
