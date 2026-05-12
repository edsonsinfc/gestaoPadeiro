/**
 * MongoDB Connection - BRAGO Sistema Padeiro
 * Uses Mongoose to connect to MongoDB Atlas
 */
require('dotenv').config();

// Fix: força uso do DNS do Google para resolver o SRV do MongoDB Atlas
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ MongoDB conectado com sucesso');
    return mongoose.connection;
  } catch (err) {
    console.error('   ⚠️  MongoDB não disponível (Backup desativado):', err.message);
    // process.exit(1); // Don't exit, allow running on local JSON files
  }
}

module.exports = { connectDB, mongoose };
