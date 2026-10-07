const { Cronograma, Padeiro, Atividade, Avaliacao, Cliente } = require('../data/db-adapter');
const { getIo } = require('../sockets/location.socket');

// Expirar tarefas com mais de 24 horas (dias anteriores) que não foram realizadas
async function autoExpirePastTasks(today) {
  try {
    if (!today) {
      const n = new Date();
      today = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
    }

    // 1. Regra 24h: Tarefas com data anterior a hoje que não foram concluídas são marcadas como 'nao_realizada'
    const pastTasks = await Cronograma.find({
      data: { $lt: today },
      status: { $in: ['pendente', 'em_andamento', 'solicitado'] }
    });

    if (pastTasks && pastTasks.length > 0) {
      for (const t of pastTasks) {
        await Cronograma.findByIdAndUpdate(t.id, {
          status: 'nao_realizada',
          atualizadoEm: new Date().toISOString()
        });
      }
      console.log(`[Cronograma] ${pastTasks.length} tarefa(s) de dia anterior expiradas para 'nao_realizada' (regra 24h).`);
    }

    // Atividades de dias anteriores que ficaram com status 'em_andamento'
    const pastAtividades = await Atividade.find({
      data: { $lt: today },
      status: 'em_andamento'
    });

    if (pastAtividades && pastAtividades.length > 0) {
      for (const a of pastAtividades) {
        await Atividade.findByIdAndUpdate(a.id, {
          status: 'nao_realizada',
          fimEm: (a.data || today) + 'T23:59:59.000Z',
          atualizadoEm: new Date().toISOString()
        });
      }
      console.log(`[Atividades] ${pastAtividades.length} atividade(s) de dia anterior em andamento expiradas para 'nao_realizada'.`);
    }

    // 2. Correção segura: Tarefas de HOJE ou FUTURO que foram indevidamente marcadas como 'nao_realizada'
    // A regra de 24h só se aplica no dia seguinte! No dia de hoje, a tarefa fica ativa/pendente para realização.
    const wronglyExpiredToday = await Cronograma.find({
      data: { $gte: today },
      status: 'nao_realizada'
    });

    if (wronglyExpiredToday && wronglyExpiredToday.length > 0) {
      for (const t of wronglyExpiredToday) {
        await Cronograma.findByIdAndUpdate(t.id, {
          status: 'pendente',
          atualizadoEm: new Date().toISOString()
        });
      }
      console.log(`[Cronograma] ${wronglyExpiredToday.length} tarefa(s) de hoje restauradas de 'nao_realizada' para 'pendente'.`);
    }

    // Atividades vazias de hoje/futuro que foram indevidamente marcadas como 'nao_realizada'
    const wronglyExpiredAtividades = await Atividade.find({
      data: { $gte: today },
      status: 'nao_realizada'
    });
    if (wronglyExpiredAtividades && wronglyExpiredAtividades.length > 0) {
      for (const a of wronglyExpiredAtividades) {
        await Atividade.findByIdAndDelete(a.id);
      }
      console.log(`[Atividades] ${wronglyExpiredAtividades.length} atividade(s) vazias de hoje limpas do banco.`);
    }
  } catch (err) {
    console.warn('[Cronograma] Aviso ao expirar tarefas anteriores:', err.message);
  }
}

exports.autoExpirePastTasks = autoExpirePastTasks;

exports.listCronograma = async (req, res) => {
  await autoExpirePastTasks();
  const query = {};
  if (req.query.data) {
    query.data = req.query.data;
  }
  if (req.query.padeiroId) {
    query.padeiroId = req.query.padeiroId;
  }
  if (req.query.semana) {
    const monday = new Date(req.query.semana);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const monStr = monday.toISOString().split('T')[0];
    const satStr = saturday.toISOString().split('T')[0];
    query.data = { $gte: monStr, $lte: satStr };
  }
  
  let tarefas = await Cronograma.find(query);

  // Filter by branch if user has branch restrictions (e.g. Regional Managers)
  if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
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

    const { Cliente } = require('../data/db-adapter');
    const [padeirosDaFilial, clientesDaFilial] = await Promise.all([
      Padeiro.find({ filial: { $in: filiais }, deletado: { $ne: true } }),
      Cliente.find()
    ]);

    const padeiroIds = new Set(padeirosDaFilial.map(p => p.id));
    const clienteIds = new Set(clientesDaFilial.map(c => c.id));

    tarefas = tarefas.filter(t => {
      // Se tem padeiro atribuído, filtra pela filial do padeiro
      if (t.padeiroId) {
        return padeiroIds.has(t.padeiroId);
      }
      // Se não tem padeiro atribuído (solicitação pendente), filtra pela filial do cliente
      return clienteIds.has(t.clienteId);
    });
  }

  const activePadeiros = await Padeiro.find({ deletado: { $ne: true } });
  tarefas.forEach(t => {
    if (t.padeiroId) {
      const p = activePadeiros.find(x => x.id === t.padeiroId);
      if (p) t.padeiroNome = p.nome;
    }
  });

  res.json(tarefas);
};

