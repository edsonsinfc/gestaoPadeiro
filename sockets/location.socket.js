const { Localizacao } = require('../data/db-adapter');

async function initLocationSocket(io) {
  const activeLocations = new Map();
  
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
      } catch (e) {
        console.error("Erro ao salvar localização no banco:", e);
      }
      
      io.emit('location-broadcast', Array.from(activeLocations.values()));
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = { initLocationSocket };
