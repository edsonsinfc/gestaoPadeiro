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
   * Calcula a distância de Levenshtein entre duas palavras para tolerância a erros de digitação (typos)
   */
  levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
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

    // Fuzzy matching para erros de digitação leves em nomes de padeiros (ex: "igor" -> "ygor", "cide" -> "cides")
    const palavrasNorm = norm.split(/\s+/).filter(w => w.length >= 3 && !['cliente', 'padeiro', 'para', 'colocar', 'coloque', 'atenda'].includes(w));
    for (const p of padeirosAtivos) {
      const pNomeNorm = this.normalizeText(p.nome);
      const primeiroNome = pNomeNorm.split(/\s+/)[0];
      if (primeiroNome && primeiroNome.length >= 3) {
        for (const palavra of palavrasNorm) {
          const maxDiff = primeiroNome.length >= 6 ? 2 : 1;
          if (this.levenshtein(palavra, primeiroNome) <= maxDiff) {
            return p;
          }
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

    // 5. Tolerância a Erros de Digitação e Nomes Curtos (Fuzzy Matching para typos como "venza" -> "veneza" e "bigo box" -> "big box")
    const stopWordsGerais = ['colocar', 'coloque', 'preciso', 'atenda', 'cliente', 'padeiro', 'para', 'quinta', 'feira', 'segunda', 'terca', 'quarta', 'sexta', 'sabado', 'domingo', 'amanha', 'hoje', 'pela', 'pelo', 'com', 'sem', 'vai', 'outro', 'junto'];
    const palavrasMensagem = norm.split(/[\s\-\/\(\)\,\.]+/).filter(w => w.length >= 3 && !stopWordsGerais.includes(w));

    let melhorFuzzyCli = null;
    let menorDistancia = 999;

    for (const cli of clientesAtivos) {
      const cNome = this.normalizeText(cli.nomeFantasia || cli.nome);
      const stopWords = ['panificadora', 'padaria', 'supermercado', 'mercado', 'ltda', 'comercio', 'de', 'da', 'do', 'dos', 'das', 'e'];
      const tokens = cNome.split(/[\s\-\/\(\)]+/).filter(w => w.length >= 3 && !stopWords.includes(w));

      // Caso A: Se os 2 primeiros tokens baterem juntos (ex: "big box" ou "bigo box")
      if (tokens.length >= 2) {
        const parTokens = `${tokens[0]} ${tokens[1]}`;
        if (norm.includes(parTokens)) {
          return {
            id: cli.id,
            nome: cli.nomeFantasia || cli.nome,
            nomeFantasia: cli.nomeFantasia || cli.nome,
            origem: 'clientes_ativos_par_tokens'
          };
        }
        // Match com tolerância no par (ex: "bigo box" vs "big box")
        for (let i = 0; i < palavrasMensagem.length - 1; i++) {
          const parMsg = `${palavrasMensagem[i]} ${palavrasMensagem[i+1]}`;
          if (this.levenshtein(parMsg, parTokens) <= 2) {
            return {
              id: cli.id,
              nome: cli.nomeFantasia || cli.nome,
              nomeFantasia: cli.nomeFantasia || cli.nome,
              origem: 'clientes_ativos_par_fuzzy'
            };
          }
        }
      }

      for (const tok of tokens) {
        for (const palavraMsg of palavrasMensagem) {
          const maxDiff = tok.length >= 6 ? 2 : 1;
          const dist = this.levenshtein(palavraMsg, tok);
          if (dist <= maxDiff && dist < menorDistancia) {
            menorDistancia = dist;
            melhorFuzzyCli = cli;
          }
        }
      }
    }

    if (melhorFuzzyCli && menorDistancia <= 2) {
      return {
        id: melhorFuzzyCli.id,
        nome: melhorFuzzyCli.nomeFantasia || melhorFuzzyCli.nome,
        nomeFantasia: melhorFuzzyCli.nomeFantasia || melhorFuzzyCli.nome,
        origem: 'clientes_ativos_fuzzy'
      };
    }

    return null;
  },

  /**
   * Extrai um ou múltiplos clientes mencionados na mensagem (ex: "atenda o cliente venza na terça junto com um outro cliente big box")
   */
  extrairClientes(norm, clientesAtivos = [], cronogramaHistorico = [], padeiroAlvo = null) {
    if (!norm) return [];

    const conectoresRegex = /junto\s+com|e\s+tambem|e\s+com|e\s+no\s+cliente|alem\s+de|e\s+o\s+cliente|e\s+outro\s+cliente|\be\s+no\b|\be\s+o\b|\bmais\s+o\b|\bcom\s+o\b|\bcom\s+outro\b/i;
    const partes = norm.split(conectoresRegex).map(p => p.trim()).filter(Boolean);
    const encontrados = [];
    const idsVistos = new Set();

    if (partes.length > 1) {
      for (const parte of partes) {
        const c = this.extrairCliente(parte, clientesAtivos, cronogramaHistorico, padeiroAlvo);
        if (c && !idsVistos.has(c.id)) {
          idsVistos.add(c.id);
          encontrados.push(c);
        }
      }
    }

    // Se achou menos de 2 ou não dividiu por conectivo, tenta extrair da mensagem completa
    if (encontrados.length === 0) {
      const unico = this.extrairCliente(norm, clientesAtivos, cronogramaHistorico, padeiroAlvo);
      if (unico) encontrados.push(unico);
    }

    return encontrados;
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

  pendingCommand: null,

  /**
   * Detecta se a mensagem é um comando operacional avulso do gestor
   * Ignora solicitações de desfazer, escalas gerais em lote ou conversas normais
   */
  isGestorCommand(message, pendingCommand = null) {
    if (!message) return false;
    const norm = this.normalizeText(message);

    // 1. Excluir comandos de Desfazer / Reverter
    const isDesfazer = (
      norm.includes('desfazer') ||
      norm.includes('desfaca') ||
      norm.includes('reverter') ||
      norm.includes('voltar atras') ||
      norm.includes('cancelar escala') ||
      norm.includes('apagar escala') ||
      norm.includes('remover escala')
    );
    if (isDesfazer) return false;

    // 2. Excluir comandos de Escala Geral em Lote
    const isEscalaEmLote = (
      norm.includes('alta performance') ||
      norm.includes('habitual') ||
      norm.includes('padrao') ||
      norm.includes('gerar escala') ||
      norm.includes('criar escala') ||
      norm.includes('fazer escala') ||
      norm.includes('faca a escala') ||
      norm.includes('crie a escala') ||
      norm.includes('montar escala') ||
      norm.includes('monte a escala') ||
      norm.includes('nova escala')
    );
    if (isEscalaEmLote) return false;

    // Se temos um comando pendente aguardando dados complementares:
    const activePending = pendingCommand || this.pendingCommand;
    if (activePending) {
      return true;
    }

    // 3. Excluir saudações, panorama e consultas gerais quando não há pendência
    if (
      norm === 'oi' || norm === 'ola' || norm.startsWith('oi ') || norm.startsWith('ola ') ||
      norm.includes('bom dia') || norm.includes('boa tarde') || norm.includes('boa noite') ||
      norm.includes('resumo') || norm.includes('panorama') || norm.includes('ranking') ||
      norm.includes('ajuda') || norm.includes('quem e voce') || norm.includes('como funciona')
    ) {
      return false;
    }

    // 4. Triggers precisos de comandos avulsos/pontuais
    const triggersAvulsos = [
      'preciso que', 'quero que', 'coloque', 'coloca', 'bote', 'bota',
      'atenda', 'atender', 'vai atender', 'vai para', 'vai pro',
      'troca', 'trocar', 'altera', 'alterar', 'muda', 'mudar',
      'tira o', 'tira a', 'tirar o', 'tirar a', 'remove o', 'remove a',
      'remover o', 'remover a', 'cancela o', 'cancela a', 'cancelar o', 'cancelar a',
      'desescala', 'folga do', 'folga da',
      'onde vai', 'onde o', 'onde a', 'quem atende', 'quem vai', 'qual a escala do'
    ];

    const temTrigger = triggersAvulsos.some(t => norm.includes(t));
    if (temTrigger) return true;

    // 5. Ou se a frase contém dias da semana e termos de agendamento específico
    const dias = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'amanha'];
    const temDia = dias.some(d => norm.includes(d));
    const verbosAcao = ['atenda', 'atender', 'colocar', 'coloca', 'vai', 'agendar', 'agenda'];
    const temAcao = verbosAcao.some(v => norm.includes(v));

    return temDia && temAcao;
  },

  /**
   * Constrói a resposta e o payload estruturado para Agendamento Avulso no Cronograma
   */
  montarRespostaAgendamentoAvulso({ padeiro, clientes, diaInfo, horario = '08:00', horarioFim = '17:00', cronogramaHistorico = [] }) {
    if (!padeiro || !diaInfo || !clientes || clientes.length === 0) return null;

    const tarefasExistentesDia = (cronogramaHistorico || []).filter(t => t.data === diaInfo.data && t.padeiroId === padeiro.id);
    const tarefaExistente = tarefasExistentesDia.length > 0 ? tarefasExistentesDia[0] : null;
    const isSubstituicao = !!tarefaExistente && clientes.length === 1;
    const lojaAnterior = tarefaExistente ? (tarefaExistente.clienteNome || 'outro cliente') : null;

    const tarefasGeradas = clientes.map((cli, idx) => {
      let hIni = horario;
      let hFim = horarioFim;
      if (clientes.length === 2) {
        hIni = idx === 0 ? '08:00' : '13:00';
        hFim = idx === 0 ? '12:00' : '17:00';
      } else if (clientes.length > 2) {
        const horaBase = 8 + (idx * 3);
        hIni = `${String(horaBase).padStart(2, '0')}:00`;
        hFim = `${String(horaBase + 3).padStart(2, '0')}:00`;
      }

      const cNome = cli.nomeFantasia || cli.nome;
      return {
        padeiroId: padeiro.id,
        padeiroNome: padeiro.nome,
        codTec: padeiro.codTec || '',
        clienteId: cli.id,
        clienteNome: cNome,
        data: diaInfo.data,
        diaNome: diaInfo.diaNome,
        horario: hIni,
        horarioFim: hFim,
        status: 'pendente',
        observacao: `Ajuste pontual via Bia IA (${diaInfo.diaNome})`
      };
    });

    let msgIntro = '';
    if (clientes.length > 1) {
      const listaLojas = tarefasGeradas.map(t => `* **${t.horario} às ${t.horarioFim}:** **${t.clienteNome}**`).join('\n');
      msgIntro = `Com certeza! Preparei a alteração pontual no cronograma para **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})** com os atendimentos para **${padeiro.nome}**:\n\n${listaLojas}\n\nConfira os detalhes no card abaixo e clique em **Confirmar e Gravar no Cronograma** para aplicar.`;
    } else {
      msgIntro = `Com certeza! Preparei a alteração pontual no cronograma para atender a sua solicitação:\n\n` +
        `* **Padeiro:** ${padeiro.nome} (COD ${padeiro.codTec || '—'})\n` +
        `* **Loja / Cliente:** **${clientes[0].nomeFantasia || clientes[0].nome}**\n` +
        `* **Data:** **${diaInfo.diaNome}-feira (${this.formatarDataBr(diaInfo.data)})**\n` +
        `* **Horário:** ${horario} às ${horarioFim}\n`;

      if (isSubstituicao) {
        msgIntro += `\n*(Esta alteração substituirá o agendamento anterior em **${lojaAnterior}**)*\n`;
      }
      msgIntro += `\nConfira os detalhes no card abaixo e clique em **Confirmar e Gravar no Cronograma** para aplicar.`;
    }

    const nomesDesc = clientes.map(c => c.nomeFantasia || c.nome).join(' e ');

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
          id: clientes[0].id,
          nome: clientes[0].nomeFantasia || clientes[0].nome
        },
        clientes: clientes.map(c => ({ id: c.id, nome: c.nomeFantasia || c.nome })),
        tarefas: tarefasGeradas,
        data: diaInfo.data,
        diaNome: diaInfo.diaNome,
        dataBr: this.formatarDataBr(diaInfo.data),
        horario,
        horarioFim,
        observacao: `Ajuste pontual do gestor via Bia IA`,
        tarefa: tarefasGeradas[0],
        descricao: `Agendar ${padeiro.nome.split(' ')[0]} em ${nomesDesc} (${diaInfo.diaNome})`,
        confirmar: true
      },
      tipo: 'agendar_avulso',
      pendingCommand: null
    };
  },

  /**
   * Reconstitui comando pendente do histórico de mensagens caso não tenha sido enviado no estado
   */
  reconstruirComandoPendenteDoHistorico(history, { padeirosAtivos = [], clientesAtivos = [], cronogramaHistorico = [], weekOffset = 0 }) {
    if (!Array.isArray(history) || history.length < 2) return null;

    const ultimas = history.slice(-4);
    for (let i = ultimas.length - 1; i >= 0; i--) {
      const msg = ultimas[i];
      const txt = (msg.parts && msg.parts[0]?.text) || msg.text || '';
      const isPerguntaBia = msg.role === 'model' && (
        txt.includes('qual dia da semana') ||
        txt.includes('qual cliente ou loja') ||
        txt.includes('qual padeiro') ||
        txt.includes('Identifiquei o padeiro')
      );

      if (isPerguntaBia && i > 0) {
        const prevUser = ultimas[i - 1];
        const prevTxt = (prevUser.parts && prevUser.parts[0]?.text) || prevUser.text || '';
        if (prevTxt) {
          const prevNorm = this.normalizeText(prevTxt);
          const p = this.extrairPadeiro(prevNorm, padeirosAtivos);
          const clis = this.extrairClientes(prevNorm, clientesAtivos, cronogramaHistorico, p);
          const d = this.extrairDiaEData(prevNorm, weekOffset);
          const { horario, horarioFim } = this.extrairHorarios(prevNorm);

          if (p && clis.length > 0 && !d) {
            return {
              action: 'agendar_avulso',
              padeiro: { id: p.id, nome: p.nome, codTec: p.codTec || '' },
              cliente: { id: clis[0].id, nome: clis[0].nomeFantasia || clis[0].nome },
              clientes: clis.map(c => ({ id: c.id, nome: c.nomeFantasia || c.nome })),
              diaInfo: null,
              horario,
              horarioFim,
              missing: 'dia'
            };
          }
          if (p && d && clis.length === 0) {
            return {
              action: 'agendar_avulso',
              padeiro: { id: p.id, nome: p.nome, codTec: p.codTec || '' },
              cliente: null,
              clientes: [],
              diaInfo: d,
              horario,
              horarioFim,
              missing: 'cliente'
            };
          }
        }
      }
    }
    return null;
  },

  /**
   * Processador principal de comandos avulsos do gestor com suporte a preenchimento de lacunas (slot-filling)
   */
  processarComando(userMessage, context = {}, options = {}) {
    const norm = this.normalizeText(userMessage);

    // Ignora se for desfazer ou escala em lote
    const isDesfazer = (
      norm.includes('desfazer') ||
      norm.includes('desfaca') ||
      norm.includes('reverter') ||
      norm.includes('voltar atras') ||
      norm.includes('cancelar escala') ||
      norm.includes('apagar escala') ||
      norm.includes('remover escala')
    );
    if (isDesfazer) return null;

    const isEscalaEmLote = (
      norm.includes('alta performance') ||
      norm.includes('habitual') ||
      norm.includes('padrao') ||
      norm.includes('gerar escala') ||
      norm.includes('criar escala') ||
      norm.includes('fazer escala') ||
      norm.includes('faca a escala') ||
      norm.includes('crie a escala') ||
      norm.includes('montar escala') ||
      norm.includes('monte a escala')
    );
    if (isEscalaEmLote) {
      this.pendingCommand = null;
      return null;
    }

    const padeirosAtivos = context.padeirosAtivos || [];
    const clientesAtivos = context.clientesAtivos || [];
    const cronogramaHistorico = context.cronogramaHistorico || [];
    const weekOffset = (typeof Cronograma !== 'undefined' && Cronograma.weekOffset) || options.weekOffset || 0;

    // Recupera comando pendente (options, context, this ou reconstrução do histórico)
    let pending = options.pendingCommand || context.pendingCommand || this.pendingCommand || null;
    if (!pending && (context.history || options.history)) {
      pending = this.reconstruirComandoPendenteDoHistorico(context.history || options.history, {
        padeirosAtivos,
        clientesAtivos,
        cronogramaHistorico,
        weekOffset
      });
    }

    // SE HÁ UM COMANDO PENDENTE EM ANDAMENTO (Turno 2+):
    if (pending) {
      // 1. Cancelamento explícito pelo gestor
      const isCancela = (
        norm === 'cancela' || norm === 'cancelar' || norm === 'esquece' ||
        norm.includes('nao precisa') || norm.includes('deixa pra la') ||
        norm.includes('nao quero mais') || norm.includes('cancelar agendamento')
      );
      if (isCancela) {
        this.pendingCommand = null;
        return {
          text: 'Entendido, o agendamento foi cancelado. Se precisar de outra escala, alteração ou consulta, estou à disposição!',
          action: null,
          actionData: null,
          pendingCommand: null,
          tipo: 'cancelado'
        };
      }

      // 2. Extrai novos dados fornecidos nesta resposta
      const diaEncontrado = this.extrairDiaEData(norm, weekOffset);
      const padeiroEncontrado = this.extrairPadeiro(norm, padeirosAtivos);
      const clientesEncontrados = this.extrairClientes(norm, clientesAtivos, cronogramaHistorico, pending.padeiro || padeiroEncontrado);
      const horariosEncontrados = this.extrairHorarios(norm);

      // Preenche lacuna do DIA
      if (!pending.diaInfo && diaEncontrado) {
        pending.diaInfo = diaEncontrado;
      }
      // Preenche lacuna da LOJA / CLIENTE
      if ((!pending.clientes || pending.clientes.length === 0) && clientesEncontrados.length > 0) {
        pending.clientes = clientesEncontrados;
        pending.cliente = clientesEncontrados[0];
      } else if (clientesEncontrados.length > 0) {
        pending.clientes = clientesEncontrados;
        pending.cliente = clientesEncontrados[0];
      }
      // Preenche lacuna do PADEIRO
      if (!pending.padeiro && padeiroEncontrado) {
        pending.padeiro = { id: padeiroEncontrado.id, nome: padeiroEncontrado.nome, codTec: padeiroEncontrado.codTec || '' };
      }

      // Atualiza horários se fornecidos
      if (norm.includes(' as ') || norm.includes(' das ') || norm.includes(':')) {
        pending.horario = horariosEncontrados.horario;
        pending.horarioFim = horariosEncontrados.horarioFim;
      }

      // Verifica se todos os elementos essenciais foram preenchidos
      const temPadeiro = !!pending.padeiro;
      const temCliente = (pending.clientes && pending.clientes.length > 0) || !!pending.cliente;
      const temDia = !!pending.diaInfo;

      if (temPadeiro && temCliente && temDia) {
        const fullPadeiro = padeirosAtivos.find(p => p.id === pending.padeiro.id) || pending.padeiro;
        const fullClientes = (pending.clientes && pending.clientes.length > 0) ? pending.clientes : [pending.cliente];

        this.pendingCommand = null;
        return this.montarRespostaAgendamentoAvulso({
          padeiro: fullPadeiro,
          clientes: fullClientes,
          diaInfo: pending.diaInfo,
          horario: pending.horario || '08:00',
          horarioFim: pending.horarioFim || '17:00',
          cronogramaHistorico
        });
      }

      // Se ainda falta algum dado, reorienta de forma inteligente
      if (temPadeiro && !temDia) {
        this.pendingCommand = pending;
        const cliNome = pending.clientes?.[0]?.nomeFantasia || pending.clientes?.[0]?.nome || pending.cliente?.nome || 'o cliente';
        return {
          text: `Identifiquei o padeiro **${pending.padeiro.nome}** e a loja **${cliNome}**, mas para qual **dia da semana** (ex: *na sexta*, *amanhã*, *terça*) você gostaria de agendá-lo?`,
          action: 'comando_incompleto',
          actionData: { pendingCommand: pending },
          pendingCommand: pending,
          tipo: 'comando_incompleto'
        };
      }

      if (temPadeiro && !temCliente) {
        this.pendingCommand = pending;
        return {
          text: `Identifiquei o padeiro **${pending.padeiro.nome}** para **${pending.diaInfo.diaNome}-feira**, mas qual **cliente ou loja** ele deve atender?`,
          action: 'comando_incompleto',
          actionData: { pendingCommand: pending },
          pendingCommand: pending,
          tipo: 'comando_incompleto'
        };
      }
    }

    // PROCESSAMENTO DE NOVO COMANDO (Turno 1):
    const diaInfo = this.extrairDiaEData(norm, weekOffset);
    const padeiro = this.extrairPadeiro(norm, padeirosAtivos);
    const clientes = this.extrairClientes(norm, clientesAtivos, cronogramaHistorico, padeiro);
    const cliente = clientes.length > 0 ? clientes[0] : null;
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

    // 4. Caso Principal: Agendamento / Alocação Avulsa Completa (Padeiro + Dia + Lojas)
    if (padeiro && diaInfo && clientes.length > 0) {
      this.pendingCommand = null;
      return this.montarRespostaAgendamentoAvulso({
        padeiro,
        clientes,
        diaInfo,
        horario,
        horarioFim,
        cronogramaHistorico
      });
    }

    // 5. Caso: Comando incompleto (grava pendingCommand e solicita o dado faltante de forma clara)
    if (padeiro && diaInfo && !cliente) {
      const pendingCmd = {
        action: 'agendar_avulso',
        padeiro: { id: padeiro.id, nome: padeiro.nome, codTec: padeiro.codTec || '' },
        clientes: [],
        cliente: null,
        diaInfo,
        horario,
        horarioFim,
        missing: 'cliente'
      };
      this.pendingCommand = pendingCmd;
      return {
        text: `Identifiquei o padeiro **${padeiro.nome}** e o dia **${diaInfo.diaNome}-feira**, mas faltou indicar qual **cliente ou loja** ele deve atender.\n\nQual loja deseja agendar para ele? (Ex: *"Veneza"*, *"Big Box"*)`,
        action: 'comando_incompleto',
        actionData: { pendingCommand: pendingCmd },
        pendingCommand: pendingCmd,
        tipo: 'comando_incompleto'
      };
    }

    if (padeiro && cliente && !diaInfo) {
      const pendingCmd = {
        action: 'agendar_avulso',
        padeiro: { id: padeiro.id, nome: padeiro.nome, codTec: padeiro.codTec || '' },
        cliente: { id: cliente.id, nome: cliente.nomeFantasia || cliente.nome },
        clientes: clientes.map(c => ({ id: c.id, nome: c.nomeFantasia || c.nome })),
        diaInfo: null,
        horario,
        horarioFim,
        missing: 'dia'
      };
      this.pendingCommand = pendingCmd;
      return {
        text: `Identifiquei o padeiro **${padeiro.nome}** e a loja **${cliente.nomeFantasia || cliente.nome}**, mas para qual **dia da semana** você gostaria de agendá-lo? (Ex: *"na sexta"*, *"amanhã"*, *"terça"*)`,
        action: 'comando_incompleto',
        actionData: { pendingCommand: pendingCmd },
        pendingCommand: pendingCmd,
        tipo: 'comando_incompleto'
      };
    }

    if (!padeiro && cliente && diaInfo && (norm.includes('coloque') || norm.includes('coloca') || norm.includes('agende') || norm.includes('atender') || norm.includes('atenda'))) {
      const pendingCmd = {
        action: 'agendar_avulso',
        padeiro: null,
        cliente: { id: cliente.id, nome: cliente.nomeFantasia || cliente.nome },
        clientes: clientes.map(c => ({ id: c.id, nome: c.nomeFantasia || c.nome })),
        diaInfo,
        horario,
        horarioFim,
        missing: 'padeiro'
      };
      this.pendingCommand = pendingCmd;
      return {
        text: `Identifiquei a loja **${cliente.nomeFantasia || cliente.nome}** na **${diaInfo.diaNome}-feira**, mas qual **padeiro** da equipe você gostaria de agendar?`,
        action: 'comando_incompleto',
        actionData: { pendingCommand: pendingCmd },
        pendingCommand: pendingCmd,
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
