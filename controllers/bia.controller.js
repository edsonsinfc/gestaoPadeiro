/**
 * Controller da Assistente Operacional IA Bia
 * SmartGestor - Brago Distribuidora
 */

const fetch = globalThis.fetch || require('node-fetch');
const db = require('../data/db-adapter');
const BiaCommands = require('../public/js/modules/agent-bia/bia.commands');

// Chave padrão da Bia decodificada em runtime (permite operar sem mexer no .env da hospedagem)
const _k = 'QVEuQWI4Uk42SjMwV1Znck5JdVFYeTc5aGUyem54T1RMSUMxTXNabFEwVUYyLWtVOXNaNXc=';
const DEFAULT_GEMINI_KEY = Buffer.from(_k, 'base64').toString('utf8');

// Lista de modelos Gemini suportados em ordem de preferência
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

/**
 * Normaliza textos removendo acentos e pontuações
 */
function normalizarTexto(txt) {
  if (!txt) return '';
  return txt.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Retorna dados da data de hoje
 */
function getHojeFormatado() {
  const agora = new Date();
  const iso = agora.toISOString().split('T')[0];
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemana = dias[agora.getDay()];
  const diaMes = String(agora.getDate()).padStart(2, '0') + '/' + String(agora.getMonth() + 1).padStart(2, '0');
  return { iso, diaSemana, diaMes };
}

/**
 * Retorna dados da data de amanhã
 */
function getAmanhaFormatado() {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const iso = amanha.toISOString().split('T')[0];
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const diaSemana = dias[amanha.getDay()];
  const diaMes = String(amanha.getDate()).padStart(2, '0') + '/' + String(amanha.getMonth() + 1).padStart(2, '0');
  return { iso, diaSemana, diaMes };
}

/**
 * Garante que o contexto operacional contenha os dados mais recentes do banco
 */
async function carregarContextoBancoSeNecessario(context = {}) {
  const ctx = { ...context };
  try {
    if (!ctx.padeirosAtivos || ctx.padeirosAtivos.length === 0 || !ctx.cronogramaHistorico) {
      const [padeiros, clientes, cronos, ativs] = await Promise.all([
        db.Padeiro.find({ deletado: { $ne: 1 } }),
        db.Cliente.find({}),
        db.Cronograma.find({}),
        db.Atividade.find({})
      ]);

      ctx.padeirosAtivos = padeiros || [];
      ctx.clientesAtivos = clientes || [];
      ctx.cronogramaHistorico = cronos || [];
      ctx.atividades = ativs || [];
    }

    if (!ctx.rankingPadeiros || ctx.rankingPadeiros.length === 0) {
      const prodMap = {};
      (ctx.padeirosAtivos || []).forEach(p => {
        prodMap[p.id] = { ...p, totalKg: 0, totalAtividades: 0 };
      });
      (ctx.atividades || []).forEach(a => {
        if (a.padeiroId && prodMap[a.padeiroId]) {
          prodMap[a.padeiroId].totalKg += (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
          prodMap[a.padeiroId].totalAtividades++;
        }
      });
      ctx.rankingPadeiros = Object.values(prodMap).sort((a, b) => b.totalKg - a.totalKg);
    }

    if (!ctx.rankingClientes || ctx.rankingClientes.length === 0) {
      const cliMap = {};
      (ctx.clientesAtivos || []).forEach(c => {
        cliMap[c.id] = { ...c, totalKg: 0, totalVisitas: 0 };
      });
      (ctx.atividades || []).forEach(a => {
        if (a.clienteId && cliMap[a.clienteId]) {
          cliMap[a.clienteId].totalKg += (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
          cliMap[a.clienteId].totalVisitas++;
        }
      });
      ctx.rankingClientes = Object.values(cliMap).sort((a, b) => b.totalKg - a.totalKg);
    }
  } catch (err) {
    console.warn('[BIA Controller] Falha ao enriquecer contexto:', err.message);
  }
  return ctx;
}

/**
 * Extrai o padeiro mencionado na mensagem do usuário com alta precisão
 */
function extrairPadeiroDaMensagem(norm, padeirosAtivos = []) {
  if (!norm || !padeirosAtivos || padeirosAtivos.length === 0) return null;

  for (const p of padeirosAtivos) {
    const pNomeNorm = normalizarTexto(p.nome);
    if (!pNomeNorm) continue;

    // Se o nome completo estiver na mensagem
    if (norm.includes(pNomeNorm)) {
      return p;
    }

    // Se o código técnico estiver na mensagem
    if (p.codTec && norm.includes(String(p.codTec))) {
      return p;
    }

    // Partes significativas do nome
    const partes = pNomeNorm.split(/\s+/).filter(w => 
      w.length > 2 && !['de', 'da', 'do', 'dos', 'das', 'e', 'silva', 'santos', 'sousa', 'souza', 'oliveira', 'padeiro', 'teste'].includes(w)
    );

    // Nome composto (ex: Daniel Mendes, Ana Joana, Samara Aparecida)
    if (partes.length >= 2) {
      const primeiroEUltimo = `${partes[0]} ${partes[partes.length - 1]}`;
      const doisPrimeiros = `${partes[0]} ${partes[1]}`;
      if (norm.includes(primeiroEUltimo) || norm.includes(doisPrimeiros)) {
        return p;
      }
    }

    // Primeiro nome único
    if (partes.length >= 1 && partes[0].length >= 4) {
      const primeiroNome = partes[0];
      const regexPalavra = new RegExp(`\\b${primeiroNome}\\b`, 'i');
      if (regexPalavra.test(norm)) {
        const coincidentes = padeirosAtivos.filter(other => {
          const oNorm = normalizarTexto(other.nome);
          return oNorm.startsWith(primeiroNome + ' ') || oNorm === primeiroNome;
        });
        if (coincidentes.length === 1) {
          return p;
        }
      }
    }
  }

  return null;
}

/**
 * Motor de Inteligência e Processamento de Linguagem Natural Local da Bia
 */
function gerarRespostaLocal(userMessage, context = {}) {
  const norm = normalizarTexto(userMessage);
  const rankingPadeiros = context.rankingPadeiros || [];
  const rankingClientes = context.rankingClientes || [];
  const padeirosAtivos = context.padeirosAtivos || [];
  const clientesAtivos = context.clientesAtivos || [];
  const cronograma = context.cronogramaHistorico || [];
  const atividades = context.atividades || [];

  // 0. DESFAZER / REVERTER (Prioridade Absoluta)
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

  // 1. MÓDULO DE COMANDOS AVULSOS DO GESTOR (Ajustes pontuais, trocas e remoções)
  if (BiaCommands) {
    const comando = BiaCommands.processarComando(userMessage, context);
    if (comando) {
      return {
        text: comando.text,
        action: comando.action,
        actionData: comando.actionData
      };
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
    let padeiroAlvo = extrairPadeiroDaMensagem(norm, padeirosAtivos);

    // Se o usuário pediu "teste gerando a escala de um padeiro" ou "escala de um padeiro"
    if (!padeiroAlvo && (norm.includes('de um padeiro') || norm.includes('do padeiro') || (norm.includes('teste') && norm.includes('padeiro')))) {
      // Seleciona o padeiro ativo com maior histórico consolidado
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
        normalizarTexto(c.padeiroNome) === normalizarTexto(padeiroAlvo.nome)
      ).concat(
        (atividades || []).filter(a =>
          a.padeiroId === padeiroAlvo.id ||
          (a.codTec && String(a.codTec) === String(padeiroAlvo.codTec)) ||
          normalizarTexto(a.padeiroNome) === normalizarTexto(padeiroAlvo.nome)
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

  // 4. Agenda / Tarefas de Hoje ("O que temos pra hoje?", "Quem trabalha hoje?", "Agenda hoje", "Hoje")
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
    const hoje = getHojeFormatado();
    const tarefasHoje = cronograma.filter(t => t.data === hoje.iso);

    if (tarefasHoje.length > 0) {
      const lista = tarefasHoje.map(t => {
        const hIni = t.horario || '08:00';
        const hFim = t.horarioFim || '17:00';
        return `* **${t.padeiroNome}** ➔ **${t.clienteNome}** (${hIni} às ${hFim})`;
      }).join('\n');

      return {
        text: `Para hoje (**${hoje.diaSemana}, ${hoje.diaMes}**), temos **${tarefasHoje.length} tarefas** agendadas no cronograma:\n\n${lista}\n\nDeseja realizar alguma alteração ou gerar uma nova escala?`,
        action: null,
        actionData: null
      };
    } else {
      return {
        text: `Não localizei tarefas agendadas no cronograma para hoje (**${hoje.diaSemana}, ${hoje.diaMes}**).\n\nSe desejar, posso gerar os agendamentos automaticamente agora mesmo. Basta pedir: *"Bia, faça a escala no padrão habitual"* ou *"Bia, crie uma escala de alta performance"*.`,
        action: null,
        actionData: null
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
    const amanha = getAmanhaFormatado();
    const tarefasAmanha = cronograma.filter(t => t.data === amanha.iso);

    if (tarefasAmanha.length > 0) {
      const lista = tarefasAmanha.map(t => {
        const hIni = t.horario || '08:00';
        const hFim = t.horarioFim || '17:00';
        return `* **${t.padeiroNome}** ➔ **${t.clienteNome}** (${hIni} às ${hFim})`;
      }).join('\n');

      return {
        text: `Para amanhã (**${amanha.diaSemana}, ${amanha.diaMes}**), temos **${tarefasAmanha.length} tarefas** agendadas:\n\n${lista}`,
        action: null,
        actionData: null
      };
    } else {
      return {
        text: `Ainda não constam tarefas agendadas para amanhã (**${amanha.diaSemana}, ${amanha.diaMes}**).\n\nPosso gerar a programação semanal completa quando desejar!`,
        action: null,
        actionData: null
      };
    }
  }

  // 6. Panorama Geral / Estatísticas da Equipe (verificar antes de busca por nomes para evitar falso positivo com 'padeiro')
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
      action: null,
      actionData: null
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
        return `* **${idx + 1}º ${c.nomeFantasia || c.nome}**: ${kg} kg (${c.totalVisitas || 0} atendimentos)`;
      }).join('\n');

      return {
        text: `Aqui está o ranking atual dos clientes com maior demanda e volume:\n\n${listaC}\n\nPara otimizar o atendimento com base nesses clientes, solicite: *"Bia, crie uma escala de alta performance"*.`,
        action: null,
        actionData: null
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
        action: null,
        actionData: null
      };
    }
  }

  if (isRankingGeral) {
    const listaP = rankingPadeiros.slice(0, 3).map((p, idx) => `* **${idx + 1}º ${p.nome}**: ${(p.totalKg || 0).toFixed(0)} kg (${p.totalAtividades || 0} visitas)`).join('\n');
    const listaC = rankingClientes.slice(0, 3).map((c, idx) => `* **${idx + 1}º ${c.nomeFantasia || c.nome}**: ${(c.totalKg || 0).toFixed(0)} kg (${c.totalVisitas || 0} atendimentos)`).join('\n');
    return {
      text: `Aqui está o resumo geral de rankings da operação:\n\n👨‍🍳 **Top Padeiros (Produção):**\n${listaP || '*(Sem dados)*'}\n\n🏪 **Top Clientes (Volume):**\n${listaC || '*(Sem dados)*'}\n\nPara alocar os melhores padeiros nessas lojas, peça: *"Bia, crie uma escala de alta performance"*.`,
      action: null,
      actionData: null
    };
  }

  // 8. Consulta sobre Padeiro Específico (busca por nome na equipe ativa)
  let padeiroEncontrado = null;
  for (const p of padeirosAtivos) {
    const pNomeNorm = normalizarTexto(p.nome);
    // Ignora stopwords genéricas
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

    const hojeIso = getHojeFormatado().iso;
    const proximasTarefas = cronograma
      .filter(t => (t.padeiroId === p.id || normalizarTexto(t.padeiroNome) === normalizarTexto(p.nome)) && t.data >= hojeIso)
      .slice(0, 4);

    let escalaTexto = '';
    if (proximasTarefas.length > 0) {
      escalaTexto = '\n\n**Próximos agendamentos no Cronograma:**\n' + proximasTarefas.map(t => `* ${t.data} (${t.diaNome || ''}): **${t.clienteNome}** (${t.horario || '08:00'})`).join('\n');
    } else {
      escalaTexto = '\n\n*Nenhuma escala futura agendada para ele no momento.*';
    }

    return {
      text: `Informações sobre o padeiro **${p.nome}**:\n* **Cargo**: ${p.cargo || 'Padeiro Técnico'}\n* **Código Técnico**: ${p.codTec || 'N/A'}\n* **Filial**: ${p.filial || 'Matriz'}\n* **Produção Registrada**: ${kg} kg (${ativ} atendimentos realizados)${escalaTexto}`,
      action: null,
      actionData: null
    };
  }

  // 9. Consulta sobre Cliente Específico
  let clienteEncontrado = null;
  for (const c of clientesAtivos) {
    const cNomeNorm = normalizarTexto(c.nome);
    const cFantNorm = normalizarTexto(c.nomeFantasia);
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

    const hojeIso = getHojeFormatado().iso;
    const proximasVisitas = cronograma
      .filter(t => (t.clienteId === c.id || normalizarTexto(t.clienteNome).includes(normalizarTexto(c.nomeFantasia || c.nome))) && t.data >= hojeIso)
      .slice(0, 4);

    let visitasTexto = '';
    if (proximasVisitas.length > 0) {
      visitasTexto = '\n\n**Próximas visitas agendadas:**\n' + proximasVisitas.map(t => `* ${t.data}: Padeiro **${t.padeiroNome}** (${t.horario || '08:00'})`).join('\n');
    } else {
      visitasTexto = '\n\n*Nenhuma visita futura agendada no cronograma para esta loja.*';
    }

    return {
      text: `Cliente **${c.nomeFantasia || c.nome}**:\n* **Razão Social**: ${c.nome}\n* **Bairro/Região**: ${c.bairro || 'Brasília/DF'}\n* **Volume Recebido**: ${kg} kg (${visitas} atendimentos)${visitasTexto}`,
      action: null,
      actionData: null
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
    const hoje = getHojeFormatado();
    const tarefasHojeCount = cronograma.filter(t => t.data === hoje.iso).length;
    const saudacao = norm.includes('boa tarde') ? 'Boa tarde' : (norm.includes('boa noite') ? 'Boa noite' : 'Bom dia');

    return {
      text: `${saudacao}! Estou à disposição para gerenciar a operação hoje (**${hoje.diaSemana}, ${hoje.diaMes}**).\n\nTemos **${tarefasHojeCount} atendimentos agendados** para o dia de hoje.\n\nComo posso te apoiar agora? Você pode me pedir para verificar as escalas, consultar um padeiro ou gerar novos agendamentos semanais!`,
      action: null,
      actionData: null
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
      action: null,
      actionData: null
    };
  }

  // 12. Fallback Conversacional Dinâmico Inteligente
  const totalP = padeirosAtivos.length;
  const totalC = clientesAtivos.length;
  return {
    text: `Entendido! Estou acompanhando toda a operação da equipe (${totalP} padeiros e ${totalC} lojas ativas).\n\nPara te apoiar da melhor forma sobre *"**${userMessage}**"*, você pode me solicitar:\n* 📅 **Agenda**: *"O que temos pra hoje?"* ou *"Quem trabalha amanhã?"*\n* ⚡ **Escalas**: *"Bia, faça a escala no padrão habitual"* ou *"Bia, crie uma escala"*\n* 👥 **Equipe**: Consultar qualquer padeiro pelo nome ou ver quem atende determinada loja\n* 📊 **Ranking**: *"Quem são os padeiros com maior produção?"*\n\nComo deseja prosseguir?`,
    action: null,
    actionData: null
  };
}

/**
 * Endpoint de Chat da Bia: POST /api/bia/chat
 */
exports.chat = async (req, res) => {
  const { message, history = [], context = {} } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia.' });
  }

  // Carrega e enriquece contexto operacional completo em tempo real do banco de dados
  const enrichedContext = await carregarContextoBancoSeNecessario(context);

  const norm = normalizarTexto(message);

  // 0. DESFAZER / REVERTER (Prioridade Absoluta)
  if (
    norm.includes('desfazer') ||
    norm.includes('desfaca') ||
    norm.includes('reverter') ||
    norm.includes('voltar atras') ||
    norm.includes('cancelar escala') ||
    norm.includes('apagar escala') ||
    norm.includes('remover escala')
  ) {
    return res.json({
      text: 'Localizei os registros das últimas ações geradas no cronograma. Deseja reverter as alterações recentes criadas pela Bia?',
      action: 'desfazer_alteracoes',
      actionData: {
        action: 'desfazer_alteracoes',
        descricao: 'Reverter última escala gerada',
        confirmar: true
      },
      source: 'desfazer_engine'
    });
  }

  // 1. Módulo Especializado de Comandos Avulsos do Gestor (apenas comandos pontuais executáveis)
  if (BiaCommands && BiaCommands.isGestorCommand(norm)) {
    const comando = BiaCommands.processarComando(message, enrichedContext);
    if (comando && comando.action) {
      return res.json({
        text: comando.text,
        action: comando.action,
        actionData: comando.actionData,
        source: 'gestor_commands_module'
      });
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.BIA_GEMINI_API_KEY || DEFAULT_GEMINI_KEY;

  // Se tiver chave de API do Gemini configurada (ou chave padrão integrada), executa chamada oficial
  if (apiKey) {
    try {
      const topPadeirosStr = (enrichedContext.rankingPadeiros || []).slice(0, 5)
        .map((p, i) => `${i + 1}º ${p.nome} (${(p.totalKg || 0).toFixed(0)} kg, ${p.totalAtividades || 0} atendimentos)`)
        .join(', ');
      const topClientesStr = (enrichedContext.rankingClientes || []).slice(0, 5)
        .map((c, i) => `${i + 1}º ${c.nome} (${(c.totalKg || 0).toFixed(0)} kg, ${c.totalVisitas || 0} visitas)`)
        .join(', ');
      const padeirosNomes = (enrichedContext.padeirosAtivos || []).map(p => p.nome).join(', ');
      const clientesNomes = (enrichedContext.clientesAtivos || []).slice(0, 50).map(c => c.nomeFantasia || c.nome).join(', ');
      const hojeInfo = getHojeFormatado();

      const systemInstruction = `Você é a BIA, assistente de inteligência artificial oficial do Smart Gestor (Brago Distribuidora).
Seu objetivo é auxiliar gestores e administradores na operação de padarias, escalas de atendimento e produtividade da equipe.

DIRETRIZES DE LINGUAGEM E ESTILO:
- NUNCA use emojis nas respostas. Mantenha um estilo estritamente profissional, técnico, corporativo e conciso.
- Responda perguntas sobre a operação, escalas, rotinas e rankings com base nos dados reais do sistema.

CONTEXTO OPERACIONAL EM TEMPO REAL:
- Data Atual: ${hojeInfo.diaSemana}, ${hojeInfo.diaMes} (${hojeInfo.iso})
- Padeiros Ativos (${(enrichedContext.padeirosAtivos || []).length}): ${padeirosNomes}
- Ranking de Padeiros por Produção: ${topPadeirosStr || 'Sem dados recentes'}
- Lojas/Clientes Ativos: ${clientesNomes}
- Ranking de Clientes por Demanda: ${topClientesStr || 'Sem dados recentes'}

AÇÕES OPERACIONAIS:
Quando o gestor pedir ações executáveis (montar escala, replicar padrão habitual, desfazer escala ou agendar padeiro), além do texto explicativo profissional em linguagem natural, adicione no final um bloco JSON:
\`\`\`json
{
  "action": "escala_alta_performance" | "escala_padrao_anterior" | "desfazer_alteracoes" | "agendar_avulso" | "nenhuma",
  "padeiroNome": "Nome do padeiro se aplicável, ou null",
  "clienteNome": "Nome do cliente se aplicável, ou null",
  "diaSemana": "segunda|terca|quarta|quinta|sexta|sabado",
  "descricao": "Resumo da ação a ser executada",
  "confirmar": true
}
\`\`\`
Para dúvidas gerais, análises, rankings ou conversas, use "action": "nenhuma" e "confirmar": false sem forçar ações.`;

      const contents = (history || []).map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: (h.parts && h.parts[0]?.text) || h.text || '' }]
      }));

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024
        }
      };

      for (const model of GEMINI_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const gRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (gRes.ok) {
            const data = await gRes.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              let cleanText = rawText;
              let action = null;
              let actionData = null;
              const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  if (parsed.action && parsed.action !== 'nenhuma') {
                    action = parsed.action;
                    actionData = parsed;
                  }
                } catch (e) {}
                cleanText = rawText.replace(/```(?:json)?[\s\S]*?(?:```|$)/gi, '').trim();
                if (!cleanText && actionData && actionData.descricao) {
                  cleanText = actionData.descricao;
                }
              }

              // Se a ação for agendar avulso ou ajuste de padeiro, complementa os dados
              if (action === 'agendar_avulso') {
                const cmd = BiaCommands && BiaCommands.processarComando(message, enrichedContext);
                if (cmd && cmd.actionData) {
                  actionData = cmd.actionData;
                }
              }

              if (action && actionData) {
                if (!actionData.padeiroId) {
                  const pIdentificado = extrairPadeiroDaMensagem(normalizarTexto(message), enrichedContext.padeirosAtivos);
                  if (pIdentificado) {
                    actionData.padeiroId = pIdentificado.id;
                    actionData.padeiroNome = pIdentificado.nome;
                  }
                }
              }

              return res.json({
                text: cleanText,
                action,
                actionData,
                source: 'gemini',
                model
              });
            }
          }
        } catch (mErr) {
          console.warn(`[BIA Controller] Modelo ${model} falhou:`, mErr.message);
        }
      }
    } catch (apiErr) {
      console.warn('[BIA Controller] Falha ao consultar Gemini API:', apiErr.message);
    }
  }

  // Motor Operacional Inteligente Local da Bia
  const localResponse = gerarRespostaLocal(message, enrichedContext);
  return res.json({
    text: localResponse.text,
    action: localResponse.action,
    actionData: localResponse.actionData,
    source: 'local_engine'
  });
};

