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
          .filiais-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; padding: 20px 0; }
          .filial-card { 
            background: white; border-radius: 20px; padding: 24px; 
            box-shadow: var(--shadow-md); border: 1px solid var(--separator);
            transition: transform 0.2s;
          }
          .filial-card:hover { transform: translateY(-4px); }
          .filial-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .filial-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
          .filial-metric { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--apple-separator); }
          .filial-metric:last-child { border-bottom: none; }
          .metric-label { color: var(--text-secondary); font-size: 14px; }
          .metric-value { font-weight: 600; color: var(--primary); }
          .health-indicator { width: 12px; height: 12px; border-radius: 50%; }
          .health-good { background: var(--success); box-shadow: 0 0 8px var(--success); }
          .health-warning { background: var(--apple-orange); box-shadow: 0 0 8px var(--apple-orange); }
          .health-bad { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
        </style>
        <div class="filiais-page fade-in">
          <div class="flex justify-between items-center mb-6">
            <h2 class="page-title">Saúde das Filiais</h2>
          </div>
          
          <div class="filiais-grid">
            ${data.map(f => {
              const score = parseFloat(f.notaMedia);
              const healthClass = score >= 4.5 ? 'health-good' : score >= 3.5 ? 'health-warning' : 'health-bad';
              
              return `
              <div class="filial-card">
                <div class="filial-header">
                  <div class="filial-name">${f.nome}</div>
                  <div class="health-indicator ${healthClass}"></div>
                </div>
                <div class="filial-body">
                  <div class="filial-metric">
                    <span class="metric-label">Padeiros Ativos</span>
                    <span class="metric-value">${f.totalPadeiros}</span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label">Produção Total</span>
                    <span class="metric-value">${f.kgTotal} kg</span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label">Atividades</span>
                    <span class="metric-value">${f.totalAtividades}</span>
                  </div>
                  <div class="filial-metric">
                    <span class="metric-label">Média Avaliações</span>
                    <span class="metric-value" style="display: flex; align-items: center; gap: 4px;">
                      ${f.notaMedia} <i data-lucide="star" style="width:14px; color:#FFD60A; fill:#FFD60A"></i>
                    </span>
                  </div>
                </div>
                <button class="btn btn-ghost w-full mt-4" style="font-size: 13px;" onclick="Filiais.viewDetails('${f.nome}')">
                  Ver Detalhes <i data-lucide="chevron-right"></i>
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
            <div class="metric-card" style="background:#f8f9fa; padding:12px; border-radius:12px; text-align:center;">
              <div style="font-size:12px; color:var(--text-secondary);">Padeiros</div>
              <div style="font-size:20px; font-weight:700;">${data.totalPadeiros}</div>
            </div>
            <div class="metric-card" style="background:#f8f9fa; padding:12px; border-radius:12px; text-align:center;">
              <div style="font-size:12px; color:var(--text-secondary);">Produção</div>
              <div style="font-size:20px; font-weight:700; color:var(--primary);">${data.kgTotal} kg</div>
            </div>
            <div class="metric-card" style="background:#f8f9fa; padding:12px; border-radius:12px; text-align:center;">
              <div style="font-size:12px; color:var(--text-secondary);">Atividades</div>
              <div style="font-size:20px; font-weight:700;">${data.totalAtividades}</div>
            </div>
          </div>

          <h4 class="mb-3">Ranking de Padeiros</h4>
          <div class="table-container mb-6" style="max-height:300px; overflow-y:auto;">
            <table class="data-table">
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
                        <span>${p.nome}</span>
                      </div>
                    </td>
                    <td class="text-right font-bold">${p.kgTotal} kg</td>
                    <td class="text-right">${p.notaMedia ? Components.starsDisplay(p.notaMedia) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <h4 class="mb-3">Atividades Recentes</h4>
          <div class="recent-list" style="max-height:250px; overflow-y:auto;">
            ${data.atividadesRecentes.length === 0 ? '<p class="text-tertiary">Nenhuma atividade recente.</p>' : 
              data.atividadesRecentes.map(a => `
                <div class="flex justify-between items-center py-2 border-bottom">
                  <div>
                    <div class="font-bold" style="font-size:13px;">${a.clienteNome}</div>
                    <div class="text-xs text-tertiary">${a.padeiroNome} • ${new Date(a.inicioEm).toLocaleDateString()}</div>
                  </div>
                  <div class="badge badge-blue">${a.kgTotal || 0} kg</div>
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
