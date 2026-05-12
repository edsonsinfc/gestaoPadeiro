const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/avaliacoes.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listAvaliacoes);
router.post('/', authMiddleware, ctrl.createAvaliacao);
router.delete('/reset/all', authMiddleware, adminOnly, ctrl.resetAllAvaliacoes);

module.exports = router;
