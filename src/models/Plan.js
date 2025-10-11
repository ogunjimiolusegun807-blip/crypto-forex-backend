import { DataTypes } from 'sequelize';
import { sequelize } from './index.js';

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  minAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  maxAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gradient: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  }
}, {
  tableName: 'plans',
  timestamps: false,
});

export default Plan;
