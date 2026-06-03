const { TimelineEvent, Atividade } = require('../data/db-adapter');

exports.getTimelineEvents = async (req, res, next) => {
  try {
    const { padeiroId } = req.params;
    const { date } = req.query; // optional date filter (YYYY-MM-DD)
    
    // Pegamos todos os eventos deste padeiro
    let events = await TimelineEvent.find({ padeiroId });
    
    if (date) {
      events = events.filter(e => e.timestamp && e.timestamp.startsWith(date));
    }
    
    // Sort chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Se há eventos sem clienteNome, tenta preencher cruzando com atividades do dia
    const needsClient = events.some(e => !e.clienteNome);
    if (needsClient && date) {
      try {
        const atividades = await Atividade.find({ padeiroId });
        const atividadesDoDia = atividades.filter(a => a.data === date);
        
        if (atividadesDoDia.length > 0) {
          // Ordena atividades por inicioEm para poder associar eventos ao cliente correto
          atividadesDoDia.sort((a, b) => {
            const tA = a.inicioEm ? new Date(a.inicioEm).getTime() : 0;
            const tB = b.inicioEm ? new Date(b.inicioEm).getTime() : 0;
            return tA - tB;
          });

          events.forEach(ev => {
            if (!ev.clienteNome) {
              // Tenta associar pelo timestamp: encontra a atividade cuja janela engloba o evento
              const evTime = new Date(ev.timestamp).getTime();
              let matched = null;

              for (let i = 0; i < atividadesDoDia.length; i++) {
                const atv = atividadesDoDia[i];
                const inicio = atv.inicioEm ? new Date(atv.inicioEm).getTime() : 0;
                const fim = atv.fimEm ? new Date(atv.fimEm).getTime() : 
                            atv.terminadoEm ? new Date(atv.terminadoEm).getTime() : Infinity;
                
                if (evTime >= inicio && evTime <= fim) {
                  matched = atv;
                  break;
                }
              }

              // Se não achou pela janela, pega a mais próxima
              if (!matched) {
                let minDist = Infinity;
                for (const atv of atividadesDoDia) {
                  const inicio = atv.inicioEm ? new Date(atv.inicioEm).getTime() : 0;
                  const dist = Math.abs(evTime - inicio);
                  if (dist < minDist) {
                    minDist = dist;
                    matched = atv;
                  }
                }
              }

              if (matched && matched.clienteNome) {
                ev.clienteNome = matched.clienteNome;
                ev.clienteId = matched.clienteId;
              }
            }
          });
        }
      } catch (e) {
        console.warn('Não foi possível cruzar atividades com timeline:', e.message);
      }
    }
    
    res.json(events);
  } catch (err) {
    next(err);
  }
};

// POST endpoint - Fallback HTTP para quando socket não está conectado
exports.createTimelineEvent = async (req, res, next) => {
  try {
    const { userId, userName, action, timestamp, source, coords, clienteId, clienteNome } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId e action são obrigatórios' });
    }

    await TimelineEvent.create({
      padeiroId: userId,
      padeiroNome: userName,
      action: action,
      lat: coords ? coords.lat : null,
      lng: coords ? coords.lng : null,
      accuracy: coords ? coords.accuracy : null,
      source: source || 'http_fallback',
      timestamp: timestamp || new Date().toISOString(),
      clienteId: clienteId || null,
      clienteNome: clienteNome || null
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
