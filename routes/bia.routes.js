const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bia.controller');
const { authMiddleware } = require('../middleware/auth');

router.post('/chat', authMiddleware, ctrl.chat);
router.post('/transcribe', authMiddleware, ctrl.transcribe);
router.get('/status', authMiddleware, ctrl.getStatus);
router.get('/context', authMiddleware, ctrl.getContext);
router.use('/autonoma', require('../modules/bia-autonoma').routes);

module.exports = router;
