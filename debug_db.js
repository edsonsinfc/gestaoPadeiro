require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./data/db');

async function run() {
  await connectDB();
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('Databases:', dbs.databases.map(d => d.name));
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in current DB:', collections.map(c => c.name));
  
  // Count manually via native driver
  const padeirosCol = mongoose.connection.db.collection('padeiros');
  const count = await padeirosCol.countDocuments();
  console.log('Native Padeiros count:', count);
  
  process.exit(0);
}
run().catch(console.error);
