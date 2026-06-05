/**
 * Location Service - BRAGO Sistema Padeiro
 * Captures GPS and sends to server via Socket.io
 * Includes IP-based fallback for non-secure contexts (HTTP on LAN)
 */
const LocationService = {
  socket: null,
  watchId: null,
  ipFallbackInterval: null,
  wakeLock: null,
  updateInterval: 10000, // 10 seconds
  lastSent: 0,

  async init(user) {
    if (!user || user.role !== 'padeiro') return;

    // Proteção contra inicialização dupla
    if (this.socket && this.socket.connected) {
      console.log('📡 LocationService já inicializado, ignorando re-init.');
      return;
    }

    console.log('📡 Inicializando rastreamento GPS para:', user.nome);
    this.requestWakeLock();

    // Connect to socket
    this.socket = io({ transports: ['websocket', 'polling'] });

    // Check if we are in a secure context (HTTPS or localhost)
    if (window.isSecureContext) {
      this._startGPSTracking(user);
    } else {
      console.warn('⚠️ Contexto não-seguro detectado (HTTP em rede local). GPS nativo indisponível.');
      console.info('💡 Dica: Acesse via http://localhost:3000 ou configure HTTPS.');
      // Show a non-blocking toast to the padeiro
      if (typeof Components !== 'undefined' && Components.toast) {
        Components.toast('GPS indisponível via HTTP. Usando localização aproximada por IP.', 'info', 6000);
      }
      // Use IP-based geolocation as fallback
      this._startIPFallback(user);
    }
  },

  /** Native GPS tracking (secure contexts only) */
  _startGPSTracking(user) {
    if (!navigator.geolocation) {
      console.warn('Geolocation API not supported by this browser.');
      if (typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Seu navegador não suporta geolocalização.', 'error');
      }
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos, user),
      (err) => {
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            console.error('❌ Permissão de localização negada pelo usuário.');
            if (typeof Components !== 'undefined' && Components.toast) {
              Components.toast('Permissão de localização negada. Ative nas configurações do navegador.', 'error', 8000);
            }
            break;
          case 2: // POSITION_UNAVAILABLE
            console.error('❌ Localização indisponível.');
            break;
          case 3: // TIMEOUT
            console.warn('⏱️ Timeout ao obter localização GPS.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  },

  /** IP-based fallback for non-secure contexts */
  _startIPFallback(user) {
    const fetchIPLocation = async () => {
      try {
        const now = Date.now();
        if (now - this.lastSent < this.updateInterval) return;

        // Free IP geolocation API (no key required, ~city-level accuracy)
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('IP geolocation request failed');
        const geo = await res.json();

        if (geo.latitude && geo.longitude) {
          const data = {
            userId: user.id,
            userName: user.nome,
            filial: user.filial,
            coords: {
              lat: geo.latitude,
              lng: geo.longitude,
              accuracy: 5000 // ~5km city-level accuracy marker
            },
            source: 'ip-fallback'
          };

          if (this.socket && this.socket.connected) {
            this.socket.emit('update-location', data);
            this.lastSent = now;
            console.log('📍 Localização (IP) enviada:', data.coords.lat, data.coords.lng);
          }
        }
      } catch (e) {
        console.warn('⚠️ Falha no fallback de localização por IP:', e.message);
      }
    };

    // Send immediately, then repeat
    fetchIPLocation();
    this.ipFallbackInterval = setInterval(fetchIPLocation, Math.max(this.updateInterval, 30000));
  },

  handlePosition(position, user) {
    const now = Date.now();
    if (now - this.lastSent < this.updateInterval) return;

    const data = {
      userId: user.id,
      userName: user.nome,
      filial: user.filial,
      coords: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      },
      source: 'gps'
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('update-location', data);
      this.lastSent = now;
      console.log('📍 Localização (GPS) enviada:', data.coords.lat, data.coords.lng);
    }
  },

  stop() {
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    if (this.ipFallbackInterval) clearInterval(this.ipFallbackInterval);
    if (this.socket) this.socket.disconnect();
    this.releaseWakeLock();
  },

  /** Tenta manter a tela do dispositivo ligada para evitar que o navegador hiberne e mate o GPS em Stand-By */
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('🔋 Wake Lock ativado (Prevenção de Stand By ligada).');
        this.wakeLock.addEventListener('release', () => {
          console.log('🔋 Wake Lock liberado.');
        });
      } catch (err) {
        console.warn('⚠️ Falha ao ativar Wake Lock:', err.name, err.message);
      }
    }
  },

  releaseWakeLock() {
    if (this.wakeLock !== null) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
      });
    }
  },

  /** 
   * Captura uma localização exata no momento de uma ação e envia para a Timeline 
   * Retorna os dados capturados para uso no componente se necessário.
   */
  async captureAction(actionName, extraData = {}) {
    const user = API.getUser();
    if (!user) return null;

    const eventData = {
      userId: user.id,
      userName: user.nome,
      action: actionName,
      timestamp: new Date().toISOString(),
      source: 'gps',
      ...extraData,
      coords: null
    };

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          timeout: 15000, 
          enableHighAccuracy: true, // Use true for GPS hardware
          maximumAge: 60000 // Accept 1 minute old cache to speed up
        });
      });
      eventData.coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      };
      console.log(`📍 Ação Capturada com GPS: ${actionName}`, eventData.coords);
    } catch (e) {
      console.warn(`⚠️ GPS nativo falhou para '${actionName}'. Tentando fallback por IP...`);
      // Fallback: localização por IP (funciona em HTTP)
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const geo = await res.json();
          if (geo.latitude && geo.longitude) {
            eventData.coords = {
              lat: geo.latitude,
              lng: geo.longitude,
              accuracy: 5000
            };
            eventData.source = 'ip-fallback';
            console.log(`📍 Ação capturada com IP fallback: ${actionName}`, eventData.coords);
          }
        }
      } catch (ipErr) {
        console.warn('⚠️ Fallback por IP também falhou:', ipErr.message);
        eventData.source = 'error_or_fallback';
      }
    }

    if (this.socket && this.socket.connected) {
      this.socket.emit('timeline-event', eventData);
    } else {
      // Fallback: envia via HTTP se socket não estiver conectado
      // Isso evita perda silenciosa de eventos
      console.warn('⚠️ Socket não conectado, enviando timeline-event via HTTP fallback');
      try {
        await fetch('/api/timeline-events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API.token}`
          },
          body: JSON.stringify(eventData)
        });
      } catch (httpErr) {
        console.error('❌ Falha no fallback HTTP para timeline-event:', httpErr);
      }
    }
    
    return eventData;
  }
};
