const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/produtos.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listProdutos);
router.post('/', authMiddleware, adminOnly, ctrl.createProduto);
router.put('/:id', authMiddleware, adminOnly, ctrl.updateProduto);
router.delete('/:id', authMiddleware, adminOnly, ctrl.deleteProduto);

module.exports = router;
