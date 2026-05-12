const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'sistema.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});

async function init() {
  console.log('🚀 Iniciando configuração do SQLite DINÂMICO (SQL Local)...');
  
  try {
    const dataMapping = {
      'padeiros.db': { table: 'padeiros', schema: '`id` TEXT PRIMARY KEY, `nome` TEXT, `cargo` TEXT, `email` TEXT, `telefone` TEXT, `filial` TEXT, `status` TEXT, `role` TEXT, `ativo` INTEGER, `passwordHash` TEXT, `firstAccessToken` TEXT, `firstAccessExpiry` TEXT, `codTec` TEXT, `criadoEm` TEXT, `atualizadoEm` TEXT, `cpf` TEXT, `rg` TEXT, `dataNascimento` TEXT' },
      'produtos.db': { table: 'produtos', schema: '`id` TEXT PRIMARY KEY, `codigo` TEXT, `descricao` TEXT, `fornecedor` TEXT, `fotoPath` TEXT, `ativo` TEXT, `criadoEm` TEXT' },
      'clientes.db': { table: 'clientes', schema: '`id` TEXT PRIMARY KEY, `numero` TEXT, `nome` TEXT, `razaoSocial` TEXT, `cnpj` TEXT, `inscricaoEstadual` TEXT, `endereco` TEXT, `cidade` TEXT, `estado` TEXT, `cep` TEXT, `latitude` TEXT, `longitude` TEXT, `telefone` TEXT, `email` TEXT, `horarioAbertura` TEXT, `horarioFechamento` TEXT, `diasFuncionamento` TEXT, `ativo` TEXT, `criadoEm` TEXT' },
      'colaboradores.db': { table: 'colaboradores', schema: '`id` TEXT PRIMARY KEY, `nome` TEXT, `email` TEXT, `cargo` TEXT, `filial` TEXT' },
      'admin.db': { table: 'admins', schema: '`id` TEXT PRIMARY KEY, `nome` TEXT, `email` TEXT, `passwordHash` TEXT, `role` TEXT, `filial` TEXT, `ativo` INTEGER, `criadoEm` TEXT' },
      'metas.db': { table: 'metas', schema: '`id` TEXT PRIMARY KEY, `padeiroId` TEXT, `padeiroNome` TEXT, `metaKg` TEXT, `periodo` TEXT, `observacao` TEXT, `criadoPor` TEXT, `criadoEm` TEXT, `atualizadoEm` TEXT' },
      'atividades.db': { table: 'atividades', schema: '`id` TEXT PRIMARY KEY, `padeiroId` TEXT, `padeiroNome` TEXT, `clienteId` TEXT, `clienteNome` TEXT, `status` TEXT, `inicioEm` TEXT, `data` TEXT, `hora` TEXT, `localizacao` TEXT, `latitude` TEXT, `longitude` TEXT, `fotos` TEXT, `fotoDescricao` TEXT, `lastStep` TEXT, `atualizadoEm` TEXT, `kgTotal` TEXT, `kgItens` TEXT, `notaCliente` TEXT, `comentarioCliente` TEXT, `assinatura` TEXT, `fimEm` TEXT' },
      'avaliacoes.db': { table: 'avaliacoes', schema: '`id` TEXT PRIMARY KEY, `tipo` TEXT, `padeiroId` TEXT, `padeiroNome` TEXT, `clienteId` TEXT, `clienteNome` TEXT, `nota` TEXT, `comentario` TEXT, `avaliadoPor` TEXT, `avaliadoPorNome` TEXT, `criadoEm` TEXT, `respostas` TEXT, `observacao` TEXT' },
      'cronogramas.db': { table: 'cronogramas', schema: '`id` TEXT PRIMARY KEY, `padeiroId` TEXT, `padeiroNome` TEXT, `codTec` TEXT, `clienteId` TEXT, `clienteNome` TEXT, `data` TEXT, `horario` TEXT, `status` TEXT, `tempoMinimoMinutos` INTEGER, `posicao` INTEGER, `observacao` TEXT, `criadoPor` TEXT, `criadoEm` TEXT, `atualizadoEm` TEXT' },
      'criterios.db': { table: 'criterios', schema: '`id` TEXT PRIMARY KEY, `texto` TEXT, `tipo` TEXT' },
      'localizacoes.db': { table: 'localizacoes', schema: '`id` TEXT PRIMARY KEY, `userId` TEXT, `userName` TEXT, `filial` TEXT, `lat` REAL, `lng` REAL, `accuracy` REAL, `lastUpdate` TEXT' }
    };

    const dataDir = __dirname;
    for (const [file, info] of Object.entries(dataMapping)) {
      const table = info.table;
      const filePath = path.join(dataDir, file);
      
      console.log(`🛠️ Preparando tabela: ${table}...`);
      
      // Sempre criar a tabela com esquema padrão se não existir (ou resetar se necessário)
      // Aqui vamos criar se não existir ou se quisermos forçar o esquema novo
      await run(`CREATE TABLE IF NOT EXISTS \`${table}\` (${info.schema})`);

      if (fs.existsSync(filePath)) {
        console.log(`📦 Importando dados de ${file}...`);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(data) && data.length > 0) {
            // Se a tabela já tem dados, talvez não queiramos duplicar, 
            // mas como é um script de init, vamos limpar e reinserir se houver arquivo JSON
            await run(`DELETE FROM \`${table}\``);
            
            // Descobrir colunas reais da tabela para não dar erro de INSERT
            const tableInfo = await new Promise((res) => db.all(`PRAGMA table_info(\`${table}\`)`, (err, rows) => res(rows)));
            const validColumns = tableInfo.map(c => c.name);

            for (const item of data) {
              const itemKeys = Object.keys(item).filter(k => validColumns.includes(k));
              if (itemKeys.length === 0) continue;
              
              const values = itemKeys.map(k => (item[k] !== null && typeof item[k] === 'object') ? JSON.stringify(item[k]) : item[k]);
              const placeholders = itemKeys.map(() => '?').join(', ');
              
              const sql = `INSERT INTO \`${table}\` (\`${itemKeys.join('`, `')}\`) VALUES (${placeholders})`;
              await run(sql, values);
            }
          }
        } catch (e) {
          console.warn(`⚠️ Erro ao processar ${file}: ${e.message}`);
        }
      }
    }

    console.log('✅ SQLite configurado com sucesso! Tabelas prontas para uso.');
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro crítico na configuração do SQLite:', error);
    process.exit(1);
  }
}

init();
