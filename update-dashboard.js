const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/Users/Aprendiz Ti/Downloads/gestaoPadeiro/public/js/admin-dashboard.js');
let content = fs.readFileSync(filePath, 'utf8');

const desktopHtml = `
        <div class="hig-page-header hig-desktop-only">
          <h1 class="hig-page-title">Início</h1>
          <span class="hig-page-date">\${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
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
              Olá, \${API.getUser().nome.split(' ')[0]}! 
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

        <!-- HIG Welcome Section (Desktop) -->
        <div class="hig-welcome-card hig-desktop-only">
          <div class="hig-welcome-text-group">
            <h2 class="hig-welcome-greeting">Olá, \${API.getUser().nome.split(' ')[0]}! <span>👋</span></h2>
            <p class="hig-welcome-subtitle">Pronto para gerenciar a produção de hoje?</p>
          </div>
          <button class="hig-tutorial-btn" onclick="Tutorial.start()">
            <i data-lucide="book-open"></i> Tutorial do Sistema
          </button>
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
              <div class="kpi-value-v2">\${stats.totalPadeiros}</div>
              <div class="kpi-label-v2">Padeiros Ativos</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-purple">
            <div class="kpi-icon-box"><i data-lucide="package"></i></div>
            <div>
              <div class="kpi-value-v2">\${stats.totalProdutos}</div>
              <div class="kpi-label-v2">Produtos Cadastrados</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-green">
            <div class="kpi-icon-box"><i data-lucide="building-2"></i></div>
            <div>
              <div class="kpi-value-v2">\${stats.totalClientes}</div>
              <div class="kpi-label-v2">Clientes Ativos</div>
            </div>
          </div>
          <div class="kpi-card-v2 kpi-orange">
            <div class="kpi-icon-box"><i data-lucide="star"></i></div>
            <div>
              <div class="kpi-value-v2">\${stats.mediaAvaliacaoCliente || '—'}</div>
              <div class="kpi-label-v2">Média Avaliações</div>
            </div>
          </div>
        </div>

        <!-- KPI Grid (Desktop) -->
        <div class="hig-metrics-grid hig-desktop-only">
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap blue"><i data-lucide="chef-hat"></i></div>
            <span class="hig-metric-value">\${stats.totalPadeiros}</span>
            <span class="hig-metric-label">Padeiros Ativos</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap purple"><i data-lucide="package"></i></div>
            <span class="hig-metric-value">\${stats.totalProdutos}</span>
            <span class="hig-metric-label">Produtos Cadastrados</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap green"><i data-lucide="building-2"></i></div>
            <span class="hig-metric-value">\${stats.totalClientes}</span>
            <span class="hig-metric-label">Clientes Ativos</span>
          </div>
          <div class="hig-metric-card">
            <div class="hig-metric-icon-wrap orange"><i data-lucide="star"></i></div>
            <span class="hig-metric-value">\${stats.mediaAvaliacaoCliente || '—'}</span>
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
              <div style="font-size: 32px; font-weight: 800; color: #1C1C1E; line-height: 1.2; letter-spacing: -1px; margin-top: 4px;">\${stats.totalClientesAtendidos || 0}</div>
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
            <span class="hig-clients-value">\${stats.totalClientesAtendidos || 0}</span>
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
            <span class="badge-pill-v2">\${mesLabel}</span>
          </div>
          
          <div class="metrics-row-v2">
            <div class="metric-v2">
              <div class="metric-v2-value" style="color: #1C7EF2;">\${stats.totalProduzidoMes} <span class="metric-v2-unit">kg</span></div>
              <div class="metric-v2-label">Total Produzido (Kg)</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value" style="color: #AF52DE;">\${stats.totalLitrosMes || '0.0'} <span class="metric-v2-unit">L</span></div>
              <div class="metric-v2-label">Total Produzido (Litros)</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-value">\${(stats.rankingProducao || []).length}</div>
              <div class="metric-v2-label">Padeiros Ativos</div>
            </div>
            <div class="metric-v2-divider"></div>
            <div class="metric-v2">
              <div class="metric-v2-avg-container">
                <span class="metric-v2-avg-val kg-color">\${(stats.rankingProducao || []).length > 0 ? (stats.totalProduzidoMes / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="metric-v2-avg-unit">kg</span></span>
                <span class="metric-v2-avg-sep">|</span>
                <span class="metric-v2-avg-val liters-color">\${(stats.rankingProducao || []).length > 0 ? ((stats.totalLitrosMes || 0) / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="metric-v2-avg-unit">L</span></span>
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
            <div class="hig-production-badge">\${mesLabel}</div>
          </div>
          <div class="hig-production-stats">
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">\${stats.totalProduzidoMes} <span class="hig-production-stat-unit">kg</span></div>
              <div class="hig-production-stat-label">Total Produzido (Kg)</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">\${stats.totalLitrosMes || '0.0'} <span class="hig-production-stat-unit">L</span></div>
              <div class="hig-production-stat-label">Total Produzido (Litros)</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">\${(stats.rankingProducao || []).length}</div>
              <div class="hig-production-stat-label">Padeiros Ativos</div>
            </div>
            <div class="hig-production-stat-item">
              <div class="hig-production-stat-value">
                \${(stats.rankingProducao || []).length > 0 ? (stats.totalProduzidoMes / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="hig-production-stat-unit" style="margin-right:2px;">kg</span>
                <span style="color: #D1D1D6; margin: 0 4px; font-weight: 300;">|</span>
                \${(stats.rankingProducao || []).length > 0 ? ((stats.totalLitrosMes || 0) / (stats.rankingProducao || []).length).toFixed(1) : '0'}<span class="hig-production-stat-unit">L</span>
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
        </div>`;

const startTag = '<!-- HIG Welcome Section -->';
const endTag = '<!-- 10 MELHORES PADS -->';

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1) {
  // We want to replace from startIndex up to just before endTag, but preserving the structure.
  // Actually, we replace everything between <div class="admin-v2-container fade-in"> and <div class="dashboard-grid-2-v2">
  
  const divStartStr = '<div class="admin-v2-container fade-in">';
  const divEndStr = '<div class="dashboard-grid-2-v2">';
  
  const divStartIndex = content.indexOf(divStartStr);
  const divEndIndex = content.indexOf(divEndStr, divStartIndex);
  
  if (divStartIndex !== -1 && divEndIndex !== -1) {
    const newContent = content.substring(0, divStartIndex + divStartStr.length) + '\n' + desktopHtml + '\n        ' + content.substring(divEndIndex);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully replaced admin-dashboard.js HTML content.');
  } else {
    console.log('Could not find wrapping divs');
  }
} else {
  console.log('Could not find tags');
}
