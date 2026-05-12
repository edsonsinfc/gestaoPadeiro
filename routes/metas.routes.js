const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/metas.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listMetas);
router.post('/', authMiddleware, adminOnly, ctrl.createMeta);
router.put('/:id', authMiddleware, adminOnly, ctrl.updateMeta);
router.delete('/reset/all', authMiddleware, adminOnly, ctrl.resetAllMetas);
router.delete('/:id', authMiddleware, adminOnly, ctrl.deleteMeta);

module.exports = router;
