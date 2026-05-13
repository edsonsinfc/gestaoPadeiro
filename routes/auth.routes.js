const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

router.post('/login', ctrl.login);
router.post('/google-login', ctrl.googleLogin);
router.post('/google-login-redirect', ctrl.googleLoginRedirect);
router.post('/first-access', ctrl.firstAccess);
router.post('/set-password', ctrl.setPassword);
router.get('/pending-emails/:email', ctrl.getPendingEmails);

module.exports = router;
