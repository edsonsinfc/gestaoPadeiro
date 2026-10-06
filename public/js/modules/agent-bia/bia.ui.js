/**
 * BIA AGENT - INTERFACE APPLE HIG
 * SmartGestor - Brago Distribuidora
 */

const BiaUI = {
  isOpen: false,
  isProcessing: false,
  lastPreparedScale: null,

  // SVG da Estrela com Estrelinha Pequena do Lado (Apple Intelligence / Sparkle)
  starIconSvg: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Estrela Principal de 4 pontas -->
      <path d="M10 2C10.5 6.5 13.5 9.5 18 10C13.5 10.5 10.5 13.5 10 18C9.5 13.5 6.5 10.5 2 10C6.5 9.5 9.5 6.5 10 2Z" fill="#FFFFFF"/>
      <!-- Estrelinha pequena do lado -->
      <path d="M19 13.5C19.3 15.2 20.3 16.2 22 16.5C20.3 16.8 19.3 17.8 19 19.5C18.7 17.8 17.7 16.8 16 16.5C17.7 16.2 18.7 15.2 19 13.5Z" fill="#FFFFFF" opacity="0.95"/>
    </svg>
  `,

  /**
   * Verifica se o usuário atual tem permissão (apenas gestor e admin)
   */
  isAuthorized() {
    const user = (typeof API !== 'undefined' && API.getUser && API.getUser());
    if (!user || !user.role) return false;
    const allowedRoles = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'];
    return allowedRoles.includes(user.role);
  },

  /**
   * Inicializa e injeta o botão flutuante e o modal no DOM
   */
  init() {
    if (!this.isAuthorized()) return;
    if (document.getElementById('bia-trigger-btn')) return;

    this.renderTriggerButton();
    this.renderModal();
    this.bindEvents();

    // Mensagem de boas-vindas inicial
    setTimeout(() => {
      this.addBiaMessage(`Olá! Eu sou a **Bia**, assistente operacional de inteligência artificial do Smart Gestor.

Como posso ajudar na operação hoje? Exemplos de comandos:
- *"Bia, crie uma escala de alta performance"*
- *"Bia, faça uma escala seguindo o padrão de escala"*
- *"Quem são os padeiros com maior produção?"*`);
    }, 500);
  },

  /**
   * Renderiza a bolinha com gradiente da aba cronograma e o SVG das estrelas
   */
  renderTriggerButton() {
    const btn = document.createElement('button');
    btn.id = 'bia-trigger-btn';
    btn.className = 'bia-trigger-btn';
    btn.setAttribute('aria-label', 'Abrir assistente Bia');
    btn.title = 'Bia - Assistente Operacional IA';
    btn.innerHTML = `
      <div class="bia-trigger-icon">
        ${this.starIconSvg}
      </div>
      <span class="bia-badge-hint">IA</span>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleModal();
    });

    document.body.appendChild(btn);
  },

  /**
   * Renderiza a estrutura do Modal no estilo Apple HIG
   */
  renderModal() {
    const overlay = document.createElement('div');
    overlay.id = 'bia-modal-overlay';
    overlay.className = 'bia-modal-overlay';
    overlay.innerHTML = `
      <div class="bia-modal-card" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="bia-header">
          <div class="bia-header-profile">
            <div class="bia-avatar">
              ${this.starIconSvg}
              <div class="bia-avatar-dot"></div>
            </div>
            <div class="bia-header-info">
              <span class="bia-title">
                Bia
                <svg class="bia-verified-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </span>
              <span class="bia-subtitle">
                <span style="color:#34C759;">●</span> Assistente Operacional IA
              </span>
            </div>
          </div>
          <div class="bia-header-actions">
            <button class="bia-btn-circle" id="bia-btn-clear" title="Limpar conversa">
              <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
            </button>
            <button class="bia-btn-circle" id="bia-btn-close" title="Fechar">
              <i data-lucide="x" style="width: 17px; height: 17px;"></i>
            </button>
          </div>
        </div>

        <!-- Sugestões Rápidas (Chips Apple HIG com Lucide Icons) -->
        <div class="bia-suggestions-bar">
          <div class="bia-chip" data-prompt="Bia crie uma escala de alta perfomance">
            <i data-lucide="zap" style="width: 13px; height: 13px;"></i> Alta Performance
          </div>
          <div class="bia-chip" data-prompt="Bia faça uma escala seguindo o padrão de escala">
            <i data-lucide="calendar" style="width: 13px; height: 13px;"></i> Padrão Habitual
          </div>
          <div class="bia-chip" data-prompt="Bia desfaça a última escala criada">
            <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i> Desfazer Escala
          </div>
          <div class="bia-chip" data-prompt="Quem são os padeiros com maior produção neste mês?">
            <i data-lucide="trending-up" style="width: 13px; height: 13px;"></i> Top Padeiros
          </div>
          <div class="bia-chip" data-prompt="Quais são os clientes com maior volume de atendimento?">
            <i data-lucide="building-2" style="width: 13px; height: 13px;"></i> Top Clientes
          </div>
        </div>

        <!-- Mensagens -->
        <div class="bia-messages-body" id="bia-messages-body"></div>

        <!-- Input Bar -->
        <div class="bia-input-area">
          <div id="bia-listening-indicator" class="bia-listening-indicator" style="display:none;">
            <div class="bia-audio-waves">
              <span class="bia-wave-bar"></span><span class="bia-wave-bar"></span><span class="bia-wave-bar"></span><span class="bia-wave-bar"></span>
            </div>
            <span class="bia-listening-text" id="bia-listening-text">Ouvindo... fale seu comando</span>
            <button type="button" class="bia-btn-stop-listening" id="bia-btn-stop-listening" title="Parar e Enviar" aria-label="Parar gravação">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
            </button>
          </div>
          <form id="bia-input-form" class="bia-input-box" onsubmit="event.preventDefault();">
            <input 
              type="text" 
              id="bia-input-field" 
              class="bia-input-field" 
              placeholder="Digite ou toque no microfone e fale..." 
              autocomplete="off"
            />
            <button type="button" id="bia-btn-mic" class="bia-btn-mic" title="Segure para falar" aria-label="Segure para falar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
            </button>
            <button type="submit" id="bia-btn-send" class="bia-btn-send" title="Enviar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      </div>
    `;

    overlay.addEventListener('click', () => this.closeModal());
    document.body.appendChild(overlay);
  },

  /**
   * Conecta eventos de clique, envio de formulário e chips
   */
  bindEvents() {
    const closeBtn = document.getElementById('bia-btn-close');
    const clearBtn = document.getElementById('bia-btn-clear');
    const form = document.getElementById('bia-input-form');
    const input = document.getElementById('bia-input-field');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (typeof BiaAPI !== 'undefined') BiaAPI.clearHistory();
        const body = document.getElementById('bia-messages-body');
        if (body) body.innerHTML = '';
        this.addBiaMessage('Histórico reiniciado. O que faremos agora?');
      });
    }

    if (form) {
      form.addEventListener('submit', () => {
        const text = input.value.trim();
        if (text) {
          input.value = '';
          this.handleUserSubmit(text);
        }
      });
    }

    const micBtn = document.getElementById('bia-btn-mic');
    if (micBtn) {
      // Push-to-Talk: segura = grava, solta = envia
      const onPressStart = (e) => {
        e.preventDefault();
        this.startPTT();
      };
      const onPressEnd = (e) => {
        e.preventDefault();
        this.stopPTT();
      };
      micBtn.addEventListener('pointerdown', onPressStart);
      micBtn.addEventListener('pointerup', onPressEnd);
      micBtn.addEventListener('pointerleave', onPressEnd);
      micBtn.addEventListener('touchstart', onPressStart, { passive: false });
      micBtn.addEventListener('touchend', onPressEnd, { passive: false });
      micBtn.addEventListener('touchcancel', onPressEnd, { passive: false });
    }

    // Chips
    document.querySelectorAll('.bia-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          this.handleUserSubmit(prompt);
        }
      });
    });
  },

  toggleModal() {
    if (this.isOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  },

  openModal() {
    if (!this.isAuthorized()) return;
    const overlay = document.getElementById('bia-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      this.isOpen = true;
      if (window.lucide) lucide.createIcons();
      const input = document.getElementById('bia-input-field');
      if (input) setTimeout(() => input.focus(), 300);
      this.scrollToBottom();
    }
  },

  closeModal() {
    this.stopVoice();
    this.setListeningUI(false);
    const overlay = document.getElementById('bia-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      this.isOpen = false;
    }
  },

  /**
   * Push-to-Talk via MediaRecorder.
   * Segure o botão para gravar; solte para enviar o áudio à Bia via Gemini.
   */
  isListening: false,
  _pttMediaRecorder: null,
  _pttChunks: [],
  _pttStream: null,
  _pttActive: false,

  async startPTT() {
    if (this._pttActive || this.isProcessing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this._pttStream = stream;
      this._pttChunks = [];

      // Seleciona o melhor mimeType suportado
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        ''
      ].find(t => t === '' || MediaRecorder.isTypeSupported(t)) || '';

      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      this._pttMediaRecorder = recorder;
      this._pttActive = true;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this._pttChunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Para as faixas do microfone
        if (this._pttStream) {
          this._pttStream.getTracks().forEach(t => t.stop());
          this._pttStream = null;
        }
        this._pttActive = false;
        this.setListeningUI(false);

        if (this._pttChunks.length === 0) {
          console.warn('[BIA PTT] Nenhum dado de áudio capturado.');
          return;
        }

        const blob = new Blob(this._pttChunks, { type: recorder.mimeType || 'audio/webm' });
        this._pttChunks = [];

        if (blob.size < 500) {
          console.warn('[BIA PTT] Áudio muito curto, ignorando.');
          return;
        }

        // Converte para Base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result; // data:audio/webm;base64,<data>
            const b64 = result.split(',')[1];
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const resolvedMime = recorder.mimeType || 'audio/webm';
        console.log('[BIA PTT] Enviando áudio para transcrição, tamanho (bytes):', blob.size, 'mime:', resolvedMime);

        this.showTypingIndicator();
        this.addUserMessage('🎙️ Áudio enviado...');

        this.isProcessing = true;
        try {
          const response = await BiaAPI.sendMessage(null, { audio: base64, mimeType: resolvedMime });
          this.removeTypingIndicator();
          this.addBiaMessage(response.text, { pensamento: response.pensamento });

          if (response.action === 'escala_alta_performance') {
            await this.handleEscalaAltaPerformance(response.actionData);
          } else if (response.action === 'escala_padrao_anterior') {
            await this.handleEscalaPadraoAnterior(response.actionData);
          } else if (response.action === 'desfazer_alteracoes') {
            await this.handleDesfazerUltimaAcao();
          } else if (response.action === 'agendar_avulso') {
            await this.handleAgendarAvulso(response.actionData);
          } else if (response.action === 'remover_avulso') {
            await this.handleRemoverAvulso(response.actionData);
          }
        } catch (err) {
          this.removeTypingIndicator();
          console.error('[BIA PTT] Erro ao processar áudio:', err);
          this.addBiaMessage(`⚠️ Não consegui processar o áudio: ${err.message || 'Tente novamente.'}`);
        } finally {
          this.isProcessing = false;
        }
      };

      recorder.start();
      this.setListeningUI(true, 'Gravando... solte para enviar');
    } catch (err) {
      this._pttActive = false;
      this.setListeningUI(false);
      console.error('[BIA PTT] Erro ao acessar microfone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.addBiaMessage('Permissão do microfone negada. Libere o microfone nas configurações do app.');
      } else {
        this.addBiaMessage('Não consegui acessar o microfone. Digite o comando.');
      }
    }
  },

  stopPTT() {
    if (!this._pttActive) return;
    if (this._pttMediaRecorder && this._pttMediaRecorder.state !== 'inactive') {
      this.setListeningUI(true, 'Processando...');
      try { this._pttMediaRecorder.stop(); } catch (e) { console.warn('[BIA PTT] Erro ao parar gravação:', e); }
    }
  },

  // Mantidos como compat stubs para não quebrar refs externas
  toggleVoice() {},
  startVoice() {},
  stopVoice() { this.stopPTT(); },

  async startNativeVoice(NativeSR) {
    const input = document.getElementById('bia-input-field');
    try {
      const avail = await NativeSR.available();
      if (!avail || !avail.available) {
        this.addBiaMessage('Reconhecimento de voz indisponível neste aparelho. Digite o comando.');
        return;
      }
      let perm = await NativeSR.checkPermissions();
      if (perm.speechRecognition !== 'granted') perm = await NativeSR.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        this.addBiaMessage('Permissão do microfone negada. Libere o microfone nas configurações do app.');
        return;
      }

      let capturedText = '';
      let isFinalizing = false;
      let finalizeTimer = null;
      let maxDurationTimer = null;

      const finishAndSubmit = async (reason = 'auto') => {
        if (isFinalizing) return;
        isFinalizing = true;

        if (finalizeTimer) { clearTimeout(finalizeTimer); finalizeTimer = null; }
        if (maxDurationTimer) { clearTimeout(maxDurationTimer); maxDurationTimer = null; }
        this.nativeStop = null;

        // Fecha a UI de escuta imediatamente
        this.setListeningUI(false);

        // Envia parada nativa com tolerância a falhas
        try { NativeSR.stop(); } catch (e) {}

        // Aguarda breve intervalo para limpar listeners sem bloquear o fluxo
        setTimeout(async () => {
          try { await NativeSR.removeAllListeners(); } catch (e) {}
        }, 300);

        // Obtém o texto capturado ou que ficou no input
        const text = (capturedText || (input ? input.value : '') || '').trim();
        if (input) input.value = '';

        if (text) {
          console.log('[BIA Voice] Enviando comando capturado (' + reason + '):', text);
          this.handleUserSubmit(text);
        } else if (reason === 'manual_stop') {
          console.log('[BIA Voice] Microfone parado sem texto detectado.');
        }
      };

      // Limpa listeners antigos
      try { await NativeSR.removeAllListeners(); } catch (e) {}

      // Listener de resultados parciais e finais
      await NativeSR.addListener('partialResults', (d) => {
        if (d && d.matches && d.matches.length > 0) {
          const match = d.matches[0];
          if (match && match.trim()) {
            capturedText = match.trim();
            if (input) input.value = capturedText;
          }
        }
      });

      // Listener de estado de escuta do Android (ex: fim da fala / silêncio)
      await NativeSR.addListener('listeningState', (d) => {
        if (d && d.status === 'stopped') {
          if (!isFinalizing) {
            this.setListeningUI(true, 'Processando áudio...');
            if (finalizeTimer) clearTimeout(finalizeTimer);
            // Aguarda 350ms para garantir chegada do onResults final do Android antes de submeter
            finalizeTimer = setTimeout(() => {
              finishAndSubmit('end_of_speech');
            }, 350);
          }
        }
      });

      // Função chamada ao clicar no botão de parar
      this.nativeStop = () => {
        if (isFinalizing) return;
        // Atualiza a interface na hora: feedback imediato ao usuário
        this.setListeningUI(true, 'Finalizando áudio...');
        try { NativeSR.stop(); } catch (e) {}
        // Aguarda 250ms para receber o último resultado do reconhecimento e envia
        setTimeout(() => {
          finishAndSubmit('manual_stop');
        }, 250);
      };

      this.setListeningUI(true, 'Ouvindo... fale seu comando');

      // Watchdog de segurança: 20 segundos máximos de escuta contínua
      maxDurationTimer = setTimeout(() => {
        if (!isFinalizing) finishAndSubmit('timeout');
      }, 20000);

      const res = await NativeSR.start({ language: 'pt-BR', maxResults: 1, partialResults: true, popup: false });
      if (res && res.matches && res.matches[0]) {
        capturedText = res.matches[0];
        if (input) input.value = capturedText;
      }
    } catch (err) {
      console.warn('[BIA] Voz nativa falhou:', err);
      this.setListeningUI(false);
      this.nativeStop = null;
      this.addBiaMessage('Não consegui acessar o microfone. Digite o comando.');
    }
  },

  startVoice() {
    if (this.isProcessing || this.isListening) return;
    const NativeSR = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
    if (NativeSR) {
      this.startNativeVoice(NativeSR);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.addBiaMessage('Seu dispositivo não suporta reconhecimento de voz. Digite o comando.');
      return;
    }

    const input = document.getElementById('bia-input-field');
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    this.recognition = rec;
    let finalText = '';

    rec.onstart = () => this.setListeningUI(true, 'Ouvindo... fale seu comando');
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      if (input) input.value = (finalText + interim).trim();
    };
    rec.onerror = (e) => {
      this.setListeningUI(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.addBiaMessage('Permissão do microfone negada. Libere o acesso ao microfone nas configurações do app.');
      } else if (e.error === 'no-speech') {
        if (typeof Components !== 'undefined' && Components.toast) Components.toast('Não ouvi nada. Tente novamente.', 'info');
      }
    };
    rec.onend = () => {
      this.setListeningUI(false);
      const text = (finalText || (input && input.value) || '').trim();
      if (text) {
        if (input) input.value = '';
        this.handleUserSubmit(text);
      }
    };

    try { rec.start(); } catch (err) { this.setListeningUI(false); }
  },

  stopVoice() {
    if (!this.isListening) {
      this.setListeningUI(false);
      return;
    }

    if (this.nativeStop) {
      this.nativeStop();
      return;
    }

    if (this.recognition) {
      this.setListeningUI(false);
      try { this.recognition.stop(); } catch (e) {}
      return;
    }

    this.setListeningUI(false);
  },

  setListeningUI(on, statusText = null) {
    this.isListening = on;
    const mic = document.getElementById('bia-btn-mic');
    const ind = document.getElementById('bia-listening-indicator');
    const textEl = document.getElementById('bia-listening-text');
    const box = document.getElementById('bia-input-form');
    if (mic) {
      mic.classList.toggle('listening', on);
      mic.classList.toggle('ptt-recording', on && this._pttActive);
    }
    if (ind) {
      ind.style.display = on ? 'flex' : 'none';
      if (textEl && statusText) textEl.textContent = statusText;
      else if (textEl) textEl.textContent = 'Gravando... solte para enviar';
    }
    if (box) box.classList.toggle('bia-listening', on);
  },

  /**
   * Envia a mensagem do usuário e processa resposta e ações da IA
   */
  async handleUserSubmit(message) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // 1. Exibir balão do usuário
    this.addUserMessage(message);
    this.showTypingIndicator();

    try {
      // 2. Chamar o serviço de IA da Bia
      const response = await BiaAPI.sendMessage(message);
      this.removeTypingIndicator();

      // 3. Exibir balão da Bia com Caminho de Pensamento
      this.addBiaMessage(response.text, { pensamento: response.pensamento });

      // 4. Executar ação correspondente se detectada
      if (response.action === 'escala_alta_performance') {
        await this.handleEscalaAltaPerformance(response.actionData);
      } else if (response.action === 'escala_padrao_anterior') {
        await this.handleEscalaPadraoAnterior(response.actionData);
      } else if (response.action === 'desfazer_alteracoes') {
        await this.handleDesfazerUltimaAcao();
      } else if (response.action === 'agendar_avulso') {
        await this.handleAgendarAvulso(response.actionData);
      } else if (response.action === 'remover_avulso') {
        await this.handleRemoverAvulso(response.actionData);
      }

    } catch (err) {
      this.removeTypingIndicator();
      console.error('[BIA] Erro na requisição:', err);
      this.addBiaMessage(`⚠️ Ops, ocorreu uma instabilidade: ${err.message || 'Tente novamente em instantes.'}`);
    } finally {
      this.isProcessing = false;
    }
  },

  /**
   * Trata a geração da Escala de Alta Performance com Card Interativo
   */
  async handleEscalaAltaPerformance(actionData = null) {
    this.showTypingIndicator();
    try {
      const escala = await BiaActions.criarEscalaAltaPerformance(null, actionData);
      this.removeTypingIndicator();
      if (!escala || !escala.tarefas || escala.tarefas.length === 0) {
        this.addBiaMessage(escala?.descricao || 'Não foram encontradas atividades suficientes para gerar esta escala no momento.');
        return;
      }
      this.lastPreparedScale = escala;
      this.renderActionCard(escala);
    } catch (e) {
      this.removeTypingIndicator();
      this.addBiaMessage(`Não consegui gerar a escala de alta performance: ${e.message}`);
    }
  },

  /**
   * Trata a geração da Escala no Padrão Anterior com Card Interativo
   */
  async handleEscalaPadraoAnterior(actionData = null) {
    this.showTypingIndicator();
    try {
      const escala = await BiaActions.criarEscalaPadraoAnterior(null, actionData);
      this.removeTypingIndicator();
      if (!escala || !escala.tarefas || escala.tarefas.length === 0) {
        this.addBiaMessage(escala?.descricao || 'Não encontrei histórico suficiente de rotina para este padrão de escala.');
        return;
      }
      this.lastPreparedScale = escala;
      this.renderActionCard(escala);
    } catch (e) {
      this.removeTypingIndicator();
      this.addBiaMessage(`Não consegui replicar o padrão anterior: ${e.message}`);
    }
  },

  /**
   * Trata o pedido de desfazer a última ação da Bia com Card de Confirmação
   */
  async handleDesfazerUltimaAcao() {
    const lastAction = BiaActions.getLastAction();
    if (!lastAction || !lastAction.tarefasCriadasIds || lastAction.tarefasCriadasIds.length === 0) {
      this.addBiaMessage('Nenhuma alteração recente gerada por mim foi encontrada no histórico para desfazer.');
      return;
    }

    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'bia-action-card bia-undo-card';
    const cardId = 'card-undo-' + Date.now();
    const hora = new Date(lastAction.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <div class="bia-card-top">
        <span class="bia-card-title" style="color: #FF3B30;">
          <i data-lucide="rotate-ccw" style="width: 15px; height: 15px; color: #FF3B30;"></i> Desfazer Alterações
        </span>
        <span class="bia-card-badge" style="background: rgba(255, 59, 48, 0.1); color: #FF3B30;">${lastAction.totalTarefas} Tarefas</span>
      </div>
      <div class="bia-card-desc">
        Deseja excluir as <strong>${lastAction.totalTarefas} tarefas</strong> geradas em "<strong>${lastAction.titulo}</strong>" às ${hora}?
      </div>

      <button id="${cardId}" class="bia-btn-undo-confirm">
        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i> Confirmar e Desfazer Escala
      </button>
    `;

    body.appendChild(card);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    const btn = document.getElementById(cardId);
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:rotate 0.8s linear infinite;"></span> Excluindo tarefas...`;

        try {
          const res = await BiaActions.desfazerUltimaAcao((removidas, total) => {
            btn.innerHTML = `Removendo tarefas (${removidas}/${total})...`;
          });

          if (res.sucesso) {
            btn.style.background = '#34C759';
            btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i> ${res.removidas} Tarefas Removidas com Sucesso!`;
            if (window.lucide) lucide.createIcons();

            if (typeof Components !== 'undefined' && Components.toast) {
              Components.toast(`Escala desfeita! ${res.removidas} tarefas removidas.`, 'info');
            }

            this.addBiaMessage(`As **${res.removidas} tarefas** geradas anteriormente foram removidas do Cronograma com sucesso.`);
          } else {
            btn.disabled = false;
            btn.innerHTML = res.mensagem || 'Nenhuma tarefa para desfazer.';
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = 'Erro ao desfazer. Tentar novamente';
          console.error('[BIA] Erro ao desfazer:', err);
        }
      });
    }
  },

  /**
   * Trata o agendamento avulso solicitado diretamente pelo Gestor com Card de Confirmação
   */
  async handleAgendarAvulso(actionData) {
    if (!actionData || !actionData.padeiro || !actionData.cliente) {
      return;
    }

    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'bia-action-card';
    const cardId = 'card-single-exec-' + Date.now();

    const subtAlertHtml = actionData.substituicao
      ? `<div class="bia-substitution-alert">
          <i data-lucide="info" style="width:13px;height:13px;flex-shrink:0;"></i>
          <span>Substitui agendamento existente em <strong>${actionData.tarefaExistenteCliente || 'outro cliente'}</strong></span>
        </div>`
      : '';

    card.innerHTML = `
      <div class="bia-card-top">
        <span class="bia-card-title">
          <i data-lucide="calendar-check" style="width: 15px; height: 15px; color: #1E4BFF;"></i> Ajuste Pontual de Escala
        </span>
        <span class="bia-card-badge" style="background: rgba(30, 75, 255, 0.1); color: #1E4BFF;">${(actionData.tarefas && actionData.tarefas.length) || 1} Agendamento${actionData.tarefas && actionData.tarefas.length > 1 ? 's' : ''}</span>
      </div>
      <div class="bia-card-desc">
        Confirme a alocação pontual do padeiro abaixo para gravação direta no Cronograma do sistema:
      </div>

      ${subtAlertHtml}

      <div class="bia-single-action-grid">
        <div class="bia-grid-cell">
          <span class="bia-cell-label">Padeiro</span>
          <span class="bia-cell-value" title="${actionData.padeiro.nome}">${actionData.padeiro.nome}</span>
        </div>
        <div class="bia-grid-cell">
          <span class="bia-cell-label">Cliente / Loja</span>
          <span class="bia-cell-value" title="${(actionData.clientes || [actionData.cliente]).map(c => c.nome).join(' + ')}">${(actionData.clientes || [actionData.cliente]).map(c => c.nome).join(' + ')}</span>
        </div>
        <div class="bia-grid-cell">
          <span class="bia-cell-label">Data</span>
          <span class="bia-cell-value">${actionData.diaNome || ''} (${actionData.dataBr || actionData.data})</span>
        </div>
        <div class="bia-grid-cell">
          <span class="bia-cell-label">Horário</span>
          <span class="bia-cell-value">${actionData.horario || '08:00'} às ${actionData.horarioFim || '17:00'}</span>
        </div>
      </div>

      <button id="${cardId}" class="bia-btn-apply">
        <i data-lucide="check-circle-2" style="width: 15px; height: 15px;"></i> Confirmar e Gravar no Cronograma
      </button>
    `;

    body.appendChild(card);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    const btn = document.getElementById(cardId);
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:rotate 0.8s linear infinite;"></span> Salvando no Cronograma...`;

        try {
          const res = await BiaActions.executarAgendamentoAvulso(actionData);

          btn.style.background = '#34C759';
          btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i> Agendamento Gravado com Sucesso!`;
          if (window.lucide) lucide.createIcons();

          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast(`Agendamento de ${actionData.padeiro.nome} confirmado!`, 'success');
          }

          this.addBiaMessage(`Pronto! O agendamento de **${actionData.padeiro.nome}** no cliente **${actionData.cliente.nome}** para **${actionData.diaNome} (${actionData.dataBr || actionData.data})** foi gravado no Cronograma.`);

          // Botão para desfazer
          const undoContainer = document.createElement('div');
          undoContainer.style.marginTop = '10px';
          undoContainer.innerHTML = `
            <button id="btn-undo-single-${cardId}" class="bia-btn-undo-secondary">
              <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i> Desfazer esta alteração
            </button>
          `;
          card.appendChild(undoContainer);
          if (window.lucide) lucide.createIcons();

          const undoBtn = document.getElementById(`btn-undo-single-${cardId}`);
          if (undoBtn) {
            undoBtn.addEventListener('click', async () => {
              undoBtn.disabled = true;
              undoBtn.innerHTML = `Desfazendo...`;
              const undoRes = await BiaActions.desfazerUltimaAcao();
              if (undoRes.sucesso) {
                undoBtn.style.color = '#34C759';
                undoBtn.style.borderColor = 'rgba(52, 199, 89, 0.3)';
                undoBtn.style.background = 'rgba(52, 199, 89, 0.08)';
                undoBtn.innerHTML = `<i data-lucide="check" style="width:13px;height:13px;"></i> Agendamento desfeito com sucesso`;
                if (window.lucide) lucide.createIcons();
                if (typeof Components !== 'undefined' && Components.toast) {
                  Components.toast('Agendamento desfeito com sucesso.', 'info');
                }
                BiaUI.addBiaMessage('A alteração pontual foi cancelada e o cronograma foi atualizado.');
              } else {
                undoBtn.disabled = false;
                undoBtn.innerHTML = undoRes.mensagem || 'Não foi possível desfazer';
              }
            });
          }
        } catch (err) {
          btn.disabled = false;
          btn.style.background = '#FF3B30';
          btn.innerHTML = `Erro ao salvar. Tentar novamente`;
          console.error('[BIA] Falha ao agendar avulso:', err);
        }
      });
    }
  },

  /**
   * Trata a remoção pontual solicitada pelo Gestor com Card de Confirmação
   */
  async handleRemoverAvulso(actionData) {
    if (!actionData || !actionData.tarefas || actionData.tarefas.length === 0) {
      return;
    }

    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'bia-action-card bia-undo-card';
    const cardId = 'card-remove-exec-' + Date.now();

    const tarefasHtml = actionData.tarefas.map(t => `
      <div class="bia-preview-item">
        <div><strong style="color:#111827;">${t.diaNome || t.data}</strong>: ${t.padeiroNome}</div>
        <div style="color:#FF3B30; font-weight:600;"><i data-lucide="x" style="width:12px;height:12px;"></i> ${t.clienteNome}</div>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="bia-card-top">
        <span class="bia-card-title" style="color: #FF3B30;">
          <i data-lucide="trash-2" style="width: 15px; height: 15px; color: #FF3B30;"></i> Remover da Escala
        </span>
        <span class="bia-card-badge" style="background: rgba(255, 59, 48, 0.1); color: #FF3B30;">${actionData.tarefas.length} Tarefa(s)</span>
      </div>
      <div class="bia-card-desc">
        Confirme a remoção dos seguintes agendamentos do Cronograma:
      </div>

      <div class="bia-card-preview-list">
        ${tarefasHtml}
      </div>

      <button id="${cardId}" class="bia-btn-undo-confirm">
        <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i> Confirmar Remoção do Cronograma
      </button>
    `;

    body.appendChild(card);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    const btn = document.getElementById(cardId);
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:rotate 0.8s linear infinite;"></span> Excluindo agendamentos...`;

        try {
          const res = await BiaActions.executarRemocaoAvulsa(actionData);
          if (res.sucesso) {
            btn.style.background = '#34C759';
            btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i> ${res.removidas} Tarefas Removidas com Sucesso!`;
            if (window.lucide) lucide.createIcons();

            if (typeof Components !== 'undefined' && Components.toast) {
              Components.toast(`${res.removidas} agendamento(s) removido(s) do cronograma.`, 'info');
            }

            this.addBiaMessage(`Os agendamentos foram removidos do Cronograma com sucesso.`);
          }
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = 'Erro ao remover. Tentar novamente';
          console.error('[BIA] Falha ao remover agendamento:', err);
        }
      });
    }
  },

  /**
   * Renderiza um Card de Ação interativo no chat com preview e botão de aplicação direta
   */
  renderActionCard(escala) {
    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'bia-action-card';

    const previewItemsHtml = escala.tarefas.slice(0, 5).map(t => `
      <div class="bia-preview-item">
        <div>
          <strong style="color:#111827;">${t.diaNome || t.data}</strong>: ${t.padeiroNome}
        </div>
        <div style="color:#1E4BFF; font-weight:600; display:flex; align-items:center; gap:4px;">
          <i data-lucide="arrow-right" style="width:12px;height:12px;"></i> ${t.clienteNome}
        </div>
      </div>
    `).join('');

    const moreCount = escala.tarefas.length > 5 ? `<div style="text-align:center; padding:6px; color:#6B7280; font-size:11px;">+ ${escala.tarefas.length - 5} outras alocações</div>` : '';

    const cardId = 'card-exec-' + Date.now();

    card.innerHTML = `
      <div class="bia-card-top">
        <span class="bia-card-title">
          <i data-lucide="sparkles" style="width: 15px; height: 15px; color: #1E4BFF;"></i> ${escala.titulo}
        </span>
        <span class="bia-card-badge">${escala.totalTarefas} Tarefas</span>
      </div>
      <div class="bia-card-desc">${escala.descricao}</div>
      
      <div class="bia-card-preview-list">
        ${previewItemsHtml}
        ${moreCount}
      </div>

      <button id="${cardId}" class="bia-btn-apply">
        <i data-lucide="calendar-plus" style="width: 15px; height: 15px;"></i> Aplicar no Cronograma do Sistema
      </button>
    `;

    body.appendChild(card);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    // Evento do botão de aplicação
    const btn = document.getElementById(cardId);
    if (btn) {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:rotate 0.8s linear infinite;"></span> Gravando no Cronograma...`;
        
        try {
          const res = await BiaActions.aplicarTarefasNoSistema(escala.tarefas, (criadas, total) => {
            btn.innerHTML = `Gravando tarefas (${criadas}/${total})...`;
          }, escala);

          btn.style.background = '#34C759';
          btn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;"></i> ${res.criadas} Tarefas Aplicadas com Sucesso!`;
          if (window.lucide) lucide.createIcons();

          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast(`Escala gerada com sucesso! (${res.criadas} tarefas criadas)`, 'success');
          }

          this.addBiaMessage(`As **${res.criadas} tarefas** foram adicionadas com sucesso ao Cronograma. Você já pode visualizá-las na tela de Cronograma.`);

          // Adicionar botão de desfazer diretamente abaixo da confirmação
          const undoContainer = document.createElement('div');
          undoContainer.style.marginTop = '10px';
          undoContainer.innerHTML = `
            <button id="btn-undo-direct-${cardId}" class="bia-btn-undo-secondary">
              <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i> Desfazer esta escala
            </button>
          `;
          card.appendChild(undoContainer);
          if (window.lucide) lucide.createIcons();

          const undoBtn = document.getElementById(`btn-undo-direct-${cardId}`);
          if (undoBtn) {
            undoBtn.addEventListener('click', async () => {
              undoBtn.disabled = true;
              undoBtn.innerHTML = `Desfazendo tarefas...`;
              const undoRes = await BiaActions.desfazerUltimaAcao();
              if (undoRes.sucesso) {
                undoBtn.style.color = '#34C759';
                undoBtn.style.borderColor = 'rgba(52, 199, 89, 0.3)';
                undoBtn.style.background = 'rgba(52, 199, 89, 0.08)';
                undoBtn.innerHTML = `<i data-lucide="check" style="width:13px;height:13px;"></i> Escala revertida (${undoRes.removidas} tarefas removidas)`;
                if (window.lucide) lucide.createIcons();
                if (typeof Components !== 'undefined' && Components.toast) {
                  Components.toast(`Escala desfeita (${undoRes.removidas} tarefas removidas).`, 'info');
                }
                BiaUI.addBiaMessage(`As **${undoRes.removidas} tarefas** foram removidas do cronograma com sucesso.`);
              } else {
                undoBtn.disabled = false;
                undoBtn.innerHTML = undoRes.mensagem || 'Não foi possível desfazer';
              }
            });
          }

        } catch (err) {
          btn.disabled = false;
          btn.style.background = '#FF3B30';
          btn.innerHTML = `Erro ao salvar. Tentar novamente`;
          console.error('[BIA] Falha ao aplicar tarefas:', err);
        }
      });
    }
  },

  addUserMessage(text) {
    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const row = document.createElement('div');
    row.className = 'bia-msg-row user';
    row.innerHTML = `
      <div class="bia-msg-bubble">${this.escapeHtml(text)}</div>
    `;
    body.appendChild(row);
    this.scrollToBottom();
  },

  addBiaMessage(text, meta = {}) {
    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    let thoughtHtml = '';
    const thoughtText = meta.pensamento || (text && text.match(/<pensamento>([\s\S]*?)<\/pensamento>/i)?.[1]);
    let displayText = text || '';
    if (displayText) {
      displayText = displayText.replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '').trim();
    }

    if (thoughtText && thoughtText.trim()) {
      const stepsFormatted = this.formatThought(thoughtText);
      thoughtHtml = `
        <div class="bia-thought-card">
          <button type="button" class="bia-thought-header" onclick="this.closest('.bia-thought-card').classList.toggle('is-open')">
            <div class="bia-thought-title-group">
              <span class="bia-thought-sparkle">✦</span>
              <span class="bia-thought-title">Caminho de Pensamento</span>
              <span class="bia-thought-badge">Base Real</span>
            </div>
            <span class="bia-thought-chevron">▾</span>
          </button>
          <div class="bia-thought-body">
            ${stepsFormatted}
          </div>
        </div>
      `;
    }

    const row = document.createElement('div');
    row.className = 'bia-msg-row bia';
    row.innerHTML = `
      <div class="bia-msg-avatar">
        ${this.starIconSvg}
      </div>
      <div class="bia-msg-bubble">
        ${thoughtHtml}
        <div class="bia-msg-text">${this.formatMarkdown(displayText)}</div>
      </div>
    `;
    body.appendChild(row);
    this.scrollToBottom();
  },

  formatThought(thought) {
    if (!thought) return '';
    const lines = thought.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const escaped = this.escapeHtml(line);
      const formatted = escaped.replace(/^(\d+\.[\w\sãõéáíóúç]+:)/i, '<strong class="bia-thought-step-num">$1</strong>');
      return `<div class="bia-thought-step">${formatted}</div>`;
    }).join('');
  },

  showTypingIndicator() {
    this.removeTypingIndicator();
    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const indicator = document.createElement('div');
    indicator.id = 'bia-typing-indicator';
    indicator.className = 'bia-msg-row bia';
    indicator.innerHTML = `
      <div class="bia-msg-avatar">
        ${this.starIconSvg}
      </div>
      <div class="bia-thinking-live-box">
        <div class="bia-thinking-spinner">
          <svg class="bia-spinner-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="9" stroke-opacity="0.25"></circle>
            <path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"></path>
          </svg>
        </div>
        <span class="bia-thinking-live-text" id="bia-thinking-live-text">Consultando dados reais na Hostinger...</span>
      </div>
    `;
    body.appendChild(indicator);
    this.scrollToBottom();

    const stages = [
      'Averiguando escalas e histórico no banco...',
      'Cruzando padrões de atendimento da equipe...',
      'Construindo caminho de pensamento analítico...'
    ];
    let stageIdx = 0;
    this._thinkingInterval = setInterval(() => {
      const el = document.getElementById('bia-thinking-live-text');
      if (el && stages[stageIdx]) {
        el.textContent = stages[stageIdx];
        stageIdx = (stageIdx + 1) % stages.length;
      }
    }, 1100);
  },

  removeTypingIndicator() {
    if (this._thinkingInterval) {
      clearInterval(this._thinkingInterval);
      this._thinkingInterval = null;
    }
    const ind = document.getElementById('bia-typing-indicator');
    if (ind) ind.remove();
  },

  scrollToBottom() {
    const body = document.getElementById('bia-messages-body');
    if (body) {
      setTimeout(() => {
        body.scrollTop = body.scrollHeight;
      }, 50);
    }
  },

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  formatMarkdown(text) {
    if (!text) return '';
    let formatted = this.escapeHtml(text);

    // Negrito **texto**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Itálico *texto*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Listas com traço ou asterisco
    formatted = formatted.replace(/^\s*[-•]\s+(.*)$/gm, '<li style="margin-left:14px;list-style-type:disc;">$1</li>');
    // Quebras de linha
    formatted = formatted.replace(/\n/g, '<br/>');

    return formatted;
  }
};

if (typeof window !== 'undefined') {
  window.BiaUI = BiaUI;
}
