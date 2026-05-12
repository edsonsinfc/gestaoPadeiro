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
    { label: 'Avaliação', icon: 'star' },
    { label: 'Finalizar', icon: 'check-circle' }
  ],
  selectedFiles: [],

  getTodayLocal() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  },

  async render(prefill = {}) {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    this.currentStep = 0;
    this.activity = prefill;
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
      const em = atividades.find(a => a.status === 'em_andamento' && a.data === today);
      if (em) { this.pendingResume = em; this.renderResumeModal(container, em); return; }
    } catch(e) {}

    App.routeData = {};
    this.renderWizard(container);
  },

  renderResumeModal(container, em) {
    const stepMap = {0:0, 1:1, 2:1, 3:2, 4:2, 5:3};
    const stepLabel = this.steps[stepMap[em.lastStep||0]]?.label || 'Iniciar';
    container.innerHTML = `
      <div class="pf-container fade-in" style="max-width:500px;margin:40px auto;text-align:center;">
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
      const oldStep = this.pendingResume.lastStep || 0;
      // Map old 6-step to new 4-step
      if (oldStep <= 0) this.currentStep = 0;
      else if (oldStep <= 2) this.currentStep = 1;
      else if (oldStep <= 4) this.currentStep = 2;
      else this.currentStep = 3;
      this.pendingResume = null;
    }
    this.renderWizard(document.getElementById('page-container'));
  },

  async startFresh() {
    this.pendingResume = null;
    this.activity = {};
    this.currentStep = 0;
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
    if (this.timerInterval) clearInterval(this.timerInterval);
    const hoje = new Date();
    const dataStr = hoje.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long'});

    container.innerHTML = `
      <div class="pf-container fade-in">
        <!-- Header -->
        <div class="pf-header">
          <div class="pf-header-left">
            <button class="pf-back-btn" onclick="App.navigate('padeiro-inicio')">
              <i data-lucide="arrow-left" style="width:20px;height:20px"></i>
            </button>
            <div>
              <h1 class="pf-title">Registro de Atividade</h1>
              <p class="pf-date">${dataStr}</p>
            </div>
          </div>
        </div>

        <!-- Stepper -->
        <div class="pf-stepper">
          <div class="pf-stepper-track">
            <div class="pf-stepper-progress" style="width:${this.currentStep === 0 ? '0' : Math.round((this.currentStep / (this.steps.length - 1)) * 100)}%"></div>
          </div>
          ${this.steps.map((s, i) => {
            const cls = i === this.currentStep ? 'active' : (i < this.currentStep ? 'completed' : '');
            const inner = i < this.currentStep ? '<i data-lucide="check" style="width:16px;height:16px"></i>' : `<i data-lucide="${s.icon}" style="width:16px;height:16px"></i>`;
            return `<div class="pf-step ${cls}"><div class="pf-step-dot">${inner}</div><span class="pf-step-label">${s.label}</span></div>`;
          }).join('')}
        </div>

        <!-- Content -->
        <div class="pf-card" id="wizard-content"></div>
      </div>`;
    this.renderStep();
    Components.renderIcons();
  },

  renderStep() {
    const c = document.getElementById('wizard-content');
    switch(this.currentStep) {
      case 0: this.stepIniciar(c); break;
      case 1: this.stepProducao(c); break;
      case 2: this.stepAvaliacao(c); break;
      case 3: this.stepFinalizar(c); break;
    }
    Components.renderIcons();
  },

  // STEP 0: INICIAR
  async stepIniciar(c) {
    const today = this.getTodayLocal();
    let agendaHoje = [];
    try { 
      const agenda = await API.get('/api/cronograma/agenda');
      agendaHoje = agenda.filter(a => a.data === today && (!a.status || a.status === 'pendente' || a.status === 'em_andamento'));
    } catch(e) {}
    
    // Default pre-selection if not already set
    if (!this.activity.clienteId && agendaHoje.length > 0) {
      this.activity.clienteId = agendaHoje[0].clienteId;
      this.activity.clienteNome = agendaHoje[0].clienteNome;
      this.activity.cronogramaId = agendaHoje[0].id || agendaHoje[0]._id;
    }

    const has = !!this.activity.clienteId;
    const canSelect = agendaHoje.length > 1;

    c.innerHTML = `
      <div class="pf-step-header">
        <div class="pf-step-icon pf-icon-blue"><i data-lucide="play" style="width:24px;height:24px"></i></div>
        <div>
          <h2 class="pf-step-title">Iniciar Atendimento</h2>
          <p class="pf-step-sub">${canSelect ? 'Selecione uma das suas tarefas de hoje.' : 'Confirme sua tarefa agendada para hoje.'}</p>
        </div>
      </div>
      <div class="pf-field-group">
        <label class="pf-label"><i data-lucide="store" style="width:14px;height:14px"></i> Cliente Agendado</label>
        <div class="pf-select-wrap">
          <select class="pf-select" id="flow-cliente" ${!canSelect ? 'disabled' : 'onchange="PadeiroFlow.onClientChange()"'}>
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
          <div class="pf-select-lock"><i data-lucide="${canSelect ? 'chevron-down' : 'lock'}" style="width:14px;height:14px"></i></div>
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
      const body = { clienteId: sel.value, clienteNome: nome, cronogramaId: this.activity.cronogramaId || null };
      const a = await API.post('/api/atividades', body);
      this.activity = a;
      if (this.activity.cronogramaId) await API.patch(`/api/cronograma/agenda/${this.activity.cronogramaId}/status`, { status: 'em_andamento' });
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
    try { produtos = await API.get('/api/produtos'); } catch(e) {}
    this.cachedProdutos = produtos;
    this.selectedFiles = [];

    c.innerHTML = `
      <div class="pf-step-header">
        <div class="pf-step-icon pf-icon-green"><i data-lucide="package" style="width:24px;height:24px"></i></div>
        <div>
          <h2 class="pf-step-title">Produção Realizada</h2>
          <p class="pf-step-sub">Registre os produtos e tire fotos.</p>
        </div>
      </div>

      <!-- Produtos Section -->
      <div class="pf-section">
        <div class="pf-section-label"><i data-lucide="list" style="width:14px;height:14px"></i> Itens Produzidos</div>
        <datalist id="produtos-list">
          ${produtos.filter(p=>p.ativo!==false).map(p=>`<option value="${p.codigo?p.codigo+' - ':''}${p.descricao}">`).join('')}
        </datalist>
        <div id="kg-items">
          <div class="pf-prod-row">
            <input class="pf-input kg-produto-search" list="produtos-list" placeholder="Buscar produto...">
            <input class="pf-input pf-input-sm kg-valor" type="number" step="0.1" placeholder="0.0">
            <select class="pf-input pf-input-unit kg-unidade">
              <option value="KG">KG</option><option value="L">L</option><option value="UN">UN</option><option value="PCT">PCT</option>
            </select>
            <button class="pf-row-btn pf-row-del" onclick="PadeiroFlow.removeKgRow(this)" style="visibility:hidden"><i data-lucide="x" style="width:16px;height:16px"></i></button>
          </div>
        </div>
        <button class="pf-add-row" onclick="PadeiroFlow.addKgRow()"><i data-lucide="plus" style="width:16px;height:16px"></i> Adicionar produto</button>
      </div>

      <!-- Peso Total -->
      <div class="pf-total-section">
        <label class="pf-label-center">Resumo da Produção</label>
        <div id="pf-units-summary" class="pf-units-summary">
          <!-- Dynamically filled -->
        </div>
        <div class="pf-total-wrap">
          <input class="pf-total-input" id="flow-kg-total" type="number" step="0.1" value="${this.activity.kgTotal||''}" placeholder="0.0">
          <span class="pf-total-unit">KG Total</span>
        </div>
      </div>

      <!-- Fotos Section -->
      <div class="pf-section">
        <div class="pf-section-label"><i data-lucide="camera" style="width:14px;height:14px"></i> Fotos da Produção</div>
        <div id="foto-preview-grid">
          <div class="pf-photo-add" onclick="document.getElementById('flow-fotos-hidden').click()">
            <i data-lucide="plus-circle" style="width:24px;height:24px"></i>
            <span>Adicionar</span>
            <input type="file" id="flow-fotos-hidden" accept="image/*" capture="environment" multiple style="display:none">
          </div>
        </div>
      </div>

      <button id="pf-btn-producao" class="pf-btn-primary pf-btn-full" onclick="PadeiroFlow.saveProducao()">
        <i data-lucide="arrow-right" style="width:18px;height:18px"></i> Continuar
      </button>`;

    document.getElementById('flow-fotos-hidden').addEventListener('change', e => {
      Array.from(e.target.files).forEach(f => { this.selectedFiles.push(f); this.renderPhotoPreview(f); });
    });

    // Event delegation for real-time calculation
    const itemsContainer = document.getElementById('kg-items');
    itemsContainer.addEventListener('input', () => this.calculateTotals());
    itemsContainer.addEventListener('change', () => this.calculateTotals());
    
    this.calculateTotals(); // Initial calc
    Components.renderIcons();
  },

  calculateTotals() {
    let totalKg = 0;
    const totalsByUnit = {};

    document.querySelectorAll('.pf-prod-row').forEach(row => {
      const val = parseFloat(row.querySelector('.kg-valor').value) || 0;
      const unit = row.querySelector('.kg-unidade').value;

      if (unit === 'KG' || unit === 'L') {
        totalKg += val;
      }

      if (val > 0) {
        totalsByUnit[unit] = (totalsByUnit[unit] || 0) + val;
      }
    });

    // Update the main KG total input
    const totalInput = document.getElementById('flow-kg-total');
    if (totalInput) {
      totalInput.value = totalKg > 0 ? totalKg.toFixed(2) : '';
    }

    // Update units summary
    const summary = document.getElementById('pf-units-summary');
    if (summary) {
      const units = Object.entries(totalsByUnit);
      if (units.length === 0) {
        summary.innerHTML = '<span class="pf-summary-empty">Nenhum valor inserido</span>';
      } else {
        summary.innerHTML = units.map(([unit, total]) => `
          <div class="pf-unit-badge">
            <span class="pf-unit-name">${unit}:</span>
            <span class="pf-unit-val">${total.toFixed(1)}</span>
          </div>
        `).join('');
      }
    }
  },

  addKgRow() {
    const container = document.getElementById('kg-items');
    const div = document.createElement('div');
    div.className = 'pf-prod-row fade-in';
    div.innerHTML = `
      <input class="pf-input kg-produto-search" list="produtos-list" placeholder="Buscar produto...">
      <input class="pf-input pf-input-sm kg-valor" type="number" step="0.1" placeholder="0.0">
      <select class="pf-input pf-input-unit kg-unidade">
        <option value="KG">KG</option><option value="L">L</option><option value="UN">UN</option><option value="PCT">PCT</option>
      </select>
      <button class="pf-row-btn pf-row-del" onclick="PadeiroFlow.removeKgRow(this)"><i data-lucide="x" style="width:16px;height:16px"></i></button>`;
    container.appendChild(div);
    Components.renderIcons();
  },

  removeKgRow(btn) {
    const row = btn.closest('.pf-prod-row');
    if (document.querySelectorAll('.pf-prod-row').length > 1) {
      row.remove();
      this.calculateTotals();
    }
  },

  renderPhotoPreview(file) {
    const grid = document.getElementById('foto-preview-grid');
    const slot = document.createElement('div');
    slot.className = 'photo-preview-slot fade-in';
    const reader = new FileReader();
    reader.onload = e => {
      slot.innerHTML = `<img src="${e.target.result}"><button class="remove-photo" onclick="PadeiroFlow.removePhoto(this,'${file.name}')"><i data-lucide="x"></i></button>`;
      grid.insertBefore(slot, grid.lastElementChild);
      Components.renderIcons();
    };
    reader.readAsDataURL(file);
  },

  removePhoto(btn, name) {
    this.selectedFiles = this.selectedFiles.filter(f => f.name !== name);
    btn.closest('.photo-preview-slot').remove();
  },

  async saveProducao() {
    const total = document.getElementById('flow-kg-total').value;
    if (!total) { Components.toast('Informe o KG total.', 'error'); return; }
    const items = [];
    document.querySelectorAll('.pf-prod-row').forEach(row => {
      const sv = row.querySelector('.kg-produto-search')?.value;
      const un = row.querySelector('.kg-unidade')?.value;
      const v = parseFloat(row.querySelector('.kg-valor')?.value);
      const prod = this.cachedProdutos.find(p => {
        const fl = `${p.codigo?p.codigo+' - ':''}${p.descricao}`;
        return fl === sv;
      });
      if (prod && !isNaN(v)) items.push({ produtoId: prod.id, produtoNome: sv, unidade: un, kg: v });
    });
    if (items.length === 0) { Components.toast('Adicione pelo menos um produto.', 'error'); return; }

    this.activity.kgTotal = parseFloat(total);
    this.activity.kgItens = items;
    this.activity.lastStep = 2;

    // Upload fotos if any
    if (this.selectedFiles.length > 0) {
      const btn = document.getElementById('pf-btn-producao');
      const originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="comodato-spinner" style="margin-right:8px"></span> Enviando Fotos...`;
      
      try {
        const result = await API.uploadFiles(this.selectedFiles, 'producao');
        this.activity.fotos = result.files || [];
      } catch(e) { 
        btn.disabled = false;
        btn.innerHTML = originalContent;
        Components.toast('Erro no upload: ' + e.message, 'error'); 
        return; 
      }
    }

    await this.updateActivity();
    this.currentStep = 2;
    this.renderWizard(document.getElementById('page-container'));
  },

  // STEP 2: AVALIAÇÃO (Nota + Assinatura combinados)
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
          <div class="pf-stars-wrap">${Components.starRating(this.activity.nota || 0, 'nota-cliente')}</div>
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
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX-r.left)*(canvas.width/r.width), y: (t.clientY-r.top)*(canvas.height/r.height) };
    };
    canvas.addEventListener('mousedown', e => { drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
    canvas.addEventListener('mousemove', e => { if(drawing){const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();} });
    canvas.addEventListener('mouseup', () => drawing=false);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
    canvas.addEventListener('touchmove', e => { e.preventDefault(); if(drawing){const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();} }, {passive:false});
  },

  clearSignature() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  },

  async saveAvaliacao() {
    const stars = document.querySelector('[data-name="nota-cliente"]');
    this.activity.notaCliente = parseInt(stars.dataset.value) || 0;
    this.activity.comentario = document.getElementById('flow-nota-obs').value;

    // Save signature
    const canvas = document.getElementById('signature-canvas');
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const result = await API.uploadBase64(dataUrl, 'assinaturas');
        this.activity.assinatura = result.path;
      } catch(e) { /* signature optional */ }
    }

    this.activity.lastStep = 4;
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

    this.currentStep = 3;
    this.renderWizard(document.getElementById('page-container'));
  },


  // STEP 3: FINALIZAR
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
        <div class="pf-summary-row"><span>Produção</span><strong>${this.activity.kgTotal||0} kg</strong></div>
        <div class="pf-summary-row"><span>Produtos</span><strong>${(this.activity.kgItens||[]).length} itens</strong></div>
        <div class="pf-summary-row"><span>Avaliação</span><strong>${this.activity.notaCliente||0} ★</strong></div>
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
    this.activity.status = 'finalizada';
    this.activity.fimEm = new Date().toISOString();
    await this.updateActivity();
    if (this.activity.cronogramaId) await API.patch(`/api/cronograma/agenda/${this.activity.cronogramaId}/status`, { status: 'concluida' });
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
          <div class="pf-success-stats">
            <div class="pf-stat"><span class="pf-stat-val">${this.activity.kgTotal||0}</span><span class="pf-stat-label">KG</span></div>
            <div class="pf-stat-divider"></div>
            <div class="pf-stat"><span class="pf-stat-val">${(this.activity.kgItens||[]).length}</span><span class="pf-stat-label">Produtos</span></div>
            <div class="pf-stat-divider"></div>
            <div class="pf-stat"><span class="pf-stat-val">${this.activity.notaCliente||0}★</span><span class="pf-stat-label">Nota</span></div>
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
    if (res) this.activity = { ...this.activity, ...res };
  }
};
