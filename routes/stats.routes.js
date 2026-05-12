const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stats.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/', authMiddleware, ctrl.getGeneralStats);
router.get('/filiais', authMiddleware, adminOnly, ctrl.getFiliaisStats);
router.get('/filiais/:nome', authMiddleware, adminOnly, ctrl.getFilialDetail);

module.exports = router;
