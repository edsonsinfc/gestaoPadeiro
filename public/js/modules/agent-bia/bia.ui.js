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

    // Mensagem de boas-vindas inicial (silenciosa até o usuário interagir)
    setTimeout(() => {
      this.addBiaMessage(`Olá! Eu sou a **Bia**, assistente operacional de inteligência artificial do Smart Gestor.

Como posso ajudar na operação hoje? Exemplos de comandos:
- *"Bia, crie uma escala de alta performance"*
- *"Bia, faça uma escala seguindo o padrão de escala"*
- *"Quem são os padeiros com maior produção?"*`, { silent: true });
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
            <button class="bia-btn-circle" id="bia-btn-voice-toggle" title="Voz da Bia (Ativar/Desativar Fala)">
              <i data-lucide="volume-2" style="width: 16px; height: 16px;"></i>
            </button>
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

    const voiceToggleBtn = document.getElementById('bia-btn-voice-toggle');
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => this.toggleVoiceAutoPlay());
      this.updateVoiceToggleUI();
    }

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.stopSpeaking();
        if (typeof BiaAPI !== 'undefined') BiaAPI.clearHistory();
        this.pendingCommand = null;
        if (typeof BiaCommands !== 'undefined') BiaCommands.pendingCommand = null;
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
    const stopBtn = document.getElementById('bia-btn-stop-listening');

    if (micBtn) {
      micBtn.addEventListener('contextmenu', (e) => e.preventDefault());

      const onPointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Se já estava gravando travado (modo toque livre): toque no mic para e envia!
        if (this._voiceActive && this._voiceLocked) {
          this.stopVoiceRecordingAndSend('tap_stop');
          return;
        }

        if (this.isProcessing) return;

        try {
          micBtn.setPointerCapture(e.pointerId);
          this._voicePointerId = e.pointerId;
        } catch (err) {}

        this._voiceStartX = e.clientX;
        this._voiceStartY = e.clientY;
        this._voiceCancelGesture = false;
        this._voicePressTime = Date.now();
        this._voiceIsHolding = false;

        // Feedback tátil instantâneo
        if (navigator.vibrate) try { navigator.vibrate(35); } catch (vErr) {}

        micBtn.classList.add('holding');

        // Dispara a gravação imediatamente
        this.startVoiceRecording();

        // Se o usuário continuar segurando por mais de 350ms, confirma modo push-to-talk
        if (this._holdCheckTimer) clearTimeout(this._holdCheckTimer);
        this._holdCheckTimer = setTimeout(() => {
          if (this._voicePointerId !== null) {
            this._voiceIsHolding = true;
            this.setListeningUI(true, 'Gravando... Solte para enviar');
          }
        }, 350);
      };

      const onPointerMove = (e) => {
        if (this._voicePointerId === null || !this._voiceActive) return;
        const diffX = e.clientX - this._voiceStartX;
        if (diffX < -65) {
          if (!this._voiceCancelGesture) {
            this._voiceCancelGesture = true;
            this.setListeningUI(true, 'Solte para cancelar ❌');
          }
        } else if (this._voiceCancelGesture) {
          this._voiceCancelGesture = false;
          this.setListeningUI(true, this._voiceIsHolding ? 'Gravando... Solte para enviar' : 'Ouvindo...');
        }
      };

      const onPointerUp = (e) => {
        if (this._holdCheckTimer) {
          clearTimeout(this._holdCheckTimer);
          this._holdCheckTimer = null;
        }

        if (this._voicePointerId !== null) {
          try { micBtn.releasePointerCapture(this._voicePointerId); } catch (err) {}
          this._voicePointerId = null;
        }

        micBtn.classList.remove('holding');

        if (!this._voiceActive && !this._voiceStarting) return;

        // Se o usuário arrastou para cancelar
        if (this._voiceCancelGesture) {
          this._voiceCancelGesture = false;
          this.cancelVoiceRecording();
          if (navigator.vibrate) try { navigator.vibrate([25, 40, 25]); } catch (vErr) {}
          return;
        }

        const duration = Date.now() - this._voicePressTime;

        // Se segurou por mais de 350ms -> Push-to-Talk (soltou = envia na hora!)
        if (duration >= 350 || this._voiceIsHolding) {
          if (navigator.vibrate) try { navigator.vibrate(30); } catch (vErr) {}
          this.stopVoiceRecordingAndSend('ptt_release');
        } else {
          // Se foi apenas um toque rápido (<350ms) -> Mantém gravando mãos livres!
          this._voiceLocked = true;
          this._voiceIsHolding = false;
          micBtn.classList.add('recording-locked');
          this.setListeningUI(true, 'Ouvindo... Toque no microfone ou no botão vermelho para enviar');
          if (navigator.vibrate) try { navigator.vibrate(20); } catch (vErr) {}
        }
      };

      const onPointerCancel = (e) => {
        micBtn.classList.remove('holding');
        if (this._voicePointerId !== null) {
          try { micBtn.releasePointerCapture(this._voicePointerId); } catch (err) {}
          this._voicePointerId = null;
        }
        const duration = Date.now() - this._voicePressTime;
        if (duration >= 600 && this._voiceActive) {
          this.stopVoiceRecordingAndSend('pointer_cancel_save');
        } else {
          this.cancelVoiceRecording();
        }
      };

      micBtn.addEventListener('pointerdown', onPointerDown);
      micBtn.addEventListener('pointermove', onPointerMove);
      micBtn.addEventListener('pointerup', onPointerUp);
      micBtn.addEventListener('pointercancel', onPointerCancel);
    }

    if (stopBtn) {
      const handleStop = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.stopVoiceRecordingAndSend('stop_button');
      };
      stopBtn.addEventListener('click', handleStop);
      stopBtn.addEventListener('touchend', handleStop);
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
    this.unlockAudio();
    const overlay = document.getElementById('bia-modal-overlay');
    if (overlay) {
      overlay.classList.add('active');
      this.isOpen = true;
      this.updateVoiceToggleUI();
      if (window.lucide) lucide.createIcons();
      const input = document.getElementById('bia-input-field');
      if (input) setTimeout(() => input.focus(), 300);
      this.scrollToBottom();
    }
  },

  closeModal() {
    this.stopVoice();
    this.stopSpeaking();
    this.setListeningUI(false);
    const overlay = document.getElementById('bia-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      this.isOpen = false;
    }
  },

  /**
   * ENGINE DE VOZ INTELIGENTE E HÍBRIDO DA BIA (GROQ WHISPER)
   * Suporta:
   * 1. Push-to-Talk: Segure para falar, solte para enviar
   * 2. Toque Livre (Tap-to-Talk): Clique rápido para começar mãos-livres, clique de novo ou no botão parar para enviar
   * 3. Transcrição Ultra-Rápida e precisa via Groq Whisper (~300ms)
   */
  isListening: false,
  _voiceActive: false,
  _voiceStarting: false,
  _voiceStopRequested: false,
  _voiceRecorder: null,
  _voiceChunks: [],
  _voiceStream: null,
  _voicePressTime: 0,
  _voiceIsHolding: false,
  _voiceLocked: false,
  _voicePointerId: null,
  _voiceMaxTimer: null,
  _voiceCancelGesture: false,
  _voiceStartX: 0,
  _voiceStartY: 0,
  _holdCheckTimer: null,

  async startVoiceRecording() {
    if (this._voiceActive || this._voiceStarting || this.isProcessing) return;
    this.unlockAudio();
    this._voiceStarting = true;
    this._voiceStopRequested = false;
    this._voiceChunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this._voiceStream = stream;

      // Se o usuário solicitou parada enquanto a permissão/stream abria
      if (this._voiceStopRequested) {
        stream.getTracks().forEach(t => t.stop());
        this._voiceStream = null;
        this._voiceStarting = false;
        this._voiceStopRequested = false;
        this.setListeningUI(false);
        return;
      }

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        ''
      ].find(t => t === '' || (window.MediaRecorder && MediaRecorder.isTypeSupported(t))) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      this._voiceRecorder = recorder;
      this._voiceActive = true;
      this._voiceStarting = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this._voiceChunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (this._voiceStream) {
          this._voiceStream.getTracks().forEach(t => t.stop());
          this._voiceStream = null;
        }

        const chunks = this._voiceChunks;
        this._voiceChunks = [];
        this._voiceActive = false;
        this._voiceLocked = false;
        this._voiceIsHolding = false;
        this.setListeningUI(false);

        const micBtn = document.getElementById('bia-btn-mic');
        if (micBtn) {
          micBtn.classList.remove('holding', 'recording-locked', 'listening');
        }

        if (!chunks || chunks.length === 0) {
          console.warn('[BIA Audio] Nenhum áudio capturado.');
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });

        if (blob.size < 600) {
          console.warn('[BIA Audio] Gravação muito curta (<600 bytes), ignorando.');
          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast('Áudio muito curto. Segure ou toque para falar.', 'info');
          }
          return;
        }

        // Feedback imediato ao usuário
        this.setListeningUI(true, 'Transcrevendo áudio com Groq...');
        this.showTypingIndicator();

        try {
          console.log('[BIA Audio] Transcrevendo áudio via Groq Whisper, bytes:', blob.size, 'mime:', blob.type);
          const transcrito = await BiaAPI.transcribeAudio(blob, blob.type);

          this.setListeningUI(false);
          this.removeTypingIndicator();

          if (transcrito && transcrito.trim()) {
            console.log('[BIA Audio] Transcrição bem-sucedida:', transcrito);
            // Envia o texto reconhecido diretamente para a Bia como comando do usuário
            this.handleUserSubmit(transcrito.trim());
          } else {
            this.addBiaMessage('Não consegui identificar palavras com clareza no áudio. Fale mais perto do microfone ou digite o comando.');
          }
        } catch (transcribeErr) {
          this.setListeningUI(false);
          this.removeTypingIndicator();
          console.error('[BIA Audio] Erro na transcrição:', transcribeErr);
          this.addBiaMessage(`⚠️ Não consegui processar o áudio: ${transcribeErr.message || 'Tente novamente.'}`);
        }
      };

      // Watchdog de segurança: 45 segundos máximos
      if (this._voiceMaxTimer) clearTimeout(this._voiceMaxTimer);
      this._voiceMaxTimer = setTimeout(() => {
        if (this._voiceActive) this.stopVoiceRecordingAndSend('max_duration');
      }, 45000);

      recorder.start(100);
      this.setListeningUI(true, 'Ouvindo... fale seu comando');

    } catch (err) {
      this._voiceStarting = false;
      this._voiceActive = false;
      this.setListeningUI(false);
      console.error('[BIA Audio] Erro ao acessar microfone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.addBiaMessage('Permissão de microfone negada. Libere o acesso ao microfone nas configurações do seu aparelho.');
      } else {
        this.addBiaMessage('Não consegui acessar o microfone deste aparelho. Digite seu comando.');
      }
    }
  },

  stopVoiceRecordingAndSend(reason = 'stop') {
    if (this._voiceMaxTimer) {
      clearTimeout(this._voiceMaxTimer);
      this._voiceMaxTimer = null;
    }

    if (this._voiceStarting) {
      this._voiceStopRequested = true;
      return;
    }

    if (!this._voiceActive) {
      this.setListeningUI(false);
      return;
    }

    if (this._voiceRecorder && this._voiceRecorder.state !== 'inactive') {
      this.setListeningUI(true, 'Finalizando áudio...');
      try {
        this._voiceRecorder.stop();
      } catch (e) {
        console.warn('[BIA Audio] Erro ao parar gravador:', e);
      }
    }
  },

  cancelVoiceRecording() {
    if (this._voiceMaxTimer) {
      clearTimeout(this._voiceMaxTimer);
      this._voiceMaxTimer = null;
    }

    this._voiceStopRequested = true;
    this._voiceStarting = false;
    this._voiceActive = false;
    this._voiceLocked = false;
    this._voiceIsHolding = false;
    this._voiceChunks = [];

    if (this._voiceStream) {
      this._voiceStream.getTracks().forEach(t => t.stop());
      this._voiceStream = null;
    }

    if (this._voiceRecorder && this._voiceRecorder.state !== 'inactive') {
      try {
        this._voiceRecorder.onstop = null;
        this._voiceRecorder.stop();
      } catch (e) {}
    }

    this.setListeningUI(false);
    const micBtn = document.getElementById('bia-btn-mic');
    if (micBtn) {
      micBtn.classList.remove('holding', 'recording-locked', 'listening');
    }
  },

  // Compatibilidade e controle da UI
  toggleVoice() {
    if (this._voiceActive) {
      this.stopVoiceRecordingAndSend('toggle');
    } else {
      this.startVoiceRecording();
    }
  },

  stopVoice() {
    this.cancelVoiceRecording();
  },

  startPTT() { this.startVoiceRecording(); },
  stopPTT() { this.stopVoiceRecordingAndSend('ptt'); },

  setListeningUI(on, statusText = null) {
    this.isListening = on;
    const mic = document.getElementById('bia-btn-mic');
    const ind = document.getElementById('bia-listening-indicator');
    const textEl = document.getElementById('bia-listening-text');
    const box = document.getElementById('bia-input-form');
    if (mic) {
      mic.classList.toggle('listening', on);
    }
    if (ind) {
      ind.style.display = on ? 'flex' : 'none';
      if (textEl && statusText) textEl.textContent = statusText;
      else if (textEl) textEl.textContent = 'Ouvindo... fale seu comando';
    }
    if (box) box.classList.toggle('bia-listening', on);
  },

  pendingCommand: null,

  /**
   * Envia a mensagem do usuário e processa resposta e ações da IA
   */
  async handleUserSubmit(message) {
    if (this.isProcessing) return;
    this.unlockAudio();
    this.stopSpeaking();
    this.isProcessing = true;

    // 1. Exibir balão do usuário
    this.addUserMessage(message);
    this.showTypingIndicator();

    try {
      // 2. Chamar o serviço de IA da Bia
      const response = await BiaAPI.sendMessage(message, { pendingCommand: this.pendingCommand });
      this.removeTypingIndicator();

      // Sincronizar estado de comando pendente (multi-turno)
      if (response.pendingCommand !== undefined) {
        this.pendingCommand = response.pendingCommand;
      } else if (response.actionData?.pendingCommand !== undefined) {
        this.pendingCommand = response.actionData.pendingCommand;
      } else if (response.action === 'agendar_avulso') {
        this.pendingCommand = null;
      }

      // 3. Exibir balão da Bia com Caminho de Pensamento
      this.addBiaMessage(response.text, { pensamento: response.pensamento });

      // 4. Executar ação correspondente se detectada
      if (response.action === 'escala_alta_performance') {
        await this.handleEscalaAltaPerformance(response.actionData);
      } else if (response.action === 'escala_padrao_anterior') {
        await this.handleEscalaPadraoAnterior(response.actionData);
      } else if (response.action === 'cadastrar_metas_mensais') {
        await this.handleCadastrarMetasMensais(response.actionData);
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
   * Trata a exibição do Card de Metas Mensais Autônomas Cadastradas
   */
  async handleCadastrarMetasMensais(actionData = null) {
    const resMetas = actionData?.resultadoMetas || actionData;
    if (!resMetas || !resMetas.metas || resMetas.metas.length === 0) return;

    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const card = document.createElement('div');
    card.className = 'bia-action-card';
    card.style.borderColor = 'rgba(0, 122, 255, 0.25)';
    card.style.background = 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)';

    const mesFormatado = resMetas.periodoNome || resMetas.periodo || 'Mês Atual';
    const totalPadeiros = resMetas.totalPadeiros || resMetas.metas.length;
    const metaTotalStr = (resMetas.metaTotalKg || 0).toLocaleString('pt-BR');
    const cardId = 'btn-ver-metas-' + Date.now();

    const previewPadeiros = (resMetas.metas || []).slice(0, 4).map(m => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 13px;">
        <span style="font-weight: 600; color: #1E293B;">${m.padeiroNome}</span>
        <span style="font-weight: 700; color: #007AFF;">${(m.metaKg || 0).toLocaleString('pt-BR')} kg</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="bia-card-top">
        <span class="bia-card-title" style="color: #007AFF; display: flex; align-items: center; gap: 6px;">
          <i data-lucide="target" style="width: 16px; height: 16px; color: #007AFF;"></i> Metas Autônomas Cadastradas
        </span>
        <span class="bia-card-badge" style="background: rgba(0, 122, 255, 0.1); color: #007AFF; font-weight: 700;">${mesFormatado}</span>
      </div>
      <div class="bia-card-desc" style="margin-bottom: 12px;">
        A Bia calculou e registrou as metas mensais para <strong>${totalPadeiros} padeiros</strong> ativos, com projeção total de <strong>${metaTotalStr} kg</strong> para a equipe.
      </div>
      <div style="background: #FFFFFF; border-radius: 12px; padding: 10px 12px; margin-bottom: 14px; border: 1px solid rgba(0,0,0,0.06);">
        ${previewPadeiros}
        ${resMetas.metas.length > 4 ? `<div style="font-size: 11px; color: #64748B; text-align: center; padding-top: 6px;">+ ${resMetas.metas.length - 4} outros técnicos com metas salvas</div>` : ''}
      </div>
      <button id="${cardId}" class="bia-btn-apply" style="background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%); width: 100%; border: none; color: white; padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i data-lucide="bar-chart-3" style="width: 16px; height: 16px;"></i> Abrir Aba de Metas no Painel
      </button>
    `;

    body.appendChild(card);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    const btn = document.getElementById(cardId);
    if (btn) {
      btn.addEventListener('click', () => {
        if (typeof App !== 'undefined' && typeof App.navigate === 'function') {
          App.navigate('metas');
        }
      });
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
    const msgId = 'bia-msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    row.innerHTML = `
      <div class="bia-msg-avatar">
        ${this.starIconSvg}
      </div>
      <div class="bia-msg-bubble">
        ${thoughtHtml}
        <div class="bia-msg-text">${this.formatMarkdown(displayText)}</div>
        <div class="bia-msg-footer">
          <button type="button" class="bia-btn-speak-msg" id="btn-speak-${msgId}" title="Ouvir resposta">
            <svg class="bia-speak-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <span class="bia-speak-label">Ouvir</span>
          </button>
        </div>
      </div>
    `;
    body.appendChild(row);
    if (window.lucide) lucide.createIcons();
    this.scrollToBottom();

    const speakBtn = document.getElementById(`btn-speak-${msgId}`);
    if (speakBtn) {
      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._isSpeaking && this._speakingBtn === speakBtn) {
          this.stopSpeaking();
        } else {
          this.speakText(displayText, speakBtn);
        }
      });
    }

    // Auto-fala se estiver ativada
    if (typeof BIA_CONFIG !== 'undefined' && BIA_CONFIG.voiceAutoPlay && displayText && !meta.silent) {
      this.speakText(displayText, speakBtn);
    }
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
  },

  /* ─── SISTEMA DE REPRODUÇÃO DE VOZ DA BIA (TTS) ────────────────────────── */
  _currentAudio: null,
  _currentUtterance: null,
  _isSpeaking: false,
  _speakingBtn: null,

  stopSpeaking() {
    if (this._currentAudio) {
      try {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
      } catch (_) {}
      this._currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
      this._currentUtterance = null;
    }
    this._isSpeaking = false;
    if (this._speakingBtn) {
      this._speakingBtn.classList.remove('is-playing', 'is-loading');
      const label = this._speakingBtn.querySelector('.bia-speak-label');
      if (label) label.textContent = 'Ouvir';
      this._speakingBtn = null;
    }
  },

  _audioUnlocked: false,
  unlockAudio() {
    if (this._audioUnlocked) return;
    try {
      const silence = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      silence.volume = 0.01;
      const p = silence.play();
      if (p) {
        p.then(() => {
          this._audioUnlocked = true;
        }).catch(() => {});
      }
    } catch (_) {}

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
      } catch (_) {}
    }
  },

  async speakText(text, btnEl = null) {
    if (!text || typeof text !== 'string') return;
    this.stopSpeaking();

    this._isSpeaking = true;
    this._speakingBtn = btnEl;
    if (btnEl) {
      btnEl.classList.add('is-loading');
      const label = btnEl.querySelector('.bia-speak-label');
      if (label) label.textContent = 'Carregando...';
    }

    try {
      if (typeof BiaAPI !== 'undefined' && typeof BiaAPI.synthesizeSpeech === 'function') {
        const res = await BiaAPI.synthesizeSpeech(text);

        if (res && res.type === 'audio' && res.audioUrl) {
          if (btnEl) {
            btnEl.classList.remove('is-loading');
            btnEl.classList.add('is-playing');
            const label = btnEl.querySelector('.bia-speak-label');
            if (label) label.textContent = 'Falando...';
          }

          const audio = new Audio(res.audioUrl);
          this._currentAudio = audio;

          audio.onended = () => {
            this.stopSpeaking();
          };

          audio.onerror = (e) => {
            console.warn('[BIA Audio] Falha ao tocar áudio MP3, usando fallback nativo:', e);
            this.speakNative(text, btnEl);
          };

          try {
            await audio.play();
            return;
          } catch (playErr) {
            console.warn('[BIA Audio] Autoplay bloqueado pelo navegador, tentando fala nativa:', playErr);
            this.speakNative(text, btnEl);
            return;
          }
        }

        // Se o backend indicou fallback ou deu JSON
        this.speakNative(res?.text || text, btnEl);
        return;
      }

      this.speakNative(text, btnEl);
    } catch (err) {
      console.warn('[BIA Voice] Erro na síntese:', err);
      this.speakNative(text, btnEl);
    }
  },

  speakNative(text, btnEl = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stopSpeaking();
      return;
    }

    try {
      // Limpeza de texto para fala nativa fluida em português
      let clean = text
        .replace(/<pensamento>[\s\S]*?<\/pensamento>/gi, '')
        .replace(/```[\s\S]*?```/gi, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\b(\d+)\s*kg\b/gi, '$1 quilos')
        .replace(/\bkg\b/gi, 'quilos')
        .replace(/R\$\s*(\d+)/gi, '$1 reais')
        .replace(/%/g, ' por cento')
        .replace(/\n+/g, '. ')
        .trim();

      if (clean.length > 800) {
        clean = clean.slice(0, 800) + '...';
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.startsWith('pt') && (v.name.includes('Luciana') || v.name.includes('Maria') || v.name.includes('Francisca') || v.name.includes('Female') || v.name.includes('Google português')))
        || voices.find(v => v.lang.startsWith('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      this._currentUtterance = utterance;

      if (btnEl) {
        btnEl.classList.remove('is-loading');
        btnEl.classList.add('is-playing');
        const label = btnEl.querySelector('.bia-speak-label');
        if (label) label.textContent = 'Falando...';
      }

      utterance.onend = () => {
        this.stopSpeaking();
      };
      utterance.onerror = () => {
        this.stopSpeaking();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[BIA Native Voice] Falha:', e);
      this.stopSpeaking();
    }
  },

  updateVoiceToggleUI() {
    const btn = document.getElementById('bia-btn-voice-toggle');
    if (!btn || typeof BIA_CONFIG === 'undefined') return;
    const enabled = BIA_CONFIG.voiceAutoPlay;
    btn.classList.toggle('active', enabled);
    btn.setAttribute('title', enabled ? 'Voz da Bia: Ativada (Clique para silenciar)' : 'Voz da Bia: Silenciada (Clique para ativar)');
    btn.innerHTML = enabled
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: #007AFF;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: #8E8E93;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  },

  toggleVoiceAutoPlay() {
    if (typeof BIA_CONFIG === 'undefined') return;
    BIA_CONFIG.voiceAutoPlay = !BIA_CONFIG.voiceAutoPlay;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('BIA_VOICE_AUTO_PLAY', BIA_CONFIG.voiceAutoPlay ? 'true' : 'false');
    }
    this.updateVoiceToggleUI();
    if (!BIA_CONFIG.voiceAutoPlay) {
      this.stopSpeaking();
    }
    if (typeof Components !== 'undefined' && Components.toast) {
      Components.toast(BIA_CONFIG.voiceAutoPlay ? '🔊 Voz da Bia ativada!' : '🔇 Voz da Bia silenciada.', 'info');
    }
  }
};

if (typeof window !== 'undefined') {
  window.BiaUI = BiaUI;
}
