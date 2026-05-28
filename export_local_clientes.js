/**
 * Script de Exportação de Clientes Local - BRAGO
 * 
 * Este utilitário exporta a tabela 'clientes' do seu banco de dados MySQL local
 * diretamente para o arquivo 'data/clientes.json'.
 * 
 * Como usar:
 * 1. Rode localmente: node export_local_clientes.js
 * 2. Commit e Push no Git (isso envia a base atualizada para o GitHub)
 * 3. Clique em "Sincronizar Base Local" no painel da Hostinger!
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('./data/mysqlDB');

async function exportClientes() {
  console.log('🍞 Iniciando exportação da tabela de clientes local...');

  try {
    // Buscar todos os clientes do banco de dados MySQL local
    const [rows] = await pool.query('SELECT * FROM clientes');
    
    console.log(`🔍 Encontrados ${rows.length} clientes no seu banco MySQL local.`);

    const dataPath = path.join(__dirname, 'data', 'clientes.json');
    
    // Formatar e salvar como JSON limpo
    fs.writeFileSync(dataPath, JSON.stringify(rows, null, 2), 'utf-8');
    
    console.log(`✅ Sucesso! O arquivo "${dataPath}" foi atualizado com as informações reais do seu banco.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao exportar dados dos clientes:', error);
    process.exit(1);
  }
}

exportClientes();
