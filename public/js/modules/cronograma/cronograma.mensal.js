/**
 * ARQUIVO: cronograma.mensal.js
 * CATEGORIA: Cronograma › Visão mensal
 * RESPONSABILIDADE: Renderiza a grade anual e abre detalhes por mês
 * DEPENDE DE: cronograma.state.js, Components
 * EXPORTA: renderMensal, getStatsForMonth, openMonthDetails
 */

Object.assign(Cronograma, {
  getStatsForMonth(year, monthIndex) {
    // monthIndex is 0-11
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const atividadesMes = this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada');
    const totalKg = atividadesMes.reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);
    const totalAtividades = atividadesMes.length;

    const tarefasMes = this.tarefas.filter(t => t.data && t.data.startsWith(monthStr));
    const tarefasConcluidas = tarefasMes.filter(t => t.status === 'concluida').length;
    const tarefasPendentes = tarefasMes.filter(t => t.status === 'pendente').length;
    
    return { totalKg, totalAtividades, tarefasConcluidas, tarefasPendentes };
  },

  openMonthDetails(year, monthIndex) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesLabel = meses[monthIndex];
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const diasNoMes = new Date(year, monthIndex + 1, 0).getDate();
    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const padeirosAtivos = this.padeiros.filter(p => p.ativo);
    
    // Gather all task dates in this month
    const tarefasMes = this.tarefas.filter(t => t.data && t.data.startsWith(monthStr));
    
    // Build all workdays of the month (Mon-Sat)
    const dias = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(year, monthIndex, d);
      const dow = date.getDay(); // 0=Sun
      if (dow !== 0) { // skip sundays
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dias.push({ d, dateStr, label: `${diasDaSemana[dow]} ${d}` });
      }
    }

    const tableHeader = dias.map(dia => `<th>${dia.label}</th>`).join('');

    const tableRows = padeirosAtivos.map(p => {
      const cells = dias.map(dia => {
        const tarefa = tarefasMes.find(t => t.data === dia.dateStr && t.padeiroId === p.id);
        if (!tarefa) return `<td></td>`;
        let bg = '';
        if (tarefa.status === 'concluida') bg = 'background-color:rgba(40,167,69,0.08);';
        if (tarefa.status === 'em_andamento') bg = 'background-color:rgba(30,75,255,0.06);';
        return `<td style="${bg}">
          <div style="font-weight:600;color:#2C2C2A;line-height:1.3;margin-bottom:2px;">${(tarefa.clienteNome || '—').split(' ').slice(0,2).join(' ')}</div>
          ${tarefa.horario ? `<div style="color:var(--text-tertiary);">${tarefa.horario}</div>` : ''}
        </td>`;
      }).join('');
      return `<tr>
        <td class="col-padeiro">${p.nome.trim().split(/\s+/)[0].toUpperCase()}</td>
        ${cells}
      </tr>`;
    }).join('');

    Components.showModal(
      `Agenda: ${mesLabel} de ${year}`,
      `<div class="agenda-table-wrapper">
        <table class="agenda-table">
          <thead><tr>
            <th class="col-padeiro">Padeiro</th>
            ${tableHeader}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`,
      `<button class="agenda-btn-close" onclick="Components.closeModal()">Fechar</button>`,
      'agenda-modal'
    );
    Components.renderIcons();
  },

  renderMiniCalendar(year, monthIndex) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const labelMes = meses[monthIndex];
    
    // First day of month
    const firstDay = new Date(year, monthIndex, 1);
    let startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    
    // Total days in month
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    
    // Days array
    const days = [];
    for (let i = 1; i < startDayOfWeek; i++) {
      days.push('');
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    
    // Get the days of the current selected week to highlight them
    const weeklyDates = this.getWeekDates();
    const weeklyDaysSet = new Set(weeklyDates.map(d => d.getDate()));
    const todayDay = new Date().getDate();
    const todayMonth = new Date().getMonth();
    const todayYear = new Date().getFullYear();
    const isCurrentMonth = todayMonth === monthIndex && todayYear === year;

    const weekdayHeaders = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
    const gridHtml = [];
    
    // Weekday names
    weekdayHeaders.forEach(w => {
      gridHtml.push(`<div class="tf-minical-weekday">${w}</div>`);
    });
    
    // Days
    days.forEach(d => {
      if (d === '') {
        gridHtml.push(`<div class="tf-minical-day"></div>`);
      } else {
        const isToday = isCurrentMonth && d === todayDay;
        const isActiveWeek = weeklyDaysSet.has(d);
        let extraClass = '';
        if (isToday) extraClass = 'today';
        else if (isActiveWeek) extraClass = 'active-week';
        
        gridHtml.push(`<div class="tf-minical-day ${extraClass}">${d}</div>`);
      }
    });

    return `
    <div class="tf-minical-container cascade-item" style="--index: 1;">
      <div class="tf-minical-header">
        <span class="tf-minical-title">${labelMes} ${year}</span>
        <div class="tf-minical-nav">
          <button class="tf-minical-btn" onclick="event.stopPropagation(); Cronograma.prevWeek(); Cronograma.render();"><i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i></button>
          <button class="tf-minical-btn" onclick="event.stopPropagation(); Cronograma.nextWeek(); Cronograma.render();"><i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i></button>
        </div>
      </div>
      <div class="tf-minical-grid">
        ${gridHtml.join('')}
      </div>
    </div>`;
  },

  renderMensal() {
    if (!this.selectedMobileDate) {
      this.selectedMobileDate = new Date();
    }
    const cc = document.getElementById('cronograma-content');
    const year = new Date().getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const abrevs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const META_FIXA = 5000;

    // Dates for selected week
    const dates = this.getWeekDates();
    const midDate = dates[2];
    const monthIndex = midDate.getMonth();
    const labelMes = meses[monthIndex];
    const targetYear = midDate.getFullYear();

    const todayStr = new Date().toISOString().split('T')[0];
    const atividadesHoje = this.atividades.filter(a => a.data === todayStr && a.status === 'finalizada');
    const kgHoje = atividadesHoje.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
    const totalPadeirosAtivos = this.padeiros.filter(p => p.ativo).length;

    // Weeks calculation for targetYear and monthIndex
    const totalDays = new Date(targetYear, monthIndex + 1, 0).getDate();
    const daysMap = {};
    for (let w = 1; w <= 6; w++) {
      daysMap[w] = [null, null, null, null, null, null]; // SEG, TER, QUA, QUI, SEX, SÁB
    }
    
    let currentW = 1;
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(targetYear, monthIndex, d);
      const dow = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      if (dow === 0) continue; // Skip Sundays
      
      if (dow === 1 && d > 1) {
        currentW++;
      }
      
      const weekdayIdx = dow - 1; // 0 = SEG, 1 = TER, ..., 5 = SÁB
      daysMap[currentW][weekdayIdx] = {
        dayNum: d,
        dateStr: `${targetYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      };
    }
    
    // Filter active weeks
    const activeWeeks = Object.keys(daysMap)
      .map(Number)
      .filter(w => daysMap[w].some(day => day !== null));

    // Highlight set for active week selection
    const selectedWeekSet = new Set(dates.map(d => d.toISOString().split('T')[0]));

    // Mobile View Calculations
    const activeDate = this.selectedMobileDate;
    const activeYear = activeDate.getFullYear();
    const activeMonthIdx = activeDate.getMonth();
    
    // First day of active month
    const firstDayOfMonth = new Date(activeYear, activeMonthIdx, 1);
    let startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Total days in active month
    const totalDaysInMonth = new Date(activeYear, activeMonthIdx + 1, 0).getDate();
    
    const gridDays = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      gridDays.push(null);
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      gridDays.push(d);
    }

    const weekdaysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthsAbrevPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const weekdaysFullPt = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    const dayName = weekdaysFullPt[activeDate.getDay()];
    const monthName = monthsAbrevPt[activeMonthIdx];
    const dateStrHeader = `${activeDate.getDate()} ${monthName}, ${activeYear.toString().slice(-2)} ${dayName}`;

    // Get tasks for selected date
    const selectedDateStr = `${activeYear}-${String(activeMonthIdx + 1).padStart(2, '0')}-${String(activeDate.getDate()).padStart(2, '0')}`;
    const selectedTasks = this.tarefas.filter(t => t.data === selectedDateStr);

    const dayCellsHtml = gridDays.map(day => {
      if (day === null) {
        return `<div class="m-calendar-day empty"></div>`;
      }
      
      const isSelected = (day === activeDate.getDate());
      const cellClass = isSelected ? 'active' : '';
      
      // Calculate tasks on this specific day for colored dots
      const dateStr = `${activeYear}-${String(activeMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const tasksOnDay = this.tarefas.filter(t => t.data === dateStr);
      
      let dotsHtml = '';
      if (tasksOnDay.length > 0) {
        // Find unique status colors
        const statuses = [...new Set(tasksOnDay.map(t => t.status))];
        dotsHtml = `<div class="m-calendar-day-dots">`;
        statuses.forEach(status => {
          let dotColorClass = 'yellow';
          if (status === 'concluida') dotColorClass = 'green';
          else if (status === 'em_andamento') dotColorClass = 'blue';
          dotsHtml += `<span class="m-calendar-dot ${dotColorClass}"></span>`;
        });
        dotsHtml += `</div>`;
      }
      
      return `
      <div class="m-calendar-day ${cellClass}" onclick="Cronograma.selectMobileDay(${day})">
        <span>${day}</span>
        ${dotsHtml}
      </div>`;
    }).join('');

    let tasksListHtml = '';
    if (selectedTasks.length === 0) {
      tasksListHtml = `
      <div style="text-align: center; padding: 32px 16px; color: #94A3B8; font-size: 13px;">
        <i data-lucide="calendar-x" style="width: 32px; height: 32px; margin-bottom: 8px; stroke-width: 1.5; color: #CBD5E1;"></i>
        <div>Nenhuma tarefa para este dia</div>
      </div>`;
    } else {
      tasksListHtml = selectedTasks.map((t, idx) => {
        let statusClass = 'pendente';
        let iconName = 'alert-circle';
        let statusLabel = 'Pendente';
        if (t.status === 'concluida') {
          statusClass = 'concluida';
          iconName = 'check-circle';
          statusLabel = 'Concluída';
        } else if (t.status === 'em_andamento') {
          statusClass = 'em_andamento';
          iconName = 'play-circle';
          statusLabel = 'Em Andamento';
        }
        
        const bakerName = t.padeiroNome || 'Não atribuído';
        
        return `
        <div class="m-task-item cascade-item" style="--index: ${idx + 3};" onclick="Cronograma.openTaskDetail('${t.id}')">
          <div class="m-task-icon-wrapper ${statusClass}">
            <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
          </div>
          <div class="m-task-details">
            <span class="m-task-cat">${statusLabel} • Padeiro: ${bakerName}</span>
            <span class="m-task-name">${t.clienteNome || 'Sem Cliente'}</span>
            <span class="m-task-time">${t.horario || '08:00'}</span>
          </div>
        </div>`;
      }).join('');
    }

    // Decide which sub-view to render in the board area
    const activeSubView = this.currentMonthlySubView || 'monthly';

    cc.innerHTML = `
    <!-- Desktop View: Redesigned TimeFrame Dashboard -->
    <div class="tf-container desktop-only">
      <!-- Top Header -->
      <div class="tf-header">
        <div class="tf-brand" style="display: flex; align-items: center; gap: 10px;">
          <img src="/assets/logo.svg" alt="BRAGO" style="height: 32px; filter: brightness(0) invert(1);">
          <div style="display: flex; flex-direction: column; font-family: 'Outfit', -apple-system, sans-serif;">
            <span style="font-size: 16px; font-weight: 800; color: #FFFFFF; line-height: 1.1; letter-spacing: -0.02em;">Smart</span>
            <span style="font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.1;">Gestor</span>
          </div>
        </div>
        
        <div class="tf-controls">
          <!-- Segmented View control -->
          <div class="tf-top-segmented">
            <button class="tf-top-seg-btn ${activeSubView === 'daily' ? 'active' : ''}" onclick="Cronograma.setMonthlySubView('daily')">Diário</button>
            <button class="tf-top-seg-btn ${activeSubView === 'weekly' ? 'active' : ''}" onclick="Cronograma.setMonthlySubView('weekly')">Semanal</button>
            <button class="tf-top-seg-btn ${activeSubView === 'monthly' ? 'active' : ''}" onclick="Cronograma.setMonthlySubView('monthly')">Mensal</button>
          </div>
          
          <!-- Theme selector styled like ref -->
          <div class="tf-theme-pill">
            <i data-lucide="sun" style="width: 14px; height: 14px;"></i>
            <span>Claro</span>
          </div>

          <!-- Statistics -->
          <div class="tf-top-stats">
            <div class="tf-stat-item">
              <div class="tf-stat-label">Total Kg Hoje</div>
              <div class="tf-stat-val">${kgHoje.toFixed(0)} kg</div>
            </div>
            <div class="tf-stat-item">
              <div class="tf-stat-label">Padeiros Ativos</div>
              <div class="tf-stat-val">${totalPadeirosAtivos}</div>
            </div>
          </div>
          
          <!-- Add Button capsule -->
          <button class="tf-btn-add" onclick="Cronograma.openTaskForm()">
            <i data-lucide="plus" style="width: 16px; height: 16px;"></i> Nova Tarefa
          </button>
        </div>
      </div>
      
      <!-- Main Grid Layout -->
      <div class="tf-main-grid">
        <!-- Sidebar -->
        <div class="tf-sidebar">
          <!-- Mini Month Calendar -->
          ${this.renderMiniCalendar(midDate.getFullYear(), monthIndex)}
          
          <!-- My Calendar Checklist Card -->
          <div class="tf-checklist-card cascade-item" style="--index: 2;">
            <div class="tf-card-header">
              <span class="tf-card-title">Padeiros Ativos</span>
              <span class="tf-card-link" onclick="App.navigate('gestao')">Ver todos</span>
            </div>
            <div class="tf-checklist">
              ${this.padeiros.filter(p => p.ativo).slice(0, 3).map(p => `
                <div class="tf-check-item checked">
                  <div class="tf-check-circle"><i data-lucide="check" style="width: 10px; height: 10px;"></i></div>
                  <span>${p.nome.trim().split(/\s+/)[0]} (${p.filial || 'Sem Filial'})</span>
                </div>
              `).join('') || `
                <div style="font-size: 12px; color: #94A3B8; padding: 4px 0;">Nenhum padeiro ativo</div>
              `}
            </div>
          </div>

          <!-- Other Calendar Checklist Card -->
          <div class="tf-checklist-card cascade-item" style="--index: 3;">
            <div class="tf-card-header">
              <span class="tf-card-title">Tarefas Pendentes</span>
              <span class="tf-card-link" onclick="Cronograma.openTaskForm()">Nova +</span>
            </div>
            <div class="tf-checklist">
              ${this.tarefas.filter(t => t.status === 'pendente').slice(0, 3).map(t => `
                <div class="tf-check-item">
                  <div class="tf-check-circle"></div>
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${t.clienteNome || 'Cliente'}">
                    ${t.clienteNome || '—'}
                  </span>
                </div>
              `).join('') || `
                <div style="font-size: 12px; color: #94A3B8; padding: 4px 0;">Sem tarefas pendentes</div>
              `}
            </div>
          </div>
        </div>
        
        <!-- Board -->
        <div class="tf-board-container">
          <div class="tf-board-header cascade-item" style="--index: 2;">
            <span class="tf-board-title">${labelMes} de ${targetYear}</span>
            <div style="display: flex; align-items: center; gap: 16px;">
              <span class="tf-card-link" style="color: #1E4BFF;" onclick="Cronograma.weekOffset=0; Cronograma.render(); return false;">Today</span>
              <div class="tf-minical-nav" style="display: flex; gap: 4px;">
                <button class="tf-minical-btn" onclick="Cronograma.prevWeek(); Cronograma.render();" style="color: #1E293B;"><i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i></button>
                <button class="tf-minical-btn" onclick="Cronograma.nextWeek(); Cronograma.render();" style="color: #1E293B;"><i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i></button>
              </div>
            </div>
          </div>
          
          <!-- Sub-view Content Area -->
          <div id="tf-subview-content">
          ${activeSubView === 'daily' ? this._renderDailyGrid(dates, todayStr) : 
            activeSubView === 'weekly' ? this._renderWeeklyGrid(dates, todayStr) :
            this._renderMonthlyGrid(activeWeeks, daysMap, selectedWeekSet, todayStr)}
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile View: Monthly Calendar View -->
    <div class="mobile-only">
      <!-- Calendar Wrapper Card -->
      <div class="m-calendar-wrapper cascade-item" style="--index: 1;">
        <div class="m-calendar-header">
          <span class="m-calendar-date">${dateStrHeader}</span>
          <div class="m-calendar-nav">
            <button class="m-calendar-nav-btn" onclick="event.stopPropagation(); Cronograma.changeMobileMonth(-1)"><i data-lucide="chevron-left" style="width: 20px; height: 20px;"></i></button>
            <button class="m-calendar-nav-btn" onclick="event.stopPropagation(); Cronograma.changeMobileMonth(1)"><i data-lucide="chevron-right" style="width: 20px; height: 20px;"></i></button>
          </div>
        </div>
        <div class="m-calendar-grid">
          <div class="m-calendar-weekday">Dom</div>
          <div class="m-calendar-weekday">Seg</div>
          <div class="m-calendar-weekday">Ter</div>
          <div class="m-calendar-weekday">Qua</div>
          <div class="m-calendar-weekday">Qui</div>
          <div class="m-calendar-weekday">Sex</div>
          <div class="m-calendar-weekday">Sáb</div>
          ${dayCellsHtml}
        </div>
      </div>

      <!-- Tasks Section -->
      <div class="m-tasks-section cascade-item" style="--index: 2;">
        <div class="m-tasks-header">
          <div class="m-tasks-title-group">
            <span class="m-tasks-title">Tarefas do Dia</span>
            <i data-lucide="chevron-down" style="width: 20px; height: 20px; color: #64748B;"></i>
          </div>
          <button class="m-tasks-plus-btn" onclick="Cronograma.openTaskForm()">
            <i data-lucide="plus" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="m-tasks-list">
          ${tasksListHtml}
        </div>
      </div>
    </div>
    `;
    Components.renderIcons();
  },

  setMonthlySubView(subView) {
    this.currentMonthlySubView = subView;
    this.renderMensal();
    Components.renderIcons();
  },

  // ─── Monthly Grid (original) ───
  _renderMonthlyGrid(activeWeeks, daysMap, selectedWeekSet, todayStr) {
    return `
    <div class="tf-timeline-grid cascade-item" style="--index: 3;">
      <div class="tf-grid-header">
        <div class="tf-header-cell text-tertiary" style="font-size: 11px; font-weight: 700; color: #94A3B8;">SEMANA</div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">SEG</span><span class="tf-header-day-name">Segunda</span></div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">TER</span><span class="tf-header-day-name">Terça</span></div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">QUA</span><span class="tf-header-day-name">Quarta</span></div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">QUI</span><span class="tf-header-day-name">Quinta</span></div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">SEX</span><span class="tf-header-day-name">Sexta</span></div>
        <div class="tf-header-cell"><span class="tf-header-day-num" style="font-size: 14px;">SÁB</span><span class="tf-header-day-name">Sábado</span></div>
      </div>
      
      ${activeWeeks.map((weekNum, idx) => {
        const weekDays = daysMap[weekNum];
        return `
        <div class="tf-grid-row cascade-item" style="--index: ${idx + 4};">
          <div class="tf-time-cell" style="font-size: 11px; font-weight: 700; text-transform: uppercase;">Sem. ${weekNum}</div>
          ${weekDays.map(day => {
            if (!day) {
              return `<div class="tf-content-cell" style="background-color: #F8FAFC; opacity: 0.5;"></div>`;
            }
            
            const isSelectedWeek = selectedWeekSet.has(day.dateStr);
            const isToday = (day.dateStr === todayStr);
            const activeWeekClass = isSelectedWeek ? 'tf-cell-active-week' : '';
            const todayClass = isToday ? 'tf-cell-today' : '';
            
            const tasksInCell = this.tarefas.filter(t => t.data === day.dateStr);
            
            return `
            <div class="tf-content-cell ${activeWeekClass} ${todayClass}" style="position: relative;">
              <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-align: right; margin-bottom: 6px;">${day.dayNum}</div>
              <div style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 140px;">
                ${tasksInCell.map((t, idx) => {
                  const isEven = idx % 2 === 0;
                  const cardClass = isEven ? 'tf-card-slate' : 'tf-card-lime';
                  const initials = t.padeiroNome ? t.padeiroNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'PD';
                  return `
                  <div class="tf-task-card ${cardClass}" onclick="Cronograma.openTaskDetail('${t.id}')" style="min-height: 50px; padding: 6px 8px; border-radius: 8px;">
                    <span class="tf-card-title" title="${t.clienteNome}" style="font-size: 10px; font-weight: 700;">${t.clienteNome || '—'}</span>
                    <div class="tf-card-footer" style="margin-top: 4px;">
                      <div class="tf-avatar-stack">
                        <div class="tf-avatar" title="${t.padeiroNome || 'Padeiro'}" style="width: 14px; height: 14px; font-size: 6px;">${initials}</div>
                      </div>
                      <span class="tf-card-time" style="font-size: 8px;">${t.horario || '08:00'}</span>
                    </div>
                  </div>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>`;
  },

  // ─── Daily Grid ───
  _renderDailyGrid(dates, todayStr) {
    const padeirosAtivos = this.padeiros.filter(p => p.ativo);
    const today = new Date();
    // Use the midpoint of the week dates to pick which day to display
    const selectedDate = dates.find(d => d.toISOString().split('T')[0] === todayStr) || dates[0];
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayLabel = `${diasDaSemana[selectedDate.getDay()]}, ${selectedDate.getDate()}`;
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthLabel = meses[selectedDate.getMonth()];

    // Day picker row
    const dayPickerHtml = dates.map(d => {
      const ds = d.toISOString().split('T')[0];
      const isActive = ds === selectedDateStr;
      const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
      return `<div class="tf-daily-day-pill ${isActive ? 'active' : ''}" onclick="Cronograma._selectDailyDate('${ds}')">
        <span class="tf-daily-day-name">${dayNames[d.getDay()]}</span>
        <span class="tf-daily-day-num">${d.getDate()}</span>
      </div>`;
    }).join('');

    // Tasks grouped by time slots
    const dayTasks = this.tarefas.filter(t => t.data === selectedDateStr)
      .sort((a, b) => (a.horario || '08:00').localeCompare(b.horario || '08:00'));

    // Group by hour
    const hourGroups = {};
    dayTasks.forEach(t => {
      const hour = (t.horario || '08:00').split(':')[0] + ':00';
      if (!hourGroups[hour]) hourGroups[hour] = [];
      hourGroups[hour].push(t);
    });

    // Generate time slots from 05:00 to 18:00
    const timeSlots = [];
    for (let h = 5; h <= 18; h++) {
      const hourKey = String(h).padStart(2, '0') + ':00';
      timeSlots.push(hourKey);
    }

    const slotsHtml = timeSlots.map((slot, idx) => {
      const tasks = hourGroups[slot] || [];
      const hasTask = tasks.length > 0;
      return `
      <div class="tf-daily-slot cascade-item" style="--index: ${idx + 4};">
        <div class="tf-daily-time">${slot}</div>
        <div class="tf-daily-slot-content ${hasTask ? '' : 'empty'}">
          ${tasks.map((t, tIdx) => {
            const initials = t.padeiroNome ? t.padeiroNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'PD';
            const isEven = tIdx % 2 === 0;
            const cardClass = isEven ? 'tf-card-slate' : 'tf-card-lime';
            let statusDot = '#FF9500';
            if (t.status === 'concluida') statusDot = '#34C759';
            else if (t.status === 'em_andamento') statusDot = '#007AFF';
            return `
            <div class="tf-daily-task-card ${cardClass}" onclick="Cronograma.openTaskDetail('${t.id}')">
              <div class="tf-daily-task-top">
                <div class="tf-daily-status-dot" style="background: ${statusDot};"></div>
                <span class="tf-daily-task-client">${t.clienteNome || '—'}</span>
              </div>
              <div class="tf-daily-task-bottom">
                <div class="tf-avatar" title="${t.padeiroNome || 'Padeiro'}" style="width: 18px; height: 18px; font-size: 7px;">${initials}</div>
                <span class="tf-daily-task-time">${t.horario || '08:00'} → ${t.horarioFim || '17:00'}</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');

    return `
    <div class="tf-daily-container cascade-item" style="--index: 3;">
      <div class="tf-daily-header">
        <div class="tf-daily-title-group">
          <span class="tf-daily-title">${dayLabel}</span>
          <span class="tf-daily-subtitle">${monthLabel} ${selectedDate.getFullYear()}</span>
        </div>
        <div class="tf-daily-summary">
          <span class="tf-daily-count">${dayTasks.length} tarefas</span>
        </div>
      </div>
      <div class="tf-daily-day-picker">
        ${dayPickerHtml}
      </div>
      <div class="tf-daily-timeline">
        ${slotsHtml}
      </div>
    </div>`;
  },

  _selectDailyDate(dateStr) {
    // Find the offset so we can navigate to the right week
    const dates = this.getWeekDates();
    const target = new Date(dateStr + 'T12:00:00');
    // Check if the target is within current dates
    const inCurrentWeek = dates.some(d => d.toISOString().split('T')[0] === dateStr);
    if (!inCurrentWeek) {
      // Navigate weeks to reach this date
      const today = new Date();
      const diff = Math.floor((target - today) / (7 * 24 * 60 * 60 * 1000));
      this.weekOffset = diff;
    }
    // Store chosen date for the daily view
    this._dailySelectedDate = dateStr;
    this.renderMensal();
    Components.renderIcons();
  },

  // ─── Weekly Grid ───
  _renderWeeklyGrid(dates, todayStr) {
    const padeirosAtivos = this.padeiros.filter(p => p.ativo);
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Build columns for each day
    const columnsHtml = dates.map((date, i) => {
      const dateStr = date.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const dayTasks = this.tarefas.filter(t => t.data === dateStr)
        .sort((a, b) => (a.horario || '08:00').localeCompare(b.horario || '08:00'));

      return `
      <div class="tf-weekly-column ${isToday ? 'today' : ''} cascade-item" style="--index: ${i + 4};">
        <div class="tf-weekly-col-header">
          <span class="tf-weekly-col-day">${diasSemana[i]}</span>
          <span class="tf-weekly-col-num ${isToday ? 'today' : ''}">${date.getDate()}</span>
        </div>
        <div class="tf-weekly-col-tasks">
          ${dayTasks.length === 0 ? `
            <div class="tf-weekly-empty-slot">
              <div style="width: 4px; height: 4px; border-radius: 50%; background: #CBD5E1;"></div>
            </div>` : ''}
          ${dayTasks.map((t, tIdx) => {
            const initials = t.padeiroNome ? t.padeiroNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'PD';
            const isEven = tIdx % 2 === 0;
            const cardClass = isEven ? 'tf-card-slate' : 'tf-card-lime';
            let statusColor = '#FF9500';
            if (t.status === 'concluida') statusColor = '#34C759';
            else if (t.status === 'em_andamento') statusColor = '#007AFF';
            return `
            <div class="tf-weekly-task ${cardClass}" onclick="Cronograma.openTaskDetail('${t.id}')">
              <div class="tf-weekly-task-indicator" style="background: ${statusColor};"></div>
              <div class="tf-weekly-task-body">
                <span class="tf-weekly-task-name">${t.clienteNome || '—'}</span>
                <div class="tf-weekly-task-meta">
                  <div class="tf-avatar" style="width: 16px; height: 16px; font-size: 6px;" title="${t.padeiroNome || 'Padeiro'}">${initials}</div>
                  <span>${t.horario || '08:00'}</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');

    // Summary stats for the week
    const totalWeekTasks = dates.reduce((sum, d) => {
      return sum + this.tarefas.filter(t => t.data === d.toISOString().split('T')[0]).length;
    }, 0);
    const concluidas = dates.reduce((sum, d) => {
      return sum + this.tarefas.filter(t => t.data === d.toISOString().split('T')[0] && t.status === 'concluida').length;
    }, 0);

    return `
    <div class="tf-weekly-container cascade-item" style="--index: 3;">
      <div class="tf-weekly-header">
        <div class="tf-weekly-stats">
          <div class="tf-weekly-stat">
            <span class="tf-weekly-stat-val">${totalWeekTasks}</span>
            <span class="tf-weekly-stat-label">Tarefas</span>
          </div>
          <div class="tf-weekly-stat">
            <span class="tf-weekly-stat-val">${concluidas}</span>
            <span class="tf-weekly-stat-label">Concluídas</span>
          </div>
          <div class="tf-weekly-stat">
            <span class="tf-weekly-stat-val">${totalWeekTasks - concluidas}</span>
            <span class="tf-weekly-stat-label">Pendentes</span>
          </div>
        </div>
      </div>
      <div class="tf-weekly-columns">
        ${columnsHtml}
      </div>
    </div>`;
  },

  changeMobileMonth(offset) {
    if (!this.selectedMobileDate) this.selectedMobileDate = new Date();
    const d = new Date(this.selectedMobileDate);
    d.setMonth(d.getMonth() + offset);
    d.setDate(1);
    this.selectedMobileDate = d;
    this.render();
  },

  selectMobileDay(dayNum) {
    if (!this.selectedMobileDate) this.selectedMobileDate = new Date();
    const d = new Date(this.selectedMobileDate);
    this.selectedMobileDate = new Date(d.getFullYear(), d.getMonth(), dayNum);
    this.render();
  },
});
