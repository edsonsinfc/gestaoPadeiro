const { Cronograma, Padeiro, Atividade, Avaliacao } = require('../data/db-adapter');
const { getIo } = require('../sockets/location.socket');

exports.listCronograma = async (req, res) => {
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

  // Filter by branch if user is a Regional Manager
  if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
    const filiais = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
    const padeirosDaFilial = await Padeiro.find({ filial: { $in: filiais } });
    const ids = padeirosDaFilial.map(p => p.id);
    tarefas = tarefas.filter(t => ids.includes(t.padeiroId));
  }

  res.json(tarefas);
};

exports.getWeeklyAgenda = async (req, res) => {
  const { filial, semana } = req.query;
  if (!semana) return res.status(400).json({ error: 'Data da semana obrigatória' });

  try {
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
      data: { $gte: monStr, $lte: satStr }
    }).sort({ data: 1 }); // Simplificando sort para evitar ambiguidade no mock

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
    nova.criadoPor = req.user.id;
    nova.criadoEm = new Date().toISOString();

    const tarefa = await Cronograma.create(nova);
    
    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'create', tarefa });
    }

    // Enviar notificação push nativa/web para o padeiro em background
    const pushService = require('../data/pushService');
    pushService.sendPushToUser(
      tarefa.padeiroId,
      '🍞 Nova Tarefa Agendada!',
      `Você foi escalado para o cliente "${tarefa.clienteNome || 'Cliente'}" às ${tarefa.horario || '00:00'}.`,
      '/padeiro-agenda'
    ).catch(err => console.error('Erro ao enviar push de nova tarefa:', err.message));

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
    const activitiesToDelete = await Atividade.find({ cronogramaId: { $ne: null } });
    const activityIds = activitiesToDelete.map(a => a.id);

    await Cronograma.deleteMany({});
    await Atividade.deleteMany({ cronogramaId: { $ne: null } });

    if (activityIds.length > 0) {
      await Avaliacao.deleteMany({ atividadeId: { $in: activityIds } });
    }

    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'delete_all' });
    }

    res.json({ success: true, message: 'Todo o cronograma foi excluído.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao excluir cronograma' });
  }
};

exports.deleteTarefa = async (req, res) => {
  try {
    const id = req.params.id;
    const tarefa = await Cronograma.findById(id);
    const activitiesToDelete = await Atividade.find({ cronogramaId: id });
    const activityIds = activitiesToDelete.map(a => a.id);

    await Cronograma.findByIdAndDelete(id);
    await Atividade.deleteMany({ cronogramaId: id });

    if (activityIds.length > 0) {
      await Avaliacao.deleteMany({ atividadeId: { $in: activityIds } });
    }

    if (tarefa) {
      const io = getIo();
      if (io) {
        io.emit('agenda-updated', { action: 'delete', tarefa });
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};

exports.getPadeiroAgenda = async (req, res) => {
  if (req.user.role !== 'padeiro') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  try {
    const agenda = await Cronograma.find({ padeiroId: req.user.id })
      .sort({ data: 1, horario: 1 });
    res.json(agenda);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar agenda' });
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
