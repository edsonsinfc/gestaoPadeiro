const googleDriveService = require('./data/googleDriveService');
const { Readable } = require('stream');

async function runTest() {
  console.log('🔄 Iniciando teste de upload para o Google Drive...');
  
  if (!googleDriveService.isEnabled()) {
    console.error('❌ O serviço Google Drive não está habilitado ou configurado incorretamente.');
    process.exit(1);
  }

  // Criar um stream simples de teste
  const testStream = new Readable();
  testStream.push('Este é um arquivo de teste criado pelo Antigravity para verificar a integração com o Google Drive.');
  testStream.push(null);

  try {
    const filename = `teste-conexao-${Date.now()}.txt`;
    const result = await googleDriveService.uploadStream(testStream, filename, 'text/plain', 'testes');
    console.log('\n======================================================');
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!');
    console.log('O arquivo foi enviado para a sua pasta do Google Drive.');
    console.log('Nome do arquivo:', filename);
    console.log('ID do arquivo no Drive:', result.fileId);
    console.log('Caminho de acesso:', result.path);
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Falha no teste de upload:', error.message);
  }
}

// Carregar .env
require('dotenv').config();
runTest();
