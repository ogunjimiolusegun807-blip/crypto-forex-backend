import { Sequelize } from 'sequelize';
import Plan from './Plan.js';
import Signal from './Signal.js';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

export { sequelize, Plan, Signal };