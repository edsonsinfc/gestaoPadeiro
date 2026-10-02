/**
 * BIA AGENT - AÇÕES OPERACIONAIS
 * SmartGestor - Brago Distribuidora
 */

const BiaActions = {
  /**
   * Coleta dados atuais do sistema para contextualizar a IA e calcular escalas
   */
  async getSystemContext() {
    try {
      const [padeiros, clientes, atividades, cronograma] = await Promise.all([
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/cronograma').catch(() => [])
      ]);

      const padeirosAtivos = (padeiros || []).filter(p => p.ativo !== false && !p.deletado);
      const clientesAtivos = (clientes || []).filter(c => c.ativo !== false);
      const atividadesFinalizadas = (atividades || []).filter(a => a.status === 'finalizada');

      // 1. Calcular produção total por padeiro (Kg + L)
      const producaoPadeiroMap = {};
      padeirosAtivos.forEach(p => {
        producaoPadeiroMap[p.id] = {
          id: p.id,
          nome: p.nome,
          cargo: p.cargo || 'Padeiro',
          codTec: p.codTec || '',
          filial: p.filial || '',
          totalKg: 0,
          totalAtividades: 0
        };
      });

      atividadesFinalizadas.forEach(a => {
        if (a.padeiroId && producaoPadeiroMap[a.padeiroId]) {
          const kg = (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
          producaoPadeiroMap[a.padeiroId].totalKg += kg;
          producaoPadeiroMap[a.padeiroId].totalAtividades++;
        }
      });

      const rankingPadeiros = Object.values(producaoPadeiroMap)
        .sort((a, b) => b.totalKg - a.totalKg);

      // 2. Calcular volume de consumo total por cliente (Kg + L)
      const volumeClienteMap = {};
      clientesAtivos.forEach(c => {
        volumeClienteMap[c.id] = {
          id: c.id,
          nome: c.nomeFantasia || c.nome,
          razaoSocial: c.nome || '',
          bairro: c.bairro || '',
          filial: c.filial || '',
          totalKg: 0,
          totalVisitas: 0
        };
      });

      atividadesFinalizadas.forEach(a => {
        const cId = a.clienteId;
        if (cId && volumeClienteMap[cId]) {
          const kg = (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
          volumeClienteMap[cId].totalKg += kg;
          volumeClienteMap[cId].totalVisitas++;
        }
      });

      const rankingClientes = Object.values(volumeClienteMap)
        .sort((a, b) => b.totalKg - a.totalKg || b.totalVisitas - a.totalVisitas);

      return {
        padeirosAtivos,
        clientesAtivos,
        rankingPadeiros,
        rankingClientes,
        cronogramaHistorico: cronograma || [],
        atividades: atividades || [],
        atividadesFinalizadas,
        totalAtividades: atividadesFinalizadas.length
      };
    } catch (err) {
      console.error('[BIA] Erro ao carregar contexto do sistema:', err);
      throw err;
    }
  },

  /**
   * Obtém as datas de Segunda a Sábado da semana de trabalho
   */
  getWeekDates(offset = 0) {
    const dates = [];
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7));
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  },

  /**
   * AÇÃO: Criar Escala de Alta Performance
   * Pareia os padeiros com maior volume de produção com os clientes de maior volume de consumo
   */
  async criarEscalaAltaPerformance(context) {
    const ctx = context || await this.getSystemContext();
    const { rankingPadeiros, rankingClientes, cronogramaHistorico } = ctx;

    if (!rankingPadeiros || rankingPadeiros.length === 0) {
      throw new Error('Nenhum padeiro ativo disponível.');
    }
    if (!rankingClientes || rankingClientes.length === 0) {
      throw new Error('Nenhum cliente ativo disponível.');
    }

    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || 0;
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Filtra tarefas já existentes na semana para não gerar conflito duplicado no mesmo dia
    const weekDatesIso = weekDates.map(d => d.toISOString().split('T')[0]);
    const tarefasExistentes = (cronogramaHistorico || []).filter(t => weekDatesIso.includes(t.data));
    const ocupadosMap = new Set();
    tarefasExistentes.forEach(t => {
      ocupadosMap.add(`${t.data}_${t.padeiroId}`);
    });

    const novasTarefas = [];
    const topClientes = [...rankingClientes];
    let clientQueueIdx = 0;

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const date = weekDates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const diaNome = diasSemanaNomes[diaIdx];
      const clientesUsadosNoDia = new Set();

      // Para cada padeiro, do mais produtivo ao menos produtivo
      for (let pIdx = 0; pIdx < rankingPadeiros.length; pIdx++) {
        const padeiro = rankingPadeiros[pIdx];

        // Se o padeiro já possui tarefa nesse dia, pula
        if (ocupadosMap.has(`${dateStr}_${padeiro.id}`)) {
          continue;
        }

        // Selecionar o melhor cliente de alta performance disponível para este dia
        let clienteEscolhido = null;
        let buscaIdx = 0;
        
        while (buscaIdx < topClientes.length) {
          const candidato = topClientes[(clientQueueIdx + buscaIdx) % topClientes.length];
          if (!clientesUsadosNoDia.has(candidato.id)) {
            clienteEscolhido = candidato;
            clientQueueIdx = (clientQueueIdx + buscaIdx + 1) % topClientes.length;
            clientesUsadosNoDia.add(candidato.id);
            break;
          }
          buscaIdx++;
        }

        if (!clienteEscolhido && topClientes.length > 0) {
          clienteEscolhido = topClientes[pIdx % topClientes.length];
        }

        if (clienteEscolhido) {
          novasTarefas.push({
            padeiroId: padeiro.id,
            padeiroNome: padeiro.nome,
            codTec: padeiro.codTec || '',
            clienteId: clienteEscolhido.id,
            clienteNome: clienteEscolhido.nome,
            data: dateStr,
            diaNome,
            horario: '08:00',
            horarioFim: '17:00',
            status: 'pendente',
            observacao: `Escala Alta Performance (Bia IA) - Padeiro #${pIdx + 1} (${padeiro.totalKg.toFixed(0)}kg) no Cliente #${topClientes.indexOf(clienteEscolhido) + 1} (${clienteEscolhido.totalKg.toFixed(0)}kg)`
          });
        }
      }
    }

    return {
      tipo: 'alta_performance',
      titulo: 'Escala de Alta Performance',
      descricao: `Cruzamento de ${rankingPadeiros.length} padeiros de alta produção com os clientes de maior volume.`,
      tarefas: novasTarefas,
      totalTarefas: novasTarefas.length,
      topPadeiro: rankingPadeiros[0]?.nome || '—',
      topCliente: rankingClientes[0]?.nome || '—',
      datas: weekDatesIso
    };
  },

  /**
   * Helper para normalizar strings (sem acentos, minúsculas, sem espaços extras)
   */
  normalizeStr(str) {
    if (!str) return '';
    return str.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  /**
   * AÇÃO: Criar Escala Seguindo Padrão Anterior
   * Analisa a rotina habitual da equipe a partir de Junho/2026 (cronogramas e atividades)
   * e replica rigorosamente o padrão de atendimento por dia da semana sem alocações aleatórias.
   */
  async criarEscalaPadraoAnterior(context) {
    const ctx = context || await this.getSystemContext();
    const { padeirosAtivos, rankingPadeiros, clientesAtivos, cronogramaHistorico, atividades } = ctx;

    const padeirosLista = rankingPadeiros && rankingPadeiros.length > 0 ? rankingPadeiros : padeirosAtivos;
    if (!padeirosLista || padeirosLista.length === 0) {
      throw new Error('Nenhum padeiro ativo disponível.');
    }

    // Marco temporal estrito: apenas dados a partir de Junho/2026
    const DATA_CORTE = '2026-06-01';

    // 1. Unificar histórico de Cronograma e Atividades a partir de Junho/2026
    const cronoFiltrado = (cronogramaHistorico || []).filter(c => c && c.data && c.data >= DATA_CORTE);
    const ativFiltradas = (atividades || []).filter(a => a && a.data && a.data >= DATA_CORTE);

    const historicoBruto = [
      ...cronoFiltrado.map(c => ({
        source: 'cronograma',
        padeiroId: c.padeiroId,
        padeiroNome: c.padeiroNome,
        codTec: c.codTec || '',
        clienteId: c.clienteId,
        clienteNome: c.clienteNome,
        data: c.data
      })),
      ...ativFiltradas.map(a => ({
        source: 'atividade',
        padeiroId: a.padeiroId,
        padeiroNome: a.padeiroNome,
        codTec: a.codTec || '',
        clienteId: a.clienteId,
        clienteNome: a.clienteNome,
        data: a.data
      }))
    ];

    if (historicoBruto.length === 0) {
      return this.criarEscalaAltaPerformance(ctx);
    }

    // 2. Mapeamento e resolução inteligente (Entity Resolution) com as entidades ativas
    const historicoNormalizado = [];
    historicoBruto.forEach(r => {
      // Padeiro: correspondência por ID ou similaridade de nome
      let pAtivo = padeirosLista.find(p => p.id === r.padeiroId);
      if (!pAtivo && r.padeiroNome) {
        const rNomeNorm = this.normalizeStr(r.padeiroNome);
        pAtivo = padeirosLista.find(p => {
          const pNomeNorm = this.normalizeStr(p.nome);
          return pNomeNorm === rNomeNorm || pNomeNorm.includes(rNomeNorm) || rNomeNorm.includes(pNomeNorm);
        });
      }

      // Cliente: correspondência por ID ou similaridade de Razão Social / Nome Fantasia
      let cAtivo = (clientesAtivos || []).find(c => c.id === r.clienteId);
      if (!cAtivo && r.clienteNome) {
        const rCliNorm = this.normalizeStr(r.clienteNome);
        cAtivo = (clientesAtivos || []).find(c => {
          const cNomeNorm = this.normalizeStr(c.nome);
          const cFantNorm = this.normalizeStr(c.nomeFantasia);
          return (cNomeNorm && (cNomeNorm === rCliNorm || rCliNorm.includes(cNomeNorm) || cNomeNorm.includes(rCliNorm))) ||
                 (cFantNorm && (cFantNorm === rCliNorm || rCliNorm.includes(cFantNorm) || cFantNorm.includes(cFantNorm)));
        });
      }

      if (pAtivo && cAtivo) {
        historicoNormalizado.push({
          padeiroId: pAtivo.id,
          padeiroNome: pAtivo.nome,
          codTec: pAtivo.codTec || r.codTec || '',
          clienteId: cAtivo.id,
          clienteNome: cAtivo.nomeFantasia || cAtivo.nome,
          data: r.data
        });
      }
    });

    // 3. Montar frequência habitual:
    // freqPorDia[pId][dayOfWeek][cId] = count
    // freqGeral[pId][cId] = count
    // diasAtivosPadeiro[pId] = Set(dayOfWeek)
    const freqPorDia = {};
    const freqGeral = {};
    const diasAtivosPadeiro = {};

    historicoNormalizado.forEach(r => {
      const dataObj = new Date(r.data + 'T00:00:00');
      const dayOfWeek = dataObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
      if (dayOfWeek < 1 || dayOfWeek > 6) return;

      if (!freqPorDia[r.padeiroId]) freqPorDia[r.padeiroId] = {};
      if (!freqPorDia[r.padeiroId][dayOfWeek]) freqPorDia[r.padeiroId][dayOfWeek] = {};
      freqPorDia[r.padeiroId][dayOfWeek][r.clienteId] = (freqPorDia[r.padeiroId][dayOfWeek][r.clienteId] || 0) + 1;

      if (!freqGeral[r.padeiroId]) freqGeral[r.padeiroId] = {};
      freqGeral[r.padeiroId][r.clienteId] = (freqGeral[r.padeiroId][r.clienteId] || 0) + 1;

      if (!diasAtivosPadeiro[r.padeiroId]) diasAtivosPadeiro[r.padeiroId] = new Set();
      diasAtivosPadeiro[r.padeiroId].add(dayOfWeek);
    });

    // Apenas padeiros que efetivamente possuem histórico habitual desde Junho/2026
    const padeirosComHabito = padeirosLista.filter(p => freqGeral[p.id]);

    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || 0;
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekDatesIso = weekDates.map(d => d.toISOString().split('T')[0]);

    // Mapear tarefas já agendadas nesta semana para não duplicar
    const tarefasExistentes = (cronogramaHistorico || []).filter(t => t && weekDatesIso.includes(t.data));
    const ocupadosMap = new Set();
    tarefasExistentes.forEach(t => ocupadosMap.add(`${t.data}_${t.padeiroId}`));

    const novasTarefas = [];

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const date = weekDates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const diaNome = diasSemanaNomes[diaIdx];
      const dayOfWeek = diaIdx + 1;

      for (const padeiro of padeirosComHabito) {
        if (ocupadosMap.has(`${dateStr}_${padeiro.id}`)) {
          continue;
        }

        let targetClienteId = null;
        let countVisitas = 0;

        // A. Procurar cliente mais frequente neste dia específico da semana
        const clientesNoDia = freqPorDia[padeiro.id]?.[dayOfWeek];
        if (clientesNoDia) {
          const ordenados = Object.entries(clientesNoDia).sort((a, b) => b[1] - a[1]);
          if (ordenados.length > 0) {
            targetClienteId = ordenados[0][0];
            countVisitas = ordenados[0][1];
          }
        }

        // B. Se não houver registro específico para o dia, mas o padeiro trabalha na maior parte da semana (>= 4 dias),
        // aloca seu cliente habitual principal
        if (!targetClienteId && diasAtivosPadeiro[padeiro.id]?.size >= 4) {
          const geralOrdenados = Object.entries(freqGeral[padeiro.id] || {}).sort((a, b) => b[1] - a[1]);
          if (geralOrdenados.length > 0) {
            targetClienteId = geralOrdenados[0][0];
            countVisitas = geralOrdenados[0][1];
          }
        }

        if (targetClienteId) {
          const clienteObj = (clientesAtivos || []).find(c => c.id === targetClienteId);
          if (clienteObj) {
            novasTarefas.push({
              padeiroId: padeiro.id,
              padeiroNome: padeiro.nome,
              codTec: padeiro.codTec || '',
              clienteId: clienteObj.id,
              clienteNome: clienteObj.nomeFantasia || clienteObj.nome,
              data: dateStr,
              diaNome,
              horario: '08:00',
              horarioFim: '17:00',
              status: 'pendente',
              observacao: `Escala Padrão Habitual (Bia IA) - Histórico: ${countVisitas}x visitas desde Junho/2026`
            });
          }
        }
      }
    }

    return {
      tipo: 'padrao_anterior',
      titulo: 'Escala no Padrão Anterior Habitual',
      descricao: `Replicado o padrão habitual da equipe com base no histórico real registrado desde Junho/2026 (${novasTarefas.length} atendimentos sugeridos).`,
      tarefas: novasTarefas,
      totalTarefas: novasTarefas.length,
      datas: weekDatesIso
    };
  },

  /**
   * Salva o registro de uma alteração no histórico local
   */
  recordAction(actionRecord) {
    try {
      const history = this.getActionHistory();
      history.unshift(actionRecord);
      if (history.length > 15) history.pop();
      localStorage.setItem('BIA_ACTION_HISTORY', JSON.stringify(history));
    } catch (e) {
      console.warn('[BIA] Erro ao salvar histórico de ações:', e);
    }
  },

  /**
   * Retorna a lista de ações registradas
   */
  getActionHistory() {
    try {
      const saved = localStorage.getItem('BIA_ACTION_HISTORY');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Retorna a última alteração realizada pela Bia
   */
  getLastAction() {
    const history = this.getActionHistory();
    return history.length > 0 ? history[0] : null;
  },

  /**
   * Executa a gravação em massa das tarefas no banco de dados via API e salva histórico para reversão
   */
  async aplicarTarefasNoSistema(tarefas, onProgress, escalaInfo = {}) {
    if (!tarefas || tarefas.length === 0) {
      throw new Error('Nenhuma tarefa para aplicar.');
    }

    let criadas = 0;
    const createdIds = [];
    const total = tarefas.length;

    for (let i = 0; i < tarefas.length; i++) {
      const t = tarefas[i];
      try {
        const res = await API.post('/api/cronograma', {
          padeiroId: t.padeiroId,
          padeiroNome: t.padeiroNome,
          codTec: t.codTec || '',
          clienteId: t.clienteId,
          clienteNome: t.clienteNome,
          data: t.data,
          horario: t.horario || '08:00',
          horarioFim: t.horarioFim || '17:00',
          status: 'pendente',
          observacao: t.observacao || 'Escala gerada pela Bia'
        });

        const createdId = res?.id || res?._id || res?.tarefa?.id || res?.tarefa?._id;
        if (createdId) {
          createdIds.push(createdId);
        }

        criadas++;
        if (typeof onProgress === 'function') {
          onProgress(criadas, total);
        }
      } catch (err) {
        console.warn('[BIA] Falha ao criar tarefa individual:', err);
      }
    }

    // Registrar no histórico para permitir reversão
    if (createdIds.length > 0) {
      this.recordAction({
        id: 'bia_batch_' + Date.now(),
        timestamp: new Date().toISOString(),
        tipo: escalaInfo.tipo || 'escala',
        titulo: escalaInfo.titulo || 'Escala no Cronograma',
        descricao: escalaInfo.descricao || '',
        tarefasCriadasIds: createdIds,
        totalTarefas: createdIds.length
      });
    }

    if (typeof Cronograma !== 'undefined' && typeof Cronograma.render === 'function') {
      try {
        await Cronograma.render();
      } catch (e) {
        console.warn('[BIA] Falha ao recarregar render do Cronograma:', e);
      }
    }

    return { sucesso: true, criadas, total, createdIds };
  },

  /**
   * AÇÃO: Desfazer a última escala ou alteração realizada pela Bia
   */
  async desfazerUltimaAcao(onProgress) {
    const lastAction = this.getLastAction();
    if (!lastAction || !lastAction.tarefasCriadasIds || lastAction.tarefasCriadasIds.length === 0) {
      return {
        sucesso: false,
        mensagem: 'Nenhuma alteração recente da Bia encontrada para desfazer.'
      };
    }

    let removidas = 0;
    const ids = lastAction.tarefasCriadasIds;
    const total = ids.length;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        await API.delete(`/api/cronograma/${id}`);
        removidas++;
        if (typeof onProgress === 'function') {
          onProgress(removidas, total);
        }
      } catch (err) {
        console.warn(`[BIA] Falha ao excluir tarefa ${id}:`, err);
      }
    }

    // Remover a ação do histórico após desfazer
    try {
      const history = this.getActionHistory();
      history.shift();
      localStorage.setItem('BIA_ACTION_HISTORY', JSON.stringify(history));
    } catch (e) {}

    // Sincronizar visualmente o Cronograma se estiver ativo
    if (typeof Cronograma !== 'undefined' && typeof Cronograma.render === 'function') {
      try {
        await Cronograma.render();
      } catch (e) {}
    }

    return {
      sucesso: true,
      removidas,
      total,
      titulo: lastAction.titulo || 'Escala',
      tipo: lastAction.tipo
    };
  }
};

if (typeof window !== 'undefined') {
  window.BiaActions = BiaActions;
}
