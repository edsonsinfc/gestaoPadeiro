const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/timeline.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/:padeiroId', authMiddleware, adminOnly, ctrl.getTimelineEvents);
router.post('/', authMiddleware, ctrl.createTimelineEvent);

module.exports = router;
