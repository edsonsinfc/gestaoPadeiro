const { Meta, Padeiro } = require('../data/db-adapter');

exports.listMetas = async (req, res) => {
  const query = {};
  if (req.user.role === 'padeiro') query.padeiroId = req.user.id;
  
  let metas = await Meta.find(query);

  if (req.user.role === 'gestor_regional' && req.user.filial) {
    const padeirosDaFilial = await Padeiro.find({ filial: req.user.filial });
    const ids = padeirosDaFilial.map(p => p.id);
    metas = metas.filter(m => ids.includes(m.padeiroId));
  }

  res.json(metas);
};

exports.createMeta = async (req, res) => {
  try {
    const validColumns = ['id', 'padeiroId', 'padeiroNome', 'metaKg', 'periodo', 'tipo', 'observacao', 'criadoPor', 'criadoEm', 'atualizadoEm'];
    const nova = { criadoPor: req.user.id, criadoEm: new Date().toISOString() };
    
    validColumns.forEach(col => {
      if (req.body[col] !== undefined) nova[col] = req.body[col];
    });

    const meta = await Meta.create(nova);
    res.status(201).json(meta);
  } catch (error) {
    console.error('Erro ao criar meta:', error);
    res.status(500).json({ error: 'Erro ao criar meta', details: error.message });
  }
};

exports.updateMeta = async (req, res) => {
  try {
    const validColumns = ['id', 'padeiroId', 'padeiroNome', 'metaKg', 'periodo', 'tipo', 'observacao', 'criadoPor', 'criadoEm', 'atualizadoEm'];
    const updateData = { atualizadoEm: new Date().toISOString() };

    validColumns.forEach(col => {
      if (req.body[col] !== undefined) updateData[col] = req.body[col];
    });

    const meta = await Meta.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!meta) return res.status(404).json({ error: 'Não encontrado' });
    res.json(meta);
  } catch (e) {
    console.error('Erro ao atualizar meta:', e);
    res.status(400).json({ error: 'Erro ao atualizar meta', details: e.message });
  }
};

exports.resetAllMetas = async (req, res) => {
  try {
    await Meta.deleteMany({});
    res.json({ success: true, message: 'Todas as metas foram removidas.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao resetar metas' });
  }
};

exports.deleteMeta = async (req, res) => {
  try {
    await Meta.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};
