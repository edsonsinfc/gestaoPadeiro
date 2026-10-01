/**
 * Calculadora de Gastos - Main Module Entry Point
 * BRAGO Distribuidora - Perfil Vendedor
 */

var VendedorCalculadora = window.VendedorCalculadora = {
  async render() {
    const container = document.getElementById('page-container');
    if (!container) return;
    
    // Mostra indicador de carregamento
    container.innerHTML = Components.loading();
    
    try {
      // 1. Buscar catálogo de produtos para obter preços de venda oficiais
      const productsList = await API.get('/api/produtos').catch(() => []);
      
      // 2. Obter ID do cliente se o vendedor tiver um cliente em atendimento no contexto
      // O SmartGestor geralmente persiste o ID do cliente selecionado no localStorage ou em cookies/sessoes
      let clienteId = localStorage.getItem('vendedor_current_cliente_id') || null;
      
      // 3. Injetar contêiner limpo
      container.innerHTML = '<div id="calculadora-vendedor-root"></div>';
      
      // 4. Delegar renderização para a View do módulo
      await CalculadoraView.render('calculadora-vendedor-root', productsList, clienteId);
      
    } catch (error) {
      console.error('❌ Erro ao renderizar Calculadora de Gastos:', error);
      container.innerHTML = Components.empty('alert-circle', 
        `Erro ao carregar a Calculadora de Gastos. <br><small>${error.message}</small>`);
    }
  }
};

// Vincula ao escopo global para que o App.js (roteador SPA) consiga renderizar na navegação
window.VendedorCalculadora = VendedorCalculadora;
