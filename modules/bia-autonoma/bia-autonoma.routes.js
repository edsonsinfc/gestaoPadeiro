/**
 * ROTAS DO MÓDULO BIA AUTÔNOMA
 * SmartGestor - Brago Distribuidora
 */

const express = require('express');
const router = express.Router();
const ctrl = require('./bia-autonoma.controller');
const { authMiddleware } = require('../../middleware/auth');

router.post('/metas/gerar', authMiddleware, ctrl.cadastrarMetasMensais);
router.get('/metas/preview', authMiddleware, ctrl.preverMetasMensais);
router.get('/status', authMiddleware, ctrl.getStatusAutonomia);

module.exports = router;
