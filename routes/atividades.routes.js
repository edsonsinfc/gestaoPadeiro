const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/atividades.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listAtividades);
router.post('/', authMiddleware, ctrl.createAtividade);
router.put('/:id', authMiddleware, ctrl.updateAtividade);
router.delete('/reset/all', authMiddleware, adminOnly, ctrl.resetAllAtividades);

module.exports = router;
