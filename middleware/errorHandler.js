const multer = require('multer');

function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande (máx 20MB por foto)' });
    }
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }
  console.error("Global error:", err);
  res.status(500).json({ error: 'Erro interno no servidor' });
}

module.exports = errorHandler;
