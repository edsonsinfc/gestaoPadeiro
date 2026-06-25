/**
 * Auditoria - Compliance & Audit Dashboard
 * BRAGO Sistema Padeiro
 * 
 * Prova que a não-utilização do sistema é por escolha do padeiro,
 * não por ineficiência do sistema.
 */
const Auditoria = {
  currentTab: 'dashboard',
  dashboardData: null,
  logsData: null,
  logsPage: 1,
  engagementChart: null,
  detailChart: null,
  filiais: [],

  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();

    try {
      // Load dashboard data
      this.dashboardData = await API.get('/api/auditoria/dashboard?periodo=30');
      
      // Extract unique filiais
      this.filiais = [...new Set(
        (this.dashboardData.statusPadeiros || [])
          .map(p => p.filial)
          .filter(Boolean)
      )].sort();

      container.innerHTML = this.renderLayout();
      Components.renderIcons();
      this.renderTab();
    } catch (error) {
      console.error('[AUDITORIA] Erro ao carregar:', error);
      container.innerHTML = Components.empty('alert-circle', 'Erro ao carregar auditoria. Verifique sua conexão.');
    }
  },

  renderLayout() {
    return `
    <div class="auditoria-container" style="padding: 20px;">
      <!-- Tabs -->
      <div class="audit-tabs">
        <button class="audit-tab ${this.currentTab === 'dashboard' ? 'active' : ''}" 
                onclick="Auditoria.switchTab('dashboard')">
          <i data-lucide="shield-check" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i>
          Compliance
        </button>
        <button class="audit-tab ${this.currentTab === 'padeiros' ? 'active' : ''}" 
                onclick="Auditoria.switchTab('padeiros')">
          <i data-lucide="users" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i>
          Status Padeiros
        </button>
        <button class="audit-tab ${this.currentTab === 'logs' ? 'active' : ''}" 
                onclick="Auditoria.switchTab('logs')">
          <i data-lucide="scroll-text" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i>
          Log de Acessos
        </button>
      </div>

      <!-- Tab Content -->
      <div id="audit-tab-content"></div>
    </div>`;
  },

  switchTab(tab) {
    this.currentTab = tab;
    // Update tab styles
    document.querySelectorAll('.audit-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.audit-tab').forEach(t => {
      if (t.textContent.trim().includes(
        tab === 'dashboard' ? 'Compliance' : tab === 'padeiros' ? 'Status' : 'Log'
      )) t.classList.add('active');
    });
    this.renderTab();
  },

  renderTab() {
    const content = document.getElementById('audit-tab-content');
    if (!content) return;

    switch (this.currentTab) {
      case 'dashboard':
        content.innerHTML = this.renderDashboard();
        this.initEngagementChart();
        break;
      case 'padeiros':
        content.innerHTML = this.renderPadeirosStatus();
        break;
      case 'logs':
        this.loadLogs();
        break;
    }
    Components.renderIcons();
  },

  // ─── DASHBOARD TAB ──────────────────────────────────────────
  renderDashboard() {
    const d = this.dashboardData;
    if (!d) return Components.empty('alert-circle', 'Dados não disponíveis');

    const { hoje, periodo } = d;
    const taxaUso = hoje.totalPadeiros > 0 
      ? Math.round((hoje.padeirosComAtividade / hoje.totalPadeiros) * 100) 
      : 0;

    return `
    <!-- KPI Cards -->
    <div class="audit-kpi-grid">
      <div class="audit-kpi-card kpi-system">
        <div class="audit-kpi-icon icon-system">
          <i data-lucide="wifi" style="width:20px;height:20px;"></i>
        </div>
        <div class="audit-kpi-value">Online</div>
        <div class="audit-kpi-label">Sistema Operacional</div>
        <div class="audit-kpi-sublabel">Disponível para todos os padeiros</div>
      </div>

      <div class="audit-kpi-card kpi-logins">
        <div class="audit-kpi-icon icon-logins">
          <i data-lucide="log-in" style="width:20px;height:20px;"></i>
        </div>
        <div class="audit-kpi-value">${hoje.loginsHoje}</div>
        <div class="audit-kpi-label">Logins Hoje</div>
        <div class="audit-kpi-sublabel">${hoje.padeirosComAtividade} com atividade registrada</div>
      </div>

      <div class="audit-kpi-card kpi-inactive">
        <div class="audit-kpi-icon icon-inactive">
          <i data-lucide="user-x" style="width:20px;height:20px;"></i>
        </div>
        <div class="audit-kpi-value">${hoje.padeirosInativos}</div>
        <div class="audit-kpi-label">Não Logaram Hoje</div>
        <div class="audit-kpi-sublabel">de ${hoje.totalPadeiros} padeiros ativos</div>
      </div>

      <div class="audit-kpi-card kpi-warning">
        <div class="audit-kpi-icon icon-warning">
          <i data-lucide="alert-triangle" style="width:20px;height:20px;"></i>
        </div>
        <div class="audit-kpi-value">${hoje.logaramSemProduzir}</div>
        <div class="audit-kpi-label">Logaram Sem Produzir</div>
        <div class="audit-kpi-sublabel">Acessaram mas não registraram</div>
      </div>
    </div>

    <!-- Engagement Chart -->
    <div class="audit-chart-section">
      <div class="audit-chart-header">
        <h3>Engajamento: Logins vs Atividades (30 dias)</h3>
        <div class="audit-chart-legend">
          <span><span class="audit-legend-dot" style="background:#007AFF;"></span> Logins</span>
          <span><span class="audit-legend-dot" style="background:#34C759;"></span> Atividades</span>
        </div>
      </div>
      <div class="audit-chart-canvas-wrap">
        <canvas id="audit-engagement-chart"></canvas>
      </div>
    </div>

    <!-- Summary Info -->
    <div class="audit-chart-section">
      <div class="audit-section-title">
        <i data-lucide="info"></i>
        Resumo do Período (${periodo.dias} dias)
      </div>
      <div class="audit-kpi-grid" style="margin-bottom:0;">
        <div class="audit-kpi-card" style="border:none;background:var(--bg-secondary,#f5f5f7);">
          <div class="audit-kpi-value" style="font-size:24px;">${periodo.totalAtividades}</div>
          <div class="audit-kpi-label">Atividades Registradas</div>
        </div>
        <div class="audit-kpi-card" style="border:none;background:var(--bg-secondary,#f5f5f7);">
          <div class="audit-kpi-value" style="font-size:24px;">${periodo.falhasLogin}</div>
          <div class="audit-kpi-label">Tentativas com Senha Errada</div>
        </div>
        <div class="audit-kpi-card" style="border:none;background:var(--bg-secondary,#f5f5f7);">
          <div class="audit-kpi-value" style="font-size:24px;">${periodo.padeirosSemLogin.length}</div>
          <div class="audit-kpi-label">Nunca Logaram (${periodo.dias}d)</div>
        </div>
        <div class="audit-kpi-card" style="border:none;background:var(--bg-secondary,#f5f5f7);">
          <div class="audit-kpi-value" style="font-size:24px;">${taxaUso}%</div>
          <div class="audit-kpi-label">Taxa de Uso Hoje</div>
        </div>
      </div>

      ${periodo.padeirosSemLogin.length > 0 ? `
      <div style="margin-top:16px;">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">
          ⚠️ Padeiros que nunca logaram nos últimos ${periodo.dias} dias:
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${periodo.padeirosSemLogin.map(p => `
            <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:rgba(255,59,48,0.08);color:#FF3B30;border-radius:8px;font-size:12px;font-weight:500;">
              ${p.nome}${p.filial ? ` · ${p.filial}` : ''}
            </span>
          `).join('')}
        </div>
      </div>` : ''}
    </div>`;
  },

  initEngagementChart() {
    const canvas = document.getElementById('audit-engagement-chart');
    if (!canvas || !this.dashboardData) return;

    if (this.engagementChart) {
      this.engagementChart.destroy();
    }

    const { loginsPorDia, atividadesPorDia } = this.dashboardData.periodo;

    // Build date range for last 30 days
    const labels = [];
    const loginsMap = {};
    const atividadesMap = {};
    
    loginsPorDia.forEach(l => { loginsMap[l.dia] = l.total; });
    atividadesPorDia.forEach(a => { atividadesMap[a.dia] = a.total; });

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(key);
    }

    const loginsData = labels.map(l => loginsMap[l] || 0);
    const atividadesData = labels.map(l => atividadesMap[l] || 0);
    const displayLabels = labels.map(l => {
      const parts = l.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    this.engagementChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: displayLabels,
        datasets: [
          {
            label: 'Logins',
            data: loginsData,
            backgroundColor: 'rgba(0, 122, 255, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Atividades Finalizadas',
            data: atividadesData,
            backgroundColor: 'rgba(52, 199, 89, 0.7)',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 12,
            cornerRadius: 10,
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 15
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 }, stepSize: 1 }
          }
        }
      }
    });
  },

  // ─── PADEIROS STATUS TAB ────────────────────────────────────
  renderPadeirosStatus() {
    const d = this.dashboardData;
    if (!d) return '';

    const statusPadeiros = d.statusPadeiros || [];

    return `
    <!-- Filters -->
    <div class="audit-filters">
      <select class="audit-filter-select" id="audit-filial-filter" onchange="Auditoria.filterPadeiros()">
        <option value="">Todas as Filiais</option>
        ${this.filiais.map(f => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <select class="audit-filter-select" id="audit-status-filter" onchange="Auditoria.filterPadeiros()">
        <option value="">Todos os Status</option>
        <option value="ativo">🟢 Ativo (Logou + Produziu)</option>
        <option value="logou_sem_produzir">🟡 Logou Sem Produzir</option>
        <option value="inativo">🔴 Não Logou</option>
      </select>
    </div>

    <!-- Status Table -->
    <div class="audit-table-section">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Padeiro</th>
            <th>Filial</th>
            <th>Último Login</th>
            <th>Logins (30d)</th>
            <th>Status Hoje</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="audit-padeiros-tbody">
          ${this.renderPadeirosRows(statusPadeiros)}
        </tbody>
      </table>

      ${statusPadeiros.length === 0 ? `
        <div class="audit-empty">
          <i data-lucide="users"></i>
          <p>Nenhum padeiro encontrado</p>
        </div>
      ` : ''}
    </div>`;
  },

  renderPadeirosRows(padeiros) {
    return padeiros.map(p => {
      const statusLabels = {
        ativo: '🟢 Ativo',
        logou_sem_produzir: '🟡 Logou sem produzir',
        inativo: '🔴 Não logou'
      };

      const ultimoLogin = p.ultimoLogin 
        ? this.formatDateTime(p.ultimoLogin)
        : '<span style="color:var(--text-tertiary);">Nunca</span>';

      return `
        <tr class="clickable" data-filial="${p.filial || ''}" data-status="${p.status}">
          <td><strong>${p.nome}</strong></td>
          <td>${p.filial || '—'}</td>
          <td>${ultimoLogin}</td>
          <td>${p.totalLogins}</td>
          <td>
            <span class="audit-status status-${p.status}">${statusLabels[p.status] || p.status}</span>
          </td>
          <td>
            <button class="audit-filter-btn" style="padding:6px 12px;font-size:12px;" 
                    onclick="Auditoria.showPadeiroDetail('${p.id}')">
              <i data-lucide="eye" style="width:14px;height:14px;"></i> Ver
            </button>
          </td>
        </tr>`;
    }).join('');
  },

  filterPadeiros() {
    const filial = document.getElementById('audit-filial-filter')?.value || '';
    const status = document.getElementById('audit-status-filter')?.value || '';
    const tbody = document.getElementById('audit-padeiros-tbody');
    if (!tbody) return;

    let filtered = this.dashboardData.statusPadeiros || [];
    if (filial) filtered = filtered.filter(p => p.filial === filial);
    if (status) filtered = filtered.filter(p => p.status === status);

    tbody.innerHTML = this.renderPadeirosRows(filtered);
    Components.renderIcons();
  },

  // ─── PADEIRO DETAIL MODAL ───────────────────────────────────
  async showPadeiroDetail(padeiroId) {
    // Show loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'audit-detail-overlay';
    overlay.id = 'audit-detail-overlay';
    overlay.innerHTML = `<div class="audit-detail-modal"><div style="text-align:center;padding:40px;">${Components.loading()}</div></div>`;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Auditoria.closeDetail();
    });
    document.body.appendChild(overlay);

    try {
      const data = await API.get(`/api/auditoria/padeiro/${padeiroId}?periodo=30`);
      this.renderDetail(data);
    } catch (err) {
      console.error('[AUDITORIA] Erro ao carregar detalhes:', err);
      overlay.remove();
      Components.toast('Erro ao carregar detalhes do padeiro', 'error');
    }
  },

  renderDetail(data) {
    const overlay = document.getElementById('audit-detail-overlay');
    if (!overlay) return;

    const { padeiro, resumo, logins, atividades, diasLogouSemProduzir } = data;

    const taxaConversao = resumo.diasComLogin > 0
      ? Math.round((resumo.diasComAtividade / resumo.diasComLogin) * 100)
      : 0;

    // Merge logins + atividades into a timeline
    const timeline = [];
    logins.forEach(l => {
      timeline.push({
        time: l.timestamp,
        type: l.action === 'login_failed' ? 'failed' : 'login',
        text: l.action === 'login_failed' 
          ? `Tentativa de login com senha errada (${l.platform})`
          : `Login via ${l.action === 'login_google' ? 'Google' : 'senha'} (${l.platform})`,
        detail: l.userAgent ? l.userAgent.substring(0, 60) : ''
      });
    });
    atividades.forEach(a => {
      timeline.push({
        time: a.inicioEm || `${a.data}T08:00:00.000Z`,
        type: 'atividade',
        text: `Atividade: ${a.clienteNome || 'Cliente'} — ${a.produtoNome || ''} ${a.kgTotal ? a.kgTotal + 'kg' : ''}`,
        detail: a.status
      });
    });
    timeline.sort((a, b) => new Date(b.time) - new Date(a.time));

    overlay.querySelector('.audit-detail-modal').innerHTML = `
      <div class="audit-detail-header">
        <h2>${padeiro.nome}</h2>
        <button class="audit-detail-close" onclick="Auditoria.closeDetail()">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>

      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">
        ${padeiro.filial || ''} ${padeiro.cargo ? '· ' + padeiro.cargo : ''} · Últimos 30 dias
      </div>

      <!-- Stats -->
      <div class="audit-detail-stats">
        <div class="audit-detail-stat">
          <div class="audit-detail-stat-value">${resumo.totalLogins}</div>
          <div class="audit-detail-stat-label">Logins</div>
        </div>
        <div class="audit-detail-stat">
          <div class="audit-detail-stat-value">${resumo.totalAtividades}</div>
          <div class="audit-detail-stat-label">Atividades</div>
        </div>
        <div class="audit-detail-stat">
          <div class="audit-detail-stat-value" style="color:${taxaConversao >= 70 ? '#34C759' : taxaConversao >= 40 ? '#FF9500' : '#FF3B30'};">${taxaConversao}%</div>
          <div class="audit-detail-stat-label">Taxa de Conversão</div>
        </div>
        <div class="audit-detail-stat">
          <div class="audit-detail-stat-value" style="color:#FF9500;">${resumo.diasLogouSemProduzir}</div>
          <div class="audit-detail-stat-label">Dias Sem Produzir</div>
        </div>
      </div>

      ${diasLogouSemProduzir.length > 0 ? `
      <div style="background:rgba(255,149,0,0.06);border:1px solid rgba(255,149,0,0.15);border-radius:12px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:600;color:#FF9500;margin-bottom:8px;">
          ⚠️ Dias em que logou mas NÃO registrou atividade:
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${diasLogouSemProduzir.map(d => `
            <span style="padding:3px 8px;background:rgba(255,149,0,0.1);border-radius:6px;font-size:12px;color:#FF9500;font-weight:500;">
              ${this.formatDate(d)}
            </span>
          `).join('')}
        </div>
      </div>` : `
      <div style="background:rgba(52,199,89,0.06);border:1px solid rgba(52,199,89,0.15);border-radius:12px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:13px;font-weight:600;color:#34C759;">
          ✅ Este padeiro produziu em todos os dias em que logou.
        </div>
      </div>`}

      <!-- Chart -->
      <div style="margin-bottom:20px;">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Logins vs Atividades por Dia</div>
        <div class="audit-detail-chart">
          <canvas id="audit-detail-chart"></canvas>
        </div>
      </div>

      <!-- Timeline -->
      <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Histórico Recente</div>
      <div class="audit-detail-timeline">
        ${timeline.slice(0, 50).map(item => `
          <div class="audit-detail-timeline-item">
            <div class="audit-detail-timeline-dot dot-${item.type}"></div>
            <div class="audit-detail-timeline-time">${this.formatDateTime(item.time)}</div>
            <div class="audit-detail-timeline-text">
              ${item.text}
              ${item.detail ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:2px;">${item.detail}</div>` : ''}
            </div>
          </div>
        `).join('')}
        ${timeline.length === 0 ? '<div class="audit-empty"><p>Nenhum registro encontrado</p></div>' : ''}
      </div>
    `;

    Components.renderIcons();
    this.initDetailChart(data);
  },

  initDetailChart(data) {
    const canvas = document.getElementById('audit-detail-chart');
    if (!canvas) return;
    if (this.detailChart) this.detailChart.destroy();

    const { loginsPorDia, atividadesPorDia } = data;
    const loginsMap = {};
    const atividadesMap = {};
    loginsPorDia.forEach(l => { loginsMap[l.dia] = l.total; });
    atividadesPorDia.forEach(a => { atividadesMap[a.dia] = a.total; });

    const labels = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().split('T')[0]);
    }

    this.detailChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels.map(l => { const p = l.split('-'); return `${p[2]}/${p[1]}`; }),
        datasets: [
          {
            label: 'Logins',
            data: labels.map(l => loginsMap[l] || 0),
            backgroundColor: 'rgba(0,122,255,0.6)',
            borderRadius: 3,
            barPercentage: 0.5
          },
          {
            label: 'Atividades',
            data: labels.map(l => atividadesMap[l] || 0),
            backgroundColor: 'rgba(52,199,89,0.6)',
            borderRadius: 3,
            barPercentage: 0.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } }
        }
      }
    });
  },

  closeDetail() {
    const overlay = document.getElementById('audit-detail-overlay');
    if (overlay) {
      overlay.style.animation = 'auditFadeIn 0.2s ease reverse';
      setTimeout(() => overlay.remove(), 200);
    }
    if (this.detailChart) {
      this.detailChart.destroy();
      this.detailChart = null;
    }
  },

  // ─── LOGS TAB ───────────────────────────────────────────────
  async loadLogs(page = 1) {
    this.logsPage = page;
    const content = document.getElementById('audit-tab-content');
    if (!content) return;

    content.innerHTML = `
      ${this.renderLogsFilters()}
      <div id="audit-logs-container">${Components.loading()}</div>
    `;
    Components.renderIcons();

    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', '50');

      const dataInicio = document.getElementById('audit-log-date-start')?.value;
      const dataFim = document.getElementById('audit-log-date-end')?.value;
      const action = document.getElementById('audit-log-action')?.value;

      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      if (action) params.set('action', action);

      this.logsData = await API.get(`/api/auditoria/logs?${params.toString()}`);
      this.renderLogs();
    } catch (err) {
      console.error('[AUDITORIA] Erro ao carregar logs:', err);
      document.getElementById('audit-logs-container').innerHTML = 
        Components.empty('alert-circle', 'Erro ao carregar logs');
    }
  },

  renderLogsFilters() {
    const hoje = new Date().toISOString().split('T')[0];
    return `
    <div class="audit-filters">
      <input type="date" class="audit-filter-input" id="audit-log-date-start" value="${hoje}" max="${hoje}">
      <span style="color:var(--text-secondary);font-size:13px;">até</span>
      <input type="date" class="audit-filter-input" id="audit-log-date-end" value="${hoje}" max="${hoje}">
      <select class="audit-filter-select" id="audit-log-action">
        <option value="">Todas as Ações</option>
        <option value="login">Login (Senha)</option>
        <option value="login_google">Login (Google)</option>
        <option value="login_failed">Login Falhou</option>
      </select>
      <button class="audit-filter-btn" onclick="Auditoria.loadLogs(1)">
        <i data-lucide="search" style="width:14px;height:14px;"></i> Filtrar
      </button>
    </div>`;
  },

  renderLogs() {
    const container = document.getElementById('audit-logs-container');
    if (!container || !this.logsData) return;

    const { logs, total, page, totalPages } = this.logsData;

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="audit-table-section">
          <div class="audit-empty">
            <i data-lucide="scroll-text"></i>
            <p>Nenhum log encontrado para os filtros selecionados</p>
          </div>
        </div>`;
      Components.renderIcons();
      return;
    }

    container.innerHTML = `
    <div class="audit-table-section">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
        ${total} registros encontrados
      </div>
      <table class="audit-table">
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Usuário</th>
            <th>Role</th>
            <th>Ação</th>
            <th>Plataforma</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${this.formatDateTime(log.timestamp)}</td>
              <td><strong>${log.userName || '—'}</strong></td>
              <td>${this.formatRole(log.userRole)}</td>
              <td><span class="audit-action action-${log.action}">${this.formatAction(log.action)}</span></td>
              <td>${this.formatPlatform(log.platform)}</td>
              <td style="font-family:monospace;font-size:11px;color:var(--text-secondary);">${log.ip || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${totalPages > 1 ? `
      <div class="audit-pagination">
        <button class="audit-page-btn" onclick="Auditoria.loadLogs(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        <span class="audit-page-info">Página ${page} de ${totalPages}</span>
        <button class="audit-page-btn" onclick="Auditoria.loadLogs(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
          Próxima →
        </button>
      </div>` : ''}
    </div>`;
    Components.renderIcons();
  },

  // ─── HELPERS ────────────────────────────────────────────────
  formatDateTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
             d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  },

  formatAction(action) {
    const map = {
      login: '🔑 Login',
      login_google: '🟢 Google',
      login_failed: '❌ Falhou'
    };
    return map[action] || action;
  },

  formatRole(role) {
    const map = {
      padeiro: 'Padeiro',
      admin: 'Admin',
      gestor: 'Gestor',
      gestor_geral: 'Gestor Geral',
      gestor_regional: 'Gestor Regional',
      master_gestor: 'Master Gestor'
    };
    return map[role] || role || '—';
  },

  formatPlatform(platform) {
    const map = {
      web: '🌐 Web',
      android: '📱 Android',
      ios: '🍎 iOS'
    };
    return map[platform] || platform || '—';
  }
};
