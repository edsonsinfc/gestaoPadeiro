require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./data/db');
const { Padeiro, Produto, Cliente, Colaborador } = require('./data/models');

async function run() {
  await connectDB();
  console.log('Padeiros:', await Padeiro.countDocuments());
  console.log('Produtos:', await Produto.countDocuments());
  console.log('Clientes:', await Cliente.countDocuments());
  console.log('Colaboradores:', await Colaborador.countDocuments());
  process.exit(0);
}
run().catch(console.error);
