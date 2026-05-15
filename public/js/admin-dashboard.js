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
          rankingClientes: (stats.rankingClientes || []).filter(c => c && c.nome && c.nome.toLowerCase().includes(this.searchTerm)),
          pontoCritico: (stats.pontoCritico || []).filter(p => p && p.nome && p.nome.toLowerCase().includes(this.searchTerm))
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
        
        /* Worst accent */
        .worst-item-v2 .ranking-pos-v2 { color: #FF3B30; }
        .worst-item-v2 .ranking-kg-v2 { color: #FF3B30; }
        
        .client-list-v2 { display: flex; flex-direction: column; gap: 0; }
        .client-item-v2 { 
          display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 100px; 
          align-items: center; padding: 18px 0; border-bottom: 1px solid #F2F2F7; 
        }
        .client-item-v2:last-child { border-bottom: none; }
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

        @media (max-width: 1024px) { .kpi-grid-v2 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 850px) { .dashboard-grid-2-v2 { grid-template-columns: 1fr; } }
        
        /* Mobile Fixes (iPhone/Compact) */
        @media (max-width: 600px) {
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
      </style>

      <div class="admin-v2-container fade-in">
        
        <!-- HIG Welcome Section -->
        <!-- HIG Welcome Section -->
        <div class="card-v2 welcome-card-hig" style="
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
              color: #FFCC00; /* Apple Gold/Orange for better visibility */
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

          <div style="z-index: 1; flex-shrink: 0;">
            <button class="btn-hig-glass" onclick="Tutorial.start()" style="
              background: rgba(255, 255, 255, 0.2);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 12px;
              padding: 10px 18px;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 10px;
              cursor: pointer;
              transition: all 150ms ease;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            ">
              <i data-lucide="book-open" size="18" style="stroke-width: 2.5px;"></i>
              Tutorial do Sistema
            </button>
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

        <!-- KPI Grid -->
        <div class="kpi-grid-v2">
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
              <div class="kpi-label-v2">Clientes Atendidos</div>
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

        <!-- TOTAL PRODUZIDO MENSAL -->
        <div class="card-v2 w-full">
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
              <div class="metric-v2-value" style="color: var(--primary);">${stats.totalProduzidoMes} <span class="metric-v2-unit">kg</span></div>
              <div class="metric-v2-label">Total Produzido</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value">${(stats.rankingProducao || []).length}</div>
              <div class="metric-v2-label">Padeiros Ativos</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value" style="color: var(--success);">${(stats.rankingProducao || []).length > 0 ? (stats.totalProduzidoMes / (stats.rankingProducao || []).length).toFixed(1) : '0'} <span class="metric-v2-unit">kg</span></div>
              <div class="metric-v2-label">Média por Padeiro</div>
            </div>
          </div>

          <div class="chart-container" style="height: 280px;">
            <canvas id="producaoChart"></canvas>
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
                10 Melhores Padeiros
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
                    <div class="ranking-data-v2">
                      <div class="ranking-kg-v2">${p.totalKg.toFixed(1)} kg</div>
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
                10 Piores Padeiros
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
                <div class="client-item-v2">
                  <div class="client-pos-v2 ${i < 3 ? 'top' : ''}">${i + 1}°</div>
                  <div class="client-info-v2">
                    <div class="client-name-v2">${c.nome || '—'}</div>
                    <div class="flex items-center gap-2" style="margin-top: 2px;">
                      <span class="client-data-v2">${c.totalAtendimentos} visitas</span>
                      <span style="color: #D1D1D6;">•</span>
                      <span class="client-kg-v2">${c.totalKg.toFixed(1)} kg</span>
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

      </div>`;

      // Draw Charts using Chart.js
      setTimeout(() => {
        const prodData = stats.rankingProducao || [];
        const prodLabels = prodData.map(p => (p && p.nome) ? p.nome.split(' ').slice(0, 2).join(' ') : '—');
        const prodVals = prodData.map(p => p ? p.totalKg : 0);
        this.initBarChart('producaoChart', prodLabels, prodVals, 'rgba(30, 75, 255, 0.8)');
        
        this.initDoughnutChart('cargoChart', stats.porCargo);
        this.initDoughnutChart('filialChart', stats.porFilial);
      }, 0);

    } catch (err) {
      container.innerHTML = `<div class="toast error"><i data-lucide="alert-circle"></i> Erro ao carregar dashboard: ${err.message}</div>`;
      Components.renderIcons();
    }
  },

  initBarChart(canvasId, labels, data, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Configuração para Skeleton (Area Chart Vazio)
    const isEmpty = !data || data.length === 0;
    const chartType = isEmpty ? 'line' : 'bar';
    const chartLabels = isEmpty ? ['Sem1', 'Sem2', 'Sem3', 'Sem4'] : labels;
    const chartData = isEmpty ? [0, 0, 0, 0] : data;
    const chartColor = isEmpty ? '#E5E7EB' : color;
    
    new Chart(ctx, {
      type: chartType,
      data: {
        labels: chartLabels,
        datasets: [{
          label: 'Produção (kg)',
          data: chartData,
          backgroundColor: isEmpty ? 'rgba(229, 231, 235, 0.2)' : color,
          borderColor: chartColor,
          borderWidth: isEmpty ? 2 : 0,
          fill: isEmpty,
          borderRadius: isEmpty ? 0 : 8,
          borderSkipped: false,
          barPercentage: 0.6,
          pointRadius: isEmpty ? 0 : 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
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
            max: isEmpty ? 100 : undefined,
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
        cutout: '75%',
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
