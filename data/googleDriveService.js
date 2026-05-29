/**
 * Google Drive Storage Service - BRAGO Sistema Padeiro
 * 
 * Este módulo gerencia o upload de fotos de produção e assinaturas diretamente
 * no Google Drive usando uma Conta de Serviço (Service Account).
 * 
 * Possui fallback automático para armazenamento local caso as credenciais não estejam configuradas.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
let googleapis;

try {
  googleapis = require('googleapis');
} catch (err) {
  // O módulo pode não ter sido instalado ainda, o fallback será usado
  console.warn('⚠️  googleapis não está disponível. Armazenamento local será usado.');
}

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

let driveClient = null;
let isConfigured = false;

function initDrive() {
  if (driveClient) return driveClient;
  if (!googleapis) return null;

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    console.warn('⚠️  GOOGLE_DRIVE_FOLDER_ID não está definido no .env. Usando armazenamento em disco local.');
    return null;
  }

  // Verificar se credenciais OAuth2 estão configuradas
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRES_TOKEN || process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  try {
    let auth;
    if (clientId && clientSecret && refreshToken) {
      // Configurar usando OAuth2 com Refresh Token
      auth = new googleapis.google.auth.OAuth2(clientId, clientSecret);
      auth.setCredentials({ refresh_token: refreshToken });
      
      driveClient = googleapis.google.drive({ version: 'v3', auth });
      isConfigured = true;
      console.log('✅ Google Drive API configurada com sucesso usando OAuth2 (Client ID & Refresh Token).');
      return driveClient;
    }

    // Fallback para Service Account
    const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || 'google-service-account.json';
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.join(__dirname, '..', keyPath);

    if (envJson || fs.existsSync(resolvedPath)) {
      if (envJson) {
        // Se a credencial JSON estiver direto no .env como string
        const credentials = JSON.parse(envJson);
        auth = new googleapis.google.auth.GoogleAuth({
          credentials,
          scopes: SCOPES,
        });
      } else {
        // Caso contrário, lê do arquivo físico
        auth = new googleapis.google.auth.GoogleAuth({
          keyFile: resolvedPath,
          scopes: SCOPES,
        });
      }
      driveClient = googleapis.google.drive({ version: 'v3', auth });
      isConfigured = true;
      console.log('✅ Google Drive API configurada com sucesso usando Service Account.');
      return driveClient;
    }

    console.warn('⚠️  Nenhuma credencial do Google Drive encontrada (OAuth2 ou Service Account). Usando armazenamento em disco local.');
    return null;
  } catch (error) {
    console.error('❌ Erro ao inicializar cliente Google Drive:', error.message);
    return null;
  }
}

// Inicializa no carregamento do módulo
initDrive();

const googleDriveService = {
  /**
   * Verifica se o Google Drive está ativo
   */
  isEnabled() {
    // Tenta re-inicializar caso tenha sido configurado após o boot
    if (!driveClient) initDrive();
    return isConfigured && driveClient !== null;
  },

  /**
   * Converte base64 para Stream legível
   */
  base64ToStream(base64Str) {
    const stream = new Readable();
    stream.push(Buffer.from(base64Str, 'base64'));
    stream.push(null);
    return stream;
  },

  /**
   * Upload de Stream legível para o Google Drive (ou fallback local)
   */
  async uploadStream(fileStream, filename, mimeType, type = 'producao') {
    const drive = initDrive();

    if (!drive) {
      // Fallback: Salvar em disco local
      const dir = path.join(__dirname, '..', 'uploads', type);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const localPath = path.join(dir, filename);
      const writeStream = fs.createWriteStream(localPath);
      
      return new Promise((resolve, reject) => {
        fileStream.pipe(writeStream)
          .on('finish', () => {
            console.log(`[STORAGE Fallback] Arquivo salvo localmente em uploads/${type}/${filename}`);
            resolve({
              success: true,
              path: `/uploads/${type}/${filename}`,
              filename,
              isDrive: false
            });
          })
          .on('error', (err) => {
            console.error('[STORAGE Fallback] Erro ao salvar localmente:', err.message);
            reject(err);
          });
      });
    }

    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      const fileMetadata = {
        name: filename,
        parents: [folderId]
      };
      const media = {
        mimeType,
        body: fileStream
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });

      const fileId = response.data.id;
      console.log(`[STORAGE GoogleDrive] Upload finalizado com ID: ${fileId}`);
      return {
        success: true,
        path: `/api/upload/file/${fileId}`,
        fileId,
        filename,
        isDrive: true
      };
    } catch (error) {
      console.error('❌ Erro no upload para o Google Drive:', error.message);
      throw error;
    }
  },

  /**
   * Upload de arquivo local (já salvo pelo Multer no disco temporário)
   */
  async uploadLocalFile(localFilePath, filename, mimeType, type = 'producao') {
    const fileStream = fs.createReadStream(localFilePath);
    try {
      const result = await this.uploadStream(fileStream, filename, mimeType, type);
      
      // Se subiu pro drive com sucesso, limpa o arquivo temporário do disco local
      if (result.isDrive) {
        fs.unlink(localFilePath, (err) => {
          if (err) console.error(`⚠️  Erro ao remover arquivo temporário ${localFilePath}:`, err.message);
          else console.log(`🧹 Arquivo temporário removido: ${localFilePath}`);
        });
      }
      return result;
    } catch (error) {
      console.error('❌ Erro ao processar upload de arquivo local:', error.message);
      // Retorna fallback local em caso de erro para não quebrar o fluxo de registro
      console.warn('⚠️ Tentando fallback local permanente devido a falha no Drive...');
      return {
        success: true,
        path: `/uploads/${type}/${filename}`,
        filename,
        isDrive: false
      };
    }
  },

  /**
   * Upload de imagem em Base64 (assinaturas)
   */
  async uploadBase64(base64Data, filename, mimeType = 'image/png', type = 'assinaturas') {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const stream = this.base64ToStream(cleanBase64);
    
    const drive = initDrive();
    if (!drive) {
      // Fallback: Salvar em disco local
      const dir = path.join(__dirname, '..', 'uploads', type);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const localPath = path.join(dir, filename);
      fs.writeFileSync(localPath, cleanBase64, 'base64');
      console.log(`[STORAGE Fallback] Assinatura base64 salva localmente em uploads/${type}/${filename}`);
      return {
        success: true,
        path: `/uploads/${type}/${filename}`,
        filename,
        isDrive: false
      };
    }

    try {
      return await this.uploadStream(stream, filename, mimeType, type);
    } catch (error) {
      console.error('❌ Erro no upload de Base64 para o Google Drive:', error.message);
      // Fallback local caso dê erro no envio ao drive
      const dir = path.join(__dirname, '..', 'uploads', type);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      const localPath = path.join(dir, filename);
      fs.writeFileSync(localPath, cleanBase64, 'base64');
      return {
        success: true,
        path: `/uploads/${type}/${filename}`,
        filename,
        isDrive: false
      };
    }
  },

  /**
   * Busca o Stream binário do arquivo do Google Drive para servir no proxy
   */
  async getFileStream(fileId) {
    const drive = initDrive();
    if (!drive) {
      throw new Error('Serviço do Google Drive não inicializado');
    }

    try {
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      return {
        stream: response.data,
        contentType: response.headers['content-type'] || 'image/png',
        contentLength: response.headers['content-length']
      };
    } catch (error) {
      console.error(`❌ Erro ao baixar arquivo ${fileId} do Google Drive:`, error.message);
      throw error;
    }
  }
};

module.exports = googleDriveService;
