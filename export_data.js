const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'sistema.sqlite');
const outputPath = path.join(__dirname, 'full_backup.sql');
const db = new sqlite3.Database(dbPath);

const tables = [
  'padeiros', 'produtos', 'clientes', 'colaboradores', 'admins', 
  'metas', 'atividades', 'avaliacoes', 'cronogramas', 'criterios', 'localizacoes'
];

async function exportData() {
  console.log('📡 Iniciando exportação de dados para SQL...');
  let sqlDump = '-- FULL BACKUP SISTEMA PADEIRO\n-- Generated for MySQL/Hostinger\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n';

  for (const table of tables) {
    console.log(`📦 Processando tabela: ${table}...`);
    sqlDump += `-- Data for ${table}\n`;
    sqlDump += `TRUNCATE TABLE \`${table}\`;\n`;

    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM \`${table}\``, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const chunks = [];
      const chunkSize = 50;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        let insertSql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES \n`;
        
        const values = chunk.map(row => {
          const vals = columns.map(col => {
            let val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') {
              return "'" + val.replace(/'/g, "''") + "'";
            }
            if (typeof val === 'object') {
              return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
            }
            return val;
          });
          return `(${vals.join(', ')})`;
        }).join(',\n');

        insertSql += values + ';\n';
        sqlDump += insertSql;
      }
    }
    sqlDump += '\n';
  }

  sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  fs.writeFileSync(outputPath, sqlDump);
  console.log(`✅ Exportação concluída! Arquivo criado: ${outputPath}`);
  db.close();
}

exportData().catch(console.error);
