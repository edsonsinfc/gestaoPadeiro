/**
 * Metas Module - Production Goals Management
 * BRAGO Sistema Padeiro
 */
const Metas = {
  activeSubTab: 'padeiros',

  async render() {
    this.renderStyles();
    const c = document.getElementById('page-container');
    if (c) c.classList.add('metas-view');
    c.innerHTML = Components.loading();
    try {
      const [metas, padeiros, atividades] = await Promise.all([
        API.get('/api/metas'), API.get('/api/padeiros'), API.get('/api/atividades')
      ]);
      this.metas = metas;
      this.padeiros = padeiros;
      this.atividades = atividades;
      this.renderContent(c);
    } catch(e) { c.innerHTML = `<div class="toast error">Erro: ${e.message}</div>`; }
  },

  renderStyles() {
    if (document.getElementById('metas-apple-css')) return;
    const style = document.createElement('style');
    style.id = 'metas-apple-css';
    style.innerHTML = `
      .metas-view {
        --apple-blue: #007AFF;
        --apple-green: #34C759;
        --apple-orange: #FF9500;
        --apple-bg: #F2F2F7;
        --apple-card: #FFFFFF;
        --apple-gray: #8E8E93;
        --apple-separator: #C6C6C8;
      }

      @media (max-width: 430px) {
        .page-title { font-size: 28px !important; font-weight: 800 !important; letter-spacing: -0.5px !important; margin-bottom: 20px !important; }
        .card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        
        .apple-metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .apple-metric-card {
          background: var(--apple-card);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        
        .apple-metric-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .apple-metric-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .apple-metric-icon-box.blue { background: var(--apple-blue); }
        .apple-metric-icon-box.green { background: var(--apple-green); }
        .apple-metric-icon-box.orange { background: var(--apple-orange); }
        
        .apple-metric-value { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .apple-metric-label { font-size: 11px; color: var(--apple-gray); font-weight: 600; text-transform: uppercase; }
        
        .apple-section-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }
        .apple-section-title-row { display: flex; justify-content: space-between; align-items: center; }
        .apple-section-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .apple-month-pill {
          background: rgba(0,0,0,0.05);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }
        
        .apple-padeiros-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }
        .apple-padeiro-card {
          background: var(--apple-card);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
        }
        
        .apple-padeiro-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .apple-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 15px;
        }
        .apple-padeiro-name { font-size: 17px; font-weight: 700; }
        
        .apple-meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .apple-info-item { display: flex; flex-direction: column; gap: 2px; }
        .apple-info-label { font-size: 11px; color: var(--apple-gray); font-weight: 600; text-transform: uppercase; }
        .apple-info-value { font-size: 16px; font-weight: 700; }
        
        .apple-progress-section { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .apple-progress-container { flex: 1; height: 8px; background: #E5E5EA; border-radius: 4px; overflow: hidden; }
        .apple-progress-fill { height: 100%; background: var(--apple-blue); border-radius: 4px; transition: width 0.3s ease; }
        .apple-progress-percent { font-size: 13px; font-weight: 700; min-width: 35px; text-align: right; }
        
        .apple-status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .apple-status-badge.success { background: rgba(52,199,89,0.1); color: var(--apple-green); }
        .apple-status-badge.pending { background: rgba(0,122,255,0.1); color: var(--apple-blue); }
        
        .apple-card-actions { display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #F2F2F7; padding-top: 12px; }
        
        /* Floating Action Button */
        .btn-new-meta {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: var(--apple-blue);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,122,255,0.3);
          border: none;
          z-index: 90;
        }
      }

      /* Desktop Premium Styles (Boltshift Mockup Redesign) */
      @media (min-width: 431px) {
        /* Hide global app header on desktop for Metas page to prevent double titles */
        .main-content:has(#page-container.metas-view) .ios-desktop-header {
          display: none !important;
        }
        
        @keyframes goalsCascadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .goals-animate-cascade {
          opacity: 0;
          animation: goalsCascadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .goals-kpi-card, .goals-middle-card, .goals-table-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .goals-kpi-card:hover, .goals-middle-card:hover, .goals-table-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
        }

        .metas-view {
          background-color: #F4F7FE !important;
          padding: 32px 36px !important;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .goals-desktop-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .goals-desktop-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .goals-desktop-title {
          font-size: 28px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.5px;
          margin: 0;
        }
        .goals-desktop-subtitle {
          font-size: 13px;
          color: #6B7280;
          margin: 0;
        }
        
        /* KPI Cards Grid */
        .goals-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .goals-kpi-card {
          background: #FFF;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .goals-kpi-card.gradient-blue {
          background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%) !important;
          color: #FFF;
        }
        
        .goals-kpi-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .goals-kpi-title {
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
        }
        .goals-kpi-card.gradient-blue .goals-kpi-title {
          color: rgba(255,255,255,0.9);
        }
        
        .goals-kpi-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .goals-kpi-icon-wrap.black { background: #111; color: #FFF; }
        .goals-kpi-icon-wrap.blue { background: #3B82F6; color: #FFF; }
        .goals-kpi-icon-wrap.lightblue { background: #EFF6FF; color: #3B82F6; }
        .goals-kpi-card.gradient-blue .goals-kpi-icon-wrap { background: #FFF; color: #3B82F6; }
        
        .goals-kpi-body {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .goals-kpi-value {
          font-size: 32px;
          font-weight: 700;
          color: #111;
          letter-spacing: -0.5px;
        }
        .goals-kpi-card.gradient-blue .goals-kpi-value {
          color: #FFF;
        }
        
        .goals-kpi-trend {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .goals-kpi-trend.purple { background: #F3E8FF; color: #7E22CE; }
        .goals-kpi-trend.red { background: #FEE2E2; color: #B91C1C; }
        .goals-kpi-card.gradient-blue .goals-kpi-trend { background: rgba(255,255,255,0.2); color: #FFF; }
        
        .goals-kpi-footer {
          font-size: 12px;
          color: #9CA3AF;
          font-weight: 500;
        }
        .goals-kpi-card.gradient-blue .goals-kpi-footer {
          color: rgba(255,255,255,0.8);
        }
        
        /* Middle Dashboard Section */
        .goals-dashboard-middle {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        
        .goals-middle-card {
          background: #FFF;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }
        
        .goals-middle-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .goals-middle-title {
          font-size: 18px;
          font-weight: 700;
          color: #111;
          margin: 0;
        }
        
        /* Segmented Gauge style */
        .gauge-sub-card {
          background: #F9FAFB;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .gauge-sub-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .gauge-sub-value {
          font-size: 20px;
          font-weight: 700;
          color: #111;
        }
        .gauge-sub-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 4px;
          border-radius: 4px;
          margin-left: 8px;
        }
        
        /* Bottom Table Section */
        .goals-table-card {
          background: #FFF;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        
        /* Table controls */
        .goals-search-input-wrap {
          position: relative;
        }
        .goals-search-input-wrap input {
          width: 200px;
          height: 36px;
          padding: 0 12px 0 36px;
          border-radius: 20px;
          border: 1px solid #E5E7EB;
          font-size: 14px;
          outline: none;
          background: #F9FAFB;
          transition: all 0.2s;
        }
        .goals-search-input-wrap input:focus {
          background: #FFF;
          border-color: #3B82F6;
        }
        .goals-search-input-wrap i {
          position: absolute;
          left: 12px;
          top: 10px;
          width: 16px;
          height: 16px;
          color: #9CA3AF;
        }
        .goals-sort-select {
          height: 36px;
          border-radius: 20px;
          border: 1px solid #E5E7EB;
          background: #FFF;
          font-size: 14px;
          font-weight: 500;
          color: #333;
          padding: 0 32px 0 16px;
          outline: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
        }
        
        .goals-table-card table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .goals-table-card table th {
          background: #FFF;
          color: #6B7280;
          font-size: 13px;
          font-weight: 500;
          padding: 16px;
          border-bottom: 1px solid #F3F4F6;
        }
        .goals-table-card table td {
          padding: 16px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 14px;
          color: #111;
          vertical-align: middle;
        }
        .goals-table-card table tr:last-child td {
          border-bottom: none;
        }
      }
    `;
    document.head.appendChild(style);
  },

  renderContent(c) {
    const mesAtual = new Date().toISOString().slice(0,7);
    const metasMes = this.metas.filter(m => m.periodo === mesAtual);
    const producao = {};
    this.atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada').forEach(a => {
      producao[a.padeiroId] = (producao[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });

    c.innerHTML = `
    <div class="fade-in">
      <!-- Mobile-only header and segmented control -->
      <div class="mobile-only">
        <div class="flex justify-between items-center mb-6">
          <h1 class="page-title" style="margin-bottom:0;">Metas de Produção</h1>
        </div>
        <div class="apple-segmented-control mb-6">
          <div class="apple-segmented-slider" style="width: calc(50% - 2px); transform: translateX(${this.activeSubTab === 'metas-mensais' ? '100%' : '0'})"></div>
          <div id="tab-padeiros" class="apple-segmented-item ${this.activeSubTab === 'padeiros' ? 'active' : ''}" onclick="Metas.switchSubTab('padeiros')">Semanais</div>
          <div id="tab-metas-mensais" class="apple-segmented-item ${this.activeSubTab === 'metas-mensais' ? 'active' : ''}" onclick="Metas.switchSubTab('metas-mensais')">Mensais</div>
        </div>
      </div>
      
      <!-- Desktop-only header and nav bar (Boltshift style) -->
      <div class="desktop-only">
        <div class="goals-desktop-header">
          <div class="goals-desktop-title-group">
            <h1 class="goals-desktop-title">Metas de Produção</h1>
            <span class="goals-desktop-subtitle">Seu resumo atual e atividades de metas</span>
          </div>
          <div class="goals-desktop-header-actions" style="display:flex; align-items:center; gap:12px;">
            <button class="btn btn-outline" onclick="Metas.openMetaForm()" style="height:36px; border-radius:20px; border:1px solid #3B82F6; background:#FFF; font-size:14px; font-weight:500; color:#3B82F6; padding:0 16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="plus" style="width:16px; height:16px;"></i> Criar Meta
            </button>
            <div class="goals-select-wrapper" style="position:relative; display:inline-block;">
              <select class="goals-sort-select" style="height:36px; border-radius:20px; border:none; background:#FFF; font-size:14px; font-weight:500; color:#333; padding:0 32px 0 16px;">
                <option>Este Mês</option>
              </select>
            </div>
            <button class="btn btn-outline" onclick="Components.toast('Exportando dados de metas...', 'info')" style="height:36px; border-radius:20px; border:1px solid #E5E7EB; background:#FFF; font-size:14px; font-weight:500; color:#333; padding:0 16px; display:flex; align-items:center; gap:8px;">
              <i data-lucide="upload" style="width:16px; height:16px;"></i> Exportar
            </button>
            <button class="btn btn-primary" onclick="Components.toast('Filtros rápidos ativos.', 'success')" style="height:36px; border-radius:20px; border:none; background:#3B82F6; font-size:14px; font-weight:500; color:#FFF; padding:0 16px; display:flex; align-items:center; gap:8px;">
              <div style="border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; padding: 2px; display:flex; align-items:center; justify-content:center;"><i data-lucide="sliders" style="width:12px; height:12px;"></i></div> Filtrar
            </button>
          </div>
        </div>
      </div>

      <div id="metas-sub-content">
        ${this.activeSubTab === 'padeiros' ? this.renderPadeirosTab(mesAtual, metasMes, producao) : this.renderMetasMensaisTab()}
      </div>
    </div>`;
    
    Components.renderIcons();
    
    // Initialize chart and table if tab is 'padeiros' on desktop
    if (this.activeSubTab === 'padeiros') {
      setTimeout(() => {
        this.initPerformanceChart();
        this.updateDesktopTable();
      }, 50);
    }
  },

  switchSubTab(tab) {
    this.activeSubTab = tab;
    const mesAtual = new Date().toISOString().slice(0,7);
    const metasMes = this.metas.filter(m => m.periodo === mesAtual);
    const producao = {};
    this.atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada').forEach(a => {
      producao[a.padeiroId] = (producao[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });
    
    // Update mobile segmented control active states
    document.querySelectorAll('.apple-segmented-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    const slider = document.querySelector('.apple-segmented-slider');
    if (slider) {
      slider.style.width = 'calc(50% - 2px)';
      slider.style.transform = `translateX(${tab === 'metas-mensais' ? '100%' : '0'})`;
    }
    
    // Update desktop nav active states
    document.querySelectorAll('.goals-nav-item').forEach(b => b.classList.remove('active'));
    if (tab === 'padeiros') {
      document.getElementById('tab-padeiros-desktop')?.classList.add('active');
    } else {
      document.getElementById('tab-metas-mensais-desktop')?.classList.add('active');
    }
    
    document.getElementById('metas-sub-content').innerHTML =
      tab === 'padeiros' ? this.renderPadeirosTab(mesAtual, metasMes, producao) : this.renderMetasMensaisTab();
      
    Components.renderIcons();
    
    // Initialize chart and table if tab is 'padeiros'
    if (tab === 'padeiros') {
      setTimeout(() => {
        this.initPerformanceChart();
        this.updateDesktopTable();
      }, 50);
    }
  },

  renderPadeirosTab(mesAtual, metasMes, producao) {
    const totalRealizado = Object.values(producao).reduce((a,b)=>a+b,0);
    const atingidas = this.metas.filter(m => { const r = producao[m.padeiroId] || 0; return m.metaKg > 0 && r >= m.metaKg; }).length;
    const totalMetas = this.metas.length;
    const taxaSucesso = totalMetas > 0 ? Math.round((atingidas / totalMetas) * 100) : 0;
    
    const totalMeta = metasMes.reduce((s, m) => s + (parseFloat(m.metaKg) || 0), 0);
    const restanteKg = Math.max(0, totalMeta - totalRealizado);
    const progressoGeral = totalMeta > 0 ? Math.min(100, Math.round((totalRealizado / totalMeta) * 100)) : 0;
    const padeirosSemMeta = this.padeiros.length - metasMes.length;
    
    // Initialize query and sort values
    this.searchQuery = this.searchQuery || '';
    this.sortOption = this.sortOption || 'default';

    return `
      <!-- Mobile Metrics Cards (UNCHANGED) -->
      <div class="mobile-only apple-metrics-grid">
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box blue"><i data-lucide="package"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${totalRealizado.toFixed(0)} kg</div>
          <div class="apple-metric-label">Produção Total do Mês</div>
        </div>
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box green"><i data-lucide="check-circle-2"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${atingidas}</div>
          <div class="apple-metric-label">Metas Atingidas</div>
        </div>
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box orange"><i data-lucide="target"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${totalMetas}</div>
          <div class="apple-metric-label">Total de Metas</div>
        </div>
      </div>
      
      <!-- Mobile Section Header (UNCHANGED) -->
      <div class="mobile-only apple-section-header">
        <div class="apple-section-title-row">
          <div class="apple-section-title">
            <i data-lucide="target" class="text-primary"></i>
            Metas do Mês
          </div>
          <div class="apple-month-pill">${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>
        </div>
        <div class="apple-button-row">
          <button class="apple-btn apple-btn-secondary" onclick="Metas.resetMetas()">
            Resetar Metas
          </button>
          <button class="apple-btn apple-btn-primary" onclick="Metas.openMetaForm()">
            <i data-lucide="plus"></i> Nova Meta
          </button>
        </div>
      </div>

      <!-- Mobile Padeiros Cards (UNCHANGED) -->
      <div class="mobile-only apple-padeiros-list">
        ${(metasMes.length > 0 ? metasMes : this.metas).map(m => {
          const realizado = producao[m.padeiroId] || 0;
          const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
          const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
          const status = pct >= 100 ? 'success' : 'pending';
          const initials = padeiro ? padeiro.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '??';
          const avatarColors = ['#1C7EF2', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
          const color = avatarColors[initials.charCodeAt(0) % avatarColors.length];

          return `
          <div class="apple-padeiro-card">
            <div class="apple-padeiro-header">
              <div class="apple-avatar" style="background: ${color}">${initials}</div>
              <div class="apple-padeiro-name">${padeiro ? padeiro.nome : m.padeiroNome || '—'}</div>
            </div>
            <div class="apple-meta-info">
              <div class="apple-info-item">
                <div class="apple-info-label">Meta</div>
                <div class="apple-info-value">${m.metaKg || 0} kg</div>
              </div>
              <div class="apple-info-item">
                <div class="apple-info-label">Realizado</div>
                <div class="apple-info-value" style="color: ${pct >= 100 ? 'var(--apple-green)' : 'var(--apple-label)'}">${realizado.toFixed(1)} kg</div>
              </div>
            </div>
            <div class="apple-progress-section">
              <div class="apple-progress-container">
                <div class="apple-progress-fill" style="width: ${Math.min(pct, 100)}%;"></div>
              </div>
              <div class="apple-progress-percent">${pct}%</div>
            </div>
            <div class="apple-status-badge ${status}">
              ${pct >= 100 ? 'Concluído' : 'Pendente'}
            </div>
            <div class="apple-card-actions">
              <button class="btn btn-icon" onclick="Metas.openMetaForm('${m.id}')"><i data-lucide="pencil" style="color: var(--apple-blue)"></i></button>
              <button class="btn btn-icon" onclick="Metas.deleteMeta('${m.id}')"><i data-lucide="trash-2" style="color: var(--apple-red)"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- DESKTOP REDESIGN (Boltshift Dashboard Style) -->
      <div class="desktop-only fade-in">
        
        <!-- 1. KPI Cards Row (4 cards) -->
        <div class="goals-kpi-grid">
          
          <!-- Card 1: Produção Total (Gradient Blue Card) -->
          <div class="goals-kpi-card gradient-blue goals-animate-cascade" style="animation-delay: 0.05s">
            <div class="goals-kpi-header">
              <span class="goals-kpi-title">Produção Total</span>
              <div class="goals-kpi-icon-wrap"><i data-lucide="shopping-cart" style="width: 20px;"></i></div>
            </div>
            <div class="goals-kpi-body">
              <span class="goals-kpi-value">${totalRealizado.toFixed(0)}</span>
              <span class="goals-kpi-trend"><i data-lucide="arrow-up" style="width:12px; height:12px;"></i> 4.9%</span>
            </div>
            <div class="goals-kpi-footer">Mês anterior: ${(totalRealizado * 0.95).toFixed(0)} kg</div>
          </div>
          
          <!-- Card 2: Metas Atingidas (White Card) -->
          <div class="goals-kpi-card goals-animate-cascade" style="animation-delay: 0.1s">
            <div class="goals-kpi-header">
              <span class="goals-kpi-title">Metas Atingidas</span>
              <div class="goals-kpi-icon-wrap black"><i data-lucide="users" style="width: 20px;"></i></div>
            </div>
            <div class="goals-kpi-body">
              <span class="goals-kpi-value">${atingidas}</span>
              <span class="goals-kpi-trend purple"><i data-lucide="arrow-up" style="width:12px; height:12px;"></i> 7.5%</span>
            </div>
            <div class="goals-kpi-footer">Mês anterior: ${Math.max(0, atingidas - 2)}</div>
          </div>
          
          <!-- Card 3: Taxa de Sucesso (White Card) -->
          <div class="goals-kpi-card goals-animate-cascade" style="animation-delay: 0.15s">
            <div class="goals-kpi-header">
              <span class="goals-kpi-title">Taxa de Sucesso</span>
              <div class="goals-kpi-icon-wrap lightblue"><i data-lucide="box" style="width: 20px;"></i></div>
            </div>
            <div class="goals-kpi-body">
              <span class="goals-kpi-value">${taxaSucesso}%</span>
              <span class="goals-kpi-trend red"><i data-lucide="arrow-down" style="width:12px; height:12px;"></i> 6.0%</span>
            </div>
            <div class="goals-kpi-footer">Mês anterior: ${Math.min(100, taxaSucesso + 6)}%</div>
          </div>
          
          <!-- Card 4: Total de Metas (White Card) -->
          <div class="goals-kpi-card goals-animate-cascade" style="animation-delay: 0.2s">
            <div class="goals-kpi-header">
              <span class="goals-kpi-title">Total de Metas</span>
              <div class="goals-kpi-icon-wrap blue"><span style="font-weight: 700; font-size: 14px; line-height: 1;">kg</span></div>
            </div>
            <div class="goals-kpi-body">
              <span class="goals-kpi-value">${totalMetas}</span>
            </div>
            <div class="goals-kpi-footer">Mês anterior: ${Math.max(0, totalMetas - 5)}</div>
          </div>
          
        </div>
        
        <!-- 2. Middle Section (Chart on Left, Gauge on Right) -->
        <div class="goals-dashboard-middle">
          
          <!-- Chart Card -->
          <div class="goals-middle-card goals-animate-cascade" style="animation-delay: 0.25s">
            <div class="goals-middle-header">
              <h3 class="goals-middle-title">Visão Geral de Desempenho</h3>
              <div class="goals-select-wrapper" style="position:relative; display:inline-block;">
                <select class="goals-sort-select">
                  <option>Este Ano</option>
                </select>
              </div>
            </div>
            <div style="position:relative; height:260px; width:100%;">
              <canvas id="performance-chart"></canvas>
            </div>
          </div>
          
          <!-- Gauge Card -->
          <div class="goals-middle-card goals-animate-cascade" style="display:flex; flex-direction:column; justify-content:space-between; animation-delay: 0.3s">
            <div class="goals-middle-header" style="margin-bottom:0;">
              <h3 class="goals-middle-title">Visão Geral de Vendas</h3>
              <button class="btn btn-icon btn-sm" onclick="event.stopPropagation();" style="border:none; background:none; cursor:pointer; color:#9CA3AF;"><i data-lucide="more-horizontal"></i></button>
            </div>
            
            ${this.renderSegmentedGauge(progressoGeral)}
            
            <div style="display:flex; gap:16px; width:100%; margin-top:32px;">
              <div class="gauge-sub-card">
                <span class="gauge-sub-label">Falta para Meta</span>
                <div style="display:flex; align-items:baseline;">
                  <span class="gauge-sub-value">${restanteKg.toFixed(0)} kg</span>
                  <span class="gauge-sub-pill" style="background:#FEF3C7; color:#D97706;">RESTANTE ↗</span>
                </div>
              </div>
              <div class="gauge-sub-card">
                <span class="gauge-sub-label">Padeiros Pendentes</span>
                <div style="display:flex; align-items:baseline;">
                  <span class="gauge-sub-value">${padeirosSemMeta}</span>
                  <span class="gauge-sub-pill" style="background:#F3F4F6; color:#111;">PENDENTE ↗</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- 3. Bottom Table Section -->
        <div class="goals-table-card goals-animate-cascade" style="animation-delay: 0.35s">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
            <h3 class="goals-middle-title">Metas Recentes</h3>
            
            <div style="display:flex; gap:16px; align-items:center;">
              <div class="goals-search-input-wrap">
                <i data-lucide="search"></i>
                <input type="text" placeholder="Buscar padeiros..." value="${this.searchQuery}" oninput="Metas.onBakerSearch(this.value)">
              </div>
              <div style="position:relative;">
                <select class="goals-sort-select" onchange="Metas.onBakerSort(this.value)">
                  <option value="default" ${this.sortOption === 'default'?'selected':''}>Ordenar por: Padrão</option>
                  <option value="name-asc" ${this.sortOption === 'name-asc'?'selected':''}>Nome (A-Z)</option>
                  <option value="meta-desc" ${this.sortOption === 'meta-desc'?'selected':''}>Meta (Maior - Menor)</option>
                  <option value="progress-desc" ${this.sortOption === 'progress-desc'?'selected':''}>Progresso</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th><input type="checkbox" style="border-radius:4px; border:1px solid #D1D5DB; accent-color:#3B82F6;" disabled></th>
                  <th>Informações do Produto</th>
                  <th>ID do Pedido</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Categoria (Meta)</th>
                  <th>Itens (Realizado)</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="goals-table-body">
                <!-- Preenchido via updateDesktopTable -->
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    `;
  },

  renderMetasMensaisTab() {
    const year = new Date().getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const abrevs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    
    // Original Mobile monthly grid layout (UNCHANGED)
    const mobileHtml = `
      <div class="mobile-only">
        <div style="text-align:center;margin-bottom:32px;">
          <h3 style="font-size:18px;margin:0;">Visão Anual de Metas — ${year}</h3>
          <p class="text-secondary" style="margin-top:4px;font-size:13px;">Clique em um mês para ver o detalhamento das metas por padeiro.</p>
        </div>
        <div class="month-grid">
          ${meses.map((nomeMes, index) => {
            const monthStr = `${year}-${String(index + 1).padStart(2, '0')}`;
            const metasMes = this.metas.filter(m => m.periodo === monthStr);
            const producaoMes = {};
            this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada').forEach(a => {
              producaoMes[a.padeiroId] = (producaoMes[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
            });
            const totalMeta = metasMes.reduce((s, m) => s + (parseFloat(m.metaKg) || 0), 0);
            const totalRealizado = Object.values(producaoMes).reduce((a, b) => a + b, 0);
            const progresso = totalMeta > 0 ? Math.min(100, Math.round((totalRealizado / totalMeta) * 100)) : 0;
            return `
            <div class="month-card" onclick="Metas.openMetaMensalDetails(${year}, ${index})">
              <div style="position: relative; z-index: 2;">
                <div class="month-abbr">${abrevs[index]}</div>
                <div class="month-subtitle">${metasMes.length} meta${metasMes.length !== 1 ? 's' : ''} cadastrada${metasMes.length !== 1 ? 's' : ''}</div>
              </div>
              <div class="month-progress-wrapper">
                <div class="month-meta-header">
                  <span class="month-meta-text">${progresso}%</span>
                </div>
                <div class="month-progress-container">
                  <div class="month-progress-bar" style="width: ${progresso}%;"></div>
                </div>
              </div>
              <div class="month-card-blob"></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
    return mobileHtml;
  },

  initPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;
    
    // Calculate data
    const year = new Date().getFullYear();
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const monthlyGoals = Array(12).fill(0);
    const monthlyProduction = Array(12).fill(0);
    
    // Calculate monthly goals
    this.metas.forEach(m => {
      if (m.periodo && m.periodo.startsWith(String(year))) {
        const month = parseInt(m.periodo.split('-')[1]) - 1;
        if (month >= 0 && month < 12) {
          monthlyGoals[month] += (parseFloat(m.metaKg) || 0);
        }
      }
    });
    
    // Calculate monthly production
    this.atividades.filter(a => a.status === 'finalizada' && a.data && a.data.startsWith(String(year))).forEach(a => {
      const month = parseInt(a.data.split('-')[1]) - 1;
      if (month >= 0 && month < 12) {
        monthlyProduction[month] += (parseFloat(a.kgTotal) || 0);
      }
    });
    
    // Destroy previous instance if it exists to avoid overlapping
    if (this.perfChart) {
      this.perfChart.destroy();
    }

    const currentMonthIndex = new Date().getMonth();
    
    // Create striped pattern for active month
    let activeProductionColor = '#007AFF';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 12;
      canvas.height = 12;
      const pCtx = canvas.getContext('2d');
      pCtx.fillStyle = '#007AFF';
      pCtx.fillRect(0, 0, 12, 12);
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      pCtx.lineWidth = 3;
      pCtx.beginPath();
      pCtx.moveTo(0, 12);
      pCtx.lineTo(12, 0);
      pCtx.stroke();
      
      const patternContext = document.createElement('canvas').getContext('2d');
      activeProductionColor = patternContext.createPattern(canvas, 'repeat') || '#007AFF';
    } catch (e) {
      console.error("Pattern creation failed", e);
    }

    const metaColors = Array(12).fill(0).map((_, i) => i === currentMonthIndex ? '#E5E5EA' : 'rgba(229, 229, 234, 0.4)');
    const productionColors = Array(12).fill(0).map((_, i) => i === currentMonthIndex ? activeProductionColor : 'rgba(0, 122, 255, 0.35)');
    
    this.perfChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: mesesAbrev,
        datasets: [
          {
            label: 'Meta de Produção (kg)',
            data: monthlyGoals,
            backgroundColor: '#F3F4F6',
            borderRadius: 100,
            borderSkipped: false,
            barThickness: 32,
            grouped: false,
            order: 2
          },
          {
            label: 'Produção Realizada (kg)',
            data: monthlyProduction,
            backgroundColor: productionColors,
            borderRadius: 100,
            borderSkipped: false,
            barThickness: 32,
            grouped: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#FFFFFF',
            titleColor: '#111',
            bodyColor: '#6B7280',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            padding: 16,
            boxPadding: 8,
            usePointStyle: true,
            titleFont: { family: 'Inter', size: 14, weight: '600' },
            bodyFont: { family: 'Inter', size: 13 },
            callbacks: {
              title: function(context) { return context[0].label + ' 2026'; }
            }
          },
          topDot: {
            id: 'topDot',
            afterDatasetsDraw(chart) {
              const ctx = chart.ctx;
              const meta = chart.getDatasetMeta(1);
              const currentMonthIndex = new Date().getMonth();
              const bar = meta.data[currentMonthIndex];
              if (bar) {
                ctx.beginPath();
                ctx.arc(bar.x, bar.y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = '#6366F1';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#FFFFFF';
                ctx.stroke();
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: 'Inter', size: 12 }, color: '#9CA3AF' }
          },
          y: {
            grid: { color: '#F3F4F6', drawBorder: false, borderDash: [5, 5] },
            border: { display: false },
            ticks: { 
              font: { family: 'Inter', size: 12 }, 
              color: '#9CA3AF',
              callback: function(value) { return value >= 1000 ? (value/1000) + 'k' : value; }
            }
          }
        }
      },
      plugins: [{
        id: 'topDot',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(1);
          const currentMonthIndex = new Date().getMonth();
          const bar = meta.data[currentMonthIndex];
          if (bar) {
            ctx.beginPath();
            ctx.arc(bar.x, bar.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#6366F1';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
          }
        }
      }]
    });
  },

  renderSegmentedGauge(percent) {
    const totalSegments = 16;
    const activeSegments = Math.round((percent / 100) * totalSegments);
    let html = '<div style="position:relative; display:flex; justify-content:center; align-items:flex-end; height:160px; width:100%; margin-top:24px;">';
    html += '<svg viewBox="0 0 100 55" style="width:100%; height:100%; overflow:visible;">';
    
    const cx = 50;
    const cy = 50;
    const r = 40;
    const gapAngle = 4; // degrees
    const totalGapAngle = gapAngle * (totalSegments - 1);
    const segmentAngle = (180 - totalGapAngle) / totalSegments;

    for (let i = 0; i < totalSegments; i++) {
      const startAngle = 180 - (i * (segmentAngle + gapAngle));
      const endAngle = startAngle - segmentAngle;
      
      const radStart = (startAngle * Math.PI) / 180;
      const radEnd = (endAngle * Math.PI) / 180;
      
      const x1 = cx + r * Math.cos(radStart);
      const y1 = cy - r * Math.sin(radStart);
      const x2 = cx + r * Math.cos(radEnd);
      const y2 = cy - r * Math.sin(radEnd);
      
      const isActive = i < activeSegments;
      let strokeColor = '#F3F4F6';
      if (isActive) {
        const ratio = i / (totalSegments - 1);
        const red = Math.round(28 + ratio * (147 - 28));
        const green = Math.round(78 + ratio * (197 - 78));
        const blue = Math.round(216 + ratio * (253 - 216));
        strokeColor = `rgb(${red}, ${green}, ${blue})`;
      }
      
      html += `<path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}" stroke="${strokeColor}" stroke-width="12" fill="none" />`;
    }
    html += '</svg>';
    html += `<div style="position:absolute; bottom:0; display:flex; flex-direction:column; align-items:center; line-height:1.2;">
               <span style="font-size:36px; font-weight:700; color:#111;">${percent.toFixed(1)}%</span>
               <span style="font-size:13px; font-weight:500; color:#6B7280; margin-top:4px;">Crescimento de Vendas</span>
             </div>`;
    html += '</div>';
    return html;
  },

  onBakerSearch(query) {
    this.searchQuery = query;
    this.updateDesktopTable();
  },
  
  onBakerSort(option) {
    this.sortOption = option;
    this.updateDesktopTable();
  },

  filterAndSortMetas(metasMes, producao) {
    let list = [...metasMes];
    
    // Filter
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(m => {
        const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
        const name = (padeiro ? padeiro.nome : m.padeiroNome || '').toLowerCase();
        return name.includes(q);
      });
    }
    
    // Sort
    if (this.sortOption === 'name-asc') {
      list.sort((a, b) => {
        const pA = this.padeiros.find(p => p.id === a.padeiroId);
        const pB = this.padeiros.find(p => p.id === b.padeiroId);
        const nameA = pA ? pA.nome : a.padeiroNome || '';
        const nameB = pB ? pB.nome : b.padeiroNome || '';
        return nameA.localeCompare(nameB);
      });
    } else if (this.sortOption === 'meta-desc') {
      list.sort((a, b) => (b.metaKg || 0) - (a.metaKg || 0));
    } else if (this.sortOption === 'meta-asc') {
      list.sort((a, b) => (a.metaKg || 0) - (b.metaKg || 0));
    } else if (this.sortOption === 'progress-desc') {
      list.sort((a, b) => {
        const rA = producao[a.padeiroId] || 0;
        const pctA = a.metaKg > 0 ? (rA / a.metaKg) : 0;
        const rB = producao[b.padeiroId] || 0;
        const pctB = b.metaKg > 0 ? (rB / b.metaKg) : 0;
        return pctB - pctA;
      });
    }
    
    return list;
  },
  
  updateDesktopTable() {
    const tbody = document.getElementById('goals-table-body');
    if (!tbody) return;
    
    const mesAtual = new Date().toISOString().slice(0,7);
    const metasMes = this.metas.filter(m => m.periodo === mesAtual);
    const producao = {};
    this.atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada').forEach(a => {
      producao[a.padeiroId] = (producao[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });
    
    const listToShow = this.filterAndSortMetas(metasMes.length > 0 ? metasMes : this.metas, producao);
    
    if (listToShow.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color:#999; font-weight:500;">Nenhuma meta correspondente encontrada.</td></tr>';
      return;
    }
    
    tbody.innerHTML = listToShow.map(m => {
      const realizado = producao[m.padeiroId] || 0;
      const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
      const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
      const status = pct >= 100 ? 'success' : pct >= 50 ? 'primary' : 'danger';
      const initials = padeiro ? padeiro.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '??';
      const avatarColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
      const color = avatarColors[initials.charCodeAt(0) % avatarColors.length];
      const photoSrc = padeiro ? (padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem) : '';
      
      return `
        <tr>
          <td><input type="checkbox" style="border-radius:4px; border:1px solid #D1D5DB; accent-color:#3B82F6;" disabled></td>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              ${photoSrc ? `
                <img src="${photoSrc}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
              ` : `
                <div style="width:32px; height:32px; border-radius:50%; background:${color}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600;">${initials}</div>
              `}
              <span style="font-weight:500; color:#111;">${padeiro ? padeiro.nome : m.padeiroNome || '—'}</span>
            </div>
          </td>
          <td style="color:#6B7280; font-family:monospace;">#${m.id.substring(0,6)}</td>
          <td style="color:#6B7280;">${mesAtual}</td>
          <td>
            <span style="padding:4px 10px; border-radius:12px; font-size:12px; font-weight:500; background:${pct >= 100 ? '#ECFDF3' : pct >= 50 ? '#EFF6FF' : '#FEF3F2'}; color:${pct >= 100 ? '#027A48' : pct >= 50 ? '#175CD3' : '#B42318'};">
              ${pct >= 100 ? 'Atingida' : pct >= 50 ? 'Em progresso' : 'Pendente'}
            </span>
          </td>
          <td style="color:#111; font-weight:500;">${m.metaKg || 0} kg</td>
          <td style="color:#6B7280;">${realizado.toFixed(1)} kg</td>
          <td>
            <div style="display:flex; gap:12px;">
              <button class="btn btn-icon btn-sm" onclick="Metas.openMetaForm('${m.id}')" title="Editar" style="background:none; border:none; cursor:pointer;"><i data-lucide="pencil" style="color:#9CA3AF; width:16px;"></i></button>
              <button class="btn btn-icon btn-sm" onclick="Metas.deleteMeta('${m.id}')" title="Excluir" style="background:none; border:none; cursor:pointer;"><i data-lucide="trash-2" style="color:#EF4444; width:16px;"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
  },

  openMetaMensalDetails(year, monthIndex) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesLabel = meses[monthIndex];
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const metasMes = this.metas.filter(m => m.periodo === monthStr);
    const producaoMes = {};
    this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada').forEach(a => {
      producaoMes[a.padeiroId] = (producaoMes[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });

    const rows = metasMes.length > 0 ? metasMes.map(m => {
      const realizado = producaoMes[m.padeiroId] || 0;
      const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
      const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
      const cor = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--danger)';
      return `<tr>
        <td style="font-weight:600">${padeiro ? padeiro.nome.split(' ').slice(0,2).join(' ') : '—'}</td>
        <td>${m.metaKg} kg</td>
        <td style="color:${cor};font-weight:700">${realizado.toFixed(1)} kg</td>
        <td style="min-width:150px">
          <div class="progress-bar-inline-container">
            <div class="progress-bar-inline" style="flex:1;"><div class="progress-bar" style="width:${Math.min(pct,100)}%;background:${cor};"></div></div>
            <span style="font-size:12px;font-weight:700;min-width:36px;text-align:right;color:var(--text-primary)">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:24px;">Nenhuma meta cadastrada para ${mesLabel}.</td></tr>`;

    Components.showModal(`Metas — ${mesLabel} de ${year}`, `
      <div class="table-responsive">
        <table>
          <thead><tr><th>Padeiro</th><th>Meta</th><th>Realizado</th><th>Progresso</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Fechar</button>
       <button class="btn btn-primary" onclick="Components.closeModal();Metas.openMetaForm()">+ Nova Meta</button>`
    );
    Components.renderIcons();
  },

  openMetaForm(id) {
    const m = id ? this.metas.find(x => x.id === id) : {};
    const mesAtual = new Date().toISOString().slice(0,7);
    Components.showModal(id ? 'Editar Meta' : 'Nova Meta', `
      <form id="meta-form">
        <div class="form-group"><label>Padeiro</label>
          <select class="input-control" name="padeiroId" required>
            <option value="">Selecione...</option>
            ${this.padeiros.map(p => `<option value="${p.id}" ${m.padeiroId===p.id?'selected':''}>${p.nome} (${p.cargo})</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Meta de Produção (KG)</label>
            <input class="input-control" type="number" name="metaKg" value="${m.metaKg||''}" step="0.1" required>
          </div>
          <div class="form-group w-full"><label>Período (Mês)</label>
            <input class="input-control" type="month" name="periodo" value="${m.periodo||mesAtual}" required>
          </div>
        </div>
        <div class="form-group"><label>Observação</label>
          <textarea class="input-control" name="observacao" rows="2" placeholder="Opcional...">${m.observacao||''}</textarea>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Metas.saveMeta('${id||''}')">Salvar</button>`
    );
    Components.renderIcons();
  },

  async saveMeta(id) {
    const form = document.getElementById('meta-form');
    if (!form.checkValidity()) return form.reportValidity();

    const body = Object.fromEntries(new FormData(form));
    body.metaKg = parseFloat(body.metaKg);
    const padeiro = this.padeiros.find(p => p.id === body.padeiroId);
    if (padeiro) body.padeiroNome = padeiro.nome;
    try {
      if (id) await API.put(`/api/metas/${id}`, body);
      else await API.post('/api/metas', body);
      Components.closeModal();
      Components.toast('Meta salva!','success');
      await this.render();
    } catch(e) { Components.toast(e.message,'error'); }
  },

  async deleteMeta(id) {
    if (confirm('Excluir esta meta?')) {
      try { await API.delete(`/api/metas/${id}`); Components.toast('Meta excluída.','success'); await Metas.render(); }
      catch(e) { Components.toast(e.message,'error'); }
    }
  },

  async resetMetas() {
    if (confirm('⚠️ ATENÇÃO: Isso excluirá TODAS as metas de todos os meses e padeiros. Deseja continuar?')) {
      try {
        await API.delete('/api/metas/reset/all');
        Components.toast('Todas as metas foram excluídas.', 'success');
        await this.render();
      } catch(e) {
        Components.toast(e.message, 'error');
      }
    }
  }
};
