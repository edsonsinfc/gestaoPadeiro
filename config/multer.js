const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`[UPLOAD DEBUG] Destino para: ${file.originalname}`);
    const type = req.params.type || 'producao';
    const dir = path.join(__dirname, '..', 'uploads', type);
    if (!fs.existsSync(dir)) {
      console.log(`[UPLOAD DEBUG] Criando diretório: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    console.log(`[UPLOAD DEBUG] Gerando nome para: ${file.originalname}`);
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

module.exports = upload;
