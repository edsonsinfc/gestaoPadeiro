/**
 * Tracking Routes - BRAGO Sistema Padeiro
 */
const express = require('express');
const router = express.Router();
const TrackingController = require('../controllers/tracking.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All tracking routes require authentication
router.use(authMiddleware);

// Baker / User self location update route (does not require adminOnly)
router.post('/update', TrackingController.updateLocation);
router.post('/sync', TrackingController.syncTracking);

// Admin/manager only routes
router.use(adminOnly);

router.get('/trail/:userId', TrackingController.getTrail);
router.delete('/trail/:userId', TrackingController.resetUserTracking);
router.delete('/reset/all', TrackingController.resetAllTracking);

module.exports = router;
