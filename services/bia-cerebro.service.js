/**
 * MÓDULO CÉREBRO DA BIA — COGNIÇÃO E INTELIGÊNCIA OPERACIONAL
 * SmartGestor — Brago Distribuidora
 * 
 * Centraliza e sintetiza todos os dados em tempo real da operação:
 * - Radiografia completa por filial (Brasília, Goiânia, Palmas, Campo Grande)
 * - Equipe técnica de padeiros, produtividade (Kg) e status
 * - Metas mensais cadastradas vs realizado (% atingimento)
 * - Escalas e cronogramas da semana (visitas, cobertura e ociosidade)
 * - Clientes atendidos, demanda e histórico
 * - Indicadores de qualidade (avaliações) e estoque nos clientes
 */

const {
  Padeiro,
  Cliente,
  Atividade,
  Cronograma,
  Meta,
  Avaliacao,
  EstoqueFaltante
} = require('../data/db-adapter');

class BiaCerebroService {
  /**
   * Normaliza o nome da filial para evitar discrepâncias (ex: "Brasília" vs "Brago Brasília")
   * e aceita UF/estado caso a filial direta não esteja definida no registro
   */
  static normalizarNomeFilial(nome, estado = '', cidade = '') {
    const n = (nome || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const uf = (estado || '').toString().trim().toUpperCase();
    const cid = (cidade || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (n.includes('bras') || n.includes('df') || uf === 'DF' || cid.includes('brasilia')) return 'Brago Brasília';
    if (n.includes('goia') || n.includes('gyn') || uf === 'GO' || cid.includes('goiania')) return 'Brago Goiania';
    if (n.includes('palm') || n.includes('tocant') || uf === 'TO' || cid.includes('palmas')) return 'Brago Palmas';
    if (n.includes('campo') || n.includes('ms') || uf === 'MS' || cid.includes('campo grande')) return 'Brago Campo Grande';
    return nome ? nome.trim() : (uf ? `Filial ${uf}` : '');
  }

  /**
   * Carrega um snapshot operacional consolidado e em tempo real do banco de dados
   */
  static async carregarSnapshotOperacional() {
    try {
      const [
        todosPadeiros,
        todosClientes,
        todasAtividades,
        todosCronogramas,
        todasMetas,
        todasAvaliacoes,
        estoquesFaltantes
      ] = await Promise.all([
        Padeiro.find({ deletado: { $ne: true } }),
        Cliente.find({}),
        Atividade.find({}),
        Cronograma.find({}),
        Meta.find({}),
        Avaliacao.find({}),
        EstoqueFaltante ? EstoqueFaltante.find({}) : []
      ]);

      // Filtrar contas de teste
      const padeirosReais = (todosPadeiros || []).filter(p => {
        if (!p) return false;
        const pNome = (p.nome || '').toLowerCase();
        if (pNome.includes('teste') || p.codTec === '971914') return false;
        return true;
      });

      return {
        padeiros: padeirosReais,
        clientes: (todosClientes || []).filter(c => c && c.ativo !== false),
        atividades: todasAtividades || [],
        cronogramas: todosCronogramas || [],
        metas: todasMetas || [],
        avaliacoes: todasAvaliacoes || [],
        estoquesFaltantes: estoquesFaltantes || []
      };
    } catch (err) {
      console.error('[BIA Cérebro] Erro ao carregar snapshot:', err);
      throw err;
    }
  }

  /**
   * Processa a radiografia operacional de todas as filiais
   */
  static processarRelatorioFiliais(snapshot) {
    const { padeiros, clientes, atividades, cronogramas, metas, avaliacoes } = snapshot;

    const agora = new Date();
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const hojeIso = agora.toISOString().split('T')[0];

    // Identificar semana atual (segunda a sábado)
    const base = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0);
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);
    const datasSemanaIso = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      datasSemanaIso.push(d.toISOString().split('T')[0]);
    }

    const filiaisPadrao = ['Brago Brasília', 'Brago Goiania', 'Brago Palmas', 'Brago Campo Grande'];
    const filiaisMap = new Map();

    filiaisPadrao.forEach(f => {
      filiaisMap.set(f, {
        nome: f,
        padeiros: [],
        clientes: [],
        atividadesMes: [],
        cronogramaSemana: [],
        metasMes: [],
        avaliacoes: []
      });
    });

