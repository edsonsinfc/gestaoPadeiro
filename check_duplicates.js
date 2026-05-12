require('dotenv').config();
const mongoose = require('mongoose');
const { Padeiro, Produto, Cliente } = require('./data/models');
const { connectDB } = require('./data/db');

async function check() {
  await connectDB();
  
  const padeirosCount = await Padeiro.countDocuments();
  const uniquePadeiros = await Padeiro.distinct('email');
  
  const produtosCount = await Produto.countDocuments();
  const uniqueProdutos = await Produto.distinct('nome');
  
  const clientesCount = await Cliente.countDocuments();
  const uniqueClientes = await Cliente.distinct('nome');

  console.log('--- RELATÓRIO DE DUPLICADOS ---');
  console.log(`Padeiros: Total ${padeirosCount}, Únicos (por email): ${uniquePadeiros.length}`);
  console.log(`Produtos: Total ${produtosCount}, Únicos (por nome): ${uniqueProdutos.length}`);
  console.log(`Clientes: Total ${clientesCount}, Únicos (por nome): ${uniqueClientes.length}`);
  
  if (padeirosCount > uniquePadeiros.length || produtosCount > uniqueProdutos.length || clientesCount > uniqueClientes.length) {
    console.log('\n⚠️ Existem duplicados! Vou sugerir uma limpeza.');
  } else {
    console.log('\n✅ Não há duplicados por campos chave.');
  }

  process.exit(0);
}

check().catch(console.error);