exports.getWeeklyAgenda = async (req, res) => {
  const { filial, semana } = req.query;
  if (!semana) return res.status(400).json({ error: 'Data da semana obrigatória' });

  try {
    await autoExpirePastTasks();
    const filter = {};
    if (filial) {
      // Simplificando de RegExp para comparação direta para evitar erros de sintaxe SQL
      filter.filial = filial;
    }
    const padeiros = await Padeiro.find(filter).sort({ nome: 1 });

    const monday = new Date(semana);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const monStr = monday.toISOString().split('T')[0];
    const satStr = saturday.toISOString().split('T')[0];

    const padeiroIds = padeiros.map(p => p.id);
    const agenda = await Cronograma.find({
      padeiroId: { $in: padeiroIds },
      data: { $gte: monStr, $lte: satStr },
      status: { $ne: 'solicitado' } // Ignora solicitações pendentes de aprovação!
    }).sort({ data: 1 });

    const allClientes = await Cliente.find();
    const cliMap = new Map();
    allClientes.forEach(c => cliMap.set(c.id, c));

    agenda.forEach(a => {
      if (a.padeiroId) {
        const p = padeiros.find(x => x.id === a.padeiroId);
        if (p) a.padeiroNome = p.nome;
      }
      if (a.clienteId && cliMap.has(a.clienteId)) {
        const c = cliMap.get(a.clienteId);
        if (c.nomeFantasia) a.clienteNome = c.nomeFantasia;
      }
    });

    res.json({ padeiros, agenda });
  } catch (error) {
    console.error('ERRO DETALHADO AGENDA:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar agenda semanal', 
      details: error.message,
      stack: error.stack 
    });
  }
};

exports.createTarefa = async (req, res) => {
  try {
    // Only allow fields that exist in the cronogramas table
    const allowedFields = [
      'padeiroId', 'padeiroNome', 'codTec', 'clienteId', 'clienteNome',
      'data', 'horario', 'status', 'tempoMinimoMinutos', 'posicao',
      'observacao', 'criadoPor', 'criadoEm', 'atualizadoEm'
    ];
    const nova = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) nova[key] = req.body[key];
    }
    // Se o criador for vendedor, força status = 'solicitado'
    if (req.user.role === 'vendedor') {
      nova.status = 'solicitado';
    }

    nova.criadoPor = req.user.id;
    nova.criadoEm = new Date().toISOString();

    const tarefa = await Cronograma.create(nova);
    
    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'create', tarefa });
    }

    // Só envia notificação push para o padeiro se a tarefa já estiver ativa/aprovada
    if (tarefa.status !== 'solicitado' && tarefa.padeiroId) {
      const pushService = require('../data/pushService');
      pushService.sendPushToUser(
        tarefa.padeiroId,
        '🍞 Nova Tarefa Agendada!',
        `Você foi escalado para o cliente "${tarefa.clienteNome || 'Cliente'}" às ${tarefa.horario || '00:00'}.`,
        '/padeiro-agenda'
      ).catch(err => console.error('Erro ao enviar push de nova tarefa:', err.message));
    }

    res.status(201).json(tarefa);
  } catch (e) {
    console.error('Erro ao criar tarefa no cronograma:', e);
    res.status(500).json({ error: 'Erro ao criar tarefa: ' + e.message });
  }
};

exports.updateTarefa = async (req, res) => {
  try {
    const { _id, id, ...updateData } = req.body;
    const tarefa = await Cronograma.findByIdAndUpdate(req.params.id, { ...updateData, atualizadoEm: new Date().toISOString() }, { new: true });
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'update', tarefa });
    }

    res.json(tarefa);
  } catch (e) {
    console.error("Erro ao atualizar cronograma:", e);
    res.status(400).json({ error: 'ID inválido ou erro na atualização' });
  }
};

exports.deleteAllTarefas = async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = {};
    if (start && end) {
      query.data = { $gte: start, $lte: end };
    }

    // Find cronograma entries to be deleted
    const cronogramasToDelete = await Cronograma.find(query);
    const cronogramaIds = cronogramasToDelete.map(c => c.id);

    // Delete cronograma tasks
    await Cronograma.deleteMany(query);

    // Disassociate matching activities instead of deleting them
    if (cronogramaIds.length > 0) {
      await Atividade.updateMany({ cronogramaId: { $in: cronogramaIds } }, { cronogramaId: null });
    }

    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'delete_all' });
    }

    res.json({ success: true, message: 'O cronograma do período foi limpo. As atividades associadas foram preservadas.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir cronograma: ' + e.message });
  }
};

