/**
 * BIA AGENT - MÓDULO DE COMANDOS AVULSOS DO GESTOR
 * SmartGestor - Brago Distribuidora
 *
 * Responsável por interpretar instruções operacionais diretas e pontuais do gestor,
 * como:
 * - "Preciso que na segunda o cides atenda o cliente veneza"
 * - "Coloca o daniel na terça no big box"
 * - "Tira o paulo da quarta"
 * - "Onde o cides vai na segunda?"
 * - "Quem atende o veneza amanhã?"
 */

const BiaCommands = {
  /**
   * Normaliza textos removendo acentos e pontuações
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
   * Formata data ISO (YYYY-MM-DD) para formato curto brasileiro (DD/MM)
   */
  formatarDataBr(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length < 3) return iso;
    return `${parts[2]}/${parts[1]}`;
  },

  /**
   * Obtém as datas de Segunda a Sábado da semana de trabalho (respeitando offset)
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
   * Extrai o dia da semana mencionado na mensagem e calcula a data correspondente
   */
  extrairDiaEData(norm, weekOffset = 0) {
    const weekDates = this.getWeekDates(weekOffset);
    const diasSemanaNomes = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // 1. Termos relativos: hoje, amanhã
    const hoje = new Date();
    if (/\bhoje\b/.test(norm)) {
      const iso = hoje.toISOString().split('T')[0];
      const dow = hoje.getDay();
      const diaNome = dow >= 1 && dow <= 6 ? diasSemanaNomes[dow - 1] : 'Hoje';
      return { data: iso, diaNome, dayOfWeek: dow, relativo: 'hoje' };
    }

    if (/\b(amanha|amanhã)\b/.test(norm)) {
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      const iso = amanha.toISOString().split('T')[0];
      const dow = amanha.getDay();
      const diaNome = dow >= 1 && dow <= 6 ? diasSemanaNomes[dow - 1] : 'Amanhã';
      return { data: iso, diaNome, dayOfWeek: dow, relativo: 'amanha' };
    }

    // 2. Dias da semana (Segunda a Sábado)
    const mapaDias = [
      { regex: /\b(segunda|segunda-feira|seg)\b/, idx: 0, nome: 'Segunda' },
      { regex: /\b(terca|terca-feira|ter)\b/, idx: 1, nome: 'Terça' },
      { regex: /\b(quarta|quarta-feira|qua)\b/, idx: 2, nome: 'Quarta' },
      { regex: /\b(quinta|quinta-feira|qui)\b/, idx: 3, nome: 'Quinta' },
      { regex: /\b(sexta|sexta-feira|sex)\b/, idx: 4, nome: 'Sexta' },
      { regex: /\b(sabado|sabado-feira|sab)\b/, idx: 5, nome: 'Sábado' }
    ];

    for (const d of mapaDias) {
      if (d.regex.test(norm)) {
        const dateObj = weekDates[d.idx];
        const iso = dateObj.toISOString().split('T')[0];
        return {
          data: iso,
          diaNome: d.nome,
          dayOfWeek: d.idx + 1,
          dateObj
        };
      }
    }

    return null;
  },

  /**
   * Extrai o padeiro mencionado na mensagem com alta sensibilidade a nomes compostos e códigos
   */
  extrairPadeiro(norm, padeirosAtivos = []) {
    if (!norm || !padeirosAtivos || padeirosAtivos.length === 0) return null;

    for (const p of padeirosAtivos) {
      const pNomeNorm = this.normalizeText(p.nome);
      if (!pNomeNorm) continue;

      if (norm.includes(pNomeNorm)) return p;
      if (p.codTec && norm.includes(String(p.codTec))) return p;

      const partes = pNomeNorm.split(/\s+/).filter(w => 
        w.length > 2 && !['de', 'da', 'do', 'dos', 'das', 'e', 'silva', 'santos', 'sousa', 'souza', 'oliveira', 'padeiro'].includes(w)
      );

      if (partes.length >= 2) {
        const p1 = `${partes[0]} ${partes[1]}`;
        const p2 = `${partes[0]} ${partes[partes.length - 1]}`;
        if (norm.includes(p1) || norm.includes(p2)) return p;
      }

      if (partes.length >= 1 && partes[0].length >= 3) {
        const regex1 = new RegExp(`\\b${partes[0]}\\b`, 'i');
        if (regex1.test(norm)) {
          const matchCount = padeirosAtivos.filter(other => {
            const oNorm = this.normalizeText(other.nome);
            return oNorm.startsWith(partes[0] + ' ') || oNorm === partes[0];
          }).length;
          if (matchCount === 1) return p;
        }
      }
    }

    return null;
  },

  /**
   * Extrai e resolve a loja/cliente com inteligência contextual e histórico do padeiro
   */
  extrairCliente(norm, clientesAtivos = [], cronogramaHistorico = [], padeiroAlvo = null) {
    if (!norm) return null;

    // 1. Tentar casar primeiramente com as lojas frequentes do próprio padeiro
    // (Ex: se Cides atende 'Veneza - P.Sul' e o gestor pediu 'veneza', o Veneza dele é o P.Sul!)
    if (padeiroAlvo && cronogramaHistorico && cronogramaHistorico.length > 0) {
      const historicoPadeiro = cronogramaHistorico.filter(c => 
        c.padeiroId === padeiroAlvo.id || 
        (c.codTec && String(c.codTec) === String(padeiroAlvo.codTec)) ||
        this.normalizeText(c.padeiroNome) === this.normalizeText(padeiroAlvo.nome)
      );

      const lojasPadeiroContagem = {};
      historicoPadeiro.forEach(c => {
        if (c.clienteNome) {
          const nomeL = c.clienteNome.trim();
          lojasPadeiroContagem[nomeL] = (lojasPadeiroContagem[nomeL] || 0) + 1;
        }
      });

      const lojasPadeiro = Object.entries(lojasPadeiroContagem)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

      for (const loja of lojasPadeiro) {
        const lojaNorm = this.normalizeText(loja);
        const stopWords = ['supermercado', 'padaria', 'panificadora', 'comercio', 'ltda', 'de', 'da', 'do', 'e'];
        const tokensLoja = lojaNorm.split(/[\s\-\/\(\)]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
        
        if (norm.includes(lojaNorm)) {
          const histMatch = historicoPadeiro.find(c => this.normalizeText(c.clienteNome) === lojaNorm);
          return {
            id: histMatch?.clienteId || ('cli-' + lojaNorm.replace(/[^a-z0-9]/g, '_')),
            nome: loja,
            nomeFantasia: loja,
            origem: 'historico_padeiro'
          };
        }

        const tokenHits = tokensLoja.filter(t => norm.includes(t));
        if (tokenHits.length > 0 && tokenHits.length === tokensLoja.length) {
          const histMatch = historicoPadeiro.find(c => this.normalizeText(c.clienteNome) === lojaNorm);
          return {
            id: histMatch?.clienteId || ('cli-' + lojaNorm.replace(/[^a-z0-9]/g, '_')),
            nome: loja,
            nomeFantasia: loja,
            origem: 'historico_padeiro'
          };
        }

        if (tokensLoja.length > 0 && norm.includes(tokensLoja[0]) && tokensLoja[0].length >= 4) {
          const histMatch = historicoPadeiro.find(c => this.normalizeText(c.clienteNome) === lojaNorm);
          return {
            id: histMatch?.clienteId || ('cli-' + lojaNorm.replace(/[^a-z0-9]/g, '_')),
            nome: loja,
            nomeFantasia: loja,
            origem: 'historico_padeiro_chave'
          };
        }
      }
    }

    // 2. Buscar em todo o histórico do cronograma geral (ex: 'Big Box')
    for (const c of (cronogramaHistorico || [])) {
      if (c.clienteNome) {
        const cNomeNorm = this.normalizeText(c.clienteNome);
        if (cNomeNorm && norm.includes(cNomeNorm)) {
          return {
            id: c.clienteId || ('cli-' + cNomeNorm.replace(/[^a-z0-9]/g, '_')),
            nome: c.clienteNome,
            nomeFantasia: c.clienteNome,
            origem: 'cronograma_historico_exato'
          };
        }
      }
    }

    // 3. Buscar entre todos os clientes ativos com correspondência exata
    for (const cli of clientesAtivos) {
      const cNomeNorm = this.normalizeText(cli.nomeFantasia || cli.nome);
      if (cNomeNorm && norm.includes(cNomeNorm)) {
        return {
          id: cli.id,
          nome: cli.nomeFantasia || cli.nome,
          nomeFantasia: cli.nomeFantasia || cli.nome,
          origem: 'clientes_ativos_exato'
        };
      }
    }

    // 4. Buscar por tokens distintivos em clientes ativos
    let melhorCli = null;
    let melhorHits = 0;
    for (const cli of clientesAtivos) {
      const cNome = this.normalizeText(cli.nomeFantasia || cli.nome);
      const stopWords = ['panificadora', 'padaria', 'supermercado', 'mercado', 'ltda', 'comercio', 'de', 'da', 'do', 'dos', 'das', 'e'];
      const tokens = cNome.split(/[\s\-\/\(\)]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
      if (tokens.length > 0) {
        const hits = tokens.filter(t => norm.includes(t)).length;
        if (hits === tokens.length && hits > melhorHits) {
          melhorHits = hits;
          melhorCli = cli;
        }
      }
    }
    if (melhorCli) {
      return {
        id: melhorCli.id,
        nome: melhorCli.nomeFantasia || melhorCli.nome,
        nomeFantasia: melhorCli.nomeFantasia || melhorCli.nome,
        origem: 'clientes_ativos_tokens'
      };
    }

    return null;
  },

  /**
   * Extrai horários da mensagem (padrão corporativo Brago: 08:00 às 17:00)
   */
  extrairHorarios(norm) {
    let horario = '08:00';
    let horarioFim = '17:00';

    const regexPeriodo = /das\s+(\d{1,2})(?:[:h](\d{2}))?\s*(?:as|ate|a|-)\s*(\d{1,2})(?:[:h](\d{2}))?/;
    const mPeriodo = norm.match(regexPeriodo);
    if (mPeriodo) {
      const h1 = String(parseInt(mPeriodo[1], 10)).padStart(2, '0');
      const min1 = mPeriodo[2] ? String(parseInt(mPeriodo[2], 10)).padStart(2, '0') : '00';
      const h2 = String(parseInt(mPeriodo[3], 10)).padStart(2, '0');
      const min2 = mPeriodo[4] ? String(parseInt(mPeriodo[4], 10)).padStart(2, '0') : '00';
      return { horario: `${h1}:${min1}`, horarioFim: `${h2}:${min2}` };
    }

    const regexHoraSimples = /\bas\s+(\d{1,2})(?:[:h](\d{2}))?\b/;
    const mSimples = norm.match(regexHoraSimples);
    if (mSimples) {
      const h = String(parseInt(mSimples[1], 10)).padStart(2, '0');
      const min = mSimples[2] ? String(parseInt(mSimples[2], 10)).padStart(2, '0') : '00';
      horario = `${h}:${min}`;
    }

    return { horario, horarioFim };
  },

  /**
   * Detecta se a mensagem é um comando operacional do gestor
   */
  isGestorCommand(message) {
    if (!message) return false;
    const norm = this.normalizeText(message);

    const triggers = [
      'preciso que', 'quero que', 'favor', 'coloque', 'coloca', 'escala', 'escalar',
      'agenda', 'agendar', 'atenda', 'atender', 'vai atender', 'vai para', 'vai pro',
      'muda', 'mudar', 'altera', 'alterar', 'troca', 'trocar', 'tira', 'tirar',
      'remove', 'remover', 'cancela', 'cancelar', 'apaga', 'apagar', 'desescala',
      'folga', 'onde vai', 'onde o', 'onde a', 'quem atende', 'quem vai', 'qual a escala'
    ];

    return triggers.some(t => norm.includes(t));
  },

  /**
   * Processador principal de comandos avulsos do gestor
   */
  processarComando(userMessage, context = {}, options = {}) {
    const norm = this.normalizeText(userMessage);
    const padeirosAtivos = context.padeirosAtivos || [];
    const clientesAtivos = context.clientesAtivos || [];
    const cronogramaHistorico = context.cronogramaHistorico || [];
    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || options.weekOffset || 0;

    const diaInfo = this.extrairDiaEData(norm, weekOffset);
    const padeiro = this.extrairPadeiro(norm, padeirosAtivos);
    const cliente = this.extrairCliente(norm, clientesAtivos, cronogramaHistorico, padeiro);
    const { horario, horarioFim } = this.extrairHorarios(norm);

    // 1. Caso: Consulta Quem atende loja X no dia Y
    if ((norm.includes('quem atende') || norm.includes('quem vai') || norm.includes('quem esta')) && diaInfo && cliente) {
      const tarefas = (cronogramaHistorico || []).filter(t => t.data === diaInfo.data && (
        t.clienteId === cliente.id || 
        this.normalizeText(t.clienteNome).includes(this.normalizeText(cliente.nome)) ||
        this.normalizeText(cliente.nome).includes(this.normalizeText(t.clienteNome))
      ));

      if (tarefas.length > 0) {
        const nomes = tarefas.map(t => `**${t.padeiroNome}** (${t.horario || '08:00'} às ${t.horarioFim || '17:00'})`).join(', ');
        return {
          text: `Na **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**, quem atende a loja **${cliente.nome}** é: ${nomes}.`,
          action: null,
          actionData: null,
          tipo: 'consulta_loja'
        };
      } else {
        return {
          text: `Para **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**, ainda não há nenhum padeiro agendado na loja **${cliente.nome}**.\n\nDeseja que eu agende alguém? Basta me pedir: *"Coloca o [Nome do Padeiro] no ${cliente.nome} na ${diaInfo.diaNome}"*.`,
          action: null,
          actionData: null,
          tipo: 'consulta_loja_vazia'
        };
      }
    }

    // 2. Caso: Consulta Onde o Padeiro X vai no dia Y
    if ((norm.includes('onde vai') || norm.includes('onde o') || norm.includes('onde a') || norm.includes('qual a escala') || norm.includes('trabalha')) && diaInfo && padeiro) {
      const tarefa = (cronogramaHistorico || []).find(t => t.data === diaInfo.data && t.padeiroId === padeiro.id);
      if (tarefa) {
        return {
          text: `Na **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**, o padeiro **${padeiro.nome}** está agendado no cliente **${tarefa.clienteNome}** (${tarefa.horario || '08:00'} às ${tarefa.horarioFim || '17:00'}).`,
          action: null,
          actionData: null,
          tipo: 'consulta_padeiro'
        };
      } else {
        return {
          text: `O padeiro **${padeiro.nome}** não possui nenhum atendimento agendado para **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**.\n\nDeseja agendá-lo agora? Basta me pedir: *"Coloca o ${padeiro.nome.split(' ')[0]} no [Nome do Cliente]"*.`,
          action: null,
          actionData: null,
          tipo: 'consulta_sem_tarefa'
        };
      }
    }

    // 3. Caso: Remoção / Cancelamento de Agendamento
    if (norm.includes('tira') || norm.includes('tirar') || norm.includes('remove') || norm.includes('remover') || norm.includes('cancela') || norm.includes('cancelar') || norm.includes('apaga') || norm.includes('folga') || norm.includes('desescala')) {
      if (padeiro && diaInfo) {
        const tarefaExistente = (cronogramaHistorico || []).find(t => t.data === diaInfo.data && t.padeiroId === padeiro.id);
        const cliNome = tarefaExistente?.clienteNome || 'atendimento agendado';

        return {
          text: `Compreendido! Identifiquei a solicitação para remover o agendamento de **${padeiro.nome}** na **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})** no cliente **${cliNome}**.\n\nConfira os detalhes no card abaixo e confirme para remover do cronograma.`,
          action: 'remover_avulso',
          actionData: {
            action: 'remover_avulso',
            tarefas: tarefaExistente ? [tarefaExistente] : [],
            tarefaId: tarefaExistente?.id || null,
            padeiroId: padeiro.id,
            padeiroNome: padeiro.nome,
            data: diaInfo.data,
            diaNome: diaInfo.diaNome,
            clienteNome: cliNome,
            descricao: `Remover escala de ${padeiro.nome} (${diaInfo.diaNome})`,
            confirmar: true
          },
          tipo: 'remover_avulso'
        };
      }
    }

    // 4. Caso Principal: Agendamento / Alocação Avulsa
    // Ex: "Preciso que na segunda o cides atenda o cliente veneza"
    if (padeiro && diaInfo && cliente) {
      const tarefaExistente = (cronogramaHistorico || []).find(t => t.data === diaInfo.data && t.padeiroId === padeiro.id);
      const isSubstituicao = !!tarefaExistente;
      const lojaAnterior = tarefaExistente ? (tarefaExistente.clienteNome || 'outro cliente') : null;

      let msgIntro = `Com certeza! Preparei a alteração pontual no cronograma para atender a sua solicitação:\n\n` +
        `* **Padeiro:** ${padeiro.nome} (COD ${padeiro.codTec || '—'})\n` +
        `* **Loja / Cliente:** **${cliente.nomeFantasia || cliente.nome}**\n` +
        `* **Data:** **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**\n` +
        `* **Horário:** ${horario} às ${horarioFim}\n`;

      if (isSubstituicao) {
        msgIntro += `\n*(Esta alteração substituirá o agendamento anterior em **${lojaAnterior}**)*\n`;
      }

      msgIntro += `\nConfira os detalhes no card abaixo e clique em **Confirmar e Gravar no Cronograma** para aplicar.`;

      const cliNomeFinal = cliente.nomeFantasia || cliente.nome;

      return {
        text: msgIntro,
        action: 'agendar_avulso',
        actionData: {
          action: 'agendar_avulso',
          substituicao: isSubstituicao,
          tarefaIdExistente: tarefaExistente?.id || null,
          tarefaExistenteCliente: lojaAnterior,
          lojaAnterior,
          padeiro: {
            id: padeiro.id,
            nome: padeiro.nome,
            codTec: padeiro.codTec || ''
          },
          cliente: {
            id: cliente.id,
            nome: cliNomeFinal
          },
          data: diaInfo.data,
          diaNome: diaInfo.diaNome,
          dataBr: this.formatarDataBr(diaInfo.data),
          horario,
          horarioFim,
          observacao: `Ajuste pontual do gestor via Bia IA`,
          tarefa: {
            padeiroId: padeiro.id,
            padeiroNome: padeiro.nome,
            codTec: padeiro.codTec || '',
            clienteId: cliente.id,
            clienteNome: cliNomeFinal,
            data: diaInfo.data,
            diaNome: diaInfo.diaNome,
            horario,
            horarioFim,
            status: 'pendente',
            observacao: `Ajuste pontual do gestor via Bia IA`
          },
          descricao: `Agendar ${padeiro.nome.split(' ')[0]} em ${cliNomeFinal} (${diaInfo.diaNome})`,
          confirmar: true
        },
        tipo: 'agendar_avulso'
      };
    }

    // 5. Caso: Comando incompleto (orienta o gestor de forma clara)
    if (this.isGestorCommand(norm)) {
      const faltantes = [];
      if (!padeiro) faltantes.push('o **nome do padeiro**');
      if (!diaInfo) faltantes.push('o **dia da semana** (ex: segunda, terça...)');
      if (!cliente) faltantes.push('o **nome do cliente/loja**');

      return {
        text: `Entendi que você deseja fazer um ajuste pontual na escala, mas para eu montar o agendamento certinho, preciso que você me informe ${faltantes.join(' e ')}.\n\nExemplo: *"Preciso que na segunda o Cides atenda o Veneza"* ou *"Coloca o Daniel na quarta no Big Box"*.\n\nPoderia reformular indicando esses dados?`,
        action: null,
        actionData: null,
        tipo: 'comando_incompleto'
      };
    }

    return null;
  }
};

// Exportar para ambiente do navegador e Node.js
if (typeof window !== 'undefined') {
  window.BiaCommands = BiaCommands;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiaCommands;
}
