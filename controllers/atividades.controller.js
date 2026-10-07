const { Atividade, Padeiro, Cronograma, Avaliacao } = require('../data/db-adapter');
const { getIo } = require('../sockets/location.socket');
const { autoExpirePastTasks } = require('./cronograma.controller');

exports.listAtividades = async (req, res) => {
  try {
    if (typeof autoExpirePastTasks === 'function') {
      await autoExpirePastTasks();
    }
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
      data: req.body.data || today,
      status: 'em_andamento'
    });
    if (existing) {
      return res.json(existing);
    }

    // Se já existe atividade finalizada hoje para este cliente e NÃO é início forçado/avulso, evita falso positivo/duplicação
    if (!req.body.forceStart) {
      const alreadyFinished = await Atividade.findOne({
        padeiroId: padeiroIds.length === 1 ? req.user.id : { $in: padeiroIds },
        clienteId,
        data: req.body.data || today,
        status: 'finalizada'
      });
      if (alreadyFinished) {
        console.log(`[Atividades] Cliente ${clienteId} já possui atividade finalizada hoje para o padeiro ${req.user.id}. Evitando recriação de em_andamento.`);
        return res.json(alreadyFinished);
      }
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
    
    // Atualiza status do Cronograma correspondente para 'em_andamento'
    try {
      const cronoId = atividade.cronogramaId || nova.cronogramaId;
      if (cronoId) {
        await Cronograma.findByIdAndUpdate(cronoId, { 
          status: 'em_andamento', 
          atualizadoEm: new Date().toISOString() 
        });
        const io = getIo();
        if (io) {
          io.emit('agenda-updated', { action: 'status_update', tarefa: { id: cronoId, status: 'em_andamento' } });
        }
      } else if (atividade.clienteId && atividade.data) {
        const matchingTasks = await Cronograma.find({
          clienteId: atividade.clienteId,
          data: atividade.data,
          status: 'pendente'
        });
        for (const t of matchingTasks) {
          await Cronograma.findByIdAndUpdate(t.id, { 
            status: 'em_andamento', 
            atualizadoEm: new Date().toISOString() 
          });
          const io = getIo();
          if (io) {
            io.emit('agenda-updated', { action: 'status_update', tarefa: { id: t.id, status: 'em_andamento' } });
          }
        }
      }
    } catch (cronoErr) {
      console.warn('Aviso: Erro ao sincronizar status em_andamento no cronograma:', cronoErr);
    }

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

    // Sincronizar status do Cronograma quando a atividade for finalizada ou marcada como não realizada (regra 24h)
    const isFinished = updateData.status === 'finalizada' || atividade.status === 'finalizada';
    const isNotDone = updateData.status === 'nao_realizada' || atividade.status === 'nao_realizada';
    if (isFinished || isNotDone) {
      // Regra 24h: 'nao_realizada' SÓ afeta o cronograma se a atividade for de dia anterior (< today)
      const n = new Date();
      const todayStr = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
      const isPast = atividade.data && (atividade.data < todayStr);

      if (isFinished || isPast) {
        const targetCronoStatus = isFinished ? 'concluida' : 'nao_realizada';
        try {
          const cronoId = atividade.cronogramaId || req.body.cronogramaId;
          if (cronoId) {
            await Cronograma.findByIdAndUpdate(cronoId, { 
              status: targetCronoStatus, 
              atualizadoEm: new Date().toISOString() 
            });
            const io = getIo();
            if (io) {
              io.emit('agenda-updated', { action: 'status_update', tarefa: { id: cronoId, status: targetCronoStatus } });
            }
          }
          
          // Também busca cronograma por clienteId + data caso não houvesse cronogramaId direto
          if (atividade.clienteId && atividade.data) {
            const matchingTasks = await Cronograma.find({
              clienteId: atividade.clienteId,
              data: atividade.data,
              status: { $ne: 'concluida' }
            });
            for (const t of matchingTasks) {
              await Cronograma.findByIdAndUpdate(t.id, { 
                status: targetCronoStatus, 
                atualizadoEm: new Date().toISOString() 
              });
              const io = getIo();
              if (io) {
                io.emit('agenda-updated', { action: 'status_update', tarefa: { id: t.id, status: targetCronoStatus } });
              }
            }
          }

          // Limpa qualquer outra atividade em_andamento duplicada deste mesmo padeiro e cliente na mesma data
          if (isFinished) {
            try {
              const duplicateInProgress = await Atividade.find({
                padeiroId: atividade.padeiroId,
                clienteId: atividade.clienteId,
                data: atividade.data,
                status: 'em_andamento'
              });
              for (const dup of duplicateInProgress) {
                if (dup.id !== atividade.id) {
                  await Atividade.findByIdAndUpdate(dup.id, {
                    status: 'finalizada',
                    fimEm: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString()
                  });
                }
              }
            } catch (dupErr) {
              console.warn('Aviso ao sincronizar duplicatas de atividade:', dupErr);
            }
          }
        } catch (cronoErr) {
          console.error('Erro ao sincronizar status no cronograma:', cronoErr);
        }
      }
    }

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

exports.deleteAtividade = async (req, res) => {
  try {
    const atividade = await Atividade.findById(req.params.id);
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' });

    if (req.user.role === 'padeiro' && atividade.padeiroId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await Atividade.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Atividade removida com sucesso' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao remover atividade: ' + e.message });
  }
};
