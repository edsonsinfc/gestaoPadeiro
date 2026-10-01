/**
 * BIA AGENT - CLIENTE API GOOGLE GEMINI
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
      .map((p, i) => `${i + 1}º ${p.nome} (${p.totalKg.toFixed(0)} kg, ${p.totalAtividades} atendimentos)`)
      .join(', ');

    const topClientes = (ctx.rankingClientes || []).slice(0, 5)
      .map((c, i) => `${i + 1}º ${c.nome} (${c.totalKg.toFixed(0)} kg, ${c.totalVisitas} visitas)`)
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
   * Envia uma mensagem do usuário para o modelo Gemini com fallback automático
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

    const briefing = this.buildSystemBriefing(systemContext);
    const systemPrompt = `${BIA_CONFIG.systemInstruction}\n${briefing}`;

    // 2. Adicionar mensagem do usuário ao histórico local
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // 3. Montar payload do Gemini
    const contents = [
      ...this.conversationHistory
    ];

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    // 4. Executar chamada com fallback entre os modelos
    let rawResponse = null;
    let modelUsed = null;
    let lastError = null;

    for (const model of BIA_CONFIG.models) {
      try {
        const url = `${BIA_CONFIG.apiBaseUrl}/${model}:generateContent?key=${BIA_CONFIG.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          rawResponse = data.candidates[0].content.parts[0].text;
          modelUsed = model;
          break;
        } else {
          lastError = (data.error && data.error.message) || `HTTP ${res.status}`;
          console.warn(`[BIA] Modelo ${model} falhou:`, lastError);
        }
      } catch (err) {
        lastError = err.message;
        console.warn(`[BIA] Erro de rede com ${model}:`, err);
      }
    }

    if (!rawResponse) {
      // Remover a última mensagem do usuário do histórico para não quebrar a sequência
      this.conversationHistory.pop();
      throw new Error(lastError || 'Não foi possível obter resposta da Bia no momento.');
    }

    // Salvar resposta da Bia no histórico
    this.conversationHistory.push({
      role: 'model',
      parts: [{ text: rawResponse }]
    });

    // 5. Analisar se a resposta contém uma Ação Estruturada
    const parsed = this.parseActionFromResponse(rawResponse, userMessage);

    return {
      text: parsed.cleanText,
      action: parsed.action,
      actionData: parsed.actionData,
      raw: rawResponse,
      modelUsed
    };
  },

  /**
   * Extrai blocos de ação e determina se deve invocar as funções locais de escala
   */
  parseActionFromResponse(rawText, userPrompt) {
    let cleanText = rawText;
    let action = null;
    let actionData = null;

    // Detectar JSON de ação na resposta
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
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
      // Limpa o bloco JSON do texto para uma leitura amigável
      cleanText = rawText.replace(/```json[\s\S]*?```/g, '').trim();
    }

    // Fallback inteligente baseado nas palavras-chave do prompt do usuário
    const lower = (userPrompt || '').toLowerCase();
    if (!action) {
      if (lower.includes('alta perfomance') || lower.includes('alta performance') || (lower.includes('mais produ') && lower.includes('escala'))) {
        action = 'escala_alta_performance';
      } else if (lower.includes('padrão de escala') || lower.includes('padrao de escala') || lower.includes('padrão anterior') || lower.includes('padrao anterior') || lower.includes('escala que já foi feita')) {
        action = 'escala_padrao_anterior';
      } else if (
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
      }
    }

    return { cleanText, action, actionData };
  }
};

if (typeof window !== 'undefined') {
  window.BiaAPI = BiaAPI;
}
