require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'brago-padeiro-secret-2026',
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
};
