require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const { Produto } = require('./data/db-adapter');
const googleDriveService = require('./data/googleDriveService');
const driveMappings = require('./data/driveMappings');

const TEMP_DIR = path.join(__dirname, 'public', 'img', 'produtos');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function run() {
  console.log('🚀 [MIGRATE] Inicializando migração de fotos...');
  
  if (!googleDriveService.isEnabled()) {
    console.error('❌ Google Drive não está habilitado no seu arquivo .env ou credenciais estão inválidas.');
    process.exit(1);
  }

  // 1. Obter todos os produtos do MySQL
  let produtos = [];
  try {
    produtos = await Produto.find();
    console.log(`📦 [MIGRATE] Encontrados ${produtos.length} produtos no banco de dados.`);
  } catch (err) {
    console.error('❌ Erro ao buscar produtos no MySQL:', err.message);
    process.exit(1);
  }

  // Filtrar produtos com código válido
  const validProds = produtos.filter(p => p.codigo && p.codigo.trim() !== '');
  console.log(`🔍 [MIGRATE] ${validProds.length} produtos possuem códigos válidos.`);

  // 2. Conectar ao FTP e listar arquivos
  console.log('📡 Conectando ao FTP...');
  const client = new ftp.Client();
  client.ftp.verbose = false;
  let ftpFiles = [];
  try {
    await client.access({
      host: 'cloud-6010.reposit.com.br',
      port: 30037,
      user: 'brago',
      password: 'brago@cloud',
      secure: false
    });
    ftpFiles = await client.list();
    console.log(`📸 [MIGRATE] Encontradas ${ftpFiles.length} fotos no FTP.`);
  } catch (err) {
    console.error('❌ Erro ao conectar ao FTP:', err.message);
    client.close();
    process.exit(1);
  }

  // Indexar arquivos do FTP
  const ftpCatalog = {};
  const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  for (const f of ftpFiles) {
    if (f.type === 2) continue; // skip dirs
    const dotIdx = f.name.lastIndexOf('.');
    if (dotIdx === -1) continue;
    const ext = f.name.substring(dotIdx).toLowerCase();
    if (!validExts.includes(ext)) continue;
    const baseName = f.name.substring(0, dotIdx);
    if (!ftpCatalog[baseName]) {
      ftpCatalog[baseName] = f.name;
    }
  }

  // Filtrar quais produtos de fato têm foto no FTP
  const prodsToMigrate = validProds.map(p => {
    return {
      id: p.id,
      codigo: p.codigo,
      descricao: p.descricao,
      remoteFile: ftpCatalog[p.codigo]
    };
  }).filter(p => p.remoteFile);

  console.log(`📊 [MIGRATE] Dos ${validProds.length} produtos do sistema, ${prodsToMigrate.length} possuem foto correspondente no FTP.`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < prodsToMigrate.length; i++) {
    const prod = prodsToMigrate[i];
    const prefix = `[${i + 1}/${prodsToMigrate.length}]`;
    
    // Verificar se já temos o mapeamento no Drive
    let fileId = driveMappings.getMapping(prod.remoteFile);
    if (!fileId) {
      // Tenta buscar pelo nome no drive pra não duplicar arquivos caso já tenha subido em outro teste
      fileId = await googleDriveService.findFileByName(prod.remoteFile);
      if (fileId) {
        driveMappings.saveMapping(prod.remoteFile, fileId);
      }
    }

    if (fileId) {
      console.log(`${prefix} ⏭️  ${prod.descricao} (${prod.codigo}) já está no Google Drive. Pulando.`);
      skippedCount++;
      continue;
    }

    // Baixar do FTP temporariamente
    const destPath = path.join(TEMP_DIR, prod.remoteFile);
    try {
      console.log(`${prefix} 📥 Baixando ${prod.remoteFile} do FTP...`);
      await client.downloadTo(destPath, prod.remoteFile);
      
      if (fs.existsSync(destPath)) {
        console.log(`${prefix} 📤 Enviando para o Google Drive...`);
        const mimeType = prod.remoteFile.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        // uploadLocalFile realiza o upload pro drive e deleta o arquivo local temporário se der certo
        const uploadResult = await googleDriveService.uploadLocalFile(destPath, prod.remoteFile, mimeType, 'produtos');
        
        if (uploadResult.isDrive && uploadResult.fileId) {
          driveMappings.saveMapping(prod.remoteFile, uploadResult.fileId);
          console.log(`✅ ${prefix} ${prod.descricao} (${prod.codigo}) migrado com sucesso!`);
          successCount++;
        } else {
          console.error(`⚠️  ${prefix} Salvo localmente, mas falhou ao enviar pro Drive.`);
          errorCount++;
        }
      } else {
        console.error(`❌ ${prefix} Falha ao verificar arquivo baixado.`);
        errorCount++;
      }
    } catch (err) {
      console.error(`❌ ${prefix} Erro ao processar ${prod.codigo}:`, err.message);
      errorCount++;
      // Limpar se o download falhar no meio
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch(e) {}
      }
    }

    // Pequena pausa para evitar sobrecarga na API do Google
    await new Promise(r => setTimeout(r, 150));
  }

  // Fechar FTP
  try { client.close(); } catch(e) {}
  
  console.log('\n🏁 ============================================');
  console.log('   MIGRAÇÃO CONCLUÍDA!');
  console.log('   ============================================');
  console.log(`   Total de fotos processadas: ${prodsToMigrate.length}`);
  console.log(`   Migradas com sucesso:       ${successCount}`);
  console.log(`   Já migradas/Puladas:        ${skippedCount}`);
  console.log(`   Erros:                      ${errorCount}`);
  console.log('   ============================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erro fatal na migração:', err);
  process.exit(1);
});
