/**
 * BIA AGENT - CLIENTE API GOOGLE GEMINI & SERVIDOR BACKEND
 * SmartGestor - Brago Distribuidora
 */

const BiaAPI = {
  conversationHistory: [],

  /**
   * Limpa o histórico da conversa
   */
  clearHistory() {
    this.conversationHistory = [];
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
      .map((c, i) => `${i + 1}º ${c.nome} (${(c.totalKg || 0).toFixed(0)} kg, ${c.totalVisitas || 0} visitas)`)
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
  generateLocalFallback(userMessage, ctx = {}) {
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

    // 1.5. MÓDULO DE COMANDOS AVULSOS DO GESTOR (Ajustes pontuais, trocas e remoções)
    if (typeof BiaCommands !== 'undefined') {
      const comando = BiaCommands.processarComando(userMessage, ctx);
      if (comando && comando.action) {
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
      let padeiroAlvo = this.extrairPadeiroDaMensagem(norm, padeirosAtivos);

      // Se o usuário pediu "teste gerando a escala de um padeiro" ou "escala de um padeiro"
      if (!padeiroAlvo && (norm.includes('de um padeiro') || norm.includes('do padeiro') || (norm.includes('teste') && norm.includes('padeiro')))) {
        const contagemHistorico = {};
        cronograma.forEach(c => { if (c.padeiroId) contagemHistorico[c.padeiroId] = (contagemHistorico[c.padeiroId] || 0) + 1; });
        atividades.forEach(a => { if (a.padeiroId) contagemHistorico[a.padeiroId] = (contagemHistorico[a.padeiroId] || 0) + 1; });
        const topPadeiroId = Object.entries(contagemHistorico).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topPadeiroId) {
          padeiroAlvo = padeirosAtivos.find(p => p.id === topPadeiroId);
        }
      }

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

      // CASO A: Escala para Padeiro Específico
      if (padeiroAlvo) {
        const historicoPadeiro = (cronograma || []).filter(c =>
          c.padeiroId === padeiroAlvo.id ||
          (c.codTec && String(c.codTec) === String(padeiroAlvo.codTec)) ||
          this.normalizeText(c.padeiroNome) === this.normalizeText(padeiroAlvo.nome)
        ).concat(
          (atividades || []).filter(a =>
            a.padeiroId === padeiroAlvo.id ||
            (a.codTec && String(a.codTec) === String(padeiroAlvo.codTec)) ||
            this.normalizeText(a.padeiroNome) === this.normalizeText(padeiroAlvo.nome)
          )
        );

        const prefereHabitual = querHabitual || (historicoPadeiro.length > 0 && !norm.includes('alta performance') && !norm.includes('otimizada'));

        if (prefereHabitual) {
          if (historicoPadeiro.length > 0) {
            return {
              text: `Entendido! Analisei o histórico operacional do padeiro **${padeiroAlvo.nome}** (${historicoPadeiro.length} atendimentos registrados). Mapeei os clientes mais frequentes para cada dia da semana dele e preparei a proposta da **Escala Padrão Habitual** individualizada.\n\nConfira os agendamentos sugeridos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
              action: 'escala_padrao_anterior',
              actionData: {
                action: 'escala_padrao_anterior',
                padeiroId: padeiroAlvo.id,
                padeiroNome: padeiroAlvo.nome,
                descricao: `Escala habitual individual para ${padeiroAlvo.nome}`,
                confirmar: true
              }
            };
          } else {
            return {
              text: `O padeiro **${padeiroAlvo.nome}** ainda não possui histórico de escalas ou atendimentos registrados no sistema para que eu possa identificar uma rotina habitual.\n\nPara ele, você pode:\n* 📅 Iniciar o cronograma agendando clientes manualmente.\n* ⚡ Me pedir uma escala otimizada: *"Bia, crie uma escala de alta performance para ${padeiroAlvo.nome}"* (vou alocar clientes disponíveis de maior volume).`,
              action: null,
              actionData: null
            };
          }
        } else {
          return {
            text: `Com certeza! Preparei uma proposta de **Escala de Alta Performance** individual para o padeiro **${padeiroAlvo.nome}**, priorizando clientes ativos de alta demanda para esta semana.\n\nConfira a distribuição sugerida no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.`,
            action: 'escala_alta_performance',
            actionData: {
              action: 'escala_alta_performance',
              padeiroId: padeiroAlvo.id,
              padeiroNome: padeiroAlvo.nome,
              descricao: `Escala de alta performance para ${padeiroAlvo.nome}`,
              confirmar: true
            }
          };
        }
      }

      // CASO B: Escala Geral para Toda a Equipe
      if (querHabitual) {
        return {
          text: 'Entendido! Analisei todo o histórico operacional e de escalas registradas. Mapeei os hábitos e clientes mais frequentes de cada padeiro para cada dia da semana e preparei a proposta da **Escala Padrão Habitual** da equipe.\n\nConfira os agendamentos sugeridos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.',
          action: 'escala_padrao_anterior',
          actionData: {
            action: 'escala_padrao_anterior',
            descricao: 'Escala replicando padrão anterior habitual da equipe',
            confirmar: true
          }
        };
      } else {
        return {
          text: 'Com certeza! Analisei os dados de produtividade da equipe e o histórico de demanda dos clientes ativos. Preparei uma proposta de **Escala de Alta Performance** para esta semana, priorizando os padeiros de maior volume nos clientes com maior fluxo.\n\nConfira a distribuição sugerida no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.',
          action: 'escala_alta_performance',
          actionData: {
            action: 'escala_alta_performance',
            descricao: 'Escala de alta performance para a semana',
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

    // 7. Consulta sobre Padeiro Específico
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

    // 8. Consulta sobre Cliente Específico
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

    // 9. Ranking e Produtividade
    if (
      norm.includes('ranking') ||
      norm.includes('produz mais') ||
      norm.includes('produtividade') ||
      norm.includes('mais produtivo') ||
      norm.includes('top padeiro') ||
      norm.includes('maiores clientes') ||
      norm.includes('volume') ||
      norm.includes('demanda')
    ) {
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
   * Envia uma mensagem do usuário com fallback em camadas (Servidor -> Gemini Direto -> Motor Local)
   */
  async sendMessage(userMessage) {
    if (!userMessage || !userMessage.trim()) {
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
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    let result = null;

    // CAMADA 1: Chamar endpoint backend seguro /api/bia/chat
    try {
      if (typeof API !== 'undefined' && typeof API.post === 'function') {
        const serverRes = await API.post(BIA_CONFIG.serverChatEndpoint || '/api/bia/chat', {
          message: userMessage,
          history: this.conversationHistory,
          context: systemContext
        });

        if (serverRes && (serverRes.text || serverRes.action)) {
          result = {
            text: serverRes.text,
            action: serverRes.action,
            actionData: serverRes.actionData,
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
          temperature: 0.6,
          maxOutputTokens: 1024
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
      const local = this.generateLocalFallback(userMessage, systemContext);
      result = {
        text: local.text,
        action: local.action,
        actionData: local.actionData,
        modelUsed: 'local_engine'
      };
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

    // Detectar JSON de ação na resposta
    const jsonMatch = (rawText || '').match(/```json\s*([\s\S]*?)\s*```/);
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
      cleanText = (rawText || '').replace(/```json[\s\S]*?```/g, '').trim();
    }

    // Se a IA não retornou ação estruturada, usa o fallback local
    if (!action) {
      const fallback = this.generateLocalFallback(userPrompt, systemContext);
      if (fallback.action) {
        action = fallback.action;
        actionData = fallback.actionData;
      }
    }

    // Garantir que se tiver um padeiro no prompt e a ação for de escala, preenche os dados
    if (action && (!actionData || !actionData.padeiroId)) {
      const lower = this.normalizeText(userPrompt || '');
      const p = this.extrairPadeiroDaMensagem(lower, systemContext.padeirosAtivos);
      if (p) {
        if (!actionData) actionData = { action };
        actionData.padeiroId = p.id;
        actionData.padeiroNome = p.nome;
      }
    }

    return { cleanText, action, actionData };
  }
};

if (typeof window !== 'undefined') {
  window.BiaAPI = BiaAPI;
}
