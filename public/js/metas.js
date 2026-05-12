/**
 * Metas Module - Production Goals Management
 * BRAGO Sistema Padeiro
 */
const Metas = {
  activeSubTab: 'padeiros',

  async render() {
    this.renderStyles();
    const c = document.getElementById('page-container');
    if (c) c.classList.add('metas-view');
    c.innerHTML = Components.loading();
    try {
      const [metas, padeiros, atividades] = await Promise.all([
        API.get('/api/metas'), API.get('/api/padeiros'), API.get('/api/atividades')
      ]);
      this.metas = metas;
      this.padeiros = padeiros;
      this.atividades = atividades;
      this.renderContent(c);
    } catch(e) { c.innerHTML = `<div class="toast error">Erro: ${e.message}</div>`; }
  },

  renderStyles() {
    if (document.getElementById('metas-apple-css')) return;
    const style = document.createElement('style');
    style.id = 'metas-apple-css';
    style.innerHTML = `
      .metas-view {
        --apple-blue: #007AFF;
        --apple-green: #34C759;
        --apple-orange: #FF9500;
        --apple-bg: #F2F2F7;
        --apple-card: #FFFFFF;
        --apple-gray: #8E8E93;
        --apple-separator: #C6C6C8;
      }

      @media (max-width: 430px) {
        .page-title { font-size: 28px !important; font-weight: 800 !important; letter-spacing: -0.5px !important; margin-bottom: 20px !important; }
        .card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        
        .apple-metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        
        .apple-metric-card {
          background: var(--apple-card);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        
        .apple-metric-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .apple-metric-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .apple-metric-icon-box.blue { background: var(--apple-blue); }
        .apple-metric-icon-box.green { background: var(--apple-green); }
        .apple-metric-icon-box.orange { background: var(--apple-orange); }
        
        .apple-metric-value { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .apple-metric-label { font-size: 11px; color: var(--apple-gray); font-weight: 600; text-transform: uppercase; }
        
        .apple-section-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }
        .apple-section-title-row { display: flex; justify-content: space-between; align-items: center; }
        .apple-section-title { font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .apple-month-pill {
          background: rgba(0,0,0,0.05);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #666;
        }
        
        .apple-padeiros-list { display: flex; flex-direction: column; gap: 12px; padding-bottom: 100px; }
        .apple-padeiro-card {
          background: var(--apple-card);
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
        }
        
        .apple-padeiro-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .apple-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 15px;
        }
        .apple-padeiro-name { font-size: 17px; font-weight: 700; }
        
        .apple-meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .apple-info-item { display: flex; flex-direction: column; gap: 2px; }
        .apple-info-label { font-size: 11px; color: var(--apple-gray); font-weight: 600; text-transform: uppercase; }
        .apple-info-value { font-size: 16px; font-weight: 700; }
        
        .apple-progress-section { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .apple-progress-container { flex: 1; height: 8px; background: #E5E5EA; border-radius: 4px; overflow: hidden; }
        .apple-progress-fill { height: 100%; background: var(--apple-blue); border-radius: 4px; transition: width 0.3s ease; }
        .apple-progress-percent { font-size: 13px; font-weight: 700; min-width: 35px; text-align: right; }
        
        .apple-status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .apple-status-badge.success { background: rgba(52,199,89,0.1); color: var(--apple-green); }
        .apple-status-badge.pending { background: rgba(0,122,255,0.1); color: var(--apple-blue); }
        
        .apple-card-actions { display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid #F2F2F7; padding-top: 12px; }
        
        /* Floating Action Button */
        .btn-new-meta {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: var(--apple-blue);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0,122,255,0.3);
          border: none;
          z-index: 90;
        }
      }
    `;
    document.head.appendChild(style);
  },


  renderContent(c) {
    const mesAtual = new Date().toISOString().slice(0,7);
    const metasMes = this.metas.filter(m => m.periodo === mesAtual);
    const producao = {};
    this.atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada').forEach(a => {
      producao[a.padeiroId] = (producao[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });

    c.innerHTML = `
    <div class="fade-in">
      <div class="flex justify-between items-center mb-6">
        <h1 class="page-title" style="margin-bottom:0;">Metas de Produção</h1>
      </div>
      
      <div class="apple-segmented-control mb-6">
        <div class="apple-segmented-slider" style="width: calc(50% - 2px); transform: translateX(${this.activeSubTab === 'metas-mensais' ? '100%' : '0'})"></div>
        <div id="tab-padeiros" class="apple-segmented-item ${this.activeSubTab === 'padeiros' ? 'active' : ''}" onclick="Metas.switchSubTab('padeiros')">Semanais</div>
        <div id="tab-metas-mensais" class="apple-segmented-item ${this.activeSubTab === 'metas-mensais' ? 'active' : ''}" onclick="Metas.switchSubTab('metas-mensais')">Mensais</div>
      </div>

      <div id="metas-sub-content">
        ${this.activeSubTab === 'padeiros' ? this.renderPadeirosTab(mesAtual, metasMes, producao) : this.renderMetasMensaisTab()}
      </div>
    </div>`;
    Components.renderIcons();
  },

  switchSubTab(tab) {
    this.activeSubTab = tab;
    const mesAtual = new Date().toISOString().slice(0,7);
    const metasMes = this.metas.filter(m => m.periodo === mesAtual);
    const producao = {};
    this.atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada').forEach(a => {
      producao[a.padeiroId] = (producao[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });
    document.querySelectorAll('.apple-segmented-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    const slider = document.querySelector('.apple-segmented-slider');
    if (slider) {
      slider.style.width = 'calc(50% - 2px)';
      slider.style.transform = `translateX(${tab === 'metas-mensais' ? '100%' : '0'})`;
    }
    document.getElementById('metas-sub-content').innerHTML =
      tab === 'padeiros' ? this.renderPadeirosTab(mesAtual, metasMes, producao) : this.renderMetasMensaisTab();
    Components.renderIcons();
  },

  renderPadeirosTab(mesAtual, metasMes, producao) {
    return `
      <!-- Mobile Metrics Cards -->
      <div class="mobile-only apple-metrics-grid">
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box blue"><i data-lucide="package"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${Object.values(producao).reduce((a,b)=>a+b,0).toFixed(0)} kg</div>
          <div class="apple-metric-label">Produção Total do Mês</div>
          <div class="apple-metric-label" style="font-size: 11px; margin-top: 4px;">Nenhuma produção registrada</div>
        </div>
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box green"><i data-lucide="check-circle-2"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${this.metas.filter(m => { const r = producao[m.padeiroId] || 0; return m.metaKg > 0 && r >= m.metaKg; }).length}</div>
          <div class="apple-metric-label">Metas Atingidas</div>
        </div>
        <div class="apple-metric-card">
          <div class="apple-metric-header">
            <div class="apple-metric-icon-box orange"><i data-lucide="target"></i></div>
            <div class="apple-metric-trend">↗</div>
          </div>
          <div class="apple-metric-value">${this.metas.length}</div>
          <div class="apple-metric-label">Total de Metas</div>
        </div>
      </div>

      <!-- Desktop KPI Band -->
      <div class="desktop-only kpi-band mb-6">
        <div class="kpi-band-item blue" style="flex: 1.5;">
          <div class="kpi-header">
            <div class="kpi-title">Produção Total do Mês</div>
            <div class="kpi-icon"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value" style="font-size: 40px;">${Object.values(producao).reduce((a,b)=>a+b,0).toFixed(0)} <span style="font-size: 20px; font-weight: 600;">kg</span></div>
        </div>
        <div class="kpi-band-item green">
          <div class="kpi-header">
            <div class="kpi-title">Metas Atingidas</div>
            <div class="kpi-icon"><i data-lucide="check-circle-2"></i></div>
          </div>
          <div class="kpi-value">${this.metas.filter(m => { const r = producao[m.padeiroId] || 0; return m.metaKg > 0 && r >= m.metaKg; }).length}</div>
        </div>
        <div class="kpi-band-item">
          <div class="kpi-header">
            <div class="kpi-title">Total de Metas</div>
            <div class="kpi-icon"><i data-lucide="target"></i></div>
          </div>
          <div class="kpi-value">${this.metas.length}</div>
        </div>
      </div>
      
      <!-- Mobile Section Header -->
      <div class="mobile-only apple-section-header">
        <div class="apple-section-title-row">
          <div class="apple-section-title">
            <i data-lucide="target" class="text-primary"></i>
            Metas do Mês
          </div>
          <div class="apple-month-pill">${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>
        </div>
        <div class="apple-button-row">
          <button class="apple-btn apple-btn-secondary" onclick="Metas.resetMetas()">
            Resetar Metas
          </button>
          <button class="apple-btn apple-btn-primary" onclick="Metas.openMetaForm()">
            <i data-lucide="plus"></i> Nova Meta
          </button>
        </div>
      </div>

      <!-- Desktop Header -->
      <div class="desktop-only card">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-3">
            <div class="kpi-icon text-primary"><i data-lucide="target"></i></div>
            <h3 style="margin: 0; font-size: 17px;">Metas do Mês — ${new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h3>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline btn-pill text-danger border-danger" onclick="Metas.resetMetas()">
              <i data-lucide="refresh-cw"></i> Resetar Metas
            </button>
            <button class="btn btn-primary btn-pill" onclick="Metas.openMetaForm()">
              <i data-lucide="plus"></i> Nova Meta
            </button>
          </div>
        </div>

        ${metasMes.length === 0 && this.metas.length === 0 ? '<div class="text-tertiary">Nenhuma meta definida. Clique em "+ Nova Meta" para começar.</div>' : `
        <div class="table-responsive">
          <table>
            <thead><tr><th>Padeiro</th><th>Meta (KG)</th><th>Realizado (KG)</th><th>Progresso</th><th>Status</th><th style="text-align: right;">Ações</th></tr></thead>
            <tbody>
            ${(metasMes.length > 0 ? metasMes : this.metas).map(m => {
              const realizado = producao[m.padeiroId] || 0;
              const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
              const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
              const status = pct >= 100 ? 'success' : pct >= 50 ? 'primary' : 'danger';
              return `<tr>
                <td style="font-weight:600">${padeiro ? padeiro.nome : m.padeiroNome || '—'}</td>
                <td style="font-weight:500;">${m.metaKg || 0} kg</td>
                <td style="font-weight:700;color:var(--${status})">${realizado.toFixed(1)} kg</td>
                <td style="min-width:200px">
                  <div class="progress-bar-inline-container">
                    <div class="progress-bar-inline" style="flex:1;">
                      <div class="progress-bar bg-${status}" style="width: ${Math.min(pct, 100)}%;"></div>
                    </div>
                    <span style="font-size:13px;font-weight:600;min-width:40px; color:var(--text-primary); text-align: right;">${pct}%</span>
                  </div>
                </td>
                <td>
                  <span class="status-dot ${pct >= 100 ? 'completed' : pct >= 50 ? 'pending' : 'canceled'}"></span>
                  <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">${pct >= 100 ? 'Atingida' : pct >= 50 ? 'Em progresso' : 'Pendente'}</span>
                </td>
                <td style="text-align: right;">
                  <div class="row-actions flex gap-2 justify-end">
                    <button class="btn btn-icon btn-sm" onclick="Metas.openMetaForm('${m.id}')" title="Editar"><i data-lucide="pencil" class="text-blue"></i></button>
                    <button class="btn btn-icon btn-sm" onclick="Metas.deleteMeta('${m.id}')" title="Excluir"><i data-lucide="trash-2" class="text-danger"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>`}
      </div>

      <!-- Mobile Padeiros Cards -->
      <div class="mobile-only apple-padeiros-list">
        ${(metasMes.length > 0 ? metasMes : this.metas).map(m => {
          const realizado = producao[m.padeiroId] || 0;
          const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
          const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
          const status = pct >= 100 ? 'success' : 'pending';
          const initials = padeiro ? padeiro.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '??';
          const avatarColors = ['#1C7EF2', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
          const color = avatarColors[initials.charCodeAt(0) % avatarColors.length];

          return `
          <div class="apple-padeiro-card">
            <div class="apple-padeiro-header">
              <div class="apple-avatar" style="background: ${color}">${initials}</div>
              <div class="apple-padeiro-name">${padeiro ? padeiro.nome : m.padeiroNome || '—'}</div>
            </div>
            <div class="apple-meta-info">
              <div class="apple-info-item">
                <div class="apple-info-label">Meta</div>
                <div class="apple-info-value">${m.metaKg || 0} kg</div>
              </div>
              <div class="apple-info-item">
                <div class="apple-info-label">Realizado</div>
                <div class="apple-info-value" style="color: ${pct >= 100 ? 'var(--apple-green)' : 'var(--apple-label)'}">${realizado.toFixed(1)} kg</div>
              </div>
            </div>
            <div class="apple-progress-section">
              <div class="apple-progress-container">
                <div class="apple-progress-fill" style="width: ${Math.min(pct, 100)}%;"></div>
              </div>
              <div class="apple-progress-percent">${pct}%</div>
            </div>
            <div class="apple-status-badge ${status}">
              ${pct >= 100 ? 'Concluído' : 'Pendente'}
            </div>
            <div class="apple-card-actions">
              <button class="btn btn-icon" onclick="Metas.openMetaForm('${m.id}')"><i data-lucide="pencil" style="color: var(--apple-blue)"></i></button>
              <button class="btn btn-icon" onclick="Metas.deleteMeta('${m.id}')"><i data-lucide="trash-2" style="color: var(--apple-red)"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  renderMetasMensaisTab() {
    const year = new Date().getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const abrevs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    return `
    <div style="text-align:center;margin-bottom:32px;">
      <h3 style="font-size:18px;margin:0;">Visão Anual de Metas — ${year}</h3>
      <p class="text-secondary" style="margin-top:4px;font-size:13px;">Clique em um mês para ver o detalhamento das metas por padeiro.</p>
    </div>
    <div class="month-grid">
      ${meses.map((nomeMes, index) => {
        const monthStr = `${year}-${String(index + 1).padStart(2, '0')}`;
        const metasMes = this.metas.filter(m => m.periodo === monthStr);
        const producaoMes = {};
        this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada').forEach(a => {
          producaoMes[a.padeiroId] = (producaoMes[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
        });
        const totalMeta = metasMes.reduce((s, m) => s + (parseFloat(m.metaKg) || 0), 0);
        const totalRealizado = Object.values(producaoMes).reduce((a, b) => a + b, 0);
        const progresso = totalMeta > 0 ? Math.min(100, Math.round((totalRealizado / totalMeta) * 100)) : 0;
        return `
        <div class="month-card" onclick="Metas.openMetaMensalDetails(${year}, ${index})">
          <div style="position: relative; z-index: 2;">
            <div class="month-abbr">${abrevs[index]}</div>
            <div class="month-subtitle">${metasMes.length} meta${metasMes.length !== 1 ? 's' : ''} cadastrada${metasMes.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="month-progress-wrapper">
            <div class="month-meta-header">
              <span class="month-meta-text">${progresso}%</span>
            </div>
            <div class="month-progress-container">
              <div class="month-progress-bar" style="width: ${progresso}%;"></div>
            </div>
          </div>
          <div class="month-card-blob"></div>
        </div>`;
      }).join('')}
    </div>`;
  },

  openMetaMensalDetails(year, monthIndex) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesLabel = meses[monthIndex];
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const metasMes = this.metas.filter(m => m.periodo === monthStr);
    const producaoMes = {};
    this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada').forEach(a => {
      producaoMes[a.padeiroId] = (producaoMes[a.padeiroId] || 0) + (parseFloat(a.kgTotal) || 0);
    });

    const rows = metasMes.length > 0 ? metasMes.map(m => {
      const realizado = producaoMes[m.padeiroId] || 0;
      const pct = m.metaKg > 0 ? Math.round((realizado / m.metaKg) * 100) : 0;
      const padeiro = this.padeiros.find(p => p.id === m.padeiroId);
      const cor = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--danger)';
      return `<tr>
        <td style="font-weight:600">${padeiro ? padeiro.nome.split(' ').slice(0,2).join(' ') : '—'}</td>
        <td>${m.metaKg} kg</td>
        <td style="color:${cor};font-weight:700">${realizado.toFixed(1)} kg</td>
        <td style="min-width:150px">
          <div class="progress-bar-inline-container">
            <div class="progress-bar-inline" style="flex:1;"><div class="progress-bar" style="width:${Math.min(pct,100)}%;background:${cor};"></div></div>
            <span style="font-size:12px;font-weight:700;min-width:36px;text-align:right;color:var(--text-primary)">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="4" style="text-align:center;color:var(--text-tertiary);padding:24px;">Nenhuma meta cadastrada para ${mesLabel}.</td></tr>`;

    Components.showModal(`Metas — ${mesLabel} de ${year}`, `
      <div class="table-responsive">
        <table>
          <thead><tr><th>Padeiro</th><th>Meta</th><th>Realizado</th><th>Progresso</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Fechar</button>
       <button class="btn btn-primary" onclick="Components.closeModal();Metas.openMetaForm()">+ Nova Meta</button>`
    );
    Components.renderIcons();
  },

  openMetaForm(id) {
    const m = id ? this.metas.find(x => x.id === id) : {};
    const mesAtual = new Date().toISOString().slice(0,7);
    Components.showModal(id ? 'Editar Meta' : 'Nova Meta', `
      <form id="meta-form">
        <div class="form-group"><label>Padeiro</label>
          <select class="input-control" name="padeiroId" required>
            <option value="">Selecione...</option>
            ${this.padeiros.map(p => `<option value="${p.id}" ${m.padeiroId===p.id?'selected':''}>${p.nome} (${p.cargo})</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Meta de Produção (KG)</label>
            <input class="input-control" type="number" name="metaKg" value="${m.metaKg||''}" step="0.1" required>
          </div>
          <div class="form-group w-full"><label>Período (Mês)</label>
            <input class="input-control" type="month" name="periodo" value="${m.periodo||mesAtual}" required>
          </div>
        </div>
        <div class="form-group"><label>Observação</label>
          <textarea class="input-control" name="observacao" rows="2" placeholder="Opcional...">${m.observacao||''}</textarea>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Metas.saveMeta('${id||''}')">Salvar</button>`
    );
    Components.renderIcons();
  },

  async saveMeta(id) {
    const form = document.getElementById('meta-form');
    if (!form.checkValidity()) return form.reportValidity();

    const body = Object.fromEntries(new FormData(form));
    body.metaKg = parseFloat(body.metaKg);
    const padeiro = this.padeiros.find(p => p.id === body.padeiroId);
    if (padeiro) body.padeiroNome = padeiro.nome;
    try {
      if (id) await API.put(`/api/metas/${id}`, body);
      else await API.post('/api/metas', body);
      Components.closeModal();
      Components.toast('Meta salva!','success');
      await this.render();
    } catch(e) { Components.toast(e.message,'error'); }
  },

  async deleteMeta(id) {
    if (confirm('Excluir esta meta?')) {
      try { await API.delete(`/api/metas/${id}`); Components.toast('Meta excluída.','success'); await Metas.render(); }
      catch(e) { Components.toast(e.message,'error'); }
    }
  },

  async resetMetas() {
    if (confirm('⚠️ ATENÇÃO: Isso excluirá TODAS as metas de todos os meses e padeiros. Deseja continuar?')) {
      try {
        await API.delete('/api/metas/reset/all');
        Components.toast('Todas as metas foram excluídas.', 'success');
        await this.render();
      } catch(e) {
        Components.toast(e.message, 'error');
      }
    }
  }
};
