const fs = require('fs');
const path = require('path');
const googleDriveService = require('../data/googleDriveService');
const driveMappings = require('../data/driveMappings');

exports.uploadFiles = async (req, res) => {
  console.log(`[UPLOAD DEBUG] Upload recebido. Arquivos: ${req.files ? req.files.length : 0}`);
  
  if (!req.files || req.files.length === 0) {
    return res.json({ success: true, files: [] });
  }

  const type = req.params.type || 'producao';
  
  try {
    // 1. Gera e retorna os caminhos locais instantaneamente
    const files = req.files.map(f => {
      return {
        filename: f.filename,
        path: `/storage/${type}/${f.filename}`,
        size: f.size,
        originalname: f.originalname
      };
    });

    res.json({ success: true, files });
    
    // 2. Dispara o upload para o Google Drive em background com pequeno delay para liberar o client
    setTimeout(() => {
      req.files.forEach(async (f) => {
        try {
          if (!googleDriveService.isEnabled()) {
            console.log(`[BG UPLOAD] Google Drive desativado. Mantendo arquivo ${f.filename} localmente.`);
            return;
          }
          
          console.log(`[BG UPLOAD] Iniciando upload em background de ${f.filename} para o Google Drive...`);
          const result = await googleDriveService.uploadLocalFile(f.path, f.filename, f.mimetype, type);
          
          if (result.isDrive && result.fileId) {
            driveMappings.saveMapping(f.filename, result.fileId);
          }
        } catch (err) {
          console.error(`❌ [BG UPLOAD] Erro no upload em background de ${f.filename}:`, err.message);
        }
      });
    }, 100);

  } catch (error) {
    console.error('❌ Erro ao processar upload:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos' });
  }
};

exports.uploadBase64 = async (req, res) => {
  const { data, filename } = req.body;
  if (!data) return res.status(400).json({ error: 'Dados não fornecidos' });

  const type = req.params.type || 'assinaturas';
  const fname = filename || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.png`;

  try {
    // 1. Salva localmente primeiro
    const dir = path.join(__dirname, '..', 'uploads', type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const localPath = path.join(dir, fname);
    const cleanBase64 = data.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(localPath, cleanBase64, 'base64');

    // 2. Responde instantaneamente para o frontend
    res.json({ success: true, path: `/storage/${type}/${fname}`, filename: fname });

    // 3. Dispara o upload em background com pequeno delay
    setTimeout(async () => {
      try {
        if (!googleDriveService.isEnabled()) {
          console.log(`[BG UPLOAD] Google Drive desativado. Mantendo assinatura ${fname} localmente.`);
          return;
        }

        console.log(`[BG UPLOAD] Iniciando upload em background de ${fname} para o Google Drive...`);
        // Usamos uploadLocalFile para aproveitar a lógica que faz o upload e exclui o arquivo local depois
        const result = await googleDriveService.uploadLocalFile(localPath, fname, 'image/png', type);
        
        if (result && result.isDrive && result.fileId) {
          driveMappings.saveMapping(fname, result.fileId);
        }
      } catch (err) {
        console.error(`❌ [BG UPLOAD] Erro no upload em background da assinatura ${fname}:`, err.message);
      }
    }, 100);

  } catch (error) {
    console.error('❌ Erro no upload base64:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao salvar assinatura' });
    }
  }
};

exports.serveFile = async (req, res) => {
  const { fileId } = req.params;
  
  try {
    const { stream, contentType, contentLength } = await googleDriveService.getFileStream(fileId);
    
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Cache de 30 dias para fotos persistentes
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    
    stream.pipe(res);
  } catch (error) {
    console.error(`❌ Erro ao servir arquivo ${fileId}:`, error.message);
    res.status(404).send('Arquivo não encontrado no Google Drive');
  }
};
