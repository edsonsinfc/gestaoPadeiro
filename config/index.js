require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'brago-padeiro-secret-2026',
  BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '222151940219-ithbdoleku13oqpo58qaglbmtddq1m02.apps.googleusercontent.com'
};
