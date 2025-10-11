import { DataTypes } from 'sequelize';
import sequelize from './index.js';

const Signal = sequelize.define('Signal', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  accuracy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subscribers: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  badge: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  badgeColor: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
  }
}, {
  tableName: 'signals',
  timestamps: false,
});

export default Signal;
