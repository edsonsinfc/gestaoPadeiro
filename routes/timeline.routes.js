const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/timeline.controller');
const { authMiddleware, adminOrSelf } = require('../middleware/auth');

router.get('/:padeiroId', authMiddleware, adminOrSelf, ctrl.getTimelineEvents);
router.post('/', authMiddleware, ctrl.createTimelineEvent);

module.exports = router;
