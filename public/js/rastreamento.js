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
        }
        .trail-date-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .trail-date-picker input {
          border: 1px solid var(--separator);
          border-radius: var(--radius-sm);
          padding: 6px 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
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
              <p class="text-secondary desktop-only">Monitore a localização da sua equipe em tempo real</p>
            </div>
            <div id="tracking-status" class="status-badge connected">
              <span class="status-dot"></span> <span>Servidor Conectado</span>
            </div>
          </div>
        </div>

        <div id="trail-controls-container" style="display: none;">
          <div class="trail-controls">
            <div class="trail-date-picker">
              <label class="label-uppercase">Data:</label>
              <input type="date" id="trail-date" value="${new Date().toISOString().split('T')[0]}">
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

  selectUserForTrail(userId) {
    this.selectedUserId = userId;
    const controls = document.getElementById('trail-controls-container');
    if (controls) controls.style.display = 'block';
    
    // Set default date to today
    const dateInput = document.getElementById('trail-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    
    this.loadTrail();
    this.map.closePopup();
  },

  async loadTrail() {
    if (!this.selectedUserId) return;
    const date = document.getElementById('trail-date').value;
    if (!date) return;

    const loader = Components.loading();
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

      const colors = ['#1E4BFF', '#E8450A', '#10B981', '#F59E0B', '#EF4444'];
      let sessionIndex = 0;

      data.sessions.forEach(session => {
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

      if (infoEl) infoEl.innerHTML = `${data.totalPoints} pontos em ${data.sessions.length} sessões.`;
      
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
