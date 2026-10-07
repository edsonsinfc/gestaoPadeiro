/**
 * MÓDULO BIA AUTÔNOMA - SERVIÇO DE METAS MENSAIS POR PADEIRO
 * SmartGestor - Brago Distribuidora
 * 
 * Permite que a Bia calcule e cadastre autonomamente metas mensais
 * de produção (Kg) para cada padeiro com base no histórico real,
 * sazonalidade e capacidade da filial.
 */

const { Meta, Padeiro, Atividade } = require('../../data/db-adapter');

class MetasAutonomasService {
  /**
   * Obtém o período padrão no formato YYYY-MM
   * @param {string} [periodoAlvo] - Ex: "2026-10"
   * @returns {string}
   */
  static normalizarPeriodo(periodoAlvo) {
    if (periodoAlvo && /^\d{4}-\d{2}$/.test(periodoAlvo.trim())) {
      return periodoAlvo.trim();
    }
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Identifica nome por extenso do mês para visualização corporativa
   */
  static getNomeMes(periodoIso) {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [ano, mes] = (periodoIso || '').split('-');
    const idx = parseInt(mes, 10) - 1;
    if (idx >= 0 && idx < 12) {
      return `${meses[idx]} de ${ano}`;
    }
    return periodoIso;
  }

  /**
   * Calcula o número de dias úteis (segunda a sábado) do mês
   */
  static getDiasUteisMes(ano, mes) {
    const totalDias = new Date(ano, mes, 0).getDate();
    let diasUteis = 0;
    for (let d = 1; d <= totalDias; d++) {
      const data = new Date(ano, mes - 1, d);
      const diaSemana = data.getDay();
      if (diaSemana !== 0) { // Não conta domingo (Brago opera de seg a sab)
        diasUteis++;
      }
    }
    return Math.max(diasUteis, 24);
  }

  /**
   * Calcula e cadastra autonomamente as metas de todos os padeiros para o mês especificado
   * 
   * @param {Object} params
   * @param {string} [params.periodo] - Mês alvo (ex: "2026-10")
   * @param {Object} params.usuarioSolicitante - Dados de req.user (id, role, filial)
   * @param {boolean} [params.apenasSimulacao=false] - Se true, não grava no banco (preview)
   * @param {number} [params.fatorEvolucao=1.06] - Desafio de evolução percentual (+6%)
   * @returns {Promise<Object>} Relatório consolidado da execução autônoma
   */
  static async processarMetasMensais({
    periodo,
    usuarioSolicitante = {},
    apenasSimulacao = false,
    fatorEvolucao = 1.06
  }) {
    const periodoFinal = this.normalizarPeriodo(periodo);
    const [anoStr, mesStr] = periodoFinal.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const diasUteisMes = this.getDiasUteisMes(ano, mes);

    // 1. Validar permissões de acesso
    const role = usuarioSolicitante.role || 'gestor';
    const isMasterOrAdmin = role === 'admin' || role === 'master_gestor';

    // 2. Filtrar padeiros de acordo com a filial autorizada
    const queryPadeiros = {
      ativo: true,
      deletado: { $ne: true }
    };

    if (!isMasterOrAdmin && usuarioSolicitante.filial && usuarioSolicitante.filial !== 'null') {
      const filiaisUser = Array.isArray(usuarioSolicitante.filial) 
        ? usuarioSolicitante.filial 
        : [usuarioSolicitante.filial];
      queryPadeiros.filial = { $in: filiaisUser };
    }

    const [todosPadeiros, todasAtividades, metasExistentes] = await Promise.all([
      Padeiro.find(queryPadeiros),
      Atividade.find({ status: 'finalizada' }),
      Meta.find({ periodo: periodoFinal })
    ]);

    // Expurga contas de teste
    const padeirosAtivos = (todosPadeiros || []).filter(p => {
      const pNome = (p.nome || '').toLowerCase();
      if (pNome.includes('teste') || p.codTec === '971914') return false;
      return true;
    });

    if (padeirosAtivos.length === 0) {
      return {
        sucesso: false,
        mensagem: 'Nenhum padeiro ativo elegível encontrado para definição autônoma de metas.',
        periodo: periodoFinal,
        metas: []
      };
    }

    // 3. Mapear histórico de produção dos últimos 60 dias para cálculo ponderado
    const hojeMs = Date.now();
    const sessentaDiasMs = 60 * 24 * 60 * 60 * 1000;
    const producaoPorPadeiro = {};
    const diasComProducaoPorPadeiro = {};

    (todasAtividades || []).forEach(a => {
      if (!a.padeiroId || !a.data) return;
      const dataAtivMs = new Date(a.data).getTime();
      // Considera atividades dos últimos 60 dias
      if (hojeMs - dataAtivMs <= sessentaDiasMs) {
        const kg = (parseFloat(a.kgTotal) || 0) + (parseFloat(a.lTotal) || 0);
        if (kg > 0) {
          producaoPorPadeiro[a.padeiroId] = (producaoPorPadeiro[a.padeiroId] || 0) + kg;
          if (!diasComProducaoPorPadeiro[a.padeiroId]) {
            diasComProducaoPorPadeiro[a.padeiroId] = new Set();
          }
          diasComProducaoPorPadeiro[a.padeiroId].add(a.data);
        }
      }
    });

    // Calcular média da filial para novos técnicos ou sem histórico
    let totalKgFilial = 0;
    let totalPadeirosComHistorico = 0;
    padeirosAtivos.forEach(p => {
      const kg = producaoPorPadeiro[p.id] || 0;
      if (kg > 0) {
        totalKgFilial += kg;
        totalPadeirosComHistorico++;
      }
    });

    const mediaHistoricaFilial60d = totalPadeirosComHistorico > 0 
      ? totalKgFilial / totalPadeirosComHistorico 
      : 3000;
    const mediaMensalBaseFilial = Math.max(mediaHistoricaFilial60d / 2, 2200);

    // 4. Calcular e estruturar a meta mensal de cada padeiro
    const metasCalculadas = [];
    let somaMetaKgTotal = 0;
    let novasMetasCount = 0;
    let metasAtualizadasCount = 0;

    for (const padeiro of padeirosAtivos) {
      const kg60d = producaoPorPadeiro[padeiro.id] || 0;
      const diasTrabalhados = diasComProducaoPorPadeiro[padeiro.id]?.size || 0;

      let metaKgSugerida = 0;
      let justificativa = '';

      if (kg60d > 0 && diasTrabalhados >= 5) {
        // Padeiro experiente com histórico consistente:
        // Média de produção diária projetada para os dias úteis do mês + fator de evolução
        const mediaDiaria = kg60d / diasTrabalhados;
        const projecaoMensal = mediaDiaria * diasUteisMes;
        metaKgSugerida = Math.round((projecaoMensal * fatorEvolucao) / 50) * 50; // Arredonda em blocos de 50 kg
        justificativa = `Baseado na média de ${mediaDiaria.toFixed(1)} kg/dia com desafio de +${Math.round((fatorEvolucao - 1) * 100)}% para ${diasUteisMes} dias úteis.`;
      } else {
        // Padeiro novo ou sem histórico nos últimos 60 dias:
        // Aplica média da filial ou piso técnico operacional
        metaKgSugerida = Math.round((mediaMensalBaseFilial * 0.95) / 50) * 50;
        justificativa = `Meta base da filial (${padeiro.filial || 'Geral'}) para técnico em consolidação de rota.`;
      }

      // Garantir piso mínimo razoável (1.500 kg/mês para evitar metas irrealistas)
      metaKgSugerida = Math.max(metaKgSugerida, 1500);

      const metaExistente = (metasExistentes || []).find(m => String(m.padeiroId) === String(padeiro.id));
      const idMeta = metaExistente ? (metaExistente.id || metaExistente._id) : `meta_autonoma_${padeiro.id}_${periodoFinal.replace('-', '_')}`;

      const metaPayload = {
        id: idMeta,
        padeiroId: padeiro.id,
        padeiroNome: padeiro.nome,
        metaKg: metaKgSugerida,
        periodo: periodoFinal,
        tipo: 'mensal',
        observacao: `Meta mensal gerada autonomamente pela Bia IA (${justificativa})`,
        criadoPor: usuarioSolicitante.id ? `Bia Autônoma (${usuarioSolicitante.nome || 'Diretoria'})` : 'Bia IA Autônoma',
        criadoEm: metaExistente?.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };

      if (!apenasSimulacao) {
        if (metaExistente) {
          await Meta.findByIdAndUpdate(metaExistente.id || metaExistente._id, metaPayload, { new: true });
          metasAtualizadasCount++;
        } else {
          await Meta.create(metaPayload);
          novasMetasCount++;
        }
      }

      somaMetaKgTotal += metaKgSugerida;
      metasCalculadas.push({
        padeiroId: padeiro.id,
        padeiroNome: padeiro.nome,
        filial: padeiro.filial || 'Não informada',
        codTec: padeiro.codTec || 'N/A',
        metaKg: metaKgSugerida,
        periodo: periodoFinal,
        isAtualizacao: !!metaExistente,
        justificativa
      });
    }

    return {
      sucesso: true,
      periodo: periodoFinal,
      periodoNome: this.getNomeMes(periodoFinal),
      diasUteisMes,
      totalPadeiros: padeirosAtivos.length,
      novasMetasCount: apenasSimulacao ? padeirosAtivos.length : novasMetasCount,
      metasAtualizadasCount: apenasSimulacao ? 0 : metasAtualizadasCount,
      metaTotalKg: somaMetaKgTotal,
      simulacao: apenasSimulacao,
      geradoPor: usuarioSolicitante.nome || 'Bia IA Autônoma',
      metas: metasCalculadas
    };
  }
}

module.exports = MetasAutonomasService;
