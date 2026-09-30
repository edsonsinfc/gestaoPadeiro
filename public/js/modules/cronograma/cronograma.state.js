/**
 * ARQUIVO: cronograma.state.js
 * CATEGORIA: Cronograma › Estado inicial
 * RESPONSABILIDADE: Define o estado e as constantes do módulo
 * DEPENDE DE: nada
 * USADO EM: todos os outros arquivos do cronograma
 */

const Cronograma = {
  currentView: 'semanal',
  currentMonthlySubView: 'monthly',
  weekOffset: 0,
  tarefas: [],
  padeiros: [],
  clientes: [],
  metas: [],
  atividades: [],
  users: [],
  draggedTaskId: null,
  selectedMdAction: 'mover',
  expandedBakers: new Set(),
  diasSemana: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  diasKeys: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],

  /**
   * Retorna o nome curto do padeiro para exibição.
   * Se dois ou mais padeiros compartilham o mesmo primeiro nome (ex: Ana Laura e Ana Joana),
   * exibe os dois primeiros nomes para evitar ambiguidade. Caso contrário, exibe apenas o primeiro.
   * @param {string} nomeCompleto - Nome completo do padeiro
   * @returns {string} Nome para exibição
   */
  getDisplayName(nomeCompleto) {
    if (!nomeCompleto) return '—';
    const parts = nomeCompleto.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0];

    const prepositions = ['de', 'da', 'do', 'dos', 'das'];
    if (prepositions.includes(parts[1].toLowerCase()) && parts.length > 2) {
      return parts.slice(0, 3).join(' ');
    }
    return parts.slice(0, 2).join(' ');
  },
};
