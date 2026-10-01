const fs = require('fs');
const path = require('path');
const { pool } = require('./data/mysqlDB');

async function clean() {
  console.log('🧹 Iniciando limpeza de produtos obsoletos...');

  // 1. Limpar no MySQL
  const [delResult] = await pool.query(`
    DELETE FROM produtos 
    WHERE 
      fornecedor LIKE '%DOUPAN%' OR
      fornecedor LIKE '%ORGAO PUBLICO%' OR
      fornecedor LIKE '%ÓRGÃO PÚBLICO%' OR
      fornecedor LIKE '%DIMINAS%' OR
      fornecedor LIKE '%MELHOR BOCADO%' OR
      fornecedor LIKE '%AB BRASIL%' OR
      fornecedor LIKE '%RICONI%' OR
      fornecedor LIKE '%ALUMIFORMAS%' OR
      fornecedor LIKE '%GOIAS%' OR
      fornecedor LIKE '%GOIÁS%' OR
      fornecedor LIKE '%POLICO%' OR
      fornecedor LIKE '%PONTA%' OR
      fornecedor LIKE '%SS ALIMENTOS%' OR
      fornecedor LIKE '%PEROLA SS%' OR
      (TRIM(fornecedor) = 'SS' OR TRIM(fornecedor) LIKE 'SS %' OR TRIM(fornecedor) LIKE '% SS' OR TRIM(fornecedor) LIKE '% SS %') OR
      descricao LIKE '%batedor%arame%' OR
      descricao LIKE '%batedor%fouet%'
  `);
  console.log(`✅ [MySQL] ${delResult.affectedRows} produtos excluídos do banco de dados MySQL local.`);

  const [countRes] = await pool.query('SELECT COUNT(*) as total FROM produtos');
  console.log(`📊 [MySQL] Total restante de produtos ativos no MySQL: ${countRes[0].total}`);

  // 2. Limpar em data/produtos.json
  const jsonPath = path.join(__dirname, 'data', 'produtos.json');
  if (fs.existsSync(jsonPath)) {
    const produtos = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const initialCount = produtos.length;

    function shouldRemove(p) {
      const f = (p.fornecedor || '').toUpperCase().trim();
      const d = (p.descricao || '').toUpperCase().trim();

      if (f.includes('DOUPAN')) return true;
      if (f.includes('ORGAO PUBLICO') || f.includes('ÓRGÃO PÚBLICO')) return true;
      if (f.includes('DIMINAS')) return true;
      if (f.includes('MELHOR BOCADO')) return true;
      if (f.includes('AB BRASIL')) return true;
      if (f.includes('RICONI')) return true;
      if (f.includes('ALUMIFORMAS')) return true;
      if (f.includes('GOIAS') || f.includes('GOIÁS')) return true;
      if (f.includes('POLICO')) return true;
      if (f.includes('PONTA')) return true;
      if (f.includes('SS ALIMENTOS') || f.includes('PEROLA SS')) return true;
      if (f === 'SS' || f.startsWith('SS ') || f.endsWith(' SS') || f.includes(' SS ')) return true;
      if (d.includes('BATEDOR') && (d.includes('ARAME') || d.includes('FOUET') || d.includes('INOX'))) return true;
      if (d.includes('BATEDOR DE ARAME')) return true;

      return false;
    }

    const filtered = produtos.filter(p => !shouldRemove(p));
    const removedCount = initialCount - filtered.length;

    fs.writeFileSync(jsonPath, JSON.stringify(filtered, null, 2), 'utf-8');
    console.log(`✅ [JSON] ${removedCount} produtos excluídos de data/produtos.json (de ${initialCount} para ${filtered.length}).`);
  }

  process.exit(0);
}

clean().catch(err => {
  console.error('❌ Erro na limpeza:', err);
  process.exit(1);
});
