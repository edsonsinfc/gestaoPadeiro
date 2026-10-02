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
   * Gera uma resposta local inteligente e assertiva sem precisar de chaves externas
   */
  generateLocalFallback(userMessage, ctx = {}) {
    const lower = (userMessage || '').toLowerCase().trim();
    const rankingPadeiros = ctx.rankingPadeiros || [];
    const rankingClientes = ctx.rankingClientes || [];

    // 1. Desfazer / Reverter (Prioridade Máxima)
    if (
      lower.includes('desfazer') ||
      lower.includes('desfaça') ||
      lower.includes('desfaca') ||
      lower.includes('reverter') ||
      lower.includes('cancelar escala') ||
      lower.includes('apagar escala') ||
      lower.includes('remover escala')
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

    // 2. Escala Padrão Anterior
    if (
      lower.includes('padrão') ||
      lower.includes('padrao') ||
      lower.includes('anterior') ||
      lower.includes('habitual') ||
      lower.includes('replicar escala')
    ) {
      return {
        text: 'Entendido! Analisei o histórico de escalas anteriores da equipe. Preparei uma proposta replicando o **Padrão de Escala Anterior** habitual para os dias da semana.\n\nConfira os agendamentos sugeridos no card abaixo e clique em **Aplicar Escala no Cronograma** para confirmar.',
        action: 'escala_padrao_anterior',
        actionData: {
          action: 'escala_padrao_anterior',
          descricao: 'Escala replicando padrão anterior',
          confirmar: true
        }
      };
    }

    // 3. Escala de Alta Performance ou Solicitação Geral de Escala
    if (
      lower.includes('escala') ||
      lower.includes('cronograma') ||
      lower.includes('programação') ||
      lower.includes('programacao') ||
      lower.includes('montar escala') ||
      lower.includes('gerar escala') ||
      lower.includes('fazer escala') ||
      lower.includes('crie uma escala') ||
      lower.includes('criar uma escala') ||
      lower.includes('cria uma escala') ||
      lower.includes('alta performance')
    ) {
      return {
        text: 'Com certeza! Analisei os dados de produtividade da equipe e o histórico de demanda dos clientes ativos. Preparei uma proposta de **Escala de Alta Performance** para esta semana, priorizando os padeiros de maior volume nos clientes com maior fluxo.\n\nConfira a distribuição sugerida no card abaixo e clique em **Aplicar Escala no Cronograma** para confirmar.',
        action: 'escala_alta_performance',
        actionData: {
          action: 'escala_alta_performance',
          descricao: 'Escala de alta performance para a semana',
          confirmar: true
        }
      };
    }

    // 4. Ranking Padeiros
    if (
      lower.includes('padeiro') ||
      lower.includes('produz mais') ||
      lower.includes('produtividade') ||
      lower.includes('ranking')
    ) {
      if (rankingPadeiros.length > 0) {
        const lista = rankingPadeiros.slice(0, 5).map((p, idx) => {
          const kg = (p.totalKg || 0).toFixed(0);
          const ativ = p.totalAtividades || 0;
          return `* **${idx + 1}º ${p.nome}**: ${kg} kg produzidos (${ativ} atendimentos)`;
        }).join('\n');

        return {
          text: `Aqui está o ranking atual de produtividade dos padeiros ativos no sistema:\n\n${lista}\n\nSe desejar, posso criar uma escala de alta performance baseada nesses números. Basta solicitar: *"Bia, crie uma escala de alta performance"*.`,
          action: null,
          actionData: null
        };
      }
      return {
        text: 'Não foram encontrados registros recentes de produção para calcular o ranking no momento.',
        action: null,
        actionData: null
      };
    }

    // 5. Ranking Clientes
    if (
      lower.includes('cliente') ||
      lower.includes('maiores clientes') ||
      lower.includes('demanda') ||
      lower.includes('volume')
    ) {
      if (rankingClientes.length > 0) {
        const lista = rankingClientes.slice(0, 5).map((c, idx) => {
          const kg = (c.totalKg || 0).toFixed(0);
          const visitas = c.totalVisitas || 0;
          return `* **${idx + 1}º ${c.nome}**: ${kg} kg recebidos (${visitas} visitas registradas)`;
        }).join('\n');

        return {
          text: `Aqui estão os principais clientes por volume de atendimento:\n\n${lista}\n\nVocê pode gerar uma escala otimizada para esses clientes pedindo: *"Bia, crie uma escala de alta performance"*.`,
          action: null,
          actionData: null
        };
      }
      return {
        text: 'Não há dados suficientes de visitas e volume para listar os clientes no momento.',
        action: null,
        actionData: null
      };
    }

    // 6. Mensagem padrão
    return {
      text: 'Olá! Sou a **Bia**, sua assistente operacional. Como posso ajudar na operação hoje?\n\nExemplos de comandos:\n* *"Bia, crie uma escala"*\n* *"Bia, faça a escala no padrão anterior"*\n* *"Quem são os padeiros com maior produção?"*\n* *"Desfazer última alteração"*',
      action: null,
      actionData: null
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
            const parsed = this.parseActionFromResponse(rawResponse, userMessage);
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
  parseActionFromResponse(rawText, userPrompt) {
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

    // Fallback inteligente baseado nas palavras-chave do prompt do usuário
    const lower = (userPrompt || '').toLowerCase();
    if (!action) {
      if (
        lower.includes('desfazer') ||
        lower.includes('desfaça') ||
        lower.includes('desfaca') ||
        lower.includes('reverter') ||
        lower.includes('cancelar escala') ||
        lower.includes('apagar escala') ||
        lower.includes('desfazer alteraç') ||
        lower.includes('desfazer alterac')
      ) {
        action = 'desfazer_alteracoes';
      } else if (
        lower.includes('padrão de escala') ||
        lower.includes('padrao de escala') ||
        lower.includes('padrão anterior') ||
        lower.includes('padrao anterior') ||
        lower.includes('escala que já foi feita') ||
        lower.includes('replicar escala')
      ) {
        action = 'escala_padrao_anterior';
      } else if (
        lower.includes('escala') ||
        lower.includes('alta performance') ||
        lower.includes('alta perfomance') ||
        lower.includes('crie uma escala') ||
        lower.includes('criar uma escala') ||
        lower.includes('fazer uma escala') ||
        lower.includes('gerar escala') ||
        lower.includes('montar escala') ||
        lower.includes('mais produ')
      ) {
        action = 'escala_alta_performance';
      }
    }

    return { cleanText, action, actionData };
  }
};

if (typeof window !== 'undefined') {
  window.BiaAPI = BiaAPI;
}
