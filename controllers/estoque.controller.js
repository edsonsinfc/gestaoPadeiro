const { EstoqueFaltante, Cliente } = require('../data/db-adapter');

exports.createEstoque = async (req, res) => {
  try {
    const { clienteId, clienteNome, itensFaltantes } = req.body;
    
    if (!clienteId || !itensFaltantes) {
      return res.status(400).json({ error: 'Cliente e itens faltantes são obrigatórios' });
    }

    const novoEstoque = {
      id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      padeiroId: req.user.id,
      padeiroNome: req.user.nome,
      clienteId,
      clienteNome,
      itensFaltantes,
      dataRegistro: new Date().toISOString(),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    await EstoqueFaltante.create(novoEstoque);
    res.status(201).json(novoEstoque);
  } catch (error) {
    console.error('Erro ao registrar estoque faltante:', error);
    res.status(500).json({ error: 'Erro ao registrar itens faltantes' });
  }
};

exports.getEstoqueByPadeiro = async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'padeiro') {
      query.padeiroId = req.user.id;
    } else if (req.user.role === 'vendedor') {
      let clienteIds = [];
      try {
        clienteIds = typeof req.user.clienteIds === 'string'
          ? JSON.parse(req.user.clienteIds)
          : (Array.isArray(req.user.clienteIds) ? req.user.clienteIds : []);
      } catch (e) {
        clienteIds = typeof req.user.clienteIds === 'string' ? req.user.clienteIds.split(',') : [];
      }
      if (clienteIds.length > 0) {
        query.clienteId = { $in: clienteIds };
      }
    } else if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
      // Rule #3: Filial filter for regional gestores
      const filiais = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
      const filialClients = await Cliente.find({ filial: { $in: filiais } });
      const clientIds = filialClients.map(c => c.id);
      query.clienteId = { $in: clientIds };
    }

    const registros = await EstoqueFaltante.find(query);
    res.json(registros);
  } catch (error) {
    console.error('Erro ao buscar registros de estoque:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de estoque' });
  }
};

exports.deleteEstoqueByCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    if (!clienteId) {
      return res.status(400).json({ error: 'ID do cliente é obrigatório' });
    }
    
    await EstoqueFaltante.deleteMany({ clienteId });
    res.json({ success: true, message: 'Estoque faltante zerado com sucesso para este cliente' });
  } catch (error) {
    console.error('Erro ao deletar estoque do cliente:', error);
    res.status(500).json({ error: 'Erro ao zerar estoque faltante', details: error.message });
  }
};
