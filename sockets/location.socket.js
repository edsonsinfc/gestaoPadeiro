const { Localizacao, HistoricoLocalizacao, TimelineEvent } = require('../data/db-adapter');

let ioInstance = null;
const activeLocations = new Map();

const TEN_MINUTES_MS = 10 * 60 * 1000;

function pruneStaleLocations() {
  const cutoff = Date.now() - TEN_MINUTES_MS;
  for (const [userId, loc] of activeLocations.entries()) {
    const time = loc.lastUpdate ? new Date(loc.lastUpdate).getTime() : 0;
    if (isNaN(time) || time < cutoff) {
      activeLocations.delete(userId);
    }
  }
}

function getActiveLocationsList() {
  pruneStaleLocations();
  return Array.from(activeLocations.values());
}

async function initLocationSocket(io) {
  ioInstance = io;
  
  // Load ONLY recent active locations (< 10 min) from DB at startup
  try {
    const tenMinAgoStr = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    const savedLocations = await Localizacao.find();
    savedLocations.forEach(loc => {
      if (loc.lastUpdate && loc.lastUpdate >= tenMinAgoStr) {
        activeLocations.set(loc.userId, {
          userId: loc.userId,
          userName: loc.userName,
          filial: loc.filial,
          coords: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy },
          lastUpdate: loc.lastUpdate,
          fromHistory: true
        });
      }
    });
    console.log(`📍 Carregadas ${activeLocations.size} localizações ativas recentes (<10 min) do banco.`);
  } catch (e) {
    console.error("Erro ao carregar localizações do banco:", e);
  }

  // Periodic pruning of stale locations every 60s
  setInterval(() => {
    const beforeCount = activeLocations.size;
    pruneStaleLocations();
    if (activeLocations.size !== beforeCount && ioInstance) {
      ioInstance.emit('location-broadcast', Array.from(activeLocations.values()));
    }
  }, 60 * 1000);

  io.on('connection', (socket) => {
    console.log(`📡 Novo cliente conectado: ${socket.id}`);
    
    // Always emit current fresh active locations (empty array if no one is online)
    socket.emit('location-broadcast', getActiveLocationsList());

    socket.on('update-location', async (data) => {
      if (!data.userId) return;
      
      const locationData = {
        ...data,
        lastUpdate: new Date().toISOString(),
        socketId: socket.id
      };
      
      activeLocations.set(data.userId, locationData);
      
      try {
        await Localizacao.findByIdAndUpdate(data.userId, {
          id: data.userId,
          userId: data.userId,
          userName: data.userName,
          filial: data.filial,
          lat: data.coords.lat,
          lng: data.coords.lng,
          accuracy: data.coords.accuracy,
          lastUpdate: locationData.lastUpdate
        }, { upsert: true });

        // Persist in history
        await HistoricoLocalizacao.create({
          userId: data.userId,
          userName: data.userName,
          lat: data.coords.lat,
          lng: data.coords.lng,
          accuracy: data.coords.accuracy,
          timestamp: locationData.lastUpdate
        });
       } catch (e) {
        console.error("Erro ao salvar localização no banco:", e);
      }
      
      io.emit('location-broadcast', getActiveLocationsList());
    });

    socket.on('timeline-event', async (data) => {
      try {
        await TimelineEvent.create({
          padeiroId: data.userId,
          padeiroNome: data.userName,
          action: data.action,
          lat: data.coords ? data.coords.lat : null,
          lng: data.coords ? data.coords.lng : null,
          accuracy: data.coords ? data.coords.accuracy : null,
          source: data.source,
          timestamp: data.timestamp,
          clienteId: data.clienteId || null,
          clienteNome: data.clienteNome || null
        });
      } catch (e) {
        console.error("Erro ao salvar timeline event:", e);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
      let changed = false;
      for (const [userId, loc] of activeLocations.entries()) {
        if (loc.socketId === socket.id) {
          activeLocations.delete(userId);
          changed = true;
          break;
        }
      }
      if (changed && ioInstance) {
        ioInstance.emit('location-broadcast', getActiveLocationsList());
      }
    });
  });
}

function clearActiveLocations() {
  activeLocations.clear();
  if (ioInstance) {
    ioInstance.emit('location-broadcast', []);
  }
}

async function updateActiveLocation(data) {
  if (!data.userId) return;

  const locationData = {
    ...data,
    lastUpdate: new Date().toISOString()
  };

  activeLocations.set(data.userId, locationData);

  try {
    await Localizacao.findByIdAndUpdate(data.userId, {
      id: data.userId,
      userId: data.userId,
      userName: data.userName,
      filial: data.filial,
      lat: data.coords.lat,
      lng: data.coords.lng,
      accuracy: data.coords.accuracy,
      lastUpdate: locationData.lastUpdate
    }, { upsert: true });

    // Persist in history
    await HistoricoLocalizacao.create({
      userId: data.userId,
      userName: data.userName,
      lat: data.coords.lat,
      lng: data.coords.lng,
      accuracy: data.coords.accuracy,
      timestamp: locationData.lastUpdate
    });
  } catch (e) {
    console.error("Erro ao salvar localização via HTTP no banco:", e);
  }

  if (ioInstance) {
    ioInstance.emit('location-broadcast', getActiveLocationsList());
  }
}

async function syncActiveLocation(data) {
  if (!data.userId || !data.points || data.points.length === 0) return;

  const latest = data.points[data.points.length - 1];
  const locationData = {
    userId: data.userId,
    userName: data.userName,
    filial: data.filial,
    coords: {
      lat: Number(latest.lat),
      lng: Number(latest.lng),
      accuracy: typeof latest.accuracy !== 'undefined' ? Number(latest.accuracy) : null
    },
    lastUpdate: latest.timestamp
  };

  activeLocations.set(data.userId, locationData);

  if (ioInstance) {
    ioInstance.emit('location-broadcast', getActiveLocationsList());
    ioInstance.emit('location-broadcast-single', {
      userId: data.userId,
      userName: data.userName,
      filial: data.filial,
      coords: locationData.coords,
      lastUpdate: locationData.lastUpdate,
      newPoints: data.points
    });
  }
}

module.exports = { 
  initLocationSocket, 
  clearActiveLocations, 
  updateActiveLocation, 
  syncActiveLocation,
  getIo: () => ioInstance 
};
