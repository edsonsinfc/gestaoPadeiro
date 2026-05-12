/**
 * ARQUIVO: cronograma.js (Módulo Principal)
 * CATEGORIA: Cronograma › Estado inicial
 * RESPONSABILIDADE: Define o estado e as constantes do módulo
 * DEPENDE DE: nada
 * USADO EM: todos os outros arquivos do cronograma
 */

const Cronograma = {
  currentView: 'semanal',
  weekOffset: 0,
  tarefas: [],
  padeiros: [],
  clientes: [],
  metas: [],
  atividades: [],
  draggedTaskId: null,
  selectedMdAction: 'mover',
  expandedBakers: new Set(),
  diasSemana: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  diasKeys: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
};
