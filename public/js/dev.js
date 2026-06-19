/**
 * Dev Module - System Testing & Telemetry
 * BRAGO Sistema Padeiro
 */
const Dev = {
  _stats: null,
  _activities: [],
  _bakers: [],
  _currentTab: 'telemetria',

  async render() {
    const user = API.getUser();
    if (!user || user.role !== 'admin') {
      const c = document.getElementById('page-container');
      c.innerHTML = Components.empty('lock', 'Acesso negado. Esta página é restrita a administradores.');
      return;
    }

    const c = document.getElementById('page-container');
    c.innerHTML = `
    <style>
      /* ── Dev Page – Design System ────────────────────────── */
      .dev-page { display: flex; flex-direction: column; gap: 24px; padding-bottom: 48px; width: 100%; max-width: 100%; font-family: var(--font-main); }

      /* Tab Navigation */
      .dev-tabs {
        display: flex; gap: 8px; border-bottom: 1px solid var(--glass-border); padding-bottom: 4px; overflow-x: auto;
      }
      .dev-tab-btn {
        background: transparent; border: none; color: var(--text-secondary);
        padding: 10px 16px; border-radius: var(--radius-md); font-size: 14px; font-weight: 600;
        cursor: pointer; display: flex; align-items: center; gap: 8px; transition: var(--transition);
        white-space: nowrap;
      }
      .dev-tab-btn:hover { background: var(--bg-input); color: var(--text-main); }
      .dev-tab-btn.active { background: var(--primary-light); color: var(--primary); }

      /* Tab Panels */
      .dev-panel { display: none; flex-direction: column; gap: 24px; }
      .dev-panel.active { display: flex; }

      /* Danger Zone Banner */
      .dev-warning-banner {
        display: flex; align-items: flex-start; gap: 14px;
        background: #FFFBEB; border: 1.5px solid #FCD34D;
        border-radius: var(--radius-lg); padding: 16px 20px;
      }
      .dev-warning-icon {
        width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
        background: rgba(245, 158, 11, 0.12); color: #D97706;
        display: flex; align-items: center; justify-content: center;
      }
      .dev-warning-icon i { width: 20px; height: 20px; }
      .dev-warning-text h4 { font-size: 14px; font-weight: 700; color: #92400E; margin: 0 0 4px; }
      .dev-warning-text p  { font-size: 13px; color: #B45309; margin: 0; line-height: 1.45; }

      /* Header Info */
      .dev-header { margin-bottom: 8px; }
      .dev-title { font-size: 26px; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px; }
      .dev-subtitle { font-size: 14px; color: var(--text-secondary); margin-top: 4px; }

      /* KPI Cards */
      .dev-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      .dev-kpi-card {
        background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px;
        box-shadow: var(--shadow-sm); border: 1px solid var(--glass-border);
        display: flex; flex-direction: column; justify-content: space-between; gap: 14px;
        transition: var(--transition); cursor: default;
      }
      .dev-kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
      .dev-kpi-header { display: flex; justify-content: space-between; align-items: center; }
      .dev-kpi-icon {
        width: 42px; height: 42px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
      }
      .dev-kpi-icon i { width: 20px; height: 20px; }
      .dev-kpi-value { font-size: 30px; font-weight: 800; color: var(--text-main); line-height: 1.1; letter-spacing: -1px; }
      .dev-kpi-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
      .dev-kpi-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .dev-kpi-loading { width: 60px; height: 30px; background: var(--bg-input); border-radius: var(--radius-sm); animation: dev-shimmer 1.4s infinite; }
      @keyframes dev-shimmer { 0%,100%{ opacity:1; } 50%{ opacity:0.45; } }

      /* Colors for KPIs */
      .dev-kpi-blue   .dev-kpi-icon { background: rgba(30,75,255,0.08); color: var(--primary); }
      .dev-kpi-green  .dev-kpi-icon { background: rgba(16,185,129,0.08); color: var(--success); }
      .dev-kpi-orange .dev-kpi-icon { background: rgba(245,158,11,0.08); color: var(--warning); }
      .dev-kpi-red    .dev-kpi-icon { background: rgba(239,68,68,0.08); color: var(--error); }
      .dev-kpi-purple .dev-kpi-icon { background: rgba(168,85,247,0.08); color: #A855F7; }

      /* Conversion Funnel */
      .dev-funnel { display: flex; flex-direction: column; gap: 12px; background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--glass-border); box-shadow: var(--shadow-sm); }
      .dev-funnel-step { display: flex; flex-direction: column; gap: 8px; position: relative; }
      .dev-funnel-main { display: flex; align-items: center; gap: 16px; }
      .dev-funnel-badge {
        width: 36px; height: 36px; border-radius: 50%; background: var(--bg-input); color: var(--text-secondary);
        display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
      }
      .dev-funnel-step.completed .dev-funnel-badge { background: var(--primary); color: #fff; }
      .dev-funnel-bar-container { flex-grow: 1; height: 28px; background: var(--bg-input); border-radius: var(--radius-sm); position: relative; overflow: hidden; display: flex; align-items: center; }
      .dev-funnel-bar { height: 100%; background: linear-gradient(90deg, var(--primary) 0%, #3B82F6 100%); transition: width 0.5s ease-out; }
      .dev-funnel-bar-label { position: absolute; left: 12px; font-size: 13px; font-weight: 700; color: #fff; z-index: 2; display: flex; align-items: center; gap: 6px; }
      .dev-funnel-bar-label.dark { color: var(--text-main); }
      .dev-funnel-percent { position: absolute; right: 12px; font-size: 12px; font-weight: 700; color: var(--text-secondary); z-index: 2; }
      .dev-funnel-info-btn {
        background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: var(--transition);
      }
      .dev-funnel-info-btn:hover { background: var(--bg-input); color: var(--text-secondary); }
      .dev-funnel-detail { display: none; background: var(--bg-main); border-radius: var(--radius-md); padding: 14px 16px; font-size: 13px; line-height: 1.5; color: var(--text-secondary); border-left: 4px solid var(--primary); margin-left: 52px; animation: slideDown 0.2s ease-out; }
      .dev-funnel-detail.active { display: block; }
      .dev-funnel-connector { height: 16px; border-left: 2px dashed var(--text-muted); margin-left: 70px; opacity: 0.5; }

      /* Table Styles */
      .dev-card-table { background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--glass-border); box-shadow: var(--shadow-sm); overflow: hidden; }
      .dev-table-wrapper { overflow-x: auto; width: 100%; }
      .dev-table { width: 100%; border-collapse: collapse; text-align: left; }
      .dev-table th { background: var(--bg-main); padding: 14px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); border-bottom: 1px solid var(--glass-border); }
      .dev-table td { padding: 14px 16px; font-size: 13px; color: var(--text-main); border-bottom: 1px solid var(--glass-border); vertical-align: middle; }
      .dev-table tr:last-child td { border-bottom: none; }
      .dev-table tr:hover td { background-color: var(--bg-card-hover); }

      /* Badges */
      .dev-badge { padding: 4px 10px; border-radius: var(--radius-full); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
      .dev-badge-success { background: rgba(16,185,129,0.1); color: var(--success); }
      .dev-badge-warning { background: rgba(245,158,11,0.1); color: var(--warning); }
      .dev-badge-error   { background: rgba(239,68,68,0.1); color: var(--error); }
      .dev-badge-info    { background: rgba(59,130,246,0.1); color: var(--info); }
      .dev-badge-neutral { background: var(--bg-input); color: var(--text-secondary); }

      /* Reset cards grid */
      .dev-danger-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .dev-danger-card {
        background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid rgba(239, 68, 68, 0.15); padding: 22px;
        box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between; gap: 16px; transition: var(--transition);
      }
      .dev-danger-card:hover { border-color: rgba(239, 68, 68, 0.4); box-shadow: var(--shadow-md); transform: translateY(-2px); }
      .dev-danger-header { display: flex; align-items: center; gap: 12px; }
      .dev-danger-icon {
        width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
        background: rgba(239,68,68,0.08); color: var(--error);
        display: flex; align-items: center; justify-content: center;
      }
      .dev-danger-title { font-size: 15px; font-weight: 700; color: var(--text-main); margin: 0; }
      .dev-danger-desc { font-size: 12.5px; color: var(--text-secondary); margin: 0; line-height: 1.45; }
      .dev-danger-btn {
        width: 100%; height: 42px; background: var(--error); color: #fff;
        border: none; border-radius: var(--radius-md); cursor: pointer;
        font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: var(--transition);
      }
      .dev-danger-btn:hover { background: #DC2626; }
      .dev-danger-btn:active { transform: scale(0.97); }
      .dev-danger-btn.loading { opacity: 0.65; pointer-events: none; }

      /* Details Modal Timeline */
      .dev-timeline { display: flex; flex-direction: column; gap: 16px; padding: 8px 4px; position: relative; }
      .dev-timeline::before {
        content: ''; position: absolute; left: 17px; top: 8px; bottom: 8px; width: 2px;
        background: var(--bg-input); z-index: 1;
      }
      .dev-timeline-item { display: flex; gap: 16px; position: relative; z-index: 2; }
      .dev-timeline-dot {
        width: 12px; height: 12px; border-radius: 50%; background: var(--text-muted);
        border: 3px solid var(--bg-card); box-shadow: 0 0 0 2px var(--bg-input);
        margin-left: 12px; margin-top: 4px; flex-shrink: 0;
      }
      .dev-timeline-item.active .dev-timeline-dot { background: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
      .dev-timeline-content { flex-grow: 1; background: var(--bg-main); border-radius: var(--radius-md); padding: 12px 14px; }
      .dev-timeline-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .dev-timeline-title { font-size: 13.5px; font-weight: 700; color: var(--text-main); }
      .dev-timeline-time { font-size: 11px; color: var(--text-muted); font-weight: 500; }
      .dev-timeline-body { font-size: 12.5px; color: var(--text-secondary); line-height: 1.4; }
      .dev-timeline-link { color: var(--primary); text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 2px; }
      .dev-timeline-link:hover { text-decoration: underline; }

      /* ── Heatmap Styling (Exactly matching user image) ───────────────── */
      .dev-heatmap-card {
        background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-sm); padding: 24px; display: flex; flex-direction: column; gap: 20px;
        transition: var(--transition);
      }
      .dev-heatmap-header {
        display: flex; justify-content: space-between; align-items: flex-start;
      }
      .dev-heatmap-title-sec {
        display: flex; flex-direction: column; gap: 2px;
      }
      .dev-heatmap-title {
        font-size: 14px; font-weight: 500; color: var(--text-secondary);
      }
      .dev-heatmap-main-stat {
        display: flex; align-items: center; gap: 8px; margin-top: 4px;
      }
      .dev-heatmap-stat-value {
        font-size: 28px; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px;
      }
      .dev-heatmap-trend {
        padding: 4px 8px; border-radius: 8px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 2px;
      }
      .dev-heatmap-trend.positive {
        background: #ECFDF5; color: #10B981;
      }
      .dev-heatmap-trend.negative {
        background: #FEF2F2; color: #EF4444;
      }
      .dev-heatmap-legend {
        display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 600; color: var(--text-muted);
      }
      .dev-heatmap-legend-scale {
        display: flex; gap: 6px; align-items: center;
      }
      .dev-heatmap-legend-item {
        display: flex; align-items: center; gap: 4px;
      }
      .dev-heatmap-legend-color {
        width: 24px; height: 10px; border-radius: 2px;
      }
      .dev-heatmap-grid-container {
        display: flex; flex-direction: column; gap: 10px; overflow-x: auto; padding-bottom: 8px; margin-top: 8px;
      }
      .dev-heatmap-row {
        display: flex; align-items: center; gap: 16px; min-width: max-content;
      }
      .dev-heatmap-row-label {
        width: 150px; font-size: 13px; font-weight: 500; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;
      }
      .dev-heatmap-cells {
        display: flex; gap: 8px;
      }
      .dev-heatmap-cell {
        width: 48px; height: 32px; border-radius: 4px; cursor: pointer; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); position: relative;
      }
      .dev-heatmap-cell:hover {
        transform: scale(1.06); box-shadow: 0 0 0 2.5px var(--primary), 0 4px 12px var(--glass-glow); z-index: 10;
      }
      .dev-heatmap-tooltip {
        position: absolute; bottom: 130%; left: 50%; transform: translateX(-50%) translateY(4px); background: #1F2937; color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; pointer-events: none; opacity: 0; transition: all 0.15s ease; box-shadow: 0 4px 10px rgba(0,0,0,0.15); z-index: 9999; display: flex; align-items: center; justify-content: center;
      }
      .dev-heatmap-tooltip::after {
        content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: #1F2937 transparent transparent transparent;
      }
      .dev-heatmap-cell:hover .dev-heatmap-tooltip {
        opacity: 1; transform: translateX(-50%) translateY(0);
      }
      .dev-heatmap-footer-labels {
        display: flex; padding-left: 166px; gap: 8px; min-width: max-content; margin-top: 4px;
      }
      .dev-heatmap-col-label {
        width: 48px; text-align: center; font-size: 11.5px; font-weight: 600; color: var(--text-muted);
      }

      /* Accordion slide animation */
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      /* Responsive styling updates */
      @media (max-width: 768px) {
        .dev-kpi-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
        .dev-danger-grid { grid-template-columns: 1fr; }
        .dev-page { padding-bottom: 96px; }
      }
    </style>

    <div class="dev-page fade-in">
      
      <!-- Top Title Bar -->
      <div class="dev-header">
        <h1 class="dev-title">Painel de Desenvolvimento</h1>
        <p class="dev-subtitle">Monitore a integridade do sistema, fluxo de usuários e diagnostique problemas.</p>
      </div>

      <!-- Tab Navigation -->
      <div class="dev-tabs">
        <button class="dev-tab-btn active" id="btn-tab-telemetria" onclick="Dev.switchTab('telemetria')">
          <i data-lucide="activity"></i> Telemetria de Fluxo
        </button>
        <button class="dev-tab-btn" id="btn-tab-mapacalor" onclick="Dev.switchTab('mapacalor')">
          <i data-lucide="layout-grid"></i> Mapa de Calor
        </button>
        <button class="dev-tab-btn" id="btn-tab-bd" onclick="Dev.switchTab('bd')">
          <i data-lucide="database"></i> Banco de Dados
        </button>
        <button class="dev-tab-btn" id="btn-tab-risco" onclick="Dev.switchTab('risco')">
          <i data-lucide="shield-alert"></i> Ações de Risco
        </button>
      </div>

      <!-- ── TAB: TELEMETRIA ── -->
      <div class="dev-panel active" id="panel-telemetria">
        
        <!-- KPI Metrics -->
        <div class="dev-kpi-grid" id="telemetry-kpis">
          <div class="dev-kpi-card dev-kpi-blue">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Padeiros Ativos</span>
              <div class="dev-kpi-icon"><i data-lucide="users"></i></div>
            </div>
            <div>
              <div class="dev-kpi-value dev-kpi-loading" id="tel-kpi-active-bakers">&nbsp;</div>
              <div class="dev-kpi-meta" id="tel-kpi-active-bakers-sub">carregando...</div>
            </div>
          </div>
          
          <div class="dev-kpi-card dev-kpi-green">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Taxa de Conclusão</span>
              <div class="dev-kpi-icon"><i data-lucide="check-circle-2"></i></div>
            </div>
            <div>
              <div class="dev-kpi-value dev-kpi-loading" id="tel-kpi-completion-rate">&nbsp;</div>
              <div class="dev-kpi-meta" id="tel-kpi-completion-rate-sub">carregando...</div>
            </div>
          </div>

          <div class="dev-kpi-card dev-kpi-purple">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Duração Média</span>
              <div class="dev-kpi-icon"><i data-lucide="clock"></i></div>
            </div>
            <div>
              <div class="dev-kpi-value dev-kpi-loading" id="tel-kpi-avg-duration">&nbsp;</div>
              <div class="dev-kpi-meta">tempo de atendimento</div>
            </div>
          </div>

          <div class="dev-kpi-card dev-kpi-orange" id="tel-kpi-stuck-card">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Atendimentos Travados</span>
              <div class="dev-kpi-icon"><i data-lucide="alert-triangle"></i></div>
            </div>
            <div>
              <div class="dev-kpi-value dev-kpi-loading" id="tel-kpi-stuck-count">&nbsp;</div>
              <div class="dev-kpi-meta" id="tel-kpi-stuck-sub">precisam de atenção</div>
            </div>
          </div>
        </div>

        <!-- Conversion Funnel Section -->
        <div>
          <div class="dev-section-header">
            <h3 class="dev-section-title">Funil de Conversão do Fluxo</h3>
            <p class="dev-section-subtitle">Acompanhe a evolução das etapas e identifique gargalos operacionais (clique em Diagnosticar para ver motivos)</p>
          </div>
        </div>

        <div class="dev-funnel" id="conversion-funnel-container">
          <div style="text-align:center; padding: 20px; color: var(--text-secondary);">Calculando dados de conversão...</div>
        </div>

        <!-- Active / Stuck Activities Section -->
        <div>
          <div class="dev-section-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <h3 class="dev-section-title">Atendimentos em Andamento / Travados</h3>
              <p class="dev-section-subtitle">Acompanhe as sessões que estão ativas ou que sofreram interrupção</p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="dev-badge dev-badge-neutral" onclick="Dev.loadStats()" style="cursor:pointer; border:none; padding:8px 12px; display:flex; align-items:center; gap:6px;">
                <i data-lucide="refresh-cw" style="width:14px; height:14px;"></i> Atualizar Lista
              </button>
            </div>
          </div>
        </div>

        <div class="dev-card-table">
          <div class="dev-table-wrapper">
            <table class="dev-table">
              <thead>
                <tr>
                  <th>Padeiro</th>
                  <th>Cliente / Estabelecimento</th>
                  <th>Data/Hora de Início</th>
                  <th>Tempo Decorrido</th>
                  <th>Etapa Atual</th>
                  <th>Status do Fluxo</th>
                  <th style="text-align:right;">Ações</th>
                </tr>
              </thead>
              <tbody id="stuck-activities-table-body">
                <tr>
                  <td colspan="7" style="text-align:center; padding:30px; color: var(--text-secondary);">Carregando registros...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ── TAB: MAPA DE CALOR ── -->
      <div class="dev-panel" id="panel-mapacalor">
        <div>
          <div class="dev-section-header">
            <h3 class="dev-section-title">Frequência Semanal de Atividades</h3>
            <p class="dev-section-subtitle">Visualização de intensidade de atendimentos e visitas por padeiro e por dia da semana</p>
          </div>
        </div>

        <div id="heatmap-card-container">
          <div style="text-align:center; padding: 30px; color: var(--text-secondary);">Calculando mapa de calor...</div>
        </div>
      </div>

      <!-- ── TAB: BANCO DE DADOS ── -->
      <div class="dev-panel" id="panel-bd">
        
        <div>
          <div class="dev-section-header">
            <h3 class="dev-section-title">Contadores de Registro</h3>
            <p class="dev-section-subtitle">Total acumulado de registros armazenados nas tabelas de produção</p>
          </div>
        </div>

        <!-- Database counters grid -->
        <div class="dev-kpi-grid" id="dev-kpi-grid">
          <div class="dev-kpi-card dev-kpi-blue">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Metas de Produção</span>
              <div class="dev-kpi-icon"><i data-lucide="target"></i></div>
            </div>
            <div class="dev-kpi-value dev-kpi-loading" id="dev-kpi-metas">&nbsp;</div>
          </div>
          <div class="dev-kpi-card dev-kpi-purple">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Atividades Registradas</span>
              <div class="dev-kpi-icon"><i data-lucide="clipboard-list"></i></div>
            </div>
            <div class="dev-kpi-value dev-kpi-loading" id="dev-kpi-atividades">&nbsp;</div>
          </div>
          <div class="dev-kpi-card dev-kpi-green">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Total de Avaliações</span>
              <div class="dev-kpi-icon"><i data-lucide="star"></i></div>
            </div>
            <div class="dev-kpi-value dev-kpi-loading" id="dev-kpi-avaliacoes">&nbsp;</div>
          </div>
          <div class="dev-kpi-card dev-kpi-orange">
            <div class="dev-kpi-header">
              <span class="dev-kpi-label">Pontos de Rastreamento</span>
              <div class="dev-kpi-icon"><i data-lucide="map-pin"></i></div>
            </div>
            <div class="dev-kpi-value dev-kpi-loading" id="dev-kpi-tracking">&nbsp;</div>
          </div>
        </div>

        <div>
          <div class="dev-section-header">
            <h3 class="dev-section-title">Status Detalhado das Coleções</h3>
            <p class="dev-section-subtitle">Status em tempo real da conexão com as tabelas do MySQL</p>
          </div>
        </div>

        <div class="dev-card-table" style="max-width: 600px;">
          <div class="dev-table-wrapper">
            <table class="dev-table">
              <thead>
                <tr>
                  <th>Tabela</th>
                  <th>Status</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Metas de Produção (metas)</td>
                  <td><span class="dev-badge dev-badge-success"><span style="width:6px;height:6px;background:var(--success);border-radius:50%"></span> Online</span></td>
                  <td style="text-align:right; font-weight:700;" id="dev-st-metas">&mdash;</td>
                </tr>
                <tr>
                  <td>Atividades Registradas (atividades)</td>
                  <td><span class="dev-badge dev-badge-success"><span style="width:6px;height:6px;background:var(--success);border-radius:50%"></span> Online</span></td>
                  <td style="text-align:right; font-weight:700;" id="dev-st-atividades">&mdash;</td>
                </tr>
                <tr>
                  <td>Avaliações de Clientes e Gestores (avaliacoes)</td>
                  <td><span class="dev-badge dev-badge-success"><span style="width:6px;height:6px;background:var(--success);border-radius:50%"></span> Online</span></td>
                  <td style="text-align:right; font-weight:700;" id="dev-st-avaliacoes">&mdash;</td>
                </tr>
                <tr>
                  <td>Trajetos e Localizações (historico_localizacoes)</td>
                  <td><span class="dev-badge dev-badge-success"><span style="width:6px;height:6px;background:var(--success);border-radius:50%"></span> Online</span></td>
                  <td style="text-align:right; font-weight:700;" id="dev-st-tracking">&mdash;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- ── TAB: RISCO ── -->
      <div class="dev-panel" id="panel-risco">
        
        <!-- Risk Warning Banner -->
        <div class="dev-warning-banner">
          <div class="dev-warning-icon">
            <i data-lucide="alert-triangle"></i>
          </div>
          <div class="dev-warning-text">
            <h4>Zona de Risco — Ações Irreversíveis</h4>
            <p>Os comandos abaixo apagam permanentemente registros do banco de dados de produção. Tenha plena certeza das consequências antes de clicar.</p>
          </div>
        </div>

        <div class="dev-danger-grid">
          <!-- Resetar Metas -->
          <div class="dev-danger-card">
            <div class="dev-danger-header">
              <div class="dev-danger-icon"><i data-lucide="target"></i></div>
              <h4 class="dev-danger-title">Excluir Todas as Metas</h4>
            </div>
            <p class="dev-danger-desc">Remove o cadastro completo de metas de volume físico (kg) para todos os colaboradores e períodos. Útil para reimportação anual/mensal.</p>
            <button class="dev-danger-btn" id="btn-reset-metas" onclick="Dev.resetMetas()">
              <i data-lucide="trash-2"></i> Limpar Tabela de Metas
            </button>
          </div>

          <!-- Resetar Atividades -->
          <div class="dev-danger-card">
            <div class="dev-danger-header">
              <div class="dev-danger-icon"><i data-lucide="clipboard-list"></i></div>
              <h4 class="dev-danger-title">Excluir Histórico de Atividades</h4>
            </div>
            <p class="dev-danger-desc">Apaga todos os registros de atendimentos realizados pelos padeiros, incluindo produções, fotos armazenadas, notas de clientes e assinaturas digitais.</p>
            <button class="dev-danger-btn" id="btn-reset-atividades" onclick="Dev.resetAtividades()">
              <i data-lucide="trash-2"></i> Limpar Todas as Atividades
            </button>
          </div>

          <!-- Resetar Avaliações -->
          <div class="dev-danger-card">
            <div class="dev-danger-header">
              <div class="dev-danger-icon"><i data-lucide="star"></i></div>
              <h4 class="dev-danger-title">Limpar Avaliações</h4>
            </div>
            <p class="dev-danger-desc">Remove as fichas de avaliação de critérios de qualidade aplicados pelos gestores nas filiais, bem como as notas dadas pelos clientes aos padeiros.</p>
            <button class="dev-danger-btn" id="btn-reset-avaliacoes" onclick="Dev.resetAvaliacoes()">
              <i data-lucide="trash-2"></i> Excluir Avaliações
            </button>
          </div>

          <!-- Resetar Rastreamento -->
          <div class="dev-danger-card">
            <div class="dev-danger-header">
              <div class="dev-danger-icon"><i data-lucide="map-pin"></i></div>
              <h4 class="dev-danger-title">Resetar Histórico GPS</h4>
            </div>
            <p class="dev-danger-desc">Remove permanentemente todas as coordenadas geográficas capturadas em segundo plano de trajetos, linhas de tempo e localizações em tempo real.</p>
            <button class="dev-danger-btn" id="btn-reset-rastreamento" onclick="Dev.resetRastreamento()">
              <i data-lucide="trash-2"></i> Apagar Trajetos GPS
            </button>
          </div>
        </div>

      </div>

    </div>`;

    Components.renderIcons();
    this.loadStats();
  },

  switchTab(tabId) {
    this._currentTab = tabId;
    
    // Toggle active tab buttons
    document.querySelectorAll('.dev-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === `btn-tab-${tabId}`);
    });

    // Toggle active panels
    document.querySelectorAll('.dev-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabId}`);
    });

    Components.renderIcons();
  },

  toggleAccordion(stepIndex) {
    const el = document.getElementById(`funnel-detail-${stepIndex}`);
    if (el) {
      const isActive = el.classList.contains('active');
      
      // Close all first
      document.querySelectorAll('.dev-funnel-detail').forEach(d => d.classList.remove('active'));
      
      if (!isActive) {
        el.classList.add('active');
      }
    }
  },

  async loadStats() {
    try {
      // Set to loading
      ['dev-kpi-metas','dev-kpi-atividades','dev-kpi-avaliacoes','dev-kpi-tracking'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('dev-kpi-loading')) el.classList.add('dev-kpi-loading');
      });

      const [metas, atividades, avaliacoes, padeiros] = await Promise.all([
        API.get('/api/metas'),
        API.get('/api/atividades'),
        API.get('/api/avaliacoes'),
        API.get('/api/padeiros')
      ]);

      this._activities = Array.isArray(atividades) ? atividades : [];
      this._bakers = Array.isArray(padeiros) ? padeiros : [];

      const metasLen      = Array.isArray(metas)      ? metas.length      : 0;
      const atividadesLen = this._activities.length;
      const avaliacoesLen = Array.isArray(avaliacoes)  ? avaliacoes.length : 0;
      
      // Filter active bakers (exclude deleted ones)
      const totalBakersList = this._bakers.filter(p => !p.deletado && p.ativo && p.role === 'padeiro');
      const totalBakersCount = totalBakersList.length;

      this._stats = { metas: metasLen, atividades: atividadesLen, avaliacoes: avaliacoesLen, tracking: '—' };

      // Update Database counters UI
      this._setKpi('dev-kpi-metas',      metasLen);
      this._setKpi('dev-kpi-atividades', atividadesLen);
      this._setKpi('dev-kpi-avaliacoes', avaliacoesLen);
      this._setKpi('dev-kpi-tracking',   '—');

      this._setStat('dev-st-metas',      metasLen);
      this._setStat('dev-st-atividades', atividadesLen);
      this._setStat('dev-st-avaliacoes', avaliacoesLen);
      this._setStat('dev-st-tracking',   '—');

      // Calculate Telemetry stats
      this.calculateTelemetry(totalBakersCount);

    } catch(e) {
      console.error("Erro ao carregar painel de dev:", e);
      ['dev-kpi-metas','dev-kpi-atividades','dev-kpi-avaliacoes','dev-kpi-tracking',
       'tel-kpi-active-bakers', 'tel-kpi-completion-rate', 'tel-kpi-avg-duration', 'tel-kpi-stuck-count'].forEach(id => {
        const el = document.getElementById(id);
        if(el){ el.classList.remove('dev-kpi-loading'); el.textContent = '!'; el.style.color='#FF3B30'; }
      });
      Components.toast('Erro ao carregar estatísticas: ' + e.message, 'error');
    }
  },

  calculateTelemetry(totalBakersCount) {
    const activities = this._activities;
    
    // Obter data local hoje formatada YYYY-MM-DD
    const localOffset = new Date().getTimezoneOffset() * 60000;
    const todayStr = new Date(Date.now() - localOffset).toISOString().split('T')[0];

    // 1. Padeiros ativos hoje
    const activitiesToday = activities.filter(a => a.data === todayStr);
    const activeBakersTodayIds = [...new Set(activitiesToday.map(a => a.padeiroId))].filter(Boolean);
    const activeBakersToday = activeBakersTodayIds.length;

    // Set Active Bakers KPI
    const bakersKpiEl = document.getElementById('tel-kpi-active-bakers');
    const bakersSubEl = document.getElementById('tel-kpi-active-bakers-sub');
    if (bakersKpiEl) {
      bakersKpiEl.classList.remove('dev-kpi-loading');
      bakersKpiEl.textContent = `${activeBakersToday} / ${totalBakersCount}`;
    }
    if (bakersSubEl) {
      const pctActive = totalBakersCount > 0 ? ((activeBakersToday / totalBakersCount) * 100).toFixed(0) : 0;
      bakersSubEl.textContent = `${pctActive}% de adesão hoje`;
    }

    // 2. Taxa de Conclusão (histórica / total)
    const totalVisits = activities.length;
    const completedVisits = activities.filter(a => a.status === 'finalizada').length;
    const completionRate = totalVisits > 0 ? ((completedVisits / totalVisits) * 100).toFixed(1) : '0';

    const completionKpiEl = document.getElementById('tel-kpi-completion-rate');
    const completionSubEl = document.getElementById('tel-kpi-completion-rate-sub');
    if (completionKpiEl) {
      completionKpiEl.classList.remove('dev-kpi-loading');
      completionKpiEl.textContent = `${completionRate}%`;
    }
    if (completionSubEl) {
      completionSubEl.textContent = `${completedVisits} de ${totalVisits} visitas concluídas`;
    }

    // 3. Duração Média das Visitas Finalizadas
    let totalDurationMs = 0;
    let validDurationsCount = 0;

    activities.filter(a => a.status === 'finalizada').forEach(a => {
      if (a.inicioEm && (a.fimEm || a.terminadoEm || a.atualizadoEm)) {
        const start = new Date(a.inicioEm).getTime();
        const end = new Date(a.fimEm || a.terminadoEm || a.atualizadoEm).getTime();
        const diff = end - start;
        if (diff > 0 && diff < 8 * 60 * 60 * 1000) { // Menor que 8h (descarta outliers/esquecidos)
          totalDurationMs += diff;
          validDurationsCount++;
        }
      }
    });

    const avgDurationKpiEl = document.getElementById('tel-kpi-avg-duration');
    if (avgDurationKpiEl) {
      avgDurationKpiEl.classList.remove('dev-kpi-loading');
      if (validDurationsCount > 0) {
        const avgMins = Math.round(totalDurationMs / (1000 * 60 * validDurationsCount));
        if (avgMins >= 60) {
          const hrs = Math.floor(avgMins / 60);
          const mins = avgMins % 60;
          avgDurationKpiEl.textContent = `${hrs}h ${mins}m`;
        } else {
          avgDurationKpiEl.textContent = `${avgMins} min`;
        }
      } else {
        avgDurationKpiEl.textContent = '—';
      }
    }

    // 4. Atendimentos Travados
    // Condição: status 'em_andamento' e data anterior a hoje OU iniciado há mais de 2 horas hoje.
    const nowMs = Date.now();
    const stuckActivities = activities.filter(a => {
      if (a.status !== 'em_andamento') return false;
      if (a.data !== todayStr) return true; // Dias anteriores
      if (a.inicioEm) {
        const elapsed = nowMs - new Date(a.inicioEm).getTime();
        return elapsed > 2 * 60 * 60 * 1000; // mais de 2 horas hoje
      }
      return false;
    });

    const stuckCountKpiEl = document.getElementById('tel-kpi-stuck-count');
    const stuckSubEl = document.getElementById('tel-kpi-stuck-sub');
    const stuckCardEl = document.getElementById('tel-kpi-stuck-card');
    
    if (stuckCountKpiEl) {
      stuckCountKpiEl.classList.remove('dev-kpi-loading');
      stuckCountKpiEl.textContent = stuckActivities.length;
    }
    if (stuckSubEl) {
      stuckSubEl.textContent = stuckActivities.length === 1 ? '1 caso pendente' : `${stuckActivities.length} casos pendentes`;
    }
    if (stuckCardEl) {
      stuckCardEl.className = `dev-kpi-card ${stuckActivities.length > 0 ? 'dev-kpi-red' : 'dev-kpi-orange'}`;
    }

    // 5. Renderizar o Funil de Conversão
    this.renderFunnel(activities);

    // 6. Renderizar a Tabela de Atividades Ativas / Travadas
    this.renderStuckTable(stuckActivities, activities.filter(a => a.status === 'em_andamento' && !stuckActivities.includes(a)));

    // 7. Renderizar o Mapa de Calor
    this.renderHeatmap(activities, this._bakers);
  },

  renderFunnel(activities) {
    const total = activities.length;
    if (total === 0) {
      const container = document.getElementById('conversion-funnel-container');
      container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Sem dados de fluxos para o período selecionado.</div>`;
      return;
    }

    // Contagem por etapa alcançada:
    // Passo 1: Iniciar (sempre todos os registros de atividade)
    const step1 = total;
    // Passo 2: Produção (lastStep >= 2 ou finalizada)
    const step2 = activities.filter(a => (a.lastStep >= 2) || a.status === 'finalizada').length;
    // Passo 3: Avaliar Cliente (lastStep >= 3 ou finalizada)
    const step3 = activities.filter(a => (a.lastStep >= 3) || a.status === 'finalizada').length;
    // Passo 4: Avaliação (lastStep >= 4 ou finalizada)
    const step4 = activities.filter(a => (a.lastStep >= 4) || a.status === 'finalizada').length;
    // Passo 5: Concluído (status === 'finalizada')
    const step5 = activities.filter(a => a.status === 'finalizada').length;

    // Calcular abandonos / travados exatamente em cada passo (status em_andamento e lastStep igual ao passo)
    const stuckS1 = activities.filter(a => a.status === 'em_andamento' && (!a.lastStep || a.lastStep === 1)).length;
    const stuckS2 = activities.filter(a => a.status === 'em_andamento' && a.lastStep === 2).length;
    const stuckS3 = activities.filter(a => a.status === 'em_andamento' && a.lastStep === 3).length;
    const stuckS4 = activities.filter(a => a.status === 'em_andamento' && a.lastStep === 4).length;

    const stepsData = [
      {
        index: 1,
        title: "1. Iniciar Atendimento",
        count: step1,
        pct: 100,
        stuckCount: stuckS1,
        trouble: "<strong>Prováveis causas de travamento nesta etapa:</strong><br>" +
                 "• Falha de GPS ao capturar coordenadas iniciais para registrar abertura (obrigatório para validar visita).<br>" +
                 "• Perda de internet móvel antes do envio da requisição de abertura.<br>" +
                 "• Permissões de localização do navegador negadas pelo usuário.<br>" +
                 "<em>Recomendação: orientar o padeiro a reativar o GPS do celular, conceder permissão ao app ou reiniciar o navegador.</em>"
      },
      {
        index: 2,
        title: "2. Registro da Produção",
        count: step2,
        pct: total > 0 ? Math.round((step2 / total) * 100) : 0,
        stuckCount: stuckS2,
        trouble: "<strong>Prováveis causas de travamento nesta etapa:</strong><br>" +
                 "• Falha ou demora extrema no upload de fotos pesadas da produção finalizada para o servidor.<br>" +
                 "• Crash do navegador causado por falta de memória RAM ao processar mídias da câmera.<br>" +
                 "• Padeiro esqueceu de adicionar os produtos fabricados e saiu do estabelecimento comercial.<br>" +
                 "<em>Recomendação: orientar a tirar fotos com resolução menor e fechar outros aplicativos em background no celular.</em>"
      },
      {
        index: 3,
        title: "3. Avaliar Cliente (Feedback do Padeiro)",
        count: step3,
        pct: total > 0 ? Math.round((step3 / total) * 100) : 0,
        stuckCount: stuckS3,
        trouble: "<strong>Prováveis causas de travamento nesta etapa:</strong><br>" +
                 "• Dúvidas sobre as notas ou o questionário de conformidade do cliente.<br>" +
                 "• O app foi fechado acidentalmente antes de submeter a nota dada ao cliente.<br>" +
                 "<em>Recomendação: instruir a preencher dados simples e avançar rapidamente.</em>"
      },
      {
        index: 4,
        title: "4. Avaliação e Coleta de Assinatura (Cliente)",
        count: step4,
        pct: total > 0 ? Math.round((step4 / total) * 100) : 0,
        stuckCount: stuckS4,
        trouble: "<strong>Prováveis causas de travamento nesta etapa:</strong><br>" +
                 "• Cliente indisponível ou ocupado demais para fazer a nota e dar a assinatura no celular do padeiro.<br>" +
                 "• O painel digital de assinatura (SignaturePad) travou ou falhou na renderização de tela.<br>" +
                 "• Falha na transmissão de rede móvel (3G/4G) ao sincronizar o arquivo de assinatura base64 (payload grande).<br>" +
                 "<em>Recomendação: sugerir ao padeiro buscar melhor sinal de rede ou aguardar um momento oportuno do cliente.</em>"
      },
      {
        index: 5,
        title: "5. Finalizar Atendimento",
        count: step5,
        pct: total > 0 ? Math.round((step5 / total) * 100) : 0,
        stuckCount: 0,
        trouble: ""
      }
    ];

    const container = document.getElementById('conversion-funnel-container');
    
    let html = ``;
    stepsData.forEach((s, idx) => {
      const isCompleted = s.count > 0;
      const pctLabel = `${s.pct}%`;
      const isDark = s.pct < 20; // Text color accessibility inside bar
      
      const badgeCls = s.stuckCount > 0 ? 'dev-badge-error' : 'dev-badge-neutral';
      const warningHtml = s.stuckCount > 0 
        ? `<button class="dev-badge dev-badge-error" style="border:none; cursor:pointer; margin-left:12px;" onclick="Dev.toggleAccordion(${s.index})">
             <i data-lucide="alert-circle" style="width:12px;height:12px"></i> ${s.stuckCount} travado(s) aqui — Ver Motivos
           </button>`
        : (s.index < 5 ? `<button class="dev-badge dev-badge-neutral" style="border:none; cursor:pointer; margin-left:12px;" onclick="Dev.toggleAccordion(${s.index})">
             <i data-lucide="help-circle" style="width:12px;height:12px"></i> Diagnosticar
           </button>` : '');

      html += `
        <div class="dev-funnel-step ${isCompleted ? 'completed' : ''}">
          <div class="dev-funnel-main">
            <div class="dev-funnel-badge">${s.index}</div>
            <div class="dev-funnel-bar-container">
              <div class="dev-funnel-bar" style="width: ${s.pct}%"></div>
              <div class="dev-funnel-bar-label ${isDark ? 'dark' : ''}">
                <i data-lucide="${this._getStepIcon(s.index)}" style="width:14px; height:14px;"></i>
                <span>${s.title} (${s.count})</span>
              </div>
              <div class="dev-funnel-percent">${pctLabel}</div>
            </div>
            ${warningHtml}
          </div>
          ${s.index < 5 ? `<div class="dev-funnel-detail" id="funnel-detail-${s.index}">${s.trouble}</div>` : ''}
        </div>
      `;

      if (idx < stepsData.length - 1) {
        html += `<div class="dev-funnel-connector"></div>`;
      }
    });

    container.innerHTML = html;
    Components.renderIcons();
  },

  _getStepIcon(step) {
    const icons = {
      1: 'play',
      2: 'box',
      3: 'user-check',
      4: 'file-text',
      5: 'check-circle'
    };
    return icons[step] || 'info';
  },

  _getStepName(step) {
    const names = {
      1: 'Iniciar Atendimento',
      2: 'Registro da Produção',
      3: 'Avaliar Cliente',
      4: 'Avaliação/Assinatura',
      5: 'Finalizado'
    };
    return names[step] || 'Etapa desconhecida';
  },

  renderStuckTable(stuckActivities, inProgressActivities) {
    const tbody = document.getElementById('stuck-activities-table-body');
    if (!tbody) return;

    const all = [...stuckActivities, ...inProgressActivities];
    
    // Sort so stuck ones come first, then oldest start date
    all.sort((a, b) => {
      const isStuckA = stuckActivities.includes(a);
      const isStuckB = stuckActivities.includes(b);
      if (isStuckA && !isStuckB) return -1;
      if (!isStuckA && isStuckB) return 1;
      
      const timeA = a.inicioEm ? new Date(a.inicioEm).getTime() : 0;
      const timeB = b.inicioEm ? new Date(b.inicioEm).getTime() : 0;
      return timeA - timeB;
    });

    if (all.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color: var(--text-secondary);">
            <i data-lucide="sparkles" style="width:24px; height:24px; color:var(--success); margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;"></i>
            Nenhum atendimento em andamento ou travado no momento. Tudo limpo!
          </td>
        </tr>
      `;
      Components.renderIcons();
      return;
    }

    const formatDate = (isoString) => {
      if (!isoString) return '—';
      try {
        const d = new Date(isoString);
        return d.toLocaleDateString('pt-BR') + ' às ' + d.toTimeString().split(' ')[0].slice(0,5);
      } catch(e) { return isoString; }
    };

    const getElapsedTimeText = (isoString) => {
      if (!isoString) return '—';
      const elapsedMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(elapsedMs / (1000 * 60));
      if (mins < 60) return `${mins} min`;
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      if (hrs < 24) return `${hrs}h ${remainingMins}m`;
      const days = Math.floor(hrs / 24);
      const remainingHrs = hrs % 24;
      return `${days}d ${remainingHrs}h`;
    };

    let html = '';
    all.forEach(a => {
      const isStuck = stuckActivities.includes(a);
      const badgeCls = isStuck ? 'dev-badge-error' : 'dev-badge-success';
      const badgeText = isStuck ? '⚠️ Travado / Ocioso' : '⚡ Ativo';
      
      const lastStepVal = parseInt(a.lastStep) || 1;
      const stepName = this._getStepName(lastStepVal);

      html += `
        <tr>
          <td style="font-weight:600; color:var(--text-main);">${a.padeiroNome || 'Desconhecido'}</td>
          <td>${a.clienteNome || 'Cliente não definido'}</td>
          <td>${formatDate(a.inicioEm)}</td>
          <td style="font-weight:600;">${getElapsedTimeText(a.inicioEm)}</td>
          <td>
            <span class="dev-badge dev-badge-neutral">
              <i data-lucide="${this._getStepIcon(lastStepVal)}" style="width:12px;height:12px;"></i>
              ${stepName} (Etapa ${lastStepVal})
            </span>
          </td>
          <td><span class="dev-badge ${badgeCls}">${badgeText}</span></td>
          <td style="text-align:right;">
            <button class="dev-badge dev-badge-info" style="border:none; cursor:pointer; padding: 6px 12px; font-weight:700; transition:var(--transition);" onclick="Dev.showTimelineModal('${a.id}')">
              <i data-lucide="eye" style="width:12px;height:12px;"></i> Timeline
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    Components.renderIcons();
  },

  showTimelineModal(activityId) {
    const a = this._activities.find(x => x.id === activityId);
    if (!a) {
      Components.toast('Registro de atividade não encontrado localmente.', 'error');
      return;
    }

    // Parse timeline string or array
    let list = [];
    if (a.timeline) {
      list = Array.isArray(a.timeline) ? a.timeline : [];
    }

    let timelineHtml = '';
    if (list.length === 0) {
      timelineHtml = `
        <div style="text-align:center; padding:30px; color:var(--text-secondary);">
          <i data-lucide="alert-circle" style="width:36px; height:36px; display:block; margin:0 auto 12px; color:var(--text-muted);"></i>
          Nenhum evento registrado no histórico da linha do tempo deste atendimento.
        </div>
      `;
    } else {
      timelineHtml = `<div class="dev-timeline">`;
      // Sort timeline events chronologically
      const sorted = [...list].sort((x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime());
      
      sorted.forEach((event, idx) => {
        const d = new Date(event.timestamp);
        const timeStr = d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        const dateStr = d.toLocaleDateString('pt-BR');
        
        let locText = 'Sem coordenadas GPS';
        if (event.lat && event.lng) {
          locText = `<a href="https://www.google.com/maps/search/?api=1&query=${event.lat},${event.lng}" target="_blank" class="dev-timeline-link">
            <i data-lucide="map-pin" style="width:12px; height:12px;"></i> Google Maps (${event.lat.toFixed(5)}, ${event.lng.toFixed(5)})
          </a>`;
        }

        const isLast = idx === sorted.length - 1;

        timelineHtml += `
          <div class="dev-timeline-item ${isLast ? 'active' : ''}">
            <div class="dev-timeline-dot"></div>
            <div class="dev-timeline-content">
              <div class="dev-timeline-header">
                <span class="dev-timeline-title">${event.step || 'Ação Registrada'}</span>
                <span class="dev-timeline-time">${dateStr} às ${timeStr}</span>
              </div>
              <div class="dev-timeline-body">
                <div style="margin-top:2px;">${locText}</div>
              </div>
            </div>
          </div>
        `;
      });
      timelineHtml += `</div>`;
    }

    const modalContent = `
      <div style="font-family:var(--font-main);">
        <div style="background:var(--bg-main); border-radius:var(--radius-md); padding:14px; margin-bottom:16px; font-size:13px; color:var(--text-secondary);">
          <p style="margin:0 0 6px 0;"><strong>Padeiro:</strong> ${a.padeiroNome || '—'}</p>
          <p style="margin:0 0 6px 0;"><strong>Cliente:</strong> ${a.clienteNome || '—'}</p>
          <p style="margin:0;"><strong>Abertura:</strong> ${new Date(a.inicioEm).toLocaleString('pt-BR')}</p>
        </div>
        <h4 style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:var(--text-main);">Trilha de Navegação Cronológica:</h4>
        <div style="max-height:350px; overflow-y:auto; padding-right:6px;">
          ${timelineHtml}
        </div>
      </div>
    `;

    const modalFooter = `
      <button class="dev-badge dev-badge-neutral" style="border:none; cursor:pointer; padding:8px 16px; font-weight:700;" onclick="Components.closeModal()">
        Fechar Janela
      </button>
    `;

    Components.showModal('Auditoria do Trajeto (Timeline)', modalContent, modalFooter, 'dev-timeline-modal');
    Components.renderIcons();
  },

  renderHeatmap(activities, bakers) {
    const container = document.getElementById('heatmap-card-container');
    if (!container) return;

    // ── helpers ──────────────────────────────────────────────
    const getStartOfWeek = (d) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(date.setDate(diff));
      start.setHours(0,0,0,0);
      return start;
    };
    const getEndOfWeek = (sow) => {
      const e = new Date(sow);
      e.setDate(e.getDate() + 6);
      e.setHours(23,59,59,999);
      return e;
    };

    const now = new Date();
    const sowCur = getStartOfWeek(now);
    const eowCur = getEndOfWeek(sowCur);
    const sowPrev = new Date(sowCur); sowPrev.setDate(sowPrev.getDate() - 7);
    const eowPrev = getEndOfWeek(sowPrev);

    // Hours 06 → 22  (17 columns)
    const HOUR_START = 6, HOUR_END = 22;
    const HOURS = [];
    for (let h = HOUR_START; h <= HOUR_END; h++) HOURS.push(h);

    // Day labels: index 0 = Monday … 6 = Sunday
    const DAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    // Matrix [dayIdx 0-6][hour]  – global (all bakers)
    const dayHourMatrix = Array.from({length: 7}, () => {
      const o = {}; HOURS.forEach(h => o[h] = 0); return o;
    });

    // Per-baker data
    const activeBakers = bakers.filter(p => !p.deletado && p.ativo && p.role === 'padeiro');
    const bakerMap = {};
    activeBakers.forEach(b => {
      bakerMap[b.id] = { id: b.id, nome: b.nome, filial: b.filial || 'Sem Filial',
        hours: (() => { const o = {}; HOURS.forEach(h => o[h] = 0); return o; })(),
        total: 0 };
    });

    let curWeekCount = 0, prevWeekCount = 0;

    activities.forEach(a => {
      if (!a.inicioEm) return;
      const d   = new Date(a.inicioEm);
      const t   = d.getTime();
      const hr  = d.getHours();

      if (t >= sowPrev.getTime() && t <= eowPrev.getTime()) prevWeekCount++;

      if (t >= sowCur.getTime() && t <= eowCur.getTime()) {
        curWeekCount++;
        if (hr >= HOUR_START && hr <= HOUR_END) {
          // dayIdx: getDay() → 0=Sun,1=Mon…6=Sat  →  we want 0=Mon…6=Sun
          let di = d.getDay() - 1; if (di < 0) di = 6;
          dayHourMatrix[di][hr]++;
        }
        if (a.padeiroId && bakerMap[a.padeiroId] && hr >= HOUR_START && hr <= HOUR_END) {
          bakerMap[a.padeiroId].hours[hr]++;
          bakerMap[a.padeiroId].total++;
        }
      }
    });

    // ── trend ────────────────────────────────────────────────
    let pct = 0, positive = true;
    if (prevWeekCount > 0) {
      pct = Math.abs(((curWeekCount - prevWeekCount) / prevWeekCount) * 100).toFixed(1);
      positive = curWeekCount >= prevWeekCount;
    } else { pct = curWeekCount > 0 ? 100 : 0; positive = true; }
    const trendClass = positive ? 'positive' : 'negative';
    const trendLabel = prevWeekCount > 0 ? `${pct}% ${positive ? '↗' : '↘'}` : (curWeekCount > 0 ? '100% ↗' : '—');

    // ── color scales ─────────────────────────────────────────
    let maxGlobal = 1;
    DAY_LABELS.forEach((_, di) => HOURS.forEach(h => { if (dayHourMatrix[di][h] > maxGlobal) maxGlobal = dayHourMatrix[di][h]; }));

    const colorBlue = (count) => {
      if (count === 0) return {bg:'#F3F4F6', fg:'#D1D5DB'};
      const r = count / maxGlobal;
      if (r <= 0.20) return {bg:'#DBEAFE', fg:'#1E40AF'};
      if (r <= 0.45) return {bg:'#93C5FD', fg:'#1E3A8A'};
      if (r <= 0.75) return {bg:'#3B82F6', fg:'#ffffff'};
      return {bg:'#1D4ED8', fg:'#ffffff'};
    };

    let maxBaker = 1;
    Object.values(bakerMap).forEach(b => HOURS.forEach(h => { if (b.hours[h] > maxBaker) maxBaker = b.hours[h]; }));

    const colorGreen = (count) => {
      if (count === 0) return {bg:'#F3F4F6', fg:'#D1D5DB'};
      const r = count / maxBaker;
      if (r <= 0.25) return {bg:'#D1FAE5', fg:'#065F46'};
      if (r <= 0.55) return {bg:'#6EE7B7', fg:'#064E3B'};
      if (r <= 0.80) return {bg:'#10B981', fg:'#ffffff'};
      return {bg:'#047857', fg:'#ffffff'};
    };

    // ── build HTML helpers ────────────────────────────────────
    const hourHeaderHtml = HOURS.map(h =>
      `<div class="dev-hm-col">${String(h).padStart(2,'0')}h</div>`
    ).join('');

    const makeCell = (count, label, colorFn) => {
      const {bg, fg} = colorFn(count);
      return `<div class="dev-hm-cell" style="background:${bg};">
        <span style="font-size:10px;font-weight:700;color:${fg};pointer-events:none;">${count > 0 ? count : ''}</span>
        <div class="dev-hm-tip">${label}: <strong>${count} ${count===1?'atividade':'atividades'}</strong></div>
      </div>`;
    };

    // Global: day × hour
    const globalRowsHtml = DAY_LABELS.map((dayName, di) => {
      const cells = HOURS.map(h => makeCell(dayHourMatrix[di][h], `${dayName} ${String(h).padStart(2,'0')}h`, colorBlue)).join('');
      return `<div class="dev-hm-row">
        <div class="dev-hm-row-lbl">${dayName}</div>
        <div class="dev-hm-cells">${cells}</div>
      </div>`;
    }).join('');

    // Per baker: baker × hour
    const bakersArr = Object.values(bakerMap).sort((a,b) => b.total - a.total);

    // Group active bakers by filial
    const bakersByFilial = {};
    bakersArr.forEach(b => {
      const f = b.filial || 'Sem Filial';
      if (!bakersByFilial[f]) bakersByFilial[f] = [];
      bakersByFilial[f].push(b);
    });

    const sortedFiliais = Object.keys(bakersByFilial).sort((a, b) => {
      if (a === 'Sem Filial') return 1;
      if (b === 'Sem Filial') return -1;
      return a.localeCompare(b);
    });

    let bakerRowsHtml = '';
    if (sortedFiliais.length === 0) {
      bakerRowsHtml = `<div style="text-align:center;padding:24px;color:var(--text-secondary);">Nenhum padeiro ativo cadastrado.</div>`;
    } else {
      sortedFiliais.forEach(filialName => {
        const filialBakers = bakersByFilial[filialName].sort((a, b) => b.total - a.total);
        
        // Add filial header row
        bakerRowsHtml += `
          <div class="dev-hm-filial-row-hdr" style="font-weight: 700; color: var(--primary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.75px; padding: 6px 12px; background: var(--primary-light); border-left: 4px solid var(--primary); border-radius: 4px; margin-top: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="map-pin" style="width: 13.5px; height: 13.5px;"></i>
            <span>${filialName}</span>
            <span style="font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: none; letter-spacing: 0; margin-left: auto;">
              ${filialBakers.length} ${filialBakers.length === 1 ? 'padeiro' : 'padeiros'}
            </span>
          </div>
        `;
        
        // Add baker rows
        filialBakers.forEach(b => {
          const cells = HOURS.map(h => makeCell(b.hours[h], `${b.nome} ${String(h).padStart(2,'0')}h`, colorGreen)).join('');
          bakerRowsHtml += `
            <div class="dev-hm-row">
              <div class="dev-hm-row-lbl" title="${b.nome}">${b.nome}</div>
              <div class="dev-hm-cells">${cells}</div>
            </div>
          `;
        });
      });
    }

    const startStr = sowCur.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const endStr   = eowCur.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});

    // ── Render ────────────────────────────────────────────────
    container.innerHTML = `
      <style>
        .dev-hm-wrap{display:flex;flex-direction:column;gap:20px;}
        .dev-hm-card{background:var(--bg-card);border-radius:var(--radius-lg);border:1px solid var(--glass-border);box-shadow:var(--shadow-sm);padding:24px;display:flex;flex-direction:column;gap:18px;}
        .dev-hm-hdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;}
        .dev-hm-title{font-size:13px;font-weight:500;color:var(--text-secondary);}
        .dev-hm-stat{font-size:26px;font-weight:800;color:var(--text-main);letter-spacing:-0.5px;display:flex;align-items:center;gap:10px;margin:4px 0;}
        .dev-hm-period{font-size:12px;color:var(--text-muted);}
        .dev-hm-legend{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--text-muted);flex-wrap:wrap;}
        .dev-hm-swatch{width:22px;height:10px;border-radius:2px;}
        .dev-hm-scroll{overflow-x:auto;padding-bottom:6px;}
        .dev-hm-grid{display:flex;flex-direction:column;gap:5px;min-width:max-content;}
        .dev-hm-hour-hdr{display:flex;padding-left:130px;gap:4px;margin-bottom:4px;}
        .dev-hm-col{width:36px;text-align:center;font-size:10px;font-weight:600;color:var(--text-muted);}
        .dev-hm-row{display:flex;align-items:center;gap:4px;}
        .dev-hm-row-lbl{width:126px;font-size:12px;font-weight:600;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;padding-right:8px;flex-shrink:0;}
        .dev-hm-cells{display:flex;gap:4px;}
        .dev-hm-cell{width:36px;height:28px;border-radius:4px;cursor:pointer;transition:all 0.15s ease;position:relative;display:flex;align-items:center;justify-content:center;}
        .dev-hm-cell:hover{transform:scale(1.15);box-shadow:0 0 0 2.5px var(--primary),0 4px 12px rgba(0,0,0,0.12);z-index:30;}
        .dev-hm-tip{position:absolute;bottom:130%;left:50%;transform:translateX(-50%) translateY(4px);background:#1F2937;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;white-space:nowrap;pointer-events:none;opacity:0;transition:all 0.15s ease;z-index:9999;box-shadow:0 4px 10px rgba(0,0,0,0.2);}
        .dev-hm-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border-width:5px;border-style:solid;border-color:#1F2937 transparent transparent transparent;}
        .dev-hm-cell:hover .dev-hm-tip{opacity:1;transform:translateX(-50%) translateY(0);}
        .dev-hm-section-h{font-size:14px;font-weight:700;color:var(--text-main);}
        .dev-hm-section-sub{font-size:12px;color:var(--text-secondary);}
      </style>

      <div class="dev-hm-wrap fade-in">

        <!-- CARD 1: Visão Geral – Dia × Hora -->
        <div class="dev-hm-card">
          <div class="dev-hm-hdr">
            <div>
              <div class="dev-hm-title">Frequência de Atendimentos — Semana Atual</div>
              <div class="dev-hm-stat">
                ${curWeekCount} Atividades
                <span class="dev-heatmap-trend ${trendClass}" style="font-size:13px;">${trendLabel}</span>
              </div>
              <div class="dev-hm-period">Semana <strong>${startStr}</strong> a <strong>${endStr}</strong> · vs semana anterior</div>
            </div>
            <div class="dev-hm-legend">
              <span>Menos</span>
              <div class="dev-hm-swatch" style="background:#F3F4F6;border:1px solid #E5E7EB;"></div>
              <div class="dev-hm-swatch" style="background:#DBEAFE;"></div>
              <div class="dev-hm-swatch" style="background:#93C5FD;"></div>
              <div class="dev-hm-swatch" style="background:#3B82F6;"></div>
              <div class="dev-hm-swatch" style="background:#1D4ED8;"></div>
              <span>Mais</span>
            </div>
          </div>
          <div class="dev-hm-scroll">
            <div class="dev-hm-grid">
              <div class="dev-hm-hour-hdr">${hourHeaderHtml}</div>
              ${globalRowsHtml}
            </div>
          </div>
        </div>

        <!-- CARD 2: Por Padeiro × Hora -->
        <div class="dev-hm-card">
          <div class="dev-hm-hdr">
            <div>
              <div class="dev-hm-section-h">Distribuição por Padeiro e Horário</div>
              <div class="dev-hm-section-sub">Cada padeiro, atividades por faixa de hora — semana atual</div>
            </div>
            <div class="dev-hm-legend">
              <span>Menos</span>
              <div class="dev-hm-swatch" style="background:#F3F4F6;border:1px solid #E5E7EB;"></div>
              <div class="dev-hm-swatch" style="background:#D1FAE5;"></div>
              <div class="dev-hm-swatch" style="background:#6EE7B7;"></div>
              <div class="dev-hm-swatch" style="background:#10B981;"></div>
              <div class="dev-hm-swatch" style="background:#047857;"></div>
              <span>Mais</span>
            </div>
          </div>
          <div class="dev-hm-scroll">
            <div class="dev-hm-grid">
              <div class="dev-hm-hour-hdr">${hourHeaderHtml}</div>
              ${bakerRowsHtml}
            </div>
          </div>
        </div>

      </div>
    `;

    Components.renderIcons();
  },

  _setKpi(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('dev-kpi-loading');
    el.textContent = value;
  },

  _setStat(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('loading');
    el.style.color = '';
    el.textContent = value;
  },

  _setBtnLoading(id, isLoading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('loading', isLoading);
    const icon = btn.querySelector('i');
    if (icon) icon.setAttribute('data-lucide', isLoading ? 'loader-2' : 'trash-2');
    Components.renderIcons();
  },

  async resetMetas() {
    if (!confirm('⚠️ Deseja realmente apagar TODAS as metas?\nEsta ação é irreversível.')) return;
    this._setBtnLoading('btn-reset-metas', true);
    try {
      await API.delete('/api/metas/reset/all');
      Components.toast('✓ Metas resetadas com sucesso!', 'success');
      await this.loadStats();
    } catch(e) {
      Components.toast(e.message || 'Erro ao resetar metas', 'error');
    } finally {
      this._setBtnLoading('btn-reset-metas', false);
    }
  },

  async resetAtividades() {
    if (!confirm('⚠️ Deseja realmente apagar TODAS as atividades?\nIsso removerá todo o histórico de produção.')) return;
    this._setBtnLoading('btn-reset-atividades', true);
    try {
      await API.delete('/api/atividades/reset/all');
      Components.toast('✓ Atividades resetadas com sucesso!', 'success');
      await this.loadStats();
    } catch(e) {
      Components.toast(e.message || 'Erro ao resetar atividades', 'error');
    } finally {
      this._setBtnLoading('btn-reset-atividades', false);
    }
  },

  async resetAvaliacoes() {
    if (!confirm('⚠️ Deseja realmente apagar TODAS as avaliações?')) return;
    this._setBtnLoading('btn-reset-avaliacoes', true);
    try {
      await API.delete('/api/avaliacoes/reset/all');
      Components.toast('✓ Avaliações resetadas com sucesso!', 'success');
      await this.loadStats();
    } catch(e) {
      Components.toast(e.message || 'Erro ao resetar avaliações', 'error');
    } finally {
      this._setBtnLoading('btn-reset-avaliacoes', false);
    }
  },

  async resetRastreamento() {
    if (!confirm('⚠️ Deseja realmente apagar TODO o histórico de rastreamento?')) return;
    if (!confirm('🚨 CONFIRMAÇÃO FINAL: Esta ação apagará todas as coordenadas e trajetos permanentemente.\n\nClique em OK para confirmar.')) return;
    this._setBtnLoading('btn-reset-rastreamento', true);
    try {
      await API.delete('/api/tracking/reset/all');
      Components.toast('✓ Rastreamento resetado com sucesso!', 'success');
      await this.loadStats();
    } catch(e) {
      Components.toast(e.message || 'Erro ao resetar rastreamento', 'error');
    } finally {
      this._setBtnLoading('btn-reset-rastreamento', false);
    }
  }
};
