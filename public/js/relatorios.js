/**
 * Relatórios Module - Production, Ratings, Goals, and Visits
 * BRAGO Sistema Padeiro
 */
window.Relatorios = {
  currentFilter: '7d', // 7d, 30d, custom
  allData: { atividades: [], metas: [], avaliacoes: [], padeiros: [] },

  renderStyles() {
    if (document.getElementById('relatorios-css')) return;
    const style = document.createElement('style');
    style.id = 'relatorios-css';
    style.innerHTML = `
      .relatorios-view { padding: 24px; }
      .summary-card { padding: 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); }
      .summary-label { font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 4px; }
      .summary-value { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0; }
      .summary-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
      .summary-icon i { width: 22px; height: 22px; }
      
      @media (max-width: 430px) {
        .relatorios-view { padding: 16px; }
        .summary-grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
        .charts-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        .summary-value { font-size: 20px; }
        .summary-card { padding: 12px; }
        .relatorios-header-main { margin-bottom: 20px !important; }
      }
      
      @media print {
        .sidebar, .top-header, .segmented-control, .btn, .ios-header { display: none !important; }
        .main-content { margin: 0 !important; padding: 0 !important; width: 100% !important; }
        .relatorios-view { padding: 0 !important; }
        .card { box-shadow: none !important; border: 1px solid #eee !important; page-break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
  },

  async render() {
    this.renderStyles();
    const c = document.getElementById('page-container');
    c.innerHTML = Components.loading();
    try {
      const [atividades, metas, avaliacoes, padeiros] = await Promise.all([
        API.get('/api/atividades'),
        API.get('/api/metas'),
        API.get('/api/avaliacoes'),
        API.get('/api/padeiros')
      ]);
      this.allData = { atividades, metas, avaliacoes, padeiros };
      this.renderContent(c);
    } catch(e) { 
      c.innerHTML = `<div class="toast error">Erro ao carregar dados: ${e.message}</div>`; 
    }
  },

  renderContent(c) {
    c.innerHTML = `
    <div class="fade-in relatorios-view">
      <div class="flex justify-between items-center mb-6 relatorios-header-main">
        <h1 class="page-title desktop-only" style="margin-bottom:0;">Relatórios Administrativos</h1>
        <div class="segmented-control" style="max-width: 400px;">
          <div class="segmented-slider" style="width: 33.33%; transform: translateX(${this.currentFilter === '30d' ? '100%' : this.currentFilter === 'custom' ? '200%' : '0'})"></div>
          <div class="segmented-item ${this.currentFilter==='7d'?'active':''}" onclick="Relatorios.setFilter('7d')">7 Dias</div>
          <div class="segmented-item ${this.currentFilter==='30d'?'active':''}" onclick="Relatorios.setFilter('30d')">30 Dias</div>
          <div class="segmented-item ${this.currentFilter==='custom'?'active':''}" onclick="Relatorios.setFilter('custom')">Total</div>
        </div>
        <button class="btn btn-primary desktop-only" onclick="window.print()">
          <i data-lucide="printer"></i> Imprimir Relatório
        </button>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-8 summary-grid">
        ${this.renderSummaryCards()}
      </div>

      <div class="grid grid-cols-2 gap-6 mb-8 charts-grid">
        <div class="card">
          <h3 class="card-title"><i data-lucide="bar-chart-3"></i> Produção por Padeiro (kg)</h3>
          <div style="height: 300px;"><canvas id="chart-producao"></canvas></div>
        </div>
        <div class="card">
          <h3 class="card-title"><i data-lucide="trending-up"></i> Evolução de Avaliações</h3>
          <div style="height: 300px;"><canvas id="chart-notas"></canvas></div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 mb-8">
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title"><i data-lucide="award"></i> Ranking de Desempenho</h3>
            <span class="text-tertiary" style="font-size: 12px;">Baseado em produção e notas</span>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Padeiro</th>
                  <th>Produção Total</th>
                  <th>Média Nota</th>
                  <th>Metas Atingidas</th>
                  <th style="text-align: right;">Score Geral</th>
                </tr>
              </thead>
              <tbody>
                ${this.renderRankingTable()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-6">
        <div class="card">
          <h3 class="card-title"><i data-lucide="target"></i> Status das Metas</h3>
          <div class="table-responsive">
            <table>
              <thead>
                <tr><th>Meta</th><th>Progresso</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${this.renderMetasSummary()}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <h3 class="card-title"><i data-lucide="map-pin"></i> Visitas a Clientes</h3>
          <div class="table-responsive">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Visitas</th><th>Última Nota</th></tr>
              </thead>
              <tbody>
                ${this.renderVisitasSummary()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

    this.initCharts();
    Components.renderIcons();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    this.render();
  },

  getFilteredData() {
    const now = new Date();
    let days = 0;
    if (this.currentFilter === '7d') days = 7;
    else if (this.currentFilter === '30d') days = 30;
    
    if (days === 0) return this.allData;

    const cutoff = new Date(now.setDate(now.getDate() - days));
    
    return {
      atividades: this.allData.atividades.filter(a => new Date(a.inicioEm || a.data) >= cutoff),
      metas: this.allData.metas.filter(m => new Date(m.dataCriacao || m.criadoEm || Date.now()) >= cutoff),
      avaliacoes: this.allData.avaliacoes.filter(a => new Date(a.criadoEm) >= cutoff),
      padeiros: this.allData.padeiros
    };
  },

  renderSummaryCards() {
    const data = this.getFilteredData();
    const totalKg = data.atividades.reduce((acc, curr) => acc + (parseFloat(curr.kgTotal) || 0), 0);
    const validAvaliacoes = data.avaliacoes.filter(a => !isNaN(parseFloat(a.nota)) && parseFloat(a.nota) <= 5);
    const avgNota = validAvaliacoes.length > 0 
      ? validAvaliacoes.reduce((acc, curr) => acc + parseFloat(curr.nota), 0) / validAvaliacoes.length 
      : 0;
    const visitasCount = data.atividades.length;
    const metasAtingidas = data.metas.filter(m => (m.produzido || 0) >= (m.quantidade || 0)).length;

    return `
      <div class="card summary-card">
        <div class="flex justify-between items-start">
          <div>
            <p class="summary-label">Produção Total</p>
            <h2 class="summary-value">${totalKg.toFixed(1)} <span style="font-size: 14px; font-weight: 500;">kg</span></h2>
          </div>
          <div class="summary-icon" style="background: rgba(28, 75, 255, 0.1); color: var(--primary);">
            <i data-lucide="package"></i>
          </div>
        </div>
      </div>
      <div class="card summary-card">
        <div class="flex justify-between items-start">
          <div>
            <p class="summary-label">Média Avaliações</p>
            <h2 class="summary-value">${avgNota.toFixed(1)} <span style="font-size: 14px; font-weight: 500;">/ 5</span></h2>
          </div>
          <div class="summary-icon" style="background: rgba(255, 149, 0, 0.1); color: #FF9500;">
            <i data-lucide="star"></i>
          </div>
        </div>
      </div>
      <div class="card summary-card">
        <div class="flex justify-between items-start">
          <div>
            <p class="summary-label">Metas Atingidas</p>
            <h2 class="summary-value">${metasAtingidas} <span style="font-size: 14px; font-weight: 500;">metas</span></h2>
          </div>
          <div class="summary-icon" style="background: rgba(52, 199, 89, 0.1); color: #34C759;">
            <i data-lucide="target"></i>
          </div>
        </div>
      </div>
      <div class="card summary-card">
        <div class="flex justify-between items-start">
          <div>
            <p class="summary-label">Total Visitas</p>
            <h2 class="summary-value">${visitasCount} <span style="font-size: 14px; font-weight: 500;">locais</span></h2>
          </div>
          <div class="summary-icon" style="background: rgba(175, 82, 222, 0.1); color: #AF52DE;">
            <i data-lucide="map-pin"></i>
          </div>
        </div>
      </div>
    `;
  },

  renderRankingTable() {
    const data = this.getFilteredData();
    const stats = {};

    data.padeiros.forEach(p => {
      stats[p.id] = { nome: p.nome, kg: 0, notas: [], metas: 0 };
    });

    data.atividades.forEach(a => {
      if (stats[a.padeiroId]) stats[a.padeiroId].kg += parseFloat(a.kgTotal) || 0;
    });

    data.avaliacoes.forEach(a => {
      const nota = parseFloat(a.nota);
      if (stats[a.padeiroId] && !isNaN(nota) && nota <= 5) {
        stats[a.padeiroId].notas.push(nota);
      }
    });

    data.metas.forEach(m => {
      if (stats[m.padeiroId] && (m.produzido || 0) >= (m.quantidade || 0)) stats[m.padeiroId].metas++;
    });

    const ranking = Object.values(stats).map(s => {
      const avg = s.notas.length > 0 ? s.notas.reduce((a,b)=>a+b,0) / s.notas.length : 0;
      // Score calculation: (kg/10) + (avg*2) + (metas*5)
      const score = (s.kg / 10) + (avg * 2) + (s.metas * 5);
      return { ...s, avg, score };
    }).sort((a,b) => b.score - a.score);

    return ranking.map(r => `
      <tr>
        <td style="font-weight: 600;">${r.nome}</td>
        <td>${r.kg.toFixed(1)} kg</td>
        <td>
          <div class="flex items-center gap-2">
            <span style="font-weight: 700; color: var(--primary);">${r.avg.toFixed(1)}</span>
            <div style="display:flex; gap:1px;">
              ${[1,2,3,4,5].map(i => `<i data-lucide="star" size="10" style="color: ${i <= Math.round(r.avg) ? '#F59E0B' : '#E5E7EB'}; fill: ${i <= Math.round(r.avg) ? '#F59E0B' : 'transparent'};"></i>`).join('')}
            </div>
          </div>
        </td>
        <td><span class="badge badge-secondary">${r.metas} atingidas</span></td>
        <td style="text-align: right;"><span class="badge badge-primary" style="font-weight: 800;">${r.score.toFixed(0)} pts</span></td>
      </tr>
    `).join('');
  },

  renderMetasSummary() {
    const data = this.getFilteredData();
    return data.metas.slice(0, 5).map(m => {
      const pct = Math.min(100, Math.round(((m.produzido || 0) / (m.quantidade || 1)) * 100));
      return `
        <tr>
          <td style="font-size: 13px; font-weight: 500;">${m.produtoNome || '—'}</td>
          <td>
            <div style="width: 100%; height: 6px; background: #E5E5EA; border-radius: 3px; overflow: hidden; margin-top: 4px;">
              <div style="width: ${pct}%; height: 100%; background: var(--primary); border-radius: 3px;"></div>
            </div>
            <span style="font-size: 10px; color: var(--text-tertiary);">${m.produzido || 0} / ${m.quantidade || 0} kg</span>
          </td>
          <td><span class="badge badge-${pct >= 100 ? 'success' : 'amber'}">${pct}%</span></td>
        </tr>
      `;
    }).join('') || '<tr><td colspan="3" class="text-tertiary">Sem metas no período.</td></tr>';
  },

  renderVisitasSummary() {
    const data = this.getFilteredData();
    const cliVisits = {};
    data.atividades.forEach(a => {
      if (!cliVisits[a.clienteId]) cliVisits[a.clienteId] = { nome: a.clienteNome, count: 0, lastNota: 0 };
      cliVisits[a.clienteId].count++;
    });
    
    data.avaliacoes.filter(av => av.tipo === 'cliente').forEach(av => {
      if (cliVisits[av.clienteId]) cliVisits[av.clienteId].lastNota = av.nota;
    });

    return Object.values(cliVisits).slice(0, 5).map(v => `
      <tr>
        <td style="font-size: 13px; font-weight: 500;">${v.nome}</td>
        <td><span class="badge badge-secondary">${v.count} visitas</span></td>
        <td><span style="font-weight: 700; color: #FF9500;">${v.lastNota ? Number(v.lastNota).toFixed(1) : '—'}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="3" class="text-tertiary">Sem visitas no período.</td></tr>';
  },

  initCharts() {
    const data = this.getFilteredData();
    
    // Chart Produção por Padeiro
    const prodByPadeiro = {};
    data.atividades.forEach(a => {
      const name = a.padeiroNome || 'Outros';
      prodByPadeiro[name] = (prodByPadeiro[name] || 0) + (parseFloat(a.kgTotal) || 0);
    });

    const labelsProd = Object.keys(prodByPadeiro);
    const valuesProd = Object.values(prodByPadeiro);

    new Chart(document.getElementById('chart-producao'), {
      type: 'bar',
      data: {
        labels: labelsProd,
        datasets: [{
          label: 'Produção (kg)',
          data: valuesProd,
          backgroundColor: 'rgba(28, 75, 255, 0.6)',
          borderColor: 'var(--primary)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
      }
    });

    // Chart Evolução Notas
    const notasByDay = {};
    data.avaliacoes.forEach(av => {
      const day = new Date(av.criadoEm).toLocaleDateString('pt-BR');
      if (!notasByDay[day]) notasByDay[day] = { sum: 0, count: 0 };
      notasByDay[day].sum += parseFloat(av.nota) || 0;
      notasByDay[day].count++;
    });

    const labelsNotes = Object.keys(notasByDay).sort((a,b) => new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-')));
    const valuesNotes = labelsNotes.map(l => notasByDay[l].sum / notasByDay[l].count);

    new Chart(document.getElementById('chart-notas'), {
      type: 'line',
      data: {
        labels: labelsNotes,
        datasets: [{
          label: 'Média Nota',
          data: valuesNotes,
          borderColor: '#FF9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#FF9500'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 5, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }
      }
    });
  }
};
