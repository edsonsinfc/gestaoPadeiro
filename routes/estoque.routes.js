const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/estoque.controller');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, ctrl.createEstoque);
router.get('/', authMiddleware, ctrl.getEstoqueByPadeiro);
router.delete('/cliente/:clienteId', authMiddleware, ctrl.deleteEstoqueByCliente);

module.exports = router;
