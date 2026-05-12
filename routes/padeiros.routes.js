const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/padeiros.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listPadeiros);
router.get('/:id', authMiddleware, ctrl.getPadeiro);
router.post('/', authMiddleware, adminOnly, ctrl.createPadeiro);
router.put('/:id', authMiddleware, adminOnly, ctrl.updatePadeiro);
router.delete('/:id', authMiddleware, adminOnly, ctrl.deletePadeiro);

module.exports = router;
