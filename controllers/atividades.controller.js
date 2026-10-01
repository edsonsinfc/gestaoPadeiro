const { Atividade, Padeiro, Cronograma, Avaliacao } = require('../data/db-adapter');
const { getIo } = require('../sockets/location.socket');

exports.listAtividades = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'padeiro') {
      let padeiroIds = [req.user.id];
      if (req.user.codTec) {
        try {
          const samePadeiros = await Padeiro.find({ codTec: req.user.codTec });
          samePadeiros.forEach(p => {
            if (p.id && !padeiroIds.includes(p.id)) padeiroIds.push(p.id);
          });
        } catch (err) {}
      }
      query.padeiroId = padeiroIds.length === 1 ? req.user.id : { $in: padeiroIds };
    }
    if (req.query.padeiroId) query.padeiroId = req.query.padeiroId;
    if (req.query.data) query.data = req.query.data;
    
    let atividades = await Atividade.find(query).sort({ data: -1 });
    
    // Filter by branch if the user has a filial restriction
    if (req.user.role !== 'admin' && req.user.role !== 'padeiro' && req.user.filial && req.user.filial !== 'null') {
      let filiais = [];
      if (typeof req.user.filial === 'string') {
        try {
          filiais = JSON.parse(req.user.filial);
          if (!Array.isArray(filiais)) filiais = [filiais];
        } catch (e) {
          filiais = [req.user.filial];
        }
      } else if (Array.isArray(req.user.filial)) {
        filiais = req.user.filial;
      } else {
        filiais = [req.user.filial];
      }

      const padeirosDaFilial = await Padeiro.find({ filial: { $in: filiais }, deletado: { $ne: true } });
      const ids = padeirosDaFilial.map(p => p.id);
      atividades = atividades.filter(a => ids.includes(a.padeiroId));
    }
    
    const activePadeiros = await Padeiro.find({ deletado: { $ne: true } });
    atividades.forEach(a => {
      const p = activePadeiros.find(x => x.id === a.padeiroId);
      if (p) a.padeiroNome = p.nome;
    });
    
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
    
    let padeiroIds = [req.user.id];
    if (req.user.codTec) {
      try {
        const samePadeiros = await Padeiro.find({ codTec: req.user.codTec });
        samePadeiros.forEach(p => {
          if (p.id && !padeiroIds.includes(p.id)) padeiroIds.push(p.id);
        });
      } catch (err) {}
    }

    const existing = await Atividade.findOne({
      padeiroId: padeiroIds.length === 1 ? req.user.id : { $in: padeiroIds },
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
        padeiroId: padeiroIds.length === 1 ? req.user.id : { $in: padeiroIds }, 
        clienteId, 
        data: today 
      });
      if (slot) tempoMinimoMinutos = slot.tempoMinimoMinutos || 0;
    }

    // Filtro de campos permitidos para a tabela MySQL 'atividades'
    const allowedFields = [
      'id', 'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
      'produtoId', 'produtoNome', 'kgTotal', 'lTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao', 'observacaoCliente',
      'notaCliente', 'notaPadeiroCliente', 'kgItens', 'atualizadoEm', 'lastStep', 'timeline'
    ];

    const nova = {
      padeiroId: req.user.id,
      padeiroNome: req.user.nome,
      tempoMinimoMinutos,
      status: 'em_andamento',
      inicioEm: now.toISOString(),
      data: today,
      hora: now.toTimeString().split(' ')[0],
      lastStep: 1
    };

    // Mescla apenas os campos permitidos do body
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) nova[key] = req.body[key];
    }

    const atividade = await Atividade.create(nova);
    
    const io = getIo();
    if (io) {
      io.emit('activity-updated', atividade);
    }

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
      'produtoId', 'produtoNome', 'kgTotal', 'lTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao', 'observacaoCliente',
      'notaCliente', 'notaPadeiroCliente', 'atualizadoEm', 'lastStep', 'timeline'
    ];

    const tableColumns = [
      'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
      'produtoId', 'produtoNome', 'kgTotal', 'lTotal', 'status', 'data', 'hora',
      'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
      'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao', 'observacaoCliente',
      'notaCliente', 'notaPadeiroCliente', 'kgItens', 'atualizadoEm', 'lastStep', 'timeline'
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

    const io = getIo();
    if (io) {
      io.emit('activity-updated', atividade);
    }

    res.json(atividade);
  } catch (e) {
    console.error("Erro ao atualizar atividade:", e);
    res.status(400).json({ error: 'Erro ao salvar dados da atividade', details: e.message });
  }
};
