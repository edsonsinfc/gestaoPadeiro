const { Meta, Padeiro } = require('../data/db-adapter');

exports.listMetas = async (req, res) => {
  const query = {};
  if (req.user.role === 'padeiro') query.padeiroId = req.user.id;
  
  let metas = await Meta.find(query);

  if (req.user.role === 'gestor' && req.user.filial) {
    const padeirosDaFilial = await Padeiro.find({ filial: req.user.filial });
    const ids = padeirosDaFilial.map(p => p.id);
    metas = metas.filter(m => ids.includes(m.padeiroId));
  }

  res.json(metas);
};

exports.createMeta = async (req, res) => {
  const nova = { ...req.body, criadoPor: req.user.id, criadoEm: new Date().toISOString() };
  const meta = await Meta.create(nova);
  res.status(201).json(meta);
};

exports.updateMeta = async (req, res) => {
  try {
    const meta = await Meta.findByIdAndUpdate(req.params.id, { ...req.body, atualizadoEm: new Date().toISOString() }, { new: true });
    if (!meta) return res.status(404).json({ error: 'Não encontrado' });
    res.json(meta);
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
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
