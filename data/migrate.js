/**
 * Migration Script - JSON → MySQL
 * Reads existing JSON files and inserts into MySQL tables
 * Run: node data/migrate.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const { Padeiro, Produto, Cliente, Colaborador, Admin, Meta, Atividade, Avaliacao, Cronograma, Criterio } = require('./db-adapter');

const DATA_DIR = __dirname;

function readJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return [];
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

async function migrate() {
  console.log('🍞 ══════════════════════════════════════════');
  console.log('   MIGRAÇÃO JSON → MySQL');
  console.log('   ══════════════════════════════════════════\n');


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
    const existing = await model.countDocuments();
    if (existing > 0) {
      console.log(`   ⏭️  ${name}: ${existing} documentos já existem, pulando.`);
      continue;
    }

    const data = readJSON(file);
    if (data.length === 0) {
      console.log(`   ⚠️  ${name}: arquivo ${file} vazio ou não encontrado.`);
      continue;
    }

    let migrated = 0;
    let skipped = 0;
    for (const item of data) {
      try {
        await model.create(item);
        migrated++;
      } catch (e) {
        skipped++;
      }
    }
    console.log(`   ✅ ${name}: ${migrated} inseridos, ${skipped} já existiam`);
  }

  console.log('\n══════════════════════════════════════════');
  console.log('   ✅ MIGRAÇÃO CONCLUÍDA!');
  console.log('══════════════════════════════════════════\n');
  process.exit(0);
}

// Check if collections are empty (used by server.js auto-migration)
async function needsMigration() {
  const count = await Padeiro.countDocuments();
  return count === 0;
}

// Auto-migrate (called from server.js on first run)
async function autoMigrate() {
  const needs = await needsMigration();
  if (!needs) return false;

  console.log('🔄 Primeira execução com MySQL. Migrando dados...\n');

  const padeiroFile = path.join(DATA_DIR, 'padeiros.json');
  if (!fs.existsSync(padeiroFile)) {
    console.log('📋 Nenhum dado encontrado. Executando importação inicial...\n');
    const { runImport } = require('./import');
    await runImport();
    return true;
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
  ];

  for (const { name, model, file } of collections) {
    const data = readJSON(file);
    if (data.length === 0) continue;
    let migrated = 0;
    for (const item of data) {
      try { await model.create(item); migrated++; } catch (e) { /* duplicate, skip */ }
    }
    if (migrated > 0) console.log(`   ✅ ${name}: ${migrated} registros migrados`);
  }
  return true;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  migrate().catch(console.error);
}

module.exports = { autoMigrate, needsMigration };
