const express = require('express');
const router = express.Router();
const cronoCtrl = require('../controllers/cronograma.controller');
const mgmtCtrl = require('../controllers/management.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use((req, res, next) => {
  console.log(`[ADMIN ROUTER] Request: ${req.method} ${req.url}`);
  next();
});

router.get('/test', (req, res) => res.json({ ok: true }));

// Legacy routes used by frontend
router.get('/agenda-semanal', authMiddleware, cronoCtrl.getWeeklyAgenda);
router.get('/users', authMiddleware, adminOnly, mgmtCtrl.listUsers);
router.post('/users', authMiddleware, adminOnly, mgmtCtrl.createUser);
router.delete('/users/:id', authMiddleware, adminOnly, mgmtCtrl.deleteUser);

// Rota administrativa para forçar sincronização de clientes a partir do JSON do repositório
router.post('/sync-clientes', authMiddleware, adminOnly, mgmtCtrl.syncClientesFromJson);

module.exports = router;
