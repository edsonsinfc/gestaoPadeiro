/**
 * App Router - Main SPA Controller
 * BRAGO Sistema Padeiro
 */
const App = {
  currentRoute: 'login',
  async init() {
    // Initialize Offline Manager (IndexedDB)
    try {
      await OfflineManager.init();
    } catch (e) {
      console.error("Erro ao inicializar OfflineManager:", e);
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

    const user = API.getUser();
    const token = API.token;
    if (user && token) {
      if (user.role === 'padeiro') LocationService.init(user);
      this.navigate(user.role === 'admin' || user.role === 'gestor' ? 'admin-dashboard' : 'padeiro-inicio');
    } else {
      this.navigate('login');
    }
  },

  navigate(route, data = {}) {
    this.currentRoute = route;
    this.routeData = data;
    const app = document.getElementById('app');

    if (route === 'login') {
      app.innerHTML = Auth.renderLogin();
      return;
    }
    if (route === 'primeiro-acesso') {
      app.innerHTML = Auth.renderSetPassword();
      return;
    }

    const user = API.getUser();
    if (!user) { this.navigate('login'); return; }

    const isAdmin = user.role === 'admin' || user.role === 'gestor';

    // Build layout
    app.innerHTML = `
    <div class="app-layout">
      ${this.renderSidebar(user, isAdmin)}
      <div class="main-content">
        ${this.renderHeader(route)}
        <div class="page-content" id="page-container">${Components.loading()}</div>
      </div>
    </div>`;

    // Highlight active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Render page content
    this.renderPage(route);
  },

  renderSidebar(user, isAdmin) {
    const initials = user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    
    const adminNav = `
      <div class="nav-section-title">Principal</div>
      <div class="nav-item" data-route="admin-dashboard" onclick="App.navigate('admin-dashboard')">
        <span class="nav-icon"><i data-lucide="layout-dashboard"></i></span><span class="nav-text">Dashboard</span>
      </div>
      ${user.role === 'admin' ? `
      <div class="nav-item" data-route="filiais" onclick="App.navigate('filiais')">
        <span class="nav-icon"><i data-lucide="map"></i></span><span class="nav-text">Filiais</span>
      </div>
      ` : ''}
      <div class="nav-item" data-route="cronograma" onclick="App.navigate('cronograma')">
        <span class="nav-icon"><i data-lucide="calendar-days"></i></span><span class="nav-text">Cronograma</span>
      </div>
      <div class="nav-section-divider"></div>
      <div class="nav-section-title">Operacional</div>
      <div class="nav-item" data-route="gestao" onclick="App.navigate('gestao')">
        <span class="nav-icon"><i data-lucide="users"></i></span><span class="nav-text">Gestão</span>
      </div>
      <div class="nav-item" data-route="metas" onclick="App.navigate('metas')">
        <span class="nav-icon"><i data-lucide="target"></i></span><span class="nav-text">Metas</span>
      </div>
      <div class="nav-item" data-route="avaliacoes" onclick="App.navigate('avaliacoes')">
        <span class="nav-icon"><i data-lucide="star"></i></span><span class="nav-text">Avaliações</span>
      </div>
      <div class="nav-item" data-route="rastreamento" onclick="App.navigate('rastreamento')">
        <span class="nav-icon"><i data-lucide="map"></i></span><span class="nav-text">Rastreamento</span>
      </div>
      <div class="nav-item" data-route="relatorios" onclick="App.navigate('relatorios')">
        <span class="nav-icon"><i data-lucide="bar-chart-2"></i></span><span class="nav-text">Relatórios</span>
      </div>
      <div class="nav-section-divider"></div>
      <div class="nav-section-title">Sistema</div>
      ${user.role === 'admin' ? `
      <div class="nav-item" data-route="dev" onclick="App.navigate('dev')">
        <span class="nav-icon"><i data-lucide="terminal"></i></span><span class="nav-text">Desenvolvimento</span>
      </div>
      ` : ''}
    `;

    const padeiroNav = `
      <div class="nav-section-title">Menu</div>
      <div class="nav-item" data-route="padeiro-inicio" onclick="App.navigate('padeiro-inicio')">
        <span class="nav-icon"><i data-lucide="home"></i></span><span class="nav-text">Início</span>
      </div>
      <div class="nav-item" data-route="padeiro-atividade" onclick="App.navigate('padeiro-atividade')">
        <span class="nav-icon"><i data-lucide="clipboard-list"></i></span><span class="nav-text">Nova Atividade</span>
      </div>
      <div class="nav-item" data-route="padeiro-agenda" onclick="App.navigate('padeiro-agenda')">
        <span class="nav-icon"><i data-lucide="calendar-days"></i></span><span class="nav-text">Minha Agenda</span>
      </div>
    `;

    return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <img src="/assets/logo.svg" alt="BRAGO" class="sidebar-logo-img">
      </div>
      <nav class="sidebar-nav">
        ${isAdmin ? adminNav : padeiroNav}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar">${initials}</div>
          <div class="user-info-text">
            <div class="user-name">${user.nome.split(' ').slice(0, 2).join(' ')}</div>
            <div class="user-role">${user.role === 'admin' ? 'Administrador' : user.cargo || 'Padeiro'}</div>
          </div>
        </div>
        <div class="nav-item" onclick="Auth.logout()" style="margin-top:8px;color:var(--danger)">
          <span class="nav-icon"><i data-lucide="log-out"></i></span><span class="nav-text">Sair</span>
        </div>
      </div>
    </aside>`;
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
    try {
      switch (route) {
        case 'admin-dashboard': await AdminDashboard.render(); break;
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
        case 'metas': await Metas.render(); break;
        case 'avaliacoes': await Avaliacoes.render(); break;
        case 'rastreamento': await Rastreamento.render(); break;
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

  // Desktop sidebar toggle (unchanged)
  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('sidebar').classList.toggle('mobile-open');
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
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
