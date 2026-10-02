// Wrappers resilientes de localStorage para prevenir ReferenceError caso componentes venham de cache antigo
if (typeof window.safeGetLocalStorage !== 'function') {
  window.safeGetLocalStorage = function(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[Storage] Não foi possível ler a chave ${key} do localStorage:`, e);
      return null;
    }
  };
}
if (typeof window.safeSetLocalStorage !== 'function') {
  window.safeSetLocalStorage = function(key, val) {
    try {
      if (val === null || val === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, val);
      }
    } catch (e) {
      console.warn(`[Storage] Não foi possível salvar a chave ${key} no localStorage:`, e);
    }
  };
}
var safeGetLocalStorage = window.safeGetLocalStorage;
var safeSetLocalStorage = window.safeSetLocalStorage;

const App = {
  APP_VERSION: '1.0.0',
  currentRoute: 'login',
  async init() {
    // === PRIORITY 1: Renderizar a tela IMEDIATAMENTE ===
    // Navegação primeiro, IndexedDB e listeners depois
    const user = API.getUser();
    const token = API.token;

    if (user && token) {
      const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
      const isPadeiro = !isManagement && user.role !== 'vendedor';
      const savedRoute = safeGetLocalStorage('currentRoute');
      let initialRoute = savedRoute;
      if (!initialRoute || (isPadeiro && initialRoute === 'padeiro-inicio')) {
        initialRoute = isManagement ? 'admin-dashboard' : (user.role === 'vendedor' ? 'vendedor-clientes' : 'padeiro-atividade');
      }
      history.replaceState({ route: initialRoute, data: {} }, '', '');
      this.navigate(initialRoute, {}, false);
    } else {
      history.replaceState({ route: 'login', data: {} }, '', '');
      this.navigate('login', {}, false);
    }

    // === PRIORITY 2: Inicializações em background (não bloqueia a UI) ===

    // IndexedDB — roda em background, não bloqueia mais a renderização
    OfflineManager.init().catch(e => console.error("Erro ao inicializar OfflineManager:", e));

    // Capacitor appRestoredResult listener
    try {
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        const plugins = window.Capacitor.Plugins || {};
        const CapApp = plugins.App;
        if (CapApp && CapApp.addListener) {
          CapApp.addListener('appRestoredResult', (result) => {
            console.log('[Capacitor] appRestoredResult recebido:', result);
            if (result.pluginId === 'Camera' && result.methodName === 'getPhoto') {
              if (result.success && result.data) {
                window.lastRestoredPhoto = result.data;
                if (window.PadeiroFlow && (window.PadeiroFlow.currentStep === 0 || window.PadeiroFlow.currentStep === 1) && typeof window.PadeiroFlow.handleRestoredPhoto === 'function') {
                  window.PadeiroFlow.handleRestoredPhoto(result.data);
                }
              } else {
                console.warn('[Capacitor] Restored camera result failed or cancelled:', result.error);
              }
            }
          });
        }
      }
    } catch (capErr) {
      console.warn('[Capacitor] Erro ao registrar listener de appRestoredResult:', capErr);
    }

    // Global click listener for ripple effects on buttons
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.btn, .nav-item, .segmented-item');
      if (target) {
        Components.createRipple(e, target);
      }
    });

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.style.display = 'flex';
    });

    window.addEventListener('appinstalled', (evt) => {
      console.log('PWA instalado com sucesso');
      window.deferredPrompt = null;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.style.display = 'none';
    });

    // Add popstate listener for back button navigation
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.route) {
        this.navigate(event.state.route, event.state.data, false);
      }
    });

    // Pre-carregar dados do padeiro em background (sem bloquear)
    if (user && token && user.role === 'padeiro') {
      LocationService.init(user);
      API.get('/api/produtos')
        .then(prods => {
          if (prods && Array.isArray(prods)) {
            OfflineManager.preloadProductPhotos(prods);
          }
        })
        .catch(console.warn);
    }

    // Check if we should display the HIG APK download banner
    this.checkApkBanner();

    // Check for APK updates (for native Capacitor app)
    this.checkApkUpdate();

    // Sincronização instantânea ao retornar ao aplicativo (Foreground / Unminimize / Unlock)
    this.setupForegroundSync();
  },

  setupForegroundSync() {
    const handleResume = () => {
      console.log('⚡ [App Lifecycle] App ativo em primeiro plano. Verificando conexão e agenda...');
      if (typeof LocationService !== 'undefined' && LocationService.socket) {
        if (!LocationService.socket.connected) {
          LocationService.socket.connect();
        }
      }
      if (this.currentRoute === 'padeiro-atividade') {
        if (typeof PadeiroFlow !== 'undefined' && (!PadeiroFlow.activity || !PadeiroFlow.activity.id || PadeiroFlow.currentStep === 0)) {
          console.log('⚡ [App Lifecycle] Re-sincronizando PadeiroFlow imediatamente...');
          PadeiroFlow.render();
        }
      } else if (this.currentRoute === 'padeiro-agenda') {
        if (typeof PadeiroAgenda !== 'undefined' && typeof PadeiroAgenda.render === 'function') {
          PadeiroAgenda.render();
        }
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleResume();
    });

    window.addEventListener('focus', handleResume);

    if (window.Capacitor?.Plugins?.App?.addListener) {
      window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) handleResume();
      });
    }
  },

  navigate(route, data = {}, pushToHistory = true) {
    const pageContainer = document.getElementById('page-container');
    const user = API.getUser();
    
    if (pageContainer && this.currentRoute !== 'login' && route !== 'login' && user) {
      pageContainer.classList.add('page-exit-active');
      setTimeout(() => {
        this.executeNavigation(route, data, pushToHistory);
      }, 180);
    } else {
      this.executeNavigation(route, data, pushToHistory);
    }
  },

  executeNavigation(route, data = {}, pushToHistory = true) {
    this.currentRoute = route;
    this.routeData = data;
    safeSetLocalStorage('currentRoute', route);
    
    // Auto-collapse mobile drawer/sidebar on navigation
    this.closeDrawer();
    document.body.classList.remove('tracking-mobile-subtab-open');
    
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.scrollTop = 0;
    }
    
    if (pushToHistory) {
      if (!history.state || history.state.route !== route) {
        history.pushState({ route, data }, '', '');
      }
    }
    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ Elemento #app não encontrado no DOM!');
      return;
    }

    if (route === 'login') {
      const user = API.getUser();
      if (user && API.token) {
        const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
        this.navigate(isManagement ? 'admin-dashboard' : (user.role === 'vendedor' ? 'vendedor-clientes' : 'padeiro-atividade'));
        return;
      }
      app.innerHTML = Auth.renderLogin();
      Auth.initGoogleLogin();
      return;
    }
    if (route === 'primeiro-acesso') {
      app.innerHTML = Auth.renderSetPassword();
      return;
    }

    const user = API.getUser();
    if (!user) { this.navigate('login'); return; }

    const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);

    const body = document.body;
    if (isManagement) {
      body.classList.add('user-is-management');
      body.classList.remove('user-is-padeiro');
    } else {
      body.classList.add('user-is-padeiro');
      body.classList.remove('user-is-management');
    }

    // Enforce role-based routing
    if (!isManagement) {
      if (user.role === 'vendedor') {
        const allowedVendedorRoutes = ['vendedor-inicio', 'vendedor-clientes', 'vendedor-agendamentos', 'vendedor-escala', 'vendedor-padeiro-perfil', 'vendedor-agendar-atendimento', 'vendedor-cliente-perfil', 'vendedor-sugestoes', 'vendedor-estoque', 'vendedor-calculadora'];
        if (!allowedVendedorRoutes.includes(route)) {
          console.warn(`Acesso negado para a rota ${route} (Vendedor). Redirecionando...`);
          this.navigate('vendedor-clientes');
          return;
        }
      } else {
        const allowedPadeiroRoutes = ['padeiro-inicio', 'padeiro-atividade', 'padeiro-agenda', 'padeiro-estoque'];
        if (!allowedPadeiroRoutes.includes(route)) {
          console.warn(`Acesso negado para a rota ${route} (Padeiro). Redirecionando...`);
          this.navigate('padeiro-atividade');
          return;
        }
      }
    } else {
      const allowedAdminRoutes = ['admin-dashboard', 'filiais', 'cronograma', 'gestao', 'metas', 'avaliacoes', 'rastreamento', 'timeline', 'relatorios', 'auditoria', 'dev'];
      if ((route.startsWith('padeiro-') || route.startsWith('vendedor-')) && !allowedAdminRoutes.includes(route)) {
        // Just in case an admin clicks a mobile link or has it in storage
        this.navigate('admin-dashboard');
        return;
      }
    }

    // Build layout if needed
    const existingLayout = document.querySelector('.app-layout');
    if (!existingLayout) {
      app.innerHTML = `
      <div class="app-layout">
        ${this.renderSidebar(user)}
        <div class="main-content">
          <div id="header-wrapper">
            ${this.renderHeader(route)}
          </div>
          <div class="page-content" id="page-container">${Components.loading()}</div>
        </div>
        ${this.renderBottomNavbar(user)}
      </div>`;
    } else {
      const headerWrapper = document.getElementById('header-wrapper');
      if (headerWrapper) {
        headerWrapper.innerHTML = this.renderHeader(route);
      }
      // Garante que a barra inferior esteja presente caso a tela já tenha layout montado
      const existingBottomNav = document.getElementById('bottom-navbar');
      if (!existingBottomNav) {
        const bottomNavHtml = this.renderBottomNavbar(user);
        if (bottomNavHtml) {
          existingLayout.insertAdjacentHTML('beforeend', bottomNavHtml);
        }
      }
      document.getElementById('page-container').innerHTML = Components.loading();
    }

    // Highlight active nav
    // Highlight active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Update nav indicator (if exists)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
      const indicator = document.getElementById('nav-indicator');
      const activeItem = document.querySelector(`.bottom-nav-item.active`);
      if (indicator && activeItem) {
        const targetLeft = activeItem.offsetLeft + (activeItem.offsetWidth / 2) - 30; // 30 is half of 60px
        const currentLeft = parseFloat(indicator.style.left) || targetLeft;
        
        if (currentLeft !== targetLeft) {
          const distance = Math.abs(targetLeft - currentLeft);
          const movingRight = targetLeft > currentLeft;
          
          indicator.style.transition = 'width 0.2s cubic-bezier(0.25, 1, 0.5, 1), left 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
          
          // Stretch step
          if (movingRight) {
            indicator.style.width = `${distance + 60}px`;
          } else {
            indicator.style.left = `${targetLeft}px`;
            indicator.style.width = `${distance + 60}px`;
          }
          
          // Snap back step
          setTimeout(() => {
            indicator.style.width = '60px';
            if (movingRight) {
              indicator.style.left = `${targetLeft}px`;
            }
          }, 200);
        } else {
          // First render
          indicator.style.transition = 'none';
          indicator.style.width = '60px';
          indicator.style.left = `${targetLeft}px`;
        }
      }
    });
    });

    // Restore sidebar collapsed state on desktop
    const isSidebarCollapsed = safeGetLocalStorage('sidebarCollapsed') === 'true';
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl && isSidebarCollapsed && window.innerWidth >= 1024) {
      sidebarEl.classList.add('collapsed');
    }

    // Render page content
    this.renderPage(route);
  },

  renderSidebar(user) {
    const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
    const initials = (user && user.nome) ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'US';
    
    let adminNav = '';
    if (user.role === 'master_gestor') {
      adminNav = `
        <div class="nav-section-title hig-sidebar-section-label">Principal</div>
        <div class="nav-item hig-sidebar-nav-item" data-route="admin-dashboard" onclick="App.navigate('admin-dashboard')">
          <span class="nav-icon"><i data-lucide="layout-dashboard"></i></span><span class="nav-text">Dashboard</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="filiais" onclick="App.navigate('filiais')">
          <span class="nav-icon"><i data-lucide="map"></i></span><span class="nav-text">Filiais</span>
        </div>
        <div class="nav-section-divider hig-mobile-only"></div>
        <div class="nav-section-title hig-sidebar-section-label">Inteligência</div>
        <div class="nav-item hig-sidebar-nav-item" data-route="rastreamento" onclick="App.navigate('rastreamento')">
          <span class="nav-icon"><i data-lucide="map-pin"></i></span><span class="nav-text">Rastreamento</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="avaliacoes" onclick="App.navigate('avaliacoes')">
          <span class="nav-icon"><i data-lucide="star"></i></span><span class="nav-text">Avaliações</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="timeline" onclick="App.navigate('timeline')">
          <span class="nav-icon"><i data-lucide="clock"></i></span><span class="nav-text">Timeline</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="gestao" onclick="App.navigate('gestao')">
          <span class="nav-icon"><i data-lucide="users"></i></span><span class="nav-text">Gestão</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="metas" onclick="App.navigate('metas')">
          <span class="nav-icon"><i data-lucide="target"></i></span><span class="nav-text">Metas</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="relatorios" onclick="App.navigate('relatorios')">
          <span class="nav-icon"><i data-lucide="bar-chart-2"></i></span><span class="nav-text">Relatórios</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="auditoria" onclick="App.navigate('auditoria')">
          <span class="nav-icon"><i data-lucide="shield-check"></i></span><span class="nav-text">Auditoria</span>
        </div>
      `;
    } else {
      adminNav = `
        <div class="nav-section-title hig-sidebar-section-label">Principal</div>
        <div class="nav-item hig-sidebar-nav-item" data-route="admin-dashboard" onclick="App.navigate('admin-dashboard')">
          <span class="nav-icon"><i data-lucide="layout-dashboard"></i></span><span class="nav-text">Dashboard</span>
        </div>
        ${(user.role === 'admin' || user.role === 'gestor_geral') ? `
        <div class="nav-item hig-sidebar-nav-item" data-route="filiais" onclick="App.navigate('filiais')">
          <span class="nav-icon"><i data-lucide="map"></i></span><span class="nav-text">Filiais</span>
        </div>
        ` : ''}
        <div class="nav-item hig-sidebar-nav-item" data-route="cronograma" onclick="App.navigate('cronograma')">
          <span class="nav-icon"><i data-lucide="calendar-days"></i></span><span class="nav-text">Cronograma</span>
        </div>
        <div class="nav-section-divider hig-mobile-only"></div>
        <div class="nav-section-title hig-sidebar-section-label">Operacional</div>
        <div class="nav-item hig-sidebar-nav-item" data-route="gestao" onclick="App.navigate('gestao')">
          <span class="nav-icon"><i data-lucide="users"></i></span><span class="nav-text">Gestão</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="metas" onclick="App.navigate('metas')">
          <span class="nav-icon"><i data-lucide="target"></i></span><span class="nav-text">Metas</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="avaliacoes" onclick="App.navigate('avaliacoes')">
          <span class="nav-icon"><i data-lucide="star"></i></span><span class="nav-text">Avaliações</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="rastreamento" onclick="App.navigate('rastreamento')">
          <span class="nav-icon"><i data-lucide="map"></i></span><span class="nav-text">Rastreamento</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="timeline" onclick="App.navigate('timeline')">
          <span class="nav-icon"><i data-lucide="clock"></i></span><span class="nav-text">Timeline</span>
        </div>
        <div class="nav-item hig-sidebar-nav-item" data-route="relatorios" onclick="App.navigate('relatorios')">
          <span class="nav-icon"><i data-lucide="bar-chart-2"></i></span><span class="nav-text">Relatórios</span>
        </div>
        <div class="nav-section-divider hig-mobile-only"></div>
        <div class="nav-section-title hig-sidebar-section-label">Sistema</div>
        <div class="nav-item hig-sidebar-nav-item" data-route="auditoria" onclick="App.navigate('auditoria')">
          <span class="nav-icon"><i data-lucide="shield-check"></i></span><span class="nav-text">Auditoria</span>
        </div>
        ${user.role === 'admin' ? `
        <div class="nav-item hig-sidebar-nav-item" data-route="dev" onclick="App.navigate('dev')">
          <span class="nav-icon"><i data-lucide="terminal"></i></span><span class="nav-text">Desenvolvimento</span>
        </div>
        ` : ''}
      `;
    }

    const padeiroNav = `
      <div class="nav-section-title hig-sidebar-section-label">Menu</div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-atividade" onclick="App.navigate('padeiro-atividade')">
        <span class="nav-icon"><i data-lucide="clipboard-list"></i></span><span class="nav-text">Registro de Atividade</span>
      </div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-agenda" onclick="App.navigate('padeiro-agenda')">
        <span class="nav-icon"><i data-lucide="calendar-days"></i></span><span class="nav-text">Minha Agenda</span>
      </div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-estoque" onclick="App.navigate('padeiro-estoque')">
        <span class="nav-icon"><i data-lucide="package"></i></span><span class="nav-text">Estoque</span>
      </div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-inicio" onclick="App.navigate('padeiro-inicio')">
        <span class="nav-icon"><i data-lucide="layout-dashboard"></i></span><span class="nav-text">Meu Painel</span>
      </div>
    `;

    return `
    <aside class="sidebar hig-sidebar" id="sidebar">
      <div class="sidebar-header hig-mobile-only">
        <button class="sidebar-toggle-btn" onclick="App.toggleSidebar()">
          <i data-lucide="menu"></i>
        </button>
        <img src="/assets/logo.svg" alt="BRAGO" class="sidebar-logo-img">
      </div>
      <div class="hig-sidebar-logo hig-desktop-only" style="align-items: center; gap: 10px;">
        <img src="/assets/logo.svg" alt="BRAGO" style="height: 32px; filter: brightness(0) invert(1);" class="hig-logo-img">
        <div class="hig-logo-text-group">
          <span class="hig-sidebar-logo-name">Smart</span>
          <span class="hig-sidebar-logo-subtitle">Gestor</span>
        </div>
        <button class="sidebar-toggle-btn hig-desktop-toggle-btn" onclick="App.toggleSidebar()" style="margin-left: auto; color: rgba(255, 255, 255, 0.7); background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; outline: none; transition: background-color 0.2s;">
          <i data-lucide="menu" style="width: 20px; height: 20px;"></i>
        </button>
      </div>
      <nav class="sidebar-nav hig-sidebar-nav">
        ${isManagement ? adminNav : padeiroNav}
      </nav>
      <!-- Créditos -->
      <div class="sidebar-credits">
        Designed & Developed by Abdias Alves
      </div>
      <!-- Mobile Footer -->
      <div class="sidebar-footer hig-mobile-only">
        <div class="sidebar-user">
          <div class="avatar">${initials}</div>
          <div class="user-info-text">
            <div class="user-name">${(user && user.nome) ? user.nome.trim().split(/\s+/)[0] : 'Usuário'}</div>
            <div class="user-role">${user.role === 'admin' ? 'Administrador' : user.role === 'gestor_geral' ? 'Gestor Geral' : user.role === 'gestor_regional' ? 'Gestor Regional' : user.role === 'master_gestor' ? 'Master Gestor' : user.cargo || 'Padeiro'}</div>
          </div>
        </div>
        <div class="nav-item hig-sidebar-nav-item" onclick="Auth.logout()" style="margin-top:8px;color:var(--danger)">
          <span class="nav-icon"><i data-lucide="log-out"></i></span><span class="nav-text">Sair</span>
        </div>
      </div>
      <!-- Desktop HIG Footer -->
      <div class="hig-sidebar-footer hig-desktop-only">
        <div class="hig-sidebar-avatar">${initials}</div>
        <div class="hig-sidebar-user-info">
          <span class="hig-sidebar-user-name">${(user && user.nome) ? user.nome.trim().split(/\s+/)[0] : 'Usuário'}</span>
          <span class="hig-sidebar-user-role">${user.role === 'admin' ? 'Administrador' : user.role === 'gestor_geral' ? 'Gestor Geral' : user.role === 'gestor_regional' ? 'Gestor Regional' : user.role === 'master_gestor' ? 'Master Gestor' : user.cargo || 'Padeiro'}</span>
        </div>
        <button class="hig-sidebar-logout-btn" onclick="Auth.logout()" aria-label="Sair do sistema">
          <i data-lucide="log-out" aria-hidden="true"></i>
        </button>
      </div>
    </aside>`;
  },

  renderBottomNavbar(user) {
    const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
    let items = [];

    if (isManagement) {
      items = [
        { route: 'rastreamento', label: 'Rastreio', icon: 'map-pin' },
        { route: 'cronograma', label: 'Cronograma', icon: 'calendar-days' },
        { route: 'admin-dashboard', label: 'Dashboard', icon: 'layout-dashboard' }
      ];
    } else {
      if (user.role === 'vendedor') {
        items = [
          { route: 'vendedor-clientes', label: 'Clientes', icon: 'users' },
          { route: 'vendedor-inicio', label: 'Feed', icon: 'newspaper' },
          { route: 'vendedor-escala', label: 'Escala', icon: 'calendar-days' },
          { route: 'vendedor-calculadora', label: 'Calculadora', icon: 'calculator' }
        ];
      } else {
        items = [
          { route: 'padeiro-atividade', label: 'Atividade', icon: 'clipboard-list' },
          { route: 'padeiro-agenda', label: 'Agenda', icon: 'calendar-days' },
          { route: 'padeiro-estoque', label: 'Estoque', icon: 'package' },
          { route: 'padeiro-inicio', label: 'Meu Painel', icon: 'layout-dashboard' }
        ];
      }
    }

    const htmlItems = items.map(item => `
      <div class="nav-item bottom-nav-item" data-route="${item.route}" onclick="App.navigate('${item.route}')">
        <span class="bottom-nav-icon"><i data-lucide="${item.icon}"></i></span>
        <span class="bottom-nav-label">${item.label}</span>
      </div>
    `).join('');

    return `
      <nav class="bottom-navbar" id="bottom-navbar">
        <div class="nav-indicator" id="nav-indicator"></div>
        ${htmlItems}
      </nav>
    `;
  },

  // Header configuration per route
  headerConfig: {
    'admin-dashboard':   { title: 'Início',                  showSearch: true,  searchPlaceholder: 'Buscar no sistema...',       showLargeTitle: true },
    'cronograma':        { title: 'Cronograma',              showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'gestao':            { title: 'Gestão',                  showSearch: true,  searchPlaceholder: 'Buscar padeiros...',          showLargeTitle: true },
    'produtos':          { title: 'Produtos',                showSearch: true,  searchPlaceholder: 'Buscar produtos...',          showLargeTitle: true },
    'clientes':          { title: 'Clientes',                showSearch: true,  searchPlaceholder: 'Buscar clientes...',          showLargeTitle: true },
    'metas':             { title: 'Metas de Produção',       showSearch: true,  searchPlaceholder: 'Buscar metas...',            showLargeTitle: true },
    'avaliacoes':        { title: 'Avaliações',              showSearch: true,  searchPlaceholder: 'Buscar avaliações...',        showLargeTitle: true },
    'rastreamento':      { title: 'Rastreamento',            showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'timeline':          { title: 'Timeline do Padeiro',     showSearch: false, searchPlaceholder: '',                          showLargeTitle: false },
    'relatorios':        { title: 'Relatórios',              showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'padeiro-inicio':    { title: 'Meu Painel',              showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'padeiro-atividade': { title: 'Nova Atividade',          showSearch: false, searchPlaceholder: '',                          showLargeTitle: false },
    'padeiro-agenda':    { title: 'Minha Agenda',            showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'padeiro-estoque':   { title: 'Estoque',                 showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'vendedor-inicio':       { title: '',                        showSearch: false, searchPlaceholder: '',                          showLargeTitle: false },
    'vendedor-clientes':     { title: 'Meus Clientes',           showSearch: true,  searchPlaceholder: 'Buscar clientes...',        showLargeTitle: true },
    'vendedor-agendamentos': { title: 'Sugestões de Venda',      showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'vendedor-escala':       { title: 'Escala de Atendimento',   showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'vendedor-agendar-atendimento': { title: 'Agendar Atendimento', showSearch: false, searchPlaceholder: '', showLargeTitle: true },
    'vendedor-cliente-perfil': { title: 'Perfil do Cliente', showSearch: false, searchPlaceholder: '', showLargeTitle: false },
    'vendedor-padeiro-perfil': { title: 'Perfil',                showSearch: false, searchPlaceholder: '',                          showLargeTitle: false },
    'vendedor-calculadora':  { title: 'Calculadora de Gastos',   showSearch: false, searchPlaceholder: '',                          showLargeTitle: true },
    'dev':               { title: 'Desenvolvimento',         showSearch: false, searchPlaceholder: '',                        showLargeTitle: true }
  },

  renderHeader(route) {
    // Abas com header próprio embutido na página
    if (route === 'vendedor-agendar-atendimento' || route === 'vendedor-cliente-perfil' || route === 'vendedor-clientes' || route === 'vendedor-sugestoes' || route === 'vendedor-estoque') return '';
    const cfg = this.headerConfig[route] || { title: 'Sistema Padeiro', showSearch: false, searchPlaceholder: '', showLargeTitle: true };
    const user = API.getUser();
    const initials = (user && user.nome) ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'US';

    return `
    <!-- iOS-style Mobile Header (visible only on mobile) -->
    <div class="ios-header" id="ios-header">
      <!-- Line 1: Nav Bar -->
      <div class="ios-navbar" id="ios-navbar">
        <button class="ios-nav-btn ios-menu-btn" onclick="App.openDrawer()" aria-label="Menu">
          <i data-lucide="menu" size="22"></i>
        </button>
        <div class="ios-navbar-center">
          <span class="ios-nav-title" id="ios-nav-title">${cfg.title}</span>
          <span class="ios-logo-text">Smart Gestor</span>
        </div>
        <div class="ios-navbar-right">
          <button class="ios-nav-btn ios-notif-btn" aria-label="Notificações">
            <i data-lucide="bell" size="20"></i>
            <span class="ios-notif-badge" id="ios-notif-badge" style="display:none">0</span>
          </button>
          <button class="ios-nav-btn ios-avatar-btn" aria-label="Perfil" onclick="App.handleAvatarClick(event)">
            <div class="ios-avatar-circle">${initials}</div>
          </button>
        </div>
      </div>
      <!-- Line 2: Search Bar -->
      ${cfg.showSearch ? `
      <div class="ios-search-row">
        <div class="ios-search-bar" id="ios-search-bar">
          <i data-lucide="search" size="16"></i>
          <input type="text" placeholder="${cfg.searchPlaceholder || 'Buscar...'}" id="ios-search-input" />
        </div>
      </div>` : ''}
      <!-- Line 3: Large Title -->
      ${cfg.showLargeTitle ? `
      <div class="ios-large-title-row" id="ios-large-title-row">
        <h1 class="ios-large-title">${cfg.title}</h1>
      </div>` : ''}
      <!-- Separator (appears on scroll) -->
      <div class="ios-header-separator" id="ios-header-separator"></div>
    </div>

    <!-- Drawer Overlay -->
    <div class="ios-drawer-overlay" id="ios-drawer-overlay" onclick="App.closeDrawer()"></div>

    <!-- Desktop Header (hidden on mobile) -->
    <header class="top-header ios-desktop-header">
      <div class="header-left">
        <button class="toggle-sidebar" onclick="App.toggleSidebar()"><i data-lucide="menu"></i></button>
        <h2>${cfg.title}</h2>
      </div>
      <div class="header-right" style="display:flex;align-items:center;gap:24px;">
        <div id="global-search-container" style="min-width:250px;"></div>
        <span style="font-size:12px;color:var(--text-tertiary);font-weight:500;">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </header>`;
  },

  async renderPage(route) {
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.className = 'page-content';
    }
    document.body.classList.remove('tf-page-active');

    // Cancelar requisições de imagens pendentes para liberar a thread de rede no APK
    if (typeof ImageLoader !== 'undefined' && typeof ImageLoader.cancelPending === 'function') {
      ImageLoader.cancelPending();
    }

    // Limpar elementos flutuantes do vendedor estoque (FAB e modal overlay)
    // que ficam no document.body e podem bloquear outras telas no APK
    const fab = document.getElementById('pf-cart-fab');
    if (fab) fab.remove();
    const cartOverlay = document.getElementById('pf-cart-modal-overlay');
    if (cartOverlay) cartOverlay.remove();
    // Resetar estado do helper ao sair da rota de estoque
    if (typeof VendedorSugestoesHelper !== 'undefined') {
      VendedorSugestoesHelper.selectedClienteId = null;
    }

    const user = API.getUser();
    try {
      switch (route) {
        case 'admin-dashboard': 
          if (user.role === 'master_gestor') {
            await MasterGestor.render();
          } else {
            await AdminDashboard.render();
          }
          break;
        case 'filiais': 
          if (typeof Filiais === 'undefined') {
            console.error('❌ Erro: Objeto Filiais não foi carregado corretamente.');
            Components.toast('Erro: Módulo de filiais não carregado.', 'error');
            return;
          }
          await Filiais.render(); 
          break;
        case 'cronograma': await Cronograma.render(); break;
        case 'gestao':
        case 'produtos':
        case 'clientes':
          if (route === 'produtos') Gestao.currentTab = 'produtos';
          if (route === 'clientes') Gestao.currentTab = 'clientes';
          await Gestao.render(); 
          break;
        case 'metas': 
          if (user && user.role === 'master_gestor') {
            await MasterMetas.render();
          } else {
            await Metas.render();
          }
          break;
        case 'avaliacoes': await Avaliacoes.render(); break;
        case 'rastreamento': await Rastreamento.render(); break;
        case 'timeline': await Timeline.render(); break;
        case 'relatorios': await Relatorios.render(); break;
        case 'padeiro-inicio': await PadeiroDashboard.render(); break;
        case 'padeiro-atividade': await PadeiroFlow.render(this.routeData || {}); break;
        case 'padeiro-agenda': await PadeiroAgenda.render(); break;
        case 'padeiro-estoque': await PadeiroEstoque.render(); break;
        case 'vendedor-inicio': await VendedorDashboard.render(); break;
        case 'vendedor-clientes': await VendedorClientes.render(); break;
        case 'vendedor-agendamentos': await VendedorAgendamentos.render(); break;
        case 'vendedor-escala': await EscalaMain.init(); break;
        case 'vendedor-agendar-atendimento': EscalaMain.renderAgendarVazio(); break;
        case 'vendedor-padeiro-perfil': await VendedorPadeiroPerfil.render(this.routeData || {}); break;
        case 'vendedor-cliente-perfil': await VendedorDashboard.renderClientePerfil(this.routeData || {}); break;
        case 'vendedor-sugestoes': await VendedorSugestoes.render(); break;
        case 'vendedor-estoque': await VendedorEstoque.render(); break;
        case 'vendedor-calculadora': await VendedorCalculadora.render(); break;
        case 'dev': await Dev.render(); break;
        case 'auditoria': await Auditoria.render(); break;
        default:
          document.getElementById('page-container').innerHTML = Components.empty('search', 'Página não encontrada.');
      }
    } catch (error) {
      console.error("Erro ao renderizar página:", error);
      document.getElementById('page-container').innerHTML = Components.empty('alert-circle', 
        `Não foi possível carregar esta página offline. <br><small>${error.message}</small>`);
    }
    Components.renderIcons();
    // Bind iOS header scroll collapse behavior
    this.bindHeaderScroll();
  },

  // Desktop sidebar toggle with localStorage and Leaflet map support
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    if (window.innerWidth >= 1024) {
      sidebar.classList.toggle('collapsed');
      safeSetLocalStorage('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      
      // Auto-refresh Leaflet map layout on the tracking page during transition
      if (this.currentRoute === 'rastreamento' && window.Rastreamento && window.Rastreamento.map) {
        setTimeout(() => {
          window.Rastreamento.map.invalidateSize();
        }, 150);
        setTimeout(() => {
          window.Rastreamento.map.invalidateSize();
        }, 300);
      }
    } else {
      // Toggle mobile drawer
      sidebar.classList.toggle('mobile-open');
      const overlay = document.getElementById('ios-drawer-overlay');
      if (overlay) {
        overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
      }
    }
  },

  // === iOS MOBILE DRAWER ===
  openDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('ios-drawer-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('ios-drawer-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  handleAvatarClick(e) {
    if (e) e.stopPropagation();
    const user = API.getUser();
    if (!user) return;
    const nome = user.nome || 'Usuário';
    const roleLabels = {
      admin: 'Administrador',
      gestor: 'Gestor',
      gestor_geral: 'Gestor Geral',
      gestor_regional: 'Gestor Regional',
      master_gestor: 'Master Gestor',
      vendedor: 'Vendedor'
    };
    const cargo = roleLabels[user.role] || user.cargo || 'Padeiro';

    if (confirm(`Conectado como: ${nome}\nPerfil: ${cargo}\n\nDeseja sair da sua conta?`)) {
      Auth.logout();
    }
  },

  // === iOS HEADER SCROLL COLLAPSE ===
  _scrollBound: false,
  bindHeaderScroll() {
    const pageContainer = document.getElementById('page-container');
    const largeTitleRow = document.getElementById('ios-large-title-row');
    const navTitle = document.getElementById('ios-nav-title');
    const separator = document.getElementById('ios-header-separator');

    if (!pageContainer || !largeTitleRow) return;

    // Reset state
    navTitle && navTitle.classList.remove('visible');
    separator && separator.classList.remove('visible');

    pageContainer.addEventListener('scroll', () => {
      const scrollY = pageContainer.scrollTop;
      const threshold = 44; // Altura aproximada do Large Title

      if (scrollY > threshold) {
        largeTitleRow.classList.add('collapsed');
        navTitle && navTitle.classList.add('visible');
        separator && separator.classList.add('visible');
      } else {
        largeTitleRow.classList.remove('collapsed');
        navTitle && navTitle.classList.remove('visible');
        separator && separator.classList.remove('visible');
      }
    }, { passive: true });

    // Conectar busca iOS com a lógica global
    const iosSearchInput = document.getElementById('ios-search-input');
    if (iosSearchInput) {
      iosSearchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        // Disparar evento customizado ou chamar função global de busca
        const searchEvent = new CustomEvent('app-search', { detail: value });
        document.dispatchEvent(searchEvent);
      });
    }
  },

  checkApkBanner() {
    // 1. Detect platform
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (isCapacitor) return; // Do not show banner inside native app

    // 2. Check if mobile (width <= 768px)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    // 3. Check local storage dismissal (recorre de tempos em tempos)
    const dismissedTime = safeGetLocalStorage('apk_install_prompt_dismissed_time');
    if (dismissedTime) {
      const hoursPassed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
      const dismissType = safeGetLocalStorage('apk_install_prompt_dismiss_type') || 'dismiss';
      // Se clicou em instalar (download), espera 2 horas. Se clicou em depois (dismiss), espera apenas 30 minutos
      const waitHours = dismissType === 'download' ? 2 : 0.5;
      if (hoursPassed < waitHours) {
        return; // Ainda dentro do tempo de espera
      }
    }

    // 4. Show the banner with a smooth entry delay
    setTimeout(() => {
      const banner = document.getElementById('apk-install-banner');
      if (banner) {
        banner.style.display = 'flex';
        // Render Lucide icons inside the banner
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
        // Force reflow and add active class for transition
        banner.offsetHeight;
        banner.classList.add('active');
      }
    }, 2000);
  },

  openExternalApkDownload(url) {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    const ApkUpdater = window.Capacitor?.Plugins?.ApkUpdater;
    const targetUrl = url || `${window.location.origin}/download/apk`;

    // Se estiver rodando no app nativo Capacitor e possuir o plugin de auto-update
    if (isCapacitor && ApkUpdater && typeof ApkUpdater.downloadAndInstall === 'function') {
      ApkUpdater.downloadAndInstall({ url: targetUrl }).catch((err) => {
        console.warn('[ApkUpdater] Falha no instalador nativo, abrindo via sistema:', err);
        window.open(targetUrl, '_system');
      });
      return;
    }

    if (isCapacitor) {
      window.open(targetUrl, '_system');
    } else {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = 'SmartGestor.apk';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  async downloadApk() {
    // 1. Se estiver no navegador e o PWA suportar instalação nativa direta em 1 toque
    if (window.deferredPrompt) {
      try {
        window.deferredPrompt.prompt();
        const choiceResult = await window.deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          console.log('[PWA] Usuário instalou o app diretamente');
          window.deferredPrompt = null;
          this.dismissApkBanner();
          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast('Smart Gestor adicionado à tela inicial! 🎉', 'success');
          }
          return;
        }
      } catch (err) {
        console.warn('[PWA] Erro ao acionar prompt de instalação:', err);
      }
    }

    // 2. Download direto do APK com modal de ajuda
    const downloadUrl = `${window.location.origin}/download/apk`;
    this.openExternalApkDownload(downloadUrl);

    // Esconde o banner
    const banner = document.getElementById('apk-install-banner');
    if (banner) {
      banner.classList.remove('active');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 400);
    }
    
    // Salva o estado como download e registra o tempo
    safeSetLocalStorage('apk_install_prompt_dismissed_time', Date.now().toString());
    safeSetLocalStorage('apk_install_prompt_dismiss_type', 'download');

    // Abre o modal de instruções passo a passo para o usuário concluir a instalação manual
    this.showApkInstallInstructionsModal();
  },

  downloadApkAgain() {
    const downloadUrl = `${window.location.origin}/download/apk`;
    this.openExternalApkDownload(downloadUrl);
    if (typeof Components !== 'undefined' && Components.toast) {
      Components.toast('Download iniciado novamente! 📥', 'success');
    }
  },

  showApkInstallInstructionsModal() {
    const old = document.getElementById('apk-install-instructions-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'apk-install-instructions-modal';
    modal.className = 'pf-modal-overlay';
    modal.style.zIndex = '9999999';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '16px';

    modal.innerHTML = `
      <div class="pf-modal-ios" style="max-width: 380px; width: 100%; height: auto; max-height: 90vh; margin: auto; border-radius: 24px; padding: 24px; text-align: left; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); background: var(--surface-bg); overflow-y: auto; display: block; transform: translateY(0);">
        <div style="background: rgba(30, 75, 255, 0.1); color: #1E4BFF; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; width: 56px; height: 56px; border-radius: 50%;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <h3 style="font-size: 20px; font-weight: 800; color: var(--text-primary); text-align: center; margin-bottom: 6px;">Download Iniciado!</h3>
        <p style="font-size: 13px; color: var(--text-secondary); text-align: center; margin-bottom: 20px; line-height: 1.45;">
          Como os navegadores não podem instalar aplicativos sozinhos por segurança, siga estes passos rápidos:
        </p>

        <!-- Passo a Passo -->
        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
          
          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #1E4BFF; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">1</div>
            <div>
              <strong style="font-size: 13.5px; color: var(--text-primary); display: block;">Aguarde o download</strong>
              <span style="font-size: 12px; color: var(--text-secondary); line-height: 1.35; display: block;">Acompanhe o download no topo ou no rodapé da sua tela.</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #1E4BFF; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">2</div>
            <div>
              <strong style="font-size: 13.5px; color: var(--text-primary); display: block;">Abra o SmartGestor.apk</strong>
              <span style="font-size: 12px; color: var(--text-secondary); line-height: 1.35; display: block;">Quando concluir, clique em <strong>"Abrir"</strong> no aviso do navegador ou vá na sua pasta de "Downloads".</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #1E4BFF; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">3</div>
            <div>
              <strong style="font-size: 13.5px; color: var(--text-primary); display: block;">Permita Fontes Desconhecidas</strong>
              <span style="font-size: 12px; color: var(--text-secondary); line-height: 1.35; display: block;">Se o Android alertar, toque em <strong>"Configurações"</strong> e ative a opção <strong>"Permitir desta fonte"</strong>.</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: flex-start;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: #1E4BFF; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; margin-top: 2px;">4</div>
            <div>
              <strong style="font-size: 13.5px; color: var(--text-primary); display: block;">Confirme a Instalação</strong>
              <span style="font-size: 12px; color: var(--text-secondary); line-height: 1.35; display: block;">Volte para a tela anterior e clique em <strong>"Instalar"</strong>. O app está pronto!</span>
            </div>
          </div>

        </div>

        <!-- Ações -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button class="pf-btn-primary" onclick="document.getElementById('apk-install-instructions-modal').remove()" style="width: 100%; justify-content: center; border-radius: 14px; min-height: 44px;">
            Entendi, vou instalar!
          </button>
          <button class="pf-btn-ghost" onclick="App.downloadApkAgain()" style="width: 100%; margin: 0; justify-content: center; border-radius: 14px; font-size: 12px; border: 1.5px dashed var(--separator); min-height: 44px; margin-top: 6px;">
            Não iniciou o download? Baixar de novo
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    // Adiciona classe active no overlay para transição suave de opacidade
    setTimeout(() => {
      modal.classList.add('active');
    }, 50);
  },

  dismissApkBanner() {
    const banner = document.getElementById('apk-install-banner');
    if (banner) {
      banner.classList.remove('active');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 400); // Wait for transition out
    }
    // Dispensa por tempo menor para ser recorrente até instalar
    safeSetLocalStorage('apk_install_prompt_dismissed_time', Date.now().toString());
    safeSetLocalStorage('apk_install_prompt_dismiss_type', 'dismiss');
  },

  async checkApkUpdate(manual = false) {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    
    // Se for acionamento manual e estiver no navegador Web
    if (manual && !isCapacitor) {
      if (typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Você está no navegador Web. O aplicativo PWA é atualizado automaticamente!', 'info');
      }
      return;
    }

    if (!isCapacitor) return;
    if (!navigator.onLine) {
      if (manual && typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Sem conexão com a internet para verificar atualizações.', 'warning');
      }
      return;
    }

    // Tenta obter a versão atual nativa do APK via Capacitor App Plugin
    try {
      if (window.Capacitor?.Plugins?.App?.getInfo) {
        const appInfo = await window.Capacitor.Plugins.App.getInfo();
        if (appInfo && appInfo.version) {
          this.APP_VERSION = appInfo.version;
        }
      }
    } catch (_) {}

    try {
      if (manual && typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Buscando atualizações no GitHub...', 'info');
      }

      const info = await API.get('/api/app-version');
      if (info && info.version) {
        if (this.isVersionNewer(this.APP_VERSION, info.version)) {
          this.showUpdateModal(info);
        } else if (manual) {
          if (typeof Components !== 'undefined' && Components.toast) {
            Components.toast(`Seu Smart Gestor já está na versão mais recente (v${this.APP_VERSION})! ✨`, 'success');
          }
        }
      }
    } catch (err) {
      console.warn('[Update Check] Falha ao verificar versão do app:', err.message);
      if (manual && typeof Components !== 'undefined' && Components.toast) {
        Components.toast('Não foi possível verificar atualizações no momento.', 'error');
      }
    }
  },

  isVersionNewer(current, latest) {
    const partsCurrent = current.split('.').map(Number);
    const partsLatest = latest.split('.').map(Number);
    for (let i = 0; i < Math.max(partsCurrent.length, partsLatest.length); i++) {
      const c = partsCurrent[i] || 0;
      const l = partsLatest[i] || 0;
      if (l > c) return true;
      if (c > l) return false;
    }
    return false;
  },

  showUpdateModal(info, autoStart = true) {
    // Remove modal anterior se houver
    const old = document.getElementById('apk-update-modal');
    if (old) old.remove();

    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    const ApkUpdater = window.Capacitor?.Plugins?.ApkUpdater;
    const absoluteUrl = info.url.startsWith('http') ? info.url : `${API_BASE_URL || window.location.origin}${info.url}`;

    const modal = document.createElement('div');
    modal.id = 'apk-update-modal';
    modal.className = 'pf-modal-overlay active';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="pf-modal-ios" style="max-width:340px; margin:auto; border-radius:24px; padding:24px; text-align:center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); background: var(--surface-bg); position: relative;">
        <!-- Botão Fechar no canto superior -->
        <button onclick="document.getElementById('apk-update-modal').remove()" style="position: absolute; top: 14px; right: 14px; background: transparent; border: none; font-size: 20px; color: var(--text-tertiary); cursor: pointer; padding: 4px;">
          ✕
        </button>

        <div class="pf-resume-icon" style="background: rgba(30, 75, 255, 0.1); color: #1E4BFF; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; width: 64px; height: 64px; border-radius: 50%;">
          <i data-lucide="download-cloud" style="width: 32px; height: 32px;"></i>
        </div>
        <h3 style="font-size:20px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Atualização Disponível</h3>
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">
          Nova versão <strong>v${info.version}</strong> pronta.<br>${isCapacitor && ApkUpdater ? 'Baixando atualização automaticamente...' : 'Baixe a nova versão para atualizar:'}
        </p>

        ${isCapacitor && ApkUpdater ? `
          <!-- Barra de Progresso Animada -->
          <div style="background: #e2e8f0; border-radius: 12px; height: 10px; overflow: hidden; margin-bottom: 10px; position: relative;">
            <div id="apk-download-bar" style="background: linear-gradient(90deg, #1E4BFF, #60A5FA); width: 0%; height: 100%; border-radius: 12px; transition: width 0.2s ease;"></div>
          </div>
          <div id="apk-download-text" style="font-size: 13px; font-weight: 700; color: #1E4BFF; margin-bottom: 16px;">
            Iniciando download...
          </div>
        ` : ''}

        <div id="apk-update-action-container">
          ${isCapacitor && ApkUpdater ? `
            <p style="font-size: 12px; color: var(--text-tertiary); margin: 0 0 12px 0; line-height: 1.4;">
              O instalador abrirá automaticamente na tela ao finalizar.
            </p>
            <button class="pf-btn-ghost pf-btn-full" onclick="document.getElementById('apk-update-modal').remove()" style="font-size: 12px; color: var(--text-tertiary);">
              Lembrar Mais Tarde
            </button>
          ` : `
            <button onclick="App.openExternalApkDownload('${absoluteUrl}')" class="pf-btn-primary pf-btn-full" style="display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; font-weight: 700; border-radius: 14px; margin-bottom: 10px; cursor: pointer; border: none;">
              <i data-lucide="download" style="width:18px;height:18px"></i> Baixar Atualização (APK)
            </button>
            <button class="pf-btn-ghost pf-btn-full" onclick="document.getElementById('apk-update-modal').remove()">
              Lembrar Mais Tarde
            </button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (typeof Components !== 'undefined' && Components.renderIcons) {
      Components.renderIcons();
    }

    if (autoStart && isCapacitor && ApkUpdater) {
      this.downloadApkUpdate(info.url, info.version);
    }
  },

  downloadApkUpdate(url, version) {
    const absoluteUrl = url.startsWith('http') ? url : `${API_BASE_URL || window.location.origin}${url}`;
    
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    const ApkUpdater = window.Capacitor?.Plugins?.ApkUpdater;

    const progressBar = document.getElementById('apk-download-bar');
    const progressText = document.getElementById('apk-download-text');
    const actionContainer = document.getElementById('apk-update-action-container');

    if (isCapacitor && ApkUpdater) {
      console.log('[Update Check] Iniciando download e instalação automática nativa:', absoluteUrl);

      // Se demorar mais de 15 segundos sem avançar, oferece botão de download direto
      const fallbackTimer = setTimeout(() => {
        if (actionContainer && progressBar && progressBar.style.width === '0%') {
          if (progressText) progressText.textContent = 'Download demorando? Baixe direto:';
          actionContainer.innerHTML = `
            <button onclick="App.openExternalApkDownload('${absoluteUrl}')" class="pf-btn-primary pf-btn-full" style="display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; font-weight: 700; border-radius: 14px; margin-bottom: 8px; cursor: pointer; border: none;">
              <i data-lucide="download" style="width:18px;height:18px"></i> Baixar APK Diretamente
            </button>
            <button class="pf-btn-ghost pf-btn-full" onclick="document.getElementById('apk-update-modal').remove()">
              Fechar
            </button>
          `;
          if (typeof Components !== 'undefined' && Components.renderIcons) Components.renderIcons();
        }
      }, 15000);

      let progressListener = null;
      if (typeof ApkUpdater.addListener === 'function') {
        progressListener = ApkUpdater.addListener('downloadProgress', (info) => {
          clearTimeout(fallbackTimer);
          if (info && typeof info.progress === 'number') {
            const percent = Math.min(100, Math.round(info.progress * 100));
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) {
              if (info.bytes && info.total) {
                const mbRead = (info.bytes / (1024 * 1024)).toFixed(1);
                const mbTotal = (info.total / (1024 * 1024)).toFixed(1);
                progressText.textContent = `Baixando: ${percent}% (${mbRead} MB de ${mbTotal} MB)`;
              } else {
                progressText.textContent = `Baixando: ${percent}%`;
              }
            }
          }
        });
      }

      ApkUpdater.downloadAndInstall({ url: absoluteUrl })
        .then(() => {
          clearTimeout(fallbackTimer);
          console.log('[Update Check] Intent de instalação disparado com sucesso!');
          if (progressListener && typeof progressListener.remove === 'function') {
            progressListener.remove();
          }
          if (progressText) {
            progressText.style.color = '#10b981';
            progressText.textContent = 'Download concluído! Abrindo instalador...';
          }
          if (progressBar) progressBar.style.width = '100%';
          setTimeout(() => {
            const modal = document.getElementById('apk-update-modal');
            if (modal) modal.remove();
          }, 4000);
        })
        .catch(err => {
          clearTimeout(fallbackTimer);
          console.error('[Update Check] Erro no download/instalação nativa:', err);
          if (progressListener && typeof progressListener.remove === 'function') {
            progressListener.remove();
          }
          if (progressText) {
            progressText.style.color = '#ef4444';
            progressText.textContent = 'Erro no download automático.';
          }
          if (actionContainer) {
            actionContainer.innerHTML = `
              <button onclick="App.openExternalApkDownload('${absoluteUrl}')" class="pf-btn-primary pf-btn-full" style="display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; font-weight: 700; border-radius: 14px; margin-bottom: 8px; cursor: pointer; border: none;">
                <i data-lucide="download" style="width:18px;height:18px"></i> Baixar APK Diretamente
              </button>
              <button class="pf-btn-ghost pf-btn-full" onclick="document.getElementById('apk-update-modal').remove()">
                Fechar
              </button>
            `;
            if (typeof Components !== 'undefined' && Components.renderIcons) Components.renderIcons();
          }
        });
    } else {
      window.location.href = absoluteUrl;
    }
  }
};
// Initialize on DOM ready — envolvido em try-catch global para nunca deixar tela branca
function safeAppInit() {
  try {
    App.init();
  } catch (fatalErr) {
    console.error('❌ [FATAL] Erro na inicialização do App:', fatalErr);
    // Garante que pelo menos a tela de login apareça
    try {
      const appDiv = document.getElementById('app');
      if (appDiv && typeof Auth !== 'undefined') {
        appDiv.innerHTML = Auth.renderLogin();
        if (typeof Components !== 'undefined') Components.renderIcons();
      }
    } catch (renderErr) {
      console.error('❌ [FATAL] Falha ao renderizar login de emergência:', renderErr);
    }
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  safeAppInit();
} else {
  document.addEventListener('DOMContentLoaded', () => safeAppInit());
}
