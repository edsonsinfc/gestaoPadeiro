/**
 * ARQUIVO: escala.main.js — v2
 * MÓDULO: Escala de Atendimento — Vendedor
 * RESPONSABILIDADE: Orquestrador da Escala + tela de Agendar Atendimento
 * DEPENDE DE: escala.state.js (EscalaState), escala.cards.js (EscalaCards)
 */

const EscalaMain = {

  // Estado interno do calendário
  _calYear:  new Date().getFullYear(),
  _calMonth: new Date().getMonth(),   // 0-indexed
  _calDay:   new Date().getDate(),

  /* -------------------------------------------------- */
  /* ESCALA DE ATENDIMENTO                              */
  /* -------------------------------------------------- */
  async init() {
    const container = document.getElementById('page-container');
    if (!container) return;
    container.innerHTML = Components.loading();

    try {
      const [clients, activities, padeiros, avaliacoes] = await Promise.all([
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/avaliacoes').catch(() => [])
      ]);

      // Filtrar clientes do vendedor (mesmo padrão do VendedorClientes)
      const user = API.getUser();
      let assignedClients = clients;
      if (user && user.role === 'vendedor' && user.clienteIds) {
        let uClientes = [];
        try {
          uClientes = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
        } catch (e) {
          uClientes = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
        }
        if (uClientes && uClientes.length > 0) {
          assignedClients = clients.filter(c => uClientes.includes(c.id));
        }
      }

      EscalaState.clients         = assignedClients;
      EscalaState.activities      = activities.filter(a => a.status === 'finalizada');
      EscalaState.padeiros        = padeiros;
      EscalaState.avaliacoes      = avaliacoes;
      EscalaState.filteredClients = [...assignedClients];
      EscalaState._loaded         = true;

      EscalaCards.renderAll();
      console.log('📅 EscalaMain: escala carregada com', assignedClients.length, 'cliente(s)');
    } catch (err) {
      console.error('❌ EscalaMain: erro ao carregar dados', err);
      document.getElementById('page-container').innerHTML =
        Components.empty('alert-circle', 'Erro ao carregar escala de atendimento.');
    }
  },

  /* -------------------------------------------------- */
  /* AGENDAR ATENDIMENTO — Design Calendar              */
  /* -------------------------------------------------- */
  renderAgendar(routeData) {
    const container = document.getElementById('page-container');
    if (!container) return;

    const user = API.getUser();
    const initials = user ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'VD';

    // Montar HTML
    container.innerHTML = this._buildCalendarHTML(initials, routeData);
    if (typeof Components !== 'undefined') Components.renderIcons();
  },

  // Alias mantido por compatibilidade com app.js
  renderAgendarVazio(routeData) {
    this.renderAgendar(routeData);
  },

  /* -------------------------------------------------- */
  /* BUILD DO CALENDÁRIO                                */
  /* -------------------------------------------------- */
  _buildCalendarHTML(initials, routeData) {
    const today = new Date();
    const year  = this._calYear;
    const month = this._calMonth;
    const day   = this._calDay;

    const monthNames = [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
    ];
    const monthLabel = monthNames[month];

    // Dias da semana: D S T Q Q S S
    const weekdayLabels = ['D','S','T','Q','Q','S','S'];

    // Primeiro dia do mês e total de dias
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Dom
    const daysInMonth     = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Gerar células (6 semanas × 7 = 42)
    const cells = [];
    // Dias do mês anterior (preenchimento)
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, type: 'prev' });
    }
    // Dias do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday    = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSelected = d === day;
      const hasEvent   = [5, 12, 19, 25].includes(d); // dias com "eventos" decorativos
      cells.push({ day: d, type: 'current', isToday, isSelected, hasEvent });
    }
    // Completar até 35 células (5 semanas)
    const remaining = 35 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next' });
    }

    // HTML das células
    const daysHtml = cells.map(c => {
      let cls = 'agendar-day';
      if (c.type !== 'current') cls += ' agendar-day--other-month';
      if (c.isToday)    cls += ' agendar-day--today';
      if (c.isSelected) cls += ' agendar-day--selected';
      if (c.hasEvent)   cls += ' agendar-day--has-event';
      return `
        <div class="${cls}" onclick="EscalaMain._selectDay(${c.type === 'current' ? c.day : 0})">
          <div class="agendar-day-inner">${c.day}</div>
        </div>`;
    }).join('');

    // Info do dia selecionado
    const selectedDate = new Date(year, month, day);
    const dayOfWeek = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][selectedDate.getDay()];
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dayLabel = isToday ? 'Hoje' : dayOfWeek;

    // Eventos estáticos de exemplo (design only)
    const eventsHtml = this._buildEventsHTML(routeData);

    return `
      <div class="agendar-screen">

        <!-- Header interno -->
        <div class="agendar-header">
          <button class="agendar-back-btn" onclick="App.navigate('vendedor-escala')">
            <i data-lucide="chevron-left"></i>
          </button>

          <div class="agendar-month-selector-wrapper">
            <button class="agendar-month-selector" onclick="EscalaMain.toggleMonthDropdown(event)">
              <span class="agendar-month-label">${monthLabel}</span>
              <i data-lucide="chevron-down"></i>
            </button>
            
            <div class="agendar-dropdown" id="agendar-month-dropdown">
              ${monthNames.map((name, idx) => `
                <div class="agendar-dropdown-item ${idx === month ? 'selected' : ''}" onclick="EscalaMain.selectMonth(${idx})">
                  <span>${name}</span>
                  ${idx === month ? '<i data-lucide="check"></i>' : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="agendar-header-actions">
            <button class="agendar-search-btn">
              <i data-lucide="search"></i>
            </button>
            <div class="agendar-avatar">${initials}</div>
          </div>
        </div>

        <!-- Calendário -->
        <div class="agendar-calendar cascade-item" style="--index: 0">
          <!-- Dias da semana -->
          <div class="agendar-weekdays">
            ${weekdayLabels.map(l => `<div class="agendar-weekday">${l}</div>`).join('')}
          </div>
          <!-- Grade de dias -->
          <div class="agendar-days-grid">
            ${daysHtml}
          </div>
        </div>

        <!-- Resumo do dia selecionado -->
        <div class="agendar-selected-info cascade-item" style="--index: 1">
          <div class="agendar-selected-date">
            <span class="agendar-day-number">${day}</span>
            <div class="agendar-day-info">
              <span class="agendar-day-name">${dayLabel}</span>
              <span class="agendar-day-summary">Sem agendamentos</span>
            </div>
          </div>
          <button class="agendar-view-all">Ver tudo</button>
        </div>

        <div class="agendar-divider cascade-item" style="--index: 2"></div>

        <!-- Lista de eventos -->
        <div class="agendar-events-list cascade-item" style="--index: 3">
          ${eventsHtml}
        </div>

        <!-- Seção Notas -->
        <div class="agendar-section-title cascade-item" style="--index: 4">Notas</div>
        <div class="agendar-task-placeholder cascade-item" style="--index: 5">Toque para adicionar uma nota...</div>

        <!-- FAB -->
        <button class="agendar-fab cascade-item" style="--index: 6" title="Novo agendamento">
          <i data-lucide="plus"></i>
        </button>
      </div>`;
  },

  /* -------------------------------------------------- */
  /* EVENTOS DO DIA SELECIONADO                         */
  /* -------------------------------------------------- */
  _buildEventsHTML(routeData) {
    // Se veio de um card de cliente, mostra um placeholder para aquele cliente
    if (routeData && routeData.clienteNome) {
      return `
        <div class="agendar-event-card">
          <div class="agendar-event-bar agendar-event-bar--orange"></div>
          <div class="agendar-event-content">
            <div class="agendar-event-title">${routeData.clienteNome}</div>
            <div class="agendar-event-time">Toque para definir horário</div>
          </div>
          <button class="agendar-event-action agendar-event-action--orange">
            <i data-lucide="calendar-plus"></i>
          </button>
        </div>
        <div class="agendar-event-card">
          <div class="agendar-event-bar agendar-event-bar--blue"></div>
          <div class="agendar-event-content">
            <div class="agendar-event-title">Visita de atendimento</div>
            <div class="agendar-event-time">Horário a definir</div>
          </div>
          <button class="agendar-event-action agendar-event-action--muted">
            <i data-lucide="more-vertical"></i>
          </button>
        </div>`;
    }

    // Sem cliente selecionado — estado vazio elegante
    return `
      <div style="text-align:center; padding: 32px 24px; color: #8e8e93;">
        <i data-lucide="calendar-x-2" style="width:44px;height:44px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;opacity:0.4;"></i>
        <div style="font-size:15px;font-weight:600;color:#1c1c1e;margin-bottom:4px;">Nenhum agendamento</div>
        <div style="font-size:13px;">Toque no <strong style="color:var(--primary, #1E4BFF);">+</strong> para criar</div>
      </div>`;
  },

  /* -------------------------------------------------- */
  /* INTERAÇÃO DO CALENDÁRIO                            */
  /* -------------------------------------------------- */
  _selectDay(day) {
    if (!day) return;
    this._calDay = day;
    this.renderAgendar(App.routeData || {});
  },

  toggleMonthDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('agendar-month-dropdown');
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    // Fechar qualquer outro aberto
    document.querySelectorAll('.agendar-dropdown').forEach(d => d.classList.remove('active'));
    
    if (!isActive) {
      dropdown.classList.add('active');
      
      // Registrar clique fora para fechar uma única vez
      const closeHandler = () => {
        dropdown.classList.remove('active');
        document.removeEventListener('click', closeHandler);
      };
      setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }
  },

  selectMonth(monthIndex) {
    this._calMonth = monthIndex;
    // Ajustar o dia se passar o limite do novo mês
    const maxDays = new Date(this._calYear, monthIndex + 1, 0).getDate();
    if (this._calDay > maxDays) this._calDay = maxDays;
    
    this.renderAgendar(App.routeData || {});
  }
};
