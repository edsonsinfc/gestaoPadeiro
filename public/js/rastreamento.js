/**
 * Rastreamento Component - BRAGO Sistema Padeiro
 * Admin real-time map dashboard
 */
window.Rastreamento = {
  map: null,
  markers: {},
  trailLayers: L.featureGroup(),
  selectedUserId: null,
  socket: null,

  async render() {
    const container = document.getElementById('page-container');
    
    // Fetch all active padeiros to populate select dropdown
    let padeiros = [];
    try {
      padeiros = await API.get('/api/padeiros');
    } catch (e) {
      console.error('Erro ao buscar padeiros:', e);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dataFormatada = dateFormatter.format(new Date());

    container.innerHTML = `
      <style>
      /* macOS HIG Rastreamento Reset & Variables */
      .mac-rastreamento-root {
        --mac-window-bg: #FFFFFF;
        --mac-sidebar-bg: rgba(246,246,246,0.9);
        --mac-toolbar-bg: rgba(255,255,255,0.72);
        --mac-accent: #007AFF;
        --mac-destructive: #FF3B30;
        --mac-success: #34C759;
        --mac-label: #000000;
        --mac-secondary: #3C3C43;
        --mac-tertiary: #C7C7CC;
        --mac-border: rgba(0,0,0,0.08);
        --mac-input-border: rgba(0,0,0,0.15);
        --mac-hover: rgba(0,0,0,0.04);
        --mac-selected-bg: rgba(0,122,255,0.12);

        font-family: -apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif;
        flex: 1;
        width: 100%;
        display: flex;
        flex-direction: column;
        background: var(--mac-window-bg);
      }

      @media (prefers-color-scheme: dark) {
        .mac-rastreamento-root {
          --mac-window-bg: #1E1E1E;
          --mac-sidebar-bg: rgba(30,30,30,0.9);
          --mac-toolbar-bg: rgba(40,40,40,0.72);
          --mac-accent: #0A84FF;
          --mac-destructive: #FF453A;
          --mac-success: #32D74B;
          --mac-label: #FFFFFF;
          --mac-secondary: rgba(235, 235, 245, 0.6);
          --mac-tertiary: rgba(235, 235, 245, 0.3);
          --mac-border: rgba(255,255,255,0.1);
          --mac-input-border: rgba(255,255,255,0.15);
          --mac-hover: rgba(255,255,255,0.05);
          --mac-selected-bg: rgba(10,132,255,0.15);
        }
      }

      .mac-layout { display: flex; flex: 1; width: 100%; overflow: hidden; }
      .mac-mobile-block { display: none !important; }

      /* Reconstrução da Aba Rastreamento para Mobile (Mantendo o Desktop macOS idêntico) */
      @media (max-width: 1023px) {
        .mac-layout {
          flex-direction: column;
          overflow: visible !important;
        }
        .mac-sidebar {
          order: 3;
          width: 100% !important;
          height: auto !important;
          background: var(--bg-card) !important;
          border: 1px solid var(--separator) !important;
          border-radius: var(--radius-md) !important;
          box-shadow: var(--shadow-md) !important;
          margin-top: 20px !important;
          padding: 16px !important;
        }
        .mac-sidebar-header {
          padding: 0 0 12px 0 !important;
        }
        .mac-sidebar-title {
          font-size: 14px !important;
          color: var(--text-primary) !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }
        .mac-sidebar-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mac-track-item {
          height: auto !important;
          padding: 12px !important;
          margin: 0 !important;
          border-radius: var(--radius-md) !important;
          border: 1px solid var(--separator) !important;
          background: var(--bg-card) !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--text-primary) !important;
        }
        .mac-avatar {
          width: 36px !important;
          height: 36px !important;
          font-size: 14px !important;
        }
        .mac-track-name {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: var(--text-primary) !important;
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          margin-left: 10px;
        }
        .mac-track-status {
          margin-left: auto;
          margin-right: 12px;
        }
        .mac-main-content {
          order: 1;
          flex: none !important;
          display: flex;
          flex-direction: column;
          background: transparent !important;
          overflow: visible !important;
        }
        .mac-page-header {
          padding: 0 0 16px 0 !important;
          background: transparent !important;
        }
        .mac-page-title {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: var(--text-primary) !important;
        }
        .mac-page-subtitle {
          display: block !important;
          font-size: 13px !important;
          color: var(--text-secondary) !important;
        }
        .mac-page-header-right {
          display: none !important;
        }
        .mac-toolbar {
          height: auto !important;
          background: var(--bg-card) !important;
          padding: 16px !important;
          border-radius: var(--radius-md) !important;
          border: 1px solid var(--separator) !important;
          box-shadow: var(--shadow-md) !important;
          margin-bottom: 20px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 12px !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          overflow-x: visible !important;
        }
        .mac-toolbar-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
        }
        .mac-label {
          font-size: 11px !important;
          color: var(--text-tertiary) !important;
          font-weight: 600 !important;
        }
        .mac-select, .mac-input {
          width: 60% !important;
          height: 36px !important;
          border: 1px solid var(--separator) !important;
          border-radius: var(--radius-sm) !important;
          background: var(--bg-card) !important;
          color: var(--text-main) !important;
        }
        .mac-separator {
          display: none !important;
        }
        .mac-toolbar-actions {
          margin-left: 0 !important;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
        }
        .mac-btn {
          flex: 1;
          min-width: 100px;
          height: 36px !important;
          border-radius: var(--radius-sm) !important;
          font-size: 14px !important;
          font-weight: 600 !important;
        }
        .mac-btn-primary {
          background: var(--primary) !important;
          color: white !important;
        }
        .mac-btn-borderless {
          background: var(--bg-input) !important;
          color: var(--text-secondary) !important;
        }
        .mac-btn-destructive {
          background: var(--danger-light) !important;
          color: var(--danger) !important;
        }
        .mac-map-container {
          background: var(--bg-card) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: var(--shadow-lg) !important;
          height: 450px !important;
          flex: none !important;
          display: flex;
          flex-direction: column;
        }
        #tracking-map {
          height: 100% !important;
        }
        .mac-timeline-container {
          padding: 16px;
        }
      }

      /* Sidebar */
      .mac-sidebar {
        width: 260px;
        background: var(--mac-sidebar-bg);
        border-right: 1px solid var(--mac-border);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        z-index: 1010;
      }

      .mac-sidebar-header { padding: 16px 16px 8px; }
      .mac-sidebar-title {
        font-size: 13px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: var(--mac-tertiary); margin: 0;
      }

      .mac-sidebar-list { flex: 1; overflow-y: auto; padding-bottom: 20px; }

      .mac-track-item {
        height: 52px; padding: 0 12px; margin: 0 8px; border-radius: 6px;
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; transition: background-color 120ms ease;
        color: var(--mac-label);
      }
      .mac-track-item:hover { background: var(--mac-hover); }
      .mac-track-item.selected { background: var(--mac-selected-bg); }
      .mac-track-item.selected .mac-track-name { font-weight: 600; }

      .mac-avatar {
        width: 32px; height: 32px; border-radius: 50%; display: flex;
        align-items: center; justify-content: center;
        color: #fff; font-size: 13px; font-weight: 500;
        flex-shrink: 0;
      }

      .mac-track-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
      .mac-track-status { position: relative; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .mac-track-status.active { background: var(--mac-success); animation: pulseMac 2s infinite; }
      .mac-track-status.inactive { background: var(--mac-tertiary); }
      .mac-track-icon { color: var(--mac-accent); display: flex; align-items: center; }

      @keyframes pulseMac {
        0% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.5); }
        70% { box-shadow: 0 0 0 6px rgba(52, 199, 89, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 199, 89, 0); }
      }

      /* Main Content */
      .mac-main-content {
        flex: 1; position: relative; display: flex; flex-direction: column; background: var(--mac-window-bg); overflow: hidden;
      }

      /* Page Header */
      .mac-page-header {
        display: flex; align-items: flex-start; justify-content: space-between;
        padding: 20px 24px 16px; background: var(--mac-window-bg); flex-shrink: 0;
      }
      .mac-page-title { font-size: 28px; font-weight: 700; color: var(--mac-label); margin: 0; font-family: 'SF Pro Display', sans-serif; letter-spacing: 0.3px; }
      .mac-page-subtitle { font-size: 13px; color: var(--mac-secondary); margin-top: 4px; }
      .mac-page-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
      .mac-page-date { font-size: 13px; color: var(--mac-secondary); font-weight: 400; }

      /* Toolbar */
      .mac-toolbar {
        height: 52px; background: var(--mac-toolbar-bg); backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--mac-border);
        display: flex; align-items: center; padding: 0 16px; flex-shrink: 0;
        z-index: 1000; gap: 4px; overflow-x: auto;
      }

      .mac-toolbar-group { display: flex; align-items: center; gap: 6px; }
      .mac-separator { width: 1px; height: 20px; background: var(--mac-border); margin: 0 8px; flex-shrink: 0; }
      .mac-label { font-size: 11px; color: var(--mac-secondary); text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; }

      .mac-input, .mac-select {
        height: 28px; border: 1px solid var(--mac-input-border); border-radius: 6px;
        background: var(--mac-window-bg); color: var(--mac-label); font-family: inherit; font-size: 13px;
        padding: 0 6px; outline: none; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      }
      .mac-select { width: 110px; }
      .mac-input[type="date"] { width: 120px; }
      .mac-input[type="time"] { width: 68px; }
      .mac-input:focus, .mac-select:focus { outline: 2px solid var(--mac-accent); outline-offset: -1px; }
      .mac-select { padding-right: 20px; appearance: none; background-image: url('data:image/svg+xml;utf8,<svg fill="%23999" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>'); background-repeat: no-repeat; background-position: right center; background-size: 14px; }
      @media (prefers-color-scheme: dark) { .mac-input, .mac-select { background: rgba(0,0,0,0.2); } }

      .mac-toolbar-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-shrink: 0; }
      .mac-btn {
        height: 28px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 500;
        display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;
        border: none; outline: none; padding: 0 10px; white-space: nowrap;
      }
      .mac-btn:focus-visible { outline: 2px solid var(--mac-accent); }
      .mac-btn i { width: 13px; height: 13px; }
      
      .mac-btn-primary { background: var(--mac-accent); color: #FFF; font-weight: 600; transition: transform 100ms cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      .mac-btn-primary:active { transform: scale(0.97); }
      
      .mac-btn-borderless { background: transparent; color: var(--mac-secondary); padding: 0 6px; }
      .mac-btn-borderless:hover { background: var(--mac-hover); color: var(--mac-label); }
      
      .mac-btn-destructive { background: transparent; color: var(--mac-destructive); padding: 0 6px; }
      .mac-btn-destructive:hover { background: rgba(255,59,48,0.1); }

      /* Map Container */
      .mac-map-container { flex: 1; width: 100%; background: #e5e5ea; z-index: 1; }
      .leaflet-control-zoom { border: 1px solid var(--mac-border) !important; border-radius: 6px !important; box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important; margin-left: 16px !important; margin-bottom: 38px !important; }
      .leaflet-control-zoom a { width: 28px !important; height: 28px !important; line-height: 28px !important; font-family: inherit !important; font-size: 14px !important; font-weight: 500 !important; color: var(--mac-label) !important; background: var(--mac-window-bg) !important; }

      /* Status Badge */
      .mac-status-badge {
        background: var(--mac-window-bg); color: var(--mac-label); font-size: 11px; font-weight: 500;
        padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid var(--mac-border); transition: opacity 0.3s;
      }
      .mac-status-badge.connected .mac-status-dot { background: var(--mac-success); width: 6px; height: 6px; border-radius: 50%; display: inline-block; animation: pulseMac 2s infinite; }
      .mac-status-badge.disconnected .mac-status-dot { background: var(--mac-tertiary); width: 6px; height: 6px; border-radius: 50%; display: inline-block; animation: none; }
      .mac-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

      /* Status Bar (Footer) */
      .mac-map-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 22px; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); z-index: 900; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 11px; color: var(--mac-tertiary); border-top: 1px solid var(--mac-border); }
      @media (prefers-color-scheme: dark) { .mac-map-footer { background: rgba(30,30,30,0.85); } }
      .mac-footer-left { color: var(--mac-secondary); }

      /* Sub-Tabs */
      .mac-view-tabs { display: flex; gap: 8px; align-items: center; }
      .mac-view-tab { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; background: transparent; color: var(--mac-secondary); transition: all 0.2s; }
      .mac-view-tab.active { background: var(--mac-accent); color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .mac-view-tab:not(.active):hover { background: var(--mac-hover); color: var(--mac-label); }

      /* Timeline UI Mercado Livre style */
      .mac-timeline-container { flex: 1; overflow-y: auto; background: var(--mac-window-bg); padding: 24px; display: none; }
      .mac-timeline-container.active { display: block; }

      .ml-timeline { position: relative; margin-left: 12px; padding-left: 24px; border-left: 2px solid var(--mac-border); }
      .ml-timeline-item { position: relative; margin-bottom: 24px; }
      .ml-timeline-dot { position: absolute; left: -31px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: #10b981; border: 3px solid var(--mac-window-bg); box-shadow: 0 0 0 1px var(--mac-border); }
      .ml-timeline-time { font-size: 11px; color: var(--mac-tertiary); margin-bottom: 4px; font-weight: 500; }
      .ml-timeline-title { font-size: 14px; font-weight: 600; color: var(--mac-label); }
      .ml-timeline-map-btn { font-size: 11px; color: var(--mac-accent); cursor: pointer; border: none; background: none; padding: 0; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
      .ml-timeline-map-btn:hover { text-decoration: underline; }
      .ml-timeline-activity-card { background: var(--mac-window-bg); border: 1px solid var(--mac-border); border-radius: 8px; padding: 16px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
      .ml-timeline-activity-title { font-size: 15px; font-weight: 600; margin-bottom: 20px; color: var(--mac-label); display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--mac-border); }
      </style>

      <div class="mac-rastreamento-root fade-in">
        
        <!-- Desktop App -->
        <div class="mac-layout">
          <!-- Sidebar -->
          <aside class="mac-sidebar">
            <header class="mac-sidebar-header">
              <h2 class="mac-sidebar-title">Padeiros Ativos</h2>
            </header>
            <div id="active-track-list" class="mac-sidebar-list">
              <div style="padding: 12px 20px; font-size: 13px; color: var(--mac-tertiary);">Aguardando sinais...</div>
            </div>
          </aside>
          
          <!-- Main Area -->
          <main class="mac-main-content">
            
            <!-- Page Header -->
            <div class="mac-page-header">
               <div class="mac-page-header-left">
                 <div class="mac-page-subtitle">Monitoramento GPS em tempo real e histórico de trajetos</div>
               </div>
               <div class="mac-page-header-right">
                 <div class="mac-page-date">${dataFormatada}</div>
                 <div id="tracking-status" class="mac-status-badge connected">
                   <span class="mac-status-dot"></span> <span>Servidor Conectado</span>
                 </div>
               </div>
            </div>

            <!-- Toolbar -->
            <div class="mac-toolbar">
               <div class="mac-toolbar-group">
                  <label for="trail-user-select" class="mac-label">Padeiro:</label>
                  <select id="trail-user-select" class="mac-select" onchange="Rastreamento.onUserSelectChange(this.value)" tabindex="1">
                     <option value="">Selecione...</option>
                     ${padeiros.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
                  </select>
               </div>
               
               <div class="mac-separator"></div>
               
               <div class="mac-toolbar-group">
                  <label for="trail-date" class="mac-label">Data:</label>
                  <input type="date" id="trail-date" class="mac-input" value="${todayStr}" onchange="Rastreamento.onDateChange()" tabindex="2">
               </div>

               <div class="mac-separator"></div>
               
               <div class="mac-toolbar-group">
                  <label for="trail-start-time" class="mac-label" title="Início">De:</label>
                  <input type="time" id="trail-start-time" class="mac-input" value="00:00" onchange="Rastreamento.onTimeChange()" tabindex="3">
               </div>
               <div class="mac-toolbar-group" style="margin-right: 0;">
                  <label for="trail-end-time" class="mac-label" title="Fim">Até:</label>
                  <input type="time" id="trail-end-time" class="mac-input" value="23:59" onchange="Rastreamento.onTimeChange()" tabindex="4">
               </div>
               
               <div class="mac-toolbar-actions">
                  <button class="mac-btn mac-btn-primary" id="btn-load-trail" onclick="Rastreamento.loadTrail()" tabindex="5" title="Carregar Trajeto (⌘R)">Carregar</button>
                  <button class="mac-btn mac-btn-borderless" onclick="Rastreamento.clearTrail()" tabindex="6" title="Limpar Mapa (⌘L)"><i data-lucide="x"></i> Limpar</button>
                  ${API.getUser().role === 'admin' ? `
                    <div class="mac-separator" style="margin-left: 2px; margin-right: 2px;"></div>
                    <button class="mac-btn mac-btn-destructive" onclick="Rastreamento.resetUserTracking()" tabindex="7" title="Resetar Histórico (⌘⌫)"><i data-lucide="trash-2"></i></button>
                  ` : ''}
               </div>
            </div>
            
            <!-- Map Area -->
            <div id="view-mapa" class="mac-map-container" style="display:flex; flex-direction:column;">
               <div id="tracking-map" style="flex:1;"></div>
               <div class="mac-map-footer" style="position:relative;">
                 <div id="trail-info" class="mac-footer-left"></div>
                 <div class="mac-footer-right">Leaflet | © OpenStreetMap</div>
               </div>
            </div>
            
          </main>
        </div>

        <!-- Mobile Block (Hidden) -->
        <div class="mac-mobile-block">
          <i data-lucide="monitor" style="width: 48px; height: 48px; margin-bottom: 16px;"></i>
          <h3>Uso Exclusivo Desktop</h3>
          <p>O painel de rastreamento avançado requer uma resolução mínima de 1280px para visualização correta do mapa e controles.</p>
        </div>

      </div>
    `;

    // Wait for DOM
    setTimeout(() => {
      const topHeader = document.querySelector('.top-header');
      const pageContent = document.getElementById('page-container');
      
      if (window.innerWidth >= 1024) {
        if (topHeader) topHeader.style.setProperty('display', 'none', 'important');
        if (pageContent) {
          pageContent.style.setProperty('padding', '0', 'important');
          pageContent.style.setProperty('overflow', 'hidden', 'important');
          pageContent.style.setProperty('display', 'flex', 'important');
          pageContent.style.setProperty('flex-direction', 'column', 'important');
        }
      } else {
        if (topHeader) topHeader.style.removeProperty('display');
        if (pageContent) {
          pageContent.style.removeProperty('padding');
          pageContent.style.removeProperty('overflow');
          pageContent.style.removeProperty('display');
          pageContent.style.removeProperty('flex-direction');
        }
      }

      lucide.createIcons();
      this.initMap();
      this.initSocket();
      
      // Forçar atualização do tamanho do mapa após transição do flexbox
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 150);
    }, 50);
  },

  initMap() {
    this.map = L.map('tracking-map', { zoomControl: false }).setView([-23.5505, -46.6333], 13);
    
    // Add custom zoom control at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.trailLayers.addTo(this.map);
  },

  initSocket() {
    if (this.socket) this.socket.disconnect();
    
    this.socket = io({ transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      const statusEl = document.getElementById('tracking-status');
      if (statusEl) {
        statusEl.className = 'mac-status-badge connected';
        statusEl.innerHTML = '<span class="mac-status-dot"></span> <span>Servidor Conectado</span>';
      }
    });

    this.socket.on('disconnect', () => {
      const statusEl = document.getElementById('tracking-status');
      if (statusEl) {
        statusEl.className = 'mac-status-badge disconnected';
        statusEl.innerHTML = '<span class="mac-status-dot"></span> <span>Desconectado</span>';
      }
    });

    this.socket.on('location-broadcast', (locations) => {
      const user = API.getUser();
      let filtered = locations;
      
      if (user.role === 'gestor' && user.filial) {
        // Filter: only show bakers from the manager's branch
        filtered = locations.filter(loc => loc.filial === user.filial);
      }
      
      this.updateMarkers(filtered);
      this.updateList(filtered);
    });
  },

  updateMarkers(locations) {
    locations.forEach(loc => {
      const { userId, userName, coords, lastUpdate } = loc;
      
      if (this.markers[userId]) {
        // Update existing marker
        this.markers[userId].setLatLng([coords.lat, coords.lng]);
      } else {
        // Create new marker
        const marker = L.marker([coords.lat, coords.lng]).addTo(this.map);
        marker.bindPopup(`
          <div class="map-popup">
            <strong>${userName}</strong><br>
            <span>Último sinal: ${new Date(lastUpdate).toLocaleTimeString()}</span><br>
            <small>Precisão: ${Math.round(coords.accuracy)}m</small>
            <button class="map-popup-btn" onclick="Rastreamento.selectUserForTrail('${userId}')">Ver Trajeto do Dia</button>
          </div>
        `);
        this.markers[userId] = marker;
      }
    });

    // Auto-zoom to fit markers if it's the first update
    const group = new L.featureGroup(Object.values(this.markers));
    if (locations.length > 0) {
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  },



  updateList(locations) {
    const list = document.getElementById('active-track-list');
    if (!list) return;

    if (locations.length === 0) {
      list.innerHTML = '<div style="padding: 12px 20px; font-size: 13px; color: var(--mac-tertiary);">Nenhum padeiro online no momento.</div>';
      return;
    }

    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];

    list.innerHTML = locations.map((loc, idx) => {
      const isSelected = this.selectedUserId === loc.userId;
      const initial = loc.userName[0].toUpperCase();
      const color = colors[idx % colors.length];
      
      return `
        <div class="mac-track-item ${isSelected ? 'selected' : ''}" onclick="Rastreamento.selectActiveItem('${loc.userId}')">
          <div class="mac-avatar" style="background-color: ${color};">${initial}</div>
          <div class="mac-track-name">${loc.userName}</div>
          <div class="mac-track-status active"></div>
          <div class="mac-track-icon">
             <i data-lucide="crosshair" style="width: 16px; height: 16px;"></i>
          </div>
        </div>
      `;
    }).join('');
    
    lucide.createIcons();
  },

  selectActiveItem(userId) {
    // Atualiza a seleção visual
    this.selectedUserId = userId;
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl) selectEl.value = userId;
    
    this.focusPadeiro(userId);
    
    document.querySelectorAll('.mac-track-item').forEach(el => el.classList.remove('selected'));
    if (window.event && window.event.currentTarget) {
      window.event.currentTarget.classList.add('selected');
    }
  },

  focusPadeiro(userId) {
    const marker = this.markers[userId];
    if (marker) {
      this.map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  },

  onUserSelectChange(userId) {
    this.selectedUserId = userId || null;
    if (userId) {
      this.loadTrail();
    } else {
      this.clearTrail();
    }
  },

  onDateChange() {
    if (this.selectedUserId) {
      this.loadTrail();
    }
  },

  onTimeChange() {
    if (this.selectedUserId) {
      this.loadTrail();
    }
  },

  selectUserForTrail(userId) {
    this.selectedUserId = userId;
    
    // Set default date and times
    const dateInput = document.getElementById('trail-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    const startInput = document.getElementById('trail-start-time');
    if (startInput) startInput.value = '00:00';
    
    const endInput = document.getElementById('trail-end-time');
    if (endInput) endInput.value = '23:59';
    
    // Update the dropdown value to select this user
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl) selectEl.value = userId;
    
    this.loadTrail();
    this.map.closePopup();
  },

  async loadTrail() {
    // Dynamically grab selected user ID from dropdown if not set or just keep in sync
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl && selectEl.value) {
      this.selectedUserId = selectEl.value;
    }

    if (!this.selectedUserId) {
      Components.toast('Selecione um padeiro para carregar o trajeto', 'info');
      return;
    }
    const dateInput = document.getElementById('trail-date');
    const date = dateInput ? dateInput.value : '';
    if (!date) {
      Components.toast('Selecione uma data para o trajeto', 'info');
      return;
    }

    const infoEl = document.getElementById('trail-info');
    if (infoEl) infoEl.innerHTML = 'Carregando trajeto...';

    try {
      const data = await API.get(`/api/tracking/trail/${this.selectedUserId}?date=${date}`);
      this.clearTrail();

      if (!data.sessions || data.sessions.length === 0) {
        Components.toast('Nenhum trajeto registrado para este dia', 'info');
        if (infoEl) infoEl.innerHTML = 'Sem dados para esta data.';
        return;
      }

      // Filter points based on selected start and end time
      const startTimeInput = document.getElementById('trail-start-time');
      const endTimeInput = document.getElementById('trail-end-time');
      const startTimeVal = startTimeInput ? startTimeInput.value : '00:00';
      const endTimeVal = endTimeInput ? endTimeInput.value : '23:59';

      const [startH, startM] = startTimeVal.split(':').map(Number);
      const [endH, endM] = endTimeVal.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const filteredSessions = data.sessions.map(session => {
        const filteredPoints = session.points.filter(p => {
          const dateObj = new Date(p.timestamp);
          const localH = dateObj.getHours();
          const localM = dateObj.getMinutes();
          const pointMinutes = localH * 60 + localM;
          return pointMinutes >= startMinutes && pointMinutes <= endMinutes;
        });
        return {
          ...session,
          points: filteredPoints
        };
      }).filter(session => session.points.length > 0);

      if (filteredSessions.length === 0) {
        Components.toast('Nenhum ponto registrado neste intervalo de horário', 'info');
        if (infoEl) infoEl.innerHTML = 'Sem dados no horário selecionado.';
        return;
      }

      const colors = ['#1E4BFF', '#E8450A', '#10B981', '#F59E0B', '#EF4444'];
      let sessionIndex = 0;

      filteredSessions.forEach(session => {
        const color = colors[sessionIndex % colors.length];
        const latlngs = session.points.map(p => [p.lat, p.lng]);
        
        // Polyline for the session
        const polyline = L.polyline(latlngs, {
          color: color,
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(this.trailLayers);

        // Start marker
        const start = session.points[0];
        L.circleMarker([start.lat, start.lng], {
          radius: 8,
          fillColor: '#10B981',
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.trailLayers).bindPopup(`<b>Início da Sessão</b><br>${new Date(start.timestamp).toLocaleTimeString()}`);

        // End marker
        const end = session.points[session.points.length - 1];
        L.circleMarker([end.lat, end.lng], {
          radius: 8,
          fillColor: '#EF4444',
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.trailLayers).bindPopup(`<b>Fim da Sessão</b><br>${new Date(end.timestamp).toLocaleTimeString()}`);

        // Intermediate points (clickable)
        if (session.points.length > 2) {
          session.points.slice(1, -1).forEach(p => {
            L.circleMarker([p.lat, p.lng], {
              radius: 4,
              fillColor: color,
              color: '#fff',
              weight: 1,
              fillOpacity: 0.5
            }).addTo(this.trailLayers).bindPopup(`Passou por aqui às ${new Date(p.timestamp).toLocaleTimeString()}`);
          });
        }

        sessionIndex++;
      });

      let totalFilteredPoints = filteredSessions.reduce((acc, s) => acc + s.points.length, 0);
      if (infoEl) infoEl.innerHTML = `${totalFilteredPoints} pontos em ${filteredSessions.length} sessões.`;
      
      // Fit bounds to trail
      this.map.fitBounds(this.trailLayers.getBounds().pad(0.1));
      
    } catch (error) {
      console.error('Erro ao carregar trajeto:', error);
      Components.toast('Erro ao carregar trajeto', 'error');
      if (infoEl) infoEl.innerHTML = 'Erro ao carregar.';
    }

    this.loadTimeline(date);
  },

  async loadTimeline(date) {
    const container = document.getElementById('timeline-content');
    if (!container) return;
    container.innerHTML = '<div style="color:var(--mac-tertiary); font-size:13px; text-align:center; padding-top:40px;">Carregando timeline...</div>';

    try {
      const atividades = await API.get(`/api/atividades?padeiroId=${this.selectedUserId}&data=${date}`);
      
      if (!atividades || atividades.length === 0) {
        container.innerHTML = '<div style="color:var(--mac-tertiary); font-size:13px; text-align:center; padding-top:40px;">Nenhuma atividade iniciada ou concluída nesta data.</div>';
        return;
      }

      // Filtrar as que tem a timeline populada. Trata o caso de timeline nula/vazia de versões antigas.
      const actsWithTimeline = atividades.filter(a => Array.isArray(a.timeline) && a.timeline.length > 0);
      
      if (actsWithTimeline.length === 0) {
        container.innerHTML = '<div style="color:var(--mac-tertiary); font-size:13px; text-align:center; padding-top:40px;">As atividades deste dia não possuem registros de timeline de localização.</div>';
        return;
      }

      let html = '';
      actsWithTimeline.forEach(act => {
        html += `<div class="ml-timeline-activity-card">
          <div class="ml-timeline-activity-title">
            <i data-lucide="package" style="width:18px;height:18px;color:var(--mac-accent)"></i> 
            Atendimento: ${act.clienteNome}
          </div>
          <div class="ml-timeline">`;
        
        act.timeline.forEach(ev => {
          const t = new Date(ev.timestamp);
          const timeStr = isNaN(t) ? '--:--' : t.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
          
          let mapLink = '';
          if (ev.lat && ev.lng) {
            mapLink = `<button class="ml-timeline-map-btn" onclick="Rastreamento.focusTimelinePoint(${ev.lat}, ${ev.lng})">
                         <i data-lucide="map-pin" style="width:12px;height:12px;"></i> Ver no mapa
                       </button>`;
          } else {
            mapLink = `<span style="font-size:11px;color:var(--mac-tertiary);display:inline-block;margin-top:4px;">Sem GPS</span>`;
          }

          html += `
            <div class="ml-timeline-item">
              <div class="ml-timeline-dot"></div>
              <div class="ml-timeline-time">${timeStr}</div>
              <div class="ml-timeline-title">${ev.step}</div>
              ${mapLink}
            </div>
          `;
        });

        html += `</div></div>`;
      });

      container.innerHTML = html;
      if (window.lucide) lucide.createIcons();

    } catch (e) {
      console.error('Erro ao carregar timeline:', e);
      container.innerHTML = '<div style="color:var(--mac-destructive); font-size:13px; text-align:center; padding-top:40px;">Erro ao carregar timeline de eventos.</div>';
    }
  },

  focusTimelinePoint(lat, lng) {
    this.switchTab('mapa');
    if (!this.timelinePointMarker) {
      this.timelinePointMarker = L.circleMarker([lat, lng], {
        radius: 12, fillColor: '#10b981', color: '#fff', weight: 3, opacity: 1, fillOpacity: 1
      }).addTo(this.map);
    } else {
      this.timelinePointMarker.setLatLng([lat, lng]);
    }
    
    // Bind popup to explain it's an event
    this.timelinePointMarker.bindPopup('<div class="map-popup"><strong>Ponto do Evento</strong><br>Local onde a etapa foi registrada.</div>').openPopup();
    this.map.setView([lat, lng], 18);
  },

  async resetUserTracking() {
    const selectEl = document.getElementById('trail-user-select');
    const userId = selectEl ? selectEl.value : null;

    if (!userId) {
      Components.toast('Selecione um padeiro primeiro', 'info');
      return;
    }

    const userName = selectEl.options[selectEl.selectedIndex].text;
    const dateInput = document.getElementById('trail-date');
    const date = dateInput ? dateInput.value : '';

    if (!date) {
      Components.toast('Selecione uma data para o reset', 'info');
      return;
    }

    // Exibe modal de confirmação
    Components.confirm(
      `Deseja realmente apagar o histórico de localização do padeiro <b>${userName}</b> para o dia <b>${date.split('-').reverse().join('/')}</b>?<br><br>Esta ação excluirá apenas os registros dele deste dia e é irreversível.`,
      async () => {
        const loaderDiv = document.createElement('div');
        loaderDiv.innerHTML = Components.loading();
        const loaderEl = loaderDiv.firstChild;
        document.body.appendChild(loaderEl);

        try {
          const res = await API.delete(`/api/tracking/trail/${userId}?date=${date}`);
          Components.toast('Histórico do padeiro limpo com sucesso!', 'success');
          this.clearTrail();
          
          // Se hoje, remove o marcador ativo
          const todayStr = new Date().toISOString().split('T')[0];
          if (date === todayStr) {
            if (this.markers[userId]) {
              this.markers[userId].remove();
              delete this.markers[userId];
            }
          }
        } catch (error) {
          console.error('Erro ao resetar histórico do padeiro:', error);
          Components.toast(error.message || 'Erro ao resetar histórico', 'error');
        } finally {
          if (loaderEl) loaderEl.remove();
        }
      }
    );
  },

  clearTrail() {
    this.trailLayers.clearLayers();
    const infoEl = document.getElementById('trail-info');
    if (infoEl) infoEl.innerHTML = '';
  }
};
