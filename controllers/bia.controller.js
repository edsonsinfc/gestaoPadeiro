/**
 * Controller da Assistente Operacional IA Bia
 * SmartGestor - Brago Distribuidora
 */

const fetch = globalThis.fetch || require('node-fetch');

// Lista de modelos Gemini suportados em ordem de preferência
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro'
];

/**
 * Heurística inteligente local caso Gemini não esteja configurado ou oscile
 */
function gerarRespostaLocal(userMessage, context = {}) {
  const lower = (userMessage || '').toLowerCase().trim();
  const rankingPadeiros = context.rankingPadeiros || [];
  const rankingClientes = context.rankingClientes || [];

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
      text: 'Entendido! Analisei todo o histórico operacional e de escalas registradas desde Junho/2026. Mapeei os hábitos e clientes mais frequentes de cada padeiro para cada dia da semana e preparei a proposta da **Escala Padrão Habitual**.\n\nConfira os agendamentos sugeridos no card abaixo e clique em **Aplicar no Cronograma do Sistema** para confirmar.',
      action: 'escala_padrao_anterior',
      actionData: {
        action: 'escala_padrao_anterior',
        descricao: 'Escala replicando padrão anterior habitual desde Junho/2026',
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

  // 4. Consulta de Padeiros / Ranking
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

  // 5. Consulta de Clientes / Volume
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

  // 6. Resposta Padrão de Ajuda
  return {
    text: `Olá! Eu sou a **Bia**, assistente operacional de inteligência artificial do Smart Gestor.\n\nPosso ajudar você com as seguintes operações:\n* **Criar escala de alta performance**: Aloca os padeiros mais produtivos nos clientes de maior demanda (*"Bia, crie uma escala"*).\n* **Replicar escala anterior**: Mantém o padrão de rotina que a equipe já costuma fazer (*"Bia, faça a escala no padrão anterior"*).\n* **Consultar rankings**: Verifique produtividade de padeiros e clientes (*"Quem são os padeiros com maior produção?"*).\n* **Desfazer alterações**: Reverte a última escala gerada (*"Desfazer última escala"*).\n\nComo deseja prosseguir?`,
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.BIA_GEMINI_API_KEY || '';

  // Se tiver chave de API do Gemini configurada no servidor, tenta a chamada oficial
  if (apiKey) {
    try {
      const systemInstruction = `Você é a BIA, assistente de inteligência artificial oficial do Smart Gestor (Brago Distribuidora).
Seu objetivo é auxiliar gestores na operação de padarias, escalas de atendimento e produtividade.
NUNCA use emojis nas respostas. Mantenha um estilo corporativo, claro e conciso.
Quando o usuário pedir para criar, montar, sugerir ou refazer escalas, além do texto explicativo profissional, adicione no final um bloco json:
\`\`\`json
{
  "action": "escala_alta_performance" | "escala_padrao_anterior" | "desfazer_alteracoes" | "nenhuma",
  "descricao": "Resumo da ação",
  "confirmar": true
}
\`\`\``;

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
          temperature: 0.6,
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
              // Parse de ação
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
                cleanText = rawText.replace(/```json[\s\S]*?```/g, '').trim();
              }

              // Fallback de detecção se o LLM não incluiu JSON
              if (!action) {
                const local = gerarRespostaLocal(message, context);
                if (local.action) {
                  action = local.action;
                  actionData = local.actionData;
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

  // Fallback Inteligente Local (Garante que nunca ocorra erro 400 de unregistered caller)
  const localResponse = gerarRespostaLocal(message, context);
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
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.BIA_GEMINI_API_KEY);
  res.json({
    active: true,
    agentName: 'Bia',
    aiProvider: hasKey ? 'Google Gemini + Fallback Local' : 'Motor Operacional Inteligente Local',
    hasApiKey: hasKey
  });
};
