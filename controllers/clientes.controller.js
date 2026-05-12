const { Cliente } = require('../data/db-adapter');

exports.listClientes = async (req, res) => {
  const clientes = await Cliente.find();
  res.json(clientes);
};

exports.createCliente = async (req, res) => {
  const novo = { ...req.body, ativo: true, criadoEm: new Date().toISOString() };
  const cliente = await Cliente.create(novo);
  res.status(201).json(cliente);
};

exports.updateCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cliente) return res.status(404).json({ error: 'Não encontrado' });
    res.json(cliente);
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};
