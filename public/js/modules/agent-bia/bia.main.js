/**
 * BIA AGENT - PONTO DE ENTRADA (BOOTSTRAPPER)
 * SmartGestor - Brago Distribuidora
 */

const BiaAgent = {
  version: '1.0.0',
  initialized: false,

  init() {
    if (this.initialized) return;

    // Verificar se o usuário tem perfil de Gestão ou Administrador
    const isManagementRole = (user) => {
      if (!user || !user.role) return false;
      const managementRoles = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'];
      return managementRoles.includes(user.role);
    };

    // Verificar se o usuário está logado e se é gestor/admin
    const checkAndMount = () => {
      const user = (typeof API !== 'undefined' && API.getUser && API.getUser());
      const triggerBtn = document.getElementById('bia-trigger-btn');
      const isAllowed = isManagementRole(user);

      if (isAllowed) {
        // Apenas Gestor e Admin: garante montagem e visibilidade
        if (!triggerBtn) {
          BiaUI.init();
        } else {
          triggerBtn.style.display = 'flex';
        }
      } else {
        // Padeiros, outros perfis e tela de login: esconde completamente
        if (triggerBtn) {
          triggerBtn.style.display = 'none';
        }
        if (typeof BiaUI !== 'undefined' && BiaUI.isOpen) {
          BiaUI.closeModal();
        }
      }
    };

    // Montar ao carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndMount);
    } else {
      checkAndMount();
    }

    // Monitorar transições de rota SPA
    window.addEventListener('popstate', checkAndMount);
    
    // Interceptar App.navigate se existir para atualizar visibilidade
    if (typeof App !== 'undefined' && App.navigate) {
      const origNavigate = App.navigate.bind(App);
      App.navigate = function(route, data, push) {
        origNavigate(route, data, push);
        setTimeout(checkAndMount, 100);
      };
    }

    this.initialized = true;
    console.log('🤖 [BIA AGENT] Inicializada com sucesso no SmartGestor.');
  },

  open() {
    const user = (typeof API !== 'undefined' && API.getUser && API.getUser());
    const isAllowed = user && ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
    if (isAllowed && typeof BiaUI !== 'undefined') {
      BiaUI.openModal();
    }
  },

  close() {
    if (typeof BiaUI !== 'undefined') {
      BiaUI.closeModal();
    }
  }
};

// Auto-inicializar ao carregar o script
if (typeof window !== 'undefined') {
  window.BiaAgent = BiaAgent;
  BiaAgent.init();
}
