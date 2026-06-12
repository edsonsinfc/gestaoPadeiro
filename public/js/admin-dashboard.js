/**
 * Admin Dashboard - KPIs, Charts, New Sections
 * BRAGO Sistema Padeiro
 */

const AdminDashboard = {
  searchTerm: '',

  async render() {
    // Listener para busca global (mobile iOS)
    if (!this._searchListenerAdded) {
      document.addEventListener('app-search', (e) => {
        if (App.currentRoute === 'admin-dashboard') {
          this.searchTerm = e.detail.toLowerCase();
          this.render();
        }
      });
      this._searchListenerAdded = true;
    }

    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    try {
      let stats = await API.get('/api/stats');
      
      // Sanitização de segurança no frontend
      if (stats.mediaAvaliacaoCliente > 5) {
        stats.mediaAvaliacaoCliente = 0; // Ou recalcular se necessário, mas 0 é mais seguro que um valor gigante
      }
      if (stats.mediaAvaliacaoCliente) {
        stats.mediaAvaliacaoCliente = Math.round(parseFloat(stats.mediaAvaliacaoCliente) * 10) / 10;
      }

      const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      // Filtragem local baseada na busca
      if (this.searchTerm) {
        stats = {
          ...stats,
          top10Pads: (stats.top10Pads || []).filter(p => p && p.nome && p.nome.toLowerCase().includes(this.searchTerm)),
          top3Pads: (stats.top3Pads || []).filter(p => p && p.nome && p.nome.toLowerCase().includes(this.searchTerm)),
          rankingClientes: (stats.rankingClientes || []).filter(c => c && (c.nomeFantasia || c.nome) && ((c.nomeFantasia || c.nome) + (c.bairro ? ' - ' + c.bairro : '')).toLowerCase().includes(this.searchTerm)),
          pontoCritico: (stats.pontoCritico || []).filter(p => p && p.nome && p.nome.toLowerCase().includes(this.searchTerm)),
          produtosMaisUsados: (stats.produtosMaisUsados || []).filter(p => p && p.produtoNome && p.produtoNome.toLowerCase().includes(this.searchTerm))
        };
      }

      container.innerHTML = `
      <style>
        #admin-v2-container * { box-sizing: border-box; }
        .admin-v2-container { 
          display: flex; flex-direction: column; gap: 24px; 
          padding-bottom: 40px; width: 100%; max-width: 100%; overflow-x: hidden;
        }
        .kpi-grid-v2 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 8px; }
        .kpi-card-v2 { 
          background: #FFFFFF; border-radius: 20px; padding: 20px; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; 
          flex-direction: column; gap: 16px; transition: all 0.2s ease;
          border: none;
        }
        .kpi-card-v2:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .kpi-icon-box { 
          width: 44px; height: 44px; border-radius: 12px; 
          display: flex; align-items: center; justify-content: center; 
        }
        .kpi-icon-box i { width: 22px; height: 22px; }
        .kpi-value-v2 { font-size: 32px; font-weight: 700; color: #1C1C1E; line-height: 1; letter-spacing: -1px; margin-bottom: 4px; }
        .kpi-label-v2 { font-size: 13px; font-weight: 500; color: #8E8E93; }
        
        /* Accent Colors */
        .kpi-blue .kpi-icon-box { background: rgba(28, 126, 242, 0.12); color: #1C7EF2; }
        .kpi-purple .kpi-icon-box { background: rgba(175, 82, 222, 0.12); color: #AF52DE; }
        .kpi-green .kpi-icon-box { background: rgba(52, 199, 89, 0.12); color: #34C759; }
        .kpi-orange .kpi-icon-box { background: rgba(255, 149, 0, 0.12); color: #FF9500; }
        .kpi-red .kpi-icon-box { background: rgba(255, 59, 48, 0.12); color: #FF3B30; }
        .metric-v2-divider { width: 1px; height: 40px; background: #D1D1D6; }
        
        .dashboard-grid-2-v2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .ranking-list-v2 { display: flex; flex-direction: column; gap: 0; }
        .ranking-item-v2 { 
          display: flex; align-items: center; justify-content: space-between; 
          padding: 16px 0; border-bottom: 1px solid #F2F2F7; 
        }
        .ranking-item-v2:last-child { border-bottom: none; }
        .ranking-pos-v2 { font-size: 17px; font-weight: 800; color: #1C1C1E; width: 32px; }
        .ranking-info-v2 { flex: 1; margin-left: 12px; display: flex; align-items: center; gap: 12px; }
        .ranking-name-v2 { font-size: 15px; font-weight: 600; color: #1C1C1E; }
        .ranking-role-v2 { font-size: 12px; color: #8E8E93; }
        .ranking-data-v2 { text-align: right; }
        .ranking-kg-v2 { font-size: 15px; font-weight: 700; color: #1C1C1E; }
        .ranking-liters-v2 { font-size: 12px; font-weight: 700; color: #AF52DE; }
        
        /* Worst accent */
        .worst-item-v2 .ranking-pos-v2 { color: #FF3B30; }
        .worst-item-v2 .ranking-kg-v2 { color: #FF3B30; }
        
        .client-list-v2 { display: flex; flex-direction: column; gap: 0; }
        .client-item-v2 { 
          display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 100px; 
          align-items: center; padding: 18px 0; border-bottom: 1px solid #F2F2F7; 
        }
        .client-item-v2:last-child { border-bottom: none; }
        .client-item-v2.desktop-only { display: grid; }
        .client-item-v2.mobile-only { display: none !important; }
        .client-header-v2 { 
          display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 100px; 
          padding: 12px 0; border-bottom: 1px solid #D1D1D6;
          font-size: 12px; font-weight: 600; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .client-pos-v2 { font-size: 16px; font-weight: 800; color: #8E8E93; }
        .client-pos-v2.top { color: #1C7EF2; }
        .client-name-v2 { font-size: 15px; font-weight: 600; color: #1C1C1E; }
        .client-data-v2 { font-size: 14px; color: #1C1C1E; font-weight: 500; }
        .client-kg-v2 { color: #1C7EF2; font-weight: 700; }
        
        .donut-legend-v2 { 
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; 
        }
        .donut-legend-item-v2 { 
          display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1C1C1E; font-weight: 500;
        }
        .donut-dot-v2 { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .donut-pct-v2 { color: #8E8E93; font-weight: 400; margin-left: auto; font-variant-numeric: tabular-nums; }

        @media (max-width: 768px) {
          .admin-v2-container {
            padding-bottom: 90px !important;
          }
        }

        @media (max-width: 1024px) { .kpi-grid-v2 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 850px) { .dashboard-grid-2-v2 { grid-template-columns: 1fr; } }
        
        /* Mobile Fixes (iPhone/Compact) */
        @media (max-width: 600px) {
          .client-item-v2.desktop-only { display: none !important; }
          .client-item-v2.mobile-only { display: grid !important; }
          .client-header-v2 { display: none; }
          .client-item-v2 {
            grid-template-columns: 32px 1fr auto;
            gap: 12px;
            padding: 14px 0;
          }
          .client-pos-v2 { font-size: 15px; }
          .client-data-v2 { font-size: 12px; color: #8E8E93; }
          .client-kg-v2 { font-size: 12px; }
          .client-status-v2 { margin-top: 4px; }
          .donut-legend-v2 { grid-template-columns: 1fr; }
          .kpi-grid-v2 { grid-template-columns: 1fr 1fr; gap: 12px; }
          .kpi-card-v2 { padding: 16px; gap: 10px; }
          .kpi-value-v2 { font-size: 24px; }
          .card-v2 { padding: 16px; }
          .chart-container { height: 180px !important; }
          .metrics-row-v2 { 
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px 8px;
            padding: 16px;
          }
          .metric-v2-divider { display: none; }
          .metric-v2-value { font-size: 22px !important; }
          .metric-v2-unit { font-size: 12px !important; }
          .metric-v2-label { font-size: 11px !important; }
          .metric-v2-avg-val { font-size: 15px !important; }
          .metric-v2-avg-unit { font-size: 9px !important; }
          .metric-v2-avg-container { gap: 4px; height: auto; }
        }
        
        /* Card V2 Base */
        .card-v2 { 
          background: #FFFFFF; border-radius: 20px; padding: 24px; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: none; margin-bottom: 0;
          width: 100%; max-width: 100%; overflow: hidden;
        }
        .card-v2-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .card-v2-title { font-size: 17px; font-weight: 700; color: #1C1C1E; display: flex; align-items: center; gap: 10px; }
        
        .donut-legend-item-v2 span {
          flex: 1;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        
        .badge-pill-v2 { 
          background: rgba(28, 126, 242, 0.1); color: #1C7EF2; 
          padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700;
        }
        .metrics-row-v2 { 
          display: flex; align-items: center; justify-content: space-around; 
          margin-bottom: 32px; padding: 24px 0; background: #F2F2F7; border-radius: 20px; 
        }
        .metric-v2 { text-align: center; flex: 1; }
        .metric-v2-value { font-size: 32px; font-weight: 800; color: #1C1C1E; letter-spacing: -1px; line-height: 1.1; }
        .metric-v2-unit { font-size: 16px; font-weight: 600; color: #8E8E93; }
        .metric-v2-label { font-size: 13px; font-weight: 500; color: #8E8E93; margin-top: 4px; }
        .metric-v2-divider { width: 1px; height: 40px; background: #D1D1D6; }
        .metric-v2-avg-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 35px;
        }
        .metric-v2-avg-val {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .metric-v2-avg-val.kg-color { color: #1C7EF2; }
        .metric-v2-avg-val.liters-color { color: #AF52DE; }
        .metric-v2-avg-unit {
          font-size: 11px;
          font-weight: 600;
          color: #8E8E93;
          margin-left: 2px;
        }
        .metric-v2-avg-sep {
          color: #D1D1D6;
          font-size: 14px;
          font-weight: 300;
        }
      </style>

      <div class="admin-v2-container fade-in">

        <!-- ==========================================
             SEÇÃO DESKTOP: REDESIGN PREMIUM MOCKUP
             ========================================== -->
        <div class="hig-desktop-only db-desktop-wrapper">
          
          <!-- Header -->
          <div class="db-header">
            <div class="db-title-group">
              <h1 class="db-title">Dashboard</h1>
              <p class="db-subtitle">Uma visão rápida das tarefas e atualizações da equipe.</p>
            </div>
            <div class="db-header-actions">
              <button class="db-btn-secondary" onclick="App.navigate('relatorios')">Relatórios</button>
              <button class="db-btn-primary" onclick="Cronograma.openTaskForm()">+ Nova Tarefa</button>
            </div>
          </div>

          <!-- Row 1: KPI Grid -->
          <div class="db-kpi-grid">
            <!-- Card 1: Blue (Tasks Completed) -->
            <div class="db-kpi-card blue">
              <div class="db-kpi-top">
                <span class="db-kpi-label text-white-50">Padeiros Ativos</span>
                <div class="db-kpi-arrow-circle"><i data-lucide="arrow-up-right"></i></div>
              </div>
              <span class="db-kpi-val text-white">${stats.totalPadeiros}</span>
              <span class="db-kpi-desc text-white-50">Padeiros operando no sistema</span>
            </div>

            <!-- Card 2: White (Tasks In Progress) -->
            <div class="db-kpi-card white">
              <div class="db-kpi-top">
                <span class="db-kpi-label">Produtos Cadastrados</span>
                <div class="db-kpi-arrow-circle"><i data-lucide="arrow-up-right"></i></div>
              </div>
              <span class="db-kpi-val">${stats.totalProdutos}</span>
              <span class="db-kpi-desc">Catálogo de produtos</span>
            </div>

            <!-- Card 3: White (Pending Reviews) -->
            <div class="db-kpi-card white">
              <div class="db-kpi-top">
                <span class="db-kpi-label">Clientes Ativos</span>
                <div class="db-kpi-arrow-circle"><i data-lucide="arrow-up-right"></i></div>
              </div>
              <span class="db-kpi-val">${stats.totalClientes}</span>
              <span class="db-kpi-desc">Total de clientes registrados</span>
            </div>

            <!-- Card 4: White (Overdue Tasks) -->
            <div class="db-kpi-card white">
              <div class="db-kpi-top">
                <span class="db-kpi-label">Média Avaliações</span>
                <div class="db-kpi-arrow-circle"><i data-lucide="arrow-up-right"></i></div>
              </div>
              <span class="db-kpi-val">${stats.mediaAvaliacaoCliente || '0.0'}</span>
              <span class="db-kpi-desc">Satisfação média</span>
            </div>
          </div>

          <!-- Row 2: Bento Grid Layout -->
          <div class="db-main-grid">
            
            <!-- Column 1: Produção Mensal & Melhores Padeiros -->
            <div class="db-col col-main" style="grid-column: span 1;">
              
              <!-- Card: Produção Mensal (Vertical Chart) -->
              <div class="db-card card-chart">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title">Produção Mensal</span>
                    <span class="db-card-subtitle">Totais e médias de fabricação</span>
                  </div>
                  <div class="db-chart-legend">
                    <div class="db-legend-item"><span class="db-legend-dot kg"></span> kg</div>
                    <div class="db-legend-item"><span class="db-legend-dot litros"></span> L</div>
                  </div>
                </div>
                <div class="db-chart-canvas-wrap">
                  <canvas id="producaoChartDesktopNew"></canvas>
                </div>
              </div>

              <!-- Card: Melhores Padeiros (Members List) -->
              <div class="db-card card-members">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title">Melhores Padeiros</span>
                    <span class="db-card-subtitle">Top produtores do mês</span>
                  </div>
                  <button class="db-card-btn-action" onclick="App.navigate('gestao')">+ Ver Todos</button>
                </div>
                <div class="db-members-list">
                  ${(stats.top10Pads || stats.top3Pads || []).slice(0, 3).map((p, i) => {
                    return `
                    <div class="db-member-item">
                      <div class="db-member-left">
                        ${Components.avatar(p.nome, 'avatar-sm')}
                        <div class="db-member-info">
                          <span class="db-member-name">${p.nome}</span>
                          <span class="db-member-role">${p.cargo} • ${p.totalAtividades} ativ.</span>
                        </div>
                      </div>
                      <div class="db-member-right">
                        <span class="db-member-metric">${p.totalKg.toFixed(1)} kg</span>
                        <span class="db-status-badge ${i === 0 ? 'completed' : i === 1 ? 'in-progress' : 'pending'}">
                          ${i === 0 ? 'Top 1' : i === 1 ? 'Top 2' : 'Top 3'}
                        </span>
                      </div>
                    </div>`;
                  }).join('') || '<div class="db-empty">Sem dados de produção</div>'}
                </div>
              </div>

              <!-- Card: Pontos Críticos (Worst Members List) -->
              <div class="db-card card-members worst-members" style="margin-top: 0;">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title text-red">Pontos Críticos</span>
                    <span class="db-card-subtitle">Menores notas de avaliação</span>
                  </div>
                  <button class="db-card-btn-action" onclick="App.navigate('avaliacoes')">+ Ver Todos</button>
                </div>
                <div class="db-members-list">
                  ${(stats.pontoCritico || []).slice(0, 3).map((p, i) => {
                    return `
                    <div class="db-member-item">
                      <div class="db-member-left">
                        ${Components.avatar(p.nome, 'avatar-sm')}
                        <div class="db-member-info">
                          <span class="db-member-name">${p.nome}</span>
                          <span class="db-member-role">${p.cargo} • ${p.totalAvals} aval.</span>
                        </div>
                      </div>
                      <div class="db-member-right">
                        <span class="db-member-metric text-red">${p.media.toFixed(1)} ★</span>
                        <span class="db-status-badge worst">
                          ${i === 0 ? 'Mín 1' : i === 1 ? 'Mín 2' : 'Mín 3'}
                        </span>
                      </div>
                    </div>`;
                  }).join('') || `<div class="db-empty">
                    <i data-lucide="check-circle-2" style="color: #34c759; width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"></i>
                    <span style="color: #34c759; font-weight: 600;">Tudo certo!</span>
                  </div>`}
                </div>
              </div>

              <!-- Card: Padeiros Pendentes Hoje (Inativos) -->
              <div class="db-card card-members pending-members" style="margin-top: 24px; border: 1px solid #FFCC00; background: #FFFDF0;">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title" style="color: #d97706;">Pendentes Hoje</span>
                    <span class="db-card-subtitle">Sem atividade hoje</span>
                  </div>
                  ${(stats.padeirosInativos || []).length > 0 ? `<button class="db-card-btn-action" style="background: #25D366; color: white; padding: 4px 8px; border-radius: 6px; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px;" onclick="PushService.notifyAllInactive()">
                    <i data-lucide="bell-ring" style="width: 14px; height: 14px;"></i> Alerta Push
                  </button>` : ''}
                </div>
                <div class="db-members-list" style="max-height: 200px; overflow-y: auto;">
                  ${(stats.padeirosInativos || []).length > 0 ? (stats.padeirosInativos || []).map((p, i) => {
                    const waLink = p.telefone ? `https://wa.me/55${p.telefone.replace(/\\D/g, '')}?text=${encodeURIComponent('Olá ' + p.nome + ', não se esqueça de registrar suas produções de hoje no sistema! Qualquer dúvida me avise.')}` : '#';
                    return `
                    <div class="db-member-item">
                      <div class="db-member-left">
                        ${Components.avatar(p.nome, 'avatar-sm')}
                        <div class="db-member-info">
                          <span class="db-member-name">${p.nome}</span>
                          <span class="db-member-role">${p.filial || 'Sem Filial'}</span>
                        </div>
                      </div>
                      <div class="db-member-right">
                        ${p.telefone ? `
                          <a href="${waLink}" target="_blank" style="background: #25D366; color: white; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none;" title="Cobrar via WhatsApp">
                            <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i>
                          </a>
                        ` : `
                          <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Sem cel.</span>
                        `}
                      </div>
                    </div>`;
                  }).join('') : `
                  <div class="db-empty">
                    <i data-lucide="check-circle-2" style="color: #34c759; width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"></i>
                    <span style="color: #34c759; font-weight: 600;">Todos os padeiros ativos!</span>
                  </div>
                  `}
                </div>
              </div>

            </div>

            <!-- Column 2: Atendimento de Clientes & Distribuição de Cargo -->
            <div class="db-col col-sub" style="grid-column: span 1;">

              <!-- Card: Atendimento de Clientes (Meeting card style) -->
              <div class="db-card card-meeting">
                <span class="db-card-label-small">Desempenho</span>
                <h4 class="db-meeting-title">Clientes Atendidos</h4>
                <span class="db-meeting-subtitle">Neste mês</span>
                
                <div class="db-meeting-stats">
                  <span class="db-meeting-val">${stats.totalClientesAtendidos || 0}</span>
                  <span class="db-meeting-unit">Clientes</span>
                </div>

                <button class="db-btn-meeting" onclick="App.navigate('gestao')">
                  <i data-lucide="users" style="width: 16px; height: 16px;"></i> Ver Clientes
                </button>
              </div>

              <!-- Card: Distribuição por Cargo (Doughnut Gauge) -->
              <div class="db-card card-gauge">
                <span class="db-card-label-small">Distribuição por Cargo</span>
                <div class="db-gauge-chart-wrap">
                  <canvas id="cargoChartDesktopNew"></canvas>
                  <div class="db-gauge-center">
                    <span class="db-gauge-val">${stats.totalPadeiros}</span>
                    <span class="db-gauge-lbl">Padeiros</span>
                  </div>
                </div>
                <div id="cargoLegendDesktopNew" class="db-gauge-legend"></div>
              </div>

            </div>

            <!-- Column 3: Clientes Premium & Time Tracker -->
            <div class="db-col col-sub" style="grid-column: span 1;">

              <!-- Card: Clientes Premium (Tasks style) -->
              <div class="db-card card-tasks">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title">Clientes Premium</span>
                    <span class="db-card-subtitle">Ranking por volume (Kg)</span>
                  </div>
                  <button class="db-card-badge-btn" onclick="App.navigate('gestao')">+ Ver</button>
                </div>
                <div class="db-tasks-list">
                  ${(stats.rankingClientes || []).slice(0, 4).map((c, i) => {
                    const cleanName = (c.nomeFantasia || c.nome).split(' - ')[0];
                    return `
                    <div class="db-task-item">
                      <div class="db-task-left">
                        <div class="db-task-icon-circle ${i === 0 ? 'blue' : i === 1 ? 'green' : i === 2 ? 'orange' : 'purple'}">
                          <span>${i + 1}</span>
                        </div>
                        <div class="db-task-info">
                          <span class="db-task-name" title="${c.nomeFantasia || c.nome}">${cleanName}</span>
                          <span class="db-task-due">${c.totalAtendimentos} visitas</span>
                        </div>
                      </div>
                      <div class="db-task-right">
                        <span class="db-task-val">${c.totalKg.toFixed(0)} kg</span>
                      </div>
                    </div>`;
                  }).join('') || '<div class="db-empty">Nenhum cliente atendido</div>'}
                </div>
              </div>

              <!-- Card: Padeiro Destaque -->
              <div class="db-card card-destaque" style="background: linear-gradient(135deg, #1E4BFF 0%, #5E82FF 100%); color: #fff; padding: 24px; border-radius: 16px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; text-align: center;">
                <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                
                <span style="align-self: flex-start; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 99px; margin-bottom: 16px;">Padeiro Destaque</span>
                
                ${stats.top10Pads && stats.top10Pads.length > 0 ? `
                  <div style="width: 80px; height: 80px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: #1E4BFF; margin-bottom: 12px; border: 4px solid rgba(255,255,255,0.3); box-shadow: 0 8px 16px rgba(0,0,0,0.1); z-index: 1;">
                    ${stats.top10Pads[0].nome.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0; color: #fff; z-index: 1;">${stats.top10Pads[0].nome}</h1>
                  <h2 style="font-size: 14px; font-weight: 500; margin: 0 0 20px 0; color: rgba(255,255,255,0.8); z-index: 1;">${stats.top10Pads[0].cargo || 'Padeiro'}</h2>
                  
                  <div style="display: flex; gap: 16px; width: 100%; justify-content: center; z-index: 1;">
                    <div style="background: rgba(0,0,0,0.15); padding: 10px 16px; border-radius: 12px; flex: 1;">
                      <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; margin-bottom: 4px;">Produção</div>
                      <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: #fff;">${stats.top10Pads[0].totalKg.toFixed(0)} <span style="font-size: 12px; font-weight: 500;">kg</span></h3>
                    </div>
                    <div style="background: rgba(0,0,0,0.15); padding: 10px 16px; border-radius: 12px; flex: 1;">
                      <div style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.7); text-transform: uppercase; margin-bottom: 4px;">Avaliação</div>
                      <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: #fff;">${stats.top10Pads[0].notaMedia !== null ? stats.top10Pads[0].notaMedia.toFixed(1) : '-'} <span style="font-size: 12px; font-weight: 500;">★</span></h3>
                    </div>
                  </div>
                ` : `
                  <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); font-size: 14px; z-index: 1;">
                    Nenhum dado no mês
                  </div>
                `}
              </div>

              <!-- Card: Produtos mais usados (Tasks style) -->
              <div class="db-card card-tasks">
                <div class="db-card-header">
                  <div class="db-card-title-group">
                    <span class="db-card-title">Produtos mais usados</span>
                    <span class="db-card-subtitle">Ranking por volume produzido</span>
                  </div>
                  <button class="db-card-badge-btn" onclick="App.navigate('gestao')">+ Ver</button>
                </div>
                <div class="db-tasks-list">
                  ${(stats.produtosMaisUsados || []).slice(0, 4).map((p, i) => {
                    const parts = p.produtoNome.split(' - ');
                    const cleanName = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];
                    return `
                    <div class="db-task-item">
                      <div class="db-task-left">
                        <div class="db-task-icon-circle ${i === 0 ? 'blue' : i === 1 ? 'green' : i === 2 ? 'orange' : 'purple'}">
                          <span>${i + 1}</span>
                        </div>
                        <div class="db-task-info">
                          <span class="db-task-name" title="${p.produtoNome}">${cleanName}</span>
                          <span class="db-task-due">${p.totalAtendimentos} produções</span>
                        </div>
                      </div>
                      <div class="db-task-right">
                        <span class="db-task-val">${p.totalQtd % 1 === 0 ? p.totalQtd.toFixed(0) : p.totalQtd.toFixed(1)} ${p.unidade.toLowerCase()}</span>
                      </div>
                    </div>`;
                  }).join('') || '<div class="db-empty">Nenhum produto registrado</div>'}
                </div>
              </div>

            </div>

          </div>

        </div>

        <!-- ==========================================
             SEÇÃO MOBILE: MANTIDA 100% IDENTICA
             ========================================== -->
        <div class="hig-mobile-only" style="display:flex; flex-direction:column; gap:24px; width:100%;">

          <div class="hig-page-header hig-desktop-only">
          <h1 class="hig-page-title">Início</h1>
          <span class="hig-page-date">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <!-- HIG Welcome Section (Mobile) -->
        <div class="card-v2 welcome-card-hig hig-mobile-only" style="
          background: linear-gradient(135deg, #0A84FF 0%, #0066CC 100%);
          color: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
          box-sizing: border-box;
        ">
          <!-- Light Spot -->
          <div style="
            position: absolute;
            top: 0; right: 0;
            width: 160px; height: 160px;
            background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
            pointer-events: none;
          "></div>

          <div style="display: flex; flex-direction: column; gap: 4px; z-index: 1; flex: 1 1 200px; min-width: 0;">
            <h2 style="
              font-size: 22px;
              font-weight: 700;
              margin: 0;
              letter-spacing: -0.3px;
              line-height: 1.2;
              color: #FFCC00;
            ">
              Olá, ${API.getUser().nome.split(' ')[0]}! 
              <span style="font-size: 20px; margin-left: 4px; vertical-align: middle;">👋</span>
            </h2>
            <p style="
              font-size: 15px;
              opacity: 0.9;
              font-weight: 400;
              margin: 0;
              line-height: 1.4;
              color: rgba(255, 255, 255, 0.9);
            ">Pronto para gerenciar a produção de hoje?</p>
          </div>


        </div>

        <!-- HIG Welcome Section (Desktop) -->
        <div class="hig-welcome-card hig-desktop-only">
          <div class="hig-welcome-text-group">
            <h2 class="hig-welcome-greeting">Olá, ${API.getUser().nome.split(' ')[0]}! <span>👋</span></h2>
            <p class="hig-welcome-subtitle">Pronto para gerenciar a produção de hoje?</p>
          </div>

        </div>

        <style>
          .btn-hig-glass:hover {
            background: rgba(255, 255, 255, 0.28) !important;
          }
          .btn-hig-glass:active {
            transform: scale(0.98);
          }
          .btn-hig-glass:focus {
            outline: none;
            box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #0A84FF;
          }
        </style>

        <!-- KPI Grid (Mobile) -->
        <div class="kpi-grid-v2 hig-mobile-only">
          <div class="kpi-card-v2 kpi-blue">
            <div class="kpi-icon-box"><i data-lucide="chef-hat"></i></div>
            <div>
              <div class="kpi-value-v2">${stats.totalPadeiros}</div>
              <div class="kpi-label-v2">Padeiros Ativos</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-purple">
            <div class="kpi-icon-box"><i data-lucide="package"></i></div>
            <div>
              <div class="kpi-value-v2">${stats.totalProdutos}</div>
              <div class="kpi-label-v2">Produtos Cadastrados</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-green">
            <div class="kpi-icon-box"><i data-lucide="building-2"></i></div>
            <div>
              <div class="kpi-value-v2">${stats.totalClientes}</div>
              <div class="kpi-label-v2">Clientes Ativos</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-orange">
            <div class="kpi-icon-box"><i data-lucide="star"></i></div>
            <div>
              <div class="kpi-value-v2">${stats.mediaAvaliacaoCliente || '—'}</div>
              <div class="kpi-label-v2">Média Avaliações</div>
            </div>
          </div>
        </div>

        <!-- KPI Grid (Desktop) -->
        <div class="hig-metrics-grid hig-desktop-only">
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap blue"><i data-lucide="chef-hat"></i></div>
            <span class="hig-metric-value">${stats.totalPadeiros}</span>
            <span class="hig-metric-label">Padeiros Ativos</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap purple"><i data-lucide="package"></i></div>
            <span class="hig-metric-value">${stats.totalProdutos}</span>
            <span class="hig-metric-label">Produtos Cadastrados</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap green"><i data-lucide="building-2"></i></div>
            <span class="hig-metric-value">${stats.totalClientes}</span>
            <span class="hig-metric-label">Clientes Ativos</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap orange"><i data-lucide="star"></i></div>
            <span class="hig-metric-value">${stats.mediaAvaliacaoCliente || '—'}</span>
            <span class="hig-metric-label">Média Avaliações</span>
          </div>
        </div>

        <!-- CLIENTES ATENDIDOS (MENSAL) (Mobile) -->
        <div class="card-v2 hig-mobile-only" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; padding: 24px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div class="kpi-icon-box" style="background: rgba(52, 199, 89, 0.12); color: #34C759; width: 56px; height: 56px; border-radius: 16px;">
              <i data-lucide="store" style="width: 28px; height: 28px;"></i>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #8E8E93; text-transform: uppercase; letter-spacing: 0.5px;">Clientes Atendidos neste Mês</div>
              <div style="font-size: 32px; font-weight: 800; color: #1C1C1E; line-height: 1.2; letter-spacing: -1px; margin-top: 4px;">${stats.totalClientesAtendidos || 0}</div>
            </div>
          </div>
        </div>

        <!-- CLIENTES ATENDIDOS (MENSAL) (Desktop) -->
        <div class="hig-clients-card hig-desktop-only">
          <div class="hig-clients-icon-wrap">
            <i data-lucide="store"></i>
          </div>
          <div>
            <span class="hig-clients-label">Clientes Atendidos neste Mês</span>
            <span class="hig-clients-value">${stats.totalClientesAtendidos || 0}</span>
          </div>
        </div>

        <!-- TOTAL PRODUZIDO MENSAL (Mobile) -->
        <div class="card-v2 w-full hig-mobile-only">
          <div class="card-v2-header">
            <h3 class="card-v2-title">
              <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(28, 126, 242, 0.1); color: #1C7EF2; border-radius: 8px;">
                <i data-lucide="bar-chart-3" style="width: 18px; height: 18px;"></i>
              </div>
              Produção Mensal
            </h3>
            <span class="badge-pill-v2">${mesLabel}</span>
          </div>
          
          <div class="metrics-row-v2">
            <div class="metric-v2">
              <div class="metric-v2-value" style="color: #1C7EF2;">${stats.totalProduzidoMes} <span class="metric-v2-unit">kg</span></div>
              <div class="metric-v2-label">Total Produzido (Kg)</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value" style="color: #AF52DE;">${stats.totalLitrosMes || '0.0'} <span class="metric-v2-unit">L</span></div>
              <div class="metric-v2-label">Total Produzido (Litros)</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value">${(stats.rankingProducao || []).length}</div>
              <div class="metric-v2-label">Padeiros Ativos</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-avg-container">
                <span class="metric-v2-avg-val kg-color">${(stats.rankingProducao || []).length > 0 ? (stats.totalProduzidoMes / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="metric-v2-avg-unit">kg</span></span>
                <span class="metric-v2-avg-sep">|</span>
                <span class="metric-v2-avg-val liters-color">${(stats.rankingProducao || []).length > 0 ? ((stats.totalLitrosMes || 0) / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="metric-v2-avg-unit">L</span></span>
              </div>
              <div class="metric-v2-label">Média por Padeiro</div>
            </div>
          </div>

          <div class="chart-container" style="height: 280px;">
            <canvas id="producaoChart"></canvas>
          </div>
        </div>

        <!-- TOTAL PRODUZIDO MENSAL (Desktop) -->
        <div class="hig-production-card hig-desktop-only">
          <div class="hig-production-header">
            <div class="hig-production-title">
              <i data-lucide="bar-chart-3"></i>
              Produção Mensal
            </div>
            <div class="hig-production-badge">${mesLabel}</div>
          </div>
          <div class="hig-production-stats">
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">${stats.totalProduzidoMes} <span class="hig-production-stat-unit">kg</span></div>
              <div class="hig-production-stat-label">Total Produzido (Kg)</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">${stats.totalLitrosMes || '0.0'} <span class="hig-production-stat-unit">L</span></div>
              <div class="hig-production-stat-label">Total Produzido (Litros)</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">${(stats.rankingProducao || []).length}</div>
              <div class="hig-production-stat-label">Padeiros Ativos</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">
                ${(stats.rankingProducao || []).length > 0 ? (stats.totalProduzidoMes / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="hig-production-stat-unit" style="margin-right:2px;">kg</span>
                <span style="color: #D1D1D6; margin: 0 4px; font-weight: 300;">|</span>
                ${(stats.rankingProducao || []).length > 0 ? ((stats.totalLitrosMes || 0) / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="hig-production-stat-unit">L</span>
              </div>
              <div class="hig-production-stat-label">Média por Padeiro</div>
            </div>
          </div>
          
          <div class="hig-chart-legend">
            <div class="hig-legend-item"><div class="hig-legend-dot kg"></div> Produção (kg)</div>
            <div class="hig-legend-item"><div class="hig-legend-dot litros"></div> Produção (Litros)</div>
          </div>
          <div class="hig-chart-container">
            <canvas id="producaoChartDesktop"></canvas>
          </div>
        </div>
        <div class="dashboard-grid-2-v2">
          <!-- 10 MELHORES PADS -->
          <div class="card-v2">
            <div class="card-v2-header">
              <h3 class="card-v2-title">
                <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(255, 214, 10, 0.15); color: #FFD60A; border-radius: 8px;">
                  <i data-lucide="trophy" style="width: 18px; height: 18px;"></i>
                </div>
                10 mais
              </h3>
            </div>
            ${(stats.top10Pads || stats.top3Pads || []).length === 0 
              ? '<div class="text-tertiary" style="padding: 20px 0;">Sem dados de produção neste mês.</div>'
              : `<div class="ranking-list-v2" style="max-height: 450px; overflow-y: auto; padding-right: 8px;">
                ${(stats.top10Pads || stats.top3Pads || []).map((p, i) => {
                  return `
                  <div class="ranking-item-v2">
                    <div class="ranking-pos-v2">${i+1}°</div>
                    <div class="ranking-info-v2">
                      ${Components.avatar(p.nome, 'avatar-sm')}
                      <div>
                        <div class="ranking-name-v2">${p.nome}</div>
                        <div class="ranking-role-v2">${p.cargo} • ${p.totalAtividades} ativ.</div>
                      </div>
                    </div>
                    <div class="ranking-data-v2" style="display: flex; flex-direction: column; align-items: flex-end;">
                      <div class="ranking-kg-v2" style="color: #1C7EF2;">${p.totalKg.toFixed(1)} kg</div>
                      <div class="ranking-liters-v2">${(p.totalLiters || 0).toFixed(1)} L</div>
                      ${p.notaMedia !== null ? Components.starsDisplay(p.notaMedia) : ''}
                    </div>
                  </div>`;
                }).join('')}
              </div>`
            }
          </div>

          <!-- 10 PIORES PADS -->
          <div class="card-v2">
            <div class="card-v2-header">
              <h3 class="card-v2-title">
                <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(255, 59, 48, 0.15); color: #FF3B30; border-radius: 8px;">
                  <i data-lucide="alert-triangle" style="width: 18px; height: 18px;"></i>
                </div>
                10 menos
              </h3>
            </div>
            ${(stats.pontoCritico || []).length === 0 
              ? `<div class="flex items-center gap-3" style="padding: 20px 0;">
                  <div style="color: var(--success);"><i data-lucide="check-circle-2"></i></div>
                  <div>
                    <div style="font-weight: 600; color: var(--success);">Tudo certo!</div>
                    <div class="text-tertiary" style="font-size: 13px;">Nenhuma avaliação registrada ainda.</div>
                  </div>
                </div>`
              : `<div class="ranking-list-v2" style="max-height: 450px; overflow-y: auto; padding-right: 8px;">
                ${stats.pontoCritico.map((p, i) => {
                  return `
                  <div class="ranking-item-v2 worst-item-v2">
                    <div class="ranking-pos-v2">${i+1}°</div>
                    <div class="ranking-info-v2">
                      ${Components.avatar(p.nome, 'avatar-sm')}
                      <div>
                        <div class="ranking-name-v2">${p.nome}</div>
                        <div class="ranking-role-v2">${p.cargo} • ${p.totalAvals} aval.</div>
                      </div>
                    </div>
                    <div class="ranking-data-v2">
                      <div class="ranking-kg-v2">${p.media.toFixed(1)}</div>
                      ${Components.starsDisplay(p.media)}
                    </div>
                  </div>`;
                }).join('')}
              </div>`
            }
          </div>
        </div>

        <!-- RANKING CLIENTES -->
        <div class="card-v2">
          <div class="card-v2-header">
            <h3 class="card-v2-title">
              <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(0, 122, 255, 0.1); color: #007AFF; border-radius: 8px;">
                <i data-lucide="building-2" style="width: 18px; height: 18px;"></i>
              </div>
              Ranking de Clientes
            </h3>
          </div>
          
          ${(stats.rankingClientes || []).length === 0
            ? '<div class="text-tertiary" style="padding: 20px 0;">Nenhum cliente atendido ainda.</div>'
            : `
            <div class="client-header-v2">
              <div>#</div><div>Cliente</div><div>Visitas</div><div>KG Total</div><div>Nota</div><div>Status</div>
            </div>
            <div class="client-list-v2">
              ${(stats.rankingClientes || []).map((c, i) => `
                <!-- Item Desktop -->
                <div class="client-item-v2 desktop-only">
                  <div class="client-pos-v2 ${i < 3 ? 'top' : ''}">${i + 1}°</div>
                  <div class="client-name-v2">${(c.nomeFantasia || c.nome) + (c.bairro ? ' - ' + c.bairro : '') || '—'}</div>
                  <div class="client-data-v2">${c.totalAtendimentos} visitas</div>
                  <div class="client-kg-v2" style="color: #1C7EF2;">
                    ${c.totalKg.toFixed(1)} kg
                    <span style="color: #D1D1D6; margin: 0 4px;">•</span>
                    <span class="client-liters-v2" style="color: #AF52DE; font-weight: 700; font-size: 13px;">${(c.totalLiters || 0).toFixed(1)} L</span>
                  </div>
                  <div class="client-rating-v2">${c.notaMedia ? Components.starsDisplay(c.notaMedia) : '—'}</div>
                  <div class="client-status-v2">
                    ${c.totalAtendimentos >= 5 ? '<span class="badge-pill-v2" style="background:rgba(52,199,89,0.1);color:#34C759;padding:2px 8px;font-size:10px">Frequente</span>' : 
                      c.totalAtendimentos >= 2 ? '<span class="badge-pill-v2" style="padding:2px 8px;font-size:10px">Regular</span>' : 
                      '<span class="badge-pill-v2" style="background:rgba(175,82,222,0.1);color:#AF52DE;padding:2px 8px;font-size:10px">Novo</span>'}
                  </div>
                </div>

                <!-- Item Mobile -->
                <div class="client-item-v2 mobile-only">
                  <div class="client-pos-v2 ${i < 3 ? 'top' : ''}">${i + 1}°</div>
                  <div class="client-info-v2">
                    <div class="client-name-v2">${(c.nomeFantasia || c.nome) + (c.bairro ? ' - ' + c.bairro : '') || '—'}</div>
                    <div class="flex items-center gap-2" style="margin-top: 2px; flex-wrap: wrap;">
                      <span class="client-data-v2">${c.totalAtendimentos} visitas</span>
                      <span style="color: #D1D1D6;">•</span>
                      <span class="client-kg-v2" style="color: #1C7EF2;">${c.totalKg.toFixed(1)} kg</span>
                      <span style="color: #D1D1D6;">•</span>
                      <span class="client-liters-v2" style="color: #AF52DE; font-weight: 700; font-size: 13px;">${(c.totalLiters || 0).toFixed(1)} L</span>
                    </div>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    ${c.notaMedia ? Components.starsDisplay(c.notaMedia) : '—'}
                    <div class="client-status-v2">
                      ${c.totalAtendimentos >= 5 ? '<span class="badge-pill-v2" style="background:rgba(52,199,89,0.1);color:#34C759;padding:2px 8px;font-size:10px">Frequente</span>' : 
                        c.totalAtendimentos >= 2 ? '<span class="badge-pill-v2" style="padding:2px 8px;font-size:10px">Regular</span>' : 
                        '<span class="badge-pill-v2" style="background:rgba(175,82,222,0.1);color:#AF52DE;padding:2px 8px;font-size:10px">Novo</span>'}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>`
          }
        </div>

        <div class="dashboard-grid-2-v2">
          <!-- Distribuição por Cargo -->
          <div class="card-v2">
            <div class="card-v2-header">
              <h3 class="card-v2-title">
                <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(175, 82, 222, 0.1); color: #AF52DE; border-radius: 8px;">
                  <i data-lucide="users" style="width: 18px; height: 18px;"></i>
                </div>
                Distribuição por Cargo
              </h3>
            </div>
            <div class="chart-container" style="height: 220px;">
              <canvas id="cargoChart"></canvas>
            </div>
            <div id="cargoLegend" class="donut-legend-v2"></div>
          </div>

          <!-- Distribuição por Filial -->
          <div class="card-v2">
            <div class="card-v2-header">
              <h3 class="card-v2-title">
                <div class="kpi-icon-box" style="width: 32px; height: 32px; background: rgba(255, 149, 0, 0.1); color: #FF9500; border-radius: 8px;">
                  <i data-lucide="map-pin" style="width: 18px; height: 18px;"></i>
                </div>
                Distribuição por Filial
              </h3>
            </div>
            <div class="chart-container" style="height: 220px;">
              <canvas id="filialChart"></canvas>
            </div>
            <div id="filialLegend" class="donut-legend-v2"></div>
          </div>
        </div> 
        </div> <!-- Fim de hig-mobile-only -->
      </div>`;

      // Draw Charts using Chart.js
      setTimeout(() => {
        const prodData = stats.rankingProducao || [];
        const prodLabels = prodData.map(p => (p && p.nome) ? p.nome.split(' ').slice(0, 2).join(' ') : '—');
        const prodKgVals = prodData.map(p => p ? p.totalKg : 0);
        const prodLVals = prodData.map(p => p ? p.totalLiters : 0);
        
        // Mobile charts
        this.initBarChart('producaoChart', prodLabels, prodKgVals, prodLVals);
        this.initDoughnutChart('cargoChart', stats.porCargo);
        this.initDoughnutChart('filialChart', stats.porFilial);

        // Desktop charts (New Redesign Layout)
        this.initBarChart('producaoChartDesktopNew', prodLabels, prodKgVals, prodLVals);
        this.initDoughnutChart('cargoChartDesktopNew', stats.porCargo);
        
        // Initialize tracker
        this.initTracker();
      }, 0);

    } catch (err) {
      container.innerHTML = `<div class="toast error"><i data-lucide="alert-circle"></i> Erro ao carregar dashboard: ${err.message}</div>`;
      Components.renderIcons();
    }
  },

  trackerInterval: null,
  trackerSeconds: 900,
  trackerInitialSeconds: 900,
  trackerRunning: false,
  currentPreset: 'pao-francais',

  initTracker() {
    this.trackerSeconds = 900;
    this.trackerInitialSeconds = 900;
    this.trackerRunning = false;
    this.currentPreset = 'pao-francais';
    
    const clock = document.getElementById('desktop-tracker-clock');
    if (clock) clock.textContent = '15:00';
    const status = document.getElementById('desktop-fornada-status');
    if (status) status.textContent = 'Forno pronto para aquecer 🥖';
  },

  setFornadaPreset(presetName, seconds) {
    if (this.trackerInterval) {
      clearInterval(this.trackerInterval);
    }
    this.trackerRunning = false;
    this.trackerSeconds = seconds;
    this.trackerInitialSeconds = seconds;
    this.currentPreset = presetName;

    const buttons = document.querySelectorAll('.db-preset-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(presetName));
    if (activeBtn) activeBtn.classList.add('active');

    const clock = document.getElementById('desktop-tracker-clock');
    if (clock) {
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      clock.textContent = `${m}:${s}`;
    }

    const card = document.getElementById('desktop-fornada-card');
    if (card) card.classList.remove('ready', 'baking');

    const status = document.getElementById('desktop-fornada-status');
    if (status) status.textContent = 'Forno pronto para aquecer 🥖';

    const playIcon = document.getElementById('desktop-tracker-play-icon');
    const playBtn = document.getElementById('desktop-tracker-play-btn');
    if (playIcon) playIcon.setAttribute('data-lucide', 'play');
    if (playBtn) playBtn.classList.remove('paused');
    
    Components.renderIcons();
  },

  toggleTracker() {
    const playIcon = document.getElementById('desktop-tracker-play-icon');
    const playBtn = document.getElementById('desktop-tracker-play-btn');
    const clock = document.getElementById('desktop-tracker-clock');
    const card = document.getElementById('desktop-fornada-card');
    const status = document.getElementById('desktop-fornada-status');
    if (!clock) return;

    if (this.trackerRunning) {
      clearInterval(this.trackerInterval);
      this.trackerRunning = false;
      if (playIcon) playIcon.setAttribute('data-lucide', 'play');
      if (playBtn) playBtn.classList.remove('paused');
      if (status) status.textContent = 'Fornada pausada ⏸️';
      if (card) card.classList.remove('baking');
    } else {
      if (this.trackerSeconds <= 0) {
        this.trackerSeconds = this.trackerInitialSeconds;
      }

      this.trackerRunning = true;
      if (playIcon) playIcon.setAttribute('data-lucide', 'pause');
      if (playBtn) playBtn.classList.add('paused');
      if (status) status.textContent = 'Assando no forno... 🔥';
      if (card) {
        card.classList.add('baking');
        card.classList.remove('ready');
      }

      this.trackerInterval = setInterval(() => {
        const clockEl = document.getElementById('desktop-tracker-clock');
        const statusEl = document.getElementById('desktop-fornada-status');
        const cardEl = document.getElementById('desktop-fornada-card');
        
        if (!clockEl) {
          clearInterval(this.trackerInterval);
          this.trackerRunning = false;
          return;
        }

        if (this.trackerSeconds > 0) {
          this.trackerSeconds--;
          const m = String(Math.floor(this.trackerSeconds / 60)).padStart(2, '0');
          const s = String(this.trackerSeconds % 60).padStart(2, '0');
          clockEl.textContent = `${m}:${s}`;
        }

        if (this.trackerSeconds <= 0) {
          clearInterval(this.trackerInterval);
          this.trackerRunning = false;
          
          if (statusEl) statusEl.textContent = 'Fornada pronta! 🥖🔥';
          if (cardEl) {
            cardEl.classList.remove('baking');
            cardEl.classList.add('ready');
          }
          
          const pIcon = document.getElementById('desktop-tracker-play-icon');
          const pBtn = document.getElementById('desktop-tracker-play-btn');
          if (pIcon) pIcon.setAttribute('data-lucide', 'play');
          if (pBtn) pBtn.classList.remove('paused');
          
          if ('speechSynthesis' in window) {
            const speech = new SpeechSynthesisUtterance('A fornada está pronta! Retire do forno.');
            speech.lang = 'pt-BR';
            window.speechSynthesis.speak(speech);
          }
          Components.renderIcons();
        }
      }, 1000);
    }
    Components.renderIcons();
  },

  resetTracker() {
    clearInterval(this.trackerInterval);
    this.trackerRunning = false;
    this.trackerSeconds = this.trackerInitialSeconds;

    const clock = document.getElementById('desktop-tracker-clock');
    if (clock) {
      const m = String(Math.floor(this.trackerSeconds / 60)).padStart(2, '0');
      const s = String(this.trackerSeconds % 60).padStart(2, '0');
      clock.textContent = `${m}:${s}`;
    }

    const card = document.getElementById('desktop-fornada-card');
    if (card) card.classList.remove('ready', 'baking');

    const status = document.getElementById('desktop-fornada-status');
    if (status) status.textContent = 'Tempo reiniciado 🥖';

    const playIcon = document.getElementById('desktop-tracker-play-icon');
    const playBtn = document.getElementById('desktop-tracker-play-btn');
    if (playIcon) playIcon.setAttribute('data-lucide', 'play');
    if (playBtn) playBtn.classList.remove('paused');
    Components.renderIcons();
  },

  initBarChart(canvasId, labels, kgData, lData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    const isEmpty = (!kgData || kgData.length === 0) && (!lData || lData.length === 0);
    const chartLabels = isEmpty ? ['Sem1', 'Sem2', 'Sem3', 'Sem4'] : labels;
    const isNewDesktop = canvasId === 'producaoChartDesktopNew';
    
    const datasets = [];
    if (isEmpty) {
      datasets.push({
        label: 'Produção (kg)',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(229, 231, 235, 0.2)',
        borderColor: '#E5E7EB',
        borderWidth: 2,
        borderRadius: 0,
        barPercentage: 0.6
      });
    } else {
      datasets.push({
        label: 'Produção (kg)',
        data: kgData,
        backgroundColor: isNewDesktop ? '#5e52ff' : 'rgba(28, 126, 242, 0.85)',
        borderColor: isNewDesktop ? '#5e52ff' : '#1C7EF2',
        borderWidth: 0,
        borderRadius: isNewDesktop ? 9999 : 8,
        borderSkipped: false,
        barPercentage: isNewDesktop ? 0.35 : 0.45,
        categoryPercentage: 0.7
      });
      datasets.push({
        label: 'Produção (L)',
        data: lData,
        backgroundColor: isNewDesktop ? '#af52de' : 'rgba(175, 82, 222, 0.85)',
        borderColor: isNewDesktop ? '#af52de' : '#AF52DE',
        borderWidth: 0,
        borderRadius: isNewDesktop ? 9999 : 8,
        borderSkipped: false,
        barPercentage: isNewDesktop ? 0.35 : 0.45,
        categoryPercentage: 0.7
      });
    }

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: !isEmpty && !isNewDesktop,
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 12, weight: '600' },
              color: '#1C1C1E'
            }
          },
          tooltip: {
            enabled: !isEmpty,
            backgroundColor: 'rgba(28, 28, 30, 0.8)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: 'Inter', size: 13, weight: 'bold' },
            bodyFont: { family: 'Inter', size: 14 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.04)', drawBorder: false },
            ticks: { font: { family: 'Inter', size: 12 }, color: '#AEAEB2' }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#6E6E73' }
          }
        }
      }
    });
  },

  initDoughnutChart(canvasId, dataObj) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = Object.keys(dataObj);
    const data = Object.values(dataObj);
    const colors = ['#FF9500', '#007AFF', '#34C759', '#AF52DE', '#FF3B30', '#5856D6', '#FF2D55'];
    const isNewDesktop = canvasId === 'cargoChartDesktopNew';
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isNewDesktop ? '80%' : '75%',
        circumference: isNewDesktop ? 180 : 360,
        rotation: isNewDesktop ? 270 : 0,
        plugins: {
          legend: { display: false }
        }
      }
    });

    // Custom Legend
    const legendContainer = document.getElementById(canvasId.replace('Chart', 'Legend'));
    if (legendContainer) {
      const total = data.reduce((a, b) => a + b, 0);
      legendContainer.innerHTML = labels.map((l, i) => {
        const pct = total > 0 ? ((data[i] / total) * 100).toFixed(0) : 0;
        return `
          <div class="donut-legend-item-v2">
            <div class="donut-dot-v2" style="background: ${colors[i % colors.length]}"></div>
            <span>${l}</span>
            <span class="donut-pct-v2">${pct}%</span>
          </div>`;
      }).join('');
    }
  }
};