    // 1. Agrupar Padeiros
    padeiros.forEach(p => {
      const fNorm = this.normalizarNomeFilial(p.filial);
      if (!filiaisMap.has(fNorm)) {
        filiaisMap.set(fNorm, {
          nome: fNorm || 'Outras Filiais',
          padeiros: [],
          clientes: [],
          atividadesMes: [],
          cronogramaSemana: [],
          metasMes: [],
          avaliacoes: []
        });
      }
      filiaisMap.get(fNorm).padeiros.push(p);
    });

    // 2. Agrupar Clientes (considerando filial direta, estado/UF ou cidade)
    clientes.forEach(c => {
      const fNorm = this.normalizarNomeFilial(c.filial, c.estado || c.uf, c.cidade);
      if (filiaisMap.has(fNorm)) {
        filiaisMap.get(fNorm).clientes.push(c);
      } else {
        // Se for cliente sem estado ou filial, vincula à matriz Brasília por padrão
        if (filiaisMap.has('Brago Brasília')) {
          filiaisMap.get('Brago Brasília').clientes.push(c);
        }
      }
    });

    // 3. Mapear Padeiro -> Filial para cruzar atividades, metas e cronogramas
    const padeiroFilialMap = new Map();
    padeiros.forEach(p => {
      const fNorm = this.normalizarNomeFilial(p.filial);
      if (p.id) padeiroFilialMap.set(String(p.id), fNorm);
      if (p.codTec) padeiroFilialMap.set(String(p.codTec), fNorm);
      if (p.nome) {
        const pNorm = (p.nome || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        padeiroFilialMap.set(`nome_${pNorm}`, fNorm);
      }
    });

    const resolverFilialPadeiro = (id, codTec, nome) => {
      if (id && padeiroFilialMap.has(String(id))) return padeiroFilialMap.get(String(id));
      if (codTec && padeiroFilialMap.has(String(codTec))) return padeiroFilialMap.get(String(codTec));
      if (nome) {
        const nNorm = (nome || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (padeiroFilialMap.has(`nome_${nNorm}`)) return padeiroFilialMap.get(`nome_${nNorm}`);
      }
      return null;
    };

    // 4. Agrupar Atividades (do mês e histórico acumulado)
    atividades.forEach(a => {
      const filialDoPadeiro = resolverFilialPadeiro(a.padeiroId, a.codTec, a.padeiroNome);
      if (filialDoPadeiro && filiaisMap.has(filialDoPadeiro)) {
        const fObj = filiaisMap.get(filialDoPadeiro);
        if (!fObj.atividadesTotal) fObj.atividadesTotal = [];
        fObj.atividadesTotal.push(a);

        if (a.data && a.data.startsWith(mesAtual)) {
          fObj.atividadesMes.push(a);
        }
      }
    });

    // 5. Agrupar Cronograma (semana atual e histórico acumulado)
    cronogramas.forEach(c => {
      const filialDoPadeiro = resolverFilialPadeiro(c.padeiroId, c.codTec, c.padeiroNome);
      if (filialDoPadeiro && filiaisMap.has(filialDoPadeiro)) {
        const fObj = filiaisMap.get(filialDoPadeiro);
        if (!fObj.cronogramaTotal) fObj.cronogramaTotal = [];
        fObj.cronogramaTotal.push(c);

        if (c.data && datasSemanaIso.includes(c.data)) {
          fObj.cronogramaSemana.push(c);
        }
      }
    });

    // 6. Agrupar Metas do mês
    metas.forEach(m => {
      const filialDoPadeiro = resolverFilialPadeiro(m.padeiroId, m.codTec, m.padeiroNome);
      if (filialDoPadeiro && filiaisMap.has(filialDoPadeiro)) {
        if (m.periodo === mesAtual) {
          filiaisMap.get(filialDoPadeiro).metasMes.push(m);
        }
      }
    });

    // 7. Agrupar Avaliações
    avaliacoes.forEach(av => {
      const filialDoPadeiro = resolverFilialPadeiro(av.padeiroId, av.codTec, av.padeiroNome);
      if (filialDoPadeiro && filiaisMap.has(filialDoPadeiro)) {
        filiaisMap.get(filialDoPadeiro).avaliacoes.push(av);
      }
    });

    // 8. Consolidar Indicadores de Cada Filial
    const relatorios = {};

    filiaisMap.forEach((dados, nomeFilial) => {
      const pads = dados.padeiros;
      const ativsMes = dados.atividadesMes || [];
      const ativsTotal = dados.atividadesTotal || [];
      const cronosSemana = dados.cronogramaSemana || [];
      const cronosTotal = dados.cronogramaTotal || [];
      const metasFilial = dados.metasMes || [];

      // Produção do mês
      const totalKgMes = ativsMes
        .filter(a => a.status === 'finalizada' || parseFloat(a.kgTotal) > 0)
        .reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0), 0);

      const atendimentosFinalizadosMes = ativsMes.filter(a => a.status === 'finalizada').length;
      const atendimentosNaoRealizadosMes = ativsMes.filter(a => a.status === 'nao_realizada' || a.status === 'cancelada').length;

      // Produção acumulada histórica
      const totalKgHistorico = ativsTotal
        .filter(a => a.status === 'finalizada' || parseFloat(a.kgTotal) > 0)
        .reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0), 0);
      const totalAtendimentosHistorico = ativsTotal.filter(a => a.status === 'finalizada').length;

