const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/upload.controller');
const { authMiddleware } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/:type', authMiddleware, (req, res, next) => {
  console.log(`[UPLOAD DEBUG] Iniciando upload. Tipo: ${req.params.type}`);
  next();
}, upload.array('files', 10), ctrl.uploadFiles);

router.post('/base64/:type', authMiddleware, ctrl.uploadBase64);

module.exports = router;