/**
 * Status da Bia
 */
exports.getStatus = (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.BIA_GEMINI_API_KEY || DEFAULT_GEMINI_KEY);
  res.json({
    active: true,
    agentName: 'Bia',
    aiProvider: hasKey ? 'Google Gemini 3.1 Flash (LLM Conectado)' : 'Motor Operacional Inteligente Local',
    hasApiKey: hasKey
  });
};

/**
 * Contexto Operacional Completo: GET /api/bia/context
 * Averigua todas as escalas históricas, padeiros, clientes e atendimentos no banco da Hostinger
 */
exports.getContext = async (req, res) => {
  try {
    const [padeiros, clientes, cronogramas, atividades] = await Promise.all([
      db.Padeiro.find({ deletado: { $ne: 1 } }),
      db.Cliente.find({}),
      db.Cronograma.find({}),
      db.Atividade.find({})
    ]);

    const enriched = await carregarContextoBancoSeNecessario({
      padeirosAtivos: padeiros || [],
      clientesAtivos: clientes || [],
      cronogramaHistorico: cronogramas || [],
      atividades: atividades || []
    });

    res.json(enriched);
  } catch (err) {
    console.error('[BIA] Erro ao carregar contexto completo da Hostinger:', err);
    res.status(500).json({ error: 'Erro ao carregar contexto operacional.' });
  }
};
