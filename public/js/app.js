/**
 * App Router - Main SPA Controller
 * BRAGO Sistema Padeiro
 */
const App = {
  APP_VERSION: '1.0.0',
  currentRoute: 'login',
  async init() {
    // Initialize Offline Manager (IndexedDB)
    try {
      await OfflineManager.init();
    } catch (e) {
      console.error("Erro ao inicializar OfflineManager:", e);
    }

    // Listen to Capacitor appRestoredResult for camera recovery
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { App: CapApp } = window.Capacitor.Plugins;
      if (CapApp) {
        CapApp.addListener('appRestoredResult', (result) => {
          console.log('[Capacitor] appRestoredResult recebido:', result);
          if (result.pluginId === 'Camera' && result.methodName === 'getPhoto') {
            if (result.success && result.data) {
              window.lastRestoredPhoto = result.data;
              // Apenas processa imediatamente se o PadeiroFlow já estiver na aba de produção (passo 1)
              // Caso contrário, deixa que o render do passo 1 consuma a imagem após carregar os produtos
              if (window.PadeiroFlow && window.PadeiroFlow.currentStep === 1 && typeof window.PadeiroFlow.handleRestoredPhoto === 'function') {
                window.PadeiroFlow.handleRestoredPhoto(result.data);
              }
            } else {
              console.warn('[Capacitor] Restored camera result failed or cancelled:', result.error);
            }
          }
        });
      }
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

    const user = API.getUser();
    const token = API.token;
    if (user && token) {
      if (user.role === 'padeiro') {
        LocationService.init(user);
        // Pre-carregar produtos e suas fotos locais em background
        API.get('/api/produtos')
          .then(prods => {
            if (prods && Array.isArray(prods)) {
              OfflineManager.preloadProductPhotos(prods);
            }
          })
          .catch(console.warn);
      }
      const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
      const savedRoute = localStorage.getItem('currentRoute');
      const initialRoute = savedRoute || (isManagement ? 'admin-dashboard' : 'padeiro-inicio');
      history.replaceState({ route: initialRoute, data: {} }, '', '');
      this.navigate(initialRoute, {}, false);
    } else {
      history.replaceState({ route: 'login', data: {} }, '', '');
      this.navigate('login', {}, false);
    }

    // Check if we should display the HIG APK download banner
    this.checkApkBanner();

    // Check for APK updates (for native Capacitor app)
    this.checkApkUpdate();
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
    localStorage.setItem('currentRoute', route);
    
    // Auto-collapse mobile drawer/sidebar on navigation
    this.closeDrawer();
    
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
        this.navigate(isManagement ? 'admin-dashboard' : 'padeiro-inicio');
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
      const allowedPadeiroRoutes = ['padeiro-inicio', 'padeiro-atividade', 'padeiro-agenda'];
      if (!allowedPadeiroRoutes.includes(route)) {
        console.warn(`Acesso negado para a rota ${route} (Padeiro). Redirecionando...`);
        this.navigate('padeiro-inicio');
        return;
      }
    } else {
      const allowedAdminRoutes = ['admin-dashboard', 'filiais', 'cronograma', 'gestao', 'metas', 'avaliacoes', 'rastreamento', 'timeline', 'relatorios', 'dev'];
      if (route.startsWith('padeiro-') && !allowedAdminRoutes.includes(route)) {
        // Just in case an admin clicks a padeiro link or has it in storage
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
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl && isSidebarCollapsed && window.innerWidth >= 1024) {
      sidebarEl.classList.add('collapsed');
    }

    // Render page content
    this.renderPage(route);
  },

  renderSidebar(user) {
    const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional', 'master_gestor'].includes(user.role);
    const initials = user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    
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
        ${user.role === 'admin' ? `
        <div class="nav-item hig-sidebar-nav-item" data-route="dev" onclick="App.navigate('dev')">
          <span class="nav-icon"><i data-lucide="terminal"></i></span><span class="nav-text">Desenvolvimento</span>
        </div>
        ` : ''}
      `;
    }

    const padeiroNav = `
      <div class="nav-section-title hig-sidebar-section-label">Menu</div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-inicio" onclick="App.navigate('padeiro-inicio')">
        <span class="nav-icon"><i data-lucide="home"></i></span><span class="nav-text">Início</span>
      </div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-atividade" onclick="App.navigate('padeiro-atividade')">
        <span class="nav-icon"><i data-lucide="clipboard-list"></i></span><span class="nav-text">Nova Atividade</span>
      </div>
      <div class="nav-item hig-sidebar-nav-item" data-route="padeiro-agenda" onclick="App.navigate('padeiro-agenda')">
        <span class="nav-icon"><i data-lucide="calendar-days"></i></span><span class="nav-text">Minha Agenda</span>
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
            <div class="user-name">${user.nome.split(' ').slice(0, 2).join(' ')}</div>
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
          <span class="hig-sidebar-user-name">${user.nome.split(' ').slice(0, 2).join(' ')}</span>
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
    if (isManagement) return '';
    let items = [];

    if (isManagement) {
      if (user.role === 'master_gestor') {
        items = [
          { route: 'admin-dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
          { route: 'filiais', label: 'Filiais', icon: 'map' },
          { route: 'rastreamento', label: 'Rastreio', icon: 'map-pin' },
          { route: 'avaliacoes', label: 'Avaliações', icon: 'star' },
          { route: 'timeline', label: 'Timeline', icon: 'clock' },
          { route: 'gestao', label: 'Gestão', icon: 'users' },
          { route: 'metas', label: 'Metas', icon: 'target' },
          { route: 'relatorios', label: 'Relatórios', icon: 'bar-chart-2' }
        ];
      } else {
        items = [
          { route: 'admin-dashboard', label: 'Dashboard', icon: 'layout-dashboard' }
        ];
        if (user.role === 'admin' || user.role === 'gestor_geral') {
          items.push({ route: 'filiais', label: 'Filiais', icon: 'map' });
        }
        items.push({ route: 'cronograma', label: 'Cronograma', icon: 'calendar-days' });
        items.push({ route: 'gestao', label: 'Gestão', icon: 'users' });
        items.push({ route: 'metas', label: 'Metas', icon: 'target' });
        items.push({ route: 'avaliacoes', label: 'Avaliações', icon: 'star' });
        items.push({ route: 'rastreamento', label: 'Rastreio', icon: 'map' });
        items.push({ route: 'timeline', label: 'Timeline', icon: 'clock' });
        items.push({ route: 'relatorios', label: 'Relatórios', icon: 'bar-chart-2' });
        if (user.role === 'admin') {
          items.push({ route: 'dev', label: 'Dev', icon: 'terminal' });
        }
      }
    } else {
      items = [
        { route: 'padeiro-inicio', label: 'Início', icon: 'home' },
        { route: 'padeiro-agenda', label: 'Agenda', icon: 'calendar-days' },
        { route: 'padeiro-atividade', label: 'Atividade', icon: 'clipboard-list' }
      ];
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
    'dev':               { title: 'Desenvolvimento',         showSearch: false, searchPlaceholder: '',                        showLargeTitle: true }
  },

  renderHeader(route) {
    const cfg = this.headerConfig[route] || { title: 'Sistema Padeiro', showSearch: false, searchPlaceholder: '', showLargeTitle: true };
    const user = API.getUser();
    const initials = user ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'US';

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
          <button class="ios-nav-btn ios-avatar-btn" aria-label="Perfil">
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
      pageContainer.classList.remove('tf-page-active');
      pageContainer.classList.remove('metas-view');
      pageContainer.classList.remove('page-exit-active');
    }
    document.body.classList.remove('tf-page-active');
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
        case 'dev': await Dev.render(); break;
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
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      
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

    // 3. Check local storage dismissal
    const dismissed = localStorage.getItem('apk_install_prompt_dismissed');
    if (dismissed) return;

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

  downloadApk() {
    // Trigger download of the APK from server root
    const link = document.createElement('a');
    link.href = '/smartgestor.apk';
    link.download = 'smartgestor.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Hide and dismiss the banner
    this.dismissApkBanner();
  },

  dismissApkBanner() {
    const banner = document.getElementById('apk-install-banner');
    if (banner) {
      banner.classList.remove('active');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 400); // Wait for transition out
    }
    localStorage.setItem('apk_install_prompt_dismissed', 'true');
  },

  async checkApkUpdate() {
    // Apenas verifica atualização de APK nativo se estiver rodando no Capacitor
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isCapacitor) return;
    if (!navigator.onLine) return; // Se estiver offline, não tenta verificar

    try {
      const info = await API.get('/api/app-version');
      if (info && info.version) {
        if (this.isVersionNewer(this.APP_VERSION, info.version)) {
          this.showUpdateModal(info);
        }
      }
    } catch (err) {
      console.warn('[Update Check] Falha ao verificar versão do app:', err.message);
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

  showUpdateModal(info) {
    // Remove modal anterior se houver
    const old = document.getElementById('apk-update-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'apk-update-modal';
    modal.className = 'pf-modal-overlay';
    modal.style.zIndex = '99999';

    modal.innerHTML = `
      <div class="pf-modal-ios" style="max-width:340px; margin:auto; border-radius:24px; padding:24px; text-align:center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15); background: var(--surface-bg);">
        <div class="pf-resume-icon" style="background: rgba(30, 75, 255, 0.1); color: #1E4BFF; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; width: 64px; height: 64px; border-radius: 50%;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
        <h3 style="font-size:20px; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Nova Versão Disponível!</h3>
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom:16px;">
          Uma nova versão (${info.version}) está disponível. Recomenda-se atualizar para obter novos recursos e correções de bugs.
        </p>
        ${info.notes ? `
          <div style="background: var(--surface-bg-alt, #fafbfc); border: 1px solid #f1f5f9; border-radius:12px; padding:12px; margin-bottom:20px; text-align:left;">
            <strong style="font-size:12px; color:var(--text-primary); display:block; margin-bottom:4px;">Novidades:</strong>
            <span style="font-size:12px; color:var(--text-secondary); line-height:1.4; display:block;">${info.notes}</span>
          </div>
        ` : ''}
        <div style="display:flex; flex-direction:column; gap:8px;">
          <button class="pf-btn-primary" onclick="App.downloadApkUpdate('${info.url}')" style="width:100%; justify-content:center;">
            Atualizar Agora
          </button>
          ${!info.mandatory ? `
            <button class="pf-btn-ghost" onclick="document.getElementById('apk-update-modal').remove()" style="width:100%; margin:0; justify-content:center;">
              Mais Tarde
            </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 50);
  },

  downloadApkUpdate(url) {
    const absoluteUrl = url.startsWith('http') ? url : `${API_BASE_URL || window.location.origin}${url}`;
    
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    const ApkUpdater = window.Capacitor?.Plugins?.ApkUpdater;

    if (isCapacitor && ApkUpdater) {
      console.log('[Update Check] Iniciando download e instalação direta do APK via plugin nativo:', absoluteUrl);
      
      // Mostrar feedback visual de progresso de download
      const iosBtn = document.querySelector('#apk-update-modal .pf-btn-primary'); // O botão do modal de atualização
      const defaultText = iosBtn ? iosBtn.innerHTML : 'Atualizar Agora';
      if (iosBtn) {
        iosBtn.disabled = true;
        iosBtn.innerHTML = `<span class="comodato-spinner" style="margin-right:8px; border-top-color: white; border-right-color: white; border-bottom-color: white; width:16px; height:16px; border-width:2px;"></span> Baixando (0%)...`;
      }

      // Adicionar listener de progresso do download
      let progressListener = null;
      if (typeof ApkUpdater.addListener === 'function') {
        progressListener = ApkUpdater.addListener('downloadProgress', (info) => {
          if (info && typeof info.progress === 'number' && iosBtn) {
            const percent = Math.round(info.progress * 100);
            iosBtn.innerHTML = `<span class="comodato-spinner" style="margin-right:8px; border-top-color: white; border-right-color: white; border-bottom-color: white; width:16px; height:16px; border-width:2px;"></span> Baixando (${percent}%)...`;
          }
        });
      }

      ApkUpdater.downloadAndInstall({ url: absoluteUrl })
        .then(() => {
          console.log('[Update Check] Intent de instalação disparado com sucesso!');
          if (progressListener && typeof progressListener.remove === 'function') {
            progressListener.remove();
          }
          const modal = document.getElementById('apk-update-modal');
          if (modal) modal.remove();
        })
        .catch(err => {
          console.error('[Update Check] Erro no download/instalação nativa:', err);
          if (progressListener && typeof progressListener.remove === 'function') {
            progressListener.remove();
          }
          if (iosBtn) {
            iosBtn.disabled = false;
            iosBtn.innerHTML = defaultText;
          }
          Components.toast('Erro ao baixar atualização. Abrindo navegador...', 'error');
          // Fallback para navegador
          if (window.Capacitor?.Plugins?.Browser) {
            window.Capacitor.Plugins.Browser.open({ url: absoluteUrl });
          } else {
            window.open(absoluteUrl, '_system');
          }
        });
    } else {
      console.log('[Update Check] Abrindo navegador para baixar APK:', absoluteUrl);
      if (window.Capacitor?.Plugins?.Browser) {
        window.Capacitor.Plugins.Browser.open({ url: absoluteUrl });
      } else {
        window.open(absoluteUrl, '_system');
      }
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
