/**
 * Tracking Routes - BRAGO Sistema Padeiro
 */
const express = require('express');
const router = express.Router();
const TrackingController = require('../controllers/tracking.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All tracking routes require admin/manager access
router.use(authMiddleware);
router.use(adminOnly);

router.get('/trail/:userId', TrackingController.getTrail);

module.exports = router;
