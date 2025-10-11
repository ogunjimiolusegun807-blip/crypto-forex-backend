import { sequelize, Plan, Signal } from './models/index.js';

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('Database synced!');
    process.exit(0);
  } catch (err) {
    console.error('Sync error:', err);
    process.exit(1);
  }
})();