require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./data/db');
const { 
  Padeiro, Produto, Cliente, Colaborador, Admin, 
  Meta, Atividade, Avaliacao, Cronograma, Criterio 
} = require('./data/models');
const { autoMigrate } = require('./data/migrate');

async function cleanAndMigrate() {
  await connectDB();
  
  console.log('🧹 Limpando coleções...');
  await Promise.all([
    Padeiro.deleteMany({}),
    Produto.deleteMany({}),
    Cliente.deleteMany({}),
    Colaborador.deleteMany({}),
    Admin.deleteMany({}),
    Meta.deleteMany({}),
    Atividade.deleteMany({}),
    Avaliacao.deleteMany({}),
    Cronograma.deleteMany({}),
    Criterio.deleteMany({})
  ]);
  console.log('✅ Banco de dados limpo.');

  console.log('🚀 Iniciando migração limpa...');
  await autoMigrate();
  
  console.log('\n✨ Limpeza e migração concluídas com sucesso!');
  process.exit(0);
}

cleanAndMigrate().catch(console.error);
