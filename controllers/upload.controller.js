const fs = require('fs');
const path = require('path');

exports.uploadFiles = (req, res) => {
  console.log(`[UPLOAD DEBUG] Upload finalizado. Arquivos: ${req.files ? req.files.length : 0}`);
  const files = req.files.map(f => ({
    filename: f.filename,
    path: `/uploads/${req.params.type}/${f.filename}`,
    size: f.size
  }));
  res.json({ success: true, files });
};

exports.uploadBase64 = (req, res) => {
  const { data, filename } = req.body;
  if (!data) return res.status(400).json({ error: 'Dados não fornecidos' });

  const type = req.params.type || 'assinaturas';
  const dir = path.join(__dirname, '..', 'uploads', type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
  const fname = filename || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.png`;
  fs.writeFileSync(path.join(dir, fname), base64Data, 'base64');

  res.json({ success: true, path: `/uploads/${type}/${fname}`, filename: fname });
};