exports.deleteTarefa = async (req, res) => {
  try {
    const id = req.params.id;
    const tarefa = await Cronograma.findById(id);

    // Delete the single cronograma task
    await Cronograma.findByIdAndDelete(id);
    
    // Disassociate the activity instead of deleting it
    await Atividade.updateMany({ cronogramaId: id }, { cronogramaId: null });

    if (tarefa) {
      const io = getIo();
      if (io) {
        io.emit('agenda-updated', { action: 'delete', tarefa });
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'ID inválido ou erro ao excluir a tarefa' });
  }
};

exports.getPadeiroAgenda = async (req, res) => {
  try {
    await autoExpirePastTasks();

    // Se for admin, gestor ou vendedor visualizando a tela do padeiro
    if (req.user.role && req.user.role !== 'padeiro') {
      const today = new Date().toISOString().split('T')[0];
      const query = {};
      if (req.query.data) query.data = req.query.data;
      else if (!req.query.semana && !req.query.all) query.data = today;
      if (req.query.padeiroId) query.padeiroId = req.query.padeiroId;
      const agenda = await Cronograma.find(query).sort({ data: 1, horario: 1 });
      return res.json(agenda);
    }

    // Resolver perfil do padeiro no banco para coletar ID, codTec e nome reais
    let padeiro = null;
    if (req.user.id) {
      padeiro = await Padeiro.findById(req.user.id);
    }
    if (!padeiro && req.user.email) {
      padeiro = await Padeiro.findOne({ email: req.user.email });
    }
    if (!padeiro && req.user.nome) {
      padeiro = await Padeiro.findOne({ nome: req.user.nome });
    }

    const padeiroIds = new Set([req.user.id]);
    if (padeiro && padeiro.id) padeiroIds.add(padeiro.id);

    const codTec = req.user.codTec || (padeiro ? padeiro.codTec : null);
    const nome = (req.user.nome || (padeiro ? padeiro.nome : '')).trim();

    // Se tiver codTec, busca outros registros do mesmo técnico
    if (codTec) {
      try {
        const samePadeiros = await Padeiro.find({ codTec });
        samePadeiros.forEach(p => {
          if (p.id) padeiroIds.add(p.id);
        });
      } catch (err) {}
    }

    // Construir condições de busca abrangentes (por qualquer ID do padeiro, por codTec ou por Nome)
    const orConds = [{ padeiroId: { $in: Array.from(padeiroIds) } }];
    if (codTec) orConds.push({ codTec });
    if (nome) orConds.push({ padeiroNome: nome });

    let agenda = await Cronograma.find({ $or: orConds }).sort({ data: 1, horario: 1 });

    const allClientes = await Cliente.find();
    const cliMap = new Map();
    allClientes.forEach(c => cliMap.set(c.id, c));

    agenda.forEach(a => {
      a.padeiroNome = a.padeiroNome || req.user.nome;
      if (a.clienteId && cliMap.has(a.clienteId)) {
        const c = cliMap.get(a.clienteId);
        if (c.nomeFantasia) a.clienteNome = c.nomeFantasia;
      }
    });

    res.json(agenda);
  } catch (error) {
    console.error('Erro ao carregar agenda do padeiro:', error);
    res.status(500).json({ error: 'Erro ao carregar agenda: ' + error.message });
  }
};

exports.updateTarefaStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status é obrigatório' });
    const tarefa = await Cronograma.findByIdAndUpdate(
      req.params.id,
      { status, atualizadoEm: new Date().toISOString() },
      { new: true }
    );
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    // Se a tarefa for marcada como concluída ou não realizada, sincroniza qualquer atividade em andamento correspondente
    if (status === 'concluida' || status === 'nao_realizada') {
      try {
        const targetStatus = status === 'concluida' ? 'finalizada' : 'nao_realizada';
        const atvs = await Atividade.find({
          $or: [
            { cronogramaId: req.params.id },
            { clienteId: tarefa.clienteId, data: tarefa.data, padeiroId: tarefa.padeiroId }
          ],
          status: 'em_andamento'
        });
        for (const atv of atvs) {
          await Atividade.findByIdAndUpdate(atv.id, {
            status: targetStatus,
            fimEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
          });
          const ioAtv = getIo();
          if (ioAtv) {
            ioAtv.emit('activity-updated', { ...atv, status: targetStatus });
          }
        }
      } catch (atvErr) {
        console.warn('Aviso ao sincronizar atividade ao concluir cronograma:', atvErr);
      }
    }

    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'status_update', tarefa });
    }

    res.json(tarefa);
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};

exports.getPadeiroProgress = async (req, res) => {
  const { padeiroId, data } = req.query;
  if (!padeiroId || !data) {
    return res.status(400).json({ error: 'padeiroId e data são obrigatórios' });
  }
  try {
    const totalTasks = await Cronograma.countDocuments({ padeiroId, data });
    const completedTasks = await Cronograma.countDocuments({ padeiroId, data, status: 'concluida' });
    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    res.json({ totalTasks, completedTasks, percent });
  } catch (error) {
    console.error('Erro ao buscar progresso:', error);
    res.status(500).json({ error: 'Erro ao carregar progresso' });
  }
};
