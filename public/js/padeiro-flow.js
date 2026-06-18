/**
 * Padeiro Activity Flow - Premium Redesign (4 Steps)
 * INICIAR -> PRODUÇÃO -> AVALIAÇÃO -> FINALIZAR
 */
const PadeiroFlow = {
  currentStep: 0,
  activity: {},
  timerInterval: null,
  steps: [
    { label: 'Iniciar', icon: 'play' },
    { label: 'Produção', icon: 'package' },
    { label: 'Avaliar Cliente', icon: 'smile' },
    { label: 'Avaliação', icon: 'star' },
    { label: 'Finalizar', icon: 'check-circle' }
  ],
  selectedFiles: [],
  multiSelectMode: false,
  multiSelectedIds: new Set(),
  _longPressTimer: null,
  getTodayLocal() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  },

  async render(prefill = {}) {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    this.currentStep = 0;
    this.cartItems = {};
    this.selectedFiles = [];
    this.selectedFotosBase64 = [];
    this.isSignatureDrawn = false;
    this.backgroundUploadPromise = null;
    this.backgroundSignaturePromise = null;
    this.activity = prefill;
    this.activity.timeline = this.activity.timeline || [];

    const today = this.getTodayLocal();

    if (!prefill.clienteId) {
      try {
        const agenda = await API.get('/api/cronograma/agenda');
        const slot = agenda.find(a => a.data === today && (!a.status || a.status === 'pendente'));
        if (slot) {
          this.activity.clienteId = slot.clienteId;
          this.activity.clienteNome = slot.clienteNome;
          this.activity.cronogramaId = slot.id || slot._id;
        }
      } catch(e) {}
    }

    try {
      const atividades = await API.get('/api/atividades');
      const em = atividades.find(a => a.status === 'em_andamento');
      if (em) {
        if (em.data === today) {
          this.pendingResume = em;
          this.confirmResume();
          return;
        } else {
          this.pendingPreviousResume = em;
          this.renderPendingPreviousActivityScreen(container, em);
          return;
        }
      }
    } catch(e) {}

    App.routeData = {};
    this.renderWizard(container);
  },

  renderPendingPreviousActivityScreen(container, em) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };
    
    container.innerHTML = `
      <div class="pf-container pf-resume-container fade-in" style="max-width:500px;margin:40px auto;text-align:center;">
        <div class="pf-resume-card" style="border: 2px solid #f59e0b; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.15); background: var(--surface-bg);">
          <div class="pf-resume-icon" style="background: rgba(245, 158, 11, 0.15); color: #d97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; width: 72px; height: 72px; border-radius: 50%;">
            <i data-lucide="alert-triangle" style="width:36px;height:36px"></i>
          </div>
          <h2 class="pf-resume-title" style="color: #d97706; font-size: 20px; font-weight: 800; margin-bottom: 8px;">Atividade Pendente!</h2>
          <p class="pf-resume-sub" style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4;">
            Por favor, finalize a atividade anterior antes de iniciar uma nova.
          </p>
          <div class="pf-resume-info" style="text-align: left; background: #fafbfc; border: 1px solid #f1f5f9; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
              Identificamos que você iniciou um atendimento em <strong>${formatDate(em.data)}</strong> para o cliente abaixo, mas ele não foi concluído:
            </p>
            <div class="pf-resume-row" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 13px; color: var(--text-tertiary);">Cliente:</span>
              <strong style="font-size: 13px; color: var(--text-primary); text-align: right; max-width: 70%;">${em.clienteNome||'—'}</strong>
            </div>
            <div class="pf-resume-row" style="display: flex; justify-content: space-between; padding: 6px 0;">
              <span style="font-size: 13px; color: var(--text-tertiary);">Iniciado em:</span>
              <strong style="font-size: 13px; color: var(--text-primary);">${formatDate(em.data)} às ${em.hora ? em.hora.slice(0, 5) : '—'}</strong>
            </div>
          </div>
          <button class="pf-btn-primary pf-btn-full" onclick="PadeiroFlow.confirmResumePrevious()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);">
            <i data-lucide="play" style="width:18px;height:18px"></i> Retomar e Finalizar Atividade
          </button>
          <button class="pf-btn-ghost" onclick="App.navigate('padeiro-inicio')" style="margin-top: 12px;">
            <i data-lucide="calendar" style="width:16px;height:16px;margin-right:6px;"></i> Voltar para a Agenda
          </button>
        </div>
      </div>`;
    Components.renderIcons();
  },

  confirmResumePrevious() {
    if (this.pendingPreviousResume) {
      this.activity = this.pendingPreviousResume;
      const oldStep = parseInt(this.pendingPreviousResume.lastStep) || 0;
      this.currentStep = oldStep;
      this.pendingPreviousResume = null;
      this.renderWizard(document.getElementById('page-container'));
    }
  },

  renderResumeModal(container, em) {
    const stepMap = {0:0, 1:1, 2:2, 3:3, 4:4};
    const stepLabel = this.steps[stepMap[parseInt(em.lastStep)||0]]?.label || 'Iniciar';
    container.innerHTML = `
      <div class="pf-container pf-resume-container fade-in" style="max-width:500px;margin:40px auto;text-align:center;">
        <div class="pf-resume-card">
          <div class="pf-resume-icon"><i data-lucide="alert-circle" style="width:36px;height:36px"></i></div>
          <h2 class="pf-resume-title">Atividade em andamento</h2>
          <p class="pf-resume-sub">Você tem uma atividade iniciada hoje</p>
          <div class="pf-resume-info">
            <div class="pf-resume-row"><span>Cliente</span><strong>${em.clienteNome||'—'}</strong></div>
            <div class="pf-resume-row"><span>Etapa</span><strong>${stepLabel}</strong></div>
          </div>
          <button class="pf-btn-primary" onclick="PadeiroFlow.confirmResume()">
            <i data-lucide="play" style="width:18px;height:18px"></i> Continuar de onde parei
          </button>
          <button class="pf-btn-ghost" onclick="PadeiroFlow.startFresh()">Iniciar nova atividade</button>
        </div>
      </div>`;
    Components.renderIcons();
  },

  confirmResume() {
    if (this.pendingResume) {
      this.activity = this.pendingResume;
      const oldStep = parseInt(this.pendingResume.lastStep) || 0;
      if (oldStep <= 0) this.currentStep = 0;
      else if (oldStep === 1) this.currentStep = 1;
      else if (oldStep === 2) this.currentStep = 2;
      else if (oldStep === 3) this.currentStep = 3;
      else this.currentStep = 4;
      this.pendingResume = null;
    }
    this.renderWizard(document.getElementById('page-container'));
  },

  async startFresh() {
    this.pendingResume = null;
    this.activity = { timeline: [] };
    this.cartItems = {};
    this.selectedFiles = [];
    this.selectedFotosBase64 = [];
    this.isSignatureDrawn = false;
    this.backgroundUploadPromise = null;
    this.backgroundSignaturePromise = null;
    this.currentStep = 0;
    localStorage.removeItem('brago_padeiro_draft');
    await this.fetchTodayClient();
    this.renderWizard(document.getElementById('page-container'));
  },

  async fetchTodayClient() {
    const today = this.getTodayLocal();
    try {
      const agenda = await API.get('/api/cronograma/agenda');
      const slot = agenda.find(a => a.data === today && (!a.status || a.status === 'pendente'));
      if (slot) {
        this.activity.clienteId = slot.clienteId;
        this.activity.clienteNome = slot.clienteNome;
        this.activity.cronogramaId = slot.id || slot._id;
      }
    } catch(e) {}
  },

  renderWizard(container) {
    if (container) container.scrollTop = 0;
    if (this.timerInterval) clearInterval(this.timerInterval);
    const hoje = new Date();
    const dataStr = hoje.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long'});

    container.innerHTML = `
      <div class="pf-container fade-in">
        <!-- Header Top Block (Brago Blue) -->
        <div class="pf-pizza-header-block">
          <div class="pf-pizza-header-top">
            <div style="display:flex; align-items:center; gap:16px;">
              <button class="pf-pizza-back-btn" onclick="App.navigate('padeiro-inicio')">
                <i data-lucide="arrow-left" style="width:20px;height:20px"></i>
              </button>
              <div>
                <h1 class="pf-title" style="margin:0; font-size:22px; font-weight:800;">Registro de Atividade</h1>
                <p class="pf-date" style="margin:2px 0 0; font-size:13px;">${dataStr}</p>
              </div>
            </div>
            <div class="pf-pizza-search-icon">
              <i data-lucide="search" style="width:24px;height:24px"></i>
            </div>
          </div>

          <!-- Stepper inside Header -->
          <div class="pf-stepper" style="margin-bottom:0; padding:0 10px;">
            <div class="pf-stepper-track" style="left:30px; right:30px;">
              <div class="pf-stepper-progress" style="width:${this.currentStep === 0 ? '0' : Math.round((this.currentStep / (this.steps.length - 1)) * 100)}%"></div>
            </div>
            ${this.steps.map((s, i) => {
              const cls = i === this.currentStep ? 'active' : (i < this.currentStep ? 'completed' : '');
              const inner = i < this.currentStep ? '<i data-lucide="check" style="width:16px;height:16px"></i>' : `<i data-lucide="${s.icon}" style="width:16px;height:16px"></i>`;
              return `<div class="pf-step ${cls}"><div class="pf-step-dot">${inner}</div><span class="pf-step-label">${s.label}</span></div>`;
            }).join('')}
          </div>
        </div>

        <!-- Content -->
        <div id="wizard-content" style="padding: 0 8px 40px 8px;"></div>
      </div>`;
    this.renderStep();
    Components.renderIcons();
  },

  renderStep() {
    // Clean up multi-select mode if active
    if (this.multiSelectMode) {
      this.multiSelectMode = false;
      this.multiSelectedIds = new Set();
      document.body.classList.remove('pf-multiselect-mode');
    const bar = document.getElementById('pf-multiselect-bar');
      if (bar) bar.classList.remove('active');
    }
    
    // Hide FAB if not in step 1 (Produção)
    const fab = document.getElementById('pf-cart-fab');
    if (fab && this.currentStep !== 1) {
      fab.classList.remove('visible');
    }

    const c = document.getElementById('wizard-content');
    switch(this.currentStep) {
      case 0: this.stepIniciar(c); break;
      case 1: this.stepProducao(c); break;
      case 2: this.stepAvaliarCliente(c); break;
      case 3: this.stepAvaliacao(c); break;
      case 4: this.stepFinalizar(c); break;
    }
    Components.renderIcons();
  },

  async captureTimelineEvent(stepName) {
    if (!this.activity.timeline) this.activity.timeline = [];
    
    // Fallback manual local caso LocationService falhe
    const event = {
      step: stepName,
      timestamp: new Date().toISOString(),
      lat: null,
      lng: null
    };

    if (typeof LocationService !== 'undefined') {
      const locData = await LocationService.captureAction(stepName, { atividadeId: this.activity.id, clienteId: this.activity.clienteId, clienteNome: this.activity.clienteNome });
      if (locData && locData.coords) {
        event.lat = locData.coords.lat;
        event.lng = locData.coords.lng;
      }
    } else {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 15000, 
            enableHighAccuracy: true,
            maximumAge: 60000 // Aceita localização de até 1 minuto atrás
          });
        });
        event.lat = pos.coords.latitude;
        event.lng = pos.coords.longitude;
      } catch (e) {
        console.warn('Não foi possível obter localização para a timeline (fallback):', e);
      }
    }
    
    this.activity.timeline.push(event);
    if (typeof this.saveDraftLocally === 'function') {
      this.saveDraftLocally();
    }
  },

  // STEP 0: INICIAR
  async stepIniciar(c) {
    const today = this.getTodayLocal();
    let agendaHoje = [];
    try { 
      const agenda = await API.get('/api/cronograma/agenda');
      agendaHoje = agenda.filter(a => a.data === today && (!a.status || a.status === 'pendente' || a.status === 'em_andamento'));
    } catch(e) {}
    
    // Garantir que a tarefa preenchida via prefill (vindo da agenda semanal) seja inclusa e exibida
    if (this.activity.clienteId) {
      const exists = agendaHoje.some(a => a.clienteId === this.activity.clienteId);
      if (!exists) {
        agendaHoje.unshift({
          id: this.activity.cronogramaId,
          _id: this.activity.cronogramaId,
          clienteId: this.activity.clienteId,
          clienteNome: this.activity.clienteNome,
          horario: 'Especial'
        });
      }
    }

    // Garantir que a tarefa atualizada do servidor (novo ID caso recriada) seja usada
    if (agendaHoje.length > 0) {
      if (!this.activity.clienteId) {
        this.activity.clienteId = agendaHoje[0].clienteId;
        this.activity.clienteNome = agendaHoje[0].clienteNome;
        this.activity.cronogramaId = agendaHoje[0].id || agendaHoje[0]._id;
      } else {
        const matchingTask = agendaHoje.find(a => a.clienteId === this.activity.clienteId);
        if (matchingTask) {
          this.activity.cronogramaId = matchingTask.id || matchingTask._id;
          this.activity.clienteNome = matchingTask.clienteNome;
        } else {
          this.activity.clienteId = agendaHoje[0].clienteId;
          this.activity.clienteNome = agendaHoje[0].clienteNome;
          this.activity.cronogramaId = agendaHoje[0].id || agendaHoje[0]._id;
        }
      }
    }

    const has = !!this.activity.clienteId;
    const canSelect = agendaHoje.length > 1;

    c.innerHTML = `
      <div class="pf-highlight-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <label class="pf-label" style="color: #1E4BFF; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 8px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
            <i data-lucide="store" style="width:18px;height:18px"></i> Cliente Agendado
          </label>
          <span class="pf-badge-hoje">
            <span class="pf-pulse-dot"></span>
            HOJE
          </span>
        </div>
        <div class="pf-select-wrap">
          <select class="pf-select pf-select-highlight" id="flow-cliente" ${!canSelect ? 'disabled' : 'onchange="PadeiroFlow.onClientChange()"'}>
            ${agendaHoje.length === 0 
              ? '<option value="">Nenhuma tarefa para hoje...</option>' 
              : agendaHoje.map(a => `
                <option value="${a.clienteId}" 
                        data-nome="${a.clienteNome}" 
                        data-cronograma="${a.id || a._id}"
                        ${this.activity.clienteId === a.clienteId ? 'selected' : ''}>
                  ${a.clienteNome} (${a.horario || '08:00'})
                </option>`).join('')
            }
          </select>
          <div class="pf-select-lock" style="color: #1E4BFF;"><i data-lucide="${canSelect ? 'chevron-down' : 'lock'}" style="width:14px;height:14px"></i></div>
        </div>
      </div>
      <div class="pf-step-header" style="text-align: center; justify-content: center; width: 100%;">
        <div>
          <p class="pf-step-sub">${canSelect ? 'Selecione uma das suas tarefas de hoje.' : 'Confirme sua tarefa agendada para hoje.'}</p>
        </div>
      </div>
      <button id="pf-btn-start" class="pf-btn-primary pf-btn-full" ${!has?'disabled':''} onclick="PadeiroFlow.startActivity()">
        <i data-lucide="arrow-right" style="width:18px;height:18px"></i> Iniciar Atendimento
      </button>`;
    Components.renderIcons();
  },

  async startActivity() {
    const sel = document.getElementById('flow-cliente');
    const nome = sel.options[sel.selectedIndex]?.dataset.nome;
    try {
      if (!this.activity.cronogramaId) await this.fetchTodayClient();
      
      const clientGeneratedId = 'act_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      const today = this.getTodayLocal();
      const now = new Date();
      
      let tempoMinimoMinutos = 0;
      try {
        const agenda = await API.get('/api/cronograma/agenda');
        const slot = agenda.find(a => (a.id || a._id) === this.activity.cronogramaId);
        if (slot) tempoMinimoMinutos = slot.tempoMinimoMinutos || 0;
      } catch (e) {}

      const body = { 
        id: clientGeneratedId,
        clienteId: sel.value, 
        clienteNome: nome, 
        cronogramaId: this.activity.cronogramaId || null, 
        lastStep: 1, 
        timeline: [],
        inicioEm: now.toISOString(),
        data: today,
        hora: now.toTimeString().split(' ')[0],
        tempoMinimoMinutos: tempoMinimoMinutos
      };

      const a = await API.post('/api/atividades', body);
      
      if (a && a.offline) {
        this.activity = {
          ...body,
          status: 'em_andamento'
        };
        this.saveDraftLocally();
      } else {
        this.activity = a;
      }
      
      if (!this.activity.timeline) this.activity.timeline = [];
      
      // Captura localização e salva
      await this.captureTimelineEvent('Início do Atendimento');
      await this.updateActivity();

      try {
        if (this.activity.cronogramaId) await API.patch(`/api/cronograma/agenda/${this.activity.cronogramaId}/status`, { status: 'em_andamento' });
      } catch (err) {
        console.warn('Aviso: Erro ao atualizar status na agenda (pode ter sido excluida).', err);
      }
      this.currentStep = 1;
      this.renderWizard(document.getElementById('page-container'));
      Components.toast('Atividade iniciada!', 'success');
    } catch(e) { Components.toast(e.message, 'error'); }
  },
  
  onClientChange() {
    const sel = document.getElementById('flow-cliente');
    const btn = document.getElementById('pf-btn-start');
    if (sel && btn) {
      btn.disabled = !sel.value;
      const opt = sel.options[sel.selectedIndex];
      this.activity.clienteId = sel.value;
      this.activity.clienteNome = opt.dataset.nome;
      this.activity.cronogramaId = opt.dataset.cronograma;
    }
  },

  // STEP 1: PRODUÇÃO (Produtos + Fotos combinados)
  async stepProducao(c) {
    let produtos = [];
    
    // 1. Tenta carregar do cache offline instantaneamente para evitar travar a renderização
    if (typeof OfflineManager !== 'undefined') {
      try {
        const cached = await OfflineManager.getCachedData('/api/produtos');
        if (cached && Array.isArray(cached) && cached.length > 0) {
          produtos = cached;
          console.log('[FastLoad] Catálogo carregado do cache local:', produtos.length);
        }
      } catch (err) {
        console.warn('Erro ao carregar cache local de produtos:', err);
      }
    }

    // 2. Se não houver nada no cache local (ex: primeira execução), busca na rede de forma síncrona
    if (produtos.length === 0) {
      try {
        produtos = await API.get('/api/produtos');
      } catch(e) {
        console.error('Erro ao buscar produtos online:', e);
      }
    } else {
      // Busca atualizações na rede em segundo plano de forma assíncrona
      API.get('/api/produtos')
        .then(async (freshProds) => {
          if (freshProds && Array.isArray(freshProds) && freshProds.length > 0) {
            const hasChanged = freshProds.length !== produtos.length || 
                              JSON.stringify(freshProds[0]) !== JSON.stringify(produtos[0]);
            
            this.cachedProdutos = freshProds;
            this.activeProds = freshProds.filter(p => p.ativo !== false);
            
            if (hasChanged && this.currentStep === 1) {
              console.log('[FastLoad] Novo catálogo recebido do servidor. Atualizando tela...');
              
              if (typeof OfflineManager !== 'undefined') {
                OfflineManager.loadPhotosToMemoryCache(this.activeProds);
              }
              
              this.currentFilteredProds = this.activeProds;
              this.renderProductBatch(true);
            }
          }
        })
        .catch(err => console.warn('Erro ao sincronizar produtos em segundo plano:', err));
    }

    this.cachedProdutos = produtos;
    
    if (!this.selectedFiles || this.selectedFiles.length === 0) {
      this.restoreDraftLocally();
    }

    const activeProds = produtos.filter(p => p.ativo !== false);
    
    // Popula o cache de imagens em memória em background
    if (typeof OfflineManager !== 'undefined') {
      try {
        OfflineManager.loadPhotosToMemoryCache(activeProds);
      } catch (e) {
        console.warn('Erro ao carregar cache de fotos:', e);
      }
    }

    this.activeProds = activeProds;
    this.currentFilteredProds = activeProds;
    this.renderLimit = 50;
    this.renderedCount = 0;
    let fornecedores = [...new Set(activeProds.map(p => p.fornecedor).filter(f => f && f.trim() !== ''))];
    
    const PRIORITY = ['IREKS']; // Adicione outras marcas populares aqui se precisar
    fornecedores.sort((a, b) => {
      const isA = PRIORITY.some(p => a.toUpperCase().includes(p));
      const isB = PRIORITY.some(p => b.toUpperCase().includes(p));
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return a.localeCompare(b);
    });

    c.innerHTML = `
      <div class="pf-step-header pf-animate-cascade" style="animation-delay: 0.05s">
        <div class="pf-step-icon pf-icon-green"><i data-lucide="package" style="width:24px;height:24px"></i></div>
        <div>
          <h2 class="pf-step-title">Produção Realizada</h2>
          <p class="pf-step-sub">Selecione os produtos e informe a quantidade.</p>
        </div>
      </div>

      <!-- 1. Grid Dashboard (2x2) -->
      <div class="pf-dashboard-grid pf-animate-cascade" style="animation-delay: 0.10s">
        <!-- Card 1: KG -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="scale" style="width:14px;height:14px"></i> Peso Total</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-kg-display">${this.activity.kgTotal || '0.0'}</span>
            <span class="pf-dash-card-unit">KG</span>
          </div>
        </div>
        
        <!-- Card 2: Litros -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="droplet" style="width:14px;height:14px"></i> Líquidos</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-l-display">${this.activity.lTotal || '0.0'}</span>
            <span class="pf-dash-card-unit">L</span>
          </div>
        </div>

        <!-- Card 3: Itens -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="package" style="width:14px;height:14px"></i> Produtos</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-items-display">0</span>
            <span class="pf-dash-card-unit" style="font-size:12px; margin-left:2px;">itens</span>
          </div>
        </div>

        <!-- Card 4: Unidades -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="box" style="width:14px;height:14px"></i> Unidades</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-un-display">0</span>
            <span class="pf-dash-card-unit" style="font-size:12px; margin-left:2px;">un</span>
          </div>
        </div>
      </div>
      
      <input type="hidden" id="flow-kg-total" value="${this.activity.kgTotal || ''}">
      <input type="hidden" id="flow-l-total" value="${this.activity.lTotal || ''}">

      <!-- 2. Produto Selecionado (Banner) -->
      <div class="pf-wallet-banner pf-animate-cascade" style="animation-delay: 0.15s" onclick="PadeiroFlow.openCartModal()">
        <div class="pf-wallet-banner-content">
          <div class="pf-wallet-banner-title">Adicione produtos à sua produção</div>
          <div id="pf-wallet-avatars" class="pf-wallet-avatars-container" style="display:none;"></div>
          <span class="pf-wallet-banner-action" id="flow-recent-action">Carrinho vazio</span>
        </div>
        <div class="pf-wallet-banner-icon">
          <i data-lucide="box" style="width:28px;height:28px"></i>
        </div>
      </div>

      <!-- Horizontal Categories Tabs -->
      <div class="pf-pizza-tabs pf-animate-cascade" style="animation-delay: 0.20s">
        <div class="pf-pizza-tab active" onclick="PadeiroFlow.filterByTab(this, 'all')">Todos</div>
        ${fornecedores.map(f => {
          const isPrio = PRIORITY.some(p => f.toUpperCase().includes(p));
          const prioClass = isPrio ? 'prio' : '';
          const icon = isPrio ? '<i data-lucide="star" style="width:14px;height:14px;margin-right:4px;"></i>' : '';
          return `<div class="pf-pizza-tab ${prioClass}" onclick="PadeiroFlow.filterByTab(this, '${f.trim().toLowerCase()}')">${icon}${f.trim().split(' ')[0]}</div>`;
        }).join('')}
      </div>

      <!-- Search Bar -->
      <div class="pf-search-container pf-animate-cascade" style="animation-delay: 0.25s; margin-bottom: 20px;">
        <i data-lucide="search" class="pf-search-icon" style="width:18px;height:18px"></i>
        <input type="text" class="pf-search-input" id="flow-prod-search" placeholder="Pesquisar produto por nome ou código..." oninput="PadeiroFlow.filterProducts(this.value)">
      </div>

      <!-- Products List (Pizza App Style) -->
      <div id="kg-items" class="pf-pizza-list">
        <!-- Itens carregados via Lazy Loading -->
      </div>
      <div id="pf-load-more-sentinel" class="pf-skeleton-loader" style="display: none;">
        <div class="pf-skeleton-row">
          <div class="pf-skeleton-img"></div>
          <div class="pf-skeleton-content">
            <div class="pf-skeleton-line-1"></div>
            <div class="pf-skeleton-line-2"></div>
          </div>
          <div class="pf-skeleton-btn"></div>
        </div>
        <div class="pf-skeleton-row">
          <div class="pf-skeleton-img"></div>
          <div class="pf-skeleton-content">
            <div class="pf-skeleton-line-1"></div>
            <div class="pf-skeleton-line-2"></div>
          </div>
          <div class="pf-skeleton-btn"></div>
        </div>
        <div class="pf-skeleton-row">
          <div class="pf-skeleton-img"></div>
          <div class="pf-skeleton-content">
            <div class="pf-skeleton-line-1"></div>
            <div class="pf-skeleton-line-2"></div>
          </div>
          <div class="pf-skeleton-btn"></div>
        </div>
      </div>`;

    // Setup persistent photos container for the cart modal
    let fotosContainer = document.getElementById('pf-fotos-persistent-container');
    if (!fotosContainer) {
      fotosContainer = document.createElement('div');
      fotosContainer.id = 'pf-fotos-persistent-container';
      fotosContainer.className = 'pf-section';
      fotosContainer.style.marginTop = '16px';
      fotosContainer.innerHTML = `
        <div class="pf-section-label" style="font-weight:700; color:#1e293b; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          Fotos da Produção
        </div>
        <div id="foto-preview-grid">
          <div class="pf-photo-add" onclick="PadeiroFlow.triggerCamera()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            <span style="font-size:12px; margin-top:4px;">Adicionar</span>
          </div>
        </div>
      `;
      document.body.appendChild(fotosContainer);
      fotosContainer.style.display = 'none'; // hidden by default
    } else {
      // Container já existe: SEMPRE limpar fotos da atividade anterior
      const grid = document.getElementById('foto-preview-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="pf-photo-add" onclick="PadeiroFlow.triggerCamera()">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            <span style="font-size:12px; margin-top:4px;">Adicionar</span>
          </div>
        `;
      }
    }

    // Se há fotos no estado atual (rascunho/retomada legítima), restaurar no grid
    if (this.selectedFotosBase64 && this.selectedFotosBase64.length > 0) {
      setTimeout(() => {
        this.selectedFotosBase64.forEach(b64 => {
          PadeiroFlow.renderPhotoPreviewBase64(b64.data, b64.name);
        });
      }, 50);
    }

    const staticInput = document.getElementById('camera-input-static');
    
    // Normal Flow (no crash) - async compression
    staticInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      if (typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Otimizando fotos...', 'info', 2000);
      }
      
      const compressedFiles = await Promise.all(
        files.map(async (f) => {
          try {
            return await PadeiroFlow.compressImage(f);
          } catch (err) {
            console.error('Erro ao comprimir imagem, usando original:', err);
            return f;
          }
        })
      );
      
      this.selectedFiles = this.selectedFiles || [];
      this.selectedFotosBase64 = this.selectedFotosBase64 || [];
      compressedFiles.forEach(f => {
        this.selectedFiles.push(f);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const b64 = ev.target.result;
          PadeiroFlow.renderPhotoPreviewBase64(b64, f.name);
          this.selectedFotosBase64.push({ name: f.name, data: b64, type: f.type });
          PadeiroFlow.saveDraftLocally();
        };
        reader.readAsDataURL(f);
      });
      
      e.target.value = '';
      this.saveDraftLocally();
    };

    // Crash Recovery Flow: Check if OS restored files after OOM kill
    if (staticInput && staticInput.files && staticInput.files.length > 0) {
      console.log('Recuperando fotos pós-crash OOM...');
      const files = Array.from(staticInput.files);
      (async () => {
        const compressedFiles = await Promise.all(
          files.map(async (f) => {
            try {
              return await PadeiroFlow.compressImage(f);
            } catch (err) {
              return f;
            }
          })
        );
        compressedFiles.forEach(f => {
          this.selectedFiles.push(f);
          const dataUrl = URL.createObjectURL(f);
          PadeiroFlow.renderPhotoPreviewBase64(dataUrl, f.name);
        });
        staticInput.value = '';
        this.saveDraftLocally();
      })();
    }

    this.restoreDraftLocally();
    this.calculateTotals(); // Initial calc
    this.renderProductBatch(true); // First batch
    this.setupLongPress(); // Multi-select via long-press
    this.setupLazyLoading();
    Components.renderIcons();

    // Check if there is a pending restored photo from Capacitor's appRestoredResult
    if (window.lastRestoredPhoto) {
      const restoredPhoto = window.lastRestoredPhoto;
      window.lastRestoredPhoto = null; // consume
      setTimeout(() => {
        this.handleRestoredPhoto(restoredPhoto);
      }, 100);
    }

    // Launch onboarding tutorial (only once)
    setTimeout(() => this.startTutorial(), 800);
  },

  filterProducts(query) {
    const q = query.toLowerCase();
    
    // Clear active tab if searching
    if (q.length > 0) {
      document.querySelectorAll('.pf-pizza-tab').forEach(el => el.classList.remove('active'));
    }

    this.currentFilteredProds = this.activeProds.filter(p => {
       const desc = (p.descricao || '').toLowerCase();
       const code = (p.codigo || '').toLowerCase();
       return desc.includes(q) || code.includes(q);
    });
    
    this.renderProductBatch(true);
  },

  filterByTab(element, fornecedor) {
    // Clear search when clicking a tab
    const searchInput = document.getElementById('flow-prod-search');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.pf-pizza-tab').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    if (fornecedor === 'all') {
      this.currentFilteredProds = this.activeProds;
    } else {
      this.currentFilteredProds = this.activeProds.filter(p => {
        const rowFornecedor = (p.fornecedor || 'sem fornecedor').trim().toLowerCase();
        return rowFornecedor === fornecedor;
      });
    }
    
    this.renderProductBatch(true);
  },

  renderProductBatch(reset = false) {
    const container = document.getElementById('kg-items');
    if (!container) return;
    
    if (reset) {
      this.renderedCount = 0;
      this.renderLimit = 50;
      container.innerHTML = '';
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    const itemsToRender = this.currentFilteredProds.slice(this.renderedCount, this.renderLimit);
    if (itemsToRender.length === 0 && this.renderedCount > 0) return;

    const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";

    const html = itemsToRender.map((p, idx) => {
      const safeDesc = p.descricao.replace(/'/g, "\\'");
      const safeCode = (p.codigo || '').replace(/'/g, "\\'");
      const imgSrc = typeof OfflineManager !== 'undefined'
        ? OfflineManager.getProductPhotoSrc(p.codigo, p.temFoto, fallbackSvg)
        : (p.temFoto && p.codigo ? `/api/foto-produto/${p.codigo}` : fallbackSvg);
      const animDelay = idx < 15 && reset ? 0.05 + idx * 0.02 : 0;
      
      return `
      <div class="pf-pizza-row fade-in" style="animation-delay: ${animDelay}s" data-id="${p.id}" data-fornecedor="${(p.fornecedor || 'sem fornecedor').trim().toLowerCase()}" data-descricao="${(p.descricao||'').toLowerCase()}" data-codigo="${(p.codigo || '').toLowerCase()}" data-orig-desc="${safeDesc}" data-orig-code="${safeCode}">
        <div class="pf-multiselect-checkbox"></div>
        <div class="pf-pizza-img-wrap">
          <img data-product-code="${p.codigo || ''}" src="${imgSrc}" onerror="this.src='${fallbackSvg}'" alt="${p.descricao}" loading="lazy">
        </div>
        
        <div class="pf-pizza-content">
          <h3 class="pf-pizza-title">${p.descricao}</h3>
          <span class="pf-pizza-desc">Cód: ${p.codigo || 'Sem código'}</span>
        </div>

        <div id="cart-item-display-${p.id}">
          <!-- Renderizado via calculateTotals -->
        </div>
      </div>
    `}).join('');

    container.insertAdjacentHTML('beforeend', html);
    this.renderedCount += itemsToRender.length;

    // Atualiza os carrinhos/inputs recém renderizados
    this.calculateTotals();
    
    // Renderiza ícones e carrega imagens em cache local/offline
    Components.renderIcons();

    // Gerencia o sentinel
    const sentinel = document.getElementById('pf-load-more-sentinel');
    if (sentinel) {
      if (this.renderedCount >= this.currentFilteredProds.length) {
        sentinel.style.display = 'none';
      } else {
        sentinel.style.display = 'flex';
      }
    }
  },

  setupLazyLoading() {
    const sentinel = document.getElementById('pf-load-more-sentinel');
    if (!sentinel) return;

    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }

    this._intersectionObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        // Mostrar mais
        if (this.renderedCount < this.currentFilteredProds.length) {
          // Pequeno delay para exibir o skeleton visualmente
          setTimeout(() => {
            this.renderLimit += 50;
            this.renderProductBatch();
          }, 300);
        }
      }
    }, {
      rootMargin: '200px' // Começa a carregar 200px antes de chegar no fim
    });

    this._intersectionObserver.observe(sentinel);
  },

  // ==========================================
  // MULTI-SELECT (Long-Press)
  // ==========================================

  setupLongPress() {
    const container = document.getElementById('kg-items');
    if (!container) return;

    // Delegated touch events
    container.addEventListener('touchstart', (e) => {
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;
      
      const touch = e.touches[0];
      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
      
      this._longPressMoved = false;
      this._longPressTriggered = false;
      this._longPressTimer = setTimeout(() => {
        if (!this._longPressMoved) {
          this._longPressTriggered = true;
          if (navigator.vibrate) navigator.vibrate(50);
          row.classList.add('pf-longpress-active');
          setTimeout(() => row.classList.remove('pf-longpress-active'), 500);
          this.enterMultiSelectMode(row.dataset.id);
        }
      }, 220); // Reduzido de 350ms para 220ms
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!this._longPressTimer) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - this._touchStartX);
      const deltaY = Math.abs(touch.clientY - this._touchStartY);
      
      // Cancela apenas se mover mais de 10px (evita cancelar com micro-movimentos do dedo)
      if (deltaX > 10 || deltaY > 10) {
        this._longPressMoved = true;
        clearTimeout(this._longPressTimer);
      }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      clearTimeout(this._longPressTimer);
      if (this._longPressTriggered) {
        e.preventDefault();
        // Atrasamos a limpeza para que o evento 'click' simulado pelo mobile seja engolido no manipulador de clique
        setTimeout(() => {
          this._longPressTriggered = false;
        }, 300);
      }
    });

    // Delegated mouse events
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // only left click
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;
      this._longPressMoved = false;
      this._longPressTriggered = false;
      this._longPressTimer = setTimeout(() => {
        if (!this._longPressMoved) {
          this._longPressTriggered = true;
          row.classList.add('pf-longpress-active');
          setTimeout(() => row.classList.remove('pf-longpress-active'), 500);
          this.enterMultiSelectMode(row.dataset.id);
        }
      }, 220); // Reduzido de 350ms para 220ms
    });

    container.addEventListener('mousemove', () => {
      this._longPressMoved = true;
      clearTimeout(this._longPressTimer);
    });

    container.addEventListener('mouseup', () => {
      clearTimeout(this._longPressTimer);
    });

    // Click handler: toggle selection
    container.addEventListener('click', (e) => {
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;

      if (this._longPressTriggered) {
        e.preventDefault();
        e.stopPropagation();
        this._longPressTriggered = false;
        return;
      }
      if (!this.multiSelectMode) return;
      if (e.target.closest('.pf-pizza-add-btn') || e.target.closest('.pf-pizza-tag')) return;
      
      e.preventDefault();
      e.stopPropagation();
      this.toggleMultiSelect(row.dataset.id);
    });

    container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.pf-pizza-row')) {
        e.preventDefault();
      }
    });
  },

  enterMultiSelectMode(firstId) {
    if (this.multiSelectMode) return;
    this.multiSelectMode = true;
    this.multiSelectedIds = new Set();
    this.multiSelectedIds.add(firstId);
    document.body.classList.add('pf-multiselect-mode');

    // Mark first selected row
    const firstRow = document.querySelector(`.pf-pizza-row[data-id="${firstId}"]`);
    if (firstRow) {
      firstRow.classList.add('pf-multi-selected', 'pf-select-pop');
      setTimeout(() => firstRow.classList.remove('pf-select-pop'), 300);
    }

    // Create or show the floating toolbar
    this.renderMultiSelectBar();
  },

  exitMultiSelectMode() {
    this.multiSelectMode = false;
    this.multiSelectedIds = new Set();
    document.body.classList.remove('pf-multiselect-mode');

    // Remove selection from all rows
    document.querySelectorAll('.pf-pizza-row.pf-multi-selected').forEach(row => {
      row.classList.remove('pf-multi-selected');
    });

    // Hide the toolbar
    const bar = document.getElementById('pf-multiselect-bar');
    if (bar) bar.classList.remove('active');

    // Recalculate to restore normal "Adicionar" buttons
    this.calculateTotals();
  },

  toggleMultiSelect(id) {
    if (!this.multiSelectMode) return;
    const row = document.querySelector(`.pf-pizza-row[data-id="${id}"]`);
    if (!row) return;

    if (this.multiSelectedIds.has(id)) {
      this.multiSelectedIds.delete(id);
      row.classList.remove('pf-multi-selected');
    } else {
      this.multiSelectedIds.add(id);
      row.classList.add('pf-multi-selected', 'pf-select-pop');
      setTimeout(() => row.classList.remove('pf-select-pop'), 300);
      // Vibrate on selection
      if (navigator.vibrate) navigator.vibrate(30);
    }

    // If no items selected, exit mode
    if (this.multiSelectedIds.size === 0) {
      this.exitMultiSelectMode();
      return;
    }

    this.updateMultiSelectBar();
  },

  selectAllVisible() {
    document.querySelectorAll('.pf-pizza-row').forEach(row => {
      if (row.style.display !== 'none') {
        const id = row.dataset.id;
        this.multiSelectedIds.add(id);
        row.classList.add('pf-multi-selected');
      }
    });
    this.updateMultiSelectBar();
    if (navigator.vibrate) navigator.vibrate(30);
  },

  addMultiSelectedToCart() {
    if (this.multiSelectedIds.size === 0) return;
    this.cartItems = this.cartItems || {};

    this.multiSelectedIds.forEach(id => {
      if (!this.cartItems[id]) {
        this.cartItems[id] = { v: 1, un: 'KG' };
      }
    });

    const count = this.multiSelectedIds.size;
    this.exitMultiSelectMode();
    this.calculateTotals();
    this.saveDraftLocally();
    this.openCartModal();
    if (typeof Components !== 'undefined' && Components.toast) {
      Components.toast(`${count} produto(s) adicionado(s) ao carrinho!`, 'success');
    }
  },

  renderMultiSelectBar() {
    let bar = document.getElementById('pf-multiselect-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pf-multiselect-bar';
      bar.className = 'pf-multiselect-bar';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div class="pf-multiselect-bar-left">
        <div class="pf-multiselect-close-btn" onclick="PadeiroFlow.exitMultiSelectMode()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
        <div class="pf-multiselect-count" id="pf-multi-count">
          ${this.multiSelectedIds.size} <span>selecionado(s)</span>
        </div>
      </div>
      <div class="pf-multiselect-bar-right">
        <div class="pf-multiselect-select-all-btn" onclick="PadeiroFlow.selectAllVisible()">Todos</div>
        <button class="pf-multiselect-add-btn" id="pf-multi-add-btn" onclick="PadeiroFlow.addMultiSelectedToCart()" ${this.multiSelectedIds.size === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          Adicionar
        </button>
      </div>
    `;

    // Animate in
    setTimeout(() => bar.classList.add('active'), 20);
  },

  updateMultiSelectBar() {
    const countEl = document.getElementById('pf-multi-count');
    if (countEl) {
      countEl.innerHTML = `${this.multiSelectedIds.size} <span>selecionado(s)</span>`;
    }
    const addBtn = document.getElementById('pf-multi-add-btn');
    if (addBtn) {
      addBtn.disabled = this.multiSelectedIds.size === 0;
    }
  },

  quickAddToCart(id, name, code) {
    // Don't process normal clicks while in multi-select mode
    if (this.multiSelectMode) return;
    this.cartItems = this.cartItems || {};
    if (!this.cartItems[id]) {
      this.cartItems[id] = { v: 1, un: 'KG' };
    }
    this.calculateTotals();
    this.saveDraftLocally();
    this.openCartModal();
  },

  changeCartItemUnit(id, un) {
    this.cartItems = this.cartItems || {};
    if (this.cartItems[id]) {
      this.cartItems[id].un = un;
      this.calculateTotals();
      this.saveDraftLocally();
      this.openCartModal();
    }
  },

  openCartModal() {
    let overlay = document.getElementById('pf-cart-modal-overlay');
    let savedScrollTop = 0;
    if (overlay) {
      const contentEl = overlay.querySelector('.pf-modal-ios-content');
      if (contentEl) {
        savedScrollTop = contentEl.scrollTop;
      }
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pf-cart-modal-overlay';
      overlay.className = 'pf-modal-overlay';
      overlay.onclick = (e) => { if (e.target === overlay) PadeiroFlow.closeCartModal() };
      document.body.appendChild(overlay);
    }
    
    this.cartItems = this.cartItems || {};
    const itemIds = Object.keys(this.cartItems);
    
    let itemsHtml = '';
    let totalItemsCount = itemIds.length;
    let totalKg = 0;

    if (itemIds.length === 0) {
      itemsHtml = '<div style="text-align:center; padding: 32px 0; color: #64748b; font-weight:600;">O carrinho está vazio.</div>';
    } else {
      itemsHtml = itemIds.map(id => {
        const item = this.cartItems[id];
        if (item.un === 'KG') {
          totalKg += parseFloat(String(item.v).replace(',', '.')) || 0;
        }
        const prod = this.cachedProdutos ? this.cachedProdutos.find(p => p.id === id) : null;
        const desc = prod ? (prod.descricao || 'Produto') : 'Produto';
        const code = prod ? (prod.codigo || '') : '';
        const hasPhoto = prod ? prod.temFoto : false;
        const imgSrc = typeof OfflineManager !== 'undefined'
          ? OfflineManager.getProductPhotoSrc(code, hasPhoto, '')
          : (hasPhoto && code ? `/api/foto-produto/${code}` : '');
        return `
          <div class="pf-ios-card">
            <div class="pf-ios-card-img">
               ${imgSrc 
                 ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">` 
                 : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; color:#94a3b8;"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
               }
            </div>
            <div class="pf-ios-card-body">
              <div>
                <h4 class="pf-ios-card-title">${desc}</h4>
                <p class="pf-ios-card-desc">Cód: ${code || '---'}</p>
              </div>
              <div class="pf-ios-card-controls">
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                  <div class="pf-ios-qty-wrap">
                    <div class="pf-ios-qty-btn" onclick="PadeiroFlow.changeCartItemQty('${id}', -1)" style="cursor: pointer; color: #1f4cff;">-</div>
                    <input type="text" class="pf-ios-qty-val" value="${item.v}" readonly>
                    <div class="pf-ios-qty-btn" onclick="PadeiroFlow.changeCartItemQty('${id}', 1)" style="cursor: pointer; color: #1f4cff;">+</div>
                  </div>
                  <select class="pf-ios-unit-select" onchange="PadeiroFlow.changeCartItemUnit('${id}', this.value)" style="margin-top: 4px; padding: 2px 6px; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 4px; color: #1f4cff; font-weight: 800; background: transparent; outline: none; text-transform: uppercase;">
                    <option value="KG" ${item.un==='KG'?'selected':''}>KG</option>
                    <option value="L" ${item.un==='L'?'selected':''}>L</option>
                    <option value="UN" ${item.un==='UN'?'selected':''}>UN</option>
                    <option value="PCT" ${item.un==='PCT'?'selected':''}>PCT</option>
                  </select>
                </div>
                <button class="pf-ios-remove" onclick="PadeiroFlow.removeCartItem('${id}')">Remover</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      itemsHtml += `
        <div class="pf-ios-add-more" onclick="PadeiroFlow.closeCartModal()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Adicionar mais itens
        </div>
      `;
    }

    let totalKgStr = totalKg > 0 ? `${totalKg.toFixed(2).replace('.', ',')} KG` : '--';

    const fotosContainer = document.getElementById('pf-fotos-persistent-container');
    if (fotosContainer && overlay.contains(fotosContainer)) {
      document.body.appendChild(fotosContainer);
      fotosContainer.style.display = 'none';
    }

    overlay.innerHTML = `
      <div class="pf-modal-ios">
        <div class="pf-modal-ios-header">
          <button class="pf-modal-ios-back" onclick="PadeiroFlow.closeCartModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h3 class="pf-modal-ios-title">Resumo</h3>
          <div class="pf-modal-ios-right">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </div>
        </div>
        
        <div class="pf-modal-ios-content">
          ${itemsHtml}
          <div id="pf-modal-fotos-slot"></div>
        </div>
        
        <div class="pf-ios-bottom">
          <div class="pf-ios-summary-row">
            <span>Total de Itens</span>
            <span>${totalItemsCount}</span>
          </div>
          <div class="pf-ios-summary-row">
            <span>Status</span>
            <span style="color: #10b981;">Em andamento</span>
          </div>
          <div class="pf-ios-divider"></div>
          <div class="pf-ios-total-row">
            <span>Total Produzido</span>
            <span>${totalKgStr}</span>
          </div>
          <button class="pf-ios-main-btn" onclick="PadeiroFlow.saveProducao()">
            Avançar Produção
          </button>
        </div>
      </div>
    `;

    const fc = document.getElementById('pf-fotos-persistent-container');
    if (fc) {
      fc.style.display = 'block';
      document.getElementById('pf-modal-fotos-slot').appendChild(fc);
    }

    if (savedScrollTop > 0) {
      const contentEl = overlay.querySelector('.pf-modal-ios-content');
      if (contentEl) {
        contentEl.scrollTop = savedScrollTop;
        requestAnimationFrame(() => {
          contentEl.scrollTop = savedScrollTop;
          setTimeout(() => {
            contentEl.scrollTop = savedScrollTop;
          }, 20);
        });
      }
    }

    // Trigger animation
    setTimeout(() => overlay.classList.add('active'), 10);
  },

  closeCartModal() {
    const overlay = document.getElementById('pf-cart-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  removeCartItem(id) {
    this.cartItems = this.cartItems || {};
    delete this.cartItems[id];
    this.calculateTotals();
    this.saveDraftLocally();
    this.openCartModal(); // Refresh modal
  },

  changeCartItemQty(id, delta) {
    this.cartItems = this.cartItems || {};
    if (!this.cartItems[id]) return;
    
    let val = parseFloat(String(this.cartItems[id].v).replace(',', '.')) || 0;
    val += delta;
    if (val <= 0) {
      this.removeCartItem(id);
      return;
    }
    
    this.cartItems[id].v = parseFloat(val.toFixed(2));
    this.calculateTotals();
    this.saveDraftLocally();
    this.openCartModal(); // Refresh modal
  },



  calculateTotals() {
    let totalKg = 0;
    let totalL = 0;
    let totalUn = 0;
    let selectedCount = 0;
    this.cartItems = this.cartItems || {};

    // Calculate totals directly from cartItems (independent of currently rendered DOM rows)
    Object.keys(this.cartItems).forEach(id => {
      const item = this.cartItems[id];
      selectedCount++;
      const val = parseFloat(String(item.v).replace(',', '.')) || 0;
      if (item.un === 'KG') totalKg += val;
      if (item.un === 'L') totalL += val;
      if (item.un === 'UN' || item.un === 'PCT') totalUn += val;
    });

    // Update row visuals for currently rendered rows in DOM
    document.querySelectorAll('.pf-pizza-row').forEach(row => {
      row.classList.remove('selected');
      const id = row.dataset.id;
      const displayWrap = document.getElementById(`cart-item-display-${id}`);
      if (displayWrap) {
        if (this.cartItems[id]) {
          const item = this.cartItems[id];
          row.classList.add('selected');
          displayWrap.innerHTML = `<div class="pf-pizza-tag">${item.v} ${item.un}</div>`;
        } else {
          const origDesc = row.dataset.origDesc || '';
          const origCode = row.dataset.origCode || '';
          displayWrap.innerHTML = `<button class="pf-pizza-add-btn" onclick="PadeiroFlow.quickAddToCart('${id}', '${origDesc}', '${origCode}')">Adicionar</button>`;
        }
      }
    });

    // Update hidden inputs
    const totalKgInput = document.getElementById('flow-kg-total');
    if (totalKgInput) totalKgInput.value = totalKg > 0 ? totalKg.toFixed(2) : '';

    const totalLInput = document.getElementById('flow-l-total');
    if (totalLInput) totalLInput.value = totalL > 0 ? totalL.toFixed(2) : '';

    // Update visible Wallet text
    const displayKg = document.getElementById('flow-wallet-kg-display');
    if (displayKg) displayKg.innerText = totalKg > 0 ? totalKg.toFixed(2) : '0.0';

    const displayL = document.getElementById('flow-wallet-l-display');
    if (displayL) displayL.innerText = totalL > 0 ? totalL.toFixed(2) : '0.0';

    const displayUn = document.getElementById('flow-wallet-un-display');
    if (displayUn) displayUn.innerText = totalUn > 0 ? totalUn : '0';

    const displayItems = document.getElementById('flow-wallet-items-display');
    if (displayItems) displayItems.innerText = selectedCount;

    const bannerAction = document.getElementById('flow-recent-action');
    const bannerTitle = document.querySelector('.pf-wallet-banner-title');
    const avatarsContainer = document.getElementById('pf-wallet-avatars');

    if (bannerAction) {
      if (selectedCount > 0) {
        if (bannerTitle) bannerTitle.innerText = 'Sua Produção';
        bannerAction.innerText = `${selectedCount} item(s) no carrinho`;
        bannerAction.style.background = 'rgba(16, 185, 129, 0.2)';
        bannerAction.style.color = '#34d399';
        bannerAction.style.borderColor = 'rgba(16, 185, 129, 0.2)';

        // Render avatars
        if (avatarsContainer) {
          const cartKeys = Object.keys(this.cartItems);
          const maxAvatars = 5;
          let avatarsHtml = '';
          for (let i = 0; i < Math.min(cartKeys.length, maxAvatars); i++) {
            const key = cartKeys[i];
            const prod = this.cachedProdutos ? this.cachedProdutos.find(p => p.id === key) : null;
            const code = prod ? (prod.codigo || '') : '';
            const hasPhoto = prod ? prod.temFoto : false;
            const imgSrc = typeof OfflineManager !== 'undefined'
              ? OfflineManager.getProductPhotoSrc(code, hasPhoto, '')
              : (hasPhoto && code ? `/api/foto-produto/${code}` : '');
            avatarsHtml += `<div class="pf-wallet-avatar"><img src="${imgSrc}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'85\\' height=\\'85\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23cbd5e1\\' stroke-width=\\'1.5\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'12\\' cy=\\'12\\' r=\\'3\\'/><path d=\\'M3 5h18M3 19h18M3 12h18\\'/></svg>'" /></div>`;
          }
          if (cartKeys.length > maxAvatars) {
            avatarsHtml += `<div class="pf-wallet-avatar-more">+${cartKeys.length - maxAvatars}</div>`;
          }
          avatarsContainer.innerHTML = avatarsHtml;
          avatarsContainer.style.display = 'flex';
        }
      } else {
        if (bannerTitle) bannerTitle.innerText = 'Adicione produtos à sua produção';
        bannerAction.innerText = 'Carrinho vazio';
        bannerAction.style.background = 'rgba(255, 255, 255, 0.1)';
        bannerAction.style.color = '#9ca3af';
        bannerAction.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        if (avatarsContainer) {
          avatarsContainer.style.display = 'none';
          avatarsContainer.innerHTML = '';
        }
      }
    }

    // Handle FAB (Floating Action Button)
    let fab = document.getElementById('pf-cart-fab');
    if (!fab) {
      fab = document.createElement('div');
      fab.id = 'pf-cart-fab';
      fab.className = 'pf-cart-fab';
      fab.onclick = () => PadeiroFlow.openCartModal();
      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        <div id="pf-cart-badge" class="pf-cart-badge">0</div>
      `;
      document.body.appendChild(fab);
    }
    
    if (this.currentStep === 1) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
    
    const badge = document.getElementById('pf-cart-badge');
    if (badge) {
      badge.innerText = selectedCount;
      badge.style.display = selectedCount > 0 ? 'flex' : 'none';
    }

    this.saveDraftLocally();
  },

  addKgRow() {},
  removeKgRow() {},

  async triggerCamera() {
    this.saveDraftLocally();
    
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    
    if (isCapacitor) {
      const { Camera, CameraResultType, CameraSource } = window.Capacitor.Plugins;
      if (Camera) {
        try {
          const image = await Camera.getPhoto({
            quality: 60,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            width: 800,
            height: 800
          });

          // Baixar o blob local da imagem gerada pelo Capacitor
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          
          const filename = `foto_${Date.now()}.jpg`;
          const file = new File([blob], filename, { type: 'image/jpeg' });
          
          // Converter para Data URL (Base64) para renderizar a miniatura na hora
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });

          this.selectedFiles = this.selectedFiles || [];
          this.selectedFotosBase64 = this.selectedFotosBase64 || [];
          
          this.selectedFiles.push(file);
          this.selectedFotosBase64.push({ name: filename, data: dataUrl, type: 'image/jpeg' });
          
          this.renderPhotoPreviewBase64(dataUrl, filename);
          this.saveDraftLocally();
          console.log('[Câmera Nativa] Foto tirada e comprimida com sucesso!');
          return;
        } catch (err) {
          if (err.message && (err.message.includes('User cancelled') || err.message.includes('cancelled'))) {
            console.log('[Câmera Nativa] Seleção cancelada pelo usuário.');
            return;
          }
          console.error('[Câmera Nativa] Erro ao tirar foto nativa:', err);
        }
      }
    }

    const staticInput = document.getElementById('camera-input-static');
    if (staticInput) staticInput.click();
  },

  async handleRestoredPhoto(photoData) {
    if (!photoData || !photoData.webPath) return;
    try {
      if (typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Restaurando foto capturada...', 'info');
      }
      
      const response = await fetch(photoData.webPath);
      const blob = await response.blob();
      
      const filename = `foto_restored_${Date.now()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      // Se o draft ainda não foi restaurado na memória, vamos ler do localStorage primeiro
      // para não perder os produtos que estavam salvos!
      const draftStr = localStorage.getItem('brago_padeiro_draft');
      if (draftStr && (!this.cartItems || Object.keys(this.cartItems).length === 0)) {
        try {
          const draft = JSON.parse(draftStr);
          this.cartItems = {};
          if (draft.items) {
            draft.items.forEach(item => {
              this.cartItems[item.id] = { v: item.v, un: item.un };
            });
          }
          if (draft.fotosBase64) {
            this.selectedFotosBase64 = draft.fotosBase64;
            this.selectedFiles = draft.fotosBase64.map(b64 => this.dataURLtoFile(b64.data, b64.name, b64.type));
          }
        } catch(e) {
          console.warn("Erro ao pré-restaurar rascunho em handleRestoredPhoto", e);
        }
      }

      this.selectedFiles = this.selectedFiles || [];
      this.selectedFotosBase64 = this.selectedFotosBase64 || [];
      
      // Evitar duplicados
      if (!this.selectedFotosBase64.some(f => f.data === dataUrl)) {
        this.selectedFiles.push(file);
        this.selectedFotosBase64.push({ name: filename, data: dataUrl, type: 'image/jpeg' });
        
        // Se estiver no step de produção e o grid de fotos estiver visível no DOM
        const grid = document.getElementById('foto-preview-grid');
        if (grid) {
          this.renderPhotoPreviewBase64(dataUrl, filename);
        }
        
        this.saveDraftLocally();
        if (typeof Components !== 'undefined' && Components.toast) {
          Components.toast('Foto restaurada com sucesso!', 'success');
        }
      }
    } catch (err) {
      console.error('[RestorePhoto] Erro ao processar foto restaurada:', err);
    }
  },

  saveDraftLocally() {
    const totalKg = document.getElementById('flow-kg-total')?.value || '';
    const totalL  = document.getElementById('flow-l-total')?.value || '';
    this.cartItems = this.cartItems || {};
    const items = Object.keys(this.cartItems).map(id => ({
      id,
      v: this.cartItems[id].v,
      un: this.cartItems[id].un
    }));
    const draft = { totalKg, totalL, items, fotosBase64: this.selectedFotosBase64 || [] };
    try {
      localStorage.setItem('brago_padeiro_draft', JSON.stringify(draft));
    } catch(e) {
      console.warn("localStorage quota excedida, salvando sem fotos", e);
      const draftNoFotos = { totalKg, totalL, items, fotosBase64: [] };
      localStorage.setItem('brago_padeiro_draft', JSON.stringify(draftNoFotos));
    }
  },

  restoreDraftLocally() {
    const draftStr = localStorage.getItem('brago_padeiro_draft');
    if (!draftStr) return;
    try {
      const draft = JSON.parse(draftStr);
      this.cartItems = {};
      
      if (draft.items && draft.items.length > 0) {
        draft.items.forEach(item => {
          this.cartItems[item.id] = { v: item.v, un: item.un };
        });
      }
      
      if (draft.fotosBase64 && draft.fotosBase64.length > 0) {
        this.selectedFotosBase64 = draft.fotosBase64;
        this.selectedFiles = draft.fotosBase64.map(b64 => this.dataURLtoFile(b64.data, b64.name, b64.type));
      }
      
      this.calculateTotals();
    } catch(e) {}
  },

  dataURLtoFile(dataurl, filename, mimeType) {
    let arr = dataurl.split(','),
        mime = mimeType || (arr[0].match(/:(.*?);/) || [])[1] || 'image/jpeg',
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  },

  renderPhotoPreviewBase64(dataUrl, fileName) {
    const grid = document.getElementById('foto-preview-grid');
    const slot = document.createElement('div');
    slot.className = 'photo-preview-slot fade-in';
    slot.innerHTML = `<img src="${dataUrl}"><button class="remove-photo" onclick="PadeiroFlow.removePhoto(this,'${fileName}')"><i data-lucide="x"></i></button>`;
    grid.insertBefore(slot, grid.lastElementChild);
    Components.renderIcons();
  },

  removePhoto(btn, name) {
    this.selectedFiles = this.selectedFiles.filter(f => f.name !== name);
    this.selectedFotosBase64 = (this.selectedFotosBase64 || []).filter(f => f.name !== name);
    this.saveDraftLocally();
    btn.closest('.photo-preview-slot').remove();
  },

  compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.6) {
    return new Promise((resolve, reject) => {
      // Se não for imagem, retorna o arquivo original
      if (!file.type.startsWith('image/')) {
        return resolve(file);
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcula novas dimensões mantendo a proporção
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Falha ao gerar blob da imagem comprimida'));
          }
          // Garante a extensão .jpg para o arquivo final comprimido
          const origName = file.name;
          const dotIdx = origName.lastIndexOf('.');
          const nameWithoutExt = dotIdx !== -1 ? origName.substring(0, dotIdx) : origName;
          const compressedFile = new File([blob], `${nameWithoutExt}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      };

      img.src = objectUrl;
    });
  },

  async saveProducao() {
    const items = [];
    let totalKg = 0;
    let totalL = 0;

    if (this.cartItems) {
      Object.keys(this.cartItems).forEach(id => {
        const item = this.cartItems[id];
        const prod = this.cachedProdutos ? this.cachedProdutos.find(p => p.id === id) : null;
        const name = prod ? (prod.descricao || '') : '';
        const code = prod ? (prod.codigo || '') : '';
        const sv = code ? `${code} - ${name}` : name;
        const v = parseFloat(String(item.v).replace(',', '.'));
        if (!isNaN(v) && v > 0) {
           items.push({ produtoId: id, produtoNome: sv, unidade: item.un, quantidade: v });
           if (item.un === 'KG') totalKg += v;
           if (item.un === 'L') totalL += v;
        }
      });
    }

    if (items.length === 0) { Components.toast('Informe a quantidade de pelo menos um produto.', 'error'); return; }

    if (this.selectedFiles.length === 0 && (!this.activity.fotos || this.activity.fotos.length === 0)) {
      Components.showAlert(
        'Foto Obrigatória', 
        'Por favor, adicione pelo menos uma foto da produção finalizada para poder avançar para a próxima etapa.'
      );
      
      // Smooth scroll to the photo section container
      const fc = document.getElementById('pf-fotos-persistent-container');
      if (fc) {
        fc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Temporarily highlight the photo section with a pulse effect/outline
        const originalTransition = fc.style.transition;
        const originalOutline = fc.style.outline;
        const originalOutlineOffset = fc.style.outlineOffset;
        const originalBorderRadius = fc.style.borderRadius;
        const originalBgColor = fc.style.backgroundColor;

        fc.style.transition = 'all 0.3s ease';
        fc.style.outline = '3px solid #f59e0b';
        fc.style.outlineOffset = '4px';
        fc.style.borderRadius = '8px';
        fc.style.backgroundColor = '#fef3c7'; // warm yellow alert background
        
        setTimeout(() => {
          fc.style.outline = originalOutline || 'none';
          fc.style.outlineOffset = originalOutlineOffset || '';
          fc.style.borderRadius = originalBorderRadius || '';
          fc.style.backgroundColor = originalBgColor || 'transparent';
          fc.style.transition = originalTransition || '';
        }, 3000);
      }
      return;
    }

    const iosBtn = document.querySelector('.pf-ios-main-btn');
    const defaultText = iosBtn ? iosBtn.innerHTML : 'Avançar Produção';
    if (iosBtn) {
      iosBtn.disabled = true;
      iosBtn.innerHTML = `<span class="comodato-spinner" style="margin-right:8px; border-top-color: white; border-right-color: white; border-bottom-color: white; width:16px; height:16px; border-width:2px;"></span> ${this.selectedFiles.length > 0 ? 'Enviando fotos...' : 'Salvando...'}`;
      iosBtn.style.opacity = '0.7';
    }

    try {
      this.activity.kgTotal  = parseFloat(totalKg) || 0;
      this.activity.lTotal   = parseFloat(totalL)  || 0;
      this.activity.kgItens  = items;
      this.activity.lastStep = 2;

      // Upload fotos aguardando a finalização para não "travar" background
      if (this.selectedFiles.length > 0) {
        Components.toast('Enviando fotos, por favor aguarde...', 'info');
        const result = await API.uploadFiles(this.selectedFiles, 'producao');
        this.activity.fotos = result.files || [];
        this.selectedFiles = [];
        this.selectedFotosBase64 = [];
        Components.toast('Fotos enviadas com sucesso!', 'success');
      }

      localStorage.removeItem('brago_padeiro_draft');
      await this.captureTimelineEvent('Fim da Produção');
      await this.updateActivity();
      
      // Fecha o modal só depois de concluir tudo
      this.closeCartModal();
      
      this.currentStep = 2;
      this.renderWizard(document.getElementById('page-container'));
    } catch (err) {
      console.error(err);
      Components.toast('Erro ao salvar produção: ' + err.message, 'error');
      if (iosBtn) {
        iosBtn.disabled = false;
        iosBtn.style.opacity = '1';
        iosBtn.innerHTML = defaultText;
      }
    }
  },

  // STEP 2: AVALIAR CLIENTE (Nota do padeiro para o cliente)
  stepAvaliarCliente(c) {
    c.innerHTML = `
      <div class="pf-step-header">
        <div class="pf-step-icon" style="background: rgba(255, 149, 0, 0.1); color: #FF9500;"><i data-lucide="smile" style="width:24px;height:24px"></i></div>
        <div>
          <h2 class="pf-step-title">Avaliar Cliente</h2>
          <p class="pf-step-sub">Como foi o atendimento com o cliente hoje?</p>
        </div>
      </div>

      <!-- Rating -->
      <div class="pf-section">
        <div class="pf-section-label"><i data-lucide="smile" style="width:14px;height:14px"></i> Nota para o Cliente</div>
        <div class="pf-rating-box" style="margin-top:12px;">
          <p class="pf-rating-hint">Toque nas estrelas para avaliar o cliente</p>
          <div class="pf-stars-wrap">${Components.starRating(this.activity.notaPadeiroCliente || 0, 'nota-padeiro-cliente')}</div>
        </div>
      </div>

      <!-- Observação -->
      <div class="pf-field-group" style="margin-bottom:24px;">
        <label class="pf-label" style="display:flex;align-items:center;gap:6px;">
          <i data-lucide="message-square" style="width:14px;height:14px"></i> Observação sobre o atendimento
          <span style="font-size:11px;font-weight:500;color:#94a3b8;margin-left:4px;">(opcional)</span>
        </label>
        <textarea
          class="pf-textarea"
          id="flow-obs-cliente"
          rows="3"
          placeholder="Ex: cliente solicitou produto diferente, houve atraso, feedback positivo..."
          style="margin-top:4px;"
        >${this.activity.observacaoCliente || ''}</textarea>
      </div>

      <button id="pf-btn-avaliar-cliente" class="pf-btn-primary pf-btn-full" onclick="PadeiroFlow.saveAvaliacaoCliente()">
        <i data-lucide="arrow-right" style="width:18px;height:18px"></i> Continuar
      </button>`;
    Components.renderIcons();
  },

  async saveAvaliacaoCliente() {
    const stars = document.querySelector('[data-name="nota-padeiro-cliente"]');
    const score = parseInt(stars?.dataset.value) || 0;
    if (score === 0) {
      Components.toast('Dê uma nota para o cliente para continuar.', 'warning');
      return;
    }

    const obsEl = document.getElementById('flow-obs-cliente');
    this.activity.notaPadeiroCliente = score;
    this.activity.observacaoCliente  = obsEl ? obsEl.value.trim() : '';
    this.activity.lastStep = 3;
    
    await this.captureTimelineEvent('Avaliação do Cliente');
    await this.updateActivity();

    this.currentStep = 3;
    this.renderWizard(document.getElementById('page-container'));
  },

  // STEP 3: AVALIAÇÃO (Nota + Assinatura combinados)
  stepAvaliacao(c) {
    c.innerHTML = `
      <div class="pf-step-header">
        <div class="pf-step-icon pf-icon-amber"><i data-lucide="star" style="width:24px;height:24px"></i></div>
        <div>
          <h2 class="pf-step-title">Avaliação & Assinatura</h2>
          <p class="pf-step-sub">Passe o dispositivo ao responsável da loja.</p>
        </div>
      </div>

      <!-- Rating -->
      <div class="pf-section">
        <div class="pf-section-label"><i data-lucide="star" style="width:14px;height:14px"></i> Avaliação do Atendimento</div>
        <div class="pf-rating-box">
          <p class="pf-rating-hint">Toque nas estrelas para avaliar</p>
          <div class="pf-stars-wrap">${Components.starRating(this.activity.notaCliente || this.activity.nota || 0, 'nota-cliente')}</div>
        </div>
        <div class="pf-field-group" style="margin-top:16px">
          <label class="pf-label">Comentário (opcional)</label>
          <textarea class="pf-textarea" id="flow-nota-obs" rows="2" placeholder="Elogio ou observação...">${this.activity.comentario||''}</textarea>
        </div>
      </div>

      <!-- Signature -->
      <div class="pf-section">
        <div class="pf-section-label"><i data-lucide="pen-tool" style="width:14px;height:14px"></i> Assinatura do Responsável</div>
        <div class="pf-signature-box">
          <canvas id="signature-canvas" width="500" height="200" style="width:100%;display:block;touch-action:none;"></canvas>
        </div>
        <button class="pf-btn-ghost pf-btn-sm" onclick="PadeiroFlow.clearSignature()"><i data-lucide="eraser" style="width:14px;height:14px"></i> Limpar</button>
      </div>

      <button class="pf-btn-primary pf-btn-full" onclick="PadeiroFlow.saveAvaliacao()">
        <i data-lucide="arrow-right" style="width:18px;height:18px"></i> Continuar
      </button>`;
    setTimeout(() => this.initSignaturePad(), 100);
    Components.renderIcons();
  },

  initSignaturePad() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    let drawing = false;
    this.isSignatureDrawn = false;
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX-r.left)*(canvas.width/r.width), y: (t.clientY-r.top)*(canvas.height/r.height) };
    };
    canvas.addEventListener('mousedown', e => { drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); this.isSignatureDrawn = true; });
    canvas.addEventListener('mousemove', e => { if(drawing){const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();this.isSignatureDrawn = true;} });
    canvas.addEventListener('mouseup', () => drawing=false);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); this.isSignatureDrawn = true; }, {passive:false});
    canvas.addEventListener('touchmove', e => { e.preventDefault(); if(drawing){const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();this.isSignatureDrawn = true;} }, {passive:false});
  },

  clearSignature() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      this.isSignatureDrawn = false;
    }
  },

  async saveAvaliacao() {
    const stars = document.querySelector('[data-name="nota-cliente"]');
    const score = parseInt(stars.dataset.value) || 0;
    if (score === 0) {
      Components.toast('Por favor, avalie o atendimento antes de continuar.', 'warning');
      return;
    }

    if (!this.isSignatureDrawn) {
      Components.toast('A assinatura do responsável é obrigatória para prosseguir.', 'warning');
      return;
    }

    this.activity.notaCliente = score;
    this.activity.comentario = document.getElementById('flow-nota-obs').value;

    // Save signature (em background)
    const canvas = document.getElementById('signature-canvas');
    if (canvas && this.isSignatureDrawn) {
      const dataUrl = canvas.toDataURL('image/png');
      Components.toast('Enviando assinatura em segundo plano...', 'info');

      this.backgroundSignaturePromise = API.uploadBase64(dataUrl, 'assinaturas')
        .then(async (result) => {
          this.activity.assinatura = result.path;
          if (this.activity.id || this.activity._id) {
            await this.updateActivity();
          }
        })
        .catch(e => {
          console.error('Erro ao fazer upload da assinatura:', e);
          Components.toast('Erro ao salvar assinatura.', 'error');
        });
    }

    this.activity.lastStep = 4;
    await this.captureTimelineEvent('Assinatura e Avaliação');
    await this.updateActivity();

    // BUG FIX: Create a proper Avaliacao record of tipo 'cliente'
    // so the Avaliações page and dashboard can compute client ratings
    if (this.activity.notaCliente > 0) {
      try {
        const user = API.getUser();
        await API.post('/api/avaliacoes', {
          tipo: 'cliente',
          padeiroId: user.id,
          padeiroNome: user.nome,
          clienteId: this.activity.clienteId || '',
          clienteNome: this.activity.clienteNome || '',
          nota: this.activity.notaCliente,
          comentario: this.activity.comentario || '',
          atividadeId: this.activity._id || this.activity.id
        });
      } catch(e) {
        console.error('Erro ao registrar avaliação do cliente:', e);
      }
    }

    this.currentStep = 4;
    this.renderWizard(document.getElementById('page-container'));
  },


  // STEP 4: FINALIZAR
  stepFinalizar(c) {
    const inicio = new Date(this.activity.inicioEm);
    const minMin = this.activity.tempoMinimoMinutos || 0;
    const tempoMs = minMin * 60000;

    c.innerHTML = `
      <div class="pf-step-header" style="justify-content:center;text-align:center;">
        <div>
          <div class="pf-step-icon pf-icon-success" style="margin:0 auto 12px"><i data-lucide="check-circle" style="width:28px;height:28px"></i></div>
          <h2 class="pf-step-title">Finalizar Atendimento</h2>
          <p class="pf-step-sub">Revise e encerre a atividade.</p>
        </div>
      </div>

      <!-- Summary -->
      <div class="pf-summary">
        <div class="pf-summary-row"><span>Cliente</span><strong>${this.activity.clienteNome||'—'}</strong></div>
        ${this.activity.kgTotal > 0 ? `<div class="pf-summary-row"><span>Produção (KG)</span><strong>${this.activity.kgTotal} kg</strong></div>` : ''}
        ${this.activity.lTotal  > 0 ? `<div class="pf-summary-row"><span>Produção (Litros)</span><strong>${this.activity.lTotal} L</strong></div>`  : ''}
        <div class="pf-summary-row"><span>Produtos</span><strong>${(this.activity.kgItens||[]).length} itens</strong></div>
        <div class="pf-summary-row"><span>Sua Nota ao Cliente</span><strong>${this.activity.notaPadeiroCliente||0} ★</strong></div>
        ${this.activity.observacaoCliente ? `<div class="pf-summary-row"><span>Obs. do Atendimento</span><strong style="font-size:12px;color:#475569;text-align:right;max-width:60%;word-break:break-word;">${this.activity.observacaoCliente}</strong></div>` : ''}
      </div>

      <div id="timer-container" style="text-align:center;margin:24px 0;">
        <div id="countdown-wrapper">
          <div id="timer-display" class="pf-timer">⏱ --:--:--</div>
        </div>
        <button id="btn-finalizar" class="pf-btn-primary pf-btn-full pf-btn-success" disabled onclick="PadeiroFlow.finishActivity()">
          <i data-lucide="check" style="width:18px;height:18px"></i> Encerrar Atividade
        </button>
      </div>`;
    Components.renderIcons();

    const updateTimer = () => {
      const dec = new Date() - inicio;
      const rest = tempoMs - dec;
      if (rest <= 0) {
        clearInterval(this.timerInterval);
        const btn = document.getElementById('btn-finalizar');
        if (btn) btn.disabled = false;
        const w = document.getElementById('countdown-wrapper');
        if (w) w.innerHTML = '<p class="pf-timer-ok"><i data-lucide="check-circle" style="width:20px;height:20px"></i> Tempo mínimo atingido</p>';
        Components.renderIcons();
        return;
      }
      const h=Math.floor(rest/3600000), m=Math.floor((rest%3600000)/60000), s=Math.floor((rest%60000)/1000);
      const d = document.getElementById('timer-display');
      if (d) d.innerText = `⏱ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    };
    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  },

  async finishActivity() {
    const btn = document.getElementById('btn-finalizar');
    const originalText = btn.innerHTML;
    
    // Aguardar uploads em background se existirem
    if (this.backgroundUploadPromise || this.backgroundSignaturePromise) {
      btn.disabled = true;
      btn.innerHTML = `<span class="comodato-spinner" style="margin-right:8px"></span> Finalizando envios...`;
      
      try {
        await Promise.race([
          Promise.all([
            this.backgroundUploadPromise || Promise.resolve(),
            this.backgroundSignaturePromise || Promise.resolve()
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de envio')), 15000))
        ]);
      } catch (e) {
        console.error('Erro ao aguardar uploads pendentes:', e);
      }
      
      // Limpar promessas
      this.backgroundUploadPromise = null;
      this.backgroundSignaturePromise = null;
      btn.innerHTML = originalText;
    }

    this.activity.status = 'finalizada';
    this.activity.fimEm = new Date().toISOString();
    await this.captureTimelineEvent('Atividade Encerrada');
    await this.updateActivity();
    try {
      if (this.activity.cronogramaId) await API.patch(`/api/cronograma/agenda/${this.activity.cronogramaId}/status`, { status: 'concluida' });
      if (typeof NotificationService !== 'undefined' && typeof NotificationService.triggerLocalNotification === 'function') {
        const clienteNome = this.activity.clienteNome || 'Cliente';
        NotificationService.triggerLocalNotification('Tarefa Concluída 🥖', `A tarefa para ${clienteNome} foi concluída com sucesso!`);
      }
    } catch (err) {
      console.warn('Aviso: Erro ao concluir tarefa na agenda (pode ter sido excluida).', err);
    }
    
    // Limpar o rascunho para não carregar de volta no próximo atendimento
    localStorage.removeItem('brago_padeiro_draft');
    
    this.renderSuccess();
  },

  renderSuccess() {
    const c = document.getElementById('page-container');
    c.innerHTML = `
      <div class="pf-container fade-in" style="max-width:500px;margin:60px auto;text-align:center;">
        <div class="pf-success-card">
          <div class="pf-success-ring">
            <div class="pf-success-icon"><i data-lucide="check" style="width:40px;height:40px"></i></div>
          </div>
          <h1 class="pf-success-title">Atividade Concluída!</h1>
          <p class="pf-success-sub">Seu registro foi salvo com sucesso.</p>
          <div class="pf-success-stats" style="flex-wrap:wrap;gap:16px;">
            ${this.activity.kgTotal > 0 ? `<div class="pf-stat"><span class="pf-stat-val">${this.activity.kgTotal}</span><span class="pf-stat-label">KG</span></div><div class="pf-stat-divider"></div>` : ''}
            ${this.activity.lTotal  > 0 ? `<div class="pf-stat"><span class="pf-stat-val" style="color:#10b981;">${this.activity.lTotal}</span><span class="pf-stat-label">Litros</span></div><div class="pf-stat-divider"></div>` : ''}
            <div class="pf-stat"><span class="pf-stat-val">${(this.activity.kgItens||[]).length}</span><span class="pf-stat-label">Produtos</span></div>
            <div class="pf-stat-divider"></div>
            <div class="pf-stat"><span class="pf-stat-val">${this.activity.notaPadeiroCliente||0}★</span><span class="pf-stat-label">Nota ao Cliente</span></div>
          </div>
          <button class="pf-btn-primary pf-btn-full" onclick="App.navigate('padeiro-inicio')">
            <i data-lucide="home" style="width:18px;height:18px"></i> Voltar ao Painel
          </button>
        </div>
      </div>`;
    Components.renderIcons();
    this.activity = {}; this.currentStep = 0;
  },

  async updateActivity() {
    const id = this.activity._id || this.activity.id;
    const res = await API.put(`/api/atividades/${id}`, this.activity);
    if (res && !res.offline) this.activity = { ...this.activity, ...res };
  },

  // ============================================================
  //  ONBOARDING TUTORIAL SYSTEM
  // ============================================================
  tutorialSteps: [
    {
      selector: '.pf-search-container',
      title: '1. Pesquisar Produto',
      desc: 'Primeiro, vamos pesquisar por um produto. Clique em "Próximo" para simular a pesquisa pelo termo "IREKS".',
      position: 'bottom',
      padding: 8
    },
    {
      selector: '.pf-pizza-row:first-child',
      title: '2. Selecionar Produto Filtrado',
      desc: 'Veja que a lista filtrou apenas os produtos. Clique em "Próximo" para simular a adição desse produto à sua produção.',
      position: 'bottom',
      padding: 8
    },
    {
      selector: '#pf-multiselect-bar',
      title: '3. Seleção Múltipla (Long-Press)',
      desc: 'Você pode segurar pressionado um produto para selecionar vários de uma vez! Clique em "Próximo" para adicionar os itens selecionados em lote.',
      position: 'bottom',
      padding: 10
    },
    {
      selector: '.pf-ios-qty-wrap',
      title: '4. Informar Peso / Kilos',
      desc: 'No resumo que se abriu, podemos ajustar a quantidade de cada produto. Clique em "Próximo" para simular o preenchimento de 10.0 KG.',
      position: 'bottom',
      padding: 10
    },
    {
      selector: '#pf-fotos-persistent-container',
      title: '5. Fotos da Produção',
      desc: 'Por fim, a área de fotos obrigatórias fica localizada no final deste resumo. Clique em "Começar!" para finalizar a simulação e começar a produzir!',
      position: 'top',
      padding: 12,
      pulse: true
    }
  ],

  _tutorialStep: 0,

  startTutorial() {
    // Only show once (v10 key because of step 2 quickAddToCart modal bypass)
    const key = 'brago_tutorial_producao_v10';
    if (localStorage.getItem(key) === '1') return;

    document.body.classList.add('pf-tutorial-active');
    this._tutorialStep = 0;
    this._showTutorialStep();
  },

  async _showTutorialStep() {
    const steps = this.tutorialSteps;
    const stepIdx = this._tutorialStep;
    if (stepIdx >= steps.length) {
      this._endTutorial();
      return;
    }

    // Execute simulation actions based on the step index before fetching targets
    if (stepIdx === 1) {
      // Step 1: Simulate searching for "ireks"
      const searchInput = document.getElementById('flow-prod-search');
      if (searchInput) {
        searchInput.value = 'ireks';
        this.filterProducts('ireks');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    } else if (stepIdx === 2) {
      // Step 2: Clear search and add the first product, then enter multi-select mode
      const searchInput = document.getElementById('flow-prod-search');
      if (searchInput) {
        searchInput.value = '';
        this.filterProducts('');
      }
      
      const rows = Array.from(document.querySelectorAll('.pf-pizza-row'));
      const visible = rows.filter(r => r.style.display !== 'none');
      if (visible.length >= 3) {
        // Add first item to cart normally (without opening the modal)
        this._simulatedProductId = visible[0].dataset.id;
        this.cartItems = this.cartItems || {};
        this.cartItems[this._simulatedProductId] = { v: 1, un: 'KG' };
        this.calculateTotals();
        this.saveDraftLocally();

        // Put next 2 items in multi-select mode
        const id1 = visible[1].dataset.id;
        const id2 = visible[2].dataset.id;
        this._simulatedMultiIds = [id1, id2];
        this.enterMultiSelectMode(id1);
        this.toggleMultiSelect(id2);
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    } else if (stepIdx === 3) {
      // Step 3: Add multi-selected items to cart (which automatically opens the cart modal)
      this.addMultiSelectedToCart();
      await new Promise(resolve => setTimeout(resolve, 50));
    } else if (stepIdx === 4) {
      // Step 4: Set simulated quantity of 10.0 KG
      const id = this._simulatedProductId;
      if (id && this.cartItems[id]) {
        this.cartItems[id].v = "10.0";
      }
      if (this._simulatedMultiIds) {
        this._simulatedMultiIds.forEach(mId => {
          if (this.cartItems[mId]) this.cartItems[mId].v = "5.0";
        });
      }
      this.calculateTotals();
      this.openCartModal();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const step = steps[stepIdx];
    let target = null;
    let rect = null;

    if (step.selector === '.pf-pizza-row:first-child') {
      const rows = Array.from(document.querySelectorAll('.pf-pizza-row'));
      target = rows.find(r => r.style.display !== 'none');
    } else {
      target = document.querySelector(step.selector);
    }

    if (!target) {
      // Skip this step if element not found
      this._tutorialStep++;
      this._showTutorialStep();
      return;
    }
    
    // Scroll the target element to the center of the scroll container instantly FIRST
    // so we measure its exact post-scroll coordinates.
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    
    const r = target.getBoundingClientRect();
    rect = { top: r.top, left: r.left, width: r.width, height: r.height };

    // Remove previous overlay
    const existing = document.getElementById('pf-tutorial-overlay');
    if (existing) existing.remove();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'pf-tutorial-overlay';
    overlay.className = 'pf-tutorial-overlay';

    const pad = step.padding || 8;
    const spotTop = rect.top - pad;
    const spotLeft = rect.left - pad;
    const spotW = rect.width + pad * 2;
    const spotH = rect.height + pad * 2;

    // Build dots
    let dotsHtml = '<div class="pf-tutorial-dots">';
    for (let i = 0; i < steps.length; i++) {
      dotsHtml += `<div class="pf-tutorial-dot ${i === stepIdx ? 'active' : ''}"></div>`;
    }
    dotsHtml += '</div>';

    // Calculate tooltip position with dynamic safety overrides
    let tooltipStyle = '';
    let arrowClass = '';
    let finalPosition = step.position;

    // If target is too close to top, force bottom placement
    if (spotTop < 120 && finalPosition === 'top') {
      finalPosition = 'bottom';
    }
    // If target is too close to bottom, force top placement
    if (spotTop + spotH > window.innerHeight - 150 && finalPosition === 'bottom') {
      finalPosition = 'top';
    }

    if (finalPosition === 'bottom') {
      const tooltipTop = spotTop + spotH + 16;
      const tooltipLeft = Math.max(16, Math.min(spotLeft, window.innerWidth - 296));
      tooltipStyle = `top:${tooltipTop}px; left:${tooltipLeft}px;`;
      arrowClass = 'arrow-top';
    } else {
      // position = top
      const tooltipLeft = Math.max(16, Math.min(spotLeft, window.innerWidth - 296));
      tooltipStyle = `bottom:${window.innerHeight - spotTop + 16}px; left:${tooltipLeft}px;`;
      arrowClass = 'arrow-bottom';
    }

    const isLast = stepIdx === steps.length - 1;
    const nextLabel = isLast ? 'Começar!' : 'Próximo';

    overlay.innerHTML = `
      <div class="pf-tutorial-click-catcher" onclick="PadeiroFlow._endTutorial()"></div>
      <div class="pf-tutorial-spotlight ${step.pulse ? 'pulse' : ''}" style="top:${spotTop}px; left:${spotLeft}px; width:${spotW}px; height:${spotH}px;"></div>
      <div class="pf-tutorial-tooltip ${arrowClass}" style="${tooltipStyle}">
        <div class="pf-tutorial-step-badge">Passo ${stepIdx + 1} de ${steps.length}</div>
        <h4 class="pf-tutorial-title">${step.title}</h4>
        <p class="pf-tutorial-desc">${step.desc}</p>
        <div class="pf-tutorial-actions">
          ${dotsHtml}
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="pf-tutorial-btn pf-tutorial-btn-skip" onclick="PadeiroFlow._endTutorial()">Pular</button>
            <button class="pf-tutorial-btn pf-tutorial-btn-next" onclick="PadeiroFlow._nextTutorialStep()">${nextLabel}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
    });
  },

  _nextTutorialStep() {
    this._tutorialStep++;
    // Small delay for smooth transition between steps
    const overlay = document.getElementById('pf-tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        this._showTutorialStep();
      }, 300);
    } else {
      this._showTutorialStep();
    }
  },

  _endTutorial() {
    localStorage.setItem('brago_tutorial_producao_v10', '1');
    document.body.classList.remove('pf-tutorial-active');
    
    // Close the cart modal
    this.closeCartModal();
    
    // Exit multi-select if active
    this.exitMultiSelectMode();
    
    // Clear simulated items so user starts fresh
    if (this._simulatedProductId) {
      delete this.cartItems[this._simulatedProductId];
    }
    if (this._simulatedMultiIds) {
      this._simulatedMultiIds.forEach(id => {
        delete this.cartItems[id];
      });
    }
    this.calculateTotals();
    
    this._simulatedProductId = null;
    this._simulatedMultiIds = null;
    
    const overlay = document.getElementById('pf-tutorial-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 350);
    }
  }
};

// ============================================================
// PUSH SERVICE: Inscrição automática de notificações push
// ============================================================
const PushService = {
  async init() {
    // 1. Detectar se estamos em plataforma nativa (Capacitor)
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();

    if (isCapacitor) {
      this.initNativePush();
      return;
    }

    // 2. Fallback para navegador web clássico (Web Push VAPID)
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[Push] Navegador não suporta Push Notifications');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        console.log('[Push] Já inscrito.');
        return;
      }

      // Buscar chave pública VAPID do servidor
      const resp = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await resp.json();
      if (!publicKey) {
        console.log('[Push] VAPID key não configurada no servidor.');
        return;
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Permissão negada pelo usuário.');
        return;
      }

      // Inscrever
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: PushService.urlBase64ToUint8Array(publicKey)
      });

      // Enviar inscrição para o backend
      const token = localStorage.getItem('token');
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      console.log('[Push] Inscrito com sucesso!');
    } catch (err) {
      console.error('[Push] Erro na inscrição:', err);
    }
  },

  async initNativePush() {
    const { PushNotifications } = window.Capacitor.Plugins;
    if (!PushNotifications) {
      console.error('[Push Nativo] Plugin PushNotifications não encontrado no Capacitor.');
      return;
    }

    try {
      // Solicitar permissão no Android 13+
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[Push Nativo] Permissão de notificações negada pelo usuário.');
        return;
      }

      // Registrar dispositivo no Firebase Cloud Messaging (FCM)
      await PushNotifications.register();

      // Listeners do plugin de notificação
      await PushNotifications.addListener('registration', async (token) => {
        const fcmToken = token.value;
        console.log('[Push Nativo] Dispositivo registrado com sucesso. Token FCM:', fcmToken);

        const userToken = localStorage.getItem('token');
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              subscription: {
                endpoint: 'native_fcm_' + fcmToken,
                isNative: true,
                fcmToken: fcmToken
              }
            })
          });
          console.log('[Push Nativo] Token FCM registrado com sucesso no servidor.');
        } catch (err) {
          console.error('[Push Nativo] Erro ao enviar token para o servidor:', err);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[Push Nativo] Erro ao registrar no FCM:', error.error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push Nativo] Notificação recebida (Foreground):', notification);
        const isTaskAdded = notification.title && (
          notification.title.includes('Nova Tarefa') || 
          notification.title.includes('Tarefa Agendada') || 
          notification.title.includes('escala') || 
          notification.title.includes('Escala')
        );
        if (isTaskAdded) {
          // Atualiza a agenda local ao receber a notificação
          if (typeof API !== 'undefined' && typeof API.get === 'function') {
            API.get('/api/cronograma/agenda')
              .then(() => {
                if (typeof App !== 'undefined') {
                  if (App.currentRoute === 'padeiro-agenda') {
                    if (typeof PadeiroAgenda !== 'undefined' && typeof PadeiroAgenda.render === 'function') {
                      PadeiroAgenda.render();
                    }
                  } else if (App.currentRoute === 'padeiro-atividade') {
                    if (typeof PadeiroFlow !== 'undefined' && PadeiroFlow.currentStep === 0 && typeof PadeiroFlow.renderStep === 'function') {
                      console.log('🔄 Recarregando o seletor de tarefas (passo 0) após receber push nativo...');
                      PadeiroFlow.renderStep();
                    }
                  }
                }
              })
              .catch(() => {});
          }
          if (typeof NotificationService !== 'undefined' && typeof NotificationService.triggerLocalNotification === 'function') {
            NotificationService.triggerLocalNotification(notification.title, notification.body);
            return;
          }
        }
        if (typeof Components !== 'undefined' && Components.toast) {
          Components.toast(`🔔 ${notification.title}: ${notification.body}`, 'info', 6000);
        }
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Push Nativo] Ação de push realizada:', action);
        const data = action.notification.data;
        if (data && data.url) {
          console.log('[Push Nativo] Direcionando para URL:', data.url);
          if (typeof App !== 'undefined' && typeof App.renderPage === 'function') {
            const route = data.url.replace(/^\//, '');
            App.renderPage(route || 'padeiro-dashboard');
          }
        }
      });

    } catch (err) {
      console.error('[Push Nativo] Falha ao configurar FCM:', err);
    }
  },

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  },

  // Chamada pelo botão do Dashboard do Gestor
  async notifyAllInactive() {
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/push/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await resp.json();
      if (data.sent > 0) {
        Components.toast(`🔔 ${data.sent} notificação(ões) enviada(s)!`, 'success');
      } else if (data.sent === 0 && data.totalInativos > 0) {
        Components.toast('Nenhum padeiro inativo tem push ativado.', 'warning');
      } else {
        Components.toast('Todos os padeiros já registraram atividade hoje!', 'success');
      }
    } catch (err) {
      console.error('[Push] Erro ao notificar:', err);
      Components.toast('Erro ao enviar notificações', 'error');
    }
  }
};

// Inicializa push silenciosamente após 3 segundos (não bloqueia carregamento)
setTimeout(() => {
  if (localStorage.getItem('token')) {
    PushService.init();
  }
}, 3000);
