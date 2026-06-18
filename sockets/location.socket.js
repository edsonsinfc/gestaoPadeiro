const { Localizacao, HistoricoLocalizacao, TimelineEvent } = require('../data/db-adapter');

let ioInstance = null;
const activeLocations = new Map();

async function initLocationSocket(io) {
  ioInstance = io;
  
  // Load last known locations from DB
  try {
    const savedLocations = await Localizacao.find();
    savedLocations.forEach(loc => {
      activeLocations.set(loc.userId, {
        userId: loc.userId,
        userName: loc.userName,
        filial: loc.filial,
        coords: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy },
        lastUpdate: loc.lastUpdate,
        fromHistory: true
      });
    });
    console.log(`📍 Carregadas ${activeLocations.size} localizações salvas do banco.`);
  } catch (e) {
    console.error("Erro ao carregar localizações do banco:", e);
  }

  io.on('connection', (socket) => {
    console.log(`📡 Novo cliente conectado: ${socket.id}`);
    
    if (activeLocations.size > 0) {
      socket.emit('location-broadcast', Array.from(activeLocations.values()));
    }

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
      
      io.emit('location-broadcast', Array.from(activeLocations.values()));
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
    ioInstance.emit('location-broadcast', Array.from(activeLocations.values()));
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
    ioInstance.emit('location-broadcast', Array.from(activeLocations.values()));
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
