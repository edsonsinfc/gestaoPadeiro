const { Atividade, Padeiro, Cronograma } = require('../data/db-adapter');

exports.listAtividades = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'padeiro') query.padeiroId = req.user.id;
    if (req.query.padeiroId) query.padeiroId = req.query.padeiroId;
    if (req.query.data) query.data = req.query.data;
    
    let atividades = await Atividade.find(query).sort({ data: -1 });
    
    if (req.user.role === 'gestor_regional' && req.user.filial) {
      const padeirosDaFilial = await Padeiro.find({ filial: req.user.filial });
      const ids = padeirosDaFilial.map(p => p.id);
      atividades = atividades.filter(a => ids.includes(a.padeiroId));
    }
    
    res.json(atividades);
  } catch (error) {
    console.error('Erro ao listar atividades:', error);
    res.status(500).json({ error: 'Erro ao carregar atividades' });
  }
};

exports.resetAllAtividades = async (req, res) => {
  try {
    await Atividade.deleteMany({});
    res.json({ success: true, message: 'Todas as atividades foram removidas.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao resetar atividades' });
  }
};

exports.createAtividade = async (req, res) => {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const { clienteId, clienteNome, cronogramaId } = req.body;
    
    const existing = await Atividade.findOne({
      padeiroId: req.user.id,
      clienteId,
      data: today,
      status: 'em_andamento'
    });
    if (existing) {
      return res.json(existing);
    }

    let tempoMinimoMinutos = 0;
    if (cronogramaId) {
      const slot = await Cronograma.findById(cronogramaId);
      if (slot) tempoMinimoMinutos = slot.tempoMinimoMinutos || 0;
    } else {
      const slot = await Cronograma.findOne({ 
        padeiroId: req.user.id, 
        clienteId, 
        data: today 
      });
      if (slot) tempoMinimoMinutos = slot.tempoMinimoMinutos || 0;
    }

    // Filtro de campos permitidos para a tabela MySQL 'atividades'
    const allowedFields = [
      'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
      'produtoId', 'produtoNome', 'kgTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao',
      'notaCliente', 'atualizadoEm'
    ];

    const nova = {
      padeiroId: req.user.id,
      padeiroNome: req.user.nome,
      tempoMinimoMinutos,
      status: 'em_andamento',
      inicioEm: now.toISOString(),
      data: today,
      hora: now.toTimeString().split(' ')[0]
    };

    // Mescla apenas os campos permitidos do body
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) nova[key] = req.body[key];
    }

    const atividade = await Atividade.create(nova);
    res.status(201).json(atividade);
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    res.status(500).json({ 
      error: 'Erro ao iniciar atividade', 
      details: error.message 
    });
  }
};

exports.updateAtividade = async (req, res) => {
  try {
    const allowedFields = [
      'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
      'produtoId', 'produtoNome', 'kgTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao',
      'notaCliente', 'atualizadoEm', 'lastStep' // lastStep mantido aqui se for usado apenas no front ou se formos adicionar à tabela futuramente, mas por segurança, filtramos baseado na tabela
    ];

    const tableColumns = [
      'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
      'produtoId', 'produtoNome', 'kgTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao',
      'notaCliente', 'atualizadoEm'
    ];

    const updateData = {};
    for (const key of tableColumns) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const atividade = await Atividade.findByIdAndUpdate(
      req.params.id, 
      { ...updateData, atualizadoEm: new Date().toISOString() }, 
      { new: true }
    );
    
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });
    res.json(atividade);
  } catch (e) {
    console.error("Erro ao atualizar atividade:", e);
    res.status(400).json({ error: 'Erro ao salvar dados da atividade', details: e.message });
  }
};
