/**
 * Padeiro Dashboard - Personal panel for bakers
 * BRAGO Sistema Padeiro - Premium Redesign
 */
const PadeiroDashboard = {
  async render() {
    const c = document.getElementById('page-container');
    c.innerHTML = Components.loading();
    const user = API.getUser();
    try {
      const [metas, atividades, avaliacoes] = await Promise.all([
        API.get('/api/metas'),
        API.get('/api/atividades'),
        API.get('/api/avaliacoes')
      ]);

      const minhasMetas = metas.filter(m => m.padeiroId === user.id);
      const minhasAtividades = atividades.filter(a => a.padeiroId === user.id);
      const finalizadas = minhasAtividades.filter(a => a.status === 'finalizada');
      const mesAtual = new Date().toISOString().slice(0, 7);
      const atividadesMes = finalizadas.filter(a => a.data && a.data.startsWith(mesAtual));
      const kgMes = atividadesMes.reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);

      // Avaliações
      const minhasAvalCliente = avaliacoes.filter(a => a.padeiroId === user.id && a.tipo === 'cliente');
      const minhasAvalGestor = avaliacoes.filter(a => a.padeiroId === user.id && a.tipo === 'gestor');
      const mediaCliente = minhasAvalCliente.length > 0
        ? minhasAvalCliente.reduce((s, a) => s + (parseFloat(a.nota) || 0), 0) / minhasAvalCliente.length : null;

      // Meta do mês
      const metaMes = minhasMetas.find(m => m.periodo === mesAtual);
      const metaKg = metaMes ? metaMes.metaKg : 0;
      const pctMeta = metaKg > 0 ? Math.round((kgMes / metaKg) * 100) : 0;

      // Greeting based on time
      const hora = new Date().getHours();
      const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
      const firstName = user.nome.split(' ')[0];
      const initials = user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

      // Date formatting
      const hoje = new Date();
      const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const mesesNome = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const dataFormatada = `${diasSemana[hoje.getDay()]}, ${hoje.getDate()} de ${mesesNome[hoje.getMonth()]}`;

      // Progress ring calculations
      const pctClamped = Math.min(pctMeta, 100);
      const circumference = 2 * Math.PI * 54;
      const dashOffset = circumference - (pctClamped / 100) * circumference;
      const progressColor = pctMeta >= 100 ? '#10b981' : pctMeta >= 50 ? '#1E4BFF' : '#f59e0b';

      // Streak calculation (consecutive days with activity)
      const uniqueDays = [...new Set(finalizadas.map(a => a.data).filter(Boolean))].sort().reverse();
      let streak = 0;
      const todayStr = hoje.toISOString().slice(0, 10);
      let checkDate = new Date(hoje);
      for (let i = 0; i < uniqueDays.length; i++) {
        const expected = checkDate.toISOString().slice(0, 10);
        if (uniqueDays[i] === expected) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0 && uniqueDays[i] !== todayStr) {
          // Check if yesterday matches
          checkDate.setDate(checkDate.getDate() - 1);
          if (uniqueDays[i] === checkDate.toISOString().slice(0, 10)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else break;
        } else break;
      }

      c.innerHTML = `
      <div class="pd-dashboard fade-in">
        <!-- Hero Section -->
        <div class="pd-hero">
          <div class="pd-hero-bg"></div>
          <div class="pd-hero-content">
            <div class="pd-hero-left">
              <div class="pd-avatar-ring">
                <div class="pd-avatar">${initials}</div>
              </div>
              <div class="pd-hero-info">
                <p class="pd-greeting">${saudacao},</p>
                <h1 class="pd-hero-name">${firstName}</h1>
                <div class="pd-hero-meta">
                  <span class="pd-hero-badge"><i data-lucide="briefcase" style="width:14px;height:14px"></i> ${user.cargo || 'Padeiro'}</span>
                  <span class="pd-hero-badge pd-hero-badge-code"><i data-lucide="hash" style="width:14px;height:14px"></i> ${user.codTec || '—'}</span>
                </div>
              </div>
            </div>
            <div class="pd-hero-right">
              <div class="pd-date-display">
                <i data-lucide="calendar" style="width:16px;height:16px;opacity:0.7"></i>
                <span>${dataFormatada}</span>
              </div>
              <button class="pd-cta-btn" onclick="App.navigate('padeiro-atividade')">
                <div class="pd-cta-icon"><i data-lucide="play" style="width:20px;height:20px"></i></div>
                <span>Iniciar Atividade</span>
                <i data-lucide="arrow-right" style="width:18px;height:18px;opacity:0.7"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="pd-kpi-row">
          <div class="pd-kpi-card pd-kpi-blue">
            <div class="pd-kpi-glow"></div>
            <div class="pd-kpi-top">
              <div class="pd-kpi-icon-wrap pd-icon-blue"><i data-lucide="weight" style="width:22px;height:22px"></i></div>
              <div class="pd-kpi-trend ${kgMes > 0 ? 'pd-trend-up' : ''}">
                ${kgMes > 0 ? '<i data-lucide="trending-up" style="width:14px;height:14px"></i>' : ''}
              </div>
            </div>
            <div class="pd-kpi-value">${kgMes.toFixed(1)}<span class="pd-kpi-unit">kg</span></div>
            <div class="pd-kpi-label">Produção do Mês</div>
          </div>

          <div class="pd-kpi-card pd-kpi-green">
            <div class="pd-kpi-glow"></div>
            <div class="pd-kpi-top">
              <div class="pd-kpi-icon-wrap pd-icon-green"><i data-lucide="check-circle-2" style="width:22px;height:22px"></i></div>
              <div class="pd-kpi-trend pd-trend-up">
                <i data-lucide="activity" style="width:14px;height:14px"></i>
              </div>
            </div>
            <div class="pd-kpi-value">${atividadesMes.length}</div>
            <div class="pd-kpi-label">Atividades no Mês</div>
          </div>

          <div class="pd-kpi-card pd-kpi-amber">
            <div class="pd-kpi-glow"></div>
            <div class="pd-kpi-top">
              <div class="pd-kpi-icon-wrap pd-icon-amber"><i data-lucide="star" style="width:22px;height:22px"></i></div>
            </div>
            <div class="pd-kpi-value">${mediaCliente !== null ? mediaCliente.toFixed(1) : '—'}<span class="pd-kpi-unit">${mediaCliente !== null ? '/5' : ''}</span></div>
            <div class="pd-kpi-label">Nota dos Clientes</div>
          </div>

          <div class="pd-kpi-card pd-kpi-purple">
            <div class="pd-kpi-glow"></div>
            <div class="pd-kpi-top">
              <div class="pd-kpi-icon-wrap pd-icon-purple"><i data-lucide="flame" style="width:22px;height:22px"></i></div>
            </div>
            <div class="pd-kpi-value">${streak}<span class="pd-kpi-unit">dias</span></div>
            <div class="pd-kpi-label">Sequência Ativa</div>
          </div>
        </div>

        <!-- Main Grid: Progress + Quick Stats -->
        <div class="pd-main-grid">
          <!-- Meta Progress Card -->
          <div class="pd-progress-card">
            <div class="pd-card-header">
              <div class="pd-card-title-group">
                <div class="pd-card-icon"><i data-lucide="target" style="width:20px;height:20px"></i></div>
                <h3 class="pd-card-title">Meta Mensal</h3>
              </div>
              ${metaMes ? `<span class="pd-card-badge">${mesesNome[hoje.getMonth()].charAt(0).toUpperCase() + mesesNome[hoje.getMonth()].slice(1)}</span>` : ''}
            </div>
            
            ${metaMes ? `
            <div class="pd-progress-body">
              <div class="pd-progress-ring-container">
                <svg class="pd-progress-ring" width="140" height="140" viewBox="0 0 120 120">
                  <circle class="pd-ring-bg" cx="60" cy="60" r="54" />
                  <circle class="pd-ring-fill" cx="60" cy="60" r="54" 
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashOffset}; stroke: ${progressColor};" />
                </svg>
                <div class="pd-ring-text">
                  <span class="pd-ring-value" style="color: ${progressColor}">${pctMeta}%</span>
                  <span class="pd-ring-label">concluído</span>
                </div>
              </div>
              <div class="pd-progress-details">
                <div class="pd-detail-row">
                  <span class="pd-detail-label">Produzido</span>
                  <span class="pd-detail-value" style="color: ${progressColor}">${kgMes.toFixed(1)} kg</span>
                </div>
                <div class="pd-detail-divider"></div>
                <div class="pd-detail-row">
                  <span class="pd-detail-label">Meta</span>
                  <span class="pd-detail-value">${metaKg} kg</span>
                </div>
                <div class="pd-detail-divider"></div>
                <div class="pd-detail-row">
                  <span class="pd-detail-label">Restante</span>
                  <span class="pd-detail-value">${Math.max(0, metaKg - kgMes).toFixed(1)} kg</span>
                </div>
                <div class="pd-progress-bar-section">
                  <div class="pd-bar-track">
                    <div class="pd-bar-fill" style="width: ${pctClamped}%; background: ${progressColor};"></div>
                  </div>
                </div>
              </div>
            </div>
            ` : `
            <div class="pd-empty-meta">
              <div class="pd-empty-icon"><i data-lucide="target" style="width:40px;height:40px"></i></div>
              <p>Nenhuma meta definida para este mês</p>
              <span>Aguarde a definição pelo gestor</span>
            </div>
            `}
          </div>

          <!-- Quick Performance Card -->
          <div class="pd-perf-card">
            <div class="pd-card-header">
              <div class="pd-card-title-group">
                <div class="pd-card-icon"><i data-lucide="bar-chart-3" style="width:20px;height:20px"></i></div>
                <h3 class="pd-card-title">Resumo Rápido</h3>
              </div>
            </div>
            <div class="pd-perf-list">
              <div class="pd-perf-item">
                <div class="pd-perf-icon pd-perf-blue"><i data-lucide="package" style="width:18px;height:18px"></i></div>
                <div class="pd-perf-info">
                  <span class="pd-perf-label">Média por Atividade</span>
                  <span class="pd-perf-val">${atividadesMes.length > 0 ? (kgMes / atividadesMes.length).toFixed(1) : '0'} kg</span>
                </div>
              </div>
              <div class="pd-perf-item">
                <div class="pd-perf-icon pd-perf-green"><i data-lucide="check-check" style="width:18px;height:18px"></i></div>
                <div class="pd-perf-info">
                  <span class="pd-perf-label">Total Finalizadas</span>
                  <span class="pd-perf-val">${finalizadas.length}</span>
                </div>
              </div>
              <div class="pd-perf-item">
                <div class="pd-perf-icon pd-perf-amber"><i data-lucide="users" style="width:18px;height:18px"></i></div>
                <div class="pd-perf-info">
                  <span class="pd-perf-label">Avaliações Recebidas</span>
                  <span class="pd-perf-val">${minhasAvalCliente.length}</span>
                </div>
              </div>
              <div class="pd-perf-item">
                <div class="pd-perf-icon pd-perf-purple"><i data-lucide="clipboard-check" style="width:18px;height:18px"></i></div>
                <div class="pd-perf-info">
                  <span class="pd-perf-label">Avaliações do Gestor</span>
                  <span class="pd-perf-val">${minhasAvalGestor.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activities Table -->
        <div class="pd-activities-card">
          <div class="pd-card-header">
            <div class="pd-card-title-group">
              <div class="pd-card-icon"><i data-lucide="history" style="width:20px;height:20px"></i></div>
              <h3 class="pd-card-title">Últimas Atividades</h3>
            </div>
            <span class="pd-activity-count">${minhasAtividades.length} registros</span>
          </div>
          ${minhasAtividades.length === 0 ? `
          <div class="pd-empty-activities">
            <div class="pd-empty-icon"><i data-lucide="clipboard" style="width:44px;height:44px"></i></div>
            <p>Nenhuma atividade registrada</p>
            <span>Comece sua primeira atividade do mês!</span>
          </div>
          ` : `
          <div class="pd-table-wrapper">
            <table class="pd-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Produção</th>
                  <th>Avaliação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${minhasAtividades.slice(-10).reverse().map(a => `
                <tr class="pd-table-row">
                  <td>
                    <div class="pd-date-cell">
                      <span class="pd-date-day">${a.data ? new Date(a.data + 'T12:00:00').getDate() : '—'}</span>
                      <span class="pd-date-month">${a.data ? mesesNome[new Date(a.data + 'T12:00:00').getMonth()].slice(0, 3) : ''}</span>
                    </div>
                  </td>
                  <td>
                    <div class="pd-client-cell">
                      <div class="pd-client-avatar">${(a.clienteNome || '?')[0].toUpperCase()}</div>
                      <span class="pd-client-name">${a.clienteNome || '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span class="pd-kg-badge">${a.kgTotal || '0'} kg</span>
                  </td>
                  <td>${a.notaCliente ? Components.starsDisplay(a.notaCliente) : '<span class="pd-no-rating">—</span>'}</td>
                  <td>
                    ${a.status === 'finalizada' 
                      ? '<span class="pd-status pd-status-done"><i data-lucide="check-circle-2" style="width:14px;height:14px"></i> Finalizada</span>'
                      : '<span class="pd-status pd-status-progress"><i data-lucide="loader" style="width:14px;height:14px"></i> Em andamento</span>'}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      </div>`;

      // Initialize Lucide icons
      Components.renderIcons();

      // Animate progress ring
      setTimeout(() => {
        const ring = document.querySelector('.pd-ring-fill');
        if (ring) {
          ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
          ring.style.strokeDashoffset = dashOffset;
        }
        // Animate KPI values
        document.querySelectorAll('.pd-kpi-card').forEach((card, i) => {
          card.style.animationDelay = `${i * 0.1}s`;
        });
      }, 100);

    } catch (e) {
      c.innerHTML = `<div class="toast error" style="position:relative;opacity:1;bottom:0;left:0;transform:none;">Erro: ${e.message}</div>`;
    }
  }
};
