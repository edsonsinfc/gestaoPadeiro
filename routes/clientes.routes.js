const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/clientes.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listClientes);
router.post('/', authMiddleware, adminOnly, ctrl.createCliente);
router.put('/:id', authMiddleware, adminOnly, ctrl.updateCliente);
router.delete('/:id', authMiddleware, adminOnly, ctrl.deleteCliente);

module.exports = router;
