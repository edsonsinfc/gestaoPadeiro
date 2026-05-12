/**
 * Rastreamento Component - BRAGO Sistema Padeiro
 * Admin real-time map dashboard
 */
window.Rastreamento = {
  map: null,
  markers: {},
  socket: null,

  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = `
      <style>
        @media (max-width: 430px) {
          #tracking-map { height: 400px !important; }
          .tracking-header h2 { font-size: 24px; }
          .tracking-list-card { margin-top: 16px !important; }
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

    // Update Lucide icons inside markers later if needed
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
  }
};
