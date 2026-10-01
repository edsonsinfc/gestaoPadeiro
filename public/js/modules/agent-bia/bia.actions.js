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
   * AÇÃO: Criar Escala Seguindo Padrão Anterior
   * Analisa a rotina habitual do usuário/padeiro no cronograma anterior e replica para a semana
   */
  async criarEscalaPadraoAnterior(context) {
    const ctx = context || await this.getSystemContext();
    const { rankingPadeiros, clientesAtivos, cronogramaHistorico } = ctx;

    if (!rankingPadeiros || rankingPadeiros.length === 0) {
      throw new Error('Nenhum padeiro ativo disponível.');
    }
    if (!cronogramaHistorico || cronogramaHistorico.length === 0) {
      // Fallback para distribuição de alta performance se não houver histórico prévio
      return this.criarEscalaAltaPerformance(ctx);
    }

    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || 0;
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekDatesIso = weekDates.map(d => d.toISOString().split('T')[0]);

    // Mapear frequência habitual: padeiroId + diaDaSemana => cliente mais frequente
    const frequenciaPadrao = {};

    cronogramaHistorico.forEach(t => {
      if (!t.data || !t.padeiroId || !t.clienteId) return;
      const dataObj = new Date(t.data + 'T00:00:00');
      const dayOfWeek = dataObj.getDay();
      if (dayOfWeek < 1 || dayOfWeek > 6) return;

      if (!frequenciaPadrao[t.padeiroId]) {
        frequenciaPadrao[t.padeiroId] = {};
      }
      if (!frequenciaPadrao[t.padeiroId][dayOfWeek]) {
        frequenciaPadrao[t.padeiroId][dayOfWeek] = {};
      }
      frequenciaPadrao[t.padeiroId][dayOfWeek][t.clienteId] = (frequenciaPadrao[t.padeiroId][dayOfWeek][t.clienteId] || 0) + 1;
    });

    const clienteMaisFrequente = {};
    Object.keys(frequenciaPadrao).forEach(pId => {
      clienteMaisFrequente[pId] = {};
      for (let day = 1; day <= 6; day++) {
        const clientesCount = frequenciaPadrao[pId][day];
        if (clientesCount) {
          let bestCId = null;
          let bestCnt = -1;
          Object.entries(clientesCount).forEach(([cId, cnt]) => {
            if (cnt > bestCnt) {
              bestCnt = cnt;
              bestCId = cId;
            }
          });
          clienteMaisFrequente[pId][day] = bestCId;
        }
      }
    });

    const novasTarefas = [];
    const tarefasExistentes = cronogramaHistorico.filter(t => weekDatesIso.includes(t.data));
    const ocupadosMap = new Set();
    tarefasExistentes.forEach(t => ocupadosMap.add(`${t.data}_${t.padeiroId}`));

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const date = weekDates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const diaNome = diasSemanaNomes[diaIdx];
      const dayOfWeek = diaIdx + 1;
      const clientesUsadosNoDia = new Set();

      for (const padeiro of rankingPadeiros) {
        if (ocupadosMap.has(`${dateStr}_${padeiro.id}`)) {
          continue;
        }

        let targetClienteId = clienteMaisFrequente[padeiro.id]?.[dayOfWeek];
        let clienteObj = clientesAtivos.find(c => c.id === targetClienteId);

        if (!clienteObj || clientesUsadosNoDia.has(clienteObj.id)) {
          clienteObj = clientesAtivos.find(c => !clientesUsadosNoDia.has(c.id));
        }

        if (clienteObj) {
          clientesUsadosNoDia.add(clienteObj.id);
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
            observacao: 'Escala Padrão Habitual (Bia IA) - Baseada no histórico prévio'
          });
        }
      }
    }

    return {
      tipo: 'padrao_anterior',
      titulo: 'Escala no Padrão Anterior',
      descricao: `Replicado o padrão habitual de dias e clientes praticados anteriormente pela equipe.`,
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
