const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const connectDB = async () => {
  let retries = 10;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('✅ Connexion MySQL établie');
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ MySQL non prêt, tentative dans 3s... (${retries} restantes)`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  throw new Error('❌ Impossible de se connecter à MySQL');
};

module.exports = { sequelize, connectDB };
