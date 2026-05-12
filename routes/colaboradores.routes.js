const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/colaboradores.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listColaboradores);
router.get('/:filial', authMiddleware, ctrl.getColaboradoresByFilial);

module.exports = router;
