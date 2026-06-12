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
  allPadeiros: [],

  async render() {
    if (this.bcpInterval) clearInterval(this.bcpInterval);
    const container = document.getElementById('page-container');
    
    // Fetch all active padeiros to populate select dropdown
    let padeiros = [];
    try {
      padeiros = await API.get('/api/padeiros');
      this.allPadeiros = padeiros;
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

      .mac-layout { position: relative; display: flex; flex: 1; width: 100%; overflow: hidden; }
      .mac-mobile-block { display: none !important; }

      /* Reconstrução da Aba Rastreamento para Mobile (Mantendo o Desktop macOS idêntico) */
      @media (max-width: 1023px) {
        .mac-layout {
          flex-direction: column;
          overflow: visible !important;
        }
        .mac-sidebar {
          order: 3;
          position: relative !important;
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
        position: absolute;
        top: 20px;
        left: 20px;
        bottom: 20px;
        width: 380px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        z-index: 1010;
        border: 1px solid var(--mac-border);
      }

      .mac-sidebar-header { padding: 24px 24px 16px; }
      .mac-sidebar-title {
        font-size: 18px; font-weight: 700; color: var(--mac-label); margin: 0;
      }

      .mac-sidebar-list { flex: 1; overflow-y: auto; padding-bottom: 20px; }
      .mac-sidebar-list::-webkit-scrollbar { width: 6px; }
      .mac-sidebar-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

      /* Mobile original list item */
      .mac-track-item:not(.desktop-track-item) {
        height: 52px; padding: 0 12px; margin: 0 8px; border-radius: 6px;
        display: flex; align-items: center; gap: 10px;
        cursor: pointer; transition: background-color 120ms ease;
        color: var(--mac-label);
      }
      .mac-track-item:not(.desktop-track-item):hover { background: var(--mac-hover); }
      .mac-track-item:not(.desktop-track-item).selected { background: var(--mac-selected-bg); }
      .mac-track-item:not(.desktop-track-item).selected .mac-track-name { font-weight: 600; }

      /* Desktop Card Item */
      .desktop-track-item {
        margin: 0 16px 16px;
        padding: 20px;
        border-radius: 20px;
        background: #FFFFFF;
        border: 1px solid var(--mac-border);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 80px; /* Collapsed */
        box-sizing: border-box;
      }
      .desktop-track-item:hover { background: #F8F9FA; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      
      .desktop-track-item.expanded {
        height: 250px; /* Expanded */
        background: linear-gradient(135deg, var(--mac-accent) 0%, #1032CC 100%);
        color: #FFF;
        box-shadow: 0 12px 30px rgba(0, 122, 255, 0.3);
        border: none;
      }

      .track-item-header { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
      .track-item-title-group { display: flex; flex-direction: column; gap: 4px; }
      .track-item-title { font-size: 15px; font-weight: 700; color: var(--mac-label); transition: color 0.3s; }
      .desktop-track-item.expanded .track-item-title { color: #FFF; }
      .track-item-subtitle { font-size: 12px; color: var(--mac-tertiary); font-weight: 500; transition: color 0.3s; }
      .desktop-track-item.expanded .track-item-subtitle { color: rgba(255,255,255,0.7); }
      
      .filial-name-highlight { color: var(--mac-accent); font-weight: 600; transition: color 0.3s; }
      .desktop-track-item.expanded .filial-name-highlight { color: rgba(255,255,255,0.9); }
      
      .track-item-badge { background: var(--mac-accent); color: #FFF; font-size: 10px; font-weight: 800; padding: 6px 12px; border-radius: 12px; letter-spacing: 0.5px; transition: all 0.3s; }
      .desktop-track-item.expanded .track-item-badge { background: #FFF; color: var(--mac-accent); }
      .desktop-track-item.expanded .track-item-badge.online { background: #FFF !important; color: var(--mac-success) !important; }
      .desktop-track-item.expanded .track-item-badge.offline { background: rgba(255, 255, 255, 0.2) !important; color: #FFF !important; }
      
      .track-item-details { margin-top: 16px; opacity: 0; transition: opacity 0.3s, transform 0.3s; transform: translateY(10px); display: none; flex-direction: column; }
      .desktop-track-item.expanded .track-item-details { opacity: 1; transform: translateY(0); display: flex; }
      
      .track-progress-container { margin-bottom: 16px; }
      .track-progress-label { font-size: 13px; font-weight: 700; color: #FFF; margin-bottom: 8px; display: block; }
      .track-progress-bar { height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; width: 100%; overflow: hidden; }
      .track-progress-fill { height: 100%; background: #FFF; border-radius: 2px; transition: width 1s ease; }
      
      .track-info-grid { display: grid; grid-template-columns: 1.8fr 1fr 1.2fr; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 16px; }
      .track-info-col { display: flex; flex-direction: column; gap: 4px; }
      .track-info-label { font-size: 10px; color: rgba(255,255,255,0.7); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
      .track-info-value { font-size: 13px; font-weight: 700; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      
      .track-driver-footer { display: flex; align-items: center; gap: 12px; }
      .track-driver-info { flex: 1; display: flex; flex-direction: column; }
      .track-driver-name { font-size: 14px; font-weight: 700; color: #FFF; }
      .track-driver-role { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500;}
      
      .track-driver-actions { display: flex; gap: 10px; }
      .track-action-btn { width: 34px; height: 34px; border-radius: 50%; background: #FFF; border: none; color: var(--mac-accent); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .track-action-btn:hover { background: #F0F0F0; }
      .track-action-btn i { width: 16px; height: 16px; }

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
      
      /* Bottom Client Panel */
      .bottom-client-panel {
        position: absolute;
        bottom: 30px;
        right: 30px; /* Align to right side */
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        border: 1px solid var(--mac-border);
        padding: 20px 24px;
        z-index: 1010;
        display: none;
        flex-direction: column;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
        transform: translateY(20px);
        opacity: 0;
        width: max-content;
        max-width: calc(100% - 440px); /* Evita sobrepor a sidebar */
      }
      .bottom-client-panel.visible {
        display: flex;
        transform: translateY(0);
        opacity: 1;
      }
      @media (max-width: 1023px) {
        .bottom-client-panel { display: none !important; }
      }
      
      .bcp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .bcp-title { font-size: 16px; font-weight: 800; color: var(--mac-label); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bcp-badge { background: var(--mac-accent); color: #FFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 10px; letter-spacing: 0.5px; flex-shrink: 0; }
      
      .bcp-grid { display: flex; gap: 24px; flex-wrap: wrap; }
      .bcp-col { display: flex; flex-direction: column; gap: 6px; }
      .bcp-label { font-size: 10px; color: var(--mac-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      .bcp-value { font-size: 13px; font-weight: 800; color: var(--mac-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }

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
      @media (min-width: 1024px) {
        .mac-page-header {
          display: none !important;
        }
        .mac-toolbar {
          display: none !important;
        }
      }
      
      /* Floating Map Actions (Top Right) */
      .mac-map-floating-actions {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 12px;
        z-index: 1010;
      }
      .mac-floating-btn {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--mac-border);
        color: var(--mac-label);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        padding: 0;
        outline: none;
      }
      .mac-floating-btn:hover {
        background: #FFFFFF;
        color: var(--mac-accent);
        transform: scale(1.08) translateY(-2px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
        border-color: rgba(0, 122, 255, 0.3);
      }
      .mac-floating-btn:active {
        transform: scale(0.98) translateY(0);
      }
      .mac-floating-btn i {
        width: 18px;
        height: 18px;
      }

      /* Dark mode override */
      @media (prefers-color-scheme: dark) {
        .mac-floating-btn {
          background: rgba(30, 30, 30, 0.9);
          border-color: rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
        }
        .mac-floating-btn:hover {
          background: #2D2D2D;
          color: var(--mac-accent);
          border-color: rgba(10, 132, 255, 0.3);
        }
      }
      </style>

      <div class="mac-rastreamento-root fade-in">
        
        <!-- Desktop App -->
        <div class="mac-layout">
          <!-- Sidebar -->
          <aside class="mac-sidebar">
            <header class="mac-sidebar-header" style="display: flex; flex-direction: column; gap: 10px;">
              <h2 class="mac-sidebar-title">Padeiros</h2>
              <div id="sidebar-search-container" style="display: none; width: 100%;">
                <div style="position: relative; width: 100%;">
                  <input type="text" id="sidebar-search-input" placeholder="Buscar por nome ou filial..." oninput="Rastreamento.filterBakers(this.value)" style="width: 100%; height: 34px; padding: 0 12px 0 34px; border-radius: 8px; border: 1px solid var(--mac-border); background: var(--mac-hover); color: var(--mac-label); font-size: 13px; outline: none; box-sizing: border-box;" />
                  <i data-lucide="search" style="position: absolute; left: 10px; top: 9px; width: 16px; height: 16px; color: var(--mac-tertiary);"></i>
                </div>
              </div>
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
            <div id="view-mapa" class="mac-map-container" style="display:flex; flex-direction:column; position: relative;">
               <!-- Floating Map Actions (Top Right) -->
               <div class="mac-map-floating-actions">
                 <button class="mac-floating-btn" onclick="Rastreamento.toggleSearch()" title="Buscar Padeiro">
                   <i data-lucide="search"></i>
                 </button>
                 <button class="mac-floating-btn" onclick="Rastreamento.recenterMap()" title="Centralizar Mapa">
                   <i data-lucide="target"></i>
                 </button>
               </div>
               
               <div id="tracking-map" style="flex:1;"></div>
               
               <!-- Bottom Floating Client Panel -->
               <div id="bottom-client-panel" class="bottom-client-panel">
                 <div class="bcp-header">
                   <h3 class="bcp-title" id="bcp-main-title">Padeiro Selecionado</h3>
                   <span class="bcp-badge">EM ANDAMENTO</span>
                 </div>
                 <div class="bcp-grid">
                   <div class="bcp-col">
                     <span class="bcp-label">Cliente</span>
                     <span class="bcp-value" id="bcp-cliente">Aguardando...</span>
                   </div>
                   <div class="bcp-col">
                     <span class="bcp-label">Destino</span>
                     <span class="bcp-value" id="bcp-destino">Não info.</span>
                   </div>
                   <div class="bcp-col">
                     <span class="bcp-label">Localização Atual</span>
                     <span class="bcp-value" id="bcp-local">Buscando...</span>
                   </div>
                   <div class="bcp-col">
                     <span class="bcp-label">Etapa</span>
                     <span class="bcp-value" id="bcp-etapa">--</span>
                   </div>
                   <div class="bcp-col">
                     <span class="bcp-label">Restante</span>
                     <span class="bcp-value" id="bcp-restante">--</span>
                   </div>
                 </div>
               </div>

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
      this.updateList([]); // Initially populate sidebar with offline bakers
      this.initSocket();
      
      // Forçar atualização do tamanho do mapa após transição do flexbox
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 150);
    }, 50);
  },

  initMap() {
    this._initialZoomDone = false;
    this.map = L.map('tracking-map', { zoomControl: false }).setView([-23.5505, -46.6333], 13);
    
    // Add custom zoom control at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&hl=pt-BR&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 20
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

    this.socket.on('activity-updated', (atividade) => {
      const dateInput = document.getElementById('trail-date');
      const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
      
      if (atividade.data === selectedDate) {
        this.fetchClientInfo(atividade.padeiroId, selectedDate);
        if (this.selectedUserId === atividade.padeiroId) {
          this.loadTimeline(selectedDate);
        }
      }
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
    if (!this._initialZoomDone && locations.length > 0) {
      const group = new L.featureGroup(Object.values(this.markers));
      this.map.fitBounds(group.getBounds().pad(0.1));
      this._initialZoomDone = true;
    }
  },



  updateList(locations) {
    const list = document.getElementById('active-track-list');
    if (!list) return;

    if (locations) {
      this.latestLocations = locations;
    } else {
      locations = this.latestLocations || [];
    }

    const padeirosToRender = this.allPadeiros || [];
    if (padeirosToRender.length === 0) {
      list.innerHTML = '<div style="padding: 12px 20px; font-size: 13px; color: var(--mac-tertiary);">Nenhum padeiro cadastrado.</div>';
      return;
    }

    // Map locations by userId for fast lookup
    const locMap = new Map();
    locations.forEach(loc => locMap.set(loc.userId, loc));

    // Avoid DOM recreation if the online users haven't changed
    const onlineIds = Array.from(locMap.keys()).sort().join(',');
    if (this._lastOnlineIds === onlineIds) {
      return;
    }
    this._lastOnlineIds = onlineIds;

    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
    const isMobile = window.innerWidth < 1024;
    const dateInput = document.getElementById('trail-date');
    const selectedDateStr = dateInput && dateInput.value ? dateInput.value : '';

    // Group bakers by filial
    const grouped = {};
    padeirosToRender.forEach(p => {
      const filial = p.filial || 'Sem Filial';
      if (!grouped[filial]) grouped[filial] = [];
      grouped[filial].push(p);
    });

    let html = '';
    let globalIdx = 0;

    Object.keys(grouped).sort().forEach(filial => {
      // Add filial header separator
      html += `
        <div class="sidebar-filial-header" style="margin: 16px 16px 8px; display: flex; align-items: center; gap: 8px;">
          <span class="filial-tag" style="background: rgba(0, 122, 255, 0.1); color: var(--mac-accent); font-size: 10px; font-weight: 750; padding: 4px 10px; border-radius: 8px; text-transform: uppercase; border: 1px solid rgba(0, 122, 255, 0.2);">
            ${filial}
          </span>
          <div style="flex: 1; height: 1px; background: var(--mac-border);"></div>
        </div>
      `;

      grouped[filial].forEach((padeiro) => {
        const isSelected = this.selectedUserId === padeiro.id;
        const initial = padeiro.nome[0].toUpperCase();
        const color = colors[globalIdx % colors.length];
        globalIdx++;

        const loc = locMap.get(padeiro.id);
        const isOnline = !!loc;
        
        if (isMobile) {
          html += `
            <div class="mac-track-item ${isSelected ? 'selected' : ''}" onclick="Rastreamento.selectActiveItem('${padeiro.id}')">
              ${(padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem) ? `
                <img src="${padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
              ` : `
                <div class="mac-avatar" style="background-color: ${color}; color: #FFF; width: 36px; height: 36px; font-size: 15px; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${initial}</div>
              `}
              <div class="mac-track-name" style="margin-left: 10px;">${padeiro.nome}</div>
              <div class="mac-track-status ${isOnline ? 'active' : 'inactive'}"></div>
              <div class="mac-track-icon">
                 <i data-lucide="crosshair" style="width: 16px; height: 16px;"></i>
              </div>
            </div>
          `;
          return;
        }

        const displayDate = selectedDateStr 
          ? new Date(selectedDateStr + 'T12:00:00') 
          : (loc ? new Date(loc.lastUpdate) : new Date());
        const displayDateStr = displayDate.toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'});
        const displayCod = padeiro.codTec ? padeiro.codTec : padeiro.id.substring(0, 6).toUpperCase();

        html += `
          <div class="mac-track-item desktop-track-item ${isSelected ? 'expanded' : ''}" id="track-item-${padeiro.id}" onclick="Rastreamento.selectActiveItem('${padeiro.id}')">
            <div class="track-item-header" style="display: flex; align-items: center; gap: 12px; width: 100%;">
              ${(padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem) ? `
                <img src="${padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
              ` : `
                <div class="mac-avatar" style="background-color: ${color}; color: #FFF; width: 36px; height: 36px; font-size: 15px; font-weight: 600; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.3s;">${initial}</div>
              `}
              <div class="track-item-title-group" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
                <div class="track-item-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${padeiro.nome}</div>
                <div class="track-item-subtitle" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  COD: ${displayCod} <span class="filial-name-highlight">• ${filial}</span>
                </div>
              </div>
              <div class="track-item-badge ${isOnline ? 'online' : 'offline'}" style="background: ${isOnline ? 'var(--mac-success)' : 'var(--mac-tertiary)'}; color: #FFF; flex-shrink: 0;">
                ${isOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
            
            <div class="track-item-details">
              <div class="track-progress-container">
                <span class="track-progress-label progress-label-${padeiro.id}">0%</span>
                <div class="track-progress-bar"><div class="track-progress-fill progress-fill-${padeiro.id}" style="width: 0%;"></div></div>
              </div>
              
              <div class="track-info-grid">
                <div class="track-info-col">
                  <span class="track-info-label">Cliente</span>
                  <span class="track-info-value client-name" data-userid="${padeiro.id}">Aguardando...</span>
                </div>
                <div class="track-info-col">
                  <span class="track-info-label">Status</span>
                  <span class="track-info-value">${isOnline ? 'Em Rota' : 'Inativo'}</span>
                </div>
                <div class="track-info-col">
                  <span class="track-info-label">Data</span>
                  <span class="track-info-value">${displayDateStr}</span>
                </div>
              </div>
              
              <div class="track-driver-footer">
                ${(padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem) ? `
                  <img src="${padeiro.foto || padeiro.fotoPath || padeiro.avatar || padeiro.imagem}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                ` : `
                  <div class="mac-avatar" style="background-color: ${color}; color: #FFF; width: 32px; height: 32px; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${initial}</div>
                `}
                <div class="track-driver-info">
                  <div class="track-driver-name">${padeiro.nome}</div>
                  <div class="track-driver-role">Padeiro</div>
                </div>
                <div class="track-driver-actions">
                  <button class="track-action-btn btn-calendar-picker" data-userid="${padeiro.id}" title="Cronograma" onclick="event.stopPropagation()"><i data-lucide="calendar"></i></button>
                  <button class="track-action-btn" title="Ligar" onclick="event.stopPropagation()"><i data-lucide="phone"></i></button>
                </div>
              </div>
            </div>
          </div>
        `;
      });
    });

    list.innerHTML = html;
    
    if (window.lucide) lucide.createIcons();

    // Inicializa o Flatpickr (popup idêntico ao do Cronograma) nos botões de calendário dos cards
    if (typeof flatpickr !== 'undefined') {
      document.querySelectorAll('.btn-calendar-picker').forEach(btn => {
        const userId = btn.dataset.userid;
        flatpickr(btn, {
          locale: "pt",
          dateFormat: "Y-m-d",
          disableMobile: true,
          defaultDate: selectedDateStr || new Date().toISOString().split('T')[0],
          onChange: (selectedDates, dateStr) => {
            Rastreamento.selectCalendarDate(dateStr, userId);
          }
        });
      });
    }
    
    if (this.selectedUserId && !isMobile) {
      setTimeout(() => {
        const dateInput = document.getElementById('trail-date');
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        this.fetchClientInfo(this.selectedUserId, date);
      }, 100);
    }
  },

  selectActiveItem(userId) {
    const isMobile = window.innerWidth < 1024;
    
    // Toggle collapse logic
    if (!isMobile && this.selectedUserId === userId) {
      this.onUserSelectChange(''); // This clears selection and collapses
      return;
    }
    
    // Atualiza a seleção visual
    this.selectedUserId = userId;
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl) selectEl.value = userId;
    
    this.focusPadeiro(userId);
    
    document.querySelectorAll('.mac-track-item').forEach(el => {
      el.classList.remove('selected');
      el.classList.remove('expanded');
    });
    
    if (window.event && window.event.currentTarget) {
      const target = window.event.currentTarget;
      if (isMobile) {
        target.classList.add('selected');
      } else {
        target.classList.add('expanded');
        const bottomPanel = document.getElementById('bottom-client-panel');
        if (bottomPanel) {
          bottomPanel.classList.add('visible');
          document.getElementById('bcp-main-title').innerText = 'Carregando...';
          document.getElementById('bcp-cliente').innerText = 'Carregando...';
          document.getElementById('bcp-etapa').innerText = '--';
        }
        
        const dateInput = document.getElementById('trail-date');
        const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        this.fetchClientInfo(userId, date);
      }
    }
  },

  async fetchClientInfo(userId, date) {
    try {
      const atividades = await API.get(`/api/atividades?padeiroId=${userId}&data=${date}`);
      
      // Calculate progress dynamically based on activity flow step
      let progressVal = 0;
      if (atividades && atividades.length > 0) {
        const ultima = atividades[atividades.length - 1];
        if (ultima.status === 'finalizada') {
          progressVal = 100;
        } else {
          const step = parseInt(ultima.lastStep) || 0;
          progressVal = Math.round((step / 4) * 100);
        }
      }
      
      const progressLabel = document.querySelector(`.progress-label-${userId}`);
      const progressFill = document.querySelector(`.progress-fill-${userId}`);
      if (progressLabel) progressLabel.innerText = `${progressVal}%`;
      if (progressFill) progressFill.style.width = `${progressVal}%`;
      
      let clienteAtual = 'Sem atividades hoje';
      let etapaAtual = '--';
      let locStr = 'Buscando...';
      let destinoStr = 'Não info.';
      let titleStr = `Atividades de hoje`;
      
      if (atividades && atividades.length > 0) {
        // Encontrar a atividade mais recente ou em andamento
        const ultima = atividades[atividades.length - 1];
        clienteAtual = ultima.clienteNome || 'Cliente não identificado';
        titleStr = ultima.clienteNome ? `Atendimento: ${ultima.clienteNome}` : titleStr;
        if (ultima.endereco) destinoStr = ultima.endereco.split('-')[0].trim();
        
        if (ultima.timeline && ultima.timeline.length > 0) {
          const ultimoEvento = ultima.timeline[ultima.timeline.length - 1];
          etapaAtual = ultimoEvento.step || '--';
          if (ultimoEvento.lat && ultimoEvento.lng) {
            locStr = `${ultimoEvento.lat.toFixed(4)}, ${ultimoEvento.lng.toFixed(4)}`;
          } else {
            locStr = 'GPS indisponível';
          }
        }
      } else {
        // Fallback: buscar do cronograma agendado do dia
        try {
          const cronogramas = await API.get(`/api/cronograma?padeiroId=${userId}&data=${date}`);
          if (cronogramas && cronogramas.length > 0) {
            // Ordenar por posição (ordem das visitas)
            cronogramas.sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
            // Acha a primeira pendente ou em andamento, ou a última concluída
            const atual = cronogramas.find(c => c.status === 'em_andamento') 
                       || cronogramas.find(c => c.status === 'pendente') 
                       || cronogramas[cronogramas.length - 1];
            
            clienteAtual = atual.clienteNome || 'Cliente não identificado';
            titleStr = `Agendado: ${clienteAtual}`;
            destinoStr = 'Agendado no Cronograma';
            etapaAtual = atual.status === 'em_andamento' ? 'Em Andamento' : atual.status === 'concluida' ? 'Concluída' : 'Agendado';
            locStr = 'Aguardando início';
          }
        } catch (err) {
          console.error('Erro ao buscar backup do cronograma:', err);
        }
      }
      
      const clientNameEl = document.querySelector(`.client-name[data-userid="${userId}"]`);
      if (clientNameEl) clientNameEl.innerText = clienteAtual;
      
      const bcpTitle = document.getElementById('bcp-main-title');
      const bcpCliente = document.getElementById('bcp-cliente');
      const bcpDestino = document.getElementById('bcp-destino');
      const bcpEtapa = document.getElementById('bcp-etapa');
      const bcpLocal = document.getElementById('bcp-local');
      const bcpRestante = document.getElementById('bcp-restante');
      
      if (bcpTitle) bcpTitle.innerText = titleStr;
      if (bcpCliente) bcpCliente.innerText = clienteAtual;
      if (bcpDestino) bcpDestino.innerText = destinoStr;
      if (bcpEtapa) bcpEtapa.innerText = etapaAtual;
      if (bcpLocal) bcpLocal.innerText = locStr;
      
      if (this.bcpInterval) clearInterval(this.bcpInterval);
      const updateRestante = () => {
        const el = document.getElementById('bcp-restante');
        if (!el) {
          if (this.bcpInterval) clearInterval(this.bcpInterval);
          return;
        }
        if (atividades && atividades.length > 0) {
          const ultima = atividades[atividades.length - 1];
          if (ultima.status === 'finalizada') {
            el.innerText = 'Concluído';
            if (this.bcpInterval) clearInterval(this.bcpInterval);
          } else if (ultima.inicioEm && ultima.tempoMinimoMinutos > 0) {
            const inicio = new Date(ultima.inicioEm);
            const tempoMs = ultima.tempoMinimoMinutos * 60000;
            const dec = new Date() - inicio;
            const rest = tempoMs - dec;
            if (rest <= 0) {
              el.innerText = 'Liberado';
              if (this.bcpInterval) clearInterval(this.bcpInterval);
            } else {
              const h = Math.floor(rest / 3600000);
              const m = Math.floor((rest % 3600000) / 60000);
              const s = Math.floor((rest % 60000) / 1000);
              el.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }
          } else {
            el.innerText = 'Sem tempo mín.';
            if (this.bcpInterval) clearInterval(this.bcpInterval);
          }
        } else {
          el.innerText = '--';
          if (this.bcpInterval) clearInterval(this.bcpInterval);
        }
      };
      updateRestante();
      if (atividades && atividades.length > 0) {
        const ultima = atividades[atividades.length - 1];
        if (ultima.status === 'em_andamento' && ultima.inicioEm && ultima.tempoMinimoMinutos > 0) {
          this.bcpInterval = setInterval(updateRestante, 1000);
        }
      }
      
    } catch (e) {
      console.error('Erro ao buscar info do cliente:', e);
      const clientNameEl = document.querySelector(`.client-name[data-userid="${userId}"]`);
      if (clientNameEl) clientNameEl.innerText = 'Erro ao carregar';
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
    
    document.querySelectorAll('.mac-track-item').forEach(el => {
      el.classList.remove('selected');
      el.classList.remove('expanded');
    });
    
    if (userId) {
      const itemEl = document.getElementById(`track-item-${userId}`);
      if (itemEl && window.innerWidth >= 1024) itemEl.classList.add('expanded');
      
      this.loadTrail();
      
      const bottomPanel = document.getElementById('bottom-client-panel');
      if (bottomPanel && window.innerWidth >= 1024) bottomPanel.classList.add('visible');
      
      const dateInput = document.getElementById('trail-date');
      const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
      this.fetchClientInfo(userId, date);
    } else {
      this.clearTrail();
      if (this.bcpInterval) clearInterval(this.bcpInterval);
      const bottomPanel = document.getElementById('bottom-client-panel');
      if (bottomPanel) bottomPanel.classList.remove('visible');
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
    if (this.bcpInterval) clearInterval(this.bcpInterval);
    const bottomPanel = document.getElementById('bottom-client-panel');
    if (bottomPanel) bottomPanel.classList.remove('visible');
  },

  selectCalendarDate(dateStr, userId) {
    // Update the date input element
    const dateInput = document.getElementById('trail-date');
    if (dateInput) {
      dateInput.value = dateStr;
    }
    
    // Also trigger date change and load trail
    this.onDateChange();
    
    // Update the card's visual date display
    const targetUserId = userId || this.selectedUserId;
    if (targetUserId) {
      const cardId = `track-item-${targetUserId}`;
      const cardEl = document.getElementById(cardId);
      if (cardEl) {
        const dateEl = cardEl.querySelector('.track-info-col:nth-child(3) .track-info-value');
        if (dateEl) {
          const dateObj = new Date(dateStr + 'T12:00:00');
          dateEl.innerText = dateObj.toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'});
        }
      }
      this.fetchClientInfo(targetUserId, dateStr);
    }
  },

  toggleSearch() {
    const container = document.getElementById('sidebar-search-container');
    if (!container) return;
    
    if (container.style.display === 'none') {
      container.style.display = 'block';
      const input = document.getElementById('sidebar-search-input');
      if (input) {
        input.focus();
        input.value = '';
        this.filterBakers('');
      }
    } else {
      container.style.display = 'none';
      this.filterBakers('');
    }
  },

  filterBakers(query) {
    const term = query.toLowerCase().trim();
    
    // Select all baker cards and filial headers in the sidebar
    const items = document.querySelectorAll('.desktop-track-item, .mac-track-item:not(.desktop-track-item)');
    const headers = document.querySelectorAll('.sidebar-filial-header');
    
    // Track headers that have at least one visible item
    const visibleFiliais = new Set();
    
    items.forEach(item => {
      // Extract the name of the baker from this item
      const titleEl = item.querySelector('.track-item-title') || item.querySelector('.mac-track-name');
      const name = titleEl ? titleEl.innerText.toLowerCase() : '';
      
      // Extract the branch name
      const parentSub = item.querySelector('.track-item-subtitle');
      let filial = '';
      if (parentSub) {
        const filialEl = parentSub.querySelector('.filial-name-highlight');
        if (filialEl) filial = filialEl.innerText.replace('•', '').toLowerCase().trim();
      }
      
      const isMatch = name.includes(term) || filial.includes(term);
      if (isMatch) {
        item.style.setProperty('display', 'flex', 'important');
        if (parentSub) {
          const filialEl = parentSub.querySelector('.filial-name-highlight');
          if (filialEl) {
            visibleFiliais.add(filialEl.innerText.replace('•', '').trim());
          }
        }
      } else {
        item.style.setProperty('display', 'none', 'important');
      }
    });
    
    // Filter filial headers
    headers.forEach(header => {
      const tagEl = header.querySelector('.filial-tag');
      if (tagEl) {
        const branchName = tagEl.innerText.trim();
        if (term === '' || visibleFiliais.has(branchName)) {
          header.style.setProperty('display', 'flex', 'important');
        } else {
          header.style.setProperty('display', 'none', 'important');
        }
      }
    });
  },

  recenterMap() {
    if (!this.map) return;
    const activeMarkers = Object.values(this.markers);
    if (activeMarkers.length > 0) {
      const group = new L.featureGroup(activeMarkers);
      this.map.fitBounds(group.getBounds().pad(0.1));
      Components.toast('Mapa centralizado nos padeiros ativos', 'success');
    } else {
      this.map.setView([-23.5505, -46.6333], 13);
      Components.toast('Nenhum sinal ativo no momento para centralizar', 'info');
    }
  }
};