      // Metas
      const metaKgTotal = metasFilial.reduce((sum, m) => sum + (parseFloat(m.metaKg) || 0), 0);
      const percAtingimentoMeta = metaKgTotal > 0 ? (totalKgMes / metaKgTotal) * 100 : null;

      // Cronograma da semana
      const totalVisitasSemana = cronosSemana.length;
      const padeirosComEscalaSemana = new Set(cronosSemana.map(c => String(c.padeiroId)));
      const padeirosSemEscalaSemana = pads.filter(p => !padeirosComEscalaSemana.has(String(p.id)));

      // Lojas atendidas no cronograma da semana
      const lojasAtendidasIds = new Set(cronosSemana.map(c => String(c.clienteId)));

      // Avaliação média
      const notas = dados.avaliacoes
        .map(av => parseFloat(av.nota || av.pontuacao || av.notaPadeiroCliente || 0))
        .filter(n => n > 0);
      const notaMedia = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : '4.5';

      // Ranking de padeiros da filial (baseado em histórico consolidado de atendimentos)
      const prodPorPadeiro = {};
      pads.forEach(p => {
        prodPorPadeiro[p.id] = { id: p.id, nome: p.nome, codTec: p.codTec, cargo: p.cargo || 'Padeiro', kg: 0, ativs: 0 };
      });
      ativsTotal.filter(a => a.status === 'finalizada' || parseFloat(a.kgTotal) > 0).forEach(a => {
        if (prodPorPadeiro[a.padeiroId]) {
          prodPorPadeiro[a.padeiroId].kg += (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
          prodPorPadeiro[a.padeiroId].ativs++;
        }
      });
      const rankingPadeirosFilial = Object.values(prodPorPadeiro).sort((a, b) => b.kg - a.kg);

      // Status diagnóstico
      let statusOperacional = 'Operação Ativa e Regular';
      const alertas = [];

      if (pads.length === 0) {
        statusOperacional = 'Sem Técnicos Ativos';
        alertas.push('Nenhum padeiro ativo cadastrado para esta filial.');
      } else {
        if (totalVisitasSemana === 0) {
          alertas.push(`Atenção: Nenhuma escala agendada no cronograma para a semana corrente (${cronosTotal.length} escalas no histórico geral).`);
        } else if (padeirosSemEscalaSemana.length > 0) {
          alertas.push(`${padeirosSemEscalaSemana.length} técnico(s) sem escalas agendadas para esta semana.`);
        }
        if (metaKgTotal > 0 && percAtingimentoMeta !== null && percAtingimentoMeta < 50 && agora.getDate() > 15) {
          alertas.push(`Ritmo de produção abaixo de 50% da meta após a metade do mês.`);
        }
      }

      relatorios[nomeFilial] = {
        nome: nomeFilial,
        mesAtual,
        totalPadeirosAtivos: pads.length,
        padeirosNomes: pads.map(p => p.nome),
        totalClientesCadastrados: dados.clientes.length,
        producaoMesKg: Math.round(totalKgMes * 10) / 10,
        atendimentosRealizadosMes: atendimentosFinalizadosMes,
        atendimentosNaoRealizadosMes,
        producaoHistoricaTotalKg: Math.round(totalKgHistorico * 10) / 10,
        totalAtendimentosHistorico,
        totalEscalasHistoricas: cronosTotal.length,
        metaMesKg: metaKgTotal,
        percAtingimentoMeta: percAtingimentoMeta !== null ? Math.round(percAtingimentoMeta * 10) / 10 : null,
        cronogramaSemana: {
          totalVisitasAgendadas: totalVisitasSemana,
          lojasCobertas: lojasAtendidasIds.size,
          padeirosEscalados: padeirosComEscalaSemana.size,
          padeirosOciososCount: padeirosSemEscalaSemana.length,
          padeirosOciososNomes: padeirosSemEscalaSemana.map(p => p.nome)
        },
        notaMediaQualidade: notaMedia,
        statusOperacional,
        alertas,
        topPadeiros: rankingPadeirosFilial.slice(0, 5)
      };
    });

    return relatorios;
  }

  /**
   * Obtém a radiografia aprofundada de uma filial específica
   * @param {string} nomeFilial - Ex: 'Brasília' ou 'Brago Brasília'
   */
  static async obterSituacaoFilial(nomeFilial = 'Brasília') {
    const snapshot = await this.carregarSnapshotOperacional();
    const relatorios = this.processarRelatorioFiliais(snapshot);
    const chave = this.normalizarNomeFilial(nomeFilial);
    return relatorios[chave] || relatorios['Brago Brasília'] || null;
  }

  /**
   * Constrói o texto detalhado e aprofundado do briefing do Cérebro para alimentar o LLM Gemini
   */
  static async construirBriefingCerebroOperacional(reqUser = null, mensagemUsuario = '') {
    const snapshot = await this.carregarSnapshotOperacional();
    const filiais = this.processarRelatorioFiliais(snapshot);

    const bsb = filiais['Brago Brasília'] || {};
    const gyn = filiais['Brago Goiania'] || {};
    const plm = filiais['Brago Palmas'] || {};
    const cgr = filiais['Brago Campo Grande'] || {};

    const msgNorm = (mensagemUsuario || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Se o usuário perguntou especificamente de Brasília ou outra praça, dá foco prioritário
    const pediuBrasilia = msgNorm.includes('bras') || msgNorm.includes('df');
    const pediuGoiania = msgNorm.includes('goia') || msgNorm.includes('gyn');
    const pediuPalmas = msgNorm.includes('palm') || msgNorm.includes('tocant');

    let secaoFoco = '';
    if (pediuBrasilia) {
      secaoFoco = `
[DETALHAMENTO PROFUNDO DA FILIAL DE BRASÍLIA]:
- Nome Operacional: Brago Brasília
- Equipe Técnica Ativa (${bsb.totalPadeirosAtivos} padeiros reais): ${bsb.padeirosNomes?.join(', ') || 'Sem dados'}
- Produção Realizada no Mês (${bsb.mesAtual}): ${bsb.producaoMesKg || 0} kg (${bsb.atendimentosRealizadosMes || 0} atendimentos finalizados)
- Metas Vigentes da Filial: ${bsb.metaMesKg ? `${bsb.metaMesKg} kg (${bsb.percAtingimentoMeta}% atingido)` : 'Metas em definição/consolidação'}
- Escala e Cronograma da Semana:
  * Visitas Agendadas: ${bsb.cronogramaSemana?.totalVisitasAgendadas || 0} visitas distribuídas de segunda a sábado
  * Lojas Cobertas: ${bsb.cronogramaSemana?.lojasCobertas || 0} lojas
  * Técnicos com Escala Ativa: ${bsb.cronogramaSemana?.padeirosEscalados || 0}
  * Técnicos sem Escala nesta Semana: ${bsb.cronogramaSemana?.padeirosOciososCount || 0} ${bsb.cronogramaSemana?.padeirosOciososNomes?.length ? `(${bsb.cronogramaSemana.padeirosOciososNomes.join(', ')})` : ''}
- Indicador de Qualidade: Nota média dos clientes: ${bsb.notaMediaQualidade}
- Alertas e Gargalos Identificados: ${bsb.alertas?.length ? bsb.alertas.join('; ') : 'Operação em conformidade, sem gargalos críticos'}
`;
    }

    const briefing = `
[CÉREBRO DO SMART GESTOR - RADIOGRAFIA OPERACIONAL COMPLETA]:
${secaoFoco}
[PANORAMA GERAL DAS FILIAIS]:
1. BRAGO BRASÍLIA:
   - Padeiros Ativos: ${bsb.totalPadeirosAtivos || 0} técnicos | Clientes: ${bsb.totalClientesCadastrados || 0}
   - Produção no Mês: ${bsb.producaoMesKg || 0} kg (${bsb.atendimentosRealizadosMes || 0} visitas concluídas)
   - Meta Mensal: ${bsb.metaMesKg ? `${bsb.metaMesKg} kg` : 'Em consolidação'} | Escalas Semanais Agendadas: ${bsb.cronogramaSemana?.totalVisitasAgendadas || 0}
   - Status: ${bsb.statusOperacional} ${bsb.alertas?.length ? `(Alertas: ${bsb.alertas.join(' | ')})` : ''}

2. BRAGO GOIÂNIA:
   - Padeiros Ativos: ${gyn.totalPadeirosAtivos || 0} técnicos | Clientes: ${gyn.totalClientesCadastrados || 0}
   - Produção no Mês: ${gyn.producaoMesKg || 0} kg (${gyn.atendimentosRealizadosMes || 0} visitas concluídas)
   - Escalas Semanais: ${gyn.cronogramaSemana?.totalVisitasAgendadas || 0} visitas agendadas | Status: ${gyn.statusOperacional}

3. BRAGO PALMAS:
   - Padeiros Ativos: ${plm.totalPadeirosAtivos || 0} técnicos | Produção: ${plm.producaoMesKg || 0} kg | Escalas: ${plm.cronogramaSemana?.totalVisitasAgendadas || 0} visitas

4. BRAGO CAMPO GRANDE:
   - Padeiros Ativos: ${cgr.totalPadeirosAtivos || 0} técnicos | Produção: ${cgr.producaoMesKg || 0} kg | Escalas: ${cgr.cronogramaSemana?.totalVisitasAgendadas || 0} visitas

[DIRETRIZ DE RESPOSTA SOBRE SITUAÇÃO DE FILIAL]:
- Ao responder sobre a situação de uma filial (ex.: Brasília), apresente um panorama executivo completo, técnico e estruturado:
  1. Força de Trabalho (total de padeiros e quem são);
  2. Produção e Volume no mês (kg produzidos e atendimentos);
  3. Status do Cronograma (visitas da semana e se há técnicos desocupados);
  4. Metas e Indicadores de Qualidade;
  5. Conclusão/Diagnóstico operacional com recomendações objetivas.
- Mantenha tom estritamente corporativo, analítico e sem emojis.
`;

    return briefing;
  }

  /**
   * Normaliza texto (minúsculo, sem acento) para comparações tolerantes
   */
  static _norm(txt) {
    return (txt || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /**
   * Segunda-feira (YYYY-MM-DD) da semana de uma data ISO
   */
  static _segundaDaSemana(dataIso) {
    const d = new Date(`${dataIso}T12:00:00`);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Extrai o período solicitado para geração de escala (intervalo de dias, mês inteiro ou datas específicas)
   * Suporta: "do dia 12 ao dia 16", "dia 12 a 16 de outubro", "escala do mês", "escala deste mês", etc.
   */
  static extrairPeriodoEscala(texto) {
    if (!texto) return null;
    const norm = (texto || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0 a 11

    const mesesNomes = {
      'janeiro': 0, 'fevereiro': 1, 'marco': 2, 'abril': 3,
      'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
      'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
    };

    // 1. INTERVALO ESPECÍFICO DE DIAS (ex: 'dia 12 ao dia 16', '12 a 16', 'dia 12 ate 16')
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
          // Segunda a Sábado (dow 1 a 6)
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

    // 2. ESCALA DO MÊS INTEIRO (ex: 'escala do mes', 'escala deste mes', 'escala de outubro', 'mes todo')
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
  }


  /**
   * Consulta a escala REAL de um padeiro lendo exclusivamente a tabela do Cronograma.
   * Nunca monta proposta nem inventa clientes: só informa o que está agendado.
   *
   * Ordem de busca:
   *  1. Semana corrente (segunda a sábado)
   *  2. Se vazia, a próxima semana com tarefas agendadas
   *  3. Se não houver futuras, a última semana com registro
   *  4. Sem nenhum registro no cronograma
   *
   * @param {string} termoBusca - Nome, código técnico ou ID do padeiro
   */
  static async obterEscalaSemanalPadeiro(termoBusca) {
    if (!termoBusca) return null;
    const snapshot = await this.carregarSnapshotOperacional();
    const { padeiros, cronogramas } = snapshot;
    const termo = this._norm(termoBusca);

    // 1. Localizar o padeiro
    const padeiro = (padeiros || []).find(p => {
      if (!p) return false;
      const nome = this._norm(p.nome);
      if (String(p.id) === termoBusca || String(p.codTec) === termo || nome === termo) return true;
      const partes = nome.split(/\s+/).filter(w => w.length > 3 && !['padeiro', 'teste', 'silva', 'santos', 'sousa', 'souza', 'oliveira'].includes(w));
      return partes.some(parte => termo.includes(parte)) || termo.includes(nome);
    });
    if (!padeiro) return null;

    const nomeP = this._norm(padeiro.nome);
    const primeirosDois = nomeP.split(/\s+/).slice(0, 2).join(' ');

    // 2. Tarefas do padeiro no cronograma (vínculo por ID, código técnico ou nome)
    const tarefas = (cronogramas || []).filter(c => {
      if (!c || !c.data) return false;
      if (c.padeiroId && String(c.padeiroId) === String(padeiro.id)) return true;
      if (c.codTec && String(c.codTec) === String(padeiro.codTec)) return true;
      const nc = this._norm(c.padeiroNome);
      return !!nc && (nc === nomeP || nc.startsWith(primeirosDois) || nomeP.startsWith(nc));
    });

    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const segundaAtual = this._segundaDaSemana(hojeIso);

    const semanas = [...new Set(tarefas.map(t => this._segundaDaSemana(t.data)))].sort();

    let tipo;
    let segundaAlvo = null;
    if (semanas.includes(segundaAtual)) {
      tipo = 'semana_atual';
      segundaAlvo = segundaAtual;
    } else if (semanas.some(s => s > segundaAtual)) {
      tipo = 'proxima_semana';
      segundaAlvo = semanas.find(s => s > segundaAtual);
    } else if (semanas.length > 0) {
      tipo = 'ultima_semana';
      segundaAlvo = semanas[semanas.length - 1];
    } else {
      return {
        tipo: 'sem_registros',
        padeiro,
        totalTarefas: 0,
        totalRegistrosCronograma: 0,
        escalaPorDia: []
      };
    }

    // 3. Montar grade segunda a sábado da semana alvo com as tarefas REAIS
    const nomesDias = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const escalaPorDia = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(`${segundaAlvo}T12:00:00`);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const doDia = tarefas
        .filter(t => t.data === iso)
        .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
        .map(t => ({
          cliente: t.clienteNome || 'Cliente não informado',
          horario: t.horario || null,
          horarioFim: t.horarioFim || null,
          status: t.status || 'pendente'
        }));
      escalaPorDia.push({
        diaNome: nomesDias[i],
        dataIso: iso,
        diaMes: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        tarefas: doDia
      });
    }

    return {
      tipo,
      padeiro,
      totalTarefas: escalaPorDia.reduce((s, d) => s + d.tarefas.length, 0),
      totalRegistrosCronograma: tarefas.length,
      semanaInicio: escalaPorDia[0].diaMes,
      semanaFim: escalaPorDia[5].diaMes,
      escalaPorDia
    };
  }

  /**
   * Converte o resultado de obterEscalaSemanalPadeiro em texto simples dia a dia
   */
  static formatarEscalaPadeiro(info) {
    if (!info) return '';
    if (!info.escalaPorDia || !info.escalaPorDia.length) {
      return '* Nenhuma tarefa registrada no cronograma.';
    }
    const rotuloStatus = { pendente: 'pendente', em_andamento: 'em andamento', finalizada: 'concluída', nao_realizada: 'não realizada', solicitado: 'solicitada' };
    const linhas = (info.escalaPorDia || []).map(d => {
      if (!d.tarefas.length) return `* ${d.diaNome} (${d.diaMes}): sem atendimento agendado`;
      const lojas = d.tarefas.map(t => {
        const h = t.horario ? ` (${t.horario}${t.horarioFim ? ' às ' + t.horarioFim : ''})` : '';
        const s = t.status && t.status !== 'pendente' ? ` - ${rotuloStatus[t.status] || t.status}` : '';
        return `${t.cliente}${h}${s}`;
      }).join(' | ');
      return `* ${d.diaNome} (${d.diaMes}): ${lojas}`;
    });
    return linhas.join('\n');
  }
}

module.exports = BiaCerebroService;
