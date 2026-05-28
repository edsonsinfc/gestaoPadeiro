const fs = require('fs');
const path = require('path');
const googleDriveService = require('../data/googleDriveService');

exports.uploadFiles = async (req, res) => {
  console.log(`[UPLOAD DEBUG] Upload finalizado. Arquivos: ${req.files ? req.files.length : 0}`);
  
  if (!req.files || req.files.length === 0) {
    return res.json({ success: true, files: [] });
  }

  try {
    const type = req.params.type || 'producao';
    const uploadPromises = req.files.map(async (f) => {
      const result = await googleDriveService.uploadLocalFile(f.path, f.filename, f.mimetype, type);
      return {
        filename: result.filename,
        path: result.path,
        size: f.size
      };
    });

    const files = await Promise.all(uploadPromises);
    res.json({ success: true, files });
  } catch (error) {
    console.error('❌ Erro no upload dos arquivos:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos' });
  }
};

exports.uploadBase64 = async (req, res) => {
  const { data, filename } = req.body;
  if (!data) return res.status(400).json({ error: 'Dados não fornecidos' });

  const type = req.params.type || 'assinaturas';
  const fname = filename || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.png`;

  try {
    const result = await googleDriveService.uploadBase64(data, fname, 'image/png', type);
    res.json({ success: true, path: result.path, filename: result.filename });
  } catch (error) {
    console.error('❌ Erro no upload base64:', error.message);
    res.status(500).json({ error: 'Erro ao salvar assinatura' });
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
