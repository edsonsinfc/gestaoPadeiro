const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/management', require('./management.routes'));

router.use('/padeiros', require('./padeiros.routes'));
router.use('/produtos', require('./produtos.routes'));
router.use('/clientes', require('./clientes.routes'));
router.use('/colaboradores', require('./colaboradores.routes'));
router.use('/metas', require('./metas.routes'));
router.use('/atividades', require('./atividades.routes'));
router.use('/avaliacoes', require('./avaliacoes.routes'));
router.use('/cronograma', require('./cronograma.routes'));
router.use('/stats', require('./stats.routes'));
router.use('/criterios', require('./criterios.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/tracking', require('./tracking.routes'));

module.exports = router;
