const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'sistema.sqlite');
const outputPath = path.join(__dirname, 'hostinger_database.sql');
const db = new sqlite3.Database(dbPath);

const typeMapping = {
  'INTEGER': 'INT',
  'TEXT': 'TEXT',
  'REAL': 'DOUBLE',
  'BLOB': 'LONGBLOB'
};

async function getTables() {
  return new Promise((res, rej) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
      if (err) rej(err);
      else res(rows.map(r => r.name));
    });
  });
}

async function getColumns(table) {
  return new Promise((res, rej) => {
    db.all(`PRAGMA table_info(\`${table}\`)`, (err, rows) => {
      if (err) rej(err);
      else res(rows);
    });
  });
}

async function exportDynamic() {
  console.log('📡 Iniciando exportação dinâmica (Auto-detectando Schema)...');
  let sqlDump = '-- DYNAMIC EXPORT SISTEMA PADEIRO\nSET FOREIGN_KEY_CHECKS = 0;\n\n';

  const tables = await getTables();

  for (const table of tables) {
    console.log(`🛠️ Detectando estrutura: ${table}...`);
    const columns = await getColumns(table);
    
    // Build CREATE TABLE
    let createSql = `CREATE TABLE IF NOT EXISTS \`${table}\` (\n`;
    const colDefs = columns.map(c => {
      let type = typeMapping[c.type.toUpperCase()] || 'TEXT';
      if (c.name === 'id') type = 'VARCHAR(100)';
      let def = `  \`${c.name}\` ${type}`;
      if (c.pk) def += ' PRIMARY KEY';
      return def;
    });
    createSql += colDefs.join(',\n') + '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n';
    sqlDump += createSql;

    // Build INSERTs
    const rows = await new Promise((res, rej) => {
      db.all(`SELECT * FROM \`${table}\``, (err, rows) => err ? rej(err) : res(rows));
    });

    if (rows.length > 0) {
      console.log(`📦 Exportando ${rows.length} registros de ${table}...`);
      const colNames = columns.map(c => c.name);
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        sqlDump += `INSERT INTO \`${table}\` (\`${colNames.join('`, `')}\`) VALUES \n`;
        sqlDump += chunk.map(row => {
          const vals = colNames.map(c => {
            if (row[c] === null) return 'NULL';
            if (typeof row[c] === 'string') return "'" + row[c].replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
            return row[c];
          });
          return `(${vals.join(', ')})`;
        }).join(',\n') + ';\n';
      }
    }
    sqlDump += '\n';
  }

  sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  fs.writeFileSync(outputPath, sqlDump, 'utf8');
  console.log(`✅ Sucesso! Arquivo gerado com esquema real: ${outputPath}`);
  db.close();
}

exportDynamic().catch(console.error);
