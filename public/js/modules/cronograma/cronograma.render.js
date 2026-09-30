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
    this.savedScrolls = {};
    document.querySelectorAll('.baker-row-mobile').forEach(row => {
      const bakerId = row.dataset.bakerId;
      const scrollEl = row.querySelector('.days-scroll-mobile');
      if (bakerId && scrollEl) {
        this.savedScrolls[bakerId] = scrollEl.scrollLeft;
      }
    });
    this.savedVerticalScroll = window.scrollY || document.documentElement.scrollTop;

    this.renderStyles();
    const c = document.getElementById('page-container');
    c.innerHTML = Components.loading();
    try {
      const [tarefas, padeiros, clientes, metas, atividades, users] = await Promise.all([
        API.get('/api/cronograma'),
        API.get('/api/padeiros'),
        API.get('/api/clientes'),
        API.get('/api/metas'),
        API.get('/api/atividades'),
        API.get('/api/management/users').catch(() => [])
      ]);
      this.tarefas = tarefas;
      this.padeiros = padeiros;
      this.clientes = clientes;
      this.metas = metas;
      this.atividades = atividades;
      this.users = users;
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
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
          width: 100% !important;
        }
        .cronograma-actions .btn {
          width: 100% !important;
          height: 44px !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          justify-content: center !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.02) !important;
        }
        .matrix-task-card {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
        }
        .cronograma-actions .btn-primary {
          grid-column: span 2 !important;
          height: 48px !important;
          font-size: 14px !important;
          border-radius: 14px !important;
          box-shadow: 0 4px 14px rgba(28,126,242,0.3) !important;
        }
      }
    </style>
    <div class="fade-in">
      <div class="flex justify-between items-center mb-6 cronograma-header" style="flex-wrap:wrap; gap:16px;">
        <div class="segmented-control" style="max-width: 380px;" onclick="Components.createRipple(event, this)">
          <div class="segmented-slider" style="width: calc((100% - 4px) / 3); transform: translateX(${this.currentView === 'semanal' ? '0' : this.currentView === 'mensal' ? '100%' : '200%'})"></div>
          <div class="segmented-item ${this.currentView === 'semanal' ? 'active' : ''}" onclick="Cronograma.setView('semanal')">Semanal</div>
          <div class="segmented-item ${this.currentView === 'mensal' ? 'active' : ''}" onclick="Cronograma.setView('mensal')">Mensal</div>
          <div class="segmented-item ${this.currentView === 'solicitacoes' ? 'active' : ''}" onclick="Cronograma.setView('solicitacoes')">Solicitações</div>
        </div>
        <div class="solicitacoes-header-title" style="display: ${this.currentView === 'solicitacoes' ? 'block' : 'none'}; text-align: right; margin-left: auto;">
          <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-tertiary, #8E8E93); text-transform: uppercase; display: block;">CRONOGRAMA DE SOLICITAÇÕES</span>
          <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: var(--text-primary, #111827); letter-spacing: -0.5px; line-height: 1.1;">Daily Operation</h2>
        </div>
        <div class="flex items-center gap-3 cronograma-actions">
          <button class="btn btn-primary btn-pill" onclick="Cronograma.openTaskForm()">
            <i data-lucide="plus"></i> Nova Tarefa
          </button>
          <button class="btn btn-pill" style="background-color: rgba(52, 199, 89, 0.1); color: #34C759; border: none; font-weight: 600;" onclick="Cronograma.openSaveTemplateModal()">
            <i data-lucide="save"></i> Salvar Template
          </button>
          <button class="btn btn-pill" style="background-color: rgba(0, 122, 255, 0.1); color: #007AFF; border: none; font-weight: 600;" onclick="Cronograma.openLoadTemplateModal()">
            <i data-lucide="folder-open"></i> Carregar Template
          </button>
          <button class="btn btn-pill" style="background-color: rgba(175, 82, 222, 0.1); color: #AF52DE; border: none; font-weight: 600;" onclick="Cronograma.openSmartSchedule()">
            <i data-lucide="sparkles"></i> Inteligente
          </button>
          ${API.getUser().role === 'admin' ? `
          <button class="btn btn-pill" style="background-color: rgba(239, 68, 68, 0.1); color: #EF4444; border: none; font-weight: 600;" onclick="Cronograma.deleteAllTasks()">
            <i data-lucide="trash-2"></i> Limpar
          </button>
          ` : ''}
          <button class="btn btn-pill" style="background-color: rgba(255, 149, 0, 0.1); color: #FF9500; border: none; font-weight: 600;" onclick="Cronograma.exportToPDF()">
            <i data-lucide="file-down"></i> Exportar PDF
          </button>
        </div>
      </div>
      <div id="cronograma-content"></div>
    </div>`;
    const actions = c.querySelector('.cronograma-actions');
    const solicHeaderTitle = c.querySelector('.solicitacoes-header-title');
    if (this.currentView === 'solicitacoes') {
      if (actions) actions.style.setProperty('display', 'none', 'important');
      if (solicHeaderTitle) solicHeaderTitle.style.display = 'block';
    } else {
      if (solicHeaderTitle) solicHeaderTitle.style.display = 'none';
      if (actions) {
        if (this.currentView === 'mensal') {
          actions.style.setProperty('display', 'none', 'important');
        } else {
          actions.style.removeProperty('display');
        }
      }
    }
    if (this.currentView === 'semanal') {
      c.classList.remove('tf-page-active');
      document.body.classList.remove('tf-page-active');
      this.renderSemanal();
    } else if (this.currentView === 'mensal') {
      c.classList.add('tf-page-active');
      document.body.classList.add('tf-page-active');
      this.renderMensal();
    } else {
      c.classList.remove('tf-page-active');
      document.body.classList.remove('tf-page-active');
      this.renderSolicitacoes();
    }
    Components.renderIcons();
  },

  setView(view) {
    this.currentView = view;
    // Update active state and slider without full re-render
    document.querySelectorAll('.segmented-control .segmented-item').forEach(item => {
      const text = item.innerText.toLowerCase();
      const isActive = text === view || (text === 'solicitações' && view === 'solicitacoes');
      item.classList.toggle('active', isActive);
    });
    const slider = document.querySelector('.segmented-control .segmented-slider');
    if (slider) {
      slider.style.width = 'calc((100% - 4px) / 3)';
      slider.style.transform = `translateX(${view === 'semanal' ? '0' : view === 'mensal' ? '100%' : '200%'})`;
    }
    
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      if (view === 'mensal') {
        pageContainer.classList.add('tf-page-active');
        document.body.classList.add('tf-page-active');
      } else {
        pageContainer.classList.remove('tf-page-active');
        document.body.classList.remove('tf-page-active');
      }
    }

    const actions = document.querySelector('.cronograma-actions');
    const solicHeaderTitle = document.querySelector('.solicitacoes-header-title');
    if (view === 'solicitacoes') {
      if (actions) actions.style.setProperty('display', 'none', 'important');
      if (solicHeaderTitle) solicHeaderTitle.style.display = 'block';
    } else {
      if (solicHeaderTitle) solicHeaderTitle.style.display = 'none';
      if (actions) {
        if (view === 'mensal') {
          actions.style.setProperty('display', 'none', 'important');
        } else {
          actions.style.removeProperty('display');
        }
      }
    }
    
    const cc = document.getElementById('cronograma-content');
    if (view === 'semanal') this.renderSemanal();
    else if (view === 'mensal') this.renderMensal();
    else this.renderSolicitacoes();
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
    const tempScrolls = { ...this.savedScrolls };
    this.savedScrolls = {}; // Reset

    const tempVerticalScroll = this.savedVerticalScroll !== undefined ? this.savedVerticalScroll : (window.scrollY || document.documentElement.scrollTop);
    this.savedVerticalScroll = undefined; // Reset

    // If tempScrolls is empty, see if we can read current DOM scroll positions
    if (Object.keys(tempScrolls).length === 0) {
      document.querySelectorAll('.baker-row-mobile').forEach(row => {
        const bakerId = row.dataset.bakerId;
        const scrollEl = row.querySelector('.days-scroll-mobile');
        if (bakerId && scrollEl) {
          tempScrolls[bakerId] = scrollEl.scrollLeft;
        }
      });
    }

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
                <tr class="branch-pill-row cascade-item" style="--index: 0;">
                  <td colspan="${dates.length + 1}" style="background: transparent !important; border: none !important; padding: 20px 0 0 0 !important;">
                    <div style="display: flex; justify-content: center; width: 100%; position: relative; z-index: 30; margin-bottom: -1px;">
                      <div class="branch-pill">
                        <i data-lucide="map-pin" size="12"></i>
                        <span>FILIAL: ${filial}</span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr class="baker-pill-row cascade-item" style="--index: 1;">
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

          const bakerRows = grouped[filial].map((p, i) => {
            const isExpanded = this.expandedBakers.has(p.id);
            const bakerInitial = p.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

            return `
                <tr class="baker-row-mobile ${isExpanded ? 'expanded' : ''} cascade-item" style="--index: ${i + 2};" data-baker-id="${p.id}">
                  <!-- Mobile View Container -->
                  <td colspan="7" class="mobile-only" style="padding:0 !important; border:none !important;">
                    <div class="baker-header-mobile" onclick="Cronograma.toggleBaker('${p.id}')">
                      <div style="display:flex; align-items:center; gap:12px;">
                        <div class="avatar" style="width:32px; height:32px; font-size:11px;">${bakerInitial}</div>
                        <div>
                          <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${Cronograma.getDisplayName(p.nome)}</div>
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
                .filter(t => t.data === dateStr && t.padeiroId === p.id && t.status !== 'solicitado')
                .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

              return `
                        <div class="day-column-mobile" data-date="${dateStr}" data-padeiro-id="${p.id}" data-padeiro-nome="${p.nome}" data-padeiro-cod="${p.codTec}">
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
                    <div style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">${Cronograma.getDisplayName(p.nome)}</div>
                    <div class="text-tertiary" style="font-family: monospace; font-size: 11px;">COD ${p.codTec}</div>
                  </td>

                  <!-- Desktop Cells -->
                  ${dates.map(date => {
              const dateStr = date.toISOString().split('T')[0];
              const tarefasDaCelula = this.tarefas
                .filter(t => t.data === dateStr && t.padeiroId === p.id && t.status !== 'solicitado')
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

    // Restore scroll positions
    Object.keys(tempScrolls).forEach(bakerId => {
      const row = document.querySelector(`.baker-row-mobile[data-baker-id="${bakerId}"]`);
      const scrollEl = row?.querySelector('.days-scroll-mobile');
      if (scrollEl) {
        scrollEl.scrollLeft = tempScrolls[bakerId];
      }
    });

    // Restore vertical scroll position
    if (tempVerticalScroll !== undefined) {
      window.scrollTo(0, tempVerticalScroll);
    }
  },

  renderMatrixCard(t) {
    const status = t.status || 'pendente';
    let statusClass = 'pendente';
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
         ontouchstart="Cronograma.onTouchStart(event, '${t.id}')"
         ontouchmove="Cronograma.onTouchMove(event)"
         ontouchend="Cronograma.onTouchEnd(event)"
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
      <div style="font-size: 10px; color: var(--text-tertiary); margin-bottom: 2px; font-weight: 600; text-transform: uppercase;">Cliente</div>
      <div class="matrix-task-client" title="${t.clienteNome || '—'}" style="display: flex; align-items: flex-start; gap: 4px; min-height: 40px; height: auto;">
        <i data-lucide="store" size="12" style="margin-top: 2px; color: var(--text-tertiary); flex-shrink: 0;"></i>
        <div style="flex: 1; min-width: 0; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; white-space: normal; word-break: break-word;">
          ${t.clienteNome || '—'}
        </div>
      </div>
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

  renderSolicitacoes() {
    const cc = document.getElementById('cronograma-content');
    if (!cc) return;

    const allTarefas = this.tarefas || [];
    const usersMap = new Map((this.users || []).map(u => [u.id, u]));

    // Filtra tarefas criadas por vendedores (vendedorId ou status 'solicitado' original ou role 'vendedor')
    const solicitacoesVendedor = allTarefas.filter(t => {
      const creator = usersMap.get(t.criadoPor);
      const isVendedor = creator && creator.role === 'vendedor';
      return t.status === 'solicitado' || isVendedor;
    });

    // Categorização das 3 colunas Kanban baseadas apenas em solicitações de vendedores
    const pendentes = solicitacoesVendedor.filter(t => t.status === 'solicitado' || !t.padeiroId);
    const emAndamento = solicitacoesVendedor.filter(t => t.status === 'em_andamento');
    const aprovadas = solicitacoesVendedor.filter(t => t.status === 'concluida' || (t.status === 'pendente' && t.padeiroId && t.status !== 'solicitado'));

    // Ordenação por data
    const sortByDate = (a, b) => (a.data || '').localeCompare(b.data || '');
    pendentes.sort(sortByDate);
    emAndamento.sort(sortByDate);
    aprovadas.sort(sortByDate);

    // Helpers de renderização de card Kanban com paleta alinhada ao Azul da Sidebar (#1E4BFF -> #5E82FF)
    const renderCard = (s, statusType, index) => {
      const dataObj = s.data ? new Date(s.data + 'T12:00:00') : new Date();
      const shortDate = `${dataObj.getDate()}.${dataObj.getMonth() + 1}.${String(dataObj.getFullYear()).slice(-2)}`;
      const obsText = s.observacao ? s.observacao.trim() : 'Sem observações';

      let themeClass = 'theme-blue';
      let stepProgress = 1;
      
      // Resolve o nome real do vendedor usando a lista de usuários carregada
      const creator = usersMap.get(s.criadoPor);
      let personName = creator ? creator.nome : (s.vendedorNome || 'Vendedor');

      if (statusType === 'pendente') {
        themeClass = index % 2 === 0 ? 'theme-blue' : 'theme-white';
        stepProgress = 1;
      } else if (statusType === 'em_andamento') {
        themeClass = index % 2 === 0 ? 'theme-cyan' : 'theme-blue';
        stepProgress = 2;
        personName = s.padeiroNome ? Cronograma.getDisplayName(s.padeiroNome) : 'Padeiro';
      } else if (statusType === 'aprovada') {
        themeClass = index % 2 === 0 ? 'theme-purple' : 'theme-white';
        stepProgress = 4;
        personName = s.padeiroNome ? Cronograma.getDisplayName(s.padeiroNome) : 'Padeiro Alocado';
      }

      // Iniciais para o Avatar circular
      const initials = personName
        .split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'P';

      return `
        <div class="kanban-card ${themeClass}" data-id="${s.id}">
          <!-- Card Header Top: Title + Options -->
          <div class="kanban-card-header">
            <h4 class="kanban-card-title" title="${s.clienteNome}">${s.clienteNome}</h4>
            <button class="kanban-card-more" title="Mais Opções" onclick="event.stopPropagation();">
              <i data-lucide="more-horizontal" size="16"></i>
            </button>
          </div>

          <!-- Progress Dash Indicator -->
          <div class="kanban-progress-dashes">
            <span class="dash ${stepProgress >= 1 ? 'active' : ''}"></span>
            <span class="dash ${stepProgress >= 2 ? 'active' : ''}"></span>
            <span class="dash ${stepProgress >= 3 ? 'active' : ''}"></span>
            <span class="dash ${stepProgress >= 4 ? 'active' : ''}"></span>
          </div>

          <!-- Body Info -->
          <div class="kanban-card-body">
            <p class="kanban-obs" title="${obsText}">
              <span>${obsText}</span>
            </p>
            ${s.horario ? `<span class="kanban-time-badge"><i data-lucide="clock" size="11"></i> ${s.horario}</span>` : ''}
          </div>

          <!-- Card Footer: Avatar + Name + Date & Action -->
          <div class="kanban-card-footer">
            <div class="kanban-user-info">
              <div class="kanban-avatar">${initials}</div>
              <div class="kanban-user-meta">
                <span class="kanban-user-name" title="${personName}">${personName}</span>
                <span class="kanban-user-date">${shortDate}</span>
              </div>
            </div>

            <div class="kanban-card-actions">
              ${statusType === 'pendente' ? `
                <button class="kanban-action-btn btn-reject" title="Rejeitar" onclick="event.stopPropagation(); Cronograma.deleteTask('${s.id}')">
                  <i data-lucide="trash-2" size="12"></i>
                </button>
                <button class="kanban-action-btn btn-approve" title="Aprovar" onclick="event.stopPropagation(); Cronograma.openAprovarSolicitacao('${s.id}')">
                  <i data-lucide="check" size="12"></i> Aprovar
                </button>
              ` : statusType === 'em_andamento' ? `
                <span class="kanban-status-tag tag-andamento">Em Andamento</span>
              ` : `
                <span class="kanban-status-tag tag-aprovada">Aprovada</span>
              `}
            </div>
          </div>
        </div>
      `;
    };

    // Card Hachurado
    const renderEmptyHatchedCard = () => `
      <div class="kanban-hatched-card">
        <div class="hatched-icons-row">
          <button class="hatched-icon-btn"><i data-lucide="rotate-cw" size="14"></i></button>
          <button class="hatched-icon-btn"><i data-lucide="cloud" size="14"></i></button>
          <button class="hatched-icon-btn"><i data-lucide="users" size="14"></i></button>
          <button class="hatched-icon-btn"><i data-lucide="calendar" size="14"></i></button>
        </div>
      </div>
    `;

    cc.innerHTML = `
      <div class="solic-kanban-page fade-in">
        <!-- Header Top Task Schedule / Daily Operation -->
        <div class="kanban-header-container">
          <div class="kanban-toolbar-row">
            <!-- Left Controls & Pills (Alinhados ao Degradê da Sidebar) -->
            <div class="kanban-left-controls">
              <div class="kanban-black-pill">
                <span>Still Running</span>
                <span class="black-pill-count">${allTarefas.length}</span>
              </div>
              <div class="kanban-grey-pill">
                <span>Pendentes</span>
                <i data-lucide="x" size="14"></i>
              </div>
              <button class="kanban-circle-btn black-btn">
                <i data-lucide="sliders" size="14"></i>
              </button>

              <div class="kanban-circle-group">
                <button class="kanban-circle-btn white-btn"><i data-lucide="link-2" size="14"></i></button>
                <button class="kanban-circle-btn white-btn"><i data-lucide="rotate-cw" size="14"></i></button>
                <button class="kanban-circle-btn white-btn"><i data-lucide="smartphone" size="14"></i></button>
                <button class="kanban-circle-btn white-btn"><i data-lucide="share-2" size="14"></i></button>
              </div>
            </div>

            <!-- Center KPI Numbers -->
            <div class="kanban-center-kpis">
              <div class="kpi-block">
                <span class="kpi-label">Week's Tasks</span>
                <span class="kpi-number">${allTarefas.length}</span>
              </div>
              <div class="kpi-block">
                <span class="kpi-label">Pending Approval</span>
                <span class="kpi-number">${pendentes.length}</span>
              </div>
              <div class="kpi-block">
                <span class="kpi-label">Employees Involved</span>
                <span class="kpi-number">${emAndamento.length + aprovadas.length}</span>
              </div>
            </div>

            <!-- Right Actions -->
            <div class="kanban-right-actions">
              <button class="kanban-circle-btn white-btn"><i data-lucide="upload" size="14"></i></button>
              <button class="kanban-circle-btn white-btn"><i data-lucide="cloud" size="14"></i></button>
              <button class="kanban-circle-btn white-btn"><i data-lucide="settings" size="14"></i></button>
            </div>
          </div>
        </div>

        <!-- Kanban Board 3 Columns -->
        <div class="kanban-columns-grid">
          <!-- Coluna 1: Pendentes -->
          <div class="kanban-col-wrapper">
            <div class="kanban-col-header">
              <div class="kanban-col-header-info">
                <span class="col-dot dot-pink"></span>
                <h3 class="kanban-col-title">Pendentes</h3>
                <span class="kanban-col-count count-pink">${pendentes.length}</span>
              </div>
              <div class="accent-bar bar-pink"></div>
            </div>
            <div class="kanban-col-cards">
              ${pendentes.length > 0
                ? pendentes.map((s, idx) => renderCard(s, 'pendente', idx)).join('')
                : renderEmptyHatchedCard()
              }
            </div>
          </div>

          <!-- Coluna 2: Em Andamento -->
          <div class="kanban-col-wrapper">
            <div class="kanban-col-header">
              <div class="kanban-col-header-info">
                <span class="col-dot dot-yellow"></span>
                <h3 class="kanban-col-title">Em Andamento</h3>
                <span class="kanban-col-count count-yellow">${emAndamento.length}</span>
              </div>
              <div class="accent-bar bar-yellow"></div>
            </div>
            <div class="kanban-col-cards">
              ${emAndamento.length > 0
                ? emAndamento.map((s, idx) => renderCard(s, 'em_andamento', idx)).join('')
                : renderEmptyHatchedCard()
              }
            </div>
          </div>

          <!-- Coluna 3: Aprovadas -->
          <div class="kanban-col-wrapper">
            <div class="kanban-col-header">
              <div class="kanban-col-header-info">
                <span class="col-dot dot-purple"></span>
                <h3 class="kanban-col-title">Aprovadas</h3>
                <span class="kanban-col-count count-purple">${aprovadas.length}</span>
              </div>
              <div class="accent-bar bar-purple"></div>
            </div>
            <div class="kanban-col-cards">
              ${aprovadas.length > 0
                ? aprovadas.map((s, idx) => renderCard(s, 'aprovada', idx)).join('')
                : renderEmptyHatchedCard()
              }
            </div>
          </div>
        </div>

        <!-- Floating Bottom Dock -->
        <div class="kanban-floating-dock">
          <button class="dock-btn"><i data-lucide="folder" size="16"></i></button>
          <button class="dock-btn"><i data-lucide="smartphone" size="16"></i></button>
          <button class="dock-btn dock-main-plus"><i data-lucide="plus" size="18"></i></button>
          <button class="dock-btn"><i data-lucide="power" size="16"></i></button>
          <button class="dock-btn"><i data-lucide="type" size="16"></i></button>
        </div>
      </div>

      <style>
        .solic-kanban-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px 4px 40px 4px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: var(--bg-body, #F4F4F6);
          min-height: 100vh;
        }

        /* Header Container */
        .kanban-header-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 8px;
        }

        /* Toolbar Row */
        .kanban-toolbar-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .kanban-left-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .kanban-black-pill {
          background: linear-gradient(135deg, #1E4BFF 0%, #5E82FF 100%);
          color: #FFFFFF;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(30, 75, 255, 0.25);
        }
        .black-pill-count {
          background: #FFFFFF;
          color: #1E4BFF;
          font-size: 11px;
          font-weight: 800;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kanban-grey-pill {
          background: #E4E4E7;
          color: #27272A;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .kanban-circle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .kanban-circle-btn:hover {
          transform: scale(1.05);
        }
        .black-btn {
          background: linear-gradient(135deg, #1E4BFF 0%, #5E82FF 100%);
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(30, 75, 255, 0.25);
        }
        .white-btn {
          background: #FFFFFF;
          color: #374151;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .kanban-circle-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Center KPI Numbers */
        .kanban-center-kpis {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .kpi-block {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .kpi-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary, #9CA3AF);
        }
        .kpi-number {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary, #111827);
          line-height: 1.1;
        }

        .kanban-right-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Column Headers & Accent Lines (Alinhadas ao Sistema) */
        .kanban-col-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }
        .kanban-col-header-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .col-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-pink { background: #3B82F6; box-shadow: 0 0 6px rgba(59,130,246,0.5); }
        .dot-yellow { background: #1E4BFF; box-shadow: 0 0 6px rgba(30,75,255,0.5); }
        .dot-purple { background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }

        .kanban-col-title {
          margin: 0;
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary, #111827);
          letter-spacing: -0.2px;
        }
        .kanban-col-count {
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .count-pink { background: rgba(59,130,246,0.12); color: #1D4ED8; }
        .count-yellow { background: rgba(30,75,255,0.12); color: #1E4BFF; }
        .count-purple { background: rgba(16,185,129,0.12); color: #047857; }

        .accent-bar {
          height: 4px;
          border-radius: 2px;
        }
        .bar-pink { background: linear-gradient(90deg, #60A5FA, #3B82F6); }
        .bar-yellow { background: linear-gradient(90deg, #1E4BFF, #5E82FF); }
        .bar-purple { background: linear-gradient(90deg, #10B981, #34D399); }

        /* Kanban Grid 3 Columns */
        .kanban-columns-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 992px) {
          .kanban-columns-grid {
            grid-template-columns: 1fr;
          }
        }

        .kanban-col-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Lista de Cards Scrollável */
        .kanban-col-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 640px;
          overflow-y: auto;
          padding-right: 6px;
          padding-bottom: 4px;
        }

        /* Barrinha de Scroll Estilizada em Azul */
        .kanban-col-cards::-webkit-scrollbar {
          width: 6px;
        }
        .kanban-col-cards::-webkit-scrollbar-track {
          background: rgba(30, 75, 255, 0.04);
          border-radius: 10px;
        }
        .kanban-col-cards::-webkit-scrollbar-thumb {
          background: rgba(30, 75, 255, 0.2);
          border-radius: 10px;
        }
        .kanban-col-cards::-webkit-scrollbar-thumb:hover {
          background: rgba(30, 75, 255, 0.4);
        }

        /* Kanban Card Base */
        .kanban-card {
          border-radius: 22px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
        }
        .kanban-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(30, 75, 255, 0.08);
        }

        /* Temas de Cores Pastéis Alinhados ao Azul do Sistema (#1E4BFF -> #5E82FF) */
        .kanban-card.theme-blue {
          background: linear-gradient(135deg, #EBF1FF 0%, #E2ECFF 100%);
          color: #0F172A;
          border: 1px solid rgba(30, 75, 255, 0.15);
        }
        .kanban-card.theme-cyan {
          background: linear-gradient(135deg, #E0F2FE 0%, #F0F9FF 100%);
          color: #0369A1;
          border: 1px solid rgba(2, 132, 199, 0.15);
        }
        .kanban-card.theme-purple {
          background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
          color: #1E1B4B;
          border: 1px solid rgba(67, 56, 202, 0.15);
        }
        .kanban-card.theme-white {
          background: #FFFFFF;
          color: #0F172A;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
        }

        .dark-mode .kanban-card.theme-blue { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color: #DBEAFE; border-color: rgba(59, 130, 246, 0.3); }
        .dark-mode .kanban-card.theme-cyan { background: linear-gradient(135deg, #0C4A6E 0%, #0369A1 100%); color: #E0F2FE; border-color: rgba(14, 165, 233, 0.3); }
        .dark-mode .kanban-card.theme-purple { background: linear-gradient(135deg, #312E81 0%, #1E1B4B 100%); color: #E0E7FF; border-color: rgba(99, 102, 241, 0.3); }
        .dark-mode .kanban-card.theme-white { background: #1F2937; color: #F9FAFB; border-color: rgba(51, 65, 85, 0.8); }

        /* Header do Card */
        .kanban-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .kanban-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.3;
          color: inherit;
        }
        .kanban-card-more {
          background: transparent;
          border: none;
          cursor: pointer;
          color: inherit;
          opacity: 0.6;
          padding: 2px;
          border-radius: 4px;
        }
        .kanban-card-more:hover { opacity: 1; }

        /* Dashes de Progresso em Azul do Sistema */
        .kanban-progress-dashes {
          display: flex;
          gap: 5px;
          margin: 2px 0 6px 0;
        }
        .kanban-progress-dashes .dash {
          height: 4px;
          flex: 1;
          border-radius: 2px;
          background: rgba(30, 75, 255, 0.1);
        }
        .kanban-card .dash.active {
          background: #1E4BFF;
        }
        .dark-mode .kanban-card .dash.active {
          background: #60A5FA;
        }

        /* Card Body */
        .kanban-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kanban-obs {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
          opacity: 0.8;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .kanban-time-badge {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Footer do Card (Avatar + Name + Date & Action) */
        .kanban-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 6px;
          padding-top: 10px;
        }
        .kanban-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kanban-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(30, 75, 255, 0.12);
          color: #1E4BFF;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kanban-user-meta {
          display: flex;
          flex-direction: column;
        }
        .kanban-user-name {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.1;
        }
        .kanban-user-date {
          font-size: 10px;
          opacity: 0.6;
          margin-top: 1px;
        }

        /* Action Buttons */
        .kanban-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .kanban-action-btn {
          border: none;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          transition: transform 0.15s;
        }
        .kanban-action-btn:hover { transform: scale(1.04); }
        .btn-approve {
          background: linear-gradient(135deg, #1E4BFF 0%, #3B82F6 100%);
          color: #FFFFFF;
          box-shadow: 0 3px 10px rgba(30, 75, 255, 0.25);
        }
        .btn-approve:hover {
          background: linear-gradient(135deg, #153BCC 0%, #1D4ED8 100%);
        }
        .btn-reject {
          background: rgba(239, 68, 68, 0.12);
          color: #DC2626;
          padding: 5px 8px;
        }
        .kanban-status-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .tag-andamento {
          background: rgba(30, 75, 255, 0.12);
          color: #1E4BFF;
        }
        .tag-aprovada {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }

        /* Hatched Empty Card */
        .kanban-hatched-card {
          background: repeating-linear-gradient(45deg, #f0f4ff, #f0f4ff 10px, #e2ecff 10px, #e2ecff 20px);
          border: 2px dashed rgba(30, 75, 255, 0.15);
          border-radius: 22px;
          padding: 36px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark-mode .kanban-hatched-card {
          background: repeating-linear-gradient(45deg, #1e293b, #1e293b 10px, #0f172a 10px, #0f172a 20px);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .hatched-icons-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hatched-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #FFFFFF;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1E4BFF;
          box-shadow: 0 2px 6px rgba(30, 75, 255, 0.12);
          cursor: pointer;
        }

        /* Floating Bottom Dock em Azul do Sistema */
        .kanban-floating-dock {
          position: sticky;
          bottom: 20px;
          margin: 24px auto 0 auto;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(30, 75, 255, 0.15);
          border-radius: 36px;
          padding: 6px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 12px 32px rgba(30, 75, 255, 0.15);
          width: fit-content;
          z-index: 99;
        }
        .dark-mode .kanban-floating-dock {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .dock-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #1E4BFF;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: transform 0.15s;
        }
        .dock-btn:hover { transform: scale(1.1); }
        .dock-main-plus {
          background: linear-gradient(135deg, #1E4BFF 0%, #5E82FF 100%);
          color: #FFFFFF;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          box-shadow: 0 4px 14px rgba(30, 75, 255, 0.35);
        }
      </style>
    `;

    Components.renderIcons();
  },

  prevWeek() { this.weekOffset--; this.renderSemanal(); },
  nextWeek() { this.weekOffset++; this.renderSemanal(); },
});
