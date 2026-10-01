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
          <form id="bia-input-form" class="bia-input-box" onsubmit="event.preventDefault();">
            <input 
              type="text" 
              id="bia-input-field" 
              class="bia-input-field" 
              placeholder="Peça uma escala ou tire uma dúvida..." 
              autocomplete="off"
            />
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
    const overlay = document.getElementById('bia-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      this.isOpen = false;
    }
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

      // 3. Exibir balão da Bia
      this.addBiaMessage(response.text);

      // 4. Executar ação correspondente se detectada
      if (response.action === 'escala_alta_performance') {
        await this.handleEscalaAltaPerformance();
      } else if (response.action === 'escala_padrao_anterior') {
        await this.handleEscalaPadraoAnterior();
      } else if (response.action === 'desfazer_alteracoes') {
        await this.handleDesfazerUltimaAcao();
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
  async handleEscalaAltaPerformance() {
    this.showTypingIndicator();
    try {
      const escala = await BiaActions.criarEscalaAltaPerformance();
      this.removeTypingIndicator();
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
  async handleEscalaPadraoAnterior() {
    this.showTypingIndicator();
    try {
      const escala = await BiaActions.criarEscalaPadraoAnterior();
      this.removeTypingIndicator();
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

  addBiaMessage(text) {
    const body = document.getElementById('bia-messages-body');
    if (!body) return;

    const row = document.createElement('div');
    row.className = 'bia-msg-row bia';
    row.innerHTML = `
      <div class="bia-msg-avatar">
        ${this.starIconSvg}
      </div>
      <div class="bia-msg-bubble">${this.formatMarkdown(text)}</div>
    `;
    body.appendChild(row);
    this.scrollToBottom();
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
      <div class="bia-typing-indicator">
        <div class="bia-typing-dot"></div>
        <div class="bia-typing-dot"></div>
        <div class="bia-typing-dot"></div>
      </div>
    `;
    body.appendChild(indicator);
    this.scrollToBottom();
  },

  removeTypingIndicator() {
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
