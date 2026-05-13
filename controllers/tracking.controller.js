/**
 * Tracking Controller - BRAGO Sistema Padeiro
 * Manages user location history and trails
 */
const { HistoricoLocalizacao } = require('../data/db-adapter');

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
  }
};

module.exports = TrackingController;
