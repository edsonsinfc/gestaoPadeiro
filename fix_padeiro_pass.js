require('dotenv').config();
const { connectDB } = require('./data/db');
const { Padeiro } = require('./data/models');
const bcrypt = require('bcryptjs');

async function fix() {
  await connectDB();
  const email = 'padeirobrago@gmail.com';
  const password = '123'; // User can change this later
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const p = await Padeiro.findOneAndUpdate(
    { email: new RegExp(`^${email}$`, 'i') },
    { passwordHash, firstAccessToken: null },
    { new: true }
  );
  
  if (p) {
    console.log("Padeiro atualizado com sucesso!");
    console.log("Email:", p.email);
    console.log("Nova Senha Temporária: 123");
  } else {
    console.log("Padeiro não encontrado.");
  }
  process.exit(0);
}

fix().catch(console.error);
