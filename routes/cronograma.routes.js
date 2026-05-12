const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cronograma.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listCronograma);
router.get('/weekly-agenda', authMiddleware, ctrl.getWeeklyAgenda);
router.post('/', authMiddleware, adminOnly, ctrl.createTarefa);
router.put('/:id', authMiddleware, adminOnly, ctrl.updateTarefa);
router.delete('/all', authMiddleware, adminOnly, ctrl.deleteAllTarefas);
router.delete('/:id', authMiddleware, adminOnly, ctrl.deleteTarefa);

// Padeiro specific routes (moved from server.js /api/padeiro/agenda)
router.get('/agenda', authMiddleware, ctrl.getPadeiroAgenda);
router.patch('/agenda/:id/status', authMiddleware, ctrl.updateTarefaStatus);

module.exports = router;
