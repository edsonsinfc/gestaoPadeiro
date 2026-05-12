const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'sistema.sqlite');
const db = new sqlite3.Database(dbPath);
db.configure('busyTimeout', 10000);

const run = (sql) => new Promise((resolve, reject) => {
  db.run(sql, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`- Column already exists, skipping.`);
        resolve();
      } else {
        reject(err);
      }
    } else {
      resolve();
    }
  });
});

async function migrate() {
  console.log('🚀 Iniciando migração de banco de dados...');

  try {
    console.log('🛠️ Atualizando tabela padeiros...');
    await run('ALTER TABLE `padeiros` ADD COLUMN `cpf` TEXT');
    await run('ALTER TABLE `padeiros` ADD COLUMN `rg` TEXT');
    await run('ALTER TABLE `padeiros` ADD COLUMN `dataNascimento` TEXT');
    console.log('✅ Tabela padeiros atualizada.');

    console.log('🛠️ Atualizando tabela clientes...');
    await run('ALTER TABLE `clientes` ADD COLUMN `cnpj` TEXT');
    await run('ALTER TABLE `clientes` ADD COLUMN `inscricaoEstadual` TEXT');
    await run('ALTER TABLE `clientes` ADD COLUMN `razaoSocial` TEXT');
    await run('ALTER TABLE `clientes` ADD COLUMN `email` TEXT');
    await run('ALTER TABLE `clientes` ADD COLUMN `telefone` TEXT');
    console.log('✅ Tabela clientes atualizada.');

    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    db.close();
  }
}

migrate();
