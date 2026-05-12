require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./data/db');
const { 
  Padeiro, Produto, Cliente, Colaborador, Admin, 
  Meta, Atividade, Avaliacao, Cronograma, Criterio 
} = require('./data/models');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, 'data');

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function fixDuplication() {
  // Conecta explicitamente ao banco meu_banco
  const MONGODB_URI = process.env.MONGODB_URI;
  await mongoose.connect(MONGODB_URI, { dbName: 'meu_banco' });
  console.log('✅ MongoDB conectado com sucesso em meu_banco');
  
  console.log('🧹 Limpando banco...');
  const models = [Padeiro, Produto, Cliente, Colaborador, Admin, Meta, Atividade, Avaliacao, Cronograma, Criterio];
  for (const m of models) {
    await m.deleteMany({});
  }

  const collections = [
    { name: 'Padeiros', model: Padeiro, file: 'padeiros.json' },
    { name: 'Produtos', model: Produto, file: 'produtos.json' },
    { name: 'Clientes', model: Cliente, file: 'clientes.json' },
    { name: 'Colaboradores', model: Colaborador, file: 'colaboradores.json' },
    { name: 'Admins', model: Admin, file: 'admin.json' },
    { name: 'Metas', model: Meta, file: 'metas.json' },
    { name: 'Atividades', model: Atividade, file: 'atividades.json' },
    { name: 'Avaliações', model: Avaliacao, file: 'avaliacoes.json' },
    { name: 'Cronograma', model: Cronograma, file: 'cronograma.json' },
    { name: 'Critérios', model: Criterio, file: 'criterios.json' }
  ];

  for (const { name, model, file } of collections) {
    const data = readJSON(file);
    if (data.length === 0) continue;
    
    // Teste: NÃO forçar o _id. Deixar o Mongoose gerar.
    // Mas manter o 'id' como um campo normal se o frontend precisar dele.
    const mapped = data.map(item => {
      const { id, ...rest } = item;
      return { ...rest, id: id }; // 'id' agora é um campo comum
    });

    try {
      await model.insertMany(mapped);
      const count = await model.countDocuments();
      console.log(`   ✅ ${name}: ${count} documentos.`);
    } catch (e) {
      console.error(`   ❌ Erro em ${name}:`, e.message);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

fixDuplication().catch(console.error);
