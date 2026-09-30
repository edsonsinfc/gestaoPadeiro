const PadeiroEstoque = {
  clientesAtendidos: [],
  estoqueFaltante: {}, // Cache of cartItems per client: { [clientId]: { [prodId]: { v: quantity, un: unit } } }
  selectedClienteId: null,
  cartItems: {},
  cachedProdutos: [],
  activeProds: [],
  currentFilteredProds: [],
  renderLimit: 50,
  renderedCount: 0,
  _intersectionObserver: null,
  _pillColors: ['blue', 'purple', 'green', 'orange'],

  // Multi-select state variables
  multiSelectMode: false,
  multiSelectedIds: new Set(),
  _longPressTimer: null,

  _fmt(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' mil';
    return parseFloat(n).toFixed(n % 1 === 0 ? 0 : 1).replace('.', ',');
  },

  _renderPhotoGrid(fotos) {
    const cells = [];
    const totalCols = 3;

    for (let i = 0; i < totalCols; i++) {
      const foto = fotos[i];
      if (foto) {
        const url = typeof foto === 'string' ? foto : (foto.url || foto.path || '');
        cells.push(`
          <div class="escala-grid-cell">
            <img class="escala-grid-photo lazy-img" data-src="${url}" alt="Foto ${i + 1}"
              onerror="this.parentElement.innerHTML='<div class=\\'escala-grid-cell--empty\\'><i data-lucide=\\'image-off\\'></i></div>'">
          </div>`);
      } else {
        cells.push(`
          <div class="escala-grid-cell escala-grid-cell--empty">
            <i data-lucide="image-off"></i>
          </div>`);
      }
    }

    const modClass = fotos.length === 1 ? ' escala-photo-grid--one'
                    : fotos.length === 2 ? ' escala-photo-grid--two'
                    : '';

    return `<div class="escala-photo-grid${modClass}">${cells.join('')}</div>`;
  },

  _renderAvatar(clientName, cardIndex) {
    const gradients = [
      'linear-gradient(135deg, #1E4BFF 0%, #4F8AFF 100%)',
      'linear-gradient(135deg, #7B3FC4 0%, #A855F7 100%)',
      'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    ];
    const gradient = gradients[cardIndex % gradients.length];
    const initials = (clientName || 'C').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    return `
      <div class="escala-avatar-row">
        <div class="escala-avatar" style="background: ${gradient};">
          ${initials}
        </div>
      </div>`;
  },

  _renderPills(padeirosList) {
    return `
      <div class="escala-pills">
        <span class="escala-pill escala-pill--blue" style="font-weight: 700;">Padeiro ativo: Você</span>
      </div>`;
  },

  _renderStats(stats) {
    const notaVal = stats.mediaNota !== null
      ? stats.mediaNota.toFixed(1).replace('.', ',')
      : '—';

    const kgVal = stats.totalKg > 0 ? this._fmt(stats.totalKg) : '0';

    return `
      <div class="escala-stats-row">
        <div class="escala-stat">
          <span class="escala-stat-value">${notaVal}</span>
          <span class="escala-stat-label">Média Nota</span>
        </div>
        <div class="escala-stat">
          <span class="escala-stat-value">${stats.totalVisitas}</span>
          <span class="escala-stat-label">Visitas</span>
        </div>
        <div class="escala-stat">
          <span class="escala-stat-value">${kgVal}</span>
          <span class="escala-stat-label">Kg Produz.</span>
        </div>
      </div>`;
  },

  getClientStats(clientId, activities, padeiros, avaliacoes) {
    const clientActivities = activities.filter(a => a.clienteId === clientId && a.status === 'finalizada');
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
    const totalVisitas = clientActivities.length;

    const clientActivityIds = clientActivities.map(a => a.id || a._id);
    const clientEvals = avaliacoes.filter(e =>
      e.tipo === 'cliente' && clientActivityIds.includes(e.atividadeId)
    );
    
    // Buscar o objeto cliente correspondente para usar a notaMedia global como fallback se necessário
    const cliente = this.clientesAtendidos ? this.clientesAtendidos.find(c => (c.id || c._id) === clientId) : null;
    
    const mediaNota = clientEvals.length > 0
      ? clientEvals.reduce((sum, e) => sum + (parseFloat(e.nota || e.estrelas || 0)), 0) / clientEvals.length
      : (cliente && cliente.notaMedia ? parseFloat(cliente.notaMedia) : null);

    const ultimasFotos = [];
    const sortedActs = [...clientActivities].sort((a, b) => {
      const dateA = a.data ? new Date(a.data + (a.hora ? 'T' + a.hora : '')) : new Date(0);
      const dateB = b.data ? new Date(b.data + (b.hora ? 'T' + b.hora : '')) : new Date(0);
      return dateB - dateA;
    });

    for (const act of sortedActs) {
      let actFotos = [];
      if (typeof act.fotos === 'string') {
        try {
          actFotos = JSON.parse(act.fotos);
        } catch (e) {
          actFotos = [];
        }
      } else if (Array.isArray(act.fotos)) {
        actFotos = act.fotos;
      }

      if (actFotos && actFotos.length > 0) {
        const validFotos = actFotos.filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
        for (const foto of validFotos) {
          if (ultimasFotos.length < 5) {
            const absUrl = foto.path.startsWith('http') ? foto.path : `${API_BASE_URL}${foto.path.replace('/uploads/', '/storage/')}`;
            ultimasFotos.push(absUrl);
          }
        }
      }
      if (ultimasFotos.length >= 5) break;
    }

    const padeiroIds = [...new Set(clientActivities.map(a => a.padeiroId).filter(Boolean))];
    const padeirosList = padeiroIds
      .slice(0, 3)
      .map(pid => {
        const p = padeiros.find(pad => (pad.id || pad._id) === pid);
        return p ? { id: p.id || p._id, nome: p.nome || p.name } : null;
      })
      .filter(Boolean);

    return { totalKg, totalVisitas, mediaNota, ultimasFotos, padeirosList };
  },

  async render() {
    const pageContainer = document.getElementById('page-container');
    
    // Check if we are inside a client detail screen
    if (this.selectedClienteId) {
      if (pageContainer) {
        pageContainer.classList.add('cperfil-active');
      }
      const iosHeader = document.getElementById('ios-header');
      if (iosHeader) iosHeader.style.display = 'none';
      const desktopHeader = document.querySelector('.ios-desktop-header');
      if (desktopHeader) desktopHeader.style.display = 'none';
    } else {
      if (pageContainer) {
        pageContainer.classList.remove('cperfil-active');
      }
      const iosHeader = document.getElementById('ios-header');
      if (iosHeader) iosHeader.style.display = '';
      const desktopHeader = document.querySelector('.ios-desktop-header');
      if (desktopHeader) desktopHeader.style.display = '';
      
      const fab = document.getElementById('pf-cart-fab');
      if (fab) fab.classList.remove('visible');
    }

    pageContainer.innerHTML = Components.empty('loader', 'Carregando clientes...');
    try {
      const [clientes, atividades, padeiros, avaliacoes, produtos, agenda] = await Promise.all([
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/avaliacoes').catch(() => []),
        API.get('/api/produtos').catch(() => []),
        API.get('/api/cronograma/agenda').catch(() => [])
      ]);
      
      this.cachedProdutos = produtos;
      this.activeProds = produtos.filter(p => p.ativo !== false);
      
      // Salvar no estado para uso em outras partes
      this.clientes = clientes;
      this.atividades = atividades;
      this.padeiros = padeiros;
      this.avaliacoes = avaliacoes;
      this.agenda = agenda;
      
      const user = API.getUser();
      
      // Obter data de hoje em YYYY-MM-DD no fuso local
      const dateObj = new Date();
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hojeStr = `${year}-${month}-${day}`;
      
      // Filtrar tarefas agendadas para o padeiro logado no dia de hoje (independente de concluídas)
      const tarefasHoje = agenda.filter(t => t.data === hojeStr);
      
      const uniqueClientIds = [...new Set(tarefasHoje.map(t => t.clienteId).filter(Boolean))];
      this.clientesAtendidos = clientes.filter(c => uniqueClientIds.includes(c.id || c._id));
      
      if (this.selectedClienteId) {
        this.renderDetailScreen(pageContainer);
        return;
      }

      if (this.clientesAtendidos.length === 0) {
        pageContainer.innerHTML = Components.empty('package-open', 'Você não possui clientes agendados na escala de hoje.');
        return;
      }
      
      this.buildUI(pageContainer, atividades, padeiros, avaliacoes);
      
    } catch (error) {
      console.error('Erro ao carregar dados do estoque:', error);
      pageContainer.innerHTML = Components.empty('alert-circle', 'Erro ao carregar dados. Tente novamente.');
    }
  },
  
  buildUI(container, activities, padeiros, avaliacoes) {
    let cardsHtml = '';
    
    this.clientesAtendidos.forEach((cliente, index) => {
      const clientId = cliente.id || cliente._id;
      const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
      const location = [cliente.bairro, cliente.cidade].filter(Boolean).join(', ');
      
      const stats = this.getClientStats(clientId, activities, padeiros, avaliacoes);
      const photosHtml = this._renderPhotoGrid(stats.ultimasFotos);
      const avatarHtml = this._renderAvatar(clientName, index);
      const pillsHtml = this._renderPills(stats.padeirosList);
      const statsHtml = this._renderStats(stats);
      
      cardsHtml += `
        <div class="escala-card">
          ${photosHtml}
          ${avatarHtml}
          <div class="escala-card-body">
            <div class="escala-client-name">${clientName}</div>
            
            ${location ? `
              <div class="escala-client-location">
                <i data-lucide="map-pin"></i>
                <span>${location}</span>
              </div>` : ''}
              
            ${pillsHtml}
            ${statsHtml}
            
            <button
              class="escala-btn-agendar"
              onclick="PadeiroEstoque.selectClient('${clientId}')"
            >
              <i data-lucide="package"></i>
              Informar Estoque
            </button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = `
      <div class="estoque-container" style="padding-top: 10px;">
        <div class="escala-list">
          ${cardsHtml}
        </div>
      </div>
    `;
    
    if (window.lucide) lucide.createIcons();
    
    if (typeof ImageLoader !== 'undefined') {
      container.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  },

  selectClient(clientId) {
    this.selectedClienteId = clientId;
    this.cartItems = this.estoqueFaltante[clientId] || {};
    
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.classList.add('cperfil-active');
    }
    
    const iosHeader = document.getElementById('ios-header');
    if (iosHeader) iosHeader.style.display = 'none';
    const desktopHeader = document.querySelector('.ios-desktop-header');
    if (desktopHeader) desktopHeader.style.display = 'none';
    
    this.render();
  },

  backToList() {
    this.exitMultiSelectMode();
    this.selectedClienteId = null;
    this.cartItems = {};
    
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.classList.remove('cperfil-active');
    }
    
    const iosHeader = document.getElementById('ios-header');
    if (iosHeader) iosHeader.style.display = '';
    const desktopHeader = document.querySelector('.ios-desktop-header');
    if (desktopHeader) desktopHeader.style.display = '';
    
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
    }
    this.render();
  },

  renderDetailScreen(container) {
    const cliente = this.clientesAtendidos.find(c => (c.id || c._id) === this.selectedClienteId);
    if (!cliente) {
      this.backToList();
      return;
    }

    const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
    const clientCnpj = cliente.cnpj || '--';
    const clientInitial = clientName[0] ? clientName[0].toUpperCase() : 'C';

    this.currentFilteredProds = this.activeProds;
    this.renderLimit = 50;
    this.renderedCount = 0;

    const todayActivities = this.atividades || [];
    const todayEvaluations = this.avaliacoes || [];
    const stats = this.getClientStats(this.selectedClienteId, todayActivities, this.padeiros || [], todayEvaluations);

    let fornecedores = [...new Set(this.activeProds.map(p => p.fornecedor).filter(f => f && f.trim() !== ''))];
    const PRIORITY = ['IREKS'];
    fornecedores.sort((a, b) => {
      const isA = PRIORITY.some(p => a.toUpperCase().includes(p));
      const isB = PRIORITY.some(p => b.toUpperCase().includes(p));
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return a.localeCompare(b);
    });

    container.innerHTML = `
      <div class="cperfil-screen" style="background:#f2f2f7; min-height:100%; padding-bottom:100px;">
        <!-- Header / Hero section matching Client Profile -->
        <div class="cperfil-hero" style="border-radius: 0 0 28px 28px; margin-bottom: 20px; padding: 20px 20px 24px;">
          <div class="cperfil-hero-nav">
            <button class="cperfil-back-btn" onclick="PadeiroEstoque.backToList()">
              <i data-lucide="chevron-left"></i>
            </button>
            <span class="cperfil-nav-title" style="color: #fff; font-size:15px; font-weight:600;">Informar Estoque</span>
            <div style="width: 34px;"></div>
          </div>
          
          <div class="cperfil-greeting-card" style="margin-bottom: 18px; margin-top: 10px; width: 100%; box-sizing: border-box;">
            <div class="cperfil-greeting-icon">${clientInitial}</div>
            <div class="cperfil-greeting-text">
              <div class="cperfil-greeting-hi">${clientName}</div>
              <div class="cperfil-greeting-sub">CNPJ: ${clientCnpj}</div>
            </div>
          </div>

          <!-- Gráfico circular e progresso de estoque -->
          <div class="cperfil-progress-container" style="margin-bottom: 0;">
            <div class="cperfil-progress-circle-wrapper">
              <svg viewBox="0 0 80 80">
                <!-- Círculo de fundo -->
                <circle cx="40" cy="40" r="34" stroke="rgba(255, 255, 255, 0.15)" stroke-width="6" fill="transparent" />
                <!-- Círculo de progresso -->
                <circle id="estoque-progress-circle" cx="40" cy="40" r="34" stroke="#ffffff" stroke-width="6" fill="transparent"
                        stroke-dasharray="213.6" stroke-dashoffset="213.6"
                        stroke-linecap="round" transform="rotate(-90 40 40)" style="transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);" />
                <!-- Texto central -->
                <text id="estoque-progress-text" x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ffffff" font-size="16" font-weight="800">
                  0%
                </text>
              </svg>
            </div>
            <div class="cperfil-progress-info">
              <span class="cperfil-progress-title">Estoque Faltando</span>
              <div class="cperfil-progress-value-row">
                <span id="estoque-progress-val-main" class="cperfil-progress-val-main">0</span>
                <span id="estoque-progress-val-unit" class="cperfil-progress-val-unit">,00 kg</span>
              </div>
              <div class="cperfil-progress-stock-row">
                <span class="cperfil-progress-stock-lbl">Estoque Alvo:</span>
                <span class="cperfil-progress-stock-val">200 kg</span>
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 0 16px;">
          <!-- 1. Grid Dashboard (Peso span 2, sem litros) -->
          <div class="pf-dashboard-grid" style="margin-bottom: 16px;">
            <!-- Card 1: KG (Full Width) -->
            <div class="pf-dash-card" style="grid-column: span 2;">
              <div class="pf-dash-card-label"><i data-lucide="scale" style="width:14px;height:14px"></i> Peso Faltante</div>
              <div class="pf-dash-card-value">
                <span id="flow-wallet-kg-display">0.0</span>
                <span class="pf-dash-card-unit">KG</span>
              </div>
            </div>

            <!-- Card 2: Itens -->
            <div class="pf-dash-card">
              <div class="pf-dash-card-label"><i data-lucide="package" style="width:14px;height:14px"></i> Produtos</div>
              <div class="pf-dash-card-value">
                <span id="flow-wallet-items-display">0</span>
                <span class="pf-dash-card-unit" style="font-size:12px; margin-left:2px;">itens</span>
              </div>
            </div>

            <!-- Card 3: Unidades -->
            <div class="pf-dash-card">
              <div class="pf-dash-card-label"><i data-lucide="box" style="width:14px;height:14px"></i> Unidades</div>
              <div class="pf-dash-card-value">
                <span id="flow-wallet-un-display">0</span>
                <span class="pf-dash-card-unit" style="font-size:12px; margin-left:2px;">un</span>
              </div>
            </div>
          </div>

          <!-- 2. Wallet Banner -->
          <div class="pf-wallet-banner" style="margin-bottom: 16px;" onclick="PadeiroEstoque.openCartModal()">
            <div class="pf-wallet-banner-content">
              <div class="pf-wallet-banner-title">Produtos Faltantes</div>
              <div id="pf-wallet-avatars" class="pf-wallet-avatars-container" style="display:none;"></div>
              <span class="pf-wallet-banner-action" id="flow-recent-action">Nenhum item marcado</span>
            </div>
            <div class="pf-wallet-banner-icon">
              <i data-lucide="clipboard-list" style="width:28px;height:28px"></i>
            </div>
          </div>

          <!-- Horizontal Categories Tabs -->
          <div class="pf-pizza-tabs" style="margin-bottom: 16px;">
            <div class="pf-pizza-tab active" onclick="PadeiroEstoque.filterByTab(this, 'all')">Todos</div>
            ${fornecedores.map(f => {
              const isPrio = PRIORITY.some(p => f.toUpperCase().includes(p));
              const prioClass = isPrio ? 'prio' : '';
              const icon = isPrio ? '<i data-lucide="star" style="width:14px;height:14px;margin-right:4px;"></i>' : '';
              return `<div class="pf-pizza-tab ${prioClass}" onclick="PadeiroEstoque.filterByTab(this, '${f.trim().toLowerCase()}')">${icon}${f.trim().split(' ')[0]}</div>`;
            }).join('')}
          </div>

          <!-- Search Bar -->
          <div class="pf-search-container" style="margin-bottom: 20px;">
            <i data-lucide="search" class="pf-search-icon" style="width:18px;height:18px"></i>
            <input type="text" class="pf-search-input" id="flow-prod-search" placeholder="Pesquisar produto por nome ou código..." oninput="PadeiroEstoque.filterProducts(this.value)">
          </div>

          <!-- Products List -->
          <div id="kg-items" class="pf-pizza-list">
            <!-- Loaded via renderProductBatch -->
          </div>
          <div id="pf-load-more-sentinel" class="pf-skeleton-loader" style="display: none;">
            <div class="pf-skeleton-row"><div class="pf-skeleton-img"></div><div class="pf-skeleton-content"><div class="pf-skeleton-line-1"></div><div class="pf-skeleton-line-2"></div></div><div class="pf-skeleton-btn"></div></div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    this.calculateTotals();
    this.renderProductBatch(true);
    this.setupLazyLoading();
    this.setupLongPress();
  },

  filterProducts(query) {
    const q = query.toLowerCase();
    if (q.length > 0) {
      document.querySelectorAll('.pf-pizza-tab').forEach(el => el.classList.remove('active'));
    }
    this.currentFilteredProds = this.activeProds.filter(p => {
       const desc = (p.descricao || '').toLowerCase();
       const code = (p.codigo || '').toLowerCase();
       return desc.includes(q) || code.includes(q);
    });
    this.renderProductBatch(true);
  },

  filterByTab(element, fornecedor) {
    const searchInput = document.getElementById('flow-prod-search');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.pf-pizza-tab').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    if (fornecedor === 'all') {
      this.currentFilteredProds = this.activeProds;
    } else {
      this.currentFilteredProds = this.activeProds.filter(p => {
        const rowFornecedor = (p.fornecedor || 'sem fornecedor').trim().toLowerCase();
        return rowFornecedor === fornecedor;
      });
    }
    this.renderProductBatch(true);
  },

  renderProductBatch(reset = false) {
    const container = document.getElementById('kg-items');
    if (!container) return;
    
    if (reset) {
      this.renderedCount = 0;
      this.renderLimit = 50;
      container.innerHTML = '';
    }

    const itemsToRender = this.currentFilteredProds.slice(this.renderedCount, this.renderLimit);
    if (itemsToRender.length === 0 && this.renderedCount > 0) return;

    const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";

    const html = itemsToRender.map((p, idx) => {
      const safeDesc = p.descricao.replace(/'/g, "\\'");
      const safeCode = (p.codigo || '').replace(/'/g, "\\'");
      const imgSrc = typeof OfflineManager !== 'undefined'
        ? OfflineManager.getProductPhotoSrc(p.codigo, p.temFoto, fallbackSvg)
        : (p.temFoto && p.codigo ? `/api/foto-produto/${p.codigo}` : fallbackSvg);
      const animDelay = idx < 15 && reset ? 0.05 + idx * 0.02 : 0;
      
      return `
      <div class="pf-pizza-row fade-in" style="animation-delay: ${animDelay}s" data-id="${p.id}" data-fornecedor="${(p.fornecedor || 'sem fornecedor').trim().toLowerCase()}" data-descricao="${(p.descricao||'').toLowerCase()}" data-codigo="${(p.codigo || '').toLowerCase()}" data-orig-desc="${safeDesc}" data-orig-code="${safeCode}">
        <div class="pf-multiselect-checkbox"></div>
        <div class="pf-pizza-img-wrap">
          <img data-product-code="${p.codigo || ''}" class="lazy-img" data-src="${imgSrc}" src="${fallbackSvg}" onerror="this.src='${fallbackSvg}'" alt="${p.descricao}">
        </div>
        
        <div class="pf-pizza-content">
          <h3 class="pf-pizza-title">${p.descricao}</h3>
          <span class="pf-pizza-desc">Cód: ${p.codigo || 'Sem código'}</span>
        </div>

        <div id="cart-item-display-${p.id}">
          <!-- Rendered via calculateTotals -->
        </div>
      </div>
    `}).join('');

    container.insertAdjacentHTML('beforeend', html);
    this.renderedCount += itemsToRender.length;

    this.calculateTotals();
    if (window.lucide) lucide.createIcons();
    if (typeof ImageLoader !== 'undefined') {
      container.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }

    const sentinel = document.getElementById('pf-load-more-sentinel');
    if (sentinel) {
      if (this.renderedCount >= this.currentFilteredProds.length) {
        sentinel.style.display = 'none';
      } else {
        sentinel.style.display = 'flex';
      }
    }
  },

  setupLazyLoading() {
    const sentinel = document.getElementById('pf-load-more-sentinel');
    if (!sentinel) return;

    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }

    this._intersectionObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        if (this.renderedCount < this.currentFilteredProds.length) {
          setTimeout(() => {
            this.renderLimit += 50;
            this.renderProductBatch();
          }, 300);
        }
      }
    }, {
      rootMargin: '200px'
    });

    this._intersectionObserver.observe(sentinel);
  },

  setupLongPress() {
    const container = document.getElementById('kg-items');
    if (!container) return;

    // Delegated touch events
    container.addEventListener('touchstart', (e) => {
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;
      
      const touch = e.touches[0];
      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
      
      this._longPressMoved = false;
      this._longPressTriggered = false;
      this._longPressTimer = setTimeout(() => {
        if (!this._longPressMoved) {
          this._longPressTriggered = true;
          if (navigator.vibrate) navigator.vibrate(50);
          row.classList.add('pf-longpress-active');
          setTimeout(() => row.classList.remove('pf-longpress-active'), 500);
          this.enterMultiSelectMode(row.dataset.id);
        }
      }, 220);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (!this._longPressTimer) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - this._touchStartX);
      const deltaY = Math.abs(touch.clientY - this._touchStartY);
      
      if (deltaX > 10 || deltaY > 10) {
        this._longPressMoved = true;
        clearTimeout(this._longPressTimer);
      }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      clearTimeout(this._longPressTimer);
      if (this._longPressTriggered) {
        e.preventDefault();
        setTimeout(() => {
          this._longPressTriggered = false;
        }, 300);
      }
    });

    // Delegated mouse events
    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;
      this._longPressMoved = false;
      this._longPressTriggered = false;
      this._longPressTimer = setTimeout(() => {
        if (!this._longPressMoved) {
          this._longPressTriggered = true;
          row.classList.add('pf-longpress-active');
          setTimeout(() => row.classList.remove('pf-longpress-active'), 500);
          this.enterMultiSelectMode(row.dataset.id);
        }
      }, 220);
    });

    container.addEventListener('mousemove', () => {
      this._longPressMoved = true;
      clearTimeout(this._longPressTimer);
    });

    container.addEventListener('mouseup', () => {
      clearTimeout(this._longPressTimer);
    });

    // Click handler: toggle selection
    container.addEventListener('click', (e) => {
      const row = e.target.closest('.pf-pizza-row');
      if (!row) return;

      if (this._longPressTriggered) {
        e.preventDefault();
        e.stopPropagation();
        this._longPressTriggered = false;
        return;
      }
      if (!this.multiSelectMode) return;
      if (e.target.closest('.pf-pizza-add-btn') || e.target.closest('.pf-pizza-tag')) return;
      
      e.preventDefault();
      e.stopPropagation();
      this.toggleMultiSelect(row.dataset.id);
    });

    container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.pf-pizza-row')) {
        e.preventDefault();
      }
    });
  },

  enterMultiSelectMode(firstId) {
    if (this.multiSelectMode) return;
    this.multiSelectMode = true;
    this.multiSelectedIds = new Set();
    this.multiSelectedIds.add(firstId);
    document.body.classList.add('pf-multiselect-mode');

    const firstRow = document.querySelector(`.pf-pizza-row[data-id="${firstId}"]`);
    if (firstRow) {
      firstRow.classList.add('pf-multi-selected', 'pf-select-pop');
      setTimeout(() => firstRow.classList.remove('pf-select-pop'), 300);
    }

    this.renderMultiSelectBar();
  },

  exitMultiSelectMode() {
    this.multiSelectMode = false;
    this.multiSelectedIds = new Set();
    document.body.classList.remove('pf-multiselect-mode');

    document.querySelectorAll('.pf-pizza-row.pf-multi-selected').forEach(row => {
      row.classList.remove('pf-multi-selected');
    });

    const bar = document.getElementById('pf-multiselect-bar');
    if (bar) bar.classList.remove('active');

    this.calculateTotals();
  },

  toggleMultiSelect(id) {
    if (!this.multiSelectMode) return;
    const row = document.querySelector(`.pf-pizza-row[data-id="${id}"]`);
    if (!row) return;

    if (this.multiSelectedIds.has(id)) {
      this.multiSelectedIds.delete(id);
      row.classList.remove('pf-multi-selected');
    } else {
      this.multiSelectedIds.add(id);
      row.classList.add('pf-multi-selected', 'pf-select-pop');
      setTimeout(() => row.classList.remove('pf-select-pop'), 300);
      if (navigator.vibrate) navigator.vibrate(30);
    }

    if (this.multiSelectedIds.size === 0) {
      this.exitMultiSelectMode();
      return;
    }

    this.updateMultiSelectBar();
  },

  selectAllVisible() {
    document.querySelectorAll('.pf-pizza-row').forEach(row => {
      if (row.style.display !== 'none') {
        const id = row.dataset.id;
        this.multiSelectedIds.add(id);
        row.classList.add('pf-multi-selected');
      }
    });
    this.updateMultiSelectBar();
    if (navigator.vibrate) navigator.vibrate(30);
  },

  addMultiSelectedToCart() {
    if (this.multiSelectedIds.size === 0) return;
    this.cartItems = this.cartItems || {};

    this.multiSelectedIds.forEach(id => {
      if (!this.cartItems[id]) {
        this.cartItems[id] = { v: 1, un: 'KG' };
      }
    });

    const count = this.multiSelectedIds.size;
    this.exitMultiSelectMode();
    this.calculateTotals();
    this.openCartModal();
    if (typeof Components !== 'undefined' && Components.toast) {
      Components.toast(`${count} produto(s) adicionado(s) ao relatório!`, 'success');
    }
  },

  renderMultiSelectBar() {
    let bar = document.getElementById('pf-multiselect-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pf-multiselect-bar';
      bar.className = 'pf-multiselect-bar';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div class="pf-multiselect-bar-left">
        <div class="pf-multiselect-close-btn" onclick="PadeiroEstoque.exitMultiSelectMode()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
        <div class="pf-multiselect-count" id="pf-multi-count">
          ${this.multiSelectedIds.size} <span>selecionado(s)</span>
        </div>
      </div>
      <div class="pf-multiselect-bar-right">
        <div class="pf-multiselect-select-all-btn" onclick="PadeiroEstoque.selectAllVisible()">Todos</div>
        <button class="pf-multiselect-add-btn" id="pf-multi-add-btn" onclick="PadeiroEstoque.addMultiSelectedToCart()" ${this.multiSelectedIds.size === 0 ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          Adicionar
        </button>
      </div>
    `;

    setTimeout(() => bar.classList.add('active'), 20);
  },

  updateMultiSelectBar() {
    const countEl = document.getElementById('pf-multi-count');
    if (countEl) {
      countEl.innerHTML = `${this.multiSelectedIds.size} <span>selecionado(s)</span>`;
    }
    const addBtn = document.getElementById('pf-multi-add-btn');
    if (addBtn) {
      addBtn.disabled = this.multiSelectedIds.size === 0;
    }
  },

  quickAddToCart(id, name, code) {
    if (this.multiSelectMode) return;
    this.cartItems = this.cartItems || {};
    if (!this.cartItems[id]) {
      this.cartItems[id] = { v: 1, un: 'KG' };
    }
    this.calculateTotals();
    this.openCartModal();
  },

  changeCartItemUnit(id, un) {
    this.cartItems = this.cartItems || {};
    if (this.cartItems[id]) {
      this.cartItems[id].un = un;
      this.calculateTotals();
      this.openCartModal();
    }
  },

  removeCartItem(id) {
    this.cartItems = this.cartItems || {};
    delete this.cartItems[id];
    this.calculateTotals();
    this.openCartModal();
  },

  changeCartItemQty(id, delta) {
    this.cartItems = this.cartItems || {};
    if (!this.cartItems[id]) return;
    
    let val = parseFloat(String(this.cartItems[id].v).replace(',', '.')) || 0;
    val += delta;
    if (val <= 0) {
      this.removeCartItem(id);
      return;
    }
    
    this.cartItems[id].v = parseFloat(val.toFixed(2));
    this.calculateTotals();
    this.openCartModal();
  },

  calculateTotals() {
    let totalKg = 0;
    let totalUn = 0;
    let selectedCount = 0;
    this.cartItems = this.cartItems || {};

    Object.keys(this.cartItems).forEach(id => {
      const item = this.cartItems[id];
      selectedCount++;
      const val = parseFloat(String(item.v).replace(',', '.')) || 0;
      if (item.un === 'KG' || item.un === 'L') totalKg += val;
      if (item.un === 'UN' || item.un === 'PCT') totalUn += val;
    });

    // Update progress circle (Target: 200 kg)
    const targetKg = 200;
    const percentage = Math.min(100, Math.round((totalKg / targetKg) * 100));
    const maxDash = 213.6;
    const offset = maxDash - (maxDash * percentage) / 100;
    
    const circle = document.getElementById('estoque-progress-circle');
    if (circle) {
      // Trigger smooth transitions via requestAnimationFrame
      requestAnimationFrame(() => {
        circle.style.strokeDashoffset = offset;
      });
    }
    
    const text = document.getElementById('estoque-progress-text');
    if (text) {
      text.textContent = `${percentage}%`;
    }
    
    const valMain = document.getElementById('estoque-progress-val-main');
    if (valMain) {
      valMain.textContent = Math.floor(totalKg).toLocaleString('pt-BR');
    }
    
    const valUnit = document.getElementById('estoque-progress-val-unit');
    if (valUnit) {
      const decimalStr = (totalKg % 1).toFixed(2).replace('0.', ',');
      valUnit.textContent = `${decimalStr} kg`;
    }

    // Update row visuals
    document.querySelectorAll('.pf-pizza-row').forEach(row => {
      row.classList.remove('selected');
      const id = row.dataset.id;
      const displayWrap = document.getElementById(`cart-item-display-${id}`);
      if (displayWrap) {
        if (this.cartItems[id]) {
          const item = this.cartItems[id];
          row.classList.add('selected');
          displayWrap.innerHTML = `<div class="pf-pizza-tag" onclick="PadeiroEstoque.openCartModal()">${item.v} ${item.un === 'L' ? 'KG' : item.un}</div>`;
        } else {
          const prod = this.activeProds.find(p => p.id === id);
          const origDesc = prod ? prod.descricao.replace(/'/g, "\\'") : '';
          const origCode = prod ? (prod.codigo || '').replace(/'/g, "\\'") : '';
          displayWrap.innerHTML = `<button class="pf-pizza-add-btn" onclick="PadeiroEstoque.quickAddToCart('${id}', '${origDesc}', '${origCode}')">Adicionar</button>`;
        }
      }
    });

    // Update visible text
    const displayKg = document.getElementById('flow-wallet-kg-display');
    if (displayKg) displayKg.innerText = totalKg > 0 ? totalKg.toFixed(2) : '0.0';



    const displayUn = document.getElementById('flow-wallet-un-display');
    if (displayUn) displayUn.innerText = totalUn > 0 ? totalUn : '0';

    const displayItems = document.getElementById('flow-wallet-items-display');
    if (displayItems) displayItems.innerText = selectedCount;

    const bannerAction = document.getElementById('flow-recent-action');
    const bannerTitle = document.querySelector('.pf-wallet-banner-title');
    const avatarsContainer = document.getElementById('pf-wallet-avatars');

    if (bannerAction) {
      if (selectedCount > 0) {
        if (bannerTitle) bannerTitle.innerText = 'Produtos Selecionados';
        bannerAction.innerText = `${selectedCount} item(s) no relatório`;
        bannerAction.style.background = 'rgba(16, 185, 129, 0.2)';
        bannerAction.style.color = '#34d399';
        bannerAction.style.borderColor = 'rgba(16, 185, 129, 0.2)';

        if (avatarsContainer) {
          const cartKeys = Object.keys(this.cartItems);
          const maxAvatars = 5;
          let avatarsHtml = '';
          for (let i = 0; i < Math.min(cartKeys.length, maxAvatars); i++) {
            const key = cartKeys[i];
            const prod = this.activeProds.find(p => p.id === key);
            const code = prod ? (prod.codigo || '') : '';
            const hasPhoto = prod ? prod.temFoto : false;
            const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";
            const imgSrc = typeof OfflineManager !== 'undefined'
              ? OfflineManager.getProductPhotoSrc(code, hasPhoto, fallbackSvg)
              : (hasPhoto && code ? `/api/foto-produto/${code}` : fallbackSvg);
            avatarsHtml += `<div class="pf-wallet-avatar"><img src="${imgSrc}" /></div>`;
          }
          if (cartKeys.length > maxAvatars) {
            avatarsHtml += `<div class="pf-wallet-avatar-more">+${cartKeys.length - maxAvatars}</div>`;
          }
          avatarsContainer.innerHTML = avatarsHtml;
          avatarsContainer.style.display = 'flex';
        }
      } else {
        if (bannerTitle) bannerTitle.innerText = 'Produtos Faltantes';
        bannerAction.innerText = 'Nenhum item marcado';
        bannerAction.style.background = 'rgba(255, 255, 255, 0.1)';
        bannerAction.style.color = '#9ca3af';
        bannerAction.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        if (avatarsContainer) {
          avatarsContainer.style.display = 'none';
          avatarsContainer.innerHTML = '';
        }
      }
    }

    // Handle FAB (Floating Action Button)
    let fab = document.getElementById('pf-cart-fab');
    if (!fab) {
      fab = document.createElement('div');
      fab.id = 'pf-cart-fab';
      fab.className = 'pf-cart-fab';
      fab.onclick = () => PadeiroEstoque.openCartModal();
      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        <div id="pf-cart-badge" class="pf-cart-badge">0</div>
      `;
      document.body.appendChild(fab);
    }
    
    if (this.selectedClienteId) {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }
    
    const badge = document.getElementById('pf-cart-badge');
    if (badge) {
      badge.innerText = selectedCount;
      badge.style.display = selectedCount > 0 ? 'flex' : 'none';
    }
  },

  openCartModal() {
    let overlay = document.getElementById('pf-cart-modal-overlay');
    let savedScrollTop = 0;
    if (overlay) {
      const contentEl = overlay.querySelector('.pf-modal-ios-content');
      if (contentEl) {
        savedScrollTop = contentEl.scrollTop;
      }
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pf-cart-modal-overlay';
      overlay.className = 'pf-modal-overlay';
      overlay.onclick = (e) => { if (e.target === overlay) PadeiroEstoque.closeCartModal() };
      document.body.appendChild(overlay);
    }
    
    this.cartItems = this.cartItems || {};
    const itemIds = Object.keys(this.cartItems);
    
    let itemsHtml = '';
    let totalItemsCount = itemIds.length;
    let totalKg = 0;

    if (itemIds.length === 0) {
      itemsHtml = '<div style="text-align:center; padding: 32px 0; color: #64748b; font-weight:600;">Nenhum item marcado.</div>';
    } else {
      itemsHtml = itemIds.map(id => {
        const item = this.cartItems[id];
        if (item.un === 'KG') {
          totalKg += parseFloat(String(item.v).replace(',', '.')) || 0;
        }
        const prod = this.activeProds.find(p => p.id === id);
        const desc = prod ? (prod.descricao || 'Produto') : 'Produto';
        const code = prod ? (prod.codigo || '') : '';
        const hasPhoto = prod ? prod.temFoto : false;
        const imgSrc = typeof OfflineManager !== 'undefined'
          ? OfflineManager.getProductPhotoSrc(code, hasPhoto, '')
          : (hasPhoto && code ? `/api/foto-produto/${code}` : '');
        return `
          <div class="pf-ios-card">
            <div class="pf-ios-card-img">
               ${imgSrc 
                 ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">` 
                 : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block; color:#94a3b8;"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
               }
            </div>
            <div class="pf-ios-card-body">
              <div>
                <h4 class="pf-ios-card-title">${desc}</h4>
                <p class="pf-ios-card-desc">Cód: ${code || '---'}</p>
              </div>
              <div class="pf-ios-card-controls">
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                  <div class="pf-ios-qty-wrap">
                    <div class="pf-ios-qty-btn" onclick="PadeiroEstoque.changeCartItemQty('${id}', -1)" style="cursor: pointer; color: #1f4cff;">-</div>
                    <input type="text" class="pf-ios-qty-val" value="${item.v}" readonly>
                    <div class="pf-ios-qty-btn" onclick="PadeiroEstoque.changeCartItemQty('${id}', 1)" style="cursor: pointer; color: #1f4cff;">+</div>
                  </div>
                  <select class="pf-ios-unit-select" onchange="PadeiroEstoque.changeCartItemUnit('${id}', this.value)" style="margin-top: 4px; padding: 2px 6px; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 4px; color: #1f4cff; font-weight: 800; background: transparent; outline: none; text-transform: uppercase;">
                    <option value="KG" ${item.un==='KG' || item.un==='L'?'selected':''}>KG</option>
                    <option value="UN" ${item.un==='UN'?'selected':''}>UN</option>
                    <option value="PCT" ${item.un==='PCT'?'selected':''}>PCT</option>
                  </select>
                </div>
                <button class="pf-ios-remove" onclick="PadeiroEstoque.removeCartItem('${id}')">Remover</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
      
      itemsHtml += `
        <div class="pf-ios-add-more" onclick="PadeiroEstoque.closeCartModal()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Adicionar mais itens
        </div>
      `;
    }

    let totalKgStr = totalKg > 0 ? `${totalKg.toFixed(2).replace('.', ',')} KG` : '--';

    overlay.innerHTML = `
      <div class="pf-modal-ios">
        <div class="pf-modal-ios-header">
          <button class="pf-modal-ios-back" onclick="PadeiroEstoque.closeCartModal()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h3 class="pf-modal-ios-title">Relatório de Falta</h3>
          <div style="width:24px;"></div>
        </div>
        
        <div class="pf-modal-ios-content">
          ${itemsHtml}
        </div>
        
        <div class="pf-ios-bottom">
          <div class="pf-ios-summary-row">
            <span>Total de Itens</span>
            <span>${totalItemsCount}</span>
          </div>
          <div class="pf-ios-divider"></div>
          <div class="pf-ios-total-row">
            <span>Peso Total Estimado</span>
            <span>${totalKgStr}</span>
          </div>
          <button class="pf-ios-main-btn" onclick="PadeiroEstoque.saveEstoque()" ${totalItemsCount === 0 ? 'disabled' : ''}>
            Enviar Relatório
          </button>
        </div>
      </div>
    `;

    if (savedScrollTop > 0) {
      const contentEl = overlay.querySelector('.pf-modal-ios-content');
      if (contentEl) {
        contentEl.scrollTop = savedScrollTop;
      }
    }

    setTimeout(() => overlay.classList.add('active'), 10);
  },

  closeCartModal() {
    const overlay = document.getElementById('pf-cart-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  async saveEstoque() {
    const cliente = this.clientesAtendidos.find(c => (c.id || c._id) === this.selectedClienteId);
    if (!cliente) return;
    const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
    
    const itemIds = Object.keys(this.cartItems);
    if (itemIds.length === 0) {
      Components.toast('Nenhum item marcado como faltante.', 'warning');
      return;
    }

    // Format missing items as structured objects
    const itensFaltantes = itemIds.map(id => {
      const item = this.cartItems[id];
      const prod = this.activeProds.find(p => p.id === id);
      const desc = prod ? prod.descricao : 'Produto';
      const code = prod ? (prod.codigo || '') : '';
      return {
        id: id,
        codigo: code,
        descricao: desc,
        quantidade: item.v,
        unidade: item.un
      };
    });
    
    try {
      const mainBtn = document.querySelector('.pf-ios-main-btn');
      if (mainBtn) {
        mainBtn.innerHTML = 'Enviando...';
        mainBtn.disabled = true;
      }
      
      await API.post('/api/estoque', {
        clienteId: this.selectedClienteId,
        clienteNome: clientName,
        itensFaltantes: itensFaltantes
      });
      
      Components.toast('Relatório de estoque enviado com sucesso!', 'success');
      
      // Save current cartItems to the cache before clearing/exiting
      this.estoqueFaltante[this.selectedClienteId] = {};
      this.cartItems = {};
      
      this.closeCartModal();
      this.backToList();
      
    } catch (error) {
      console.error('Erro ao salvar estoque:', error);
      Components.toast('Erro ao enviar relatório de estoque.', 'error');
      
      const mainBtn = document.querySelector('.pf-ios-main-btn');
      if (mainBtn) {
        mainBtn.innerHTML = 'Enviar Relatório';
        mainBtn.disabled = false;
      }
    }
  }
};
