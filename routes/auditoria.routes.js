const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const AuditoriaController = require('../controllers/auditoria.controller');

router.get('/logs', authMiddleware, adminOnly, AuditoriaController.getLogs);
router.get('/dashboard', authMiddleware, adminOnly, AuditoriaController.getDashboard);
router.get('/padeiro/:id', authMiddleware, adminOnly, AuditoriaController.getPadeiroDetail);

module.exports = router;
