const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sua sessão expirou, faça login novamente.' });
  }
}

function adminOnly(req, res, next) {
  const allowed = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}

function adminOrSelf(req, res, next) {
  const allowed = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'];
  const targetId = req.params.id || req.params.padeiroId;
  if (allowed.includes(req.user.role) || (targetId && req.user.id === targetId)) {
    return next();
  }
  return res.status(403).json({ error: 'Acesso negado' });
}

module.exports = { authMiddleware, adminOnly, adminOrSelf };

