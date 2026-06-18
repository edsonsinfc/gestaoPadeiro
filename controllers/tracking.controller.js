/**
 * Tracking Controller - BRAGO Sistema Padeiro
 * Manages user location history and trails
 */
const { HistoricoLocalizacao, Localizacao } = require('../data/db-adapter');

const TrackingController = {
  /**
   * Get trail for a user on a specific date
   * GET /api/tracking/trail/:userId?date=YYYY-MM-DD
   */
  async getTrail(req, res) {
    try {
      const { userId } = req.params;
      const { date } = req.query; // YYYY-MM-DD

      if (!userId || !date) {
        return res.status(400).json({ error: 'userId e date são obrigatórios' });
      }

      // Query for the specific day
      // Assuming timestamp is ISO string "YYYY-MM-DDTHH:mm:ss.sssZ"
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const points = await HistoricoLocalizacao.find({
        userId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ timestamp: 1 });

      if (!points || points.length === 0) {
        return res.json({ sessions: [], totalPoints: 0 });
      }

      // Group points into sessions (break if > 15 minutes gap)
      const sessions = [];
      let currentSession = [];
      const SESSION_GAP_MS = 15 * 60 * 1000;

      points.forEach((point, index) => {
        if (index === 0) {
          currentSession.push(point);
        } else {
          const prevPoint = points[index - 1];
          const prevTime = new Date(prevPoint.timestamp).getTime();
          const currTime = new Date(point.timestamp).getTime();

          if (currTime - prevTime > SESSION_GAP_MS) {
            // Start new session
            sessions.push(currentSession);
            currentSession = [point];
          } else {
            currentSession.push(point);
          }
        }
      });

      if (currentSession.length > 0) {
        sessions.push(currentSession);
      }

      res.json({
        userId,
        date,
        totalPoints: points.length,
        sessions: sessions.map(s => ({
          startTime: s[0].timestamp,
          endTime: s[s.length - 1].timestamp,
          points: s
        }))
      });
    } catch (error) {
      console.error('Error fetching trail:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico de trajeto' });
    }
  },

  /**
   * Reset all tracking data
   * DELETE /api/tracking/reset/all
   */
  async resetAllTracking(req, res) {
    try {
      // Strictly restrict to 'admin' profile as requested
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem resetar o rastreamento.' });
      }

      // Clear DB tables
      const resHistory = await HistoricoLocalizacao.deleteMany({});
      const resCurrent = await Localizacao.deleteMany({});

      // Clear memory Map and broadcast empty state to all clients
      const { clearActiveLocations } = require('../sockets/location.socket');
      clearActiveLocations();

      res.json({
        success: true,
        message: 'Histórico de rastreamento e localizações atuais foram resetados com sucesso.',
        details: {
          historicoDeletado: resHistory.deletedCount || 0,
          localizacoesDeletadas: resCurrent.deletedCount || 0
        }
      });
    } catch (error) {
      console.error('Error resetting tracking:', error);
      res.status(500).json({ error: 'Erro ao resetar histórico de rastreamento' });
    }
  },

  /**
   * Reset tracking data for a specific user
   * DELETE /api/tracking/trail/:userId?date=YYYY-MM-DD
   */
  async resetUserTracking(req, res) {
    try {
      const { userId } = req.params;
      const { date } = req.query; // YYYY-MM-DD (optional)

      if (!userId) {
        return res.status(400).json({ error: 'userId é obrigatório' });
      }

      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem resetar o rastreamento.' });
      }

      let query = { userId };
      if (date) {
        const startOfDay = `${date}T00:00:00.000Z`;
        const endOfDay = `${date}T23:59:59.999Z`;
        query.timestamp = { $gte: startOfDay, $lte: endOfDay };
      }

      const resHistory = await HistoricoLocalizacao.deleteMany(query);

      // If resetting everything or today's date, also delete current last known location
      const todayStr = new Date().toISOString().split('T')[0];
      let currentDeleted = 0;
      if (!date || date === todayStr) {
        const resCurrent = await Localizacao.deleteMany({ userId });
        currentDeleted = resCurrent.deletedCount || 0;
      }

      res.json({
        success: true,
        message: `Histórico de rastreamento do padeiro foi resetado com sucesso.`,
        details: {
          historicoDeletado: resHistory.deletedCount || 0,
          localizacaoAtualDeletada: currentDeleted
        }
      });
    } catch (error) {
      console.error('Error resetting user tracking:', error);
      res.status(500).json({ error: 'Erro ao resetar histórico de rastreamento do padeiro' });
    }
  },

  /**
   * Update location from HTTP request (used primarily as background fallback)
   * POST /api/tracking/update
   */
  async updateLocation(req, res) {
    try {
      const { coords, source } = req.body;
      const user = req.user; // populated by authMiddleware

      if (!coords || typeof coords.lat === 'undefined' || typeof coords.lng === 'undefined') {
        return res.status(400).json({ error: 'coords.lat e coords.lng são obrigatórios' });
      }

      const { updateActiveLocation } = require('../sockets/location.socket');
      
      await updateActiveLocation({
        userId: user.id,
        userName: user.nome,
        filial: user.filial,
        coords: {
          lat: Number(coords.lat),
          lng: Number(coords.lng),
          accuracy: typeof coords.accuracy !== 'undefined' ? Number(coords.accuracy) : null
        },
        source: source || 'http-fallback'
      });

      res.json({ success: true, message: 'Localização atualizada com sucesso' });
    } catch (error) {
      console.error('Error updating location via HTTP:', error);
      res.status(500).json({ error: 'Erro ao atualizar localização' });
    }
  }
};

module.exports = TrackingController;
