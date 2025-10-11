import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

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

export { sequelize, Plan, Signal };