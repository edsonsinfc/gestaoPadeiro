const { CronogramaTemplate, Cronograma } = require('../data/db-adapter');
const crypto = require('crypto');
const { getIo } = require('../sockets/location.socket');

exports.listTemplates = async (req, res) => {
  try {
    const templates = await CronogramaTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveTemplate = async (req, res) => {
  try {
    const { nome, descricao, semana } = req.body;
    
    if (!nome || semana === undefined || semana === null) {
      return res.status(400).json({ error: 'Nome e semana (offset) são obrigatórios.' });
    }

    // Calcular as datas da semana passada
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (semana * 7));
    
    const dates = [];
    for (let i = 0; i < 6; i++) { // seg-sab
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Buscar tarefas dessa semana
    const query = { data: { $in: dates } };
    const tarefas = await Cronograma.find(query);

    if (!tarefas || tarefas.length === 0) {
      return res.status(400).json({ error: 'A semana selecionada não possui tarefas para salvar.' });
    }

    // Converter para itens de template
    const itens = tarefas.map(t => {
      const dataStr = t.data;
      const index = dates.indexOf(dataStr); // 0 a 5 (seg a sab)
      return {
        diaSemana: index, // Relativo
        padeiroId: t.padeiroId,
        padeiroNome: t.padeiroNome,
        codTec: t.codTec,
        clienteId: t.clienteId,
        clienteNome: t.clienteNome,
        horario: t.horario,
        horarioFim: t.horarioFim,
        tempoMinimoMinutos: t.tempoMinimoMinutos || 0,
        observacao: t.observacao || ''
      };
    });

    const now = new Date().toISOString();
    
    // Como a migration MySQL adiciona campos texto para o itens e array json auto-converte:
    const templateData = {
      id: crypto.randomUUID(),
      nome,
      descricao: descricao || '',
      itens,
      criadoPor: req.user.nome || req.user.username,
      criadoEm: now,
      atualizadoEm: now
    };

    const newTemplate = await CronogramaTemplate.create(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loadTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { semana } = req.body; // target week offset
    
    if (semana === undefined) {
      return res.status(400).json({ error: 'A semana destino é obrigatória.' });
    }

    const template = await CronogramaTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado.' });
    }

    const itens = typeof template.itens === 'string' ? JSON.parse(template.itens) : template.itens;

    // Calcular as datas da semana destino
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (semana * 7));
    
    const dates = [];
    for (let i = 0; i < 6; i++) { // seg-sab
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const now = new Date().toISOString();
    const novasTarefas = itens.map(item => {
      // Evitar erros se diaSemana estiver fora do array
      const dateIndex = Math.min(Math.max(item.diaSemana || 0, 0), 5);
      return {
        id: crypto.randomUUID(),
        padeiroId: item.padeiroId,
        padeiroNome: item.padeiroNome,
        codTec: item.codTec,
        clienteId: item.clienteId,
        clienteNome: item.clienteNome,
        data: dates[dateIndex],
        horario: item.horario,
        horarioFim: item.horarioFim,
        status: 'pendente',
        tempoMinimoMinutos: item.tempoMinimoMinutos || 0,
        posicao: 0,
        observacao: item.observacao,
        criadoPor: req.user.nome || req.user.username,
        criadoEm: now,
        atualizadoEm: now
      };
    });

    const result = await Cronograma.insertMany(novasTarefas);
    
    const io = getIo();
    if (io) {
      io.emit('agenda-updated', { action: 'load_template' });
    }

    res.json({ success: true, count: result.length });
  } catch (error) {
    console.error('Error loading template:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    await CronogramaTemplate.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
