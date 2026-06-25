/**
 * Auditoria Controller - BRAGO Sistema Padeiro
 * Endpoints para consultar logs de auditoria e métricas de compliance
 */
const { AuditLog, Padeiro, Atividade } = require('../data/db-adapter');
const { pool } = require('../data/db-adapter');

const AuditoriaController = {
  /**
   * GET /api/auditoria/logs
   * Lista logs de login com filtros e paginação
   */
  async getLogs(req, res) {
    try {
      const { dataInicio, dataFim, userId, filial, action, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let where = 'WHERE 1=1';
      const values = [];

      if (dataInicio) {
        where += ' AND `timestamp` >= ?';
        values.push(`${dataInicio}T00:00:00.000Z`);
      }
      if (dataFim) {
        where += ' AND `timestamp` <= ?';
        values.push(`${dataFim}T23:59:59.999Z`);
      }
      if (userId) {
        where += ' AND `userId` = ?';
        values.push(userId);
      }
      if (filial) {
        where += ' AND `filial` = ?';
        values.push(filial);
      }
      if (action) {
        where += ' AND `action` = ?';
        values.push(action);
      }

      // Filter by filial if user is not admin
      if (req.user.role !== 'admin' && req.user.role !== 'master_gestor' && req.user.filial) {
        const filiaisArray = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
        where += ` AND \`filial\` IN (${filiaisArray.map(() => '?').join(',')})`;
        values.push(...filiaisArray);
      }

      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM audit_logs ${where}`,
        values
      );
      const total = countResult[0].total;

      const [rows] = await pool.execute(
        `SELECT * FROM audit_logs ${where} ORDER BY \`timestamp\` DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`,
        values
      );

      res.json({
        logs: rows,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      });
    } catch (error) {
      console.error('[AUDITORIA] Erro ao buscar logs:', error);
      res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  },

  /**
   * GET /api/auditoria/dashboard
   * Dados agregados para o dashboard de compliance
   */
  async getDashboard(req, res) {
    try {
      const { periodo = 30, data } = req.query;
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - parseInt(periodo));
      const dataInicio = diasAtras.toISOString();

      // Build filial filter
      let filialFilter = '';
      let filialFilterAtiv = '';
      const filialValues = [];
      if (req.user.role !== 'admin' && req.user.role !== 'master_gestor' && req.user.filial) {
        const filiaisArray = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
        filialFilter = ` AND \`filial\` IN (${filiaisArray.map(() => '?').join(',')})`;
        filialValues.push(...filiaisArray);
      }

      // Data de referência (permite consultar dias passados)
      const dataRef = data || new Date().toISOString().split('T')[0];

      // 1. Logins na data de referência
      const [loginsHojeResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM audit_logs WHERE \`action\` IN ('login', 'login_google') AND \`timestamp\` >= ? AND \`timestamp\` <= ?${filialFilter}`,
        [`${dataRef}T00:00:00.000Z`, `${dataRef}T23:59:59.999Z`, ...filialValues]
      );
      const loginsHoje = loginsHojeResult[0].total;

      // 2. Logins por dia (últimos N dias)
      const [loginsPorDia] = await pool.execute(
        `SELECT SUBSTRING(\`timestamp\`, 1, 10) as dia, COUNT(*) as total 
         FROM audit_logs 
         WHERE \`action\` IN ('login', 'login_google') AND \`timestamp\` >= ?${filialFilter}
         GROUP BY dia ORDER BY dia`,
        [dataInicio, ...filialValues]
      );

      // 3. Atividades por dia (últimos N dias)
      let atividadeFilialFilter = '';
      if (filialValues.length > 0) {
        // Need to filter atividades by padeiros of the filial
        const [padeirosFilial] = await pool.execute(
          `SELECT id FROM padeiros WHERE \`filial\` IN (${filialValues.map(() => '?').join(',')}) AND deletado != 1`,
          filialValues
        );
        const pIds = padeirosFilial.map(p => p.id);
        if (pIds.length > 0) {
          atividadeFilialFilter = ` AND \`padeiroId\` IN (${pIds.map(() => '?').join(',')})`;
          filialFilterAtiv = pIds;
        }
      }

      // Use the date N days ago
      const dataInicioDate = diasAtras.toISOString().split('T')[0];
      const [atividadesPorDia] = await pool.execute(
        `SELECT \`data\` as dia, COUNT(*) as total 
         FROM atividades 
         WHERE \`status\` = 'finalizada' AND \`data\` >= ?${filialFilterAtiv.length ? ` AND \`padeiroId\` IN (${filialFilterAtiv.map(() => '?').join(',')})` : ''}
         GROUP BY dia ORDER BY dia`,
        [dataInicioDate, ...(filialFilterAtiv.length ? filialFilterAtiv : [])]
      );

      // 4. Total padeiros ativos
      const [padeirosResult] = await pool.execute(
        `SELECT id, nome, filial FROM padeiros WHERE ativo = 1 AND deletado != 1${filialFilter}`,
        filialValues
      );
      const totalPadeiros = padeirosResult.length;

      // 5. Padeiros que logaram na data de referência
      const [padeirosLogHoje] = await pool.execute(
        `SELECT DISTINCT userId FROM audit_logs 
         WHERE \`action\` IN ('login', 'login_google') 
         AND \`userRole\` = 'padeiro'
         AND \`timestamp\` >= ? AND \`timestamp\` <= ?${filialFilter}`,
        [`${dataRef}T00:00:00.000Z`, `${dataRef}T23:59:59.999Z`, ...filialValues]
      );
      const padeirosQueLogaramHoje = new Set(padeirosLogHoje.map(r => String(r.userId)));

      // 6. Padeiros que registraram atividade na data de referência
      const [atividadesHoje] = await pool.execute(
        `SELECT DISTINCT padeiroId FROM atividades WHERE \`data\` = ? AND \`status\` = 'finalizada'`,
        [dataRef]
      );
      const padeirosComAtividadeHoje = new Set(atividadesHoje.map(r => String(r.padeiroId)));

      // 7. Calcular métricas
      const padeirosInativos = padeirosResult.filter(p => !padeirosQueLogaramHoje.has(String(p.id)));
      const logaramSemProduzir = padeirosResult.filter(p => 
        padeirosQueLogaramHoje.has(String(p.id)) && !padeirosComAtividadeHoje.has(String(p.id))
      );

      // 8. Ranking de logins nos últimos N dias (por padeiro)
      const [rankingLogins] = await pool.execute(
        `SELECT userId, userName, \`filial\`, COUNT(*) as totalLogins,
                MAX(\`timestamp\`) as ultimoLogin
         FROM audit_logs 
         WHERE \`action\` IN ('login', 'login_google') 
         AND \`userRole\` = 'padeiro'
         AND \`timestamp\` >= ?${filialFilter}
         GROUP BY userId, userName, \`filial\`
         ORDER BY totalLogins DESC`,
        [dataInicio, ...filialValues]
      );

      // 9. Padeiros sem nenhum login no período
      const padeirosComLogin = new Set(rankingLogins.map(r => String(r.userId)));
      const padeirosSemLogin = padeirosResult.filter(p => !padeirosComLogin.has(String(p.id)));

      // 10. Status de cada padeiro hoje
      const statusPadeiros = padeirosResult.map(p => {
        const logou = padeirosQueLogaramHoje.has(String(p.id));
        const produziu = padeirosComAtividadeHoje.has(String(p.id));
        const rankInfo = rankingLogins.find(r => String(r.userId) === String(p.id));
        
        let status = 'inativo'; // 🔴
        if (logou && produziu) status = 'ativo'; // 🟢
        else if (logou && !produziu) status = 'logou_sem_produzir'; // 🟡

        return {
          id: p.id,
          nome: p.nome,
          filial: p.filial,
          status,
          logouHoje: logou,
          produziuHoje: produziu,
          totalLogins: rankInfo ? rankInfo.totalLogins : 0,
          ultimoLogin: rankInfo ? rankInfo.ultimoLogin : null
        };
      });

      // 11. Total atividades no período
      const [totalAtividadesResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM atividades 
         WHERE \`status\` = 'finalizada' AND \`data\` >= ?${filialFilterAtiv.length ? ` AND \`padeiroId\` IN (${filialFilterAtiv.map(() => '?').join(',')})` : ''}`,
        [dataInicioDate, ...(filialFilterAtiv.length ? filialFilterAtiv : [])]
      );

      // 12. Falhas de login no período
      const [falhasResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM audit_logs WHERE \`action\` = 'login_failed' AND \`timestamp\` >= ?${filialFilter}`,
        [dataInicio, ...filialValues]
      );

      res.json({
        dataRef,
        hoje: {
          loginsHoje,
          totalPadeiros,
          padeirosInativos: padeirosInativos.length,
          logaramSemProduzir: logaramSemProduzir.length,
          padeirosComAtividade: padeirosComAtividadeHoje.size
        },
        periodo: {
          dias: parseInt(periodo),
          loginsPorDia,
          atividadesPorDia,
          totalAtividades: totalAtividadesResult[0].total,
          falhasLogin: falhasResult[0].total,
          padeirosSemLogin: padeirosSemLogin.map(p => ({ id: p.id, nome: p.nome, filial: p.filial }))
        },
        statusPadeiros,
        rankingLogins
      });
    } catch (error) {
      console.error('[AUDITORIA] Erro ao gerar dashboard:', error);
      res.status(500).json({ error: 'Erro ao gerar dashboard de auditoria' });
    }
  },

  /**
   * GET /api/auditoria/padeiro/:id
   * Histórico detalhado de um padeiro
   */
  async getPadeiroDetail(req, res) {
    try {
      const { id } = req.params;
      const { periodo = 30 } = req.query;
      const diasAtras = new Date();
      diasAtras.setDate(diasAtras.getDate() - parseInt(periodo));

      // Info do padeiro
      const padeiro = await Padeiro.findById(id);
      if (!padeiro) return res.status(404).json({ error: 'Padeiro não encontrado' });

      // Logins do padeiro
      const [logins] = await pool.execute(
        `SELECT * FROM audit_logs WHERE userId = ? AND \`timestamp\` >= ? ORDER BY \`timestamp\` DESC LIMIT 100`,
        [id, diasAtras.toISOString()]
      );

      // Atividades do padeiro
      const dataInicioDate = diasAtras.toISOString().split('T')[0];
      const [atividades] = await pool.execute(
        `SELECT id, clienteNome, produtoNome, \`data\`, kgTotal, \`status\`, inicioEm, terminadoEm FROM atividades 
         WHERE padeiroId = ? AND \`data\` >= ? ORDER BY \`data\` DESC`,
        [id, dataInicioDate]
      );

      // Logins por dia
      const [loginsPorDia] = await pool.execute(
        `SELECT SUBSTRING(\`timestamp\`, 1, 10) as dia, COUNT(*) as total 
         FROM audit_logs 
         WHERE userId = ? AND \`action\` IN ('login', 'login_google') AND \`timestamp\` >= ?
         GROUP BY dia ORDER BY dia`,
        [id, diasAtras.toISOString()]
      );

      // Atividades por dia
      const [atividadesPorDia] = await pool.execute(
        `SELECT \`data\` as dia, COUNT(*) as total 
         FROM atividades 
         WHERE padeiroId = ? AND \`status\` = 'finalizada' AND \`data\` >= ?
         GROUP BY dia ORDER BY dia`,
        [id, dataInicioDate]
      );

      // Dias em que logou mas não produziu
      const loginDays = new Set(loginsPorDia.map(l => l.dia));
      const atividadeDays = new Set(atividadesPorDia.map(a => a.dia));
      const diasLogouSemProduzir = [...loginDays].filter(d => !atividadeDays.has(d));

      res.json({
        padeiro: { id: padeiro.id, nome: padeiro.nome, filial: padeiro.filial, cargo: padeiro.cargo },
        logins,
        atividades,
        loginsPorDia,
        atividadesPorDia,
        diasLogouSemProduzir,
        resumo: {
          totalLogins: logins.filter(l => l.action !== 'login_failed').length,
          totalAtividades: atividades.filter(a => a.status === 'finalizada').length,
          diasComLogin: loginDays.size,
          diasComAtividade: atividadeDays.size,
          diasLogouSemProduzir: diasLogouSemProduzir.length
        }
      });
    } catch (error) {
      console.error('[AUDITORIA] Erro ao buscar detalhes do padeiro:', error);
      res.status(500).json({ error: 'Erro ao buscar detalhes de auditoria do padeiro' });
    }
  }
};

module.exports = AuditoriaController;
