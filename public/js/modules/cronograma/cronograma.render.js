/**
 * ARQUIVO: cronograma.render.js
 * CATEGORIA: Cronograma › Renderização principal
 * RESPONSABILIDADE: Renderiza o layout semanal (kanban) e controla navegação
 * DEPENDE DE: cronograma.state.js, cronograma.styles.js, API, Components
 * EXPORTA: render(), renderContent(), renderSemanal(), renderMatrixCard(),
 *           setView(), getWeekDates(), prevWeek(), nextWeek()
 */

Object.assign(Cronograma, {
  async render() {
    this.renderStyles();
    const c = document.getElementById('page-container');
    c.innerHTML = Components.loading();
    try {
      const [tarefas, padeiros, clientes, metas, atividades] = await Promise.all([
        API.get('/api/cronograma'),
        API.get('/api/padeiros'),
        API.get('/api/clientes'),
        API.get('/api/metas'),
        API.get('/api/atividades')
      ]);
      this.tarefas = tarefas;
      this.padeiros = padeiros;
      this.clientes = clientes;
      this.metas = metas;
      this.atividades = atividades;
      this.renderContent(c);
    } catch (e) {
      c.innerHTML = `<div class="toast error">Erro: ${e.message}</div>`;
    }
  },

  renderContent(c) {
    c.innerHTML = `
    <style>
      @media (max-width: 430px) {
        .cronograma-actions {
          flex-direction: column !important;
          gap: 12px !important;
          width: 100% !important;
        }
        .cronograma-actions .btn {
          width: 100% !important;
          height: 50px !important;
          border-radius: 14px !important;
          font-weight: 600 !important;
          justify-content: center !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
        }
        .btn-primary.btn-pill {
          box-shadow: 0 4px 14px rgba(28,126,242,0.3) !important;
        }
      }
    </style>
    <div class="fade-in">
      <div class="flex justify-between items-center mb-6 cronograma-header" style="flex-wrap:wrap; gap:16px;">
        <div class="segmented-control" onclick="Components.createRipple(event, this)">
          <div class="segmented-slider" style="width: 50%; transform: translateX(${this.currentView === 'mensal' ? '100%' : '0'})"></div>
          <div class="segmented-item ${this.currentView === 'semanal' ? 'active' : ''}" onclick="Cronograma.setView('semanal')">Semanal</div>
          <div class="segmented-item ${this.currentView === 'mensal' ? 'active' : ''}" onclick="Cronograma.setView('mensal')">Mensal</div>
        </div>
        <div class="flex items-center gap-3 cronograma-actions">
          <button class="btn btn-primary btn-pill" onclick="Cronograma.openTaskForm()">
            <i data-lucide="plus"></i> Nova Tarefa
          </button>
          <button class="btn btn-pill" style="background-color: rgba(175, 82, 222, 0.1); color: #AF52DE; border: none; font-weight: 600;" onclick="Cronograma.openSmartSchedule()">
            <i data-lucide="sparkles"></i> Inteligente
          </button>
          <button class="btn btn-pill" style="background-color: rgba(239, 68, 68, 0.1); color: #EF4444; border: none; font-weight: 600;" onclick="Cronograma.deleteAllTasks()">
            <i data-lucide="trash-2"></i> Limpar
          </button>
        </div>
      </div>
      <div id="cronograma-content"></div>
    </div>`;
    if (this.currentView === 'semanal') this.renderSemanal();
    else this.renderMensal();
    Components.renderIcons();
  },

  setView(view) {
    this.currentView = view;
    // Update active state and slider without full re-render
    document.querySelectorAll('.segmented-control .segmented-item').forEach(item => {
      item.classList.toggle('active', item.innerText.toLowerCase() === view);
    });
    const slider = document.querySelector('.segmented-control .segmented-slider');
    if (slider) {
      slider.style.width = '50%';
      slider.style.transform = `translateX(${view === 'mensal' ? '100%' : '0'})`;
    }
    
    const cc = document.getElementById('cronograma-content');
    if (view === 'semanal') this.renderSemanal();
    else this.renderMensal();
    Components.renderIcons();
  },

  getWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=dom, 1=seg...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (this.weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 6; i++) { // seg-sab
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  },

  renderSemanal() {
    const dates = this.getWeekDates();
    const startStr = dates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const endStr = dates[5].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const today = new Date().toISOString().split('T')[0];
    const currentFilial = this.padeiros.find(p => p.ativo)?.filial || 'Brago Distribuidora';

    const cc = document.getElementById('cronograma-content');
    cc.innerHTML = `
    <!-- Week Navigation -->
    <div class="week-nav">
      <button class="btn btn-icon" onclick="Cronograma.prevWeek()"><i data-lucide="chevron-left"></i></button>
      <div style="text-align:center;">
        <h3 style="margin:0;">${startStr} — ${endStr}</h3>
        <div class="text-secondary" style="font-size:13px; font-weight:500;">
          ${this.weekOffset === 0 ? 'Semana Atual' : this.weekOffset > 0 ? `+${this.weekOffset} semana(s)` : `${this.weekOffset} semana(s)`}
          ${this.weekOffset !== 0 ? ` &bull; <a href="#" class="text-blue" style="text-decoration:none;" onclick="Cronograma.weekOffset=0;Cronograma.renderSemanal();return false;">Voltar para hoje</a>` : ''}
        </div>
      </div>
      <button class="btn btn-icon" onclick="Cronograma.nextWeek()"><i data-lucide="chevron-right"></i></button>
    </div>

    <div class="matrix-container">
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="matrix-sticky-col">PADEIROS</th>
            ${dates.map((date, i) => {
              const dayName = this.diasSemana[i].substring(0, 3);
              const dayNum = date.getDate();
              return `<th>${dayName} ${dayNum}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const grouped = this.padeiros.filter(p => p.ativo).reduce((acc, p) => {
              const filial = p.filial || 'Sem Filial';
              if (!acc[filial]) acc[filial] = [];
              acc[filial].push(p);
              return acc;
            }, {});

            return Object.keys(grouped).sort().map(filial => {
              const branchHeader = `
                <tr class="branch-pill-row">
                  <td colspan="${dates.length + 1}" style="background: transparent !important; border: none !important; padding: 20px 0 0 0 !important;">
                    <div style="display: flex; justify-content: center; width: 100%; position: relative; z-index: 30; margin-bottom: -1px;">
                      <div class="branch-pill">
                        <i data-lucide="map-pin" size="12"></i>
                        <span>FILIAL: ${filial}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr class="baker-pill-row">
                  <td class="matrix-sticky-col" style="background: transparent !important; border: none !important; padding: 0 !important;">
                    <div class="baker-pill-container">
                      <div class="baker-pill">
                        <i data-lucide="users" size="12"></i>
                        <span>PADEIROS</span>
                      </div>
                    </div>
                  </td>
                  <td colspan="6" class="matrix-branch-header" style="padding: 0 !important;">
                    <div class="days-pill-container">
                      ${dates.map((date, i) => {
                        const dayName = this.diasSemana[i].substring(0, 3);
                        const dayNum = date.getDate();
                        const dateStr = date.toISOString().split('T')[0];
                        const isToday = dateStr === today;
                        return `
                          <div class="day-pill-item ${isToday ? 'active' : ''}">
                            ${dayName} <span>${dayNum}</span>
                          </div>`;
                      }).join('')}
                    </div>
                  </td>
                </tr>`;

              const bakerRows = grouped[filial].map(p => {
                const isExpanded = this.expandedBakers.has(p.id);
                const bakerInitial = p.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                
                return `
                <tr class="baker-row-mobile ${isExpanded ? 'expanded' : ''}">
                  <!-- Mobile View Container -->
                  <td colspan="7" class="mobile-only" style="padding:0 !important; border:none !important;">
                    <div class="baker-header-mobile" onclick="Cronograma.toggleBaker('${p.id}')">
                      <div style="display:flex; align-items:center; gap:12px;">
                        <div class="avatar" style="width:32px; height:32px; font-size:11px;">${bakerInitial}</div>
                        <div>
                          <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${p.nome.split(' ').slice(0, 2).join(' ')}</div>
                          <div class="text-tertiary" style="font-size:10px; font-family:monospace;">COD ${p.codTec}</div>
                        </div>
                      </div>
                      <i data-lucide="chevron-${isExpanded ? 'up' : 'down'}" size="18" style="color:var(--text-tertiary);"></i>
                    </div>

                    <div class="days-scroll-mobile">
                      ${dates.map((date, i) => {
                        const dateStr = date.toISOString().split('T')[0];
                        const dayName = this.diasSemana[i];
                        const dayNum = date.getDate();
                        const tarefasDaCelula = this.tarefas
                          .filter(t => t.data === dateStr && t.padeiroId === p.id)
                          .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
                        
                        return `
                        <div class="day-column-mobile">
                          <div class="day-label-mobile">
                            <span>${dayName} ${dayNum}</span>
                            ${dateStr === today ? '<span class="badge badge-primary" style="font-size:8px; padding:1px 4px;">Hoje</span>' : ''}
                          </div>
                          ${tarefasDaCelula.map(t => this.renderMatrixCard(t)).join('')}
                          <button 
                            class="matrix-add-btn"
                            onclick="event.stopPropagation(); Cronograma.openQuickAddForm('${dateStr}', '${p.id}')"
                            title="Adicionar cliente">
                            <i data-lucide="plus" size="18"></i>
                          </button>
                        </div>`;
                      }).join('')}
                    </div>
                  </td>

                  <!-- Desktop Column -->
                  <td class="matrix-sticky-col desktop-only">
                    <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">${p.nome.split(' ').slice(0, 2).join(' ')}</div>
                    <div class="text-tertiary" style="font-family: monospace; font-size: 11px;">COD ${p.codTec}</div>
                  </td>

                  <!-- Desktop Cells -->
                  ${dates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const tarefasDaCelula = this.tarefas
                      .filter(t => t.data === dateStr && t.padeiroId === p.id)
                      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
                    return `
                    <td class="matrix-cell desktop-only" 
                        data-date="${dateStr}" 
                        data-padeiro-id="${p.id}"
                        data-padeiro-nome="${p.nome}"
                        data-padeiro-cod="${p.codTec}"
                        ondragover="Cronograma.onDragOver(event)"
                        ondragenter="Cronograma.onDragEnter(event)"
                        ondragleave="Cronograma.onDragLeave(event)"
                        ondrop="Cronograma.onDrop(event)">
                      ${tarefasDaCelula.map(t => this.renderMatrixCard(t)).join('')}
                      <button 
                        class="matrix-add-btn"
                        onclick="event.stopPropagation(); Cronograma.openQuickAddForm('${dateStr}', '${p.id}')"
                        title="Adicionar cliente">
                        <i data-lucide="plus" size="14"></i>
                      </button>
                    </td>`;
                  }).join('')}
                </tr>`;
              }).join('');

              return branchHeader + bakerRows;
            }).join('');
          })()}
        </tbody>
      </table>
    </div>`;
    Components.renderIcons();
  },

  renderMatrixCard(t) {
    const status = t.status || 'pendente';
    let statusClass = '';
    let statusText = 'Pendente';
    if (status === 'concluida') { statusClass = 'concluida'; statusText = 'Concluída'; }
    if (status === 'em_andamento') { statusClass = 'em_andamento'; statusText = 'Andamento'; }
    
    return `
    <div class="matrix-task-card ${statusClass}" draggable="true"
         data-task-id="${t.id}"
         ondragstart="Cronograma.onDragStart(event, '${t.id}')"
         ondragend="Cronograma.onDragEnd(event)"
         ondragover="Cronograma.onDragOverTask(event)"
         ondrop="Cronograma.onDropTask(event, '${t.id}')"
         onclick="Cronograma.openTaskDetail('${t.id}')">
      <div class="matrix-reorder-btns">
        <button class="reorder-btn" onclick="event.stopPropagation(); Cronograma.changeTaskOrder('${t.id}', -1)" title="Mover para cima">
          <i data-lucide="chevron-up"></i>
        </button>
        <button class="reorder-btn" onclick="event.stopPropagation(); Cronograma.changeTaskOrder('${t.id}', 1)" title="Mover para baixo">
          <i data-lucide="chevron-down"></i>
        </button>
        <button class="reorder-btn delete-btn" onclick="event.stopPropagation(); Cronograma.deleteTask('${t.id}')" title="Excluir tarefa">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="matrix-task-client" title="${t.clienteNome || '—'}">${t.clienteNome || '—'}</div>
      <div class="matrix-task-meta">
        <span>${t.horario ? `<i data-lucide="clock" size="10"></i> ${t.horario} → ${t.horarioFim || '17:00'}` : ''}</span>
        ${t.observacao && t.observacao.includes('Inteligente') ? `<i data-lucide="sparkles" size="12" style="color: #AF52DE;" title="Escala Inteligente"></i>` : ''}
      </div>
      <div class="mt-2">
        <span class="matrix-status-badge badge-${status === 'concluida' ? 'success' : status === 'em_andamento' ? 'blue' : 'amber'}">
          ${statusText}
        </span>
      </div>
    </div>`;
  },

  prevWeek() { this.weekOffset--; this.renderSemanal(); },
  nextWeek() { this.weekOffset++; this.renderSemanal(); },
});
