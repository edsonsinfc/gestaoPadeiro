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
      const [clients, activities, padeiros, avaliacoes, cronogramas] = await Promise.all([
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/avaliacoes').catch(() => []),
        API.get('/api/cronograma').catch(() => [])
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
      EscalaState.activities      = activities; // Salva todas para o calendário (getClientStats filtra finalizadas)
      EscalaState.padeiros        = padeiros;
      EscalaState.avaliacoes      = avaliacoes;
      EscalaState.cronogramas     = cronogramas;
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
  async renderAgendar(routeData) {
    const container = document.getElementById('page-container');
    if (!container) return;

    if (!EscalaState._loaded) {
      container.innerHTML = Components.loading();
      try {
        const [clients, activities, padeiros, avaliacoes, cronogramas] = await Promise.all([
          API.get('/api/clientes').catch(() => []),
          API.get('/api/atividades').catch(() => []),
          API.get('/api/padeiros').catch(() => []),
          API.get('/api/avaliacoes').catch(() => []),
          API.get('/api/cronograma').catch(() => [])
        ]);

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
        EscalaState.activities      = activities;
        EscalaState.padeiros        = padeiros;
        EscalaState.avaliacoes      = avaliacoes;
        EscalaState.cronogramas     = cronogramas;
        EscalaState.filteredClients = [...assignedClients];
        EscalaState._loaded         = true;
      } catch (err) {
        console.error('❌ EscalaMain: erro ao carregar dados em renderAgendar', err);
      }
    }

    const user = API.getUser();
    const initials = (user && user.nome) ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'VD';

    // Montar HTML
    container.innerHTML = this._buildCalendarHTML(initials, routeData);
    if (typeof Components !== 'undefined') Components.renderIcons();

    // Se veio um clienteId por parâmetro da rota (clique no botão Agendar), abre o modal automaticamente
    if (routeData && routeData.clienteId) {
      setTimeout(() => {
        this.abrirModalNovoPedido(routeData.clienteId);
      }, 150);
    }
  },

  // Alias mantido por compatibilidade com app.js
  renderAgendarVazio(routeData) {
    this.renderAgendar(routeData);
  },

  /* -------------------------------------------------- */
  /* BUILD DO CALENDÁRIO                                */
  /* -------------------------------------------------- */
  _buildCalendarHTML(initials, routeData) {
    const user = API.getUser();
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
      const dateStr    = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasEvent   = this._dayHasEvents(dateStr);
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
    const isSelectedToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const dayLabel = isSelectedToday ? 'Hoje' : dayOfWeek;

    // Calcular resumo do dia real
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Pegar clientes do vendedor
    let assignedClientIds = [];
    if (user && user.role === 'vendedor' && user.clienteIds) {
      try {
        assignedClientIds = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
      } catch (e) {
        assignedClientIds = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
      }
    }
    
    const countCronogramas = (EscalaState.cronogramas || []).filter(t => {
      const tData = t.data ? t.data.split('T')[0] : '';
      if (tData !== selectedDateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(t.clienteId);
    }).length;

    const countAtividades = (EscalaState.activities || []).filter(a => {
      const aData = a.data ? a.data.split('T')[0] : '';
      if (aData !== selectedDateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(a.clienteId);
    }).length;

    const totalEvents = countCronogramas + countAtividades;
    const daySummary = totalEvents > 0 
      ? `${totalEvents} compromisso(s)`
      : 'Sem agendamentos';

    // Eventos reais do dia selecionado
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
              <span class="agendar-day-summary">${daySummary}</span>
            </div>
          </div>
          <button class="agendar-view-all" onclick="App.navigate('vendedor-escala')">Ver todos</button>
        </div>

        <div class="agendar-divider cascade-item" style="--index: 2"></div>

        <!-- Lista de eventos -->
        <div class="agendar-events-list cascade-item" style="--index: 3">
          ${eventsHtml}
        </div>

        <!-- Seção Notas -->
        <div class="agendar-section-title cascade-item" style="--index: 4">Notas</div>
        <div class="agendar-task-placeholder cascade-item" style="--index: 5" onclick="Components.toast('Função de notas em desenvolvimento', 'info')">Toque para adicionar uma nota...</div>

        <!-- FAB -->
        <button class="agendar-fab cascade-item" style="--index: 6" title="Novo agendamento" onclick="EscalaMain.abrirModalNovoPedido()">
          <i data-lucide="plus"></i>
        </button>
      </div>`;
  },

  /* Helper para checar se o dia tem cronograma ou atividades */
  _dayHasEvents(dateStr) {
    const user = API.getUser();
    let assignedClientIds = [];
    if (user && user.role === 'vendedor' && user.clienteIds) {
      try {
        assignedClientIds = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
      } catch (e) {
        assignedClientIds = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
      }
    }

    const hasCronograma = (EscalaState.cronogramas || []).some(t => {
      const tData = t.data ? t.data.split('T')[0] : '';
      if (tData !== dateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(t.clienteId);
    });

    const hasAtividade = (EscalaState.activities || []).some(a => {
      const aData = a.data ? a.data.split('T')[0] : '';
      if (aData !== dateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(a.clienteId);
    });

    return hasCronograma || hasAtividade;
  },

  /* -------------------------------------------------- */
  /* EVENTOS DO DIA SELECIONADO                         */
  /* -------------------------------------------------- */
  _buildEventsHTML(routeData) {
    const year  = this._calYear;
    const month = this._calMonth;
    const day   = this._calDay;
    const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const user = API.getUser();
    let assignedClientIds = [];
    if (user && user.role === 'vendedor' && user.clienteIds) {
      try {
        assignedClientIds = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
      } catch (e) {
        assignedClientIds = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
      }
    }

    // 1. Filtrar tarefas do cronograma para este dia e clientes do vendedor
    const dailyCronogramas = (EscalaState.cronogramas || []).filter(t => {
      const tData = t.data ? t.data.split('T')[0] : '';
      if (tData !== selectedDateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(t.clienteId);
    });

    // 2. Filtrar atividades (atendimentos) para este dia e clientes do vendedor
    const dailyActivities = (EscalaState.activities || []).filter(a => {
      const aData = a.data ? a.data.split('T')[0] : '';
      if (aData !== selectedDateStr) return false;
      return assignedClientIds.length === 0 || assignedClientIds.includes(a.clienteId);
    });

    let eventsHtml = '';

    // Se temos tarefas ou atividades, renderizamos
    if (dailyCronogramas.length > 0 || dailyActivities.length > 0) {
      // Renderizar cronograma (tarefas planejadas)
      dailyCronogramas.forEach(t => {
        const isDone = dailyActivities.some(a => (a.cronogramaId === t.id || a.cronogramaId === t._id || (a.clienteId === t.clienteId && a.data === t.data)) && a.status === 'finalizada');
        const isInProgress = !isDone && dailyActivities.some(a => (a.cronogramaId === t.id || a.cronogramaId === t._id || (a.clienteId === t.clienteId && a.data === t.data)) && a.status === 'em_andamento');
        
        let statusLabel = 'Pendente';
        let statusClass = 'agendar-event-bar--orange';
        let statusPillColor = 'orange';
        
        if (isDone || t.status === 'concluida') {
          statusLabel = 'Concluída';
          statusClass = 'agendar-event-bar--green';
          statusPillColor = 'green';
        } else if (isInProgress || t.status === 'em_andamento') {
          statusLabel = 'Em Andamento';
          statusClass = 'agendar-event-bar--blue';
          statusPillColor = 'blue';
        } else if (t.status === 'solicitado') {
          statusLabel = 'Em Análise';
          statusClass = 'agendar-event-bar--blue';
          statusPillColor = 'blue';
        }

        eventsHtml += `
          <div class="agendar-event-card">
            <div class="agendar-event-bar ${statusClass}"></div>
            <div class="agendar-event-content">
              <div class="agendar-event-title">${t.clienteNome || 'Cliente'}</div>
              <div class="agendar-event-time">
                <i data-lucide="user" size="12" style="display:inline-block; vertical-align:middle; margin-right:4px;"></i>
                Padeiro: ${t.padeiroNome || 'A definir'} | ${t.horario || 'Horário a definir'}
              </div>
            </div>
            <span class="escala-pill escala-pill--${statusPillColor}" style="margin-right:12px; font-size:11px; flex-shrink:0;">
              ${statusLabel}
            </span>
          </div>`;
      });

      // Renderizar atividades (atendimentos realizados adicionais)
      dailyActivities.forEach(a => {
        // Evita duplicar se a atividade já está associada a uma tarefa do cronograma acima
        const isFromCronograma = dailyCronogramas.some(t => a.cronogramaId === t.id || a.cronogramaId === t._id || (a.clienteId === t.clienteId && a.data === t.data));
        if (isFromCronograma) return;

        const statusLabel = a.status === 'em_andamento' ? 'Em Andamento' : 'Realizado';
        const statusClass = a.status === 'em_andamento' ? 'agendar-event-bar--blue' : 'agendar-event-bar--green';
        const statusPillColor = a.status === 'em_andamento' ? 'blue' : 'green';

        eventsHtml += `
          <div class="agendar-event-card">
            <div class="agendar-event-bar ${statusClass}"></div>
            <div class="agendar-event-content">
              <div class="agendar-event-title">${a.clienteNome || 'Cliente'}</div>
              <div class="agendar-event-time">
                <i data-lucide="${a.status === 'em_andamento' ? 'zap' : 'check'}" size="12" style="display:inline-block; vertical-align:middle; margin-right:4px; color:${a.status === 'em_andamento' ? '#1E4BFF' : '#22C55E'};"></i>
                Atendimento ${a.status === 'em_andamento' ? 'iniciado' : 'realizado'} por ${a.padeiroNome || 'Padeiro'} (${a.hora || 'Horário n/d'})
              </div>
            </div>
            <span class="escala-pill escala-pill--${statusPillColor}" style="margin-right:12px; font-size:11px; flex-shrink:0;">
              ${statusLabel}
            </span>
          </div>`;
      });
    }

    // Se veio um routeData com clienteNome (clicou em "Agendar" na lista),
    // e não há agendamento para aquele cliente no dia selecionado, mostra um convite de agendamento:
    if (routeData && routeData.clienteNome) {
      const alreadyScheduled = dailyCronogramas.some(t => t.clienteId === routeData.clienteId);
      if (!alreadyScheduled) {
        eventsHtml += `
          <div class="agendar-event-card" style="border: 2px dashed #1E4BFF; background: rgba(30,75,255,0.02); justify-content: space-between; align-items: center;">
            <div class="agendar-event-content" style="padding: 10px 0; flex: 1;">
              <div class="agendar-event-title" style="font-weight:700; color:#1E4BFF;">${routeData.clienteNome}</div>
              <div class="agendar-event-time">Nenhum atendimento programado.</div>
            </div>
            <button class="escala-pill escala-pill--blue" style="font-size:11px; border:none; cursor:pointer; height:32px; padding: 0 12px; font-weight:700; display:flex; align-items:center; gap:4px;" onclick="EscalaMain.abrirFormSolicitacao('${routeData.clienteId}', '${routeData.clienteNome.replace(/'/g, "\\'")}')">
              <i data-lucide="bell" style="width:12px; height:12px;"></i> Pedir Atendimento
            </button>
          </div>`;
      }
    }

    if (!eventsHtml) {
      return `
        <div style="text-align:center; padding: 32px 24px; color: #8e8e93;">
          <i data-lucide="calendar-x-2" style="width:44px;height:44px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;opacity:0.4;"></i>
          <div style="font-size:15px;font-weight:600;color:#1c1c1e;margin-bottom:4px;">Nenhum agendamento</div>
          <div style="font-size:13px; cursor:pointer;" onclick="EscalaMain.abrirModalNovoPedido()">Toque no <strong style="color:var(--primary, #1E4BFF);">+</strong> para criar</div>
        </div>`;
    }

    return eventsHtml;
  },

  /* -------------------------------------------------- */
  /* INTERAÇÃO DO CALENDÁRIO                            */
  /* -------------------------------------------------- */
  _selectDay(day) {
    if (!day) return;
    this._calDay = day;
    this.renderAgendar(App.routeData || {});
  },

  abrirFormSolicitacao(clienteId, clienteNome) {
    const year  = this._calYear;
    const month = this._calMonth;
    const day   = this._calDay;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dataFormatada = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:16px; padding: 8px 0;">
        <div style="font-size:14px; color:var(--text-secondary); line-height:1.4;">
          Solicitar atendimento para o cliente <strong style="color:var(--text-primary);">${clienteNome}</strong> no dia <strong>${dataFormatada}</strong>. O pedido será encaminhado ao gestor da filial.
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:6px; display:block; font-size:13px;">Horário Sugerido (opcional)</label>
          <input type="time" id="solicitar-horario" class="input-control" style="width:100%; padding-left:16px; border: 1px solid var(--border, #ccc); border-radius: 8px; height: 38px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:6px; display:block; font-size:13px;">Observação / Motivo do Atendimento</label>
          <textarea id="solicitar-obs" class="input-control" rows="3" placeholder="Ex: Cliente necessitando visita técnica urgentemente..." style="width:100%; padding:12px; line-height:1.4; border: 1px solid var(--border, #ccc); border-radius: 8px; font-size: 13px;"></textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="Components.closeModal()" style="border-radius:10px; font-weight:600;">Cancelar</button>
      <button class="btn btn-primary" onclick="EscalaMain.enviarSolicitacao('${clienteId}', '${clienteNome.replace(/'/g, "\\'")}', '${dateStr}')" style="border-radius:10px; font-weight:600;">Enviar Pedido</button>
    `;

    Components.showModal('Pedir Atendimento', contentHtml, footerHtml);
  },

  async enviarSolicitacao(clienteId, clienteNome, dateStr) {
    const horario = document.getElementById('solicitar-horario')?.value || '';
    const observacao = document.getElementById('solicitar-obs')?.value || '';

    try {
      Components.closeModal();
      const user = API.getUser();

      const novaSolicitacao = {
        clienteId,
        clienteNome,
        data: dateStr,
        horario,
        observacao,
        status: 'solicitado', // Forçado
        criadoPor: user ? user.id : 'vendedor'
      };

      const result = await API.post('/api/cronograma', novaSolicitacao);
      
      Components.toast('Pedido de atendimento enviado com sucesso!', 'success');

      // Atualizar dados localmente e renderizar novamente
      if (EscalaState.cronogramas) {
        EscalaState.cronogramas.push(result);
      }
      
      // Limpar routeData para não mostrar mais o card pontilhado
      if (App.routeData && App.routeData.clienteId === clienteId) {
        App.routeData = {};
      }

      this.renderAgendar(App.routeData || {});
    } catch (e) {
      console.error(e);
      Components.toast('Erro ao enviar pedido: ' + e.message, 'error');
    }
  },

  abrirModalNovoPedido(clienteIdPadrao = null) {
    const year  = this._calYear;
    const month = this._calMonth;
    const day   = this._calDay;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Options de clientes
    const clientesOptions = (EscalaState.clients || []).map(c => {
      const selected = (clienteIdPadrao === c.id || clienteIdPadrao === c._id) ? 'selected' : '';
      return `<option value="${c.id || c._id}" ${selected}>${c.nomeFantasia || c.nome || 'Cliente'}</option>`;
    }).join('');

    // Options de padeiros
    const padeirosOptions = `<option value="">(Nenhum - Deixar para o gestor escolher)</option>` + (EscalaState.padeiros || []).map(p => {
      return `<option value="${p.id || p._id}">${p.nome || p.name}</option>`;
    }).join('');

    const contentHtml = `
      <div style="display:flex; flex-direction:column; gap:14px; padding: 4px 0;">
        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px; color:var(--text-primary);">Cliente</label>
          <select id="novo-pedido-cliente" class="input-control" style="width:100%; border: 1px solid var(--border, #ccc); border-radius: 8px; height: 38px; padding: 0 12px; font-size: 13px; background-color: var(--card-bg, #fff);">
            <option value="" disabled ${!clienteIdPadrao ? 'selected' : ''}>Selecione o cliente...</option>
            ${clientesOptions}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px; color:var(--text-primary);">Data do Atendimento</label>
          <input type="date" id="novo-pedido-data" class="input-control" value="${dateStr}" style="width:100%; border: 1px solid var(--border, #ccc); border-radius: 8px; height: 38px; padding: 0 12px; font-size: 13px; background-color: var(--card-bg, #fff);">
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px; color:var(--text-primary);">Padeiro Sugerido (opcional)</label>
          <select id="novo-pedido-padeiro" class="input-control" style="width:100%; border: 1px solid var(--border, #ccc); border-radius: 8px; height: 38px; padding: 0 12px; font-size: 13px; background-color: var(--card-bg, #fff);">
            ${padeirosOptions}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px; color:var(--text-primary);">Horário Sugerido (opcional)</label>
          <input type="time" id="novo-pedido-horario" class="input-control" style="width:100%; border: 1px solid var(--border, #ccc); border-radius: 8px; height: 38px; padding: 0 12px; font-size: 13px; background-color: var(--card-bg, #fff);">
        </div>

        <div class="form-group" style="margin-bottom:0;">
          <label style="font-weight:600; margin-bottom:4px; display:block; font-size:13px; color:var(--text-primary);">Observação / Motivo do Atendimento</label>
          <textarea id="novo-pedido-obs" class="input-control" rows="2" placeholder="Ex: Solicitação de visita para suporte..." style="width:100%; padding:10px; line-height:1.4; border: 1px solid var(--border, #ccc); border-radius: 8px; font-size: 13px; background-color: var(--card-bg, #fff);"></textarea>
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="Components.closeModal()" style="border-radius:10px; font-weight:600;">Cancelar</button>
      <button class="btn btn-primary" onclick="EscalaMain.salvarNovoPedido()" style="border-radius:10px; font-weight:600;">Enviar Solicitação</button>
    `;

    Components.showModal('Solicitar Atendimento', contentHtml, footerHtml);
  },

  async salvarNovoPedido() {
    const clienteId = document.getElementById('novo-pedido-cliente')?.value;
    const dataStr = document.getElementById('novo-pedido-data')?.value;
    const padeiroId = document.getElementById('novo-pedido-padeiro')?.value || null;
    const horario = document.getElementById('novo-pedido-horario')?.value || '';
    const observacao = document.getElementById('novo-pedido-obs')?.value || '';

    if (!clienteId) {
      Components.toast('Selecione o cliente para o atendimento.', 'warning');
      return;
    }
    if (!dataStr) {
      Components.toast('Selecione a data para o atendimento.', 'warning');
      return;
    }

    try {
      Components.closeModal();
      const user = API.getUser();
      
      const clienteObj = EscalaState.clients.find(c => (c.id || c._id) === clienteId);
      const clienteNome = clienteObj ? (clienteObj.nomeFantasia || clienteObj.nome) : 'Cliente';

      let padeiroNome = null;
      let codTec = null;
      if (padeiroId) {
        const padeiroObj = EscalaState.padeiros.find(p => (p.id || p._id) === padeiroId);
        if (padeiroObj) {
          padeiroNome = padeiroObj.nome || padeiroObj.name;
          codTec = padeiroObj.codTec || null;
        }
      }

      const novaSolicitacao = {
        clienteId,
        clienteNome,
        data: dataStr,
        horario,
        observacao,
        padeiroId,
        padeiroNome,
        codTec,
        status: 'solicitado',
        criadoPor: user ? user.id : 'vendedor'
      };

      const result = await API.post('/api/cronograma', novaSolicitacao);
      
      Components.toast('Pedido de atendimento enviado com sucesso!', 'success');

      // Atualizar localmente
      if (EscalaState.cronogramas) {
        EscalaState.cronogramas.push(result);
      }

      // Limpar routeData para não abrir novamente em loop
      if (App.routeData && App.routeData.clienteId === clienteId) {
        App.routeData = {};
      }

      this.renderAgendar(App.routeData || {});
    } catch (e) {
      console.error(e);
      Components.toast('Erro ao criar pedido: ' + e.message, 'error');
    }
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
