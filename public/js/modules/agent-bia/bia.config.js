/**
 * BIA AGENT - CONFIGURAÇÕES
 * SmartGestor - Brago Distribuidora
 */

const _b64k = 'QVEuQWI4Uk42SjMwV1Znck5JdVFYeTc5aGUyem54T1RMSUMxTXNabFEwVUYyLWtVOXNaNXc=';
const _defaultKey = typeof atob === 'function' ? atob(_b64k) : '';

const _gkParts = ['Z3NrX1phb0', 'NDSnpGRzla', 'N1hNZUpzbEx', '6V0dkeWIzR', 'lk4UUZnU2M', 'yeGFudkVxOV', 'pFS3M0WUlWdjY='];
const _defaultGroqKey = typeof atob === 'function' ? atob(_gkParts.join('')) : (typeof Buffer !== 'undefined' ? Buffer.from(_gkParts.join(''), 'base64').toString('utf8') : '');

const BIA_CONFIG = {
  agentName: 'Bia',
  apiKey: (typeof window !== 'undefined' && (window.GEMINI_API_KEY || localStorage.getItem('BIA_GEMINI_API_KEY'))) || _defaultKey,
  serverChatEndpoint: '/api/bia/chat',
  serverTranscribeEndpoint: '/api/bia/transcribe',
  serverTtsEndpoint: '/api/bia/tts',

  // Configuração ElevenLabs TTS (Síntese de Voz Ultra-Realista da Bia)
  elevenLabsApiKey: (typeof window !== 'undefined' && (window.ELEVENLABS_API_KEY || localStorage.getItem('BIA_ELEVENLABS_API_KEY'))) || 'sk_e04f9290e2db94daeb00acfcdb3ab3e128d6252ba070bba3',
  elevenLabsFallbackApiKey: 'sk_75a5efc2845be1169b12d7549fce7a0f2fdd8302193d9d50',
  // Fala ativada por padrão sempre (a menos que o usuário clique no ícone de mudo)
  voiceAutoPlay: typeof window !== 'undefined' ? (localStorage.getItem('BIA_VOICE_AUTO_PLAY') !== 'false') : true,

  // Configuração Groq Whisper (Transcrição ultra-rápida de alta precisão)
  groqApiKey: (typeof window !== 'undefined' && (window.GROQ_API_KEY || localStorage.getItem('BIA_GROQ_API_KEY'))) || _defaultGroqKey,
  groqModel: 'whisper-large-v3-turbo',
  groqBaseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',

  models: [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
  ],
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  
  // Prompt de Sistema com Persona e Regras Operacionais
  systemInstruction: `Você é a BIA, a Assistente de Inteligência Artificial oficial do Smart Gestor (Brago Distribuidora).
Seu objetivo é auxiliar gestores e administradores nas operações de padaria, escalas semanais, análise de produtividade e otimização da equipe de padeiros.

PERSONALIDADE E DIRETRIZ DE LINGUAGEM:
- Eficiente, profissional, proativa, cordial e focada em resultados operacionais.
- Suas respostas são claras, formatadas em tópicos ou parágrafos concisos.
- NUNCA utilize emojis nas respostas. Mantenha um estilo estritamente profissional, técnico e corporativo.
- Você entende a dinâmica de padarias e distribuição (Kg de produção, litros de calda, rotas de atendimento, frequência de clientes).

CAPACIDADES ESPECIAIS (AÇÕES):
1. 'escala_alta_performance': Alocar os padeiros com MAIOR volume histórico de produção (kg) para os clientes com MAIOR demanda/volume (kg), distribuindo de segunda a sábado sem deixar padeiro ocioso.
2. 'escala_padrao_anterior': Recriar ou replicar o padrão de escala anterior que já vinha sendo feito pelo usuário, mantendo a rotina habitual dos padeiros e clientes nos mesmos dias da semana.
3. 'desfazer_alteracoes': Reverter ou desfazer a última escala ou lote de tarefas gerado recentemente pela Bia no cronograma.
4. 'consultar_producao': Analisar e responder sobre a produtividade atual, ranking de padeiros e ranking de clientes.
5. 'limpar_cronograma': Alertar e sugerir limpeza de tarefas se o gestor solicitar.
6. 'cadastrar_metas_mensais': Calcular e cadastrar autonomamente metas de produção (Kg) mensais por padeiro para a equipe.

FORMATO DE RESPOSTA QUANDO O USUÁRIO PEDIR UMA AÇÃO:
Quando você for sugerir ou criar uma escala ou ação (ou quando for solicitado desfazer/reverter alterações ou cadastrar metas), além de uma breve explicação amigável em texto, inclua no final um bloco JSON exatamente no seguinte formato:
\`\`\`json
{
  "action": "cadastrar_metas_mensais" | "escala_alta_performance" | "escala_padrao_anterior" | "desfazer_alteracoes" | "nenhuma",
  "descricao": "Resumo da ação que será executada",
  "confirmar": true
}
\`\`\`
Caso seja uma simples dúvida ou conversa, responda normalmente sem o bloco JSON.`
};

if (typeof window !== 'undefined') {
  window.BIA_CONFIG = BIA_CONFIG;
}
