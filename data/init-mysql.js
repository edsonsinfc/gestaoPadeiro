require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('./mysqlDB');

const TABLES = [
      {
        name: 'padeiros',
        schema: `CREATE TABLE IF NOT EXISTS padeiros (
          id VARCHAR(50) PRIMARY KEY,
          nome VARCHAR(255),
          cargo VARCHAR(255),
          funcao VARCHAR(255),
          filial VARCHAR(255),
          localTrabalho VARCHAR(255),
          dataNascimento VARCHAR(50),
          cpf VARCHAR(50),
          rg VARCHAR(50),
          pis VARCHAR(50),
          carteiraTrabalho VARCHAR(50),
          numSerie VARCHAR(50),
          email VARCHAR(255),
          emailPessoal VARCHAR(255),
          emailCorporativo VARCHAR(255),
          telefone VARCHAR(50),
          estado VARCHAR(100),
          codigoExterno VARCHAR(100),
          desligado VARCHAR(10),
          codTec VARCHAR(50),
          dataAdmissao VARCHAR(50),
          fusoHorario VARCHAR(100),
          passwordHash TEXT,
          firstAccessToken TEXT,
          firstAccessExpiry VARCHAR(50),
          ativo BOOLEAN DEFAULT TRUE,
          deletado BOOLEAN DEFAULT FALSE,
          role VARCHAR(50) DEFAULT 'padeiro',
          criadoEm VARCHAR(100),
          atualizadoEm VARCHAR(100)
        )`
      },
      {
        name: 'produtos',
        schema: `CREATE TABLE IF NOT EXISTS produtos (
          id VARCHAR(50) PRIMARY KEY,
          codigo VARCHAR(50),
          descricao TEXT,
          fornecedor VARCHAR(255),
          fotoPath TEXT,
          ativo BOOLEAN DEFAULT TRUE,
          criadoEm VARCHAR(100)
        )`
      },
      {
        name: 'clientes',
        schema: `CREATE TABLE IF NOT EXISTS clientes (
          id VARCHAR(50) PRIMARY KEY,
          numero VARCHAR(50),
          nome VARCHAR(255),
          cnpj VARCHAR(50),
          inscricaoEstadual VARCHAR(50),
          telefone VARCHAR(50),
          endereco TEXT,
          cidade VARCHAR(255),
          estado VARCHAR(100),
          cep VARCHAR(20),
          latitude VARCHAR(50),
          longitude VARCHAR(50),
          horarioAbertura VARCHAR(20),
          horarioFechamento VARCHAR(20),
          diasFuncionamento TEXT,
          ativo BOOLEAN DEFAULT TRUE,
          criadoEm VARCHAR(100)
        )`
      },
      {
        name: 'colaboradores',
        schema: `CREATE TABLE IF NOT EXISTS colaboradores (
          id VARCHAR(50) PRIMARY KEY,
          nome VARCHAR(255),
          cargo VARCHAR(255),
          filial VARCHAR(255),
          emailPessoal VARCHAR(255),
          emailCorporativo VARCHAR(255),
          telefone VARCHAR(50),
          criadoEm VARCHAR(100)
        )`
      },
      {
        name: 'admins',
        schema: `CREATE TABLE IF NOT EXISTS admins (
          id VARCHAR(50) PRIMARY KEY,
          nome VARCHAR(255),
          email VARCHAR(255),
          passwordHash TEXT,
          role VARCHAR(50) DEFAULT 'admin',
          filial VARCHAR(255),
          ativo BOOLEAN DEFAULT TRUE,
          deletado BOOLEAN DEFAULT FALSE,
          criadoEm VARCHAR(100)
        )`
      },
      {
        name: 'metas',
        schema: `CREATE TABLE IF NOT EXISTS metas (
          id VARCHAR(50) PRIMARY KEY,
          padeiroId VARCHAR(50),
          padeiroNome VARCHAR(255),
          metaKg DOUBLE,
          periodo VARCHAR(100),
          tipo VARCHAR(100),
          observacao TEXT,
          criadoPor VARCHAR(255),
          criadoEm VARCHAR(100),
          atualizadoEm VARCHAR(100)
        )`
      },
      {
        name: 'atividades',
        schema: `CREATE TABLE IF NOT EXISTS atividades (
          id VARCHAR(50) PRIMARY KEY,
          padeiroId VARCHAR(50),
          padeiroNome VARCHAR(255),
          clienteId VARCHAR(50),
          clienteNome VARCHAR(255),
          cronogramaId VARCHAR(50),
          produtoId VARCHAR(50),
          produtoNome VARCHAR(255),
          kgTotal DOUBLE,
          status VARCHAR(50),
          data VARCHAR(50),
          hora VARCHAR(20),
          inicioEm VARCHAR(100),
          terminadoEm VARCHAR(100),
          fimEm VARCHAR(100),
          tempoMinimoMinutos INT DEFAULT 0,
          fotos TEXT,
          assinatura LONGTEXT,
          localizacao TEXT,
          latitude VARCHAR(50),
          longitude VARCHAR(50),
          observacao TEXT,
          notaCliente INT,
          kgItens TEXT,
          atualizadoEm VARCHAR(100)
        )`
      },
      {
        name: 'avaliacoes',
        schema: `CREATE TABLE IF NOT EXISTS avaliacoes (
          id VARCHAR(50) PRIMARY KEY,
          padeiroId VARCHAR(50),
          padeiroNome VARCHAR(255),
          clienteId VARCHAR(50),
          clienteNome VARCHAR(255),
          atividadeId VARCHAR(50),
          tipo VARCHAR(50),
          respostas TEXT,
          nota DOUBLE,
          avaliadoPor VARCHAR(255),
          avaliadoPorNome VARCHAR(255),
          observacao TEXT,
          criadoEm VARCHAR(100)
        )`
      },
      {
        name: 'cronogramas',
        schema: `CREATE TABLE IF NOT EXISTS cronogramas (
          id VARCHAR(50) PRIMARY KEY,
          padeiroId VARCHAR(50),
          padeiroNome VARCHAR(255),
          codTec VARCHAR(50),
          clienteId VARCHAR(50),
          clienteNome VARCHAR(255),
          data VARCHAR(50),
          horario VARCHAR(20),
          status VARCHAR(50),
          tempoMinimoMinutos INT DEFAULT 0,
          posicao INT DEFAULT 0,
          observacao TEXT,
          criadoPor VARCHAR(255),
          criadoEm VARCHAR(100),
          atualizadoEm VARCHAR(100)
        )`
      },
      {
        name: 'criterios',
        schema: `CREATE TABLE IF NOT EXISTS criterios (
          id VARCHAR(50) PRIMARY KEY,
          texto TEXT,
          tipo VARCHAR(50)
        )`
      },
      {
        name: 'localizacoes',
        schema: `CREATE TABLE IF NOT EXISTS localizacoes (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50),
          userName VARCHAR(255),
          filial VARCHAR(255),
          lat DOUBLE,
          lng DOUBLE,
          accuracy DOUBLE,
          lastUpdate VARCHAR(100)
        )`
      },
      {
        name: 'historico_localizacoes',
        schema: `CREATE TABLE IF NOT EXISTS historico_localizacoes (
          id VARCHAR(50) PRIMARY KEY,
          userId VARCHAR(50),
          userName VARCHAR(255),
          lat DOUBLE,
          lng DOUBLE,
          accuracy DOUBLE,
          timestamp VARCHAR(100),
          INDEX (userId),
          INDEX (timestamp)
        )`
      }
];

