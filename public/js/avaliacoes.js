/**
 * Avaliações Module - Client, Manager, and Combined Evaluations
 * BRAGO Sistema Padeiro
 */
const Avaliacoes = {
  currentTab: 'gestor',
  async render() {
    const c = document.getElementById('page-container');
    c.innerHTML = Components.loading();
    try {
      const [avaliacoes, padeiros, criterios] = await Promise.all([
        API.get('/api/avaliacoes'), API.get('/api/padeiros'), API.get('/api/criterios')
      ]);
      this.avaliacoes = avaliacoes;
      this.padeiros = padeiros;
      this.criterios = criterios;
      this.renderContent(c);
    } catch(e) { c.innerHTML = `<div class="toast error">Erro: ${e.message}</div>`; }
  },

  renderContent(c) {
    c.innerHTML = `
    <div class="fade-in">
      <div class="apple-segmented-control mb-6">
        <div class="apple-segmented-slider" style="width: calc(33.33% - 2px); transform: translateX(${this.currentTab === 'cliente' ? '100%' : this.currentTab === 'combinada' ? '200%' : '0'})"></div>
        <div id="tab-gestor" class="apple-segmented-item ${this.currentTab==='gestor'?'active':''}" onclick="Avaliacoes.setTab('gestor')">Gestor</div>
        <div id="tab-cliente" class="apple-segmented-item ${this.currentTab==='cliente'?'active':''}" onclick="Avaliacoes.setTab('cliente')">Clientes</div>
        <div id="tab-combinada" class="apple-segmented-item ${this.currentTab==='combinada'?'active':''}" onclick="Avaliacoes.setTab('combinada')">Nota Combinada</div>
      </div>
      <div id="aval-content"></div>
    </div>`;
    this.renderTab();
  },

  setTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.apple-segmented-item').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    
    const idx = tab === 'gestor' ? 0 : tab === 'cliente' ? 1 : 2;
    const slider = document.querySelector('.apple-segmented-slider');
    if (slider) {
      slider.style.width = 'calc(33.33% - 2px)';
      slider.style.transform = `translateX(${idx * 100}%)`;
    }
    this.renderTab();
  },

  renderTab() {
    this.renderStyles();
    const c = document.getElementById('aval-content');
    if (this.currentTab === 'gestor') this.renderGestor(c);
    else if (this.currentTab === 'cliente') this.renderCliente(c);
    else this.renderCombinada(c);
  },

  renderStyles() {
    if (document.getElementById('avaliacoes-apple-css')) return;
    const style = document.createElement('style');
    style.id = 'avaliacoes-apple-css';
    style.innerHTML = `
      .avaliacoes-view {
        --apple-blue: #007AFF;
        --apple-green: #34C759;
        --apple-red: #FF3B30;
        --apple-gray: #8E8E93;
        --apple-bg: #F2F2F7;
        --apple-card: #FFFFFF;
        --apple-separator: #C6C6C8;
      }

      @media (max-width: 430px) {
        .page-title { font-size: 28px !important; font-weight: 800 !important; letter-spacing: -0.5px !important; margin-bottom: 20px !important; }
        .card { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
        .table-responsive { display: none !important; }
        
        .apple-list { display: flex; flex-direction: column; gap: 12px; padding: 4px 0 100px 0; }
        .apple-card {
          background: var(--apple-card);
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          position: relative;
          transition: transform 0.2s;
        }
        .apple-card:active { transform: scale(0.98); background: #F9F9F9; }
        
        .apple-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: var(--apple-blue);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 17px;
          flex-shrink: 0;
        }
        
        .apple-card-info { flex: 1; min-width: 0; }
        .apple-card-title { font-size: 17px; font-weight: 700; color: #000; margin-bottom: 2px; }
        .apple-card-subtitle { font-size: 13px; color: var(--apple-gray); margin-bottom: 6px; }
        
        .apple-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(0,122,255,0.1);
          color: var(--apple-blue);
        }
        .apple-badge.success { background: rgba(52,199,89,0.1); color: var(--apple-green); }
        .apple-badge.danger { background: rgba(255,59,48,0.1); color: var(--apple-red); }
        
        .apple-card-actions { display: flex; align-items: center; gap: 12px; }
        .apple-chevron { color: var(--apple-separator); }
        
        /* Floating Action Button */
        .btn-new-aval {
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
    document.getElementById('page-container').classList.add('avaliacoes-view');
  },

  // ── Avaliação do Gestor ──
  renderGestor(c) {
    const gestorAvals = this.avaliacoes.filter(a => a.tipo === 'gestor');
    c.innerHTML = `
    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="flex justify-between items-center desktop-only" style="padding: 24px; border-bottom: 1px solid var(--separator);">
        <h3 style="font-size: 15px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="clipboard-check" style="color: var(--system-blue);"></i> Avaliações do Gestor
        </h3>
        <button class="btn btn-outline btn-pill" onclick="Avaliacoes.openGestorForm()">
          <i data-lucide="plus"></i> Nova Avaliação
        </button>
      </div>

      <!-- Mobile Button -->
      <button class="mobile-only btn-new-aval" onclick="Avaliacoes.openGestorForm()">
        <i data-lucide="plus" size="28"></i>
      </button>

      ${gestorAvals.length === 0 ? `
      <div style="padding: 60px 24px; text-align: center; color: var(--text-tertiary);">
        <i data-lucide="inbox" size="48" style="margin-bottom: 16px; opacity: 0.5;"></i>
        <div style="font-size: 14px; font-weight: 500;">Nenhuma avaliação registrada ainda</div>
      </div>` : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table style="width: 100%;">
          <thead style="background: #F9FAFB;">
            <tr>
              <th style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #9CA3AF; padding: 12px 24px; font-weight: 600;">Padeiro</th>
              <th style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #9CA3AF; padding: 12px 24px; font-weight: 600;">Data</th>
              <th style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #9CA3AF; padding: 12px 24px; font-weight: 600;">Nota</th>
              <th style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #9CA3AF; padding: 12px 24px; font-weight: 600; text-align: right;">Detalhes</th>
            </tr>
          </thead>
          <tbody>${gestorAvals.map(a => {
            const nota = this.calcGestorNota(a);
            return `<tr class="gestor-row" style="transition: background-color 0.2s;">
              <td style="padding: 16px 24px; font-weight: 600; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid #F3F4F6;">${a.padeiroNome||'—'}</td>
              <td style="padding: 16px 24px; color: #6B7280; font-size: 13px; border-bottom: 1px solid #F3F4F6;">${new Date(a.criadoEm).toLocaleDateString('pt-BR')}</td>
              <td style="padding: 16px 24px; border-bottom: 1px solid #F3F4F6;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px; font-weight: 700; color: #16A34A;">${nota.toFixed(1)}</span>
                  <div style="display: flex; gap: 2px;">
                    ${[1,2,3,4,5].map(i => `<i data-lucide="star" size="16" style="color: ${i <= Math.round(nota) ? '#F59E0B' : '#E5E7EB'}; fill: ${i <= Math.round(nota) ? '#F59E0B' : 'transparent'};"></i>`).join('')}
                  </div>
                </div>
              </td>
              <td style="padding: 16px 24px; text-align: right; border-bottom: 1px solid #F3F4F6;">
                <div class="row-actions" style="display: flex; justify-content: flex-end;">
                  <button class="btn btn-icon btn-sm" onclick="Avaliacoes.viewGestorDetail('${a.id}')" title="Ver detalhes"><i data-lucide="eye" style="color: var(--text-tertiary);"></i></button>
                </div>
              </td>
            </tr>`;}).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Mobile List -->
      <div class="apple-list mobile-only">
        ${gestorAvals.map(a => {
          const nota = this.calcGestorNota(a);
          const initials = (a.padeiroNome || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          const avatarColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
          const bgColor = avatarColors[initials.charCodeAt(0) % avatarColors.length];
          
          return `
          <div class="apple-card" onclick="Avaliacoes.viewGestorDetail('${a.id}')">
            <div class="apple-avatar" style="background: ${bgColor}">${initials}</div>
            <div class="apple-card-info">
              <div class="apple-card-title">${a.padeiroNome || '—'}</div>
              <div class="apple-card-subtitle">${new Date(a.criadoEm).toLocaleDateString('pt-BR')}</div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div class="apple-badge ${nota >= 4 ? 'success' : nota < 2.5 ? 'danger' : ''}">
                  Nota ${nota.toFixed(1)}
                </div>
                <div style="display: flex; gap: 1px;">
                  ${[1,2,3,4,5].map(i => `<i data-lucide="star" size="10" style="color: ${i <= Math.round(nota) ? '#F59E0B' : '#E5E7EB'}; fill: ${i <= Math.round(nota) ? '#F59E0B' : 'transparent'};"></i>`).join('')}
                </div>
              </div>
            </div>
            <div class="apple-chevron">
              <i data-lucide="chevron-right" size="18"></i>
            </div>
          </div>`;
        }).join('')}
      </div>
      `}
    </div>`;
  },

  calcGestorNota(aval) {
    if (!aval.respostas) return 0;
    let total = 0, count = 0;
    Object.values(aval.respostas).forEach(r => {
      if (typeof r === 'boolean') { total += r ? 5 : 0; count++; }
      else if (typeof r === 'number') { total += r; count++; }
    });
    return count > 0 ? total / count : 0;
  },

  openGestorForm() {
    Components.showModal('Nova Avaliação do Gestor', `
      <form id="gestor-aval-form">
        <div class="form-group"><label>Padeiro</label>
          <select class="input-control" name="padeiroId" id="aval-padeiro" required>
            <option value="">Selecione o padeiro...</option>
            ${this.padeiros.map(p => `<option value="${p.id}" data-nome="${p.nome}">${p.nome} (${p.cargo})</option>`).join('')}
          </select>
        </div>
        <hr style="border-color:var(--separator);margin:24px 0">
        <h4 style="margin-bottom:16px; font-size: 15px;">Critérios de Avaliação</h4>
        ${this.criterios.map(cr => `
          <div class="form-group" style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--separator)">
            <span style="font-weight: 500; font-size: 14px;">${cr.texto}</span>
            ${cr.tipo === 'boolean' 
              ? `<div style="display:flex;gap:8px">
                  <button type="button" class="badge badge-green criterio-btn" data-id="${cr.id}" data-val="true" onclick="Avaliacoes.setCriterio(this,true)" style="opacity:0.4; cursor: pointer; border:none;">Sim</button>
                  <button type="button" class="badge badge-red criterio-btn" data-id="${cr.id}" data-val="false" onclick="Avaliacoes.setCriterio(this,false)" style="opacity:0.4; cursor: pointer; border:none;">Não</button>
                </div>`
              : `<div>${Components.starRating(0, 'criterio-'+cr.id)}</div>`
            }
          </div>
        `).join('')}
        <div class="form-group" style="margin-top:24px"><label>Observações</label>
          <textarea class="input-control" name="observacao" rows="3" placeholder="Comentários adicionais..."></textarea>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Avaliacoes.saveGestorAval()">Salvar Avaliação</button>`
    );
    Components.renderIcons();
  },

  setCriterio(btn, val) {
    const id = btn.dataset.id;
    document.querySelectorAll(`.criterio-btn[data-id="${id}"]`).forEach(b => {
      b.style.opacity = '0.4';
      delete b.dataset.selected;
    });
    btn.style.opacity = '1';
    btn.dataset.selected = 'true';
    btn.dataset.val = val; // Ensure data-val is set/correct
  },

  async saveGestorAval() {
    const select = document.getElementById('aval-padeiro');
    const padeiroId = select.value;
    const padeiroNome = select.options[select.selectedIndex]?.dataset?.nome || '';
    if (!padeiroId) { Components.toast('Selecione um padeiro.','error'); return; }

    const respostas = {};
    this.criterios.forEach(cr => {
      if (cr.tipo === 'boolean') {
        const selected = document.querySelector(`.criterio-btn[data-id="${cr.id}"][data-selected="true"]`);
        if (selected) respostas[cr.id] = selected.dataset.val === 'true';
      } else {
        const stars = document.querySelector(`[data-name="criterio-${cr.id}"]`);
        if (stars) respostas[cr.id] = parseInt(stars.dataset.value) || 0;
      }
    });

    const obs = document.querySelector('[name="observacao"]')?.value || '';

    // Calculate overall score (nota) from responses
    let total = 0, count = 0;
    Object.values(respostas).forEach(r => {
      if (typeof r === 'boolean') { total += r ? 5 : 0; count++; }
      else if (typeof r === 'number') { total += r; count++; }
    });
    const nota = count > 0 ? total / count : 0;

    try {
      await API.post('/api/avaliacoes', { 
        tipo: 'gestor', 
        padeiroId, 
        padeiroNome, 
        respostas, 
        nota, 
        observacao: obs 
      });
      Components.closeModal();
      Components.toast('Avaliação salva!','success');
      await this.render();
    } catch(e) { Components.toast(e.message,'error'); }
  },

  viewGestorDetail(id) {
    const a = this.avaliacoes.find(x => x.id === id);
    if (!a) return;
    const nota = this.calcGestorNota(a);
    let details = '';
    this.criterios.forEach(cr => {
      const val = a.respostas?.[cr.id];
      if (cr.tipo === 'boolean') {
        details += `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--separator)"><span style="font-size: 14px;">${cr.texto}</span>${val ? '<span class="text-success" style="font-weight:600; display:flex; align-items:center; gap:4px;"><i data-lucide="check"></i> Sim</span>' : '<span class="text-danger" style="font-weight:600; display:flex; align-items:center; gap:4px;"><i data-lucide="x"></i> Não</span>'}</div>`;
      } else {
        details += `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--separator)"><span style="font-size: 14px;">${cr.texto}</span><span class="text-primary" style="font-weight:600; display:flex; align-items:center; gap:4px;"><i data-lucide="star" size="14"></i> ${val||0}/5</span></div>`;
      }
    });
    Components.showModal(`Avaliação - ${a.padeiroNome}`, `
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;font-weight:800;color:var(--primary)">${nota.toFixed(1)}</div>
        <div class="text-secondary" style="font-size: 13px; font-weight: 500;">Nota do Gestor</div>
      </div>
      <div style="background: var(--system-bg); padding: 0 16px; border-radius: 12px;">
        ${details}
      </div>
      ${a.observacao ? `<div style="margin-top:20px;padding:16px;background:var(--system-bg);border-radius:12px;font-size:14px;line-height:1.5;"><strong>Obs:</strong> ${a.observacao}</div>` : ''}
    `);
    Components.renderIcons();
  },

  // ── Avaliações dos Clientes ──
  renderCliente(c) {
    const clienteAvals = this.avaliacoes.filter(a => a.tipo === 'cliente');
    c.innerHTML = `
    <div class="card">
      <div class="flex justify-between items-center mb-6 desktop-only">
        <h3 style="font-size: 17px; margin: 0; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="star" style="color: var(--primary);"></i> Avaliações dos Clientes
        </h3>
      </div>
      ${clienteAvals.length === 0 ? '<div class="text-tertiary">Nenhuma avaliação de cliente registrada. As avaliações são feitas pelo padeiro durante o fluxo de atividade.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);"><tr><th>Padeiro</th><th>Cliente</th><th>Data</th><th>Nota</th><th>Comentário</th></tr></thead>
          <tbody>${clienteAvals.map(a => `<tr>
            <td style="font-weight:600; color: var(--text-primary);">${a.padeiroNome||'—'}</td>
            <td>${a.clienteNome||'—'}</td>
            <td class="text-secondary">${new Date(a.criadoEm).toLocaleDateString('pt-BR')}</td>
            <td>
              <div class="flex items-center gap-2">
                <span style="font-size:16px;font-weight:700;color:var(--${a.nota>=4?'success':a.nota>=2.5?'primary':'danger'})">${Number(a.nota||0).toFixed(1)}</span>
                ${Components.starsDisplay(a.nota||0)}
              </div>
            </td>
            <td class="text-secondary" style="font-size:13px">${a.observacao||a.comentario||'—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      
      <!-- Mobile List -->
      <div class="apple-list mobile-only">
        ${clienteAvals.map(a => {
          const initials = (a.clienteNome || '?')[0].toUpperCase();
          const avatarColors = ['#1C7EF2', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
          const bgColor = avatarColors[initials.charCodeAt(0) % avatarColors.length];
          
          return `
          <div class="apple-card">
            <div class="apple-avatar" style="background: ${bgColor}">${initials}</div>
            <div class="apple-card-info">
              <div class="apple-card-title">${a.clienteNome || '—'}</div>
              <div class="apple-card-subtitle">Padeiro: ${a.padeiroNome || '—'} • ${new Date(a.criadoEm).toLocaleDateString('pt-BR')}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <span style="font-weight: 700; color: var(--${a.nota>=4?'success':a.nota>=2.5?'primary':'danger'}); font-size: 15px;">${Number(a.nota||0).toFixed(1)}</span>
                <div style="display: flex; gap: 1px;">
                  ${[1,2,3,4,5].map(i => `<i data-lucide="star" size="10" style="color: ${i <= Math.round(a.nota) ? '#F59E0B' : '#E5E7EB'}; fill: ${i <= Math.round(a.nota) ? '#F59E0B' : 'transparent'};"></i>`).join('')}
                </div>
              </div>
              ${(a.observacao || a.comentario) ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">"${a.observacao || a.comentario}"</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      `}
    </div>`;
  },

  // ── Nota Combinada ──
  renderCombinada(c) {
    const porPadeiro = {};
    this.avaliacoes.forEach(a => {
      if (!porPadeiro[a.padeiroId]) porPadeiro[a.padeiroId] = { gestor:[], cliente:[] };
      if (a.tipo === 'gestor') porPadeiro[a.padeiroId].gestor.push(this.calcGestorNota(a));
      if (a.tipo === 'cliente') porPadeiro[a.padeiroId].cliente.push(a.nota||0);
    });

    const ranking = Object.entries(porPadeiro).map(([id, avals]) => {
      const padeiro = this.padeiros.find(p => p.id === id);
      const avgGestor = avals.gestor.length > 0 ? avals.gestor.reduce((a,b)=>a+b,0)/avals.gestor.length : null;
      const avgCliente = avals.cliente.length > 0 ? avals.cliente.reduce((a,b)=>a+b,0)/avals.cliente.length : null;
      let combinada = null;
      if (avgGestor !== null && avgCliente !== null) combinada = (avgGestor + avgCliente) / 2;
      else if (avgGestor !== null) combinada = avgGestor;
      else if (avgCliente !== null) combinada = avgCliente;
      return { id, nome: padeiro?.nome||'—', cargo: padeiro?.cargo||'', avgGestor, avgCliente, combinada, totalAvals: avals.gestor.length + avals.cliente.length };
    }).sort((a,b) => (b.combinada||0)-(a.combinada||0));

    c.innerHTML = `
    <div class="card">
      <div class="flex justify-between items-center mb-6 desktop-only">
        <h3 style="font-size: 17px; margin: 0; display: flex; align-items: center; gap: 8px;">
          <i data-lucide="bar-chart-2" style="color: var(--success);"></i> Ranking - Nota Combinada
        </h3>
      </div>
      ${ranking.length === 0 ? '<div class="text-tertiary">Sem avaliações para calcular nota combinada.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);"><tr><th>#</th><th>Padeiro</th><th>Cargo</th><th>Nota Gestor</th><th>Nota Cliente</th><th>Nota Combinada</th><th>Total Avals.</th></tr></thead>
          <tbody>${ranking.map((r,i) => `<tr>
            <td style="font-weight:700;color:var(--${i<3?'primary':'tertiary'})">${i+1}°</td>
            <td style="font-weight:600; color: var(--text-primary);">${r.nome}</td>
            <td><span class="badge badge-secondary">${r.cargo}</span></td>
            <td>${r.avgGestor !== null ? `<span style="font-weight:600">${r.avgGestor.toFixed(1)}</span> <span class="text-tertiary" style="font-size:11px;">/ 5</span>` : '<span class="text-tertiary">—</span>'}</td>
            <td>${r.avgCliente !== null ? `<span style="font-weight:600">${r.avgCliente.toFixed(1)}</span> <span class="text-tertiary" style="font-size:11px;">/ 5</span>` : '<span class="text-tertiary">—</span>'}</td>
            <td>
              ${r.combinada !== null ? `
                <div class="flex items-center gap-2">
                  <span style="font-size:16px;font-weight:700;color:var(--${r.combinada>=4?'success':r.combinada>=2.5?'primary':'danger'})">${r.combinada.toFixed(1)}</span>
                  ${Components.starsDisplay(r.combinada)}
                </div>
              ` : '<span class="text-tertiary">—</span>'}
            </td>
            <td class="text-secondary">${r.totalAvals}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      
      <!-- Mobile List -->
      <div class="apple-list mobile-only">
        ${ranking.map((r,i) => {
          const initials = (r.nome || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
          const avatarColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
          const bgColor = avatarColors[initials.charCodeAt(0) % avatarColors.length];
          
          return `
          <div class="apple-card">
            <div style="position: absolute; top: 12px; left: 12px; z-index: 5; background: ${i<3 ? '#FFD700' : '#E5E5EA'}; color: ${i<3 ? '#000' : '#8E8E93'}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; border: 2px solid white;">${i+1}</div>
            <div class="apple-avatar" style="background: ${bgColor}">${initials}</div>
            <div class="apple-card-info">
              <div class="apple-card-title">${r.nome}</div>
              <div class="apple-card-subtitle">${r.cargo} • ${r.totalAvals} avaliações</div>
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 10px; color: var(--apple-gray); text-transform: uppercase;">Média Final</span>
                  <span style="font-weight: 800; color: var(--${r.combinada>=4?'success':r.combinada>=2.5?'primary':'danger'}); font-size: 18px; line-height: 1;">${Number(r.combinada||0).toFixed(1)}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 10px; color: var(--apple-gray); text-transform: uppercase;">Gestor</span>
                  <span style="font-weight: 600; font-size: 13px;">${r.avgGestor ? r.avgGestor.toFixed(1) : '—'}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                  <span style="font-size: 10px; color: var(--apple-gray); text-transform: uppercase;">Cliente</span>
                  <span style="font-weight: 600; font-size: 13px;">${r.avgCliente ? r.avgCliente.toFixed(1) : '—'}</span>
                </div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      `}
    </div>`;
  }
};
