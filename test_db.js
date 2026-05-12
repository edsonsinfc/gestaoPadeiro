require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./data/db');
const { Padeiro } = require('./data/models');

async function test() {
  await connectDB();
  console.log('Counting before:', await Padeiro.countDocuments());
  
  await Padeiro.create({ nome: 'Teste', email: 'teste@teste.com', cargo: 'PADEIRO' });
  console.log('Created test padeiro');
  
  console.log('Counting after:', await Padeiro.countDocuments());
  
  const p = await Padeiro.findOne({ email: 'teste@teste.com' });
  console.log('Found:', p ? p.nome : 'null');
  
  await Padeiro.deleteOne({ email: 'teste@teste.com' });
  console.log('Deleted test padeiro');
  
  process.exit(0);
}

test().catch(console.error);
