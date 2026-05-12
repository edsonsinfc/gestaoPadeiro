/**
 * Padeiro Agenda - Weekly Grid Matrix Layout
 * BRAGO Sistema Padeiro
 */
const PadeiroAgenda = {
  currentDate: new Date(),
  selectedFilial: '',
  selectedDayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, // Default to today (0=Seg, 6=Dom)

  renderStyles() {
    if (document.getElementById('agenda-mobile-css')) return;
    const style = document.createElement('style');
    style.id = 'agenda-mobile-css';
    style.innerHTML = `
      @media (max-width: 480px) {
        .matrix-wrapper.desktop-view { display: none !important; }
        .agenda-mobile-view { display: block !important; padding-bottom: 80px; }
        
        /* Week Slider */
        .days-slider {
          display: flex;
          overflow-x: auto;
          gap: 10px;
          padding: 4px 0 16px 0;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .days-slider::-webkit-scrollbar { display: none; }
        
        .day-card {
          min-width: 65px;
          height: 85px;
          background: white;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--separator);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .day-card.active {
          background: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 8px 16px rgba(30, 75, 255, 0.2);
          transform: translateY(-4px);
        }
        .day-card.is-today::after {
          content: '';
          position: absolute;
          bottom: 6px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--primary);
        }
        .day-card.active.is-today::after { background: white; }
        
        .day-name { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-tertiary); margin-bottom: 4px; }
        .day-card.active .day-name { color: rgba(255,255,255,0.8); }
        
        .day-num { font-size: 18px; font-weight: 800; color: var(--text-primary); }
        .day-card.active .day-num { color: white; }
        
        .task-dot-count {
          position: absolute;
          top: -6px;
          right: -6px;
          background: #E8450A;
          color: white;
          font-size: 10px;
          font-weight: 700;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--system-bg);
        }

        /* Task List */
        .day-summary-banner {
          background: white;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid var(--separator);
        }
        
        .task-card-premium {
          background: white;
          border-radius: 18px;
          padding: 16px;
          margin-bottom: 12px;
          position: relative;
          display: flex;
          gap: 14px;
          border: 1px solid var(--separator);
          box-shadow: var(--shadow-subtle);
          overflow: hidden;
        }
        .task-priority-bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
        }
        
        .task-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .task-info { flex: 1; }
        .task-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .task-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-tertiary); }
        
        .status-pill {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* FAB */
        .fab-add {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 28px;
          background: var(--brago-orange, #E8450A);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(232, 69, 10, 0.4);
          z-index: 100;
          border: none;
        }
      }
    `;
    document.head.appendChild(style);
  },

  async render() {
    this.renderStyles();
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();

    const user = API.getUser();
    
    // For padeiros, we must use THEIR filial. 
    // If not in localStorage (old session), we'll try to get it from the first baker found or default to Brasília
    if (!this.selectedFilial) {
      this.selectedFilial = user.filial || 'Brago Brasília';
    }

    try {
      // Calculate Monday of current week
      const startOfWeek = new Date(this.currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const monStr = startOfWeek.toISOString().split('T')[0];

      // Fetch data
      let data = await API.get(`/api/admin/agenda-semanal?filial=${this.selectedFilial}&semana=${monStr}`);
      
      if (!data || !data.padeiros) {
        container.innerHTML = Components.empty('alert-triangle', 'Não foi possível carregar os dados da escala.');
        return;
      }

      const padeiros = data.padeiros || [];
      const agenda = data.agenda || [];
      
      let filteredPadeiros = [];
      if (user.role === 'padeiro') {
        // Find self in the list
        const self = padeiros.find(p => p && (p.codTec === user.codTec || p.id === user.id));
        if (self) {
          filteredPadeiros = [self];
        } else {
          // If not in the filial list, fetch self directly or show error
          // For now, let's allow seeing self even if filial doesn't match
          const allPadeiros = await API.get('/api/padeiros');
          const me = allPadeiros.find(p => p && (p.codTec === user.codTec || p.id === user.id));
          if (me) filteredPadeiros = [me];
        }
      } else {
        filteredPadeiros = padeiros;
      }

      const weekDates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDates.push(d);
      }

      if (filteredPadeiros.length === 0) {
        container.innerHTML = Components.empty('user-x', 'Usuário não encontrado na escala desta filial.');
        return;
      }

      if (window.innerWidth <= 480) {
        this.renderMobile(container, weekDates, agenda, filteredPadeiros[0], user);
      } else {
        this.renderDesktop(container, weekDates, agenda, filteredPadeiros, user);
      }

      Components.renderIcons();
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
      container.innerHTML = Components.empty('alert-circle', `Erro ao carregar agenda: ${error.message}`);
    }
  },

  renderDesktop(container, weekDates, agenda, filteredPadeiros, user) {
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    container.innerHTML = `
      <div class="fade-in">
        <!-- Central Filial Header -->
        <div class="flex justify-center mb-8">
          <div class="filial-pill">
            <i data-lucide="map-pin"></i>
            <span>FILIAL: ${this.selectedFilial.toUpperCase()}</span>
          </div>
        </div>

        <!-- Week Navigation -->
        <div class="flex justify-between items-center mb-4 px-2">
          <button class="btn btn-ghost btn-sm" onclick="PadeiroAgenda.prevWeek()">
            <i data-lucide="chevron-left"></i> Semana anterior
          </button>
          <div class="text-secondary font-bold">
            ${weekDates[0].toLocaleDateString('pt-BR')} - ${weekDates[6].toLocaleDateString('pt-BR')}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="PadeiroAgenda.nextWeek()">
            Próxima semana <i data-lucide="chevron-right"></i>
          </button>
        </div>

        <!-- Matrix Grid -->
        <div class="matrix-wrapper desktop-view">
          <div class="matrix-grid">
            <div class="matrix-header-cell matrix-header-padeiros">
              <i data-lucide="users"></i> PADEIROS
            </div>
            ${weekDates.slice(0,6).map((date, idx) => {
              const isToday = new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0];
              return `
                <div class="matrix-header-cell matrix-header-day ${isToday ? 'is-today' : ''}">
                  ${dayLabels[idx]} ${date.getDate()}
                </div>
              `;
            }).join('')}

            ${filteredPadeiros.map(p => `
              <div class="matrix-padeiro-cell">
                <div class="matrix-padeiro-name">${p.nome.split(' ').slice(0, 2).join(' ')}</div>
                <div class="matrix-padeiro-cod">COD ${p.codTec || '------'}</div>
              </div>
              ${weekDates.slice(0,6).map(date => {
                const dateStr = date.toISOString().split('T')[0];
                const tasks = agenda.filter(t => t && t.padeiroId === p.id && t.data === dateStr);
                return `
                  <div class="matrix-day-cell">
                    <div class="matrix-cell-content">
                      ${tasks.map(t => this.renderMatrixCard(t)).join('')}
                    </div>
                    ${user.role === 'admin' ? `
                      <button class="matrix-add-btn" onclick="PadeiroAgenda.addTask('${p.id}', '${dateStr}')">
                        <i data-lucide="plus"></i>
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  renderMobile(container, weekDates, agenda, me, user) {
    if (!me) {
      container.innerHTML = Components.empty('user-x', 'Padeiro não encontrado.');
      return;
    }
    const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const shortDayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
    const todayStr = new Date().toISOString().split('T')[0];
    
    const selectedDate = weekDates[this.selectedDayIndex];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const tasks = agenda.filter(t => t && t.padeiroId === me.id && t.data === selectedDateStr);
    
    // Calculate daily metrics
    const totalTime = tasks.length * 1.5; 
    const completedTasks = tasks.filter(t => t && t.status === 'concluida').length;

    container.innerHTML = `
      <div class="agenda-mobile-view fade-in">
        <div class="flex justify-between items-center mb-6">
          <h2 style="font-size: 22px; font-weight: 800; margin: 0;">Minha Agenda</h2>
          <div class="badge badge-primary">${this.selectedFilial.split(' ')[1]}</div>
        </div>

        <!-- Days Slider -->
        <div class="days-slider">
          ${weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayTasks = agenda.filter(t => t.padeiroId === me.id && t.data === dateStr);
            const isToday = dateStr === todayStr;
            const isActive = idx === this.selectedDayIndex;
            return `
              <div class="day-card ${isActive ? 'active' : ''} ${isToday ? 'is-today' : ''}" onclick="PadeiroAgenda.selectDay(${idx})">
                <span class="day-name">${shortDayLabels[idx]}</span>
                <span class="day-num">${date.getDate()}</span>
                ${dayTasks.length > 0 ? `<span class="task-dot-count">${dayTasks.length}</span>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Day Summary -->
        <div class="day-summary-banner">
          <div>
            <div class="text-tertiary uppercase font-bold" style="font-size: 10px; letter-spacing: 1px;">${dayLabels[this.selectedDayIndex]}</div>
            <div style="font-size: 18px; font-weight: 700;">${selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; color: var(--primary);">${totalTime}h</div>
            <div class="text-tertiary" style="font-size: 11px;">Trabalho total</div>
          </div>
        </div>

        <!-- Tasks List -->
        <div class="tasks-container">
          ${tasks.length === 0 ? `
            <div style="text-align:center; padding:40px 20px; color:var(--text-tertiary);">
              <i data-lucide="calendar-check" size="48" style="opacity:0.3; margin-bottom:12px;"></i>
              <p>Nenhuma tarefa agendada para hoje.</p>
            </div>
          ` : `
            <div class="flex justify-between items-center mb-4">
              <span class="font-bold" style="font-size: 14px;">${tasks.length} Tarefas</span>
              <span class="text-tertiary" style="font-size: 12px;">${completedTasks}/${tasks.length} concluídas</span>
            </div>
            ${tasks.map(t => this.renderTaskCardMobile(t)).join('')}
          `}
        </div>

        <button class="fab-add" onclick="PadeiroAgenda.addTask('${me.id}', '${selectedDateStr}')">
          <i data-lucide="plus"></i>
        </button>
      </div>
    `;
  },

  renderTaskCardMobile(t) {
    const status = t.status || 'pendente';
    const isLate = status === 'pendente' && new Date(t.data + ' ' + (t.horario || '08:00')) < new Date();
    
    // Categorization
    let category = { name: 'Geral', icon: 'clipboard-list', color: '#64748B' };
    const name = (t.clienteNome || '').toLowerCase();
    if (name.includes('massa') || name.includes('prep')) category = { name: 'Massa', icon: 'chef-hat', color: '#1E4BFF' };
    else if (name.includes('assar') || name.includes('forno')) category = { name: 'Assar', icon: 'flame', color: '#E8450A' };
    else if (name.includes('entrega') || name.includes('saida')) category = { name: 'Entregar', icon: 'truck', color: '#28A745' };

    const statusConfig = {
      'pendente': { icon: isLate ? 'alert-circle' : 'clock', label: isLate ? 'Atrasado' : 'Pendente', class: isLate ? 'danger' : 'amber' },
      'em_andamento': { icon: 'zap', label: 'Andamento', class: 'blue' },
      'concluida': { icon: 'check-circle-2', label: 'Concluído', class: 'success' }
    };
    const config = statusConfig[status];

    return `
      <div class="task-card-premium" onclick="PadeiroAgenda.startActivity('${t.id}', '${t.clienteId}', '${t.clienteNome}')">
        <div class="task-priority-bar" style="background: ${category.color};"></div>
        
        <div class="task-icon-box" style="background: ${category.color}15; color: ${category.color};">
          <i data-lucide="${category.icon}"></i>
        </div>

        <div class="task-info">
          <div class="flex justify-between items-start">
            <div class="task-title">${t.clienteNome}</div>
            <div class="status-pill badge-${config.class}">
              <i data-lucide="${config.icon}" size="10"></i> ${config.label}
            </div>
          </div>
          
          <div class="task-meta">
            <div class="flex items-center gap-1">
              <i data-lucide="clock" size="12"></i>
              ${t.horario || '08:00'} — ${t.horarioFim || '17:00'}
            </div>
            <div class="flex items-center gap-1">
              <i data-lucide="tag" size="12"></i>
              ${category.name}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  selectDay(index) {
    this.selectedDayIndex = index;
    this.render();
  },

  renderMatrixCard(item) {
    const status = item.status || 'pendente';
    const statusMap = {
      'pendente': { icon: 'clock', label: 'Pendente', color: 'amber' },
      'em_andamento': { icon: 'zap', label: 'Em Andamento', color: 'blue' },
      'concluida': { icon: 'star', label: 'Concluída', color: 'success' }
    };
    
    const config = statusMap[status] || statusMap['pendente'];
    
    return `
      <div class="matrix-card card-border-${config.color}" onclick="PadeiroAgenda.startActivity('${item.id}', '${item.clienteId}', '${item.clienteNome}')">
        <div class="matrix-card-title">${item.clienteNome || 'Cliente'}</div>
        <div class="matrix-card-time">
          <i data-lucide="clock"></i>
          <span>${item.horario || '08:00'} → ${item.horarioFim || '17:00'}</span>
        </div>
        
        <div class="flex items-center gap-2 mt-3">
          <span class="matrix-status-badge badge-${config.color}">
            <i data-lucide="${config.icon}" style="width:10px;height:10px;margin-right:4px;"></i>
            ${config.label}
          </span>
        </div>

        <div class="matrix-card-status-icon status-${status}">
          <i data-lucide="${config.icon}"></i>
        </div>
      </div>
    `;
  },

  async startActivity(agendaId, clienteId, clienteNome) {
    const user = API.getUser();
    if (user.role !== 'padeiro') return;
    
    // Check if there is already an activity in progress
    try {
      const atividades = await API.get('/api/atividades');
      const emAndamento = atividades.find(a => a.status === 'em_andamento');
      if (emAndamento && emAndamento.clienteId !== clienteId) {
        if (!confirm('Você já tem uma atividade em andamento. Deseja iniciar outra?')) return;
      }
    } catch(e) {}

    // Navigate to flow with prefilled data
    App.navigate('padeiro-atividade', { cronogramaId: agendaId, clienteId, clienteNome });
  },

  prevWeek() {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.render();
  },

  nextWeek() {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.render();
  },

  addTask(padeiroId, date) {
    // This would open a modal to add a task, for now just a toast
    Components.toast(`Adicionar agendamento para ${date}`, 'info');
  }
};
