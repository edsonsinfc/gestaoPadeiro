/**
 * Componente Timeline - BRAGO Sistema Padeiro
 * Gestão cronológica das ações do padeiro (Mobile-First / Apple HIG)
 */

const Timeline = {
  selectedBaker: null,
  selectedDate: new Date().toISOString().split('T')[0],
  timelineEvents: [],
  allBakers: [],

  async changeDate(newDate) {
    if (!newDate) return;
    this.selectedDate = newDate;
    await this.render();
  },

  calendarCurrentDate: new Date(),

  openCalendar() {
    if (this.selectedDate) {
       this.calendarCurrentDate = new Date(this.selectedDate + 'T12:00:00');
    } else {
       this.calendarCurrentDate = new Date();
    }
    
    const existing = document.getElementById('hig-calendar-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'hig-calendar-modal';
    modal.className = 'hig-modal-overlay fade-in';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
    
    modal.innerHTML = `
      <div class="hig-calendar-content" style="background:var(--bg-primary,#fff);width:100%;max-width:500px;border-radius:24px 24px 0 0;padding:20px 20px 40px;box-shadow:0 -4px 24px rgba(0,0,0,0.1);transform:translateY(100%);transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
        <div style="width:36px;height:5px;background:var(--border-color,#E5E5EA);border-radius:3px;margin:0 auto 16px;"></div>
        <div class="hig-cal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <button onclick="Timeline.changeCalendarMonth(-1)" style="background:none;border:none;color:#007AFF;cursor:pointer;padding:8px;"><i data-lucide="chevron-left" style="width:24px;height:24px;"></i></button>
          <div id="hig-cal-month-year" style="font-size:17px;font-weight:600;font-family:'Inter',-apple-system,sans-serif;text-transform:capitalize;color:var(--text-primary,#1a1a1a);"></div>
          <button onclick="Timeline.changeCalendarMonth(1)" style="background:none;border:none;color:#007AFF;cursor:pointer;padding:8px;"><i data-lucide="chevron-right" style="width:24px;height:24px;"></i></button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:13px;font-weight:500;color:var(--text-tertiary,#8E8E93);margin-bottom:12px;">
          <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        <div id="hig-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:12px 0;text-align:center;">
        </div>
        <button onclick="Timeline.closeCalendar()" style="width:100%;padding:14px;background:rgba(0,122,255,0.1);color:#007AFF;border:none;border-radius:14px;font-size:17px;font-weight:600;margin-top:24px;cursor:pointer;">Cancelar</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    setTimeout(() => {
      modal.querySelector('.hig-calendar-content').style.transform = 'translateY(0)';
    }, 10);
    
    this.renderCalendarGrid();
  },

  changeCalendarMonth(dir) {
    this.calendarCurrentDate.setMonth(this.calendarCurrentDate.getMonth() + dir);
    this.renderCalendarGrid();
  },

  closeCalendar() {
    const modal = document.getElementById('hig-calendar-modal');
    if (modal) {
      modal.querySelector('.hig-calendar-content').style.transform = 'translateY(100%)';
      setTimeout(() => modal.remove(), 300);
    }
  },

  renderCalendarGrid() {
    const monthYear = document.getElementById('hig-cal-month-year');
    const grid = document.getElementById('hig-cal-grid');
    if (!monthYear || !grid) return;
    
    const year = this.calendarCurrentDate.getFullYear();
    const month = this.calendarCurrentDate.getMonth();
    
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    monthYear.innerText = formatter.format(new Date(year, month, 1));
    
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const selectedDateObj = this.selectedDate ? new Date(this.selectedDate + 'T12:00:00') : null;
    
    for (let i = 0; i < firstDay; i++) {
      grid.innerHTML += `<div></div>`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateVal = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      let isSelected = false;
      if (selectedDateObj && i === selectedDateObj.getDate() && month === selectedDateObj.getMonth() && year === selectedDateObj.getFullYear()) {
        isSelected = true;
      }
      
      let style = 'width:36px;height:36px;display:flex;align-items:center;justify-content:center;margin:0 auto;border-radius:50%;font-size:17px;font-family:"Inter",-apple-system,sans-serif;cursor:pointer;';
      
      if (isSelected) {
        style += 'background:#007AFF;color:white;font-weight:600;box-shadow:0 2px 6px rgba(0,122,255,0.3);';
      } else if (isToday) {
        style += 'color:#007AFF;font-weight:600;background:rgba(0,122,255,0.1);';
      } else {
        style += 'color:var(--text-primary,#1a1a1a);';
      }
      
      grid.innerHTML += `
        <div>
          <div onclick="Timeline.selectCalendarDate('${dateVal}')" style="${style}">${i}</div>
        </div>
      `;
    }
  },

  selectCalendarDate(dateStr) {
    this.closeCalendar();
    this.changeDate(dateStr);
  },

  async render() {
    
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;
    
    pageContainer.innerHTML = Components.loading();

    try {
      await this.loadData();
    } catch (e) {
      console.error(e);
      pageContainer.innerHTML = `<div class="error-message" style="padding: 20px;">Erro ao carregar dados reais: ${e.message}</div>`;
      return;
    }

    this.updateDOM();
  },

  updateDOM() {
    const container = document.getElementById('page-container');
    if (!container) return;
    
    // Apple HIG style clean view
    let html = `
      <div class="timeline-view">
        <style>
          .timeline-view {
            background: var(--system-bg);
            min-height: 100vh;
            width: 100%;
          }
          /* Custom overrides for HIG */
        </style>
      <div class="tl-wrapper fade-in">
        ${this.renderNavigationBar()}
        ${this.renderTimelineContainer()}
      </div>
      </div>
    `;
    
    container.innerHTML = html;
    this.injectStyles();
    lucide.createIcons();
  },

  async loadData() {
    const user = API.getUser();
    this.allBakers = [];
    
    if (user.role === 'padeiro') {
      this.selectedBaker = { id: user.id, nome: user.nome, iniciais: this.getInitials(user.nome) };
    } else {
      const padeiros = await API.get('/api/padeiros');
      this.allBakers = padeiros;
      if (!this.selectedBaker && padeiros.length > 0) {
        this.selectedBaker = { id: padeiros[0].id, nome: padeiros[0].nome, iniciais: this.getInitials(padeiros[0].nome) };
      }
    }

    if (!this.selectedBaker) {
      this.timelineEvents = [];
      return;
    }

    const dateStr = this.selectedDate || new Date().toISOString().split('T')[0];
    const events = await API.get(`/api/timeline-events/${this.selectedBaker.id}?date=${dateStr}`);
    
    this.timelineEvents = [];
    let eventId = 1;

    events.forEach(t => {
      const dt = new Date(t.timestamp);
      const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      this.timelineEvents.push({
        id: eventId++,
        tipo: 'atividade_passo', // We can map specific colors/icons based on t.action if needed
        titulo: t.action,
        descricao: t.source === 'gps' ? 'Localização Capturada' : (t.source === 'error_or_fallback' ? 'Sem GPS nativo' : ''),
        status: 'concluido',
        hora: hora,
        timestamp: dt.getTime(),
        location: (t.lat && t.lng) ? `${t.lat},${t.lng}` : null,
        clienteNome: t.clienteNome || null,
        clienteId: t.clienteId || null
      });
    });

    // Ordenar cronologicamente
    this.timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Definir etapas esperadas (standard steps)
    const expectedSteps = [
      { titulo: 'Login no Aplicativo', keyword: 'Login' },
      { titulo: 'Iniciou Atendimento', keyword: 'Início' },
      { titulo: 'Finalizou Produção', keyword: 'Fim da Produção' },
      { titulo: 'Coletou Assinatura', keyword: 'Assinatura' },
      { titulo: 'Atividade Encerrada', keyword: 'Encerrada' }
    ];

    // Verificar quais já foram concluídas
    expectedSteps.forEach(step => {
      const alreadyDone = this.timelineEvents.some(e => e.titulo && e.titulo.includes(step.keyword));
      if (!alreadyDone) {
        this.timelineEvents.push({
          id: eventId++,
          tipo: 'pendente',
          titulo: step.titulo,
          descricao: 'Aguardando ação do padeiro...',
          status: 'futuro',
          hora: '--:--',
          timestamp: 9999999999999, // Fica no final
          location: null,
          clienteNome: null,
          clienteId: null
        });
      }
    });

    // Re-ordenar (pendentes ficarão no final por causa do timestamp alto)
    this.timelineEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Se tiver eventos, marcar o último como "atual"
    if (this.timelineEvents.length > 0) {
      this.timelineEvents[this.timelineEvents.length - 1].status = 'atual';
      this.timelineEvents[this.timelineEvents.length - 1].statusBadge = { label: 'Último', color: 'blue' };
    }
  },

  getInitials(name) {
    if (!name) return 'US';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  renderNavigationBar() {
    // format date for display
    let dateDisplay = 'Hoje';
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = this.selectedDate === todayStr;
    
    if (this.selectedDate) {
      const dateObj = new Date(this.selectedDate + 'T12:00:00');
      dateDisplay = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      if (isToday) dateDisplay = 'Hoje, ' + dateDisplay;
    }

    return `
      <div class="tl-nav-bar" style="padding-top: 8px;">
        <div class="tl-nav-top">
          <h1 class="tl-nav-title">Timeline</h1>
          <div style="position: relative;">
            <button class="tl-btn-filter" onclick="Timeline.openCalendar()" style="background: rgba(0,122,255,0.1); border-radius: 50%; width: 34px; height: 34px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #007AFF;">
              <i data-lucide="calendar" style="width:18px;height:18px;"></i>
            </button>
          </div>
        </div>
        <div class="tl-nav-bottom">
          <button class="tl-baker-selector" onclick="Timeline.openBakerSelector()">
            <div class="tl-baker-avatar">${this.selectedBaker.iniciais}</div>
            <div class="tl-baker-info">
              <span class="tl-baker-name">${this.selectedBaker ? this.selectedBaker.nome : 'Nenhum padeiro'}</span>
              <span class="tl-baker-date">${dateDisplay}</span>
            </div>
            <i data-lucide="chevron-down" style="width:16px;height:16px;color:var(--text-tertiary)"></i>
          </button>
        </div>
      </div>
    `;
  },

  renderSummaryBar() {
    return `
      <div class="tl-summary-bar">
        <div class="tl-summary-pill">
          <span class="tl-summary-value">${this.timelineEvents.length}</span>
          <span class="tl-summary-label">Ações registradas</span>
        </div>
      </div>
    `;
  },

  renderTimelineContainer() {
    // Agrupa eventos por cliente (se houver) para fluxo diferenciado
    const grouped = {};
    this.timelineEvents.forEach(ev => {
      const key = ev.clienteNome || 'Geral';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    });

    let html = '<div class="tl-container">';

    if (this.timelineEvents.length === 0) {
      return '<div class="tl-container" style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">Nenhuma ação registrada para hoje.</div>';
    }

    // Paleta de cores para diferenciar clientes visualmente
    const clientColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#FF3B30'];
    let colorIndex = 0;

    // Renderiza cada cliente separadamente
    Object.keys(grouped).forEach(clientKey => {
      const events = grouped[clientKey];
      const color = clientColors[colorIndex % clientColors.length];
      colorIndex++;
      const initials = clientKey.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const countDone = events.filter(e => e.status === 'concluido').length;

      html += `
        <div class="tl-client-header">
          <div class="tl-client-avatar" style="background:${color}">${initials}</div>
          <div class="tl-client-info">
            <span class="tl-client-name">${clientKey}</span>
            <span class="tl-client-count">${countDone} de ${events.length} ações</span>
          </div>
          <div class="tl-client-badge" style="background:${color}15;color:${color}">${events.length}</div>
        </div>`;
      html += '<div class="timeline">';
      events.forEach((evento, index) => {
        const isLast = index === events.length - 1;
        let lineColorClass = '';
        if (!isLast) {
          if (evento.status === 'concluido') lineColorClass = 'green';
          else if (evento.status === 'atual') lineColorClass = 'dashed';
          else if (evento.status === 'futuro') lineColorClass = 'dashed';
          else if (evento.status === 'alerta') lineColorClass = 'dashed';
        }
        let dotHtml = '';
        if (evento.status === 'concluido') {
          dotHtml = '<div class="tl-dot done"><div class="tl-dot-inner"></div></div>';
        } else if (evento.status === 'atual') {
          dotHtml = '<div class="tl-dot active"><div class="tl-dot-inner"></div></div>';
        } else if (evento.status === 'alerta') {
          dotHtml = '<div class="tl-dot warn"><div class="tl-dot-inner"></div></div>';
        } else if (evento.status === 'futuro') {
          dotHtml = '<div class="tl-dot inactive"></div>';
        }
        // Reutiliza o código existente para montar o item
        const isMuted = evento.status === 'futuro';
        let badgeHtml = '';
        if (evento.statusBadge) {
          const badgeColor = evento.statusBadge.color;
          let bClass = 'badge-open';
          if (badgeColor === 'red') bClass = 'badge-closed';
          else if (badgeColor === 'orange') bClass = 'badge-alert';
          else if (badgeColor === 'blue') bClass = '';
          const style = badgeColor === 'blue' ? 'color:#007AFF;background:rgba(0,122,255,0.08)' : '';
          badgeHtml = `<span class="tl-badge ${bClass}" style="${style}">${evento.statusBadge.label}</span>`;
        }
        let locationHtml = '';
        if (evento.location) {
          const safeTitle = evento.titulo ? evento.titulo.replace(/'/g, "\\'") : '';
          const safeDesc = evento.descricao ? evento.descricao.replace(/'/g, "\\'") : '';
          locationHtml = `<span class="tl-loc" onclick="Timeline.openMap('${evento.location}', '${safeTitle}', '${safeDesc}')"><i data-lucide="map-pin" style="width:11px;height:11px;"></i> Localização</span>`;
        }
        html += `
          <div class="tl-item">
            <div class="tl-left">
              <div class="tl-dot-wrap">${dotHtml}</div>
              ${!isLast ? `<div class="tl-line ${lineColorClass}"></div>` : ''}
            </div>
            <div class="tl-content">
              <div class="tl-title ${isMuted ? 'muted' : ''}">${evento.titulo}</div>
              ${evento.descricao ? `<div class="tl-desc ${isMuted ? 'muted' : ''}">${evento.descricao}</div>` : ''}
              <div class="tl-meta">
                <span class="tl-time" ${isMuted ? 'style="color:var(--text-tertiary)"' : ''}>${evento.hora}</span>
                ${locationHtml}
                ${badgeHtml}
              </div>
            </div>
          </div>`;
      });
      html += '</div>'; // close timeline
    });

    html += '</div>'; // close tl-container
    return html;
  },

  openBakerSelector() {
    const user = API.getUser();
    if (user.role === 'padeiro') {
      Components.toast('Você só pode ver sua própria timeline', 'info');
      return;
    }

    if (this.allBakers.length === 0) {
      Components.toast('Nenhum padeiro encontrado', 'info');
      return;
    }

    // Render Apple HIG Action Sheet
    const sheetId = 'baker-action-sheet';
    let existing = document.getElementById(sheetId);
    if (existing) existing.remove();

    const optionsHtml = this.allBakers.map(p => `
      <button class="tl-sheet-option" onclick="Timeline.selectBaker('${p.id}')">
        <div class="tl-baker-avatar" style="width: 32px; height: 32px; font-size: 14px;">${this.getInitials(p.nome)}</div>
        <span>${p.nome}</span>
        ${this.selectedBaker && this.selectedBaker.id === p.id ? '<i data-lucide="check" style="color: var(--primary);"></i>' : ''}
      </button>
    `).join('');

    const html = `
      <div id="baker-action-sheet" class="modal-overlay active" style="z-index: 9999; flex-direction: column; justify-content: flex-end;" onclick="Timeline.closeBakerSelector(event)">
        <div class="tl-sheet-content" onclick="event.stopPropagation()">
          <div class="tl-sheet-header">
            <div class="tl-sheet-drag"></div>
            <h3 class="tl-sheet-title">Selecionar Padeiro</h3>
          </div>
          <div class="tl-sheet-body">
            ${optionsHtml}
          </div>
        </div>
        <div class="tl-sheet-cancel-wrapper" onclick="event.stopPropagation()">
          <button class="tl-sheet-cancel" onclick="Timeline.closeBakerSelector()">Cancelar</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();
    
    // Animate in
    setTimeout(() => {
      const sheet = document.querySelector('.tl-sheet-content');
      const cancelWrap = document.querySelector('.tl-sheet-cancel-wrapper');
      if (sheet) sheet.style.transform = 'translateY(0)';
      if (cancelWrap) cancelWrap.style.transform = 'translateY(0)';
    }, 10);
  },

  closeBakerSelector(e) {
    if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
    const sheetOverlay = document.getElementById('baker-action-sheet');
    if (sheetOverlay) {
      const sheet = sheetOverlay.querySelector('.tl-sheet-content');
      const cancelWrap = sheetOverlay.querySelector('.tl-sheet-cancel-wrapper');
      if (sheet) sheet.style.transform = 'translateY(120%)';
      if (cancelWrap) cancelWrap.style.transform = 'translateY(120%)';
      setTimeout(() => sheetOverlay.remove(), 300); // Wait for transition
    }
  },

  selectBaker(id) {
    const baker = this.allBakers.find(p => p.id === id);
    if (baker) {
      this.selectedBaker = {
        id: baker.id,
        nome: baker.nome,
        iniciais: this.getInitials(baker.nome)
      };
      this.closeBakerSelector();
      this.render();
    }
  },

  openMap(coords, title, desc) {
    if (!coords) return;
    const [lat, lng] = coords.split(',');
    
    // Remove existing if any
    const existing = document.getElementById('map-modal');
    if (existing) existing.remove();

    const html = `
      <div id="map-modal" class="modal-overlay" style="display:flex; flex-direction:column; justify-content:flex-end; padding:0; z-index:9999;" onclick="Timeline.closeMap(event)">
        <div class="map-modal-content" style="background:#F2F2F7; width:100%; border-radius:16px 16px 0 0; padding:16px; transform:translateY(100%); transition:transform 0.3s ease-out; box-shadow: 0 -4px 20px rgba(0,0,0,0.15);" onclick="event.stopPropagation()">
          
          <div style="width:40px; height:5px; background:#C7C7CC; border-radius:3px; margin:0 auto 16px;"></div>
          
          <div style="border-radius:12px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); margin-bottom:16px; height:250px; position:relative; z-index:1;">
            <div id="timeline-modal-map" style="width:100%; height:100%;"></div>
          </div>
          
          <div style="background:#FFFFFF; border-radius:12px; padding:16px; margin-bottom:16px; display:flex; align-items:flex-start; gap:12px;">
            <div style="background:rgba(0,122,255,0.1); color:#007AFF; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <i data-lucide="map-pin"></i>
            </div>
            <div>
              <h4 style="margin:0; font-size:16px; font-weight:600; color:var(--text-primary);">${title || 'Localização'}</h4>
              ${desc ? `<p style="margin:4px 0 0; font-size:13px; color:var(--text-secondary);">${desc}</p>` : ''}
              <div style="margin-top:8px; font-size:12px; color:var(--text-tertiary);">Coordenadas: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}</div>
            </div>
          </div>
          
          <button onclick="Timeline.closeMap()" style="width:100%; padding:14px; background:#007AFF; color:white; border:none; border-radius:12px; font-size:16px; font-weight:600; cursor:pointer;">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    lucide.createIcons();

    // Trigger animation and init map
    setTimeout(() => {
      const modal = document.getElementById('map-modal');
      if (modal) modal.classList.add('active');
      
      const content = document.querySelector('#map-modal .map-modal-content');
      if (content) content.style.transform = 'translateY(0)';
      
      if (typeof L !== 'undefined') {
        const map = L.map('timeline-modal-map', { zoomControl: false }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(map);
        L.marker([lat, lng]).addTo(map);
      }
    }, 10);
  },

  closeMap(e) {
    if (e && e.target && !e.target.classList.contains('modal-overlay') && !e.target.closest('button')) return;
    const modal = document.getElementById('map-modal');
    if (modal) {
      modal.classList.remove('active');
      const content = modal.querySelector('.map-modal-content');
      if (content) content.style.transform = 'translateY(100%)';
      setTimeout(() => modal.remove(), 300);
    }
  },

  injectStyles() {
    if (document.getElementById('timeline-styles')) return;
    const style = document.createElement('style');
    style.id = 'timeline-styles';
    style.innerHTML = `
      .timeline-view {
        background-color: var(--bg-primary);
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      /* Navbar */
      .tl-nav-bar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 0.5px solid var(--border-color);
        padding: 12px 16px;
      }
      
      .tl-nav-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 44px;
        margin-bottom: 8px;
      }
      
      .tl-btn-back {
        display: flex;
        align-items: center;
        color: #007AFF;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 16px;
        font-weight: 400;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        min-width: 44px;
        min-height: 44px;
      }
      .tl-btn-back span { margin-left: -4px; }
      
      .tl-nav-title {
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 17px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }
      
      .tl-btn-filter {
        color: #007AFF;
        background: none;
        border: none;
        padding: 0;
        min-width: 44px;
        min-height: 44px;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        cursor: pointer;
      }

      .tl-nav-bottom {
        display: flex;
      }
      
      .tl-baker-selector {
        display: flex;
        align-items: center;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 100px;
        padding: 4px 12px 4px 4px;
        width: 100%;
        min-height: 44px;
        cursor: pointer;
        text-align: left;
      }
      
      .tl-baker-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: #007AFF;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        margin-right: 12px;
      }
      
      .tl-baker-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .tl-baker-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .tl-baker-date {
        font-size: 12px;
        color: var(--text-tertiary);
      }

      /* Summary Bar */
      .tl-summary-bar {
        display: flex;
        background-color: var(--bg-secondary);
        padding: 16px;
        gap: 8px;
        justify-content: space-between;
      }
      
      .tl-summary-pill {
        flex: 1;
        background: var(--bg-primary);
        border-radius: 12px;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        border: 1px solid var(--border-color);
      }
      
      .tl-summary-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 2px;
      }
      
      .tl-summary-label {
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.3px;
        text-align: center;
      }

      .tl-container {
        padding: 16px 20px 32px;
        background: var(--system-bg);
        min-height: calc(100vh - 180px);
      }
      
      .section-header {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 16px;
        margin-top: 4px;
        padding-left: 4px;
      }

      /* Client Header - visual diferenciado por cliente */
      .tl-client-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        margin-bottom: 12px;
        margin-top: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      .tl-client-header:first-child {
        margin-top: 0;
      }
      .tl-client-avatar {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 700;
        flex-shrink: 0;
        letter-spacing: 0.5px;
      }
      .tl-client-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .tl-client-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .tl-client-count {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 1px;
      }
      .tl-client-badge {
        font-size: 13px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .timeline { position: relative; }
      .tl-item { display: flex; gap: 0; position: relative; margin-bottom: 0; }
      .tl-left { display: flex; flex-direction: column; align-items: center; width: 36px; flex-shrink: 0; }
      .tl-dot-wrap { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0; position: relative; z-index: 2; }
      .tl-dot { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid var(--separator); background: var(--surface-bg); display: flex; align-items: center; justify-content: center; }
      .tl-dot.active { width: 22px; height: 22px; border: 3px solid #1a1a1a; background: #1a1a1a; }
      .tl-dot.done { border-color: #1D9E75; background: #1D9E75; }
      .tl-dot.warn { border-color: #E9830A; background: #E9830A; }
      .tl-dot.inactive { border-color: var(--separator); background: var(--surface-bg); }
      .tl-line { width: 2px; flex: 1; min-height: 24px; background: var(--separator); position: relative; z-index: 1; }
      .tl-line.solid { background: #1a1a1a; }
      .tl-line.green { background: #1D9E75; }
      .tl-line.dashed { background: repeating-linear-gradient(to bottom, var(--separator) 0px, var(--separator) 5px, transparent 5px, transparent 10px); }
      .tl-content { flex: 1; padding: 2px 0 28px 16px; }
      
      /* Use clamp for responsive font sizes (mobile -> desktop) */
      .tl-title { font-size: clamp(16px, 4vw, 18px); font-weight: 600; color: var(--text-primary); line-height: 1.3; }
      .tl-title.muted { color: var(--text-tertiary); font-weight: 400; }
      .tl-desc { font-size: clamp(13px, 3.5vw, 15px); color: var(--text-secondary); margin-top: 4px; line-height: 1.45; }
      .tl-desc.muted { color: var(--text-tertiary); }
      .tl-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
      .tl-time { font-size: clamp(12px, 3.2vw, 14px); color: var(--text-tertiary); font-weight: 500; }
      .tl-loc { display: inline-flex; align-items: center; gap: 4px; font-size: clamp(11px, 3vw, 13px); color: #007AFF; background: rgba(0,122,255,0.08); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-weight: 500; }
      .tl-loc i { font-size: inherit; }
      .tl-badge { display: inline-flex; align-items: center; gap: 4px; font-size: clamp(11px, 3vw, 13px); border-radius: 6px; padding: 4px 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      
      .badge-open { color: #1D9E75; background: rgba(29,158,117,0.10); }
      .badge-closed { color: #E24B4A; background: rgba(226,75,74,0.10); }
      .badge-alert { color: #E9830A; background: rgba(233,131,10,0.10); }
      .tl-dot-inner { width: 6px; height: 6px; border-radius: 50%; background: white; }
      .tl-dot.active .tl-dot-inner { background: white; display: block; width: 8px; height: 8px; }
      
      /* Action Sheet Styles */
      .tl-sheet-content {
        background: #F2F2F7;
        width: 100%;
        max-width: 500px;
        border-radius: 14px;
        padding: 0;
        transform: translateY(120%);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1);
        display: flex;
        flex-direction: column;
        max-height: 70vh;
        margin: 0 16px 8px 16px;
      }
      
      .tl-sheet-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid rgba(60, 60, 67, 0.1);
      }
      
      .tl-sheet-drag {
        display: none; /* Removed for pure iOS HIG look */
      }
      
      .tl-sheet-title {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
        color: #8E8E93;
      }
      
      .tl-sheet-body {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        background: #FFFFFF;
        border-radius: 0 0 14px 14px;
      }
      
      .tl-sheet-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
        font-size: 17px;
        font-weight: 400;
        color: #007AFF;
        border-bottom: 1px solid rgba(60, 60, 67, 0.1);
        cursor: pointer;
      }
      .tl-sheet-option:last-child {
        border-bottom: none;
      }
      .tl-sheet-option:active {
        background: #E5E5EA;
      }
      .tl-sheet-option i {
        margin-left: auto;
      }

      .tl-sheet-cancel-wrapper {
        width: 100%;
        max-width: 500px;
        padding: 0 16px 16px 16px;
        transform: translateY(120%);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1);
      }
      
      .tl-sheet-cancel {
        width: 100%;
        padding: 16px;
        border-radius: 14px;
        background: #FFFFFF;
        border: none;
        color: #007AFF;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
      }
      .tl-sheet-cancel:active {
        background: #E5E5EA;
      }
      
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(0, 122, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
      }
    `;
    document.head.appendChild(style);
  }
};
