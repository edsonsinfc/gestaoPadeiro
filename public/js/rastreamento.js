/**
 * Rastreamento Component - BRAGO Sistema Padeiro
 * Admin real-time map dashboard
 */
window.Rastreamento = {
  map: null,
  markers: {},
  trailLayers: L.featureGroup(),
  selectedUserId: null,
  socket: null,

  async render() {
    const container = document.getElementById('page-container');
    
    // Fetch all active padeiros to populate select dropdown
    let padeiros = [];
    try {
      padeiros = await API.get('/api/padeiros');
    } catch (e) {
      console.error('Erro ao buscar padeiros:', e);
    }

    container.innerHTML = `
      <style>
        @media (max-width: 430px) {
          #tracking-map { height: 400px !important; }
          .tracking-header h2 { font-size: 24px; }
          .tracking-list-card { margin-top: 16px !important; }
          .trail-controls { flex-direction: column; align-items: stretch !important; gap: 8px; }
        }
        .trail-controls {
          background: var(--bg-card);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-md);
          margin-bottom: 20px;
          border: 1px solid var(--separator);
          flex-wrap: wrap;
        }
        .trail-user-picker, .trail-date-picker, .trail-time-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trail-user-picker select, .trail-date-picker input, .trail-time-picker input {
          border: 1px solid var(--separator);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          background: var(--bg-card);
          color: var(--text-main);
          min-width: 120px;
        }
        .trail-user-picker select {
          min-width: 180px;
        }
        .trail-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--primary);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }
        .trail-btn:hover { background: var(--primary-dark); }
        .trail-btn.secondary { background: var(--bg-input); color: var(--text-secondary); }
        .trail-btn.secondary:hover { background: #e5e7eb; }
        .trail-btn i { width: 16px; height: 16px; }
        
        .map-popup-btn {
          margin-top: 10px;
          width: 100%;
          background: var(--primary);
          color: white;
          border: none;
          padding: 6px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>
      <div class="rastreamento-page fade-in">
        <div class="tracking-header mb-6">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-secondary desktop-only">Monitore a localização da sua equipe e consulte o histórico de trajetos</p>
            </div>
            <div id="tracking-status" class="status-badge connected">
              <span class="status-dot"></span> <span>Servidor Conectado</span>
            </div>
          </div>
        </div>

        <div id="trail-controls-container">
          <div class="trail-controls">
            <div class="trail-user-picker">
              <label class="label-uppercase">Padeiro:</label>
              <select id="trail-user-select" onchange="Rastreamento.onUserSelectChange(this.value)">
                <option value="">Selecione um padeiro...</option>
                ${padeiros.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
              </select>
            </div>
            <div class="trail-date-picker">
              <label class="label-uppercase">Data:</label>
              <input type="date" id="trail-date" value="${new Date().toISOString().split('T')[0]}" onchange="Rastreamento.onDateChange()">
            </div>
            <div class="trail-time-picker">
              <label class="label-uppercase">Início:</label>
              <input type="time" id="trail-start-time" value="00:00" onchange="Rastreamento.onTimeChange()">
            </div>
            <div class="trail-time-picker">
              <label class="label-uppercase">Fim:</label>
              <input type="time" id="trail-end-time" value="23:59" onchange="Rastreamento.onTimeChange()">
            </div>
            <div class="flex gap-2">
              <button class="trail-btn" id="btn-load-trail" onclick="Rastreamento.loadTrail()">
                <i data-lucide="map-pin"></i> Carregar Trajeto
              </button>
              <button class="trail-btn secondary" onclick="Rastreamento.clearTrail()">
                <i data-lucide="x"></i> Limpar
              </button>
            </div>
            <div id="trail-info" style="margin-left: auto; font-size: 13px; color: var(--text-secondary);"></div>
          </div>
        </div>

        <div class="map-card">
          <div id="tracking-map" style="height: 600px; width: 100%; border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-lg);"></div>
        </div>

        <div class="tracking-list-card mt-6">
          <h3 class="mb-4">Padeiros Ativos</h3>
          <div id="active-track-list" class="track-list">
            <p class="text-tertiary">Aguardando sinais de localização...</p>
          </div>
        </div>
      </div>
    `;

    this.initMap();
    this.initSocket();
  },

  initMap() {
    // Default view: Center of Brazil or Filial location
    this.map = L.map('tracking-map').setView([-23.5505, -46.6333], 13); // Default SP

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.trailLayers.addTo(this.map);
  },

  initSocket() {
    if (this.socket) this.socket.disconnect();
    
    this.socket = io({ transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      const statusEl = document.getElementById('tracking-status');
      if (statusEl) {
        statusEl.className = 'status-badge connected';
        statusEl.innerHTML = '<span class="status-dot"></span> <span>Servidor Conectado</span>';
      }
    });

    this.socket.on('disconnect', () => {
      const statusEl = document.getElementById('tracking-status');
      if (statusEl) {
        statusEl.className = 'status-badge disconnected';
        statusEl.innerHTML = '<span class="status-dot"></span> <span>Desconectado</span>';
      }
    });

    this.socket.on('location-broadcast', (locations) => {
      const user = API.getUser();
      let filtered = locations;
      
      if (user.role === 'gestor' && user.filial) {
        // Filter: only show bakers from the manager's branch
        filtered = locations.filter(loc => loc.filial === user.filial);
      }
      
      this.updateMarkers(filtered);
      this.updateList(filtered);
    });
  },

  updateMarkers(locations) {
    locations.forEach(loc => {
      const { userId, userName, coords, lastUpdate } = loc;
      
      if (this.markers[userId]) {
        // Update existing marker
        this.markers[userId].setLatLng([coords.lat, coords.lng]);
      } else {
        // Create new marker
        const marker = L.marker([coords.lat, coords.lng]).addTo(this.map);
        marker.bindPopup(`
          <div class="map-popup">
            <strong>${userName}</strong><br>
            <span>Último sinal: ${new Date(lastUpdate).toLocaleTimeString()}</span><br>
            <small>Precisão: ${Math.round(coords.accuracy)}m</small>
            <button class="map-popup-btn" onclick="Rastreamento.selectUserForTrail('${userId}')">Ver Trajeto do Dia</button>
          </div>
        `);
        this.markers[userId] = marker;
      }
    });

    // Auto-zoom to fit markers if it's the first update
    const group = new L.featureGroup(Object.values(this.markers));
    if (locations.length > 0) {
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  },

  updateList(locations) {
    const list = document.getElementById('active-track-list');
    if (!list) return;

    if (locations.length === 0) {
      list.innerHTML = '<p class="text-tertiary">Nenhum padeiro online no momento.</p>';
      return;
    }

    list.innerHTML = locations.map(loc => `
      <div class="track-item card-click" onclick="Rastreamento.focusPadeiro('${loc.userId}')">
        <div class="track-info">
          <div class="avatar">${loc.userName[0].toUpperCase()}</div>
          <div>
            <div class="font-bold">${loc.userName}</div>
            <div class="text-xs text-tertiary">Visto às ${new Date(loc.lastUpdate).toLocaleTimeString()}</div>
          </div>
        </div>
        <div class="track-action">
          <i data-lucide="crosshair"></i>
        </div>
      </div>
    `).join('');
    
    lucide.createIcons();
  },

  focusPadeiro(userId) {
    const marker = this.markers[userId];
    if (marker) {
      this.map.setView(marker.getLatLng(), 16);
      marker.openPopup();
    }
  },

  onUserSelectChange(userId) {
    this.selectedUserId = userId || null;
    if (userId) {
      this.loadTrail();
    } else {
      this.clearTrail();
    }
  },

  onDateChange() {
    if (this.selectedUserId) {
      this.loadTrail();
    }
  },

  onTimeChange() {
    if (this.selectedUserId) {
      this.loadTrail();
    }
  },

  selectUserForTrail(userId) {
    this.selectedUserId = userId;
    
    // Set default date and times
    const dateInput = document.getElementById('trail-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    const startInput = document.getElementById('trail-start-time');
    if (startInput) startInput.value = '00:00';
    
    const endInput = document.getElementById('trail-end-time');
    if (endInput) endInput.value = '23:59';
    
    // Update the dropdown value to select this user
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl) selectEl.value = userId;
    
    this.loadTrail();
    this.map.closePopup();
  },

  async loadTrail() {
    // Dynamically grab selected user ID from dropdown if not set or just keep in sync
    const selectEl = document.getElementById('trail-user-select');
    if (selectEl && selectEl.value) {
      this.selectedUserId = selectEl.value;
    }

    if (!this.selectedUserId) {
      Components.toast('Selecione um padeiro para carregar o trajeto', 'info');
      return;
    }
    const dateInput = document.getElementById('trail-date');
    const date = dateInput ? dateInput.value : '';
    if (!date) {
      Components.toast('Selecione uma data para o trajeto', 'info');
      return;
    }

    const infoEl = document.getElementById('trail-info');
    if (infoEl) infoEl.innerHTML = 'Carregando trajeto...';

    try {
      const data = await API.get(`/api/tracking/trail/${this.selectedUserId}?date=${date}`);
      this.clearTrail();

      if (!data.sessions || data.sessions.length === 0) {
        Components.toast('Nenhum trajeto registrado para este dia', 'info');
        if (infoEl) infoEl.innerHTML = 'Sem dados para esta data.';
        return;
      }

      // Filter points based on selected start and end time
      const startTimeInput = document.getElementById('trail-start-time');
      const endTimeInput = document.getElementById('trail-end-time');
      const startTimeVal = startTimeInput ? startTimeInput.value : '00:00';
      const endTimeVal = endTimeInput ? endTimeInput.value : '23:59';

      const [startH, startM] = startTimeVal.split(':').map(Number);
      const [endH, endM] = endTimeVal.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      const filteredSessions = data.sessions.map(session => {
        const filteredPoints = session.points.filter(p => {
          const dateObj = new Date(p.timestamp);
          const localH = dateObj.getHours();
          const localM = dateObj.getMinutes();
          const pointMinutes = localH * 60 + localM;
          return pointMinutes >= startMinutes && pointMinutes <= endMinutes;
        });
        return {
          ...session,
          points: filteredPoints
        };
      }).filter(session => session.points.length > 0);

      if (filteredSessions.length === 0) {
        Components.toast('Nenhum ponto registrado neste intervalo de horário', 'info');
        if (infoEl) infoEl.innerHTML = 'Sem dados no horário selecionado.';
        return;
      }

      const colors = ['#1E4BFF', '#E8450A', '#10B981', '#F59E0B', '#EF4444'];
      let sessionIndex = 0;

      filteredSessions.forEach(session => {
        const color = colors[sessionIndex % colors.length];
        const latlngs = session.points.map(p => [p.lat, p.lng]);
        
        // Polyline for the session
        const polyline = L.polyline(latlngs, {
          color: color,
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(this.trailLayers);

        // Start marker
        const start = session.points[0];
        L.circleMarker([start.lat, start.lng], {
          radius: 8,
          fillColor: '#10B981',
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.trailLayers).bindPopup(`<b>Início da Sessão</b><br>${new Date(start.timestamp).toLocaleTimeString()}`);

        // End marker
        const end = session.points[session.points.length - 1];
        L.circleMarker([end.lat, end.lng], {
          radius: 8,
          fillColor: '#EF4444',
          color: '#fff',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.trailLayers).bindPopup(`<b>Fim da Sessão</b><br>${new Date(end.timestamp).toLocaleTimeString()}`);

        // Intermediate points (clickable)
        if (session.points.length > 2) {
          session.points.slice(1, -1).forEach(p => {
            L.circleMarker([p.lat, p.lng], {
              radius: 4,
              fillColor: color,
              color: '#fff',
              weight: 1,
              fillOpacity: 0.5
            }).addTo(this.trailLayers).bindPopup(`Passou por aqui às ${new Date(p.timestamp).toLocaleTimeString()}`);
          });
        }

        sessionIndex++;
      });

      let totalFilteredPoints = filteredSessions.reduce((acc, s) => acc + s.points.length, 0);
      if (infoEl) infoEl.innerHTML = `${totalFilteredPoints} pontos em ${filteredSessions.length} sessões.`;
      
      // Fit bounds to trail
      this.map.fitBounds(this.trailLayers.getBounds().pad(0.1));
      
    } catch (error) {
      console.error('Erro ao carregar trajeto:', error);
      Components.toast('Erro ao carregar trajeto', 'error');
      if (infoEl) infoEl.innerHTML = 'Erro ao carregar.';
    }
  },

  clearTrail() {
    this.trailLayers.clearLayers();
    const infoEl = document.getElementById('trail-info');
    if (infoEl) infoEl.innerHTML = '';
  }
};
