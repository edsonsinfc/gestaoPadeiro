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
        <button class="btn btn-primary desktop-only" onclick="Relatorios.gerarPDF()">
          <i data-lucide="printer"></i> Imprimir Relatório
        </button>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-8 summary-grid">
        ${this.renderSummaryCards()}
      </div>

      <div class="grid grid-cols-2 gap-6 mb-8 charts-grid">
        <div class="card">
          <h3 class="card-title"><i data-lucide="bar-chart-3"></i> Produção por Padeiro</h3>
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
    const totalLitros = data.atividades.reduce((acc, curr) => acc + (parseFloat(curr.lTotal) || 0), 0);
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
            <h2 class="summary-value" style="font-size: 20px; line-height: 1.2;">
              <span style="color:#1C7EF2;">${totalKg.toFixed(1)} <span style="font-size: 11px; font-weight: 500;">kg</span></span>
              <span style="color:#8E8E93; font-size:14px; font-weight:400; margin: 0 2px;">/</span>
              <span style="color:#AF52DE;">${totalLitros.toFixed(1)} <span style="font-size: 11px; font-weight: 500;">L</span></span>
            </h2>
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
      stats[p.id] = { nome: p.nome, kg: 0, litros: 0, notas: [], metas: 0 };
    });

    data.atividades.forEach(a => {
      if (stats[a.padeiroId]) {
        stats[a.padeiroId].kg += parseFloat(a.kgTotal) || 0;
        stats[a.padeiroId].litros += parseFloat(a.lTotal) || 0;
      }
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
        <td>
          <div style="color:#1C7EF2; font-size:13px; font-weight:700;">${r.kg.toFixed(1)} kg</div>
          <div style="color:#AF52DE; font-size:11px; font-weight:600; margin-top:2px;">${r.litros.toFixed(1)} L</div>
        </td>
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
    const prodByPadeiroKg = {};
    const prodByPadeiroL = {};
    data.atividades.forEach(a => {
      const name = a.padeiroNome || 'Outros';
      prodByPadeiroKg[name] = (prodByPadeiroKg[name] || 0) + (parseFloat(a.kgTotal) || 0);
      prodByPadeiroL[name] = (prodByPadeiroL[name] || 0) + (parseFloat(a.lTotal) || 0);
    });

    const labelsProd = Object.keys(prodByPadeiroKg);
    const valuesProdKg = Object.values(prodByPadeiroKg);
    const valuesProdL = Object.values(prodByPadeiroL);

    new Chart(document.getElementById('chart-producao'), {
      type: 'bar',
      data: {
        labels: labelsProd,
        datasets: [
          {
            label: 'Produção (kg)',
            data: valuesProdKg,
            backgroundColor: 'rgba(28, 126, 242, 0.8)',
            borderColor: '#1C7EF2',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.45,
            categoryPercentage: 0.7
          },
          {
            label: 'Produção (L)',
            data: valuesProdL,
            backgroundColor: 'rgba(175, 82, 222, 0.8)',
            borderColor: '#AF52DE',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.45,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
          y: { beginAtZero: true, grid: { display: false } },
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
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
  },

  async gerarPDF() {
    // 1. Abrir janela em branco imediatamente no clique para contornar bloqueador de pop-ups
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Preparando Impressão...</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #f4f4f7;
                color: #333;
              }
              .loader {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #1C7EF2;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin-bottom: 16px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              p {
                font-size: 16px;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="loader"></div>
            <p>Gerando relatório de desempenho...</p>
          </body>
        </html>
      `);
    }

    try {
      // 2. Carregar a logo da Brago de forma assíncrona
      const loadLogo = () => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = '/assets/logo.svg';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              // viewBox da logo: 465.12 x 142.58. Multiplicamos por 2 para boa resolução.
              canvas.width = 930;
              canvas.height = 285;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, 930, 285);
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error('Erro ao processar logo no canvas:', e);
              resolve(null);
            }
          };
          img.onerror = () => {
            console.warn('Erro ao carregar o logo da Brago.');
            resolve(null);
          };
        });
      };

      const logoPngData = await loadLogo();

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210, pageH = 297, margin = 14;
      
      const filtroLabel = this.currentFilter === '7d' ? 'Últimos 7 dias' : this.currentFilter === '30d' ? 'Últimos 30 dias' : 'Período Total';
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      const dataHoraGeracao = new Date().toLocaleString('pt-BR');
      const anoAtual = new Date().getFullYear();

      // 1. Capturar gráficos como imagem ANTES de gerar o doc
      const canvasBarras = document.getElementById('chart-producao');
      const canvasLinha = document.getElementById('chart-notas');
      
      if (!canvasBarras || !canvasLinha) {
        Components.toast('Erro ao capturar os gráficos da tela.', 'error');
        if (printWindow) printWindow.close();
        return;
      }
      
      const imgBarras = canvasBarras.toDataURL('image/png');
      const imgLinha = canvasLinha.toDataURL('image/png');

      // Calcular métricas
      const data = this.getFilteredData();
      const totalKg = data.atividades.reduce((acc, curr) => acc + (parseFloat(curr.kgTotal) || 0), 0);
      const totalLitros = data.atividades.reduce((acc, curr) => acc + (parseFloat(curr.lTotal) || 0), 0);
      const validAvaliacoes = data.avaliacoes.filter(a => !isNaN(parseFloat(a.nota)) && parseFloat(a.nota) <= 5);
      const avgNota = validAvaliacoes.length > 0 
        ? validAvaliacoes.reduce((acc, curr) => acc + parseFloat(curr.nota), 0) / validAvaliacoes.length 
        : 0;
      const visitasCount = data.atividades.length;
      const metasAtingidas = data.metas.filter(m => (m.produzido || 0) >= (m.quantidade || 0)).length;

      // --- HELPERS DE RENDERIZAÇÃO ---
      
      const renderHeader = (pNum) => {
        if (logoPngData) {
          // A logo tem proporção ~3.26:1. Se altura for 10mm, a largura é 32.6mm
          doc.addImage(logoPngData, 'PNG', margin, 8, 32.6, 10);
        } else {
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(18);
          doc.setTextColor(17, 24, 39); // #111827
          doc.text('Brago', margin, 18);
        }
        
        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.text('Relatório Administrativo', pageW / 2, 18, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(107, 114, 128); // #6B7280
        doc.text(`${filtroLabel}  |  Gerado em ${dataGeracao}`, pageW - margin, 18, { align: 'right' });
        
        // Linha separadora sutil
        doc.setDrawColor(229, 231, 235); // #E5E7EB
        doc.setLineWidth(0.5);
        doc.line(margin, 22, pageW - margin, 22);
      };

      const renderFooter = (pNum, totalP) => {
        // Linha separadora
        doc.setDrawColor(229, 231, 235); // #E5E7EB
        doc.setLineWidth(0.5);
        doc.line(margin, pageH - 18, pageW - margin, pageH - 18);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128); // #6B7280
        doc.text(`Brago Distribuidora © ${anoAtual} — Gerado em ${dataHoraGeracao}`, margin, pageH - 12);
        doc.text(`Página ${pNum} de ${totalP}`, pageW - margin, pageH - 12, { align: 'right' });
      };

      // --- PÁGINA 1 ---
      
      // GRID DE MÉTRICAS (2 colunas x 2 linhas)
      const cardW = (pageW - margin * 2 - 8) / 2; // ~87mm
      const cardH = 26;
      const startX = margin;
      const startY = 28;
      
      const metrics = [
        {
          label: 'PRODUÇÃO TOTAL',
          value: `${totalKg.toFixed(1)}`,
          unit: 'kg',
          value2: `${totalLitros.toFixed(1)}`,
          unit2: 'L',
          iconColor: [37, 99, 235]
        },
        {
          label: 'MÉDIA AVALIAÇÕES',
          value: `${avgNota.toFixed(1)}`,
          unit: '/ 5.0',
          iconColor: [245, 158, 11]
        },
        {
          label: 'METAS ATINGIDAS',
          value: `${metasAtingidas}`,
          unit: 'metas',
          iconColor: [16, 185, 129]
        },
        {
          label: 'TOTAL VISITAS',
          value: `${visitasCount}`,
          unit: 'locais',
          iconColor: [175, 82, 222]
        }
      ];

      metrics.forEach((m, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = startX + col * (cardW + 8);
        const y = startY + row * (cardH + 6);
        
        // Fundo do card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
        
        // Ícone decorativo lateral
        doc.setFillColor(m.iconColor[0], m.iconColor[1], m.iconColor[2]);
        doc.roundedRect(x + cardW - 12, y + 6, 6, 14, 1, 1, 'F');

        // Texto
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text(m.label, x + 6, y + 8);
        
        doc.setFontSize(18);
        doc.setTextColor(17, 24, 39);
        
        if (m.label === 'PRODUÇÃO TOTAL') {
          doc.setFontSize(14);
          doc.setTextColor(37, 99, 235);
          doc.text(m.value, x + 6, y + 18);
          let offset = doc.getTextWidth(m.value) + 1;
          doc.setFontSize(9);
          doc.setFont('Helvetica', 'normal');
          doc.text(m.unit, x + 6 + offset, y + 18);
          offset += doc.getTextWidth(m.unit) + 2;
          
          doc.setFontSize(12);
          doc.setTextColor(107, 114, 128);
          doc.text('/', x + 6 + offset, y + 18);
          offset += 3;
          
          doc.setFontSize(14);
          doc.setTextColor(175, 82, 222);
          doc.setFont('Helvetica', 'bold');
          doc.text(m.value2, x + 6 + offset, y + 18);
          offset += doc.getTextWidth(m.value2) + 1;
          doc.setFontSize(9);
          doc.setFont('Helvetica', 'normal');
          doc.text(m.unit2, x + 6 + offset, y + 18);
        } else {
          doc.text(m.value, x + 6, y + 18);
          const offset = doc.getTextWidth(m.value) + 2;
          doc.setFontSize(10);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(107, 114, 128);
          doc.text(m.unit, x + 6 + offset, y + 18);
        }
      });

      // TÍTULO GRÁFICO DE BARRAS — "Produção por Padeiro"
      const chart1Y = startY + cardH * 2 + 15;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, chart1Y - 4, 3, 5, 'F');
      doc.text('Produção por Padeiro', margin + 6, chart1Y);

      // Legenda (kg / L) acima do gráfico
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(107, 114, 128);
      // kg box
      doc.setFillColor(28, 126, 242);
      doc.rect(pageW - margin - 50, chart1Y - 3.5, 3, 3, 'F');
      doc.text('Produção (kg)', pageW - margin - 45, chart1Y - 1);
      // L box
      doc.setFillColor(175, 82, 222);
      doc.rect(pageW - margin - 22, chart1Y - 3.5, 3, 3, 'F');
      doc.text('Produção (L)', pageW - margin - 17, chart1Y - 1);

      // Helper function to scale charts preserving aspect ratio
      const fitImage = (canvas, maxW, maxH) => {
        const aspect = canvas.width / canvas.height;
        let w = maxW;
        let h = w / aspect;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        return { w, h };
      };

      // Imagem do Gráfico de Barras com borda sutil e aspect ratio preservado
      const sizeBarras = fitImage(canvasBarras, pageW - margin * 2 - 8, 110);
      const xBarras = margin + 4 + (pageW - margin * 2 - 8 - sizeBarras.w) / 2;

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, chart1Y + 4, pageW - margin * 2, sizeBarras.h + 8, 2, 2, 'FD');
      
      doc.addImage(imgBarras, 'PNG', xBarras, chart1Y + 8, sizeBarras.w, sizeBarras.h);

      // --- PÁGINA 2 ---
      doc.addPage();

      // TÍTULO GRÁFICO DE LINHA — "Evolução de Avaliações"
      const chart2Y = 28;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.setFillColor(245, 158, 11);
      doc.rect(margin, chart2Y - 4, 3, 5, 'F');
      doc.text('Evolução de Avaliações', margin + 6, chart2Y);

      // Imagem do Gráfico de Linhas com fundo bege suave #FFF7ED e aspect ratio preservado
      const sizeLinha = fitImage(canvasLinha, pageW - margin * 2 - 8, 65);
      const xLinha = margin + 4 + (pageW - margin * 2 - 8 - sizeLinha.w) / 2;

      doc.setDrawColor(254, 215, 170);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 247, 237);
      doc.roundedRect(margin, chart2Y + 4, pageW - margin * 2, sizeLinha.h + 8, 2, 2, 'FD');
      
      doc.addImage(imgLinha, 'PNG', xLinha, chart2Y + 8, sizeLinha.w, sizeLinha.h);

      // TÍTULO TABELA DE RANKING (calculado dinamicamente com base no tamanho do gráfico)
      const tableY = chart2Y + 4 + sizeLinha.h + 8 + 12;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, tableY - 4, 3, 5, 'F');
      doc.text('Ranking de Desempenho', margin + 6, tableY);

      // Processar ranking de padeiros
      const stats = {};
      data.padeiros.forEach(p => {
        stats[p.id] = { nome: p.nome, kg: 0, litros: 0, notas: [], metas: 0 };
      });
      data.atividades.forEach(a => {
        if (stats[a.padeiroId]) {
          stats[a.padeiroId].kg += parseFloat(a.kgTotal) || 0;
          stats[a.padeiroId].litros += parseFloat(a.lTotal) || 0;
        }
      });
      data.avaliacoes.forEach(a => {
        const nota = parseFloat(a.nota);
        if (stats[a.padeiroId] && !isNaN(nota) && nota <= 5) {
          stats[a.padeiroId].notesSum = (stats[a.padeiroId].notesSum || 0) + nota;
          stats[a.padeiroId].notesCount = (stats[a.padeiroId].notesCount || 0) + 1;
        }
      });
      data.metas.forEach(m => {
        if (stats[m.padeiroId] && (m.produzido || 0) >= (m.quantidade || 0)) stats[m.padeiroId].metas++;
      });
      
      const ranking = Object.values(stats).map(s => {
        const avg = s.notesCount && s.notesCount > 0 ? s.notesSum / s.notesCount : 0;
        const score = (s.kg / 10) + (avg * 2) + (s.metas * 5);
        return { ...s, avg, score };
      }).sort((a,b) => b.score - a.score);

      // Renderizar Tabela de Ranking via jsPDF-AutoTable
      const tableRows = ranking.map((r, idx) => {
        const posStr = `${idx + 1}°`;
        const roundedAvg = Math.round(r.avg);
        const starsStr = '★'.repeat(roundedAvg) + '☆'.repeat(5 - roundedAvg);
        const nameShort = r.nome.length > 20 ? r.nome.substring(0, 18) + '...' : r.nome;
        return [
          posStr,
          nameShort,
          `${r.kg.toFixed(1)} kg / ${r.litros.toFixed(1)} L`,
          `${r.avg.toFixed(1)} ${starsStr}`,
          `${r.metas} atingidas`,
          `${r.score.toFixed(0)} pts`
        ];
      });

      doc.autoTable({
        startY: tableY + 4,
        margin: { left: margin, right: margin, top: 25, bottom: 20 },
        head: [['POS.', 'PADEIRO', 'PRODUÇÃO (KG / L)', 'MÉDIA NOTA', 'METAS', 'SCORE']],
        body: tableRows,
        theme: 'plain',
        headStyles: {
          fillColor: [243, 244, 246], // #F3F4F6
          textColor: [17, 24, 39],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left',
          valign: 'middle'
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          fontSize: 8.5,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 12, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 42, fontStyle: 'bold' },
          2: { cellWidth: 42 },
          3: { cellWidth: 32 },
          4: { cellWidth: 28 },
          5: { cellWidth: 26, fontStyle: 'bold', halign: 'right', textColor: [37, 99, 235] }
        },
        didParseCell: function (data) {
          if (data.section === 'body') {
            // Alternate rows color
            if (data.row.index % 2 === 1) {
              data.cell.styles.fillColor = [249, 250, 251]; // #F9FAFB
            }
            
            // Format position column
            if (data.column.index === 0) {
              const pos = data.row.index + 1;
              if (pos === 1) {
                data.cell.styles.fillColor = [254, 243, 199];
                data.cell.styles.textColor = [180, 83, 9];
              } else if (pos === 2) {
                data.cell.styles.fillColor = [243, 244, 246];
                data.cell.styles.textColor = [75, 85, 99];
              } else if (pos === 3) {
                data.cell.styles.fillColor = [255, 237, 213];
                data.cell.styles.textColor = [194, 65, 12];
              } else {
                data.cell.styles.textColor = [107, 114, 128];
              }
            }
            
            // Format stars in Media Nota column
            if (data.column.index === 3) {
              data.cell.styles.textColor = [245, 158, 11];
            }
            
            // Format Metas column (like a pill badge)
            if (data.column.index === 4) {
              const textVal = data.cell.raw;
              const hasMetas = parseInt(textVal) > 0;
              if (hasMetas) {
                data.cell.styles.textColor = [6, 95, 70];
                data.cell.styles.fillColor = [209, 250, 229];
              } else {
                data.cell.styles.textColor = [107, 114, 128];
                data.cell.styles.fillColor = [243, 244, 246];
              }
            }
          }
        },
        styles: {
          cellPadding: 3.5,
          lineColor: [229, 231, 235],
          lineWidth: 0.1
        }
      });

      // Renderizar cabeçalhos e rodapés em todas as páginas no final de forma dinâmica
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        renderHeader(i);
        renderFooter(i, totalPages);
      }

      // Auto-print and display PDF in the pre-opened window
      doc.autoPrint();
      const blobUrl = doc.output('bloburl');
      if (printWindow) {
        printWindow.location.href = blobUrl;
      } else {
        // Se a janela foi bloqueada por algum motivo, baixa o arquivo
        doc.save(`relatorio-brago-${Date.now()}.pdf`);
      }
      Components.toast('✓ Relatório gerado para impressão!', 'success');
    } catch(e) {
      console.error("Erro ao gerar PDF:", e);
      if (printWindow) printWindow.close();
      Components.toast('Erro ao gerar PDF: ' + e.message, 'error');
    }
  }
};
