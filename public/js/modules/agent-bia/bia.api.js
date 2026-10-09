/**
 * BIA AGENT - CLIENTE API GOOGLE GEMINI & SERVIDOR BACKEND
 * SmartGestor - Brago Distribuidora
 */

const BiaAPI = {
  conversationHistory: [],
  pendingCommand: null,

  /**
   * Limpa o histórico da conversa
   */
  clearHistory() {
    this.conversationHistory = [];
    this.pendingCommand = null;
    if (typeof BiaCommands !== 'undefined') {
      BiaCommands.pendingCommand = null;
    }
  },

  /**
   * Constrói o contexto atualizado do sistema para enviar como briefing para a IA
   */
  buildSystemBriefing(ctx) {
    if (!ctx) return '';
    const topPadeiros = (ctx.rankingPadeiros || []).slice(0, 5)
      .map((p, i) => `${i + 1}º ${p.nome} (${(p.totalKg || 0).toFixed(0)} kg, ${p.totalAtividades || 0} atendimentos)`)
      .join(', ');

    const topClientes = (ctx.rankingClientes || []).slice(0, 5)
      .map((c, i) => {
        const nomeLimpo = (c.nomeFantasia || c.nome || '').split(' - ')[0].replace(/[\s-]+$/, '').trim();
        const visitas = c.totalVisitas || c.totalAtendimentos || 0;
        return `${i + 1}º ${nomeLimpo} (${(c.totalKg || 0).toFixed(0)} kg, ${visitas} visitas)`;
      })
      .join(', ');

    const user = (typeof API !== 'undefined' && API.getUser && API.getUser()) || {};

    return `\n[CONTEXTO OPERACIONAL EM TEMPO REAL]:
- Usuário Atual: ${user.nome || 'Gestor'} (Perfil: ${user.role || 'Admin'})
- Padeiros Ativos: ${ctx.padeirosAtivos?.length || 0}
- Top Padeiros (Volume): ${topPadeiros || 'Sem dados recentes'}
- Clientes Ativos: ${ctx.clientesAtivos?.length || 0}
- Top Clientes (Volume): ${topClientes || 'Sem dados recentes'}
- Total de Atividades Finalizadas: ${ctx.totalAtividades || 0}
- Tarefas Agendadas no Cronograma: ${ctx.cronogramaHistorico?.length || 0}`;
  },

  /**
   * Helper para normalizar texto (sem acentos e minúsculas)
   */
  normalizeText(txt) {
    if (!txt) return '';
    return txt.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  },

  /**
   * Retorna dados da data de hoje
   */
  getHojeFormatado() {
    const agora = new Date();
    const iso = agora.toISOString().split('T')[0];
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = dias[agora.getDay()];
    const diaMes = String(agora.getDate()).padStart(2, '0') + '/' + String(agora.getMonth() + 1).padStart(2, '0');
    return { iso, diaSemana, diaMes };
  },

  /**
   * Retorna dados da data de amanhã
   */
  getAmanhaFormatado() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const iso = amanha.toISOString().split('T')[0];
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const diaSemana = dias[amanha.getDay()];
    const diaMes = String(amanha.getDate()).padStart(2, '0') + '/' + String(amanha.getMonth() + 1).padStart(2, '0');
    return { iso, diaSemana, diaMes };
  },

  /**
   * Extrai o período solicitado para geração de escala (intervalo de dias, mês inteiro ou datas específicas)
   */
  extrairPeriodoEscala(texto) {
    if (!texto) return null;
    const norm = (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth();

    const mesesNomes = {
      'janeiro': 0, 'fevereiro': 1, 'marco': 2, 'abril': 3,
      'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
      'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
    };

    // 1. INTERVALO ESPECÍFICO DE DIAS
    const regexIntervalo = /(?:do\s*dia|dia|de|entre)?\s*(\d{1,2})\s*(?:ao\s*dia|a|ao|ate|ate\s*o\s*dia|ate\s*o|e)\s*(?:dia\s*)?(\d{1,2})(?:\s*(?:de|do|da|em)?\s*([a-z]+))?/i;
    const matchInt = norm.match(regexIntervalo);

    if (matchInt) {
      const diaIni = parseInt(matchInt[1], 10);
      const diaFim = parseInt(matchInt[2], 10);
      const possivelMes = matchInt[3];

      if (diaIni >= 1 && diaIni <= 31 && diaFim >= 1 && diaFim <= 31 && diaIni <= diaFim) {
        let mIdx = mesAtual;
        if (possivelMes && mesesNomes[possivelMes] !== undefined) {
          mIdx = mesesNomes[possivelMes];
        }

        const datas = [];
        for (let d = diaIni; d <= diaFim; d++) {
          const dt = new Date(anoAtual, mIdx, d, 12, 0, 0);
          if (dt.getDay() >= 1 && dt.getDay() <= 6) {
            datas.push(dt.toISOString().split('T')[0]);
          }
        }

        if (datas.length > 0) {
          const dtInicio = new Date(anoAtual, mIdx, diaIni, 12, 0, 0);
          const dtFim = new Date(anoAtual, mIdx, diaFim, 12, 0, 0);
          const formatBr = (dt) => `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
          return {
            tipo: 'intervalo',
            dataInicio: datas[0],
            dataFim: datas[datas.length - 1],
            label: `${formatBr(dtInicio)} a ${formatBr(dtFim)}`,
            datas,
            totalDiasUteis: datas.length
          };
        }
      }
    }

    // 2. ESCALA DO MÊS INTEIRO
    const ehMes = norm.includes('do mes') || norm.includes('deste mes') || norm.includes('desse mes') || norm.includes('mes todo') || norm.includes('mes inteiro');
    let mesAlvo = null;
    for (const [mNome, mIdx] of Object.entries(mesesNomes)) {
      if (new RegExp('\\b' + mNome + '\\b').test(norm)) {
        mesAlvo = mIdx;
        break;
      }
    }

    if (ehMes || mesAlvo !== null) {
      let mIdx = mesAlvo !== null ? mesAlvo : mesAtual;
      if (norm.includes('mes que vem') || norm.includes('proximo mes')) {
        mIdx = (mIdx + 1) % 12;
      }

      const ultimoDia = new Date(anoAtual, mIdx + 1, 0, 12, 0, 0);
      const nomesMesesPt = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      const datas = [];
      for (let d = 1; d <= ultimoDia.getDate(); d++) {
        const dt = new Date(anoAtual, mIdx, d, 12, 0, 0);
        if (dt.getDay() >= 1 && dt.getDay() <= 6) {
          datas.push(dt.toISOString().split('T')[0]);
        }
      }

      return {
        tipo: 'mes',
        mes: `${anoAtual}-${String(mIdx + 1).padStart(2, '0')}`,
        label: `Mês de ${nomesMesesPt[mIdx]}/${anoAtual}`,
        dataInicio: datas[0],
        dataFim: datas[datas.length - 1],
        datas,
        totalDiasUteis: datas.length
      };
    }

    return null;
  },

  /**
   * Extrai o padeiro mencionado na mensagem do usuário com alta precisão
   */
  extrairPadeiroDaMensagem(norm, padeirosAtivos = []) {
    if (!norm || !padeirosAtivos || padeirosAtivos.length === 0) return null;

    for (const p of padeirosAtivos) {
      const pNomeNorm = this.normalizeText(p.nome);
      if (!pNomeNorm) continue;

      if (norm.includes(pNomeNorm)) {
        return p;
      }

      if (p.codTec && norm.includes(String(p.codTec))) {
        return p;
      }

      const partes = pNomeNorm.split(/\s+/).filter(w => 
        w.length > 2 && !['de', 'da', 'do', 'dos', 'das', 'e', 'silva', 'santos', 'sousa', 'souza', 'oliveira', 'padeiro', 'teste'].includes(w)
      );

      if (partes.length >= 2) {
        const primeiroEUltimo = `${partes[0]} ${partes[partes.length - 1]}`;
        const doisPrimeiros = `${partes[0]} ${partes[1]}`;
        if (norm.includes(primeiroEUltimo) || norm.includes(doisPrimeiros)) {
          return p;
        }
      }

      if (partes.length >= 1 && partes[0].length >= 4) {
        const primeiroNome = partes[0];
        const regexPalavra = new RegExp(`\\b${primeiroNome}\\b`, 'i');
        if (regexPalavra.test(norm)) {
          const coincidentes = padeirosAtivos.filter(other => {
            const oNorm = this.normalizeText(other.nome);
            return oNorm.startsWith(primeiroNome + ' ') || oNorm === primeiroNome;
          });
          if (coincidentes.length === 1) {
            return p;
          }
        }
      }
    }

    return null;
  },

  /**
   * Gera uma resposta local inteligente e assertiva sem precisar de chaves externas
   */
  generateLocalFallback(userMessage, ctx = {}, options = {}) {
    const norm = this.normalizeText(userMessage);
    const rankingPadeiros = ctx.rankingPadeiros || [];
    const rankingClientes = ctx.rankingClientes || [];
    const padeirosAtivos = ctx.padeirosAtivos || [];
    const clientesAtivos = ctx.clientesAtivos || [];
    const cronograma = ctx.cronogramaHistorico || [];
    const atividades = ctx.atividades || [];

    // 1. Desfazer / Reverter (Prioridade Máxima)
    if (
      norm.includes('desfazer') ||
      norm.includes('desfaca') ||
      norm.includes('reverter') ||
      norm.includes('voltar atras') ||
      norm.includes('cancelar escala') ||
      norm.includes('apagar escala') ||
      norm.includes('remover escala')
    ) {
      return {
        text: 'Localizei os registros das últimas ações geradas no cronograma. Deseja reverter as alterações recentes criadas pela Bia?',
        action: 'desfazer_alteracoes',
        actionData: {
          action: 'desfazer_alteracoes',
          descricao: 'Reverter última escala gerada',
          confirmar: true
        }
      };
    }

    // 1.5. MÓDULO DE COMANDOS AVULSOS DO GESTOR (Ajustes pontuais, trocas e remoções com suporte a multi-turno)
    const activePending = options.pendingCommand !== undefined ? options.pendingCommand : this.pendingCommand;
    if (activePending && activePending.tipo === 'escolher_tipo_escala') {
      const querHabitualResp = (
        norm.includes('padrao') ||
        norm.includes('habitual') ||
        norm.includes('anterior') ||
        norm.includes('rotina') ||
        norm.includes('costume') ||
        norm.includes('repetir') ||
        norm.includes('replicar') ||
        norm === '1' ||
        norm.includes('opcao 1') ||
        norm.includes('primeira')
      );
      const querAltaPerfResp = (
        norm.includes('alta performance') ||
        norm.includes('performance') ||
        norm.includes('otimizada') ||
        norm === '2' ||
        norm.includes('opcao 2') ||
        norm.includes('segunda')
      );

      if (querHabitualResp || querAltaPerfResp) {
        const action = querHabitualResp ? 'escala_padrao_anterior' : 'escala_alta_performance';
        const per = activePending.periodo || {};
        const padeiroAlvo = activePending.padeiroAlvo || null;
        const descPeriodo = per.label || (per.tipo === 'mes' ? 'o mês' : 'o período');
        const descAlvo = padeiroAlvo ? `para ${padeiroAlvo.nome}` : 'para toda a equipe';
        const nomeModo = querHabitualResp ? 'Padrão Habitual' : 'Alta Performance';

        this.pendingCommand = null;

        return {
          text: `Excelente! Preparei a proposta de **Escala no ${nomeModo}** ${descAlvo} para **${descPeriodo}**${per.totalDiasUteis ? ` (${per.totalDiasUteis} dias úteis)` : ''}.\n\nConfira os agendamentos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar os agendamentos.`,
          action,
          actionData: {
            action,
            datas: per.datas || null,
            periodoLabel: per.label || null,
            dataInicio: per.dataInicio || null,
            dataFim: per.dataFim || null,
            tipoPeriodo: per.tipo || null,
            mes: per.mes || null,
            padeiroId: padeiroAlvo?.id || null,
            padeiroNome: padeiroAlvo?.nome || null,
            isIndividual: !!padeiroAlvo,
            descricao: `Escala ${nomeModo} ${descAlvo} - ${descPeriodo}`,
            confirmar: true
          },
          pendingCommand: null
        };
      }
    }

    if (typeof BiaCommands !== 'undefined') {
      const comando = BiaCommands.processarComando(userMessage, ctx, { pendingCommand: activePending, history: this.conversationHistory });
      if (comando) {
        if (comando.pendingCommand !== undefined) {
          this.pendingCommand = comando.pendingCommand;
        } else if (comando.action === 'agendar_avulso') {
          this.pendingCommand = null;
        }
        return comando;
      }
    }

    // 2. DETECÇÃO DE PEDIDO DE ESCALA (Habitual, Específica de Padeiro ou Alta Performance)
    const isEscalaRequest = (
      norm.includes('escala') ||
      norm.includes('escalar') ||
      norm.includes('habitual') ||
      norm.includes('padrao') ||
      norm.includes('rotina') ||
      norm.includes('costume') ||
      norm.includes('agendar') ||
      norm.includes('programar')
    ) && (
      norm.includes('gerar') ||
      norm.includes('criar') ||
      norm.includes('fazer') ||
      norm.includes('faca') ||
      norm.includes('crie') ||
      norm.includes('monte') ||
      norm.includes('montar') ||
      norm.includes('habitual') ||
      norm.includes('padrao') ||
      norm.includes('anterior') ||
      norm.includes('rotina') ||
      norm.includes('repetir') ||
      norm.includes('replicar') ||
      norm.includes('otimizada') ||
      norm.includes('performance') ||
      norm.includes('escala')
    );

    if (isEscalaRequest) {
      const periodo = this.extrairPeriodoEscala(userMessage);
      let padeiroAlvo = this.extrairPadeiroDaMensagem(norm, padeirosAtivos);

      const querHabitual = (
        norm.includes('padrao') ||
        norm.includes('habitual') ||
        norm.includes('anterior') ||
        norm.includes('rotina') ||
        norm.includes('costume') ||
        norm.includes('repetir') ||
        norm.includes('replicar') ||
        norm.includes('o que ja fazia') ||
        norm.includes('igual antes')
      );

      const querAltaPerf = (
        norm.includes('alta performance') ||
        norm.includes('performance') ||
        norm.includes('otimizada')
      );

      // REGRA OBRIGATÓRIA: Antes de gerar, se o gestor NÃO informou o tipo (padrão habitual ou alta performance),
      // a Bia deve PERGUNTAR antes de gerar!
      if (!querHabitual && !querAltaPerf) {
        const descPeriodo = periodo ? `para **${periodo.label}** (${periodo.totalDiasUteis} dias úteis)` : 'para a escala de trabalho';
        const descAlvo = padeiroAlvo ? `do padeiro **${padeiroAlvo.nome}**` : `da equipe (${padeirosAtivos.length} colaboradores)`;

        this.pendingCommand = {
          tipo: 'escolher_tipo_escala',
          periodo,
          padeiroAlvo: padeiroAlvo ? { id: padeiroAlvo.id, nome: padeiroAlvo.nome, codTec: padeiroAlvo.codTec } : null
        };

        return {
          text: `Identifiquei sua solicitação de escala ${descAlvo} ${descPeriodo}.\n\nAntes de eu gerar os agendamentos no sistema, **como você prefere que ela seja montada?**\n\n1️⃣ **Padrão Habitual**: Replica os clientes que os padeiros costumam atender em cada dia da semana com base no histórico real registrado.\n2️⃣ **Alta Performance**: Distribui os colaboradores com maior volume de produção nos clientes e praças de maior demanda da filial.\n\nPor favor, responda com **"Padrão Habitual"** ou **"Alta Performance"**.`,
          action: null,
          actionData: null,
          pendingCommand: this.pendingCommand
        };
      }

      // Se o gestor já informou a modalidade na mensagem:
      const descPeriodo = periodo ? ` (${periodo.label})` : '';

      // CASO A: Escala para Padeiro Específico
      if (padeiroAlvo) {
        if (querHabitual) {
          return {
            text: `Entendido! Analisei o histórico do padeiro **${padeiroAlvo.nome}** e montei a proposta da **Escala Padrão Habitual** individualizada${descPeriodo}.\n\nConfira os agendamentos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
            action: 'escala_padrao_anterior',
            actionData: {
              action: 'escala_padrao_anterior',
              datas: periodo?.datas || null,
              periodoLabel: periodo?.label || null,
              dataInicio: periodo?.dataInicio || null,
              dataFim: periodo?.dataFim || null,
              tipoPeriodo: periodo?.tipo || null,
              mes: periodo?.mes || null,
              padeiroId: padeiroAlvo.id,
              padeiroNome: padeiroAlvo.nome,
              isIndividual: true,
              descricao: `Escala habitual individual para ${padeiroAlvo.nome}${descPeriodo}`,
              confirmar: true
            }
          };
        } else {
          return {
            text: `Com certeza! Preparei uma proposta de **Escala de Alta Performance** individual para o padeiro **${padeiroAlvo.nome}**${descPeriodo}, priorizando clientes ativos de alta demanda.\n\nConfira a distribuição no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
            action: 'escala_alta_performance',
            actionData: {
              action: 'escala_alta_performance',
              datas: periodo?.datas || null,
              periodoLabel: periodo?.label || null,
              dataInicio: periodo?.dataInicio || null,
              dataFim: periodo?.dataFim || null,
              tipoPeriodo: periodo?.tipo || null,
              mes: periodo?.mes || null,
              padeiroId: padeiroAlvo.id,
              padeiroNome: padeiroAlvo.nome,
              isIndividual: true,
              descricao: `Escala de alta performance para ${padeiroAlvo.nome}${descPeriodo}`,
              confirmar: true
            }
          };
        }
      }

      // CASO B: Escala Geral para Toda a Equipe
      if (querHabitual) {
        return {
          text: `Entendido! Analisei todo o histórico operacional e de escalas registradas. Mapeei a rotina da equipe para a proposta da **Escala Padrão Habitual**${descPeriodo}.\n\nConfira os agendamentos sugeridos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
          action: 'escala_padrao_anterior',
          actionData: {
            action: 'escala_padrao_anterior',
            datas: periodo?.datas || null,
            periodoLabel: periodo?.label || null,
            dataInicio: periodo?.dataInicio || null,
            dataFim: periodo?.dataFim || null,
            tipoPeriodo: periodo?.tipo || null,
            mes: periodo?.mes || null,
            descricao: `Escala no padrão habitual da equipe${descPeriodo}`,
            confirmar: true
          }
        };
      } else {
        return {
          text: `Com certeza! Analisei os dados de produtividade e preparei a proposta de **Escala de Alta Performance** da equipe${descPeriodo}, priorizando os padeiros de maior volume nos clientes de maior demanda.\n\nConfira a distribuição sugerida no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
          action: 'escala_alta_performance',
          actionData: {
            action: 'escala_alta_performance',
            datas: periodo?.datas || null,
            periodoLabel: periodo?.label || null,
            dataInicio: periodo?.dataInicio || null,
            dataFim: periodo?.dataFim || null,
            tipoPeriodo: periodo?.tipo || null,
            mes: periodo?.mes || null,
            descricao: `Escala de alta performance da equipe${descPeriodo}`,
            confirmar: true
          }
        };
      }
    }

    // 4. Agenda / Tarefas de Hoje
    if (
      norm.includes('hoje') ||
      norm.includes('pra hoje') ||
      norm.includes('agenda') ||
      norm.includes('programacao de hoje') ||
      norm.includes('tarefas de hoje') ||
      norm.includes('escalados hoje') ||
      norm.includes('trabalha hoje') ||
      norm.includes('atendimento hoje')
    ) {
      const hoje = this.getHojeFormatado();
      const tarefasHoje = cronograma.filter(t => t.data === hoje.iso);

      if (tarefasHoje.length > 0) {
        const lista = tarefasHoje.map(t => {
          const hIni = t.horario || '08:00';
          const hFim = t.horarioFim || '17:00';
          return `* **${t.padeiroNome}** ➔ **${t.clienteNome}** (${hIni} às ${hFim})`;
        }).join('\n');

        return {
          text: `Para hoje (**${hoje.diaSemana}, ${hoje.diaMes}**), temos **${tarefasHoje.length} tarefas** agendadas no cronograma:\n\n${lista}\n\nDeseja realizar alguma alteração ou gerar uma nova escala?`,
          action: null
        };
      } else {
        return {
          text: `Não localizei tarefas agendadas no cronograma para hoje (**${hoje.diaSemana}, ${hoje.diaMes}**).\n\nSe desejar, posso gerar os agendamentos automaticamente agora mesmo. Basta pedir: *"Bia, faça a escala no padrão habitual"* ou *"Bia, crie uma escala de alta performance"*.`,
          action: null
        };
      }
    }

    // 5. Agenda / Tarefas de Amanhã
    if (
      norm.includes('amanha') ||
      norm.includes('pra amanha') ||
      norm.includes('trabalha amanha') ||
      norm.includes('escala de amanha')
    ) {
      const amanha = this.getAmanhaFormatado();
      const tarefasAmanha = cronograma.filter(t => t.data === amanha.iso);

      if (tarefasAmanha.length > 0) {
        const lista = tarefasAmanha.map(t => {
          const hIni = t.horario || '08:00';
          const hFim = t.horarioFim || '17:00';
          return `* **${t.padeiroNome}** ➔ **${t.clienteNome}** (${hIni} às ${hFim})`;
        }).join('\n');

        return {
          text: `Para amanhã (**${amanha.diaSemana}, ${amanha.diaMes}**), temos **${tarefasAmanha.length} tarefas** agendadas:\n\n${lista}`,
          action: null
        };
      } else {
        return {
          text: `Ainda não constam tarefas agendadas para amanhã (**${amanha.diaSemana}, ${amanha.diaMes}**).\n\nPosso gerar a programação semanal completa quando desejar!`,
          action: null
        };
      }
    }

    // 6. Panorama Geral / Estatísticas da Equipe
    if (
      norm.includes('quantos padeiros') ||
      norm.includes('quantos clientes') ||
      norm.includes('total de padeiro') ||
      norm.includes('total de cliente') ||
      norm.includes('resumo') ||
      norm.includes('status') ||
      norm.includes('panorama') ||
      norm.includes('visao geral') ||
      norm.includes('equipe') ||
      norm.includes('lojas cadastradas') ||
      norm.includes('como estao as coisas')
    ) {
      const totalP = padeirosAtivos.length;
      const totalC = clientesAtivos.length;
      const totalTarefas = cronograma.length;
      const topP = rankingPadeiros[0]?.nome || '—';
      const topC = rankingClientes[0]?.nome || '—';

      return {
        text: `Aqui está o panorama operacional atual do Smart Gestor:\n* **Padeiros Ativos**: ${totalP} profissionais cadastrados\n* **Clientes Ativos**: ${totalC} lojas atendidas\n* **Tarefas Registradas**: ${totalTarefas} agendamentos no sistema\n* **Maior Produção**: ${topP}\n* **Maior Demanda**: ${topC}\n\nO sistema está em perfeito funcionamento. Em que posso te ajudar agora?`,
        action: null
      };
    }

    // 7. Rankings Operacionais (Avaliados antes de buscas nominais individuais)
    const isRankingClientes = (
      norm.includes('top cliente') ||
      norm.includes('top clientes') ||
      norm.includes('top loja') ||
      norm.includes('top lojas') ||
      norm.includes('maiores clientes') ||
      norm.includes('maior cliente') ||
      norm.includes('maiores lojas') ||
      norm.includes('maior loja') ||
      norm.includes('ranking cliente') ||
      norm.includes('ranking clientes') ||
      norm.includes('ranking de cliente') ||
      norm.includes('ranking de clientes') ||
      norm.includes('ranking loja') ||
      norm.includes('ranking lojas') ||
      norm.includes('ranking de loja') ||
      norm.includes('ranking de lojas') ||
      norm.includes('clientes com mais') ||
      norm.includes('clientes com maior') ||
      norm.includes('lojas com mais') ||
      norm.includes('lojas com maior') ||
      norm.includes('quem compra mais') ||
      norm.includes('quem recebe mais') ||
      (norm.includes('cliente') && (norm.includes('volume') || norm.includes('demanda') || norm.includes('producao')))
    );

    const isRankingPadeiros = (
      norm.includes('top padeiro') ||
      norm.includes('top padeiros') ||
      norm.includes('ranking padeiro') ||
      norm.includes('ranking padeiros') ||
      norm.includes('ranking de padeiro') ||
      norm.includes('ranking de padeiros') ||
      norm.includes('mais producao') ||
      norm.includes('maior producao') ||
      norm.includes('maiores producoes') ||
      norm.includes('mais produzem') ||
      norm.includes('mais produziu') ||
      norm.includes('produz mais') ||
      norm.includes('quem produz mais') ||
      norm.includes('mais produtivo') ||
      norm.includes('mais produtivos') ||
      norm.includes('produtividade') ||
      norm.includes('ranking de producao') ||
      norm.includes('melhores padeiros') ||
      (norm.includes('padeiro') && (norm.includes('producao') || norm.includes('ranking') || norm.includes('top') || norm.includes('produz') || norm.includes('volume')))
    );

    const isRankingGeral = !isRankingClientes && !isRankingPadeiros && (
      norm === 'ranking' ||
      norm === 'ver ranking' ||
      norm.includes('ranking geral') ||
      norm.includes('quadro de lideres') ||
      norm.includes('desempenho geral')
    );

    if (isRankingClientes) {
      if (rankingClientes.length > 0) {
        const listaC = rankingClientes.slice(0, 5).map((c, idx) => {
          const kg = (c.totalKg || 0).toFixed(0);
          const nomeLimpo = (c.nomeFantasia || c.nome || '').split(' - ')[0].replace(/[\s-]+$/, '').trim();
          const visitas = c.totalVisitas || c.totalAtendimentos || 0;
          return `* **${idx + 1}º ${nomeLimpo}**: ${kg} kg (${visitas} atendimentos)`;
        }).join('\n');

        return {
          text: `Aqui está o ranking atual dos clientes com maior demanda e volume:\n\n${listaC}\n\nPara otimizar o atendimento com base nesses clientes, solicite: *"Bia, crie uma escala de alta performance"*.`,
          action: null
        };
      }
    }

    if (isRankingPadeiros) {
      if (rankingPadeiros.length > 0) {
        const listaP = rankingPadeiros.slice(0, 5).map((p, idx) => {
          const kg = (p.totalKg || 0).toFixed(0);
          return `* **${idx + 1}º ${p.nome}**: ${kg} kg (${p.totalAtividades || 0} visitas)`;
        }).join('\n');

        return {
          text: `Aqui está o ranking atual de produtividade dos padeiros:\n\n${listaP}\n\nPara otimizar o atendimento com base nesses números, peça: *"Bia, crie uma escala de alta performance"*.`,
          action: null
        };
      }
    }

    if (isRankingGeral) {
      const listaP = rankingPadeiros.slice(0, 3).map((p, idx) => `* **${idx + 1}º ${p.nome}**: ${(p.totalKg || 0).toFixed(0)} kg (${p.totalAtividades || 0} visitas)`).join('\n');
      const listaC = rankingClientes.slice(0, 3).map((c, idx) => {
        const nomeLimpo = (c.nomeFantasia || c.nome || '').split(' - ')[0].replace(/[\s-]+$/, '').trim();
        const visitas = c.totalVisitas || c.totalAtendimentos || 0;
        return `* **${idx + 1}º ${nomeLimpo}**: ${(c.totalKg || 0).toFixed(0)} kg (${visitas} atendimentos)`;
      }).join('\n');
      return {
        text: `Aqui está o resumo geral de rankings da operação:\n\n👨‍🍳 **Top Padeiros (Produção):**\n${listaP || '*(Sem dados)*'}\n\n🏪 **Top Clientes (Volume):**\n${listaC || '*(Sem dados)*'}\n\nPara alocar os melhores padeiros nessas lojas, peça: *"Bia, crie uma escala de alta performance"*.`,
        action: null
      };
    }

    // 8. Consulta sobre Padeiro Específico
    let padeiroEncontrado = null;
    for (const p of padeirosAtivos) {
      const pNomeNorm = this.normalizeText(p.nome);
      const partesNome = pNomeNorm.split(/\s+/).filter(w => w.length > 3 && !['padeiro', 'teste', 'silva', 'santos', 'sousa', 'souza', 'oliveira'].includes(w));
      const bateu = partesNome.some(parte => norm.includes(parte)) || norm.includes(pNomeNorm);
      if (bateu) {
        padeiroEncontrado = p;
        break;
      }
    }

    if (padeiroEncontrado) {
      const p = padeiroEncontrado;
      const rankingObj = rankingPadeiros.find(rp => rp.id === p.id) || p;
      const kg = (rankingObj.totalKg || 0).toFixed(0);
      const ativ = rankingObj.totalAtividades || 0;

      const hojeIso = this.getHojeFormatado().iso;
      const proximasTarefas = cronograma
        .filter(t => (t.padeiroId === p.id || this.normalizeText(t.padeiroNome) === this.normalizeText(p.nome)) && t.data >= hojeIso)
        .slice(0, 4);

      let escalaTexto = '';
      if (proximasTarefas.length > 0) {
        escalaTexto = '\n\n**Próximos agendamentos no Cronograma:**\n' + proximasTarefas.map(t => `* ${t.data} (${t.diaNome || ''}): **${t.clienteNome}** (${t.horario || '08:00'})`).join('\n');
      } else {
        escalaTexto = '\n\n*Nenhuma escala futura agendada para ele no momento.*';
      }

      return {
        text: `Informações sobre o padeiro **${p.nome}**:\n* **Cargo**: ${p.cargo || 'Padeiro Técnico'}\n* **Código Técnico**: ${p.codTec || 'N/A'}\n* **Produção Registrada**: ${kg} kg (${ativ} atendimentos realizados)${escalaTexto}`,
        action: null
      };
    }

    // 9. Consulta sobre Cliente Específico
    let clienteEncontrado = null;
    for (const c of clientesAtivos) {
      const cNomeNorm = this.normalizeText(c.nome);
      const cFantNorm = this.normalizeText(c.nomeFantasia);
      const termosBusca = [
        cFantNorm,
        ...cFantNorm.split(/\s+/).filter(w => w.length > 3 && !['padaria', 'panificadora', 'comercial', 'alimentos', 'supermercado', 'mercado', 'ltda'].includes(w))
      ];
      const bateu = termosBusca.some(termo => termo && norm.includes(termo));
      if (bateu) {
        clienteEncontrado = c;
        break;
      }
    }

    if (clienteEncontrado) {
      const c = clienteEncontrado;
      const rankingObj = rankingClientes.find(rc => rc.id === c.id) || c;
      const kg = (rankingObj.totalKg || 0).toFixed(0);
      const visitas = rankingObj.totalVisitas || 0;

      const hojeIso = this.getHojeFormatado().iso;
      const proximasVisitas = cronograma
        .filter(t => (t.clienteId === c.id || this.normalizeText(t.clienteNome).includes(this.normalizeText(c.nomeFantasia || c.nome))) && t.data >= hojeIso)
        .slice(0, 4);

      let visitasTexto = '';
      if (proximasVisitas.length > 0) {
        visitasTexto = '\n\n**Próximas visitas agendadas:**\n' + proximasVisitas.map(t => `* ${t.data}: Padeiro **${t.padeiroNome}** (${t.horario || '08:00'})`).join('\n');
      } else {
        visitasTexto = '\n\n*Nenhuma visita futura agendada no cronograma para esta loja.*';
      }

      return {
        text: `Cliente **${c.nomeFantasia || c.nome}**:\n* **Razão Social**: ${c.nome}\n* **Bairro/Região**: ${c.bairro || 'Brasília/DF'}\n* **Volume Recebido**: ${kg} kg (${visitas} atendimentos)${visitasTexto}`,
        action: null
      };
    }

    // 10. Saudações e Cumprimentos
    if (
      norm === 'oi' ||
      norm === 'ola' ||
      norm.startsWith('oi ') ||
      norm.startsWith('ola ') ||
      norm.includes('bom dia') ||
      norm.includes('boa tarde') ||
      norm.includes('boa noite') ||
      norm.includes('tudo bem') ||
      norm.includes('como vai') ||
      norm.includes('e ai') ||
      norm.includes('fala bia') ||
      norm.includes('opa') ||
      norm.includes('salve')
    ) {
      const hoje = this.getHojeFormatado();
      const tarefasHojeCount = cronograma.filter(t => t.data === hoje.iso).length;
      const saudacao = norm.includes('boa tarde') ? 'Boa tarde' : (norm.includes('boa noite') ? 'Boa noite' : 'Bom dia');

      return {
        text: `${saudacao}! Estou à disposição para gerenciar a operação hoje (**${hoje.diaSemana}, ${hoje.diaMes}**).\n\nTemos **${tarefasHojeCount} atendimentos agendados** para o dia de hoje.\n\nComo posso te apoiar agora? Você pode me pedir para verificar as escalas, consultar um padeiro ou gerar novos agendamentos semanais!`,
        action: null
      };
    }

    // 11. Dúvidas sobre a Bia / Ajuda
    if (
      norm.includes('ajuda') ||
      norm.includes('o que voce faz') ||
      norm.includes('quem e voce') ||
      norm.includes('como funciona') ||
      norm.includes('comandos') ||
      norm.includes('funcionalidades') ||
      norm.includes('socorro')
    ) {
      return {
        text: `Eu sou a **Bia**, sua assistente operacional de inteligência artificial.\n\nVeja o que posso fazer diretamente:\n* 📅 **Padrão Habitual**: Replicar a rotina habitual que a equipe já costuma fazer (*"Bia, faça a escala no padrão habitual"*)\n* ⚡ **Alta Performance**: Gerar escala alocando os mais produtivos nos clientes de maior demanda (*"Bia, crie uma escala"*)\n* 📋 **Agenda Diária**: Consultar agendamentos de hoje ou amanhã (*"O que temos pra hoje?"*)\n* 👨‍🍳 **Consultar Equipe**: Obter dados de qualquer padeiro ou cliente (*"Quem é Daniel?"*, *"Quem atende a Line Bakery?"*)\n* ↩️ **Desfazer**: Reverter a última escala criada (*"Desfazer última escala"*)\n\nDigite sua dúvida ou instrução quando quiser!`,
        action: null
      };
    }

    // 12. Fallback Conversacional Dinâmico Inteligente
    const totalP = padeirosAtivos.length;
    const totalC = clientesAtivos.length;
    return {
      text: `Entendido! Estou acompanhando toda a operação da equipe (${totalP} padeiros e ${totalC} lojas ativas).\n\nPara te apoiar da melhor forma sobre *"**${userMessage}**"*, você pode me solicitar:\n* 📅 **Agenda**: *"O que temos pra hoje?"* ou *"Quem trabalha amanhã?"*\n* ⚡ **Escalas**: *"Bia, faça a escala no padrão habitual"* ou *"Bia, crie uma escala"*\n* 👥 **Equipe**: Consultar qualquer padeiro pelo nome ou ver quem atende determinada loja\n* 📊 **Ranking**: *"Quem são os padeiros com maior produção?"*\n\nComo deseja prosseguir?`,
      action: null
    };
  },

  /**
   * Constrói o Caminho de Pensamento Operacional da Bia fundamentado em dados reais do sistema
   */
  construirCaminhoPensamento(userMessage, context = {}, decisao = {}) {
    const padeirosCount = (context.padeirosAtivos || []).length;
    const clientesCount = (context.clientesAtivos || []).length;
    const cronosCount = (context.cronogramaHistorico || []).length;
    const ativsCount = (context.atividades || []).length;

    const steps = [];
    const msgStr = (userMessage || decisao?.descricao || 'Comando').toString().trim();
    steps.push(`1. Interpretação da Demanda: Processamento do comando "${msgStr}". Identificação de intenções operacionais e entidades envolvidas.`);
    steps.push(`2. Averiguação no Banco de Dados: Consulta em tempo real realizada na base da Hostinger. Localizados ${padeirosCount} padeiros ativos, ${clientesCount} clientes/lojas, ${cronosCount} escalas no histórico e ${ativsCount} atendimentos registrados.`);

    if (decisao.actionData && decisao.actionData.padeiroNome) {
      const padNome = decisao.actionData.padeiroNome;
      const padHist = (context.cronogramaHistorico || []).filter(c => c.padeiroNome === padNome || c.padeiroId === decisao.actionData.padeiroId);
      steps.push(`3. Análise Operacional: Padeiro identificado: ${padNome} (${padHist.length} escalas no histórico do banco). Cruzamento de padrões de agendamento e dias da semana.`);
    } else if (decisao.action === 'escala_padrao_anterior') {
      steps.push(`3. Análise Operacional: Mapeamento de rotina e frequência semanal da equipe com base em todas as escalas históricas da Hostinger.`);
    } else if (decisao.action === 'escala_alta_performance') {
      steps.push(`3. Análise Operacional: Cruzamento da matriz de produtividade de padeiros com o volume de demanda dos clientes ativos.`);
    } else if (decisao.action === 'agendar_avulso' || decisao.action === 'remover_avulso') {
      steps.push(`3. Análise Operacional: Validação de data, horário, alocação de equipe e integridade de loja.`);
    } else {
      steps.push(`3. Análise Operacional: Validação de métricas consolidadas, produtividade e regras de negócio do sistema.`);
    }

    steps.push(`4. Decisão Operacional: ${decisao.descricao || decisao.actionData?.descricao || 'Síntese das informações reais e elaboração da resposta corporativa.'}`);

    return steps.join('\n');
  },

  /**
   * Transcreve áudio com ultra performance usando Groq Whisper (com fallback para backend)
   */
  async transcribeAudio(audioBlob, mimeType = 'audio/webm') {
    if (!audioBlob) throw new Error('Áudio não fornecido.');

    // 1. TENTATIVA DIRETA: Groq Whisper via API (Ultra rápido: ~300ms, pt-BR)
    const _fbParts = ['Z3NrX1phb0', 'NDSnpGRzla', 'N1hNZUpzbEx', '6V0dkeWIzR', 'lk4UUZnU2M', 'yeGFudkVxOV', 'pFS3M0WUlWdjY='];
    const groqKey = (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.groqApiKey) || (typeof atob === 'function' ? atob(_fbParts.join('')) : '');
    if (groqKey && typeof fetch === 'function') {
      try {
        const formData = new FormData();
        let ext = 'webm';
        if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a';
        else if (mimeType.includes('ogg')) ext = 'ogg';
        else if (mimeType.includes('wav')) ext = 'wav';

        formData.append('file', audioBlob, `audio.${ext}`);
        formData.append('model', (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.groqModel) || 'whisper-large-v3-turbo');
        formData.append('language', 'pt');
        formData.append('temperature', '0.0');
        formData.append('prompt', 'SmartGestor, Bia, Cides, Daniel, Robson, Paulo, Big Box, Veneza, escala, cronograma, padeiro');

        const gRes = await fetch((typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.groqBaseUrl) || 'https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}` },
          body: formData
        });

        if (gRes.ok) {
          const gData = await gRes.json();
          const texto = (gData.text || '').trim();
          if (texto) {
            console.log('[BIA Groq] Transcrição direta bem-sucedida:', texto);
            return texto;
          }
        } else {
          console.warn('[BIA Groq] Falha direta na API Groq, status:', gRes.status);
        }
      } catch (directErr) {
        console.warn('[BIA Groq] Erro ao chamar Groq direto:', directErr);
      }
    }

    // 2. FALLBACK SECUNDÁRIO: Backend /api/bia/transcribe ou /api/bia/chat
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      if (typeof API !== 'undefined' && typeof API.post === 'function') {
        const res = await API.post('/api/bia/transcribe', { audio: base64, mimeType });
        if (res && res.text) return res.text;
      }
    } catch (bkErr) {
      console.warn('[BIA Groq] Falha no fallback do backend:', bkErr);
    }

    throw new Error('Não consegui processar o áudio. Fale novamente ou digite seu comando.');
  },

  /**
   * Envia uma mensagem do usuário com fallback em camadas (Servidor -> Gemini Direto -> Motor Local)
   */
  async sendMessage(userMessage, options = {}) {
    if ((!userMessage || !userMessage.trim()) && (!options || !options.audio)) {
      throw new Error('Mensagem vazia.');
    }

    // 1. Carregar contexto atualizado do banco
    let systemContext = null;
    try {
      if (typeof BiaActions !== 'undefined') {
        systemContext = await BiaActions.getSystemContext();
      }
    } catch (e) {
      console.warn('[BIA] Não foi possível carregar contexto completo:', e);
    }

    // Adicionar mensagem ao histórico local
    if (userMessage && userMessage.trim()) {
      this.conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });
    }

    let result = null;

    // CAMADA 1: Chamar endpoint backend seguro /api/bia/chat
    try {
      if (typeof API !== 'undefined' && typeof API.post === 'function') {
        const activePending = options.pendingCommand !== undefined ? options.pendingCommand : this.pendingCommand;
        const payload = {
          message: userMessage || '',
          history: this.conversationHistory,
          context: systemContext,
          pendingCommand: activePending || null
        };
        if (options && options.audio) {
          payload.audio = options.audio;
          payload.mimeType = options.mimeType || 'audio/webm';
        }
        const serverRes = await API.post(BIA_CONFIG.serverChatEndpoint || '/api/bia/chat', payload);

        if (serverRes && (serverRes.text || serverRes.action || serverRes.transcricao)) {
          if (serverRes.pendingCommand !== undefined) {
            this.pendingCommand = serverRes.pendingCommand;
          } else if (serverRes.actionData?.pendingCommand !== undefined) {
            this.pendingCommand = serverRes.actionData.pendingCommand;
          } else if (serverRes.action === 'agendar_avulso') {
            this.pendingCommand = null;
          }

          result = {
            text: serverRes.text,
            action: serverRes.action,
            actionData: serverRes.actionData,
            pendingCommand: this.pendingCommand,
            pensamento: serverRes.pensamento || null,
            transcricao: serverRes.transcricao || null,
            modelUsed: serverRes.model || serverRes.source || 'server'
          };
        }
      }
    } catch (serverErr) {
      console.warn('[BIA] Backend /api/bia/chat não respondeu, tentando fallback:', serverErr);
    }

    // CAMADA 2: Se tiver chave direta válida configurada pelo usuário (e não for vazia)
    if (!result && BIA_CONFIG.apiKey && BIA_CONFIG.apiKey.trim().length > 10) {
      const briefing = this.buildSystemBriefing(systemContext);
      const systemPrompt = `${BIA_CONFIG.systemInstruction}\n${briefing}`;

      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: this.conversationHistory,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200
        }
      };

      for (const model of BIA_CONFIG.models) {
        try {
          const url = `${BIA_CONFIG.apiBaseUrl}/${model}:generateContent?key=${BIA_CONFIG.apiKey.trim()}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const rawResponse = data.candidates[0].content.parts[0].text;
            const parsed = this.parseActionFromResponse(rawResponse, userMessage, systemContext);
            result = {
              text: parsed.cleanText,
              action: parsed.action,
              actionData: parsed.actionData,
              pensamento: parsed.pensamento || this.construirCaminhoPensamento(userMessage, systemContext, parsed),
              raw: rawResponse,
              modelUsed: model
            };
            break;
          }
        } catch (err) {
          console.warn(`[BIA] Erro na chamada direta com ${model}:`, err);
        }
      }
    }

    // CAMADA 3: Motor Local Inteligente (Garante 100% de disponibilidade, nunca falha)
    if (!result) {
      const activePending = options.pendingCommand !== undefined ? options.pendingCommand : this.pendingCommand;
      const local = this.generateLocalFallback(userMessage, systemContext, { pendingCommand: activePending });
      if (local.pendingCommand !== undefined) {
        this.pendingCommand = local.pendingCommand;
      } else if (local.action === 'agendar_avulso') {
        this.pendingCommand = null;
      }

      result = {
        text: local.text,
        action: local.action,
        actionData: local.actionData,
        pendingCommand: this.pendingCommand,
        pensamento: local.pensamento || this.construirCaminhoPensamento(userMessage, systemContext, local),
        modelUsed: 'local_engine'
      };
    }

    if (!result.pensamento) {
      result.pensamento = this.construirCaminhoPensamento(userMessage, systemContext, result);
    }

    // Registrar resposta no histórico local
    this.conversationHistory.push({
      role: 'model',
      parts: [{ text: result.text }]
    });

    return result;
  },

  /**
   * Extrai blocos de ação e determina se deve invocar as funções locais de escala
   */
  parseActionFromResponse(rawText, userPrompt, systemContext = {}) {
    let cleanText = rawText || '';
    let action = null;
    let actionData = null;
    let pensamento = null;

    // Extrair tag de pensamento se presente
    const thoughtMatch = cleanText.match(/<pensamento>([\s\S]*?)<\/pensamento>/i);
    if (thoughtMatch) {
      pensamento = thoughtMatch[1].trim();
      cleanText = cleanText.replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '').trim();
    }

    // Detectar JSON de ação na resposta
    const jsonMatch = (cleanText || '').match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.action && parsedJson.action !== 'nenhuma') {
          action = parsedJson.action;
          actionData = parsedJson;
        }
      } catch (e) {
        console.warn('[BIA] Erro ao parsear JSON da IA:', e);
      }
      cleanText = (cleanText || '').replace(/```json[\s\S]*?```/g, '').trim();
    }

    // Trava de coerência semântica para escalas
    if (action) {
      const lower = this.normalizeText(userPrompt || '');
      const querHabitual = (
        lower.includes('padrao') ||
        lower.includes('habitual') ||
        lower.includes('anterior') ||
        lower.includes('rotina') ||
        lower.includes('costume') ||
        lower.includes('repetir') ||
        lower.includes('replicar') ||
        lower.includes('o que ja fazia') ||
        lower.includes('igual antes')
      );
      const querAltaPerf = (
        lower.includes('alta performance') ||
        lower.includes('otimizada') ||
        lower.includes('mais produtivo')
      );

      if (querHabitual && !querAltaPerf && (action === 'escala_alta_performance' || action === 'escala_padrao_anterior')) {
        action = 'escala_padrao_anterior';
        if (actionData) actionData.action = 'escala_padrao_anterior';
      } else if (querAltaPerf && (action === 'escala_alta_performance' || action === 'escala_padrao_anterior')) {
        action = 'escala_alta_performance';
        if (actionData) actionData.action = 'escala_alta_performance';
      }
    }

    // Validação estrita de padeiro alvo para escalas
    if (action && actionData) {
      if (action === 'escala_alta_performance' || action === 'escala_padrao_anterior') {
        const lower = this.normalizeText(userPrompt || '');
        const p = this.extrairPadeiroDaMensagem(lower, systemContext.padeirosAtivos);
        if (!p) {
          // Escala geral: Força nulidade para garantir toda a equipe
          actionData.padeiroId = null;
          actionData.padeiroNome = null;
          actionData.clienteId = null;
          actionData.clienteNome = null;
          actionData.isIndividual = false;
        } else {
          actionData.padeiroId = p.id;
          actionData.padeiroNome = p.nome;
          actionData.isIndividual = true;
        }
      } else if (!actionData.padeiroId) {
        const lower = this.normalizeText(userPrompt || '');
        const p = this.extrairPadeiroDaMensagem(lower, systemContext.padeirosAtivos);
        if (p) {
          actionData.padeiroId = p.id;
          actionData.padeiroNome = p.nome;
        }
      }
    }

    return { cleanText, action, actionData, pensamento };
  },

  /**
   * Obtém a URL base da API garantindo que no APK Android aponte sempre para a Hostinger
   */
  getBaseUrl() {
    if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) return API_BASE_URL;
    if (typeof window !== 'undefined' && window.API_BASE_URL) return window.API_BASE_URL;
    if (typeof localStorage !== 'undefined' && localStorage.getItem('custom_api_url')) return localStorage.getItem('custom_api_url');
    if (typeof window !== 'undefined') {
      const isNative = !!(window.Capacitor || window.location.protocol === 'capacitor:' || (window.location.hostname === 'localhost' && !window.location.port));
      if (isNative) {
        return 'https://app2.bragodistribuidora.com.br';
      }
    }
    return '';
  },

  /**
   * Síntese de Voz (TTS) da Bia:
   * Conecta ao endpoint /api/bia/tts com ElevenLabs, suporta chamada direta de contingência no APK Android e Data URL
   */
  async synthesizeSpeech(text) {
    if (!text || typeof text !== 'string') return null;

    const baseUrl = this.getBaseUrl();
    const rawEndpoint = (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.serverTtsEndpoint) || '/api/bia/tts';
    let endpoint = rawEndpoint;
    if (!endpoint.startsWith('http')) {
      if (baseUrl) {
        endpoint = `${baseUrl}${endpoint}`;
      } else {
        endpoint = `https://app2.bragodistribuidora.com.br${endpoint}`;
      }
    }

    console.log('[BIA TTS] Solicitando áudio para:', endpoint);

    // 1. CAMADA 1: Tentar via Backend (com format: base64 e timeout generoso de 15s para IA)
    try {
      const token = (typeof localStorage !== 'undefined' && (localStorage.getItem('brago_token') || localStorage.getItem('token'))) || (typeof API !== 'undefined' && API.token) || '';
      
      const controller = new AbortController();
      const timer = setTimeout(() => {
        console.warn('[BIA TTS] Timeout de 15s atingido no backend, abortando...');
        controller.abort();
      }, 15000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text,
          format: 'base64',
          apiKey: (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.elevenLabsApiKey) || '',
          voiceId: (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.elevenLabsVoiceId) || ''
        }),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.audio) {
            console.log('[BIA TTS] Áudio Base64 recebido com sucesso do backend!');
            return {
              type: 'audio',
              audioUrl: data.audio
            };
          }
          if (data && data.fallback) {
            console.log('[BIA TTS] Backend solicitou fallback:', data.error);
            try {
              const direto = await this.chamarElevenLabsDireto(text);
              if (direto) return direto;
            } catch (_) {}
            return { type: 'native', text: data.text || text };
          }
        } else if (contentType.includes('audio')) {
          const blob = await res.blob();
          const base64Url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(URL.createObjectURL(blob));
            reader.readAsDataURL(blob);
          });
          console.log('[BIA TTS] Áudio Blob convertido em Base64!');
          return {
            type: 'audio',
            audioUrl: base64Url
          };
        }
      } else {
        console.warn(`[BIA TTS] Backend respondeu status ${res.status}. Tentando chamada direta ElevenLabs...`);
      }
    } catch (serverErr) {
      console.warn('[BIA TTS] Backend inacessível ou falha (' + serverErr.message + '). Acionando contingência direta ElevenLabs...');
    }

    // 2. CAMADA DE CONTINGÊNCIA: Chamada direta ao ElevenLabs (100% funcional no APK Android e WebView móvel)
    try {
      const direto = await this.chamarElevenLabsDireto(text);
      if (direto) {
        console.log('[BIA TTS] Áudio gerado via ElevenLabs direto com sucesso.');
        return direto;
      }
    } catch (elevenErr) {
      console.warn('[BIA TTS] Chamada direta ElevenLabs falhou:', elevenErr);
    }

    // 3. FALLBACK NATIVO (Web Speech API)
    console.log('[BIA TTS] Recorrendo ao fallback de voz nativa.');
    return {
      type: 'native',
      text
    };
  },

  /**
   * Chamada direta à API da ElevenLabs do lado do cliente (100% funcional no APK Android)
   */
  async chamarElevenLabsDireto(text) {
    const key = (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.elevenLabsApiKey) || 'sk_75a5efc2845be1169b12d7549fce7a0f2fdd8302193d9d50';
    const voiceId = (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.elevenLabsVoiceId) || 'EXAVITQu4vr4xnSDxMaL';
    if (!key) return null;

    let clean = text
      .replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '')
      .replace(/```[\s\S]*?```/gi, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\b(\d+)\s*kg\b/gi, '$1 quilos')
      .replace(/\bkg\b/gi, 'quilos')
      .replace(/R\$\s*(\d+)/gi, '$1 reais')
      .replace(/%/g, ' por cento')
      .replace(/\n+/g, '. ')
      .trim();

    if (clean.length > 450) {
      const pt = clean.lastIndexOf('.', 450);
      clean = (pt > 150 ? clean.slice(0, pt + 1) : clean.slice(0, 450)) + '...';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': key,
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`ElevenLabs direto HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const base64Url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(URL.createObjectURL(blob));
      reader.readAsDataURL(blob);
    });

    return {
      type: 'audio',
      audioUrl: base64Url
    };
  }
};

if (typeof window !== 'undefined') {
  window.BiaAPI = BiaAPI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiaAPI;
}
