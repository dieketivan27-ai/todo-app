const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// SSL toujours activé si DATABASE_URL est présent (Render) ou si on est en production
const sslConfig = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

const baseOptions = {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  }
};

let sequelize;

if (process.env.DATABASE_URL) {
  // Extraire host et dbname depuis l'URL pour le log (sans mot de passe)
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`🔌 Connexion DB → host: ${url.hostname}, base: ${url.pathname.replace('/', '')}`);
  } catch (e) {
    console.log('🔌 Connexion via DATABASE_URL (parsing impossible)');
  }

  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...baseOptions,
    ...sslConfig  // SSL toujours activé quand on utilise DATABASE_URL (Render)
  });
} else {
  console.log(`🔌 Connexion DB → host: ${process.env.DB_HOST}, base: ${process.env.DB_NAME}`);

  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      ...baseOptions,
      host: process.env.DB_HOST,
      // SSL uniquement si NODE_ENV=production en mode variables séparées
      ...(isProduction ? sslConfig : {})
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
      console.error(`⏳ PostgreSQL non prêt — ${err.message} — tentative dans 3s... (${retries} restantes)`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  throw new Error('❌ Impossible de se connecter à PostgreSQL');
};

module.exports = { sequelize, connectDB };
