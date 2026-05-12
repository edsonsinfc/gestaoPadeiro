const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/criterios.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.listCriterios);
router.put('/', authMiddleware, adminOnly, ctrl.updateCriterios);

module.exports = router;
