const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/management.controller');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.get('/users', authMiddleware, adminOnly, ctrl.listUsers);
router.post('/users', authMiddleware, adminOnly, ctrl.createUser);
router.delete('/users/:id', authMiddleware, adminOnly, ctrl.deleteUser);

module.exports = router;
