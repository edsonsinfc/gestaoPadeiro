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
      // 1. Averiguação completa e prioritária de todas as escalas e dados no banco da Hostinger
      const [serverCtx, stats] = await Promise.all([
        API.get('/api/bia/context').catch(() => null),
        API.get('/api/stats').catch(() => null)
      ]);

      if (serverCtx && Array.isArray(serverCtx.cronogramaHistorico) && serverCtx.cronogramaHistorico.length > 0) {
        if (stats && Array.isArray(stats.rankingClientes) && stats.rankingClientes.length > 0) {
          serverCtx.rankingClientes = stats.rankingClientes.map(c => ({
            ...c,
            nome: (c.nomeFantasia || c.nome || '').split(' - ')[0].replace(/[\s-]+$/, '').trim(),
            nomeFantasia: c.nomeFantasia || c.nome,
            totalVisitas: c.totalAtendimentos || c.totalVisitas || 0
          }));
        }
        return serverCtx;
      }

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

      // 2. Calcular volume de consumo total por cliente (Kg + L) com reconciliação inteligente
      let rankingClientes = [];
      if (stats && Array.isArray(stats.rankingClientes) && stats.rankingClientes.length > 0) {
        rankingClientes = stats.rankingClientes.map(c => ({
          ...c,
          nome: (c.nomeFantasia || c.nome || '').split(' - ')[0].replace(/[\s-]+$/, '').trim(),
          nomeFantasia: c.nomeFantasia || c.nome,
          totalVisitas: c.totalAtendimentos || c.totalVisitas || 0
        }));
      } else {
        rankingClientes = this.calcularRankingClientesInteligente(clientesAtivos, atividadesFinalizadas);
      }

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
    // Garante meio-dia (12:00:00) para evitar desvio de fuso horário / UTC
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    base.setDate(base.getDate() + (offset * 7));
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

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
  /**
   * AÇÃO: Criar Escala de Alta Performance
   * Pareia os padeiros com maior volume de produção com os clientes de maior volume de consumo
   */
  async criarEscalaAltaPerformance(context, options = {}) {
    const ctx = context || await this.getSystemContext();
    const { rankingPadeiros, rankingClientes, cronogramaHistorico, padeirosAtivos } = ctx;

    const padeirosLista = rankingPadeiros && rankingPadeiros.length > 0 ? rankingPadeiros : padeirosAtivos;
    if (!padeirosLista || padeirosLista.length === 0) {
      throw new Error('Nenhum padeiro ativo disponível.');
    }
    if (!rankingClientes || rankingClientes.length === 0) {
      throw new Error('Nenhum cliente ativo disponível.');
    }

    let padeiroAlvo = null;
    if (options && options.padeiroId) {
      padeiroAlvo = (padeirosLista || []).find(p => p.id === options.padeiroId);
    }
    if (!padeiroAlvo && options && options.padeiroNome) {
      const alvoNorm = this.normalizeStr(options.padeiroNome);
      padeiroAlvo = (padeirosLista || []).find(p => this.normalizeStr(p.nome) === alvoNorm || this.normalizeStr(p.nome).includes(alvoNorm));
    }

    const padeirosParaEscalar = padeiroAlvo ? [padeiroAlvo] : padeirosLista;

    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || 0;
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Filtra tarefas já existentes na semana
    const weekDatesIso = weekDates.map(d => d.toISOString().split('T')[0]);
    const tarefasExistentes = (cronogramaHistorico || []).filter(t => t && weekDatesIso.includes(t.data));
    const mapaTarefasExistentes = new Map();
    tarefasExistentes.forEach(t => {
      mapaTarefasExistentes.set(`${t.data}_${t.padeiroId}`, t);
    });

    const novasTarefas = [];
    const topClientes = [...rankingClientes];
    let clientQueueIdx = 0;

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const date = weekDates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const diaNome = diasSemanaNomes[diaIdx];
      const clientesUsadosNoDia = new Set();

      for (let pIdx = 0; pIdx < padeirosParaEscalar.length; pIdx++) {
        const padeiro = padeirosParaEscalar[pIdx];
        const tarefaExistente = mapaTarefasExistentes.get(`${dateStr}_${padeiro.id}`);

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
          const prodKg = (padeiro.totalKg || 0).toFixed(0);
          const cliKg = (clienteEscolhido.totalKg || 0).toFixed(0);
          const isSubstituicao = Boolean(tarefaExistente && String(tarefaExistente.clienteId) !== String(clienteEscolhido.id));
          const isMesmaLoja = Boolean(tarefaExistente && String(tarefaExistente.clienteId) === String(clienteEscolhido.id));

          novasTarefas.push({
            padeiroId: padeiro.id,
            padeiroNome: padeiro.nome,
            codTec: padeiro.codTec || '',
            clienteId: clienteEscolhido.id,
            clienteNome: clienteEscolhido.nomeFantasia || clienteEscolhido.nome,
            data: dateStr,
            diaNome,
            horario: '08:00',
            horarioFim: '17:00',
            status: 'pendente',
            substituicao: isSubstituicao,
            jaAgendado: isMesmaLoja,
            lojaAnterior: isSubstituicao ? (tarefaExistente.clienteNome || 'Loja anterior') : null,
            tarefaExistenteId: tarefaExistente?.id || tarefaExistente?._id || null,
            observacao: isSubstituicao
              ? `Escala Alta Performance (Bia IA) - Substituindo ${tarefaExistente.clienteNome}`
              : isMesmaLoja
                ? `Escala Alta Performance (Bia IA) - Em conformidade com cronograma`
                : `Escala Alta Performance (Bia IA) - ${padeiro.nome} (${prodKg}kg) no cliente ${clienteEscolhido.nomeFantasia || clienteEscolhido.nome} (${cliKg}kg)`
          });
        }
      }
    }

    const subCount = novasTarefas.filter(t => t.substituicao).length;
    const jaAgendadasCount = novasTarefas.filter(t => t.jaAgendado).length;
    const novasCount = novasTarefas.filter(t => !t.substituicao && !t.jaAgendado).length;

    let descInfo = `(${novasTarefas.length} atendimentos sugeridos)`;
    if (tarefasExistentes.length > 0) {
      if (jaAgendadasCount === novasTarefas.length) {
        descInfo = `(${novasTarefas.length} atendimentos verificados em conformidade com o cronograma)`;
      } else {
        descInfo = `(${novasTarefas.length} atendimentos calculados: ${novasCount} novos, ${subCount} atualizações)`;
      }
    }

    const titulo = padeiroAlvo ? `Escala de Alta Performance - ${padeiroAlvo.nome}` : 'Escala de Alta Performance';
    const descricao = padeiroAlvo
      ? `Alocação otimizada individual para ${padeiroAlvo.nome} nos clientes de maior demanda ${descInfo}.`
      : `Cruzamento de ${rankingPadeiros.length} padeiros de alta produção com os clientes de maior volume ${descInfo}.`;

    return {
      tipo: 'alta_performance',
      titulo,
      descricao,
      tarefas: novasTarefas,
      totalTarefas: novasTarefas.length,
      padeiroAlvo,
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
   * Helper para obter dia da semana de forma estável e imune a timezones/fuso horário
   * 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
   */
  getDiaSemana(dataStr) {
    if (!dataStr) return -1;
    const clean = String(dataStr).split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length < 3) return -1;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d, 12, 0, 0); // meio-dia local sempre mantém o dia intacto
    return dt.getDay();
  },

  /**
   * AÇÃO: Criar Escala Seguindo Padrão Anterior / Habitual
   * Averigua todas as escalas históricas registradas na Hostinger e atividades,
   * preserva fielmente os nomes e IDs das lojas históricas (sem correspondência fuzzy falsa),
   * e replica rigorosamente o padrão de maior frequência para cada dia da semana.
   */
  async criarEscalaPadraoAnterior(context, options = {}) {
    const ctx = context || await this.getSystemContext();
    const { padeirosAtivos, rankingPadeiros, clientesAtivos, cronogramaHistorico, atividades } = ctx;

    const padeirosLista = rankingPadeiros && rankingPadeiros.length > 0 ? rankingPadeiros : padeirosAtivos;
    if (!padeirosLista || padeirosLista.length === 0) {
      throw new Error('Nenhum padeiro ativo disponível.');
    }

    // 1. Identificar se foi solicitada escala para um padeiro específico
    let padeiroAlvo = null;
    if (options && options.padeiroId) {
      padeiroAlvo = padeirosLista.find(p => p.id === options.padeiroId);
    }
    if (!padeiroAlvo && options && options.padeiroNome) {
      const alvoNorm = this.normalizeStr(options.padeiroNome);
      padeiroAlvo = padeirosLista.find(p => this.normalizeStr(p.nome) === alvoNorm || this.normalizeStr(p.nome).includes(alvoNorm));
    }

    // 2. Unificar histórico ponderando Cronogramas planejados (peso 3) e Atividades executadas (peso 1)
    const cronoFiltrado = (cronogramaHistorico || []).filter(c => c && c.data);
    const ativFiltradas = (atividades || []).filter(a => a && a.data);

    const historicoBruto = [
      ...cronoFiltrado.map(c => ({
        source: 'cronograma',
        peso: 3, // Peso prioritário para escalas planejadas no sistema
        padeiroId: c.padeiroId,
        padeiroNome: c.padeiroNome,
        codTec: c.codTec || '',
        clienteId: c.clienteId,
        clienteNome: c.clienteNome,
        data: c.data
      })),
      ...ativFiltradas.map(a => ({
        source: 'atividade',
        peso: 1, // Atendimentos executados
        padeiroId: a.padeiroId,
        padeiroNome: a.padeiroNome,
        codTec: a.codTec || '',
        clienteId: a.clienteId,
        clienteNome: a.clienteNome,
        data: a.data
      }))
    ];

    if (historicoBruto.length === 0) {
      return this.criarEscalaAltaPerformance(ctx, options);
    }

    // 3. Resolução rigorosa de entidades (Entity Resolution) preservando a integridade das lojas históricas
    const historicoNormalizado = [];
    const mapaClientesHistorico = {};

    historicoBruto.forEach(r => {
      // Padeiro: correspondência por ID exato, código técnico ou nome normalizado
      let pAtivo = padeirosLista.find(p => p.id === r.padeiroId);
      if (!pAtivo && r.codTec) {
        pAtivo = padeirosLista.find(p => p.codTec && String(p.codTec) === String(r.codTec));
      }
      if (!pAtivo && r.padeiroNome) {
        const rNomeNorm = this.normalizeStr(r.padeiroNome);
        pAtivo = padeirosLista.find(p => this.normalizeStr(p.nome) === rNomeNorm);
        if (!pAtivo) {
          const rTokens = rNomeNorm.split(/\s+/).filter(w => w.length > 2);
          if (rTokens.length >= 2) {
            pAtivo = padeirosLista.find(p => {
              const pNorm = this.normalizeStr(p.nome);
              return rTokens.every(tok => pNorm.includes(tok));
            });
          }
        }
      }
      if (!pAtivo) return;

      // Cliente: correspondência por ID exato ou código
      let cAtivo = (clientesAtivos || []).find(c => c.id === r.clienteId);
      if (!cAtivo && r.clienteId) {
        cAtivo = (clientesAtivos || []).find(c => c.codigo && String(c.codigo) === String(r.clienteId));
      }
      if (!cAtivo && r.clienteNome) {
        const rCliNorm = this.normalizeStr(r.clienteNome);
        cAtivo = (clientesAtivos || []).find(c => {
          const cNomeNorm = this.normalizeStr(c.nome);
          const cFantNorm = this.normalizeStr(c.nomeFantasia);
          return (cNomeNorm && cNomeNorm === rCliNorm) || (cFantNorm && cFantNorm === rCliNorm);
        });
      }

      // Se a loja histórica não está na lista de clientes ativos atuais (ex: Big Box ou Veneza P.Sul com IDs específicos),
      // PRESERVA EXATAMENTE o nome e ID históricos da escala sem tentar casamento forçado com outras lojas!
      if (!cAtivo && r.clienteNome && r.clienteNome.trim().length > 0) {
        cAtivo = {
          id: r.clienteId || ('cli-hist-' + this.normalizeStr(r.clienteNome).replace(/[^a-z0-9]/g, '_')),
          nome: r.clienteNome,
          nomeFantasia: r.clienteNome
        };
      }

      if (cAtivo) {
        mapaClientesHistorico[cAtivo.id] = cAtivo;
        historicoNormalizado.push({
          source: r.source,
          peso: r.peso,
          padeiroId: pAtivo.id,
          padeiroNome: pAtivo.nome,
          codTec: pAtivo.codTec || r.codTec || '',
          clienteId: cAtivo.id,
          clienteNome: cAtivo.nomeFantasia || cAtivo.nome,
          data: r.data
        });
      }
    });

    // 4. Montar frequência habitual por dia da semana e geral com soma ponderada
    const freqPorDia = {};
    const freqGeral = {};
    const diasAtivosPadeiro = {};

    historicoNormalizado.forEach(r => {
      const dayOfWeek = this.getDiaSemana(r.data); // 0=Dom, 1=Seg, ..., 6=Sab
      if (dayOfWeek < 1 || dayOfWeek > 6) return;

      if (!freqPorDia[r.padeiroId]) freqPorDia[r.padeiroId] = {};
      if (!freqPorDia[r.padeiroId][dayOfWeek]) freqPorDia[r.padeiroId][dayOfWeek] = {};
      
      const cEntry = freqPorDia[r.padeiroId][dayOfWeek][r.clienteId] || {
        clienteId: r.clienteId,
        clienteNome: r.clienteNome,
        count: 0,
        peso: 0,
        maxData: r.data
      };
      cEntry.count++;
      cEntry.peso += (r.peso || 1);
      if (r.data > cEntry.maxData) {
        cEntry.maxData = r.data;
        cEntry.clienteNome = r.clienteNome;
      }
      freqPorDia[r.padeiroId][dayOfWeek][r.clienteId] = cEntry;

      // Frequência Geral
      if (!freqGeral[r.padeiroId]) freqGeral[r.padeiroId] = {};
      const gEntry = freqGeral[r.padeiroId][r.clienteId] || {
        clienteId: r.clienteId,
        clienteNome: r.clienteNome,
        count: 0,
        peso: 0,
        maxData: r.data
      };
      gEntry.count++;
      gEntry.peso += (r.peso || 1);
      if (r.data > gEntry.maxData) {
        gEntry.maxData = r.data;
        gEntry.clienteNome = r.clienteNome;
      }
      freqGeral[r.padeiroId][r.clienteId] = gEntry;

      if (!diasAtivosPadeiro[r.padeiroId]) diasAtivosPadeiro[r.padeiroId] = new Set();
      diasAtivosPadeiro[r.padeiroId].add(dayOfWeek);
    });

    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || 0;
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekDatesIso = weekDates.map(d => d.toISOString().split('T')[0]);

    // Se foi solicitado padeiro específico, validar se ele tem hábito
    if (padeiroAlvo) {
      if (!freqGeral[padeiroAlvo.id]) {
        return {
          tipo: 'sem_habito',
          titulo: `Sem Histórico Habitual - ${padeiroAlvo.nome}`,
          descricao: `O padeiro ${padeiroAlvo.nome} ainda não possui histórico suficiente de escalas anteriores para gerar um padrão habitual.`,
          tarefas: [],
          totalTarefas: 0,
          padeiroAlvo,
          datas: weekDatesIso
        };
      }
    }

    const padeirosComHabito = padeirosLista.filter(p => freqGeral[p.id]);
    const padeirosParaEscalar = padeiroAlvo ? [padeiroAlvo] : padeirosComHabito;

    if (padeirosParaEscalar.length === 0) {
      return {
        tipo: 'sem_habito',
        titulo: 'Sem Histórico Habitual',
        descricao: 'Não foram encontrados registros habituais suficientes de escalas para gerar a proposta da equipe.',
        tarefas: [],
        totalTarefas: 0,
        datas: weekDatesIso
      };
    }

    // Mapear tarefas já agendadas nesta semana para identificar status e substituições
    const tarefasExistentes = (cronogramaHistorico || []).filter(t => t && weekDatesIso.includes(t.data));
    const mapaTarefasExistentes = new Map();
    tarefasExistentes.forEach(t => {
      mapaTarefasExistentes.set(`${t.data}_${t.padeiroId}`, t);
    });

    const novasTarefas = [];

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) {
      const date = weekDates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const diaNome = diasSemanaNomes[diaIdx];
      const dayOfWeek = diaIdx + 1; // 1=Seg, 2=Ter, ..., 6=Sab

      for (const padeiro of padeirosParaEscalar) {
        const tarefaExistente = mapaTarefasExistentes.get(`${dateStr}_${padeiro.id}`);

        let escolhido = null;

        // A. Procurar o cliente de maior rotina do padeiro neste dia específico da semana
        // CRITÉRIO FUNDAMENTAL: Ordena PRIMEIRO por peso acumulado (escalas têm peso 3),
        // SEGUNDO por quantidade de visitas (count desc), e em empate por recência (maxData desc)
        const clientesNoDia = Object.values(freqPorDia[padeiro.id]?.[dayOfWeek] || {});
        if (clientesNoDia.length > 0) {
          clientesNoDia.sort((a, b) => {
            if (b.peso !== a.peso) return b.peso - a.peso;
            if (b.count !== a.count) return b.count - a.count;
            return (b.maxData || '').localeCompare(a.maxData || '');
          });
          escolhido = clientesNoDia[0];
        }

        // B. Se não há registro para o dia específico, mas o padeiro trabalha a semana inteira (>= 4 dias):
        // aloca o cliente mais representativo de sua rotina geral
        if (!escolhido && (diasAtivosPadeiro[padeiro.id]?.size >= 5 || (padeiroAlvo && diasAtivosPadeiro[padeiro.id]?.size >= 4))) {
          const geralOrdenados = Object.values(freqGeral[padeiro.id] || {});
          if (geralOrdenados.length > 0) {
            geralOrdenados.sort((a, b) => {
              if (b.peso !== a.peso) return b.peso - a.peso;
              if (b.count !== a.count) return b.count - a.count;
              return (b.maxData || '').localeCompare(a.maxData || '');
            });
            escolhido = geralOrdenados[0];
          }
        }

        if (escolhido) {
          const clienteObj = (clientesAtivos || []).find(c => c.id === escolhido.clienteId) || mapaClientesHistorico[escolhido.clienteId] || {
            id: escolhido.clienteId,
            nome: escolhido.clienteNome,
            nomeFantasia: escolhido.clienteNome
          };

          const isSubstituicao = Boolean(tarefaExistente && String(tarefaExistente.clienteId) !== String(clienteObj.id));
          const isMesmaLoja = Boolean(tarefaExistente && String(tarefaExistente.clienteId) === String(clienteObj.id));

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
            substituicao: isSubstituicao,
            jaAgendado: isMesmaLoja,
            lojaAnterior: isSubstituicao ? (tarefaExistente.clienteNome || 'Loja anterior') : null,
            tarefaExistenteId: tarefaExistente?.id || tarefaExistente?._id || null,
            observacao: isSubstituicao
              ? `Escala Padrão Habitual (Bia IA) - Substituindo ${tarefaExistente.clienteNome}`
              : isMesmaLoja
                ? `Escala Padrão Habitual (Bia IA) - Confirmado habitual`
                : `Escala Padrão Habitual (Bia IA) - Histórico: ${escolhido.count}x escalas registradas`
          });
        }
      }
    }

    const subCount = novasTarefas.filter(t => t.substituicao).length;
    const jaAgendadasCount = novasTarefas.filter(t => t.jaAgendado).length;
    const novasCount = novasTarefas.filter(t => !t.substituicao && !t.jaAgendado).length;

    let descInfo = `(${novasTarefas.length} atendimentos sugeridos)`;
    if (tarefasExistentes.length > 0) {
      if (jaAgendadasCount === novasTarefas.length) {
        descInfo = `(${novasTarefas.length} atendimentos verificados em conformidade com o cronograma)`;
      } else {
        descInfo = `(${novasTarefas.length} atendimentos calculados: ${novasCount} novos, ${subCount} substituições)`;
      }
    }

    const titulo = padeiroAlvo ? `Escala Habitual - ${padeiroAlvo.nome}` : 'Escala no Padrão Anterior Habitual';
    const descricao = padeiroAlvo
      ? `Replicado o padrão habitual de ${padeiroAlvo.nome} com base no histórico real ${descInfo}.`
      : `Replicado o padrão habitual da equipe com base no histórico real ${descInfo}.`;

    return {
      tipo: 'padrao_anterior',
      titulo,
      descricao,
      tarefas: novasTarefas,
      totalTarefas: novasTarefas.length,
      padeiroAlvo,
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
      // Se a tarefa já está agendada exatamente na mesma loja e dia, apenas contabiliza
      if (t.jaAgendado) {
        criadas++;
        if (typeof onProgress === 'function') onProgress(criadas, total);
        continue;
      }

      try {
        let res = null;
        // Se for substituição de uma tarefa existente no mesmo dia, atualiza a tarefa existente
        if (t.substituicao && t.tarefaExistenteId) {
          try {
            res = await API.put(`/api/cronograma/${t.tarefaExistenteId}`, {
              clienteId: t.clienteId,
              clienteNome: t.clienteNome,
              horario: t.horario || '08:00',
              horarioFim: t.horarioFim || '17:00',
              observacao: t.observacao || 'Escala atualizada pela Bia IA'
            });
          } catch (putErr) {
            console.warn('[BIA] Falha ao atualizar via PUT, tentando POST novo:', putErr);
          }
        }

        if (!res) {
          res = await API.post('/api/cronograma', {
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
        }

        const createdId = res?.id || res?._id || res?.tarefa?.id || res?.tarefa?._id || t.tarefaExistenteId;
        if (createdId) {
          createdIds.push(createdId);
        }

        criadas++;
        if (typeof onProgress === 'function') {
          onProgress(criadas, total);
        }
      } catch (err) {
        console.warn('[BIA] Falha ao criar/atualizar tarefa individual:', err);
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
  },

  /**
   * AÇÃO: Executar Agendamento Avulso solicitado diretamente pelo Gestor
   * Suporta criação direta ou substituição de agendamento existente no dia
   */
  async executarAgendamentoAvulso(actionData) {
    if (!actionData || !actionData.padeiro || !actionData.cliente || !actionData.data) {
      throw new Error('Dados incompletos para efetuar o agendamento avulso.');
    }

    const payload = {
      padeiroId: actionData.padeiro.id,
      padeiroNome: actionData.padeiro.nome,
      codTec: actionData.padeiro.codTec || '',
      clienteId: actionData.cliente.id,
      clienteNome: actionData.cliente.nome,
      data: actionData.data,
      horario: actionData.horario || '08:00',
      horarioFim: actionData.horarioFim || '17:00',
      status: 'pendente',
      observacao: actionData.observacao || `Ajuste Pontual Gestor (Bia IA) - ${actionData.diaNome || actionData.data}`
    };

    let tarefaId = null;

    if (actionData.substituicao && actionData.tarefaIdExistente) {
      try {
        const res = await API.put(`/api/cronograma/${actionData.tarefaIdExistente}`, payload);
        tarefaId = res?.id || res?._id || actionData.tarefaIdExistente;
      } catch (putErr) {
        // Fallback: remove o anterior e cria o novo
        await API.delete(`/api/cronograma/${actionData.tarefaIdExistente}`).catch(() => {});
        const postRes = await API.post('/api/cronograma', payload);
        tarefaId = postRes?.id || postRes?._id || postRes?.tarefa?.id || postRes?.tarefa?._id;
      }
    } else {
      const postRes = await API.post('/api/cronograma', payload);
      tarefaId = postRes?.id || postRes?._id || postRes?.tarefa?.id || postRes?.tarefa?._id;
    }

    // Registrar no histórico para permitir reversão se necessário
    if (tarefaId) {
      this.recordAction({
        id: 'bia_single_' + Date.now(),
        timestamp: new Date().toISOString(),
        tipo: 'agendamento_avulso',
        titulo: `${actionData.padeiro.nome} ➔ ${actionData.cliente.nome}`,
        descricao: `${actionData.diaNome || ''} (${actionData.data})`,
        tarefasCriadasIds: [tarefaId],
        totalTarefas: 1
      });
    }

    // Sincronizar visualização do Cronograma
    if (typeof Cronograma !== 'undefined' && typeof Cronograma.render === 'function') {
      try {
        await Cronograma.render();
      } catch (e) {
        console.warn('[BIA] Falha ao recarregar render do Cronograma:', e);
      }
    }

    return {
      sucesso: true,
      tarefaId,
      payload,
      substituicao: !!actionData.substituicao
    };
  },

  /**
   * AÇÃO: Executar Remoção Avulsa de Agendamentos solicitada pelo Gestor
   */
  async executarRemocaoAvulsa(actionData) {
    if (!actionData || !actionData.tarefas || actionData.tarefas.length === 0) {
      throw new Error('Nenhuma tarefa especificada para remoção.');
    }

    let removidas = 0;
    const ids = [];

    for (const t of actionData.tarefas) {
      const id = t.id || t._id;
      if (id) {
        try {
          await API.delete(`/api/cronograma/${id}`);
          removidas++;
          ids.push(id);
        } catch (e) {
          console.warn(`[BIA] Falha ao remover tarefa ${id}:`, e);
        }
      }
    }

    if (typeof Cronograma !== 'undefined' && typeof Cronograma.render === 'function') {
      try {
        await Cronograma.render();
      } catch (e) {}
    }

    return {
      sucesso: true,
      removidas,
      total: actionData.tarefas.length,
      ids
    };
  },

  /**
   * Reconciliação inteligente do ranking de clientes por ID, Razão Social e Nome Fantasia
   */
  calcularRankingClientesInteligente(clientes = [], atividades = []) {
    const norm = (txt) => (txt || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const ativsFinalizadas = (atividades || []).filter(a => a.status === 'finalizada' || (parseFloat(a.kgTotal) > 0 || parseFloat(a.lTotal) > 0));

    const clientePorId = new Map();
    const clientesLista = [];

    (clientes || []).forEach(c => {
      if (!c) return;
      const cIdStr = String(c.id || c._id || '');
      if (cIdStr) clientePorId.set(cIdStr, c);

      const n = norm(c.nome || '');
      const nf = norm(c.nomeFantasia || '');
      clientesLista.push({ c, idStr: cIdStr, nomeNorm: n, nomeFantasiaNorm: nf });
    });

    function resolverClienteAtivo(a) {
      if (a.clienteId && clientePorId.has(String(a.clienteId))) {
        return clientePorId.get(String(a.clienteId));
      }
      const aNomeNorm = norm(a.clienteNome || '');
      if (!aNomeNorm) return null;

      for (const item of clientesLista) {
        if ((item.nomeFantasiaNorm && item.nomeFantasiaNorm === aNomeNorm) ||
            (item.nomeNorm && item.nomeNorm === aNomeNorm)) {
          return item.c;
        }
      }

      for (const item of clientesLista) {
        if (item.nomeFantasiaNorm && (aNomeNorm.includes(item.nomeFantasiaNorm) || item.nomeFantasiaNorm.includes(aNomeNorm))) {
          return item.c;
        }
        if (item.nomeNorm && (aNomeNorm.includes(item.nomeNorm) || item.nomeNorm.includes(aNomeNorm))) {
          return item.c;
        }
      }

      return null;
    }

    const agrupamentoMap = new Map();

    ativsFinalizadas.forEach(a => {
      const cliAtivo = resolverClienteAtivo(a);
      let chaveGrupo;
      if (cliAtivo) {
        chaveGrupo = 'cli_' + (cliAtivo.id || cliAtivo._id);
      } else {
        const aNomeNorm = norm(a.clienteNome || '');
        chaveGrupo = aNomeNorm ? 'nome_' + aNomeNorm : 'id_' + a.clienteId;
      }
      if (!chaveGrupo || chaveGrupo === 'nome_') return;

      if (!agrupamentoMap.has(chaveGrupo)) {
        const nomeBruto = cliAtivo?.nomeFantasia || cliAtivo?.nome || a.clienteNome || 'Cliente';
        const nomeAmigavel = String(nomeBruto).split(' - ')[0].replace(/[\s-]+$/, '').trim();

        agrupamentoMap.set(chaveGrupo, {
          id: cliAtivo?.id || a.clienteId,
          nome: nomeAmigavel,
          nomeFantasia: cliAtivo?.nomeFantasia || nomeAmigavel,
          razaoSocial: cliAtivo?.nome || a.clienteNome || '',
          bairro: cliAtivo?.bairro || '',
          filial: cliAtivo?.filial || '',
          totalKg: 0,
          totalVisitas: 0,
          totalAtendimentos: 0
        });
      }

      const reg = agrupamentoMap.get(chaveGrupo);
      const kg = (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
      reg.totalKg += kg;
      reg.totalVisitas++;
      reg.totalAtendimentos++;
    });

    return Array.from(agrupamentoMap.values())
      .sort((a, b) => (b.totalKg - a.totalKg) || (b.totalVisitas - a.totalVisitas));
  }
};

if (typeof window !== 'undefined') {
  window.BiaActions = BiaActions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiaActions;
}
