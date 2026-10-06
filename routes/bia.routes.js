const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bia.controller');
const { authMiddleware } = require('../middleware/auth');

router.post('/chat', authMiddleware, ctrl.chat);
router.get('/status', authMiddleware, ctrl.getStatus);
router.get('/context', authMiddleware, ctrl.getContext);

module.exports = router;