async function initTables() {
  for (const table of TABLES) {
    await pool.execute(table.schema);
  }
  
  // Migrations for 'avaliacoes' table (ensure new columns exist and old ones are renamed/updated)
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM avaliacoes");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('clienteId')) await pool.execute("ALTER TABLE avaliacoes ADD COLUMN clienteId VARCHAR(50)");
    if (!colNames.includes('clienteNome')) await pool.execute("ALTER TABLE avaliacoes ADD COLUMN clienteNome VARCHAR(255)");
    if (!colNames.includes('atividadeId')) await pool.execute("ALTER TABLE avaliacoes ADD COLUMN atividadeId VARCHAR(50)");
    
    if (colNames.includes('criterios') && !colNames.includes('respostas')) {
      await pool.execute("ALTER TABLE avaliacoes CHANGE COLUMN criterios respostas TEXT");
    }
    
    // Change nota to DOUBLE if it's currently INT
    await pool.execute("ALTER TABLE avaliacoes MODIFY COLUMN nota DOUBLE");
    
  } catch (e) {
    console.log('   ⚠️ Migração parcial ou tabela inexistente (avaliacoes):', e.message);
  }

  // Migrations for 'metas' table
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM metas");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('observacao')) {
      await pool.execute("ALTER TABLE metas ADD COLUMN observacao TEXT");
    }
  } catch (e) {
    console.log('   ⚠️ Migração parcial ou tabela inexistente (metas):', e.message);
  }

  // Migrations for 'admins' table
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM admins");
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('filial')) await pool.execute("ALTER TABLE admins ADD COLUMN filial VARCHAR(255)");
    if (!colNames.includes('deletado')) await pool.execute("ALTER TABLE admins ADD COLUMN deletado BOOLEAN DEFAULT FALSE");
  } catch (e) {
    console.log('   ⚠️ Migração parcial ou tabela inexistente (admins):', e.message);
  }

  // Migrations for 'padeiros' table
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM padeiros");
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('deletado')) await pool.execute("ALTER TABLE padeiros ADD COLUMN deletado BOOLEAN DEFAULT FALSE");
  } catch (e) {
    console.log('   ⚠️ Migração parcial ou tabela inexistente (padeiros):', e.message);
  }

  // Migrations for 'atividades' table
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM atividades");
    const colNames = cols.map(c => c.Field);
    if (!colNames.includes('kgItens')) {
      await pool.execute("ALTER TABLE atividades ADD COLUMN kgItens TEXT");
    }
  } catch (e) {
    console.log('   ⚠️ Migração parcial ou tabela inexistente (atividades):', e.message);
  }
  console.log('   ✅ Tabelas MySQL verificadas/criadas');
}

if (require.main === module) {
  initTables()
    .then(() => { console.log('✅ MySQL configurado com sucesso!'); process.exit(0); })
    .catch(err => { console.error('❌ Erro:', err); process.exit(1); });
}

module.exports = { initTables };
