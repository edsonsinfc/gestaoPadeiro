/**
 * ARQUIVO: escala.state.js
 * MÓDULO: Escala de Atendimento — Vendedor
 * RESPONSABILIDADE: Estado global e dados do módulo
 * DEPENDE DE: nada
 * USADO EM: escala.cards.js, escala.main.js
 */

const EscalaState = {
  // Dados carregados da API
  clients: [],
  activities: [],
  padeiros: [],
  avaliacoes: [],
  cronogramas: [],

  // Clientes filtrados pelo JWT do vendedor
  filteredClients: [],

  // Estado interno
  _loaded: false,

  /**
   * Limpa o estado antes de uma nova renderização
   */
  reset() {
    this.clients = [];
    this.activities = [];
    this.padeiros = [];
    this.avaliacoes = [];
    this.cronogramas = [];
    this.filteredClients = [];
    this._loaded = false;
  },

  /**
   * Retorna estatísticas agregadas de um cliente:
   * - totalKg        — kg total produzido
   * - totalVisitas   — nº de atividades finalizadas
   * - mediaNota      — média das avaliações (tipo 'cliente') ou null
   * - ultimasFotos   — array com até 5 URLs das fotos mais recentes
   * - padeirosList   — lista de padeiros únicos que atenderam o cliente
   */
  getClientStats(clientId) {
    const clientActivities = this.activities.filter(a => a.clienteId === clientId && a.status === 'finalizada');

    // Kg total produzido
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);

    // Total de visitas
    const totalVisitas = clientActivities.length;

    // Avaliações do tipo 'cliente' para atividades deste cliente
    const clientActivityIds = clientActivities.map(a => a.id || a._id);
    const clientEvals = this.avaliacoes.filter(e =>
      e.tipo === 'cliente' && clientActivityIds.includes(e.atividadeId)
    );
    const mediaNota = clientEvals.length > 0
      ? clientEvals.reduce((sum, e) => sum + (parseFloat(e.nota || e.estrelas || 0)), 0) / clientEvals.length
      : null;

    // Últimas fotos (máx 5), das atividades mais recentes — filtra offline
    const ultimasFotos = [];
    const sortedActs = [...clientActivities].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    for (const act of sortedActs) {
      if (act.fotos && Array.isArray(act.fotos)) {
        const validFotos = act.fotos.filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
        for (const foto of validFotos) {
          if (ultimasFotos.length < 5) {
            const absUrl = foto.path.startsWith('http') ? foto.path : `${API_BASE_URL}${foto.path.replace('/uploads/', '/storage/')}`;
            ultimasFotos.push(absUrl);
          }
        }
      }
      if (ultimasFotos.length >= 5) break;
    }

    // Padeiros únicos que atenderam este cliente (máx 3 para exibir em pills)
    const padeiroIds = [...new Set(clientActivities.map(a => a.padeiroId).filter(Boolean))];
    const padeirosList = padeiroIds
      .slice(0, 3)
      .map(pid => {
        const p = this.padeiros.find(pad => (pad.id || pad._id) === pid);
        return p ? { id: p.id || p._id, nome: p.nome || p.name } : null;
      })
      .filter(Boolean);

    return { totalKg, totalVisitas, mediaNota, ultimasFotos, padeirosList };
  }
};

