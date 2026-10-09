/**
 * SERVIÇO DE SÍNTESE DE VOZ (TTS) - BIA AGENT
 * SmartGestor - Brago Distribuidora
 * Integração ElevenLabs com Sanitização de Texto e Suporte a Vozes Femininas em PT-BR
 */

const https = require('https');

// Chave fornecida pelo usuário / ambiente
const DEFAULT_KEY = process.env.ELEVENLABS_API_KEY || 'sk_75a5efc2845be1169b12d7549fce7a0f2fdd8302193d9d50';

// Voz feminina recomendada (Sarah / Rachel / Laura com suporte ao modelo eleven_multilingual_v2)
// Default: Sarah (EXAVITQu4vr4xnSDxMaL) ou Rachel (21m00Tcm4TlvDq8ikWAM)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

/**
 * Sanitiza o texto da Bia para garantir uma locução natural e fluida:
 * - Remove marcações markdown, blocos JSON, blocos <pensamento>
 * - Converte abreviações como kg, R$, % para fala
 */
function sanitizarTextoParaFala(texto) {
  if (!texto || typeof texto !== 'string') return '';

  let limpo = texto;

  // 1. Remover blocos de pensamento
  limpo = limpo.replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '');

  // 2. Remover blocos de código e blocos JSON
  limpo = limpo.replace(/```[\s\S]*?```/gi, '');
  limpo = limpo.replace(/`([^`]+)`/g, '$1');

  // 3. Remover emojis
  limpo = limpo.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu, '');

  // 4. Remover cabeçalhos e formatações markdown
  limpo = limpo.replace(/^#{1,6}\s+/gm, '');
  limpo = limpo.replace(/\*\*([^*]+)\*\*/g, '$1');
  limpo = limpo.replace(/\*([^*]+)\*/g, '$1');
  limpo = limpo.replace(/__([^_]+)__/g, '$1');
  limpo = limpo.replace(/_([^_]+)_/g, '$1');
  limpo = limpo.replace(/~~([^~]+)~~/g, '$1');
  limpo = limpo.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 5. Linhas de tabelas ou separadores
  limpo = limpo.replace(/\|/g, ', ');
  limpo = limpo.replace(/[-]{3,}/g, '');

  // 6. Marcadores de lista
  limpo = limpo.replace(/^\s*[-*•]\s+/gm, '');
  limpo = limpo.replace(/^\s*\d+\.\s+/gm, '');

  // 7. Substituições operacionais para pronúncia correta em português
  limpo = limpo.replace(/\b(\d+)\s*kg\b/gi, '$1 quilos');
  limpo = limpo.replace(/\bkg\b/gi, 'quilos');
  limpo = limpo.replace(/R\$\s*(\d+([.,]\d+)?)/gi, '$1 reais');
  limpo = limpo.replace(/%/g, ' por cento');
  limpo = limpo.replace(/&/g, ' e ');
  limpo = limpo.replace(/@/g, ' arroba ');

  // 8. Espaços e quebras de linha excessivas
  limpo = limpo.replace(/\n{2,}/g, '. ');
  limpo = limpo.replace(/\n/g, ' ');
  limpo = limpo.replace(/\s{2,}/g, ' ').trim();

  // 9. Limite de segurança de caracteres por fala para manter agilidade (máx ~1200 caracteres)
  if (limpo.length > 1200) {
    const pontuacao = limpo.lastIndexOf('.', 1200);
    if (pontuacao > 400) {
      limpo = limpo.slice(0, pontuacao + 1);
    } else {
      limpo = limpo.slice(0, 1200) + '...';
    }
  }

  return limpo;
}

/**
 * Sintetiza o texto em áudio via ElevenLabs API
 * @param {string} texto
 * @param {object} opcoes { apiKey, voiceId, modelId }
 * @returns {Promise<Buffer>} Buffer do áudio MP3
 */
async function sintetizarVozElevenLabs(texto, opcoes = {}) {
  const textoLimpo = sanitizarTextoParaFala(texto);
  if (!textoLimpo) {
    throw new Error('Texto vazio após sanitização.');
  }

  let apiKey = opcoes.apiKey || DEFAULT_KEY;
  const voiceId = opcoes.voiceId || DEFAULT_VOICE_ID;
  const modelId = opcoes.modelId || 'eleven_multilingual_v2';

  // Se a chave não tem sk_ e é a chave do usuário, tenta com ela direta e se necessário testa com sk_
  const candidateKeys = [apiKey];
  if (!apiKey.startsWith('sk_')) {
    candidateKeys.push(`sk_${apiKey}`);
  }

  let lastError = null;

  for (const key of candidateKeys) {
    try {
      const buffer = await fazerRequisicaoElevenLabs(textoLimpo, voiceId, modelId, key);
      return {
        buffer,
        textoFalado: textoLimpo,
        formato: 'audio/mpeg'
      };
    } catch (err) {
      lastError = err;
      // Se não for erro de autenticação, não tenta a próxima chave
      if (!err.message || !err.message.includes('401')) {
        break;
      }
    }
  }

  throw lastError || new Error('Falha ao autenticar na ElevenLabs.');
}

/**
 * Faz a chamada HTTP direta para o endpoint da ElevenLabs
 */
function fazerRequisicaoElevenLabs(text, voiceId, modelId, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(bodyBuffer);
        } else {
          let errMsg = `Status ${res.statusCode}`;
          try {
            const parsed = JSON.parse(bodyBuffer.toString('utf8'));
            errMsg = parsed.detail?.message || parsed.message || errMsg;
          } catch (_) {
            errMsg = bodyBuffer.toString('utf8').slice(0, 200);
          }
          reject(new Error(`ElevenLabs Error (${res.statusCode}): ${errMsg}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

module.exports = {
  sanitizarTextoParaFala,
  sintetizarVozElevenLabs,
  DEFAULT_VOICE_ID
};
