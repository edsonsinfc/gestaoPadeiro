const { Cliente, Atividade } = require('../data/db-adapter');

exports.listClientes = async (req, res) => {
  try {
    const [clientes, atividades] = await Promise.all([
      Cliente.find(),
      Atividade.find()
    ]);

    const notesByClient = {};
    atividades.forEach(a => {
      const key = a.clienteId;
      if (!key) return;
      if (!notesByClient[key]) notesByClient[key] = [];
      const score = a.notaPadeiroCliente !== undefined && a.notaPadeiroCliente !== null ? a.notaPadeiroCliente : a.notaCliente;
      if (score) notesByClient[key].push(score);
    });

    const enrichedClientes = clientes.map(c => {
      const cJson = typeof c.toJSON === 'function' ? c.toJSON() : c;
      const notes = notesByClient[c.id] || [];
      const notaMedia = notes.length > 0 
        ? notes.reduce((sum, n) => sum + parseFloat(n), 0) / notes.length 
        : null;
      return {
        ...cJson,
        notaMedia: notaMedia !== null ? Math.round(notaMedia * 10) / 10 : null
      };
    });

    res.json(enrichedClientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno ao listar clientes' });
  }
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
