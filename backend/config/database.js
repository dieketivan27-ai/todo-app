const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelizeOptions = {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  ...(isProduction && {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  })
};

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, sequelizeOptions);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      ...sequelizeOptions,
      host: process.env.DB_HOST,
    }
  );
}

const connectDB = async () => {
  let retries = 10;
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('✅ Connexion PostgreSQL établie');
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ PostgreSQL non prêt, tentative dans 3s... (${retries} restantes)`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  throw new Error('❌ Impossible de se connecter à PostgreSQL');
};

module.exports = { sequelize, connectDB };
