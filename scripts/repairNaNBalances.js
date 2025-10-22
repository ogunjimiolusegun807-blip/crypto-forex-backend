#!/usr/bin/env node
/* ESM-friendly repair script to coerce NaN/non-numeric balances to numeric (or 0).
   Run from project root: node scripts/repairNaNBalances.js
*/
(async () => {
  try {
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootPath = path.resolve(__dirname, '..');

  // Change working directory to project root so Sequelize picks up env the same way
  try { process.chdir(rootPath); } catch (e) { /* non-fatal */ }

    // Build Sequelize either from DATABASE_URL or from config/config.json
    const { Sequelize, DataTypes } = await import('sequelize');
    const fs = await import('fs');
    let sequelize;
    if (process.env.DATABASE_URL) {
      sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', logging: false });
    } else {
      const cfgPath = path.join(rootPath, 'config', 'config.json');
      let cfg = {};
      try {
        cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      } catch (e) {
        console.warn('Could not read config/config.json, will attempt defaults', e.message);
      }
      const env = process.env.NODE_ENV || 'development';
      const conf = (cfg && cfg[env]) || cfg.development || {};
      sequelize = new Sequelize(conf.database || 'postgres', conf.username || 'postgres', conf.password || '', {
        host: conf.host || '127.0.0.1',
        port: conf.port || 5432,
        dialect: conf.dialect || 'postgres',
        logging: false,
      });
    }

    // Import the User model definition and instantiate it with our sequelize
    const { pathToFileURL } = await import('url');
    const userDefPath = path.join(rootPath, 'src', 'models', 'User.js');
    const userDefUrl = pathToFileURL(userDefPath).href;
    const userModule = await import(userDefUrl);
    const defineUser = (userModule && (userModule.default || userModule));
    const User = defineUser(sequelize, DataTypes);

    console.log('Authenticating DB...');
    await sequelize.authenticate();
    console.log('DB connected. Scanning users...');

    const users = await User.findAll({ attributes: ['id', 'email', 'balance'] });
    console.log(`Found ${users.length} users`);

    let fixed = 0;
    for (const u of users) {
      const raw = u.balance;
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
        await u.update({ balance: 0 });
        console.log(`Fixed id=${u.id} email=${u.email} from ${raw} => 0`);
        fixed++;
      } else if (numeric !== raw) {
        await u.update({ balance: numeric });
        console.log(`Normalized id=${u.id} email=${u.email} from ${raw} => ${numeric}`);
        fixed++;
      }
    }

    console.log(`Done. Fixed/normalized ${fixed} users.`);
  await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Repair failed:', err);
    process.exit(2);
  }
})();
