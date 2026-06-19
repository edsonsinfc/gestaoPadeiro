/**
 * Filiais Module - Branch Health Metrics
 * BRAGO Sistema Padeiro
 */

console.log('✅ Filiais script loading...');
window.Filiais = {
  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    
    try {
      const data = await API.get('/api/stats/filiais');
      
      container.innerHTML = `
        <style>
          .filiais-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 24px;
            padding: 20px 0;
            font-family: var(--font-main);
          }
          .filial-card { 
            background: var(--bg-card);
            border-radius: var(--radius-lg);
            padding: 24px; 
            box-shadow: var(--shadow-sm);
            border: 1px solid var(--glass-border);
            transition: var(--transition);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .filial-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--primary);
          }
          .filial-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .filial-name {
            font-size: 18px;
            font-weight: 800;
            color: var(--text-main);
            letter-spacing: -0.5px;
          }
          .filial-body {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .filial-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid var(--glass-border);
          }
          .filial-metric:last-child {
            border-bottom: none;
          }
          .metric-label-group {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            font-size: 13.5px;
            font-weight: 500;
          }
          .metric-label-group i {
            width: 16px;
            height: 16px;
            color: var(--text-muted);
          }
          .metric-value {
            font-weight: 700;
            color: var(--text-main);
            font-size: 14px;
          }
          
          /* Health badges */
          .health-badge {
            padding: 4px 10px;
            border-radius: var(--radius-full);
            font-size: 11px;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .health-good { background: rgba(16,185,129,0.1); color: var(--success); }
          .health-warning { background: rgba(245,158,11,0.1); color: var(--warning); }
          .health-bad { background: rgba(239,68,68,0.1); color: var(--error); }
          
          .health-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }
          .health-good .health-dot { background: var(--success); box-shadow: 0 0 8px var(--success); }
          .health-warning .health-dot { background: var(--warning); box-shadow: 0 0 8px var(--warning); }
          .health-bad .health-dot { background: var(--error); box-shadow: 0 0 8px var(--error); }

          .filial-btn {
            background: var(--primary-light);
            color: var(--primary);
            font-size: 13px;
            font-weight: 700;
            border-radius: var(--radius-md);
            border: none;
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            cursor: pointer;
            transition: var(--transition);
            margin-top: 16px;
            width: 100%;
          }
          .filial-btn:hover {
            background: var(--primary);
            color: #ffffff;
          }
          .filial-btn i {
            width: 14px;
            height: 14px;
          }

          /* Details modal styling */
          .filial-details-modal {
            font-family: var(--font-main);
          }
          .filial-det-card {
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            padding: 14px;
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: var(--shadow-sm);
          }
          .filial-det-icon {
            width: 36px;
            height: 36px;
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .filial-det-icon i {
            width: 18px;
            height: 18px;
          }
          .filial-det-icon.bg-blue { background: rgba(30,75,255,0.08); color: var(--primary); }
          .filial-det-icon.bg-purple { background: rgba(168,85,247,0.08); color: #A855F7; }
          .filial-det-icon.bg-orange { background: rgba(245,158,11,0.08); color: var(--warning); }
          
          .filial-det-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .filial-det-lbl {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .filial-det-val {
            font-size: 17px;
            font-weight: 800;
            color: var(--text-main);
          }
          .filial-modal-section-title {
            font-size: 14.5px;
            font-weight: 700;
            color: var(--text-main);
            margin: 24px 0 12px 0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .filial-modal-section-title i {
            width: 16px;
            height: 16px;
            color: var(--primary);
          }
          .filial-table-container {
            background: var(--bg-card);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
          }
          .filial-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
          }
          .filial-table th {
            background: var(--bg-main);
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--glass-border);
          }
          .filial-table td {
            padding: 12px 14px;
            font-size: 13px;
            color: var(--text-main);
            border-bottom: 1px solid var(--glass-border);
            vertical-align: middle;
          }
          .filial-table tr:last-child td {
            border-bottom: none;
          }
          .filial-table tr:hover td {
            background-color: var(--bg-card-hover);
          }
          .filial-activity-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-md);
            background: var(--bg-card);
            margin-bottom: 8px;
            transition: var(--transition);
          }
          .filial-activity-item:hover {
            border-color: var(--primary-light);
            background-color: var(--bg-card-hover);
          }
          .filial-act-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .filial-act-title {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-main);
          }
          .filial-act-sub {
            font-size: 11.5px;
            color: var(--text-secondary);
          }
          .filial-act-badges {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 4px;
          }
          .badge-kg {
            background: rgba(30,75,255,0.08);
            color: var(--primary);
            font-size: 10px;
            padding: 2px 8px;
            font-weight: 700;
            border-radius: var(--radius-full);
          }
          .badge-l {
            background: rgba(168,85,247,0.08);
            color: #A855F7;
            font-size: 10px;
            padding: 2px 8px;
            font-weight: 700;
            border-radius: var(--radius-full);
          }
        </style>
        <div class="filiais-page fade-in">
          <div class="flex justify-between items-center mb-6">
            <h2 class="page-title">Saúde das Filiais</h2>
          </div>
          
          <div class="filiais-grid">
            ${data.map(f => {
              const score = parseFloat(f.notaMedia);
              const healthClass = score >= 4.5 ? 'health-good' : score >= 3.5 ? 'health-warning' : 'health-bad';
              const healthText = score >= 4.5 ? 'Estável' : score >= 3.5 ? 'Moderado' : 'Crítico';
              
              return `
              <div class="filial-card">
                <div class="filial-header">
                  <div class="filial-name">${f.nome}</div>
                  <div class="health-badge ${healthClass}">
                    <span class="health-dot"></span>
                    <span>${healthText}</span>
                  </div>
                </div>
                <div class="filial-body">
                  <div class="filial-metric">
                    <span class="metric-label-group">
                      <i data-lucide="users"></i>
                      <span>Padeiros Ativos</span>
                    </span>
                    <span class="metric-value">${f.totalPadeiros}</span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label-group">
                      <i data-lucide="package"></i>
                      <span>Produção Total</span>
                    </span>
                    <span class="metric-value" style="display:flex; flex-direction:column; align-items:flex-end; gap: 2px;">
                      <span style="color:#1C7EF2;">${f.kgTotal} kg</span>
                      <span style="color:#AF52DE; font-size:11px; font-weight:700;">${f.lTotal} L</span>
                    </span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label-group">
                      <i data-lucide="clipboard-list"></i>
                      <span>Atividades</span>
                    </span>
                    <span class="metric-value">${f.totalAtividades}</span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label-group">
                      <i data-lucide="star"></i>
                      <span>Média Avaliações</span>
                    </span>
                    <span class="metric-value" style="display: flex; align-items: center; gap: 4px;">
                      ${f.notaMedia} <i data-lucide="star" style="width:14px; color:#FFD60A; fill:#FFD60A"></i>
                    </span>
                  </div>
                </div>
                <button class="filial-btn" onclick="Filiais.viewDetails('${f.nome}')">
                  <span>Ver Detalhes</span> <i data-lucide="arrow-right"></i>
                </button>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
      
      Components.renderIcons();
    } catch (error) {
      container.innerHTML = `<div class="toast error">Erro ao carregar filiais: ${error.message}</div>`;
    }
  },

  async viewDetails(nome) {
    Components.showModal(`Detalhes: ${nome}`, Components.loading());
    
    try {
      const data = await API.get(`/api/stats/filiais/${encodeURIComponent(nome)}`);
      
      const content = `
        <div class="filial-details-modal">
          <div class="metrics-row mb-6" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px;">
            <div class="filial-det-card">
              <div class="filial-det-icon bg-blue"><i data-lucide="users"></i></div>
              <div class="filial-det-info">
                <div class="filial-det-lbl">Padeiros</div>
                <div class="filial-det-val">${data.totalPadeiros}</div>
              </div>
            </div>
            <div class="filial-det-card">
              <div class="filial-det-icon bg-purple"><i data-lucide="package"></i></div>
              <div class="filial-det-info">
                <div class="filial-det-lbl">Produção</div>
                <div class="filial-det-val" style="display:flex; flex-direction:column; gap:2px; font-size: 13.5px; line-height:1.2;">
                  <span style="color:#1C7EF2; font-weight:800;">${data.kgTotal} kg</span>
                  <span style="color:#AF52DE; font-size:11px; font-weight:700;">${data.lTotal} L</span>
                </div>
              </div>
            </div>
            <div class="filial-det-card">
              <div class="filial-det-icon bg-orange"><i data-lucide="clipboard-list"></i></div>
              <div class="filial-det-info">
                <div class="filial-det-lbl">Atividades</div>
                <div class="filial-det-val">${data.totalAtividades}</div>
              </div>
            </div>
          </div>

          <h4 class="filial-modal-section-title"><i data-lucide="trophy"></i> Ranking de Padeiros</h4>
          <div class="filial-table-container mb-6" style="max-height:300px; overflow-y:auto;">
            <table class="filial-table">
              <thead>
                <tr>
                  <th>Padeiro</th>
                  <th class="text-right">Produção</th>
                  <th class="text-right">Nota</th>
                </tr>
              </thead>
              <tbody>
                ${data.padeiros.map(p => `
                  <tr>
                    <td>
                      <div class="flex items-center gap-2">
                        ${Components.avatar(p.nome, 'avatar-xs')}
                        <span style="font-weight: 600;">${p.nome}</span>
                      </div>
                    </td>
                    <td class="text-right font-bold">
                      <div style="color:#1C7EF2; font-size:13px;">${p.kgTotal} kg</div>
                      <div style="color:#AF52DE; font-size:11px; font-weight:700;">${p.lTotal} L</div>
                    </td>
                    <td class="text-right">${p.notaMedia ? Components.starsDisplay(p.notaMedia) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <h4 class="filial-modal-section-title"><i data-lucide="clock"></i> Atividades Recentes</h4>
          <div class="recent-list" style="max-height:250px; overflow-y:auto; padding-right: 4px;">
            ${data.atividadesRecentes.length === 0 ? '<p class="text-tertiary" style="text-align:center; padding: 20px;">Nenhuma atividade recente.</p>' : 
              data.atividadesRecentes.map(a => `
                <div class="filial-activity-item">
                  <div class="filial-act-info">
                    <div class="filial-act-title">${a.clienteNome}</div>
                    <div class="filial-act-sub">${a.padeiroNome} • ${new Date(a.inicioEm).toLocaleDateString()}</div>
                  </div>
                  <div class="filial-act-badges">
                    <span class="badge-kg">${a.kgTotal || 0} kg</span>
                    <span class="badge-l">${a.lTotal || 0} L</span>
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      `;
      
      Components.showModal(`Detalhes: ${nome}`, content);
      Components.renderIcons();
    } catch (error) {
      Components.toast(`Erro ao carregar detalhes: ${error.message}`, 'error');
      Components.closeModal();
    }
  }
};
