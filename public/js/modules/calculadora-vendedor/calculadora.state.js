/**
 * Calculadora de Gastos - State Manager
 * BRAGO Distribuidora - Perfil Vendedor
 */

const CalculadoraState = {
  // Lista de receitas padrão baseadas na planilha e nos receituários validados
  receitas: [
    {
      id: 'brioche_c20',
      nome: 'Pão Brioche Premium (C20)',
      produtoPrincipal: 'LE PAIN BRIOCHE C20 SACO 15KG',
      codigoProduto: '15434',
      baseIngrediente: 'Mistura Brioche IREKS', // O ingrediente principal serve de base (100%)
      quebraPadrao: 10, // 10% de perda no forno
      rendimentoPadrao: 9, // 9 unidades padrão
      ingredientes: [
        { nome: 'LE PAIN BRIOCHE C20 (IREKS)', proporcao: 100, isIreks: true, codigo: '15434' },
        { nome: 'Ovos (gelados)', proporcao: 30, isIreks: false },
        { nome: 'Margarina (80% lipídios)', proporcao: 15, isIreks: false },
        { nome: 'Fermento fresco', proporcao: 6, isIreks: false },
        { nome: 'Água (gelada)', proporcao: 15, isIreks: false }
      ]
    },
    {
      id: 'forma_d10',
      nome: 'Pão de Forma Tradicional (D10)',
      produtoPrincipal: 'PAO DE FORMA D10 SACO 10KG',
      codigoProduto: '16267',
      baseIngrediente: 'Farinha de Trigo', // A farinha serve de base (100%)
      quebraPadrao: 10,
      rendimentoPadrao: 10,
      ingredientes: [
        { nome: 'Farinha de Trigo', proporcao: 100, isIreks: false },
        { nome: 'PAO DE FORMA D10 (IREKS)', proporcao: 10, isIreks: true, codigo: '16267' },
        { nome: 'Açúcar', proporcao: 17, isIreks: false },
        { nome: 'Sal', proporcao: 1.6, isIreks: false },
        { nome: 'Ovo', proporcao: 5, isIreks: false },
        { nome: 'Margarina', proporcao: 2.5, isIreks: false },
        { nome: 'Fermento fresco', proporcao: 7.5, isIreks: false },
        { nome: 'Água (gelada)', proporcao: 45, isIreks: false },
        { nome: 'Melhorador/Ideal Frost', proporcao: 0.25, isIreks: false }
      ]
    },
    {
      id: 'batata_c50',
      nome: 'Pão de Batata Especial (C50)',
      produtoPrincipal: 'PAO DE BATATA ESPECIAL C50 SACO 5KG',
      codigoProduto: '7298',
      baseIngrediente: 'Farinha de Trigo',
      quebraPadrao: 10,
      rendimentoPadrao: 20,
      ingredientes: [
        { nome: 'Farinha de Trigo', proporcao: 100, isIreks: false },
        { nome: 'PAO DE BATATA ESPECIAL C50 (IREKS)', proporcao: 100, isIreks: true, codigo: '7298' },
        { nome: 'Gordura/Óleo', proporcao: 12.5, isIreks: false },
        { nome: 'Fermento fresco', proporcao: 4.5, isIreks: false },
        { nome: 'Água (gelada)', proporcao: 125, isIreks: false }
      ]
    },
    {
      id: 'top_macio_c50',
      nome: 'Pão Top Macio Massa Doces',
      produtoPrincipal: 'TOP MACIO MASSA DOCE SACO 5KG',
      codigoProduto: '9627',
      baseIngrediente: 'Farinha de Trigo',
      quebraPadrao: 10,
      rendimentoPadrao: 15,
      ingredientes: [
        { nome: 'Farinha de Trigo', proporcao: 100, isIreks: false },
        { nome: 'TOP MACIO MASSA DOCE (IREKS)', proporcao: 100, isIreks: true, codigo: '9627' },
        { nome: 'Fermento fresco', proporcao: 3.2, isIreks: false },
        { nome: 'Água (gelada)', proporcao: 80, isIreks: false }
      ]
    }
  ],

  // Preços sugeridos padrão dos insumos genéricos (R$/kg)
  precosPadraoInsumos: {
    'Farinha de Trigo': 2.90,
    'Ovos (gelados)': 8.50,
    'Ovo': 8.50,
    'Margarina (80% lipídios)': 7.50,
    'Margarina': 7.50,
    'Fermento fresco': 14.00,
    'Fermento': 14.00,
    'Água (gelada)': 0.00,
    'Açúcar': 3.80,
    'Sal': 1.20,
    'Gordura/Óleo': 8.20,
    'Melhorador/Ideal Frost': 65.10
  },

  // Estado ativo da calculadora
  selectedReceitaId: 'brioche_c20',
  quantidadeBaseInput: 2000, // em gramas
  markup: 150, // em %
  rendimentoInput: null, // dinâmico
  precosEditados: {}, // precos por nome do insumo específicos da sessão

  // Inicializa o estado com base no cliente ativo
  async init(clienteId = null) {
    this.precosEditados = {};
    
    // Tenta carregar preços específicos salvos para este cliente
    if (clienteId) {
      const savedPrecos = localStorage.getItem(`brago_calc_precos_${clienteId}`);
      if (savedPrecos) {
        try {
          this.precosEditados = JSON.parse(savedPrecos);
        } catch (e) {
          console.error('Erro ao ler preços do localStorage:', e);
        }
      }
    }
    
    // Inicializa o rendimento correspondente à receita padrão selecionada
    const receita = this.getReceitaAtiva();
    this.rendimentoInput = receita ? receita.rendimentoPadrao : 10;
  },

  getReceitaAtiva() {
    return this.receitas.find(r => r.id === this.selectedReceitaId) || this.receitas[0];
  },

  // Retorna o preço atualizado de um insumo (mesclando padrão e editado)
  getPrecoInsumo(nome, precoProdutoDb = null) {
    // Se o vendedor editou o preço nesta sessão, tem prioridade
    if (this.precosEditados[nome] !== undefined) {
      return this.precosEditados[nome];
    }
    
    // Se for um produto IREKS e tivermos o preço de tabela do banco de dados, usamos ele
    if (precoProdutoDb !== null) {
      return precoProdutoDb;
    }
    
    // Caso contrário, busca na tabela padrão
    return this.precosPadraoInsumos[nome] !== undefined ? this.precosPadraoInsumos[nome] : 0.0;
  },

  // Salva o preço do insumo na sessão
  setPrecoInsumo(nome, valor, clienteId = null) {
    this.precosEditados[nome] = parseFloat(valor) || 0.0;
    
    if (clienteId) {
      localStorage.setItem(`brago_calc_precos_${clienteId}`, JSON.stringify(this.precosEditados));
    }
  },

  // Reseta os preços editados para voltar ao padrão
  resetPrecos(clienteId = null) {
    this.precosEditados = {};
    if (clienteId) {
      localStorage.removeItem(`brago_calc_precos_${clienteId}`);
    }
  }
};

// Tornar global no escopo da janela do browser
window.CalculadoraState = CalculadoraState;
