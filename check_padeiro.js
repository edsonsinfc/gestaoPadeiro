require('dotenv').config();
const { connectDB } = require('./data/db');
const { Padeiro } = require('./data/models');

async function check() {
  await connectDB();
  const email = process.argv[2];
  if (!email) {
    console.log("Uso: node check_padeiro.js <email>");
    process.exit(1);
  }
  const p = await Padeiro.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (p) {
    console.log("Padeiro encontrado:");
    console.log("ID:", p._id);
    console.log("Nome:", p.nome);
    console.log("Email:", p.email);
    console.log("Has Password Hash:", !!p.passwordHash);
    console.log("Password Hash:", p.passwordHash);
    console.log("Role:", p.role);
  } else {
    console.log("Padeiro não encontrado.");
  }
  process.exit(0);
}

check().catch(console.error);
