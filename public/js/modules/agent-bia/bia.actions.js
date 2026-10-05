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
   * AÇÃO: Criar Escala Seguindo Padrão Anterior / Habitual
   * Analisa a rotina habitual da equipe (cronogramas e atividades)
   * e replica rigorosamente o padrão de atendimento por dia da semana sem alocações aleatórias ou conflitos de loja.
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

    // 2. Unificar histórico de Cronograma e Atividades (utiliza todas as escalas e atendimentos válidos)
    const cronoFiltrado = (cronogramaHistorico || []).filter(c => c && c.data);
    const ativFiltradas = (atividades || []).filter(a => a && a.data);

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
      return this.criarEscalaAltaPerformance(ctx, options);
    }

    // 3. Resolução inteligente de entidades (Entity Resolution) rigorosa para evitar matches falsos
    const historicoNormalizado = [];
    const mapaClientesHistorico = {};
    historicoBruto.forEach(r => {
      // Padeiro: correspondência por ID exato, código técnico, ou nome normalizado rigoroso
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

      // Cliente: correspondência por ID ou similaridade
      let cAtivo = (clientesAtivos || []).find(c => c.id === r.clienteId);
      if (!cAtivo && r.clienteNome) {
        const rCliNorm = this.normalizeStr(r.clienteNome);
        cAtivo = (clientesAtivos || []).find(c => {
          const cNomeNorm = this.normalizeStr(c.nome);
          const cFantNorm = this.normalizeStr(c.nomeFantasia);
          return (cNomeNorm && cNomeNorm === rCliNorm) || (cFantNorm && cFantNorm === rCliNorm);
        });
        if (!cAtivo) {
          // Só associa se houver correspondência exata de todos os tokens distintivos (sem falsos positivos)
          const stopWords = ['panificadora', 'padaria', 'supermercado', 'mercado', 'ltda', 'comercio', 'de', 'da', 'do', 'dos', 'das', 'e'];
          const rCliTokens = rCliNorm.split(/[\s\-\/\(\)]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
          if (rCliTokens.length > 0) {
            let melhor = null;
            for (const cli of (clientesAtivos || [])) {
              const cNome = (this.normalizeStr(cli.nomeFantasia) || this.normalizeStr(cli.nome));
              const cTokens = cNome.split(/[\s\-\/\(\)]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
              // Todos os tokens distintivos devem bater bilateralmente
              const allMatch = rCliTokens.length > 0 && cTokens.length > 0 &&
                rCliTokens.every(t => cTokens.includes(t)) &&
                cTokens.every(t => rCliTokens.includes(t));
              if (allMatch) {
                melhor = cli;
                break;
              }
            }
            if (melhor) {
              cAtivo = melhor;
            }
          }
        }
        if (!cAtivo && r.clienteNome && r.clienteNome.trim().length > 1) {
          cAtivo = {
            id: r.clienteId || ('cli-hist-' + rCliNorm.replace(/[^a-z0-9]/g, '_')),
            nome: r.clienteNome,
            nomeFantasia: r.clienteNome
          };
        }
      }

      if (pAtivo && cAtivo) {
        mapaClientesHistorico[cAtivo.id] = cAtivo;
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

    // 4. Montar frequência habitual por dia da semana e geral
    const freqPorDia = {};
    const freqGeral = {};
    const diasAtivosPadeiro = {};

    historicoNormalizado.forEach(r => {
      const dataObj = new Date(r.data + 'T00:00:00');
      const dayOfWeek = dataObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sab
      if (dayOfWeek < 1 || dayOfWeek > 6) return;

      if (!freqPorDia[r.padeiroId]) freqPorDia[r.padeiroId] = {};
      if (!freqPorDia[r.padeiroId][dayOfWeek]) freqPorDia[r.padeiroId][dayOfWeek] = {};
      if (!freqPorDia[r.padeiroId][dayOfWeek][r.clienteId]) {
        freqPorDia[r.padeiroId][dayOfWeek][r.clienteId] = { count: 0, maxData: r.data };
      }
      freqPorDia[r.padeiroId][dayOfWeek][r.clienteId].count++;
      if (r.data > freqPorDia[r.padeiroId][dayOfWeek][r.clienteId].maxData) {
        freqPorDia[r.padeiroId][dayOfWeek][r.clienteId].maxData = r.data;
      }

      if (!freqGeral[r.padeiroId]) freqGeral[r.padeiroId] = {};
      if (!freqGeral[r.padeiroId][r.clienteId]) {
        freqGeral[r.padeiroId][r.clienteId] = { count: 0, maxData: r.data };
      }
      freqGeral[r.padeiroId][r.clienteId].count++;
      if (r.data > freqGeral[r.padeiroId][r.clienteId].maxData) {
        freqGeral[r.padeiroId][r.clienteId].maxData = r.data;
      }

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
          descricao: `O padeiro ${padeiroAlvo.nome} ainda não possui histórico suficiente de atendimentos anteriores para gerar uma escala habitual.`,
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
        descricao: 'Não foram encontrados registros habituais suficientes para gerar a escala da equipe.',
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
      const dayOfWeek = diaIdx + 1;

      for (const padeiro of padeirosParaEscalar) {
        const tarefaExistente = mapaTarefasExistentes.get(`${dateStr}_${padeiro.id}`);

        let targetClienteId = null;
        let countVisitas = 0;

        // A. Procurar o cliente mais frequente do padeiro neste dia específico da semana (priorizando recência da escala)
        const clientesNoDia = freqPorDia[padeiro.id]?.[dayOfWeek];
        if (clientesNoDia) {
          const ordenados = Object.entries(clientesNoDia).sort((a, b) => {
            if (b[1].maxData !== a[1].maxData) {
              return b[1].maxData.localeCompare(a[1].maxData);
            }
            return b[1].count - a[1].count;
          });
          if (ordenados.length > 0) {
            targetClienteId = ordenados[0][0];
            countVisitas = ordenados[0][1].count;
          }
        }

        // B. Se não há registro para o dia específico, mas o padeiro trabalha a semana inteira (>= 5 dias):
        // aloca seu cliente de maior frequência habitual semanal
        if (!targetClienteId && (diasAtivosPadeiro[padeiro.id]?.size >= 5 || (padeiroAlvo && diasAtivosPadeiro[padeiro.id]?.size >= 4))) {
          const geralOrdenados = Object.entries(freqGeral[padeiro.id] || {}).sort((a, b) => {
            if (b[1].maxData !== a[1].maxData) {
              return b[1].maxData.localeCompare(a[1].maxData);
            }
            return b[1].count - a[1].count;
          });
          if (geralOrdenados.length > 0) {
            targetClienteId = geralOrdenados[0][0];
            countVisitas = geralOrdenados[0][1].count;
          }
        }

        if (targetClienteId) {
          const clienteObj = (clientesAtivos || []).find(c => c.id === targetClienteId) || mapaClientesHistorico[targetClienteId];
          if (clienteObj) {
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
                  : `Escala Padrão Habitual (Bia IA) - Histórico: ${countVisitas}x visitas no dia/loja`
            });
          }
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
  }
};

if (typeof window !== 'undefined') {
  window.BiaActions = BiaActions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiaActions;
}
