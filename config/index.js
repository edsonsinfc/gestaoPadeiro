require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'brago-padeiro-secret-2026',
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '222151940219-hv5np976c30anjd5p04abssp75rtmesp.apps.googleusercontent.com'
};
