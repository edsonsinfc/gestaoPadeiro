/**
 * Vendedor Module - Salesperson views and dashboards
 * BRAGO Sistema Vendedor - Apple HIG Premium Redesign
 */

function parseClienteIds(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string') return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  try {
    const cleanStr = val.replace(/'/g, '"');
    const parsed = JSON.parse(cleanStr);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  const matches = val.match(/[a-zA-Z0-9]+/g);
  if (matches) {
    return matches.filter(id => id !== 'null' && id !== 'undefined');
  }
  return [];
}

const VendedorDashboard = {
  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    
    try {
      const user = API.getUser() || { nome: 'Vendedor', role: 'vendedor' };
      const initials = (user.nome || 'Vendedor').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      
      // Load actual data in parallel (bakers, activities, evaluations, and clients)
      const [bakers, activities, evaluations, clients] = await Promise.all([
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/avaliacoes').catch(() => []),
        API.get('/api/clientes').catch(() => [])
      ]);

      // Filter clients belonging to this vendedor
      let assignedClients = clients;
      if (user && user.role === 'vendedor') {
        const uClientes = parseClienteIds(user.clienteIds);
        if (uClientes.length > 0) {
          assignedClients = clients.filter(c => uClientes.includes(c.id));
        }
      }

      // Filter activities that belong to assigned clients if any, and have valid photos
      let filteredActivities = activities;
      if (assignedClients && assignedClients.length > 0) {
        const clientIds = assignedClients.map(c => c.id);
        filteredActivities = activities.filter(a => clientIds.includes(a.clienteId));
      }

      const activitiesWithPhotos = filteredActivities.filter(a => {
        const validFotos = (a.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
        return a.status === 'finalizada' && validFotos.length > 0;
      });

      // List of premium colors/gradients for client initials stories
      const storyGradients = [
        'linear-gradient(135deg, #FF5E3A 0%, #FFA751 100%)',
        'linear-gradient(135deg, #1E4BFF 0%, #4F8AFF 100%)',
        'linear-gradient(135deg, #7B3FC4 0%, #A855F7 100%)',
        'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
        'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
      ];

      // 1. Stories HTML (Apple Horizontal Scroll Under Header — now showing Clients)
      const storiesHtml = [];
      
      // Own story (first) with gray profile silhouette icon
      storiesHtml.push(`
        <div class="ig-story-item">
          <div class="ig-story-avatar-wrapper own-story">
            <div class="ig-story-avatar" style="display:flex; align-items:center; justify-content:center; background:#e8e8ed; color:#86868b;">
              <i data-lucide="user" style="width: 28px; height: 28px; stroke-width: 1.5;"></i>
            </div>
            <div class="ig-story-plus"><i data-lucide="plus" style="width:10px; height:10px; stroke-width:3;"></i></div>
          </div>
          <span class="ig-story-name">Seu story</span>
        </div>
      `);

      // Add clients as stories
      if (assignedClients && assignedClients.length > 0) {
        assignedClients.forEach((c, index) => {
          const clientName = c.nomeFantasia || c.nome || 'Cliente';
          const initials = clientName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
          const gradient = storyGradients[index % storyGradients.length];
          const displayName = clientName.length > 12 ? clientName.substring(0, 10) + '..' : clientName;

          storiesHtml.push(`
            <div class="ig-story-item" onclick="App.navigate('vendedor-cliente-perfil', { id: '${c.id}', nome: '${clientName.replace(/'/g, "\\'")}', cnpj: '${c.cnpj || '12.345.678/0001-90'}' })">
              <div class="ig-story-avatar-wrapper">
                <div class="ig-story-avatar" style="display:flex; align-items:center; justify-content:center; background: ${gradient}; color:#ffffff; font-weight:800; font-size:16px;">
                  ${initials}
                </div>
              </div>
              <span class="ig-story-name">${displayName}</span>
            </div>
          `);
        });
      } else {
        const mockStories = [
          { id: 'mock1', name: 'Brago DF', initials: 'BD', gradient: storyGradients[0], cnpj: '01.234.567/0001-89' },
          { id: 'mock2', name: 'Panificadora Sol', initials: 'PS', gradient: storyGradients[1], cnpj: '98.765.432/0001-10' },
          { id: 'mock3', name: 'Supermercado Central', initials: 'SC', gradient: storyGradients[2], cnpj: '45.678.901/0001-23' }
        ];
        mockStories.forEach(s => {
          storiesHtml.push(`
            <div class="ig-story-item" onclick="App.navigate('vendedor-cliente-perfil', { id: '${s.id}', nome: '${s.name}', cnpj: '${s.cnpj}' })">
              <div class="ig-story-avatar-wrapper">
                <div class="ig-story-avatar" style="display:flex; align-items:center; justify-content:center; background: ${s.gradient}; color:#ffffff; font-weight:800; font-size:16px;">
                  ${s.initials}
                </div>
              </div>
              <span class="ig-story-name">${s.name}</span>
            </div>
          `);
        });
      }

      // 2. Feed Posts HTML
      const feedPostsHtml = [];

      // Helper to calculate "time ago" string
      const timeAgo = (dateStr) => {
        if (!dateStr) return '1 dia atrás';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 60) return `${Math.max(1, diffMins)} min atrás`;
        if (diffHours < 24) return `${diffHours} h atrás`;
        return `${diffDays} dias atrás`;
      };

      // Add real baker uploads as single-post-cards containing image carousels
      activitiesWithPhotos.forEach(a => {
        const username = a.padeiroNome.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const initials = a.padeiroNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const kgTotal = a.kgTotal || 0;
        
        // Find client evaluation matching this activity
        const evalRecord = evaluations.find(ev => ev.atividadeId === a.id && ev.tipo === 'cliente');
        const score = a.notaCliente || (evalRecord ? evalRecord.nota : 5); 
        const comment = (evalRecord && evalRecord.observacao && evalRecord.observacao.trim())
          ? evalRecord.observacao.trim()
          : (a.observacaoCliente && a.observacaoCliente.trim())
            ? a.observacaoCliente.trim()
            : (a.observacao && a.observacao.trim())
              ? a.observacao.trim()
              : 'Nenhuma observação registrada.';
        
        const postedTime = timeAgo(a.terminadoEm || a.fimEm || a.inicioEm);
        const caption = `Produção concluída de ${a.produtoNome || 'itens'} no cliente ${a.clienteNome}.`;
        
        const validFotos = (a.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline);

        // Render photos as carousel slides
        const carouselSlidesHtml = validFotos.map(foto => {
          const imgSrc = foto.path.startsWith('http') ? foto.path : `${API_BASE_URL}${foto.path.replace('/uploads/', '/storage/')}`;
          return `
            <div class="apple-carousel-slide">
              <img src="" data-src="${imgSrc}" class="apple-post-image lazy-load-image" alt="Foto de produção" />
            </div>
          `;
        }).join('');

        // Render dots indicators if there's more than 1 photo
        const dotsHtml = validFotos.length > 1 ? `
          <div class="apple-carousel-dots">
            ${validFotos.map((_, idx) => `
              <div class="apple-carousel-dot ${idx === 0 ? 'active' : ''}"></div>
            `).join('')}
          </div>
        ` : '';

        feedPostsHtml.push(`
          <div class="apple-post-card">
            <!-- Post Header -->
            <div class="apple-post-header">
              <div class="ig-post-user-info" style="display: flex; align-items: center; gap: 10px;">
                <div class="ig-post-user-avatar" style="width:36px; height:36px; border-radius:50%; background:#f5f5f7; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--primary);">
                  ${initials}
                </div>
                <div class="ig-post-user-meta">
                  <span class="ig-post-username">${username}</span>
                  <span class="ig-post-location">
                    <i data-lucide="map-pin" style="width: 10px; height: 10px;"></i>
                    ${a.clienteNome}
                  </span>
                </div>
              </div>
              <span class="ig-post-date" style="font-size: 12px; color: #8e8e93; font-weight: 500;">
                ${a.data ? a.data.split('-').reverse().join('/') : ''}
              </span>
            </div>

            <!-- Swipeable Image Carousel with Nav Chevrons -->
            <div class="apple-post-image-wrapper" style="position: relative;">
              <div class="apple-carousel-container" onscroll="VendedorDashboard.handleCarouselScroll(this)">
                ${carouselSlidesHtml}
              </div>
              ${validFotos.length > 1 ? `
                <button class="apple-carousel-arrow left" onclick="VendedorDashboard.scrollCarousel(this, -1)">
                  <i data-lucide="chevron-left" style="width: 18px; height: 18px;"></i>
                </button>
                <button class="apple-carousel-arrow right" onclick="VendedorDashboard.scrollCarousel(this, 1)">
                  <i data-lucide="chevron-right" style="width: 18px; height: 18px;"></i>
                </button>
              ` : ''}
            </div>

            <!-- Dots Indicator Carousel -->
            ${dotsHtml}

            <!-- Bento Metrics Grid (Total Produced & Client Rating Cards) -->
            <div class="apple-metrics-grid">
              <!-- Total Produzido Card -->
              <div class="apple-metric-card" onclick="Components.toast('Total produzido pelo padeiro neste cliente', 'info')">
                <div class="apple-metric-icon-box production">
                  <i data-lucide="scale" style="width: 18px; height: 18px;"></i>
                </div>
                <div class="apple-metric-info">
                  <span class="apple-metric-label">Total Produzido</span>
                  <span class="apple-metric-value">${kgTotal} kg</span>
                </div>
              </div>
              
              <!-- Avaliação do Cliente Card -->
              <div class="apple-metric-card" onclick="Components.toast('Avaliação fornecida pelo cliente', 'info')">
                <div class="apple-metric-icon-box rating">
                  <i data-lucide="star" style="width: 18px; height: 18px; fill: currentColor;"></i>
                </div>
                <div class="apple-metric-info">
                  <span class="apple-metric-label">Avaliação</span>
                  <span class="apple-metric-value">${score} / 5</span>
                </div>
              </div>
            </div>

            <!-- Caption -->
            <div class="apple-caption-section">
              <span class="apple-caption-username">${username}</span>
              <span>${caption}</span>
            </div>

            <!-- Client Observations / Comments in feedback box -->
            <div class="apple-feedback-box">
              <div class="apple-feedback-header">
                <i data-lucide="message-square" style="width: 13px; height: 13px;"></i>
                Observação do Cliente
              </div>
              <div class="apple-feedback-text">"${comment}"</div>
            </div>

            <!-- Metadata (Time) -->
            <div class="apple-post-time">
              <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
              <span>${postedTime}</span>
            </div>
          </div>
        `);
      });

      // Render Empty State if no real activities with photos are available
      if (feedPostsHtml.length === 0) {
        feedPostsHtml.push(`
          <div style="padding: 40px 20px; text-align: center; color: #86868b; background: #ffffff; border-radius: 20px; margin: 16px; border: 1px solid rgba(0, 0, 0, 0.03); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);">
            <div style="background: rgba(0, 113, 227, 0.05); width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #0071e3;">
              <i data-lucide="camera" style="width: 24px; height: 24px;"></i>
            </div>
            <h3 style="font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px;">Nenhuma foto de produção</h3>
            <p style="font-size: 12px; line-height: 1.4; color: #86868b; max-width: 240px; margin: 0 auto;">As fotos enviadas pelos padeiros nas atividades finalizadas aparecerão aqui em tempo real.</p>
          </div>
        `);
      }

      // Construct overall HTML with Apple rounded stories card
      container.innerHTML = `
        <div class="ig-feed-container">
          <!-- Stories Bar (Apple HIG Styled Card) -->
          <div class="apple-stories-card">
            <div class="ig-stories-container">
              ${storiesHtml.join('')}
            </div>
          </div>

          <!-- Feed Posts -->
          <div class="ig-feed-posts">
            ${feedPostsHtml.join('')}
          </div>
        </div>
      `;

      // Carrega imagens via fetch para contornar ngrok bypass
      document.querySelectorAll('.lazy-load-image').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });

      // Render icons
      Components.renderIcons();
    } catch (e) {
      console.error(e);
      container.innerHTML = Components.empty('alert-circle', 'Erro ao carregar feed.');
    }
  },

  // Carousel Swipe Scroll Event Listener
  handleCarouselScroll(el) {
    const scrollLeft = el.scrollLeft;
    const width = el.clientWidth;
    const activeIndex = Math.round(scrollLeft / width);
    
    // Find the dots wrapper that is in the parent post card
    const dotsContainer = el.closest('.apple-post-card').querySelector('.apple-carousel-dots');
    if (!dotsContainer) return;
    
    const dots = dotsContainer.querySelectorAll('.apple-carousel-dot');
    dots.forEach((dot, index) => {
      if (index === activeIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  },

  // Clickable chevrons scroll helper
  scrollCarousel(btn, direction) {
    const wrapper = btn.closest('.apple-post-image-wrapper');
    const container = wrapper.querySelector('.apple-carousel-container');
    const width = container.clientWidth;
    container.scrollBy({ left: direction * width, behavior: 'smooth' });
  },


  // Perfil do Cliente — dados reais do sistema
  async renderClientePerfil(routeData) {
    const container = document.getElementById('page-container');
    if (!container) return;

    // Loading state
    container.innerHTML = Components.loading();

    const user = API.getUser();
    const vendedorInitials = (user && user.nome) ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'VD';
    const clientId = routeData.id;

    // --- Buscar dados reais em paralelo ---
    let clienteData = null;
    let activities = [];
    try {
      const [clientesRes, atividadesRes] = await Promise.all([
        API.get('/api/clientes'),
        API.get('/api/atividades')
      ]);
      const clientes = Array.isArray(clientesRes) ? clientesRes : (clientesRes.data || []);
      activities = Array.isArray(atividadesRes) ? atividadesRes : (atividadesRes.data || []);

      // Encontrar o cliente pelo ID
      clienteData = clientes.find(c => c.id === clientId);
    } catch (err) {
      console.log('Erro ao carregar dados do perfil do cliente:', err);
    }

    // Dados do cliente
    const clientName = clienteData ? (clienteData.nomeFantasia || clienteData.nome) : (routeData.nome || 'Cliente');
    const clientCnpj = clienteData ? (clienteData.cnpj || '--') : (routeData.cnpj || '--');
    const clientInitial = clientName[0] ? clientName[0].toUpperCase() : 'C';

    // --- Filtrar atividades finalizadas deste cliente ---
    const clientActivities = activities.filter(a =>
      a.clienteId === clientId && a.status === 'finalizada'
    );

    // Total produzido (kgTotal)
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
    const totalFormatted = totalKg.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const totalDecimal = (totalKg % 1).toFixed(2).replace('0.', ',');

    // Estoque Alvo dinâmico do cliente (fallback para 200 kg)
    const estoqueAlvo = clienteData && clienteData.estoqueAlvo !== undefined && clienteData.estoqueAlvo !== null ? parseFloat(clienteData.estoqueAlvo) : 200;

    // Variacao: ultimos 30 dias vs 30 dias anteriores
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo  = new Date(now.getTime() - 60 * 86400000);

    const recentKg = clientActivities
      .filter(a => new Date(a.data) >= thirtyDaysAgo)
      .reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);
    const prevKg = clientActivities
      .filter(a => { const d = new Date(a.data); return d >= sixtyDaysAgo && d < thirtyDaysAgo; })
      .reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);

    let pctChange = 0;
    if (prevKg > 0) pctChange = Math.round(((recentKg - prevKg) / prevKg) * 100);
    else if (recentKg > 0) pctChange = 100;
    const pctSign = pctChange >= 0 ? '+' : '';
    const pctIcon = pctChange >= 0 ? 'trending-up' : 'trending-down';

    // --- Padeiros que atenderam este cliente (unicos) ---
    const G = [
      'linear-gradient(135deg, #1E4BFF 0%, #4F8AFF 100%)',
      'linear-gradient(135deg, #7B3FC4 0%, #A855F7 100%)',
      'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
    ];

    const bakerMap = {};
    clientActivities.forEach(a => {
      if (a.padeiroId && !bakerMap[a.padeiroId]) {
        bakerMap[a.padeiroId] = a.padeiroNome || 'Padeiro';
      }
    });
    const bakersList = Object.entries(bakerMap).slice(0, 4).map(([id, nome], i) => {
      const initials = nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      return { initials, nome, gradient: G[i % G.length] };
    });

    // Se nao houver padeiros, placeholder
    const bakersGridHtml = bakersList.length > 0
      ? bakersList.map(b => `<div class="cperfil-baker-bubble" style="background:${b.gradient}">${b.initials}</div>`).join('')
      : `<div style="grid-column:1/-1; text-align:center; color:#aaa; font-size:12px; padding:20px 0;">Nenhum padeiro registrado</div>`;

    // --- Ultimos atendimentos (max 6) ---
    const recentActivities = clientActivities
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 6);

    const totalVisitas = clientActivities.length;

    // Helper: data relativa
    function timeAgo(dateStr) {
      const diff = now.getTime() - new Date(dateStr).getTime();
      const days = Math.floor(diff / 86400000);
      if (days === 0) return 'Hoje';
      if (days === 1) return 'Ontem';
      if (days < 7)  return 'Ha ' + days + ' dias';
      if (days < 30) return 'Ha ' + Math.floor(days / 7) + ' sem.';
      return 'Ha ' + Math.floor(days / 30) + ' mes(es)';
    }

    const ordersHtml = recentActivities.length > 0
      ? recentActivities.map((a, i) => {
          const pNome = a.padeiroNome || 'Padeiro';
          const pInitials = pNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
          const kg = parseFloat(a.kgTotal) || 0;
          return `
          <div class="cperfil-order-item cascade-item" style="--index:${6 + i}">
            <div class="cperfil-order-icon" style="background:${G[i % G.length]}">${pInitials}</div>
            <div class="cperfil-order-info">
              <div class="cperfil-order-name">${pNome}</div>
              <div class="cperfil-order-date">${timeAgo(a.data)}</div>
            </div>
            <span class="cperfil-order-kg">+${kg.toLocaleString('pt-BR')} kg</span>
          </div>`;
        }).join('')
      : `<div style="padding:24px; text-align:center; color:#aaa; font-size:13px;">Nenhum atendimento registrado</div>`;

    // --- SVG do grafico ---
    const chartSvg = `<svg viewBox="0 0 200 70" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22C55E" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#22C55E" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="M0,55 C30,50 50,42 80,32 C110,22 130,38 155,24 C175,14 190,18 200,10 L200,70 L0,70 Z" fill="url(#cFill)"/>
      <path d="M0,55 C30,50 50,42 80,32 C110,22 130,38 155,24 C175,14 190,18 200,10"
            stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="200" cy="10" r="3.5" fill="#22C55E"/>
    </svg>`;

    // --- Renderizar HTML ---
    container.innerHTML = `
      <div class="cperfil-screen">

        <div class="cperfil-hero">

          <div class="cperfil-hero-nav cascade-item" style="--index:0">
            <button class="cperfil-back-btn" onclick="App.navigate('vendedor-escala')">
              <i data-lucide="chevron-left"></i>
            </button>
            <span class="cperfil-nav-title">Perfil do cliente</span>
            <div class="cperfil-hero-avatar">${vendedorInitials}</div>
          </div>

          <div class="cperfil-greeting-card cascade-item" style="--index:1">
            <div class="cperfil-greeting-icon">${clientInitial}</div>
            <div class="cperfil-greeting-text">
              <div class="cperfil-greeting-hi">${clientName}</div>
              <div class="cperfil-greeting-sub">CNPJ: ${clientCnpj}</div>
            </div>
          </div>

          <!-- Gráfico circular e progresso de estoque -->
          <div class="cperfil-progress-container cascade-item" style="--index:2">
            <div class="cperfil-progress-circle-wrapper">
              <svg viewBox="0 0 80 80">
                <!-- Círculo de fundo -->
                <circle cx="40" cy="40" r="34" stroke="rgba(255, 255, 255, 0.15)" stroke-width="6" fill="transparent" />
                <!-- Círculo de progresso -->
                <circle cx="40" cy="40" r="34" stroke="#ffffff" stroke-width="6" fill="transparent"
                        stroke-dasharray="213.6" stroke-dashoffset="${213.6 - (213.6 * Math.min(100, Math.round((totalKg / estoqueAlvo) * 100))) / 100}"
                        stroke-linecap="round" transform="rotate(-90 40 40)" style="transition: stroke-dashoffset 0.5s ease;" />
                <!-- Texto central -->
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ffffff" font-size="16" font-weight="800">
                  ${Math.min(100, Math.round((totalKg / estoqueAlvo) * 100))}%
                </text>
              </svg>
            </div>
            <div class="cperfil-progress-info">
              <span class="cperfil-progress-title">Total produzido vs Estoque</span>
              <div class="cperfil-progress-value-row">
                <span class="cperfil-progress-val-main">${totalFormatted}</span>
                <span class="cperfil-progress-val-unit">${totalDecimal} kg</span>
              </div>
              <div class="cperfil-progress-stock-row">
                <span class="cperfil-progress-stock-lbl">Estoque Alvo:</span>
                <span class="cperfil-progress-stock-val">${estoqueAlvo.toLocaleString('pt-BR')} kg</span>
              </div>
            </div>
          </div>

          <div class="cperfil-actions cascade-item" style="--index:4">
            <button class="cperfil-action-side" onclick="Components.toast('${totalVisitas} visitas registradas', 'info')">
              <i data-lucide="clipboard-list"></i>
              ${totalVisitas} Visitas
            </button>
            <button class="cperfil-action-center" onclick="App.navigate('vendedor-agendar-atendimento')">
              <i data-lucide="calendar-plus"></i>
            </button>
            <button class="cperfil-action-side" onclick="Components.toast('${bakersList.length} padeiro(s) atendem este cliente', 'info')">
              <i data-lucide="users"></i>
              ${bakersList.length} Padeiros
            </button>
          </div>
        </div>

        <div class="cperfil-cards-row cascade-item" style="--index:5">

          <div class="cperfil-mini-card">
            <div class="cperfil-bakers-label">Padeiros que<br>atenderam este cliente</div>
            <div class="cperfil-bakers-grid">
              ${bakersGridHtml}
            </div>
          </div>

          <div class="cperfil-mini-card">
            <div class="cperfil-chart-label">Producao em kgs</div>
            <div class="cperfil-chart-area">${chartSvg}</div>
            <div class="cperfil-chart-val">${totalFormatted} kg</div>
            <span class="cperfil-chart-badge">
              <i data-lucide="${pctIcon}" style="width:9px;height:9px"></i>
              ${pctSign}${pctChange}%
            </span>
          </div>
        </div>

        <div class="cperfil-list-section cascade-item" style="--index:6">
          <div class="cperfil-list-header">
            <span class="cperfil-list-title">Ultimos atendimentos</span>
            <button class="cperfil-list-link">Ver todos</button>
          </div>
          <div class="cperfil-list-card">
            ${ordersHtml}
          </div>
        </div>

      </div>`;

    if (typeof Components !== 'undefined') Components.renderIcons();
  }

};






const VendedorPadeiroPerfil = {
  padeiro: null,
  completedActivities: [],
  avatarUrl: '',
  activeSlides: [],
  currentStoryIndex: 0,
  storyInterval: null,

  async render(data) {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();

    const padeiroId = data.id;
    if (!padeiroId) {
      container.innerHTML = Components.empty('alert-circle', 'Padeiro não especificado.');
      return;
    }

    try {
      // Load details, activities, and evaluations for this specific baker
      const [padeiro, activities, evaluations] = await Promise.all([
        API.get(`/api/padeiros/${padeiroId}`),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/avaliacoes').catch(() => [])
      ]);

      // Filter activities completed by this baker
      const completedActivities = activities.filter(a => a.padeiroId === padeiroId && a.status === 'finalizada');
      const activitiesWithPhotos = completedActivities.filter(a => {
        const validFotos = (a.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
        return validFotos.length > 0;
      });

      // Save references globally on the component for highlight stories clicks
      VendedorPadeiroPerfil.padeiro = padeiro;
      VendedorPadeiroPerfil.completedActivities = completedActivities;

      // 1. Calculate stats:
      const totalKg = completedActivities.reduce((acc, curr) => acc + (curr.kgTotal || 0), 0);
      
      const bakerEvaluations = evaluations.filter(ev => ev.padeiroId === padeiroId && ev.tipo === 'cliente');
      const avgScore = bakerEvaluations.length > 0
        ? (bakerEvaluations.reduce((acc, curr) => acc + (curr.nota || 0), 0) / bakerEvaluations.length).toFixed(1)
        : '5.0';

      const totalVisits = completedActivities.length;

      // Premium avatar assignment
      const premiumAvatars = [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop'
      ];
      
      const avatarIndex = data.index !== undefined ? data.index : Math.abs(padeiroId.charCodeAt(0) || 0);
      const avatarUrl = premiumAvatars[avatarIndex % premiumAvatars.length];
      VendedorPadeiroPerfil.avatarUrl = avatarUrl;
      const username = padeiro.nome.toLowerCase().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Highlights matching day bubbles: Terça, Quarta, Quinta, Sexta, Sábado, Domingo
      const highlights = [
        { label: 'Terça', initials: 'T' },
        { label: 'Quarta', initials: 'Q' },
        { label: 'Quinta', initials: 'Q' },
        { label: 'Sexta', initials: 'S' },
        { label: 'Sábado', initials: 'S' },
        { label: 'Domingo', initials: 'D' }
      ];

      // Photos of baker production
      const gridPhotos = [];
      activitiesWithPhotos.forEach(act => {
        const validFotos = (act.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
        validFotos.forEach(foto => {
          const fileSrc = foto.path.startsWith('http') ? foto.path : `${API_BASE_URL}${foto.path.replace('/uploads/', '/storage/')}`;
          gridPhotos.push({
            src: fileSrc,
            activity: act
          });
        });
      });

      // Build grid view HTML
      let feedGridHtml = '';
      if (gridPhotos.length > 0) {
        feedGridHtml = `
          <div class="ig-profile-grid">
            ${gridPhotos.map(item => `
              <div class="ig-grid-item" onclick="VendedorPadeiroPerfil.showPhotoDetail('${item.activity.id}')">
                <img src="" data-src="${item.src}" class="lazy-load-image" alt="Produção" />
                ${(item.activity.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline).length > 1 ? `<div class="ig-grid-carousel-icon"><i data-lucide="layers" style="width:14px; height:14px; color:#fff;"></i></div>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      } else {
        feedGridHtml = `
          <div style="padding: 60px 20px; text-align: center; color: #86868b; background:#fff">
            <i data-lucide="image" style="width: 32px; height: 32px; margin: 0 auto 12px; opacity: 0.5;"></i>
            <p style="font-size: 13px; font-weight: 500;">Nenhuma foto publicada ainda</p>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="ig-profile-container">
          <!-- Top Profile Header Row -->
          <div class="ig-profile-header-row">
            <!-- Profile Avatar -->
            <div class="ig-profile-avatar-circle">
              <img src="${avatarUrl}" alt="${padeiro.nome}" />
            </div>
            
            <!-- Stats Column (Instagram style) -->
            <div class="ig-profile-stats-col">
              <div>
                <span class="ig-profile-stat-number">${totalVisits}</span>
                <span class="ig-profile-stat-label">visitas</span>
              </div>
              <div>
                <span class="ig-profile-stat-number">${totalKg}</span>
                <span class="ig-profile-stat-label">total kg</span>
              </div>
              <div>
                <span class="ig-profile-stat-number">${avgScore}</span>
                <span class="ig-profile-stat-label">média nota</span>
              </div>
            </div>
          </div>

          <!-- Profile Bio / Details -->
          <div class="ig-profile-bio-section">
            <h2 class="ig-profile-bio-name">${padeiro.nome}</h2>
            <span class="ig-profile-bio-username">@${username}</span>
            <span class="ig-profile-bio-role">Padeiro Técnico</span>
            <p class="ig-profile-bio-details">
              ðŸ“ Filial: ${padeiro.filial || 'Brasília'}<br>
              ðŸž Cód. Técnico: ${padeiro.codTec || 'N/A'}<br>
              âœ‰ï¸ Email: ${padeiro.email || 'Não informado'}
            </p>
          </div>

          <!-- Follow & Action Buttons -->
          <div class="ig-profile-actions-row">
            <button onclick="App.navigate('vendedor-inicio')" class="ig-profile-btn-primary">
              Voltar ao Feed
            </button>
            <button onclick="Components.toast('Iniciando conversa no WhatsApp...', 'success')" class="ig-profile-btn-secondary">
              Enviar mensagem
            </button>
          </div>

          <!-- Highlight Bubbles (Instagram Highlights style: Terça, Quarta, Quinta...) -->
          <div class="ig-profile-highlights-row no-scrollbar">
            ${highlights.map(hl => `
              <div class="ig-highlight-item" onclick="VendedorPadeiroPerfil.openStory('${hl.label}')">
                <div class="ig-highlight-circle">
                  <div class="ig-highlight-inner">
                    ${hl.initials}
                  </div>
                </div>
                <span class="ig-highlight-label">${hl.label}</span>
              </div>
            `).join('')}
          </div>

          <!-- Tabs (Grid Icon, Video Icon, Tags Icon) -->
          <div class="ig-profile-tabs">
            <div class="ig-profile-tab-item active">
              <i data-lucide="grid" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="ig-profile-tab-item" onclick="Components.toast('Aba indisponível', 'info')">
              <i data-lucide="play" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="ig-profile-tab-item" onclick="Components.toast('Aba indisponível', 'info')">
              <i data-lucide="contact" style="width: 20px; height: 20px;"></i>
            </div>
          </div>

          <!-- Grid feed -->
          ${feedGridHtml}
        </div>
      `;

      // Carrega imagens via fetch para contornar ngrok bypass
      document.querySelectorAll('.lazy-load-image').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });

      Components.renderIcons();
    } catch (e) {
      console.error(e);
      container.innerHTML = Components.empty('alert-circle', 'Erro ao carregar perfil do padeiro.');
    }
  },

  // Apple-style alert modal mimicking iOS alert popup
  showAppleAlert(title, message) {
    let alertContainer = document.getElementById('apple-alert-container');
    if (!alertContainer) {
      alertContainer = document.createElement('div');
      alertContainer.id = 'apple-alert-container';
      document.body.appendChild(alertContainer);
    }
    
    alertContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      animation: appleAlertFadeIn 0.2s ease-out;
    `;
    
    alertContainer.innerHTML = `
      <div style="
        width: 270px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 14px;
        text-align: center;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        animation: appleAlertScaleIn 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      ">
        <div style="padding: 20px 16px;">
          <h4 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.4px;">${title}</h4>
          <p style="margin: 0; font-size: 13px; color: #1d1d1f; line-height: 1.4;">${message}</p>
        </div>
        <div style="
          border-top: 0.5px solid rgba(0, 0, 0, 0.15);
          display: flex;
        ">
          <button onclick="document.getElementById('apple-alert-container').remove()" style="
            flex: 1;
            background: none;
            border: none;
            color: #0071e3;
            font-size: 17px;
            font-weight: 600;
            padding: 12px 0;
            cursor: pointer;
            outline: none;
            transition: background-color 0.1s;
          " ontouchstart="this.style.background='rgba(0,0,0,0.05)'" ontouchend="this.style.background='none'">
            OK
          </button>
        </div>
      </div>
      <style>
        @keyframes appleAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appleAlertScaleIn {
          from { transform: scale(1.15); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      </style>
    `;
  },

  // Highlight stories click - opens full screen Instagram style stories
  openStory(dayLabel) {
    const weekdaysMap = {
      'Domingo': 0,
      'Segunda': 1,
      'Terça': 2,
      'Quarta': 3,
      'Quinta': 4,
      'Sexta': 5,
      'Sábado': 6
    };

    const targetDayNum = weekdaysMap[dayLabel];
    const completedActivities = VendedorPadeiroPerfil.completedActivities || [];
    const padeiro = VendedorPadeiroPerfil.padeiro || { nome: 'Padeiro' };
    const avatarUrl = VendedorPadeiroPerfil.avatarUrl || '';
    
    // Filter activities completed on this day of the week
    const dayActivities = completedActivities.filter(act => {
      const actDate = new Date(act.terminadoEm || act.fimEm || act.data);
      return actDate.getDay() === targetDayNum;
    });

    const slides = [];
    dayActivities.forEach(act => {
      const validFotos = (act.fotos || []).filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
      if (validFotos.length > 0) {
        validFotos.forEach(foto => {
          const fileSrc = foto.path.startsWith('http') ? foto.path : `${API_BASE_URL}${foto.path.replace('/uploads/', '/storage/')}`;
          slides.push({
            type: 'image',
            src: fileSrc,
            title: act.clienteNome || 'Cliente',
            time: 'Recente'
          });
        });
      }
    });

    // Check if there are real photos. If NOT, trigger Apple-style alert and return!
    if (slides.length === 0) {
      VendedorPadeiroPerfil.showAppleAlert('Sem Fotos', 'Este padeiro não possui fotos.');
      return;
    }

    VendedorPadeiroPerfil.activeSlides = slides;
    VendedorPadeiroPerfil.currentStoryIndex = 0;
    
    // Render Story view
    VendedorPadeiroPerfil.renderStoryOverlay(dayLabel, avatarUrl);
    VendedorPadeiroPerfil.startStoryTimer();
  },

  renderStoryOverlay(dayLabel, avatarUrl) {
    let overlay = document.getElementById('ig-story-overlay-element');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ig-story-overlay-element';
      document.body.appendChild(overlay);
    }
    
    overlay.className = 'ig-story-overlay';
    overlay.style.display = 'flex';
    
    const slide = VendedorPadeiroPerfil.activeSlides[VendedorPadeiroPerfil.currentStoryIndex];
    if (!slide) {
      VendedorPadeiroPerfil.closeStory();
      return;
    }

    const targetAvatar = avatarUrl || VendedorPadeiroPerfil.avatarUrl || '';
    const progressBarsHtml = VendedorPadeiroPerfil.activeSlides.map((_, idx) => `
      <div class="ig-story-progress-bar">
        <div class="ig-story-progress-fill" id="story-progress-fill-${idx}"></div>
      </div>
    `).join('');

    const contentHtml = slide.type === 'text' 
      ? `<div class="ig-story-content-text-fallback">
           <span class="ig-story-large-text">${slide.text}</span>
         </div>`
      : `<img src="" data-src="${slide.src}" class="ig-story-content-image lazy-load-image" alt="Story" />`;

    overlay.innerHTML = `
      <!-- Progress indicators -->
      <div class="ig-story-progress-container">
        ${progressBarsHtml}
      </div>

      <!-- Header -->
      <div class="ig-story-header">
        <div class="ig-story-header-left">
          <div class="ig-story-header-avatar">
            ${slide.type === 'text' 
              ? `<div style="width:100%;height:100%;border-radius:50%;background:#e8e8ed;display:flex;align-items:center;justify-content:center;color:#86868b;font-weight:700;">${slide.title.substring(0, 2).toUpperCase()}</div>`
              : `<img src="${targetAvatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
            }
          </div>
          <span class="ig-story-header-name">${slide.title}</span>
          <span class="ig-story-header-time">${slide.time}</span>
        </div>
        <div class="ig-story-header-right">
          <button class="ig-story-close-btn" onclick="VendedorPadeiroPerfil.closeStory()">
            <i data-lucide="x" style="width: 24px; height: 24px;"></i>
          </button>
        </div>
      </div>

      <!-- Viewport & Tap Targets -->
      <div class="ig-story-viewport">
        <!-- Tap area left -->
        <div class="ig-story-touch-left" onclick="VendedorPadeiroPerfil.prevStory()"></div>
        <!-- Tap area right -->
        <div class="ig-story-touch-right" onclick="VendedorPadeiroPerfil.nextStory()"></div>
        
        <!-- Visible Nav Arrows for desktop navigation -->
        <button class="ig-story-arrow left" onclick="VendedorPadeiroPerfil.prevStory(); event.stopPropagation();">
          <i data-lucide="chevron-left" style="width: 24px; height: 24px;"></i>
        </button>
        <button class="ig-story-arrow right" onclick="VendedorPadeiroPerfil.nextStory(); event.stopPropagation();">
          <i data-lucide="chevron-right" style="width: 24px; height: 24px;"></i>
        </button>
        
        <!-- Main Story Content -->
        ${contentHtml}
      </div>

      <!-- Footer input -->
      <div class="ig-story-footer">
        <div class="ig-story-input-box">
          <input type="text" class="ig-story-input" placeholder="Responder a ${slide.title.toLowerCase().replace(/\s+/g, '')}..." />
        </div>
        <div class="ig-story-footer-icons">
          <i data-lucide="heart" style="width: 22px; height: 22px; stroke-width: 1.8;"></i>
          <i data-lucide="send" style="width: 22px; height: 22px; stroke-width: 1.8;"></i>
        </div>
      </div>
    `;

    // Carrega imagens via fetch para contornar ngrok bypass
    document.querySelectorAll('.lazy-load-image').forEach(img => {
      ImageLoader.load(img, img.dataset.src);
    });

    // Render Lucide icons
    lucide.createIcons();
    
    // Fill up previous indicators
    for (let i = 0; i < VendedorPadeiroPerfil.currentStoryIndex; i++) {
      const fill = document.getElementById(`story-progress-fill-${i}`);
      if (fill) fill.style.width = '100%';
    }
  },

  startStoryTimer() {
    clearInterval(VendedorPadeiroPerfil.storyInterval);
    
    const fill = document.getElementById(`story-progress-fill-${VendedorPadeiroPerfil.currentStoryIndex}`);
    if (!fill) return;

    let progress = 0;
    const intervalTime = 50;
    const step = 100 / (5000 / intervalTime);

    VendedorPadeiroPerfil.storyInterval = setInterval(() => {
      progress += step;
      if (fill) fill.style.width = `${Math.min(100, progress)}%`;
      
      if (progress >= 100) {
        clearInterval(VendedorPadeiroPerfil.storyInterval);
        VendedorPadeiroPerfil.nextStory();
      }
    }, intervalTime);
  },

  nextStory() {
    clearInterval(VendedorPadeiroPerfil.storyInterval);
    if (VendedorPadeiroPerfil.currentStoryIndex < VendedorPadeiroPerfil.activeSlides.length - 1) {
      VendedorPadeiroPerfil.currentStoryIndex++;
      VendedorPadeiroPerfil.renderStoryOverlay(null, VendedorPadeiroPerfil.avatarUrl);
      VendedorPadeiroPerfil.startStoryTimer();
    } else {
      VendedorPadeiroPerfil.closeStory();
    }
  },

  prevStory() {
    clearInterval(VendedorPadeiroPerfil.storyInterval);
    if (VendedorPadeiroPerfil.currentStoryIndex > 0) {
      const currentFill = document.getElementById(`story-progress-fill-${VendedorPadeiroPerfil.currentStoryIndex}`);
      if (currentFill) currentFill.style.width = '0%';
      
      VendedorPadeiroPerfil.currentStoryIndex--;
      const prevFill = document.getElementById(`story-progress-fill-${VendedorPadeiroPerfil.currentStoryIndex}`);
      if (prevFill) prevFill.style.width = '0%';

      VendedorPadeiroPerfil.renderStoryOverlay(null, VendedorPadeiroPerfil.avatarUrl);
      VendedorPadeiroPerfil.startStoryTimer();
    } else {
      const currentFill = document.getElementById(`story-progress-fill-0`);
      if (currentFill) currentFill.style.width = '0%';
      VendedorPadeiroPerfil.startStoryTimer();
    }
  },

  closeStory() {
    clearInterval(VendedorPadeiroPerfil.storyInterval);
    const overlay = document.getElementById('ig-story-overlay-element');
    if (overlay) {
      overlay.remove();
    }
  },

  // Modal displaying complete details of clicked photo
  async showPhotoDetail(activityId) {
    try {
      const act = await API.get(`/api/atividades/${activityId}`).catch(() => null);
      if (!act) return;

      const evalRecord = (await API.get('/api/avaliacoes').catch(() => [])).find(ev => ev.atividadeId === activityId && ev.tipo === 'cliente');
      const score = act.notaCliente || (evalRecord ? evalRecord.nota : 5);
      const comment = (evalRecord && evalRecord.observacao && evalRecord.observacao.trim())
        ? evalRecord.observacao.trim()
        : (act.observacaoCliente && act.observacaoCliente.trim())
          ? act.observacaoCliente.trim()
          : (act.observacao && act.observacao.trim())
            ? act.observacao.trim()
            : 'Nenhuma observação registrada.';

      const modalContent = `
        <div style="font-family: -apple-system, sans-serif; font-size: 13px; color: #1d1d1f; line-height: 1.5;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="background: rgba(0, 113, 227, 0.05); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0071e3;">
              <i data-lucide="map-pin" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 14px; font-weight: 700;">${act.clienteNome}</h4>
              <span style="font-size: 11px; color: #86868b;">Atividade Concluída</span>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            <div style="flex: 1; background: #f5f5f7; border-radius: 8px; padding: 8px; text-align: center;">
              <span style="font-size: 10px; color: #86868b; text-transform: uppercase; font-weight: 600; display: block;">Produzido</span>
              <strong style="font-size: 13px; color: #1d1d1f;">${act.kgTotal || 0} kg</strong>
            </div>
            <div class="apple-metric-card" style="flex: 1; background: #f5f5f7; border-radius: 8px; padding: 8px; text-align: center;">
              <span style="font-size: 10px; color: #86868b; text-transform: uppercase; font-weight: 600; display: block;">Avaliação</span>
              <strong style="font-size: 13px; color: #1d1d1f;">★ ${score} / 5</strong>
            </div>
          </div>

          <div style="background: rgba(0, 113, 227, 0.02); border-left: 3px solid #0071e3; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-style: italic;">
            <span style="font-weight: 600; font-size: 10px; color: #0071e3; display: block; text-transform: uppercase; margin-bottom: 2px; font-style: normal;">Observação do Cliente</span>
            "${comment}"
          </div>
        </div>
      `;

      Components.showModal('Detalhes do Registro', modalContent, `
        <button class="btn btn-secondary" onclick="Components.closeModal()" style="width: 100%;">Fechar</button>
      `);
      Components.renderIcons();
    } catch (e) {
      console.error(e);
      Components.toast('Erro ao abrir detalhe da foto.', 'error');
    }
  }
};

const VendedorClientes = {
  clients: [],
  activities: [],
  padeiros: [],
  filteredClients: [],
  searchListenerConnected: false,

  // Paleta de 6 degradês (cíclica)
  gradients: ['gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5', 'gradient-6'],

  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    
    try {
      // Buscar dados em paralelo
      const [clients, activities, padeiros] = await Promise.all([
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/padeiros').catch(() => [])
      ]);

      const user = API.getUser();
      let assignedClients = clients;
      if (user && user.role === 'vendedor') {
        const uClientes = parseClienteIds(user.clienteIds);
        if (uClientes.length > 0) {
          assignedClients = clients.filter(c => uClientes.includes(c.id));
        }
      }

      this.clients = assignedClients;
      this.activities = activities.filter(a => a.status === 'finalizada');
      this.padeiros = padeiros;
      this.filteredClients = [...this.clients];
      
      this.renderList();
      
      // Conectar filtro de busca uma única vez
      if (!this.searchListenerConnected) {
        document.addEventListener('app-search', (e) => {
          if (App.currentRoute === 'vendedor-clientes') {
            const query = e.detail.toLowerCase();
            this.filteredClients = this.clients.filter(c => 
              (c.nome && c.nome.toLowerCase().includes(query)) ||
              (c.nomeFantasia && c.nomeFantasia.toLowerCase().includes(query)) ||
              (c.cnpj && c.cnpj.includes(query)) ||
              (c.bairro && c.bairro.toLowerCase().includes(query))
            );
            this.renderList();
          }
        });
        this.searchListenerConnected = true;
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = Components.empty('alert-circle', 'Erro ao carregar lista de clientes.');
    }
  },

  // Calcula dados agregados para um cliente específico
  getClientStats(clientId) {
    const clientActivities = this.activities.filter(a => a.clienteId === clientId);
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);

    // Padeiros únicos que atenderam este cliente
    const padeiroIds = [...new Set(clientActivities.map(a => a.padeiroId).filter(Boolean))];
    const padeirosList = padeiroIds.map(pid => {
      const p = this.padeiros.find(pad => pad.id === pid);
      return p ? { id: p.id, nome: p.nome, foto: p.fotoPerfil || null } : null;
    }).filter(Boolean);

    return { totalKg, padeirosCount: clientActivities.length, padeirosList };
  },

  // Gera o HTML dos avatares sobrepostos (face pile)
  renderAvatars(padeirosList) {
    if (!padeirosList || padeirosList.length === 0) return '';

    const maxVisible = 3;
    const visible = padeirosList.slice(0, maxVisible);
    const extra = padeirosList.length - maxVisible;

    let html = '<div class="wallet-card-avatars">';

    visible.forEach(p => {
        const initials = ((p && p.nome) || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      if (p.foto) {
        html += `<div class="wallet-card-avatar" style="background-image: url('${p.foto}');" title="${(p && p.nome) || ''}"></div>`;
      } else {
        html += `<div class="wallet-card-avatar" title="${(p && p.nome) || ''}">${initials}</div>`;
      }
    });

    if (extra > 0) {
      html += `<div class="wallet-card-avatar wallet-card-avatar-extra">+${extra}</div>`;
    }

    html += '</div>';
    return html;
  },

  renderList() {
    const container = document.getElementById('page-container');
    
    // Calcular total acumulado de todos os clientes
    let totalAcumuladoKg = 0;
    this.clients.forEach(c => {
      const stats = this.getClientStats(c.id);
      totalAcumuladoKg += stats.totalKg;
    });

    // Encontrar cliente destaque
    let clienteDestaque = null;
    let maiorProducao = -1;
    this.clients.forEach(c => {
      const stats = this.getClientStats(c.id);
      if (stats.totalKg > maiorProducao) {
        maiorProducao = stats.totalKg;
        clienteDestaque = { cliente: c, totalKg: stats.totalKg };
      }
    });

    const user = API.getUser();
    const userName = user ? user.nome : 'Vendedor';
    const initials = user ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'VD';

    // Determinar saudação de acordo com o horário
    const hour = new Date().getHours();
    let greeting = 'Ola';
    if (hour >= 5 && hour < 12) greeting = 'Bom dia';
    else if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
    else greeting = 'Boa noite';

    const cardsHtml = this.filteredClients.map((c, index) => {
      const gradientClass = this.gradients[index % this.gradients.length];
      const stats = this.getClientStats(c.id);
      const clientName = c.nomeFantasia || c.nome || 'Cliente';
      const bairro = c.bairro ? `${c.bairro}` : '';

      return `
        <div class="coupon-card ${gradientClass}" onclick="VendedorClientes.showDetails('${c.id}')">
          <div class="coupon-main">
            <div>
              <div class="coupon-label">Cliente</div>
              <div class="coupon-title">${clientName}</div>
              ${bairro ? `<div class="coupon-desc">${bairro}</div>` : ''}
            </div>
            <div class="coupon-footer">
              <div class="coupon-badge" onclick="event.stopPropagation(); App.navigate('vendedor-agendamentos')">
                <i data-lucide="sparkles"></i>
                <span>Ver Sugestões</span>
              </div>
              ${this.renderAvatars(stats.padeirosList)}
            </div>
          </div>
          <div class="coupon-divider">
            <div class="coupon-notch-top"></div>
            <div class="coupon-notch-bottom"></div>
          </div>
          <div class="coupon-stub">
            <div class="coupon-stub-bg-icon">%</div>
            <div class="coupon-value">
              ${stats.totalKg.toFixed(0)}
              <span class="coupon-value-unit">Kg</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const highlightHtml = clienteDestaque && clienteDestaque.totalKg > 0 ? `
      <div class="vwallet-highlight-card" onclick="VendedorClientes.showDetails('${clienteDestaque.cliente.id}')">
        <div class="vwallet-highlight-badge">
          <i data-lucide="crown" style="width: 12px; height: 12px;"></i>
          Cliente Destaque
        </div>
        <div class="vwallet-highlight-title">${clienteDestaque.cliente.nomeFantasia || clienteDestaque.cliente.nome}</div>
        <div class="vwallet-highlight-desc">${clienteDestaque.totalKg.toFixed(0)} kg produzidos acumulados</div>
        <button class="vwallet-highlight-btn">
          Ver detalhes
          <i data-lucide="arrow-right" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    ` : `
      <div class="vwallet-highlight-card">
        <div class="vwallet-highlight-badge">Destaque</div>
        <div class="vwallet-highlight-title">Sem Destaques</div>
        <div class="vwallet-highlight-desc">Nenhum cliente com producao registrada ainda.</div>
      </div>
    `;

    container.innerHTML = `
      <div class="vwallet-screen">
        <!-- Header -->
        <div class="vwallet-header">
          <div class="vwallet-user-info">
            <span class="vwallet-greeting">${greeting},</span>
            <span class="vwallet-name">${userName}!</span>
          </div>
          <div class="vwallet-avatar">${initials}</div>
        </div>

        <!-- Balanço de kg -->
        <div class="vwallet-balance-card">
          <span class="vwallet-balance-label">Total produzido</span>
          <div class="vwallet-balance-row">
            <span class="vwallet-balance-value">${totalAcumuladoKg.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span class="vwallet-balance-currency">kg</span>
          </div>
        </div>

        <!-- Botões de Ação -->
        <div class="vwallet-actions">
          <button class="vwallet-action-btn" onclick="App.navigate('vendedor-sugestoes')">
            <i data-lucide="sparkles"></i>
            Ver sugestoes
          </button>
          <button class="vwallet-action-btn" onclick="App.navigate('vendedor-estoque')">
            <i data-lucide="package"></i>
            Ver estoque
          </button>
        </div>

        <!-- Card Cliente Destaque -->
        ${highlightHtml}

        <!-- Seção de Clientes -->
        <div class="vwallet-section-title">Seus Clientes</div>
        <div class="wallet-cards-container" style="padding-top: 4px;">
          ${cardsHtml || '<p style="text-align:center; color:#8e8e93; font-size:14px; padding: 20px 0;">Nenhum cliente cadastrado.</p>'}
        </div>
      </div>
    `;

    Components.renderIcons();
  },

  showDetails(id) {
    const c = this.clients.find(x => x.id === id);
    if (!c) return;

    const stats = this.getClientStats(c.id);
    const idx = this.filteredClients.findIndex(x => x.id === id);
    const gradientClass = idx !== -1 ? this.gradients[idx % this.gradients.length] : 'gradient-1';

    // Paleta de cores para avatares dos padeiros
    const avatarColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C42'];

    // Lista dos padeiros que atenderam
    const padeirosHtml = stats.padeirosList.length > 0
      ? stats.padeirosList.map((p, i) => {
          const initials = ((p && p.nome) || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
          const bgColor = avatarColors[i % avatarColors.length];
          return `
            <div class="coupon-modal-baker-item">
              <div class="coupon-modal-baker-avatar" style="background: ${bgColor};">
                ${initials}
              </div>
              <span class="coupon-modal-baker-name">${p.nome}</span>
            </div>
          `;
        }).join('')
      : '<p class="coupon-modal-baker-empty">Nenhum padeiro registrado para este cliente.</p>';

    // Remover modal anterior se existir
    const existing = document.getElementById('coupon-detail-modal');
    if (existing) existing.remove();

    // Criar overlay + sheet
    const overlay = document.createElement('div');
    overlay.id = 'coupon-detail-modal';
    overlay.className = 'coupon-modal-overlay';
    overlay.innerHTML = `
      <div class="coupon-modal-sheet">
        <!-- Header com degradê -->
        <div class="coupon-modal-header ${gradientClass}">
          <div class="coupon-modal-handle"></div>
          <button class="coupon-modal-close" onclick="VendedorClientes.closeCouponModal()">&times;</button>
          <span class="coupon-modal-header-label">Cliente</span>
          <span class="coupon-modal-header-title">${c.nomeFantasia || c.nome || 'Cliente'}</span>
          <span class="coupon-modal-header-desc">${c.bairro || 'Sem localidade'}</span>
        </div>

        <!-- Divisória picotada -->
        <div class="coupon-modal-tear">
          <div class="coupon-modal-tear-notch left"></div>
          <div class="coupon-modal-tear-notch right"></div>
        </div>

        <!-- Body scrollável -->
        <div class="coupon-modal-body">
          <!-- Stats -->
          <div class="coupon-modal-stats">
            <div class="coupon-modal-stat-card">
              <span class="coupon-modal-stat-label">Total Produzido</span>
              <span class="coupon-modal-stat-value">${stats.totalKg.toFixed(0)} <span class="stat-unit">Kg</span></span>
            </div>
            <div class="coupon-modal-stat-card">
              <span class="coupon-modal-stat-label">Visitas</span>
              <span class="coupon-modal-stat-value">${stats.padeirosCount}</span>
            </div>
          </div>

          <div class="coupon-modal-separator"></div>

          <!-- Razão Social -->
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label">Razão Social</span>
            <span class="coupon-modal-info-value">${c.nome || 'Não informada'}</span>
          </div>

          <!-- Endereço -->
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label">Endereço Completo</span>
            <span class="coupon-modal-info-value">${c.endereco || 'Não informado'}</span>
            <span class="coupon-modal-info-sub">${c.cidade || ''} - ${c.estado || ''}</span>
          </div>

          ${c.telefone ? `
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label">Telefone de Contato</span>
            <span class="coupon-modal-info-value">
              <a href="tel:${c.telefone}" style="color: #007AFF; text-decoration: none;">${c.telefone}</a>
            </span>
          </div>
          ` : ''}

          <div class="coupon-modal-separator"></div>

          <!-- Padeiros -->
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label" style="margin-bottom: 8px;">Padeiros que Atenderam</span>
            <div class="coupon-modal-bakers-list">
              ${padeirosHtml}
            </div>
          </div>
        </div>

        <!-- Footer fixo -->
        <div class="coupon-modal-footer">
          <button class="coupon-modal-footer-btn" onclick="VendedorClientes.closeCouponModal()">Fechar Detalhes</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Clicar no overlay escuro fecha o modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) VendedorClientes.closeCouponModal();
    });

    // Animação de entrada
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
    });
  },

  closeCouponModal() {
    const overlay = document.getElementById('coupon-detail-modal');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
  }
};

const VendedorSugestoesHelper = {
  isDataLoaded: false,
  estoqueRecords: [],
  clientes: [],
  atividades: [],
  padeiros: [],
  avaliacoes: [],
  produtos: [],
  selectedClienteId: null,
  activeRoute: null, // 'vendas', 'atendimento', or 'estoque'
  vendasCorrentes: [], // Temporário para a inserção de itens vendidos

  async loadData() {
    const [clientes, estoqueRecords, atividades, padeiros, avaliacoes, produtos] = await Promise.all([
      API.get('/api/clientes').catch(() => []),
      API.get('/api/estoque').catch(() => []),
      API.get('/api/atividades').catch(() => []),
      API.get('/api/padeiros').catch(() => []),
      API.get('/api/avaliacoes').catch(() => []),
      API.get('/api/produtos').catch(() => [])
    ]);

    this.clientes = clientes;
    this.estoqueRecords = estoqueRecords;
    this.atividades = atividades;
    this.padeiros = padeiros;
    this.avaliacoes = avaliacoes;
    this.produtos = produtos;
    this.isDataLoaded = true;
  },

  parseItemFaltante(item) {
    if (typeof item === 'object' && item !== null) {
      return {
        id: item.id || '',
        codigo: item.codigo || '',
        descricao: item.descricao || item.nome || 'Produto',
        quantidade: item.quantidade,
        unidade: item.unidade
      };
    }
    if (typeof item === 'string') {
      const match = item.match(/^([\d.,]+)\s+(\w+)\s+(?:de\s+)?(.+)$/i);
      if (match) {
        return {
          id: '',
          codigo: '',
          descricao: match[3],
          quantidade: match[1],
          unidade: match[2]
        };
      }
      return {
        id: '',
        codigo: '',
        descricao: item,
        quantidade: '?',
        unidade: ''
      };
    }
    return null;
  },

  getClientStats(clientId) {
    const clientActivities = this.atividades.filter(a => a.clienteId === clientId && a.status === 'finalizada');
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
    const totalVisitas = clientActivities.length;

    const clientActivityIds = clientActivities.map(a => a.id || a._id);
    const clientEvals = this.avaliacoes.filter(e =>
      e.tipo === 'cliente' && clientActivityIds.includes(e.atividadeId)
    );
    const mediaNota = clientEvals.length > 0
      ? clientEvals.reduce((sum, e) => sum + (parseFloat(e.nota || e.estrelas || 0)), 0) / clientEvals.length
      : null;

    const ultimasFotos = [];
    const sortedActs = [...clientActivities].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    for (const act of sortedActs) {
      if (act.fotos && Array.isArray(act.fotos)) {
        const validFotos = act.fotos.filter(f => f.path && f.path !== 'offline_pending' && !f.offline);
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
        const p = this.padeiros.find(pad => (pad.id || pad._id) === pid);
        return p ? { id: p.id || p._id, nome: p.nome || p.name } : null;
      })
      .filter(Boolean);

    return { totalKg, totalVisitas, mediaNota, ultimasFotos, padeirosList };
  },

  _renderPhotoGrid(fotos) {
    const cells = [];
    for (let i = 0; i < 3; i++) {
      const foto = fotos[i];
      if (foto) {
        cells.push(`
          <div class="escala-grid-cell">
            <img class="escala-grid-photo lazy-img" data-src="${foto}" alt="Foto ${i + 1}"
              onerror="this.parentElement.innerHTML='<div class=\\'escala-grid-cell--empty\\'><i data-lucide=\\'image-off\\'></i></div>'">
          </div>`);
      } else {
        cells.push(`
          <div class="escala-grid-cell escala-grid-cell--empty">
            <i data-lucide="image-off"></i>
          </div>`);
      }
    }
    return `<div class="escala-photo-grid">${cells.join('')}</div>`;
  },

  _renderAvatar(clientName, cardIndex) {
    const gradients = [
      'linear-gradient(135deg, #1E4BFF 0%, #4F8AFF 100%)',
      'linear-gradient(135deg, #7B3FC4 0%, #A855F7 100%)',
      'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
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
    if (!padeirosList || padeirosList.length === 0) {
      return `<div class="escala-pills"><span class="escala-pill escala-pill--muted">Sem padeiro atribuído</span></div>`;
    }
    const pills = padeirosList.slice(0, 2).map((p, i) => {
      const color = ['blue', 'purple', 'green', 'orange'][i % 4];
      const nome = p.nome || 'Padeiro';
      const display = Components.getDisplayName(nome);
      return `<span class="escala-pill escala-pill--${color}" title="${nome}">${display}</span>`;
    });
    return `<div class="escala-pills">${pills.join('')}</div>`;
  },

  _renderStats(stats) {
    const notaVal = stats.mediaNota !== null ? stats.mediaNota.toFixed(1).replace('.', ',') : '—';
    const kgVal = stats.totalKg > 0 ? (stats.totalKg >= 1000 ? (stats.totalKg / 1000).toFixed(1).replace('.', ',') + ' mil' : stats.totalKg.toFixed(0)) : '0';
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

  async renderList(routeType, forceReload = false) {
    this.activeRoute = routeType;
    this.selectedClienteId = null;

    const container = document.getElementById('page-container');
    if (container) {
      container.classList.remove('cperfil-active');
    }

    const iosHeader = document.getElementById('ios-header');
    if (iosHeader) iosHeader.style.display = '';
    const desktopHeader = document.querySelector('.ios-desktop-header');
    if (desktopHeader) desktopHeader.style.display = '';

    const hasCachedData = this.isDataLoaded;

    if (!hasCachedData || forceReload) {
      container.innerHTML = Components.empty('loader', 'Carregando clientes...');
      try {
        await this.loadData();
      } catch (e) {
        console.error(e);
        container.innerHTML = Components.empty('alert-circle', 'Erro ao carregar dados.');
        return;
      }
      this.drawList(container, routeType);
    } else {
      // Renderizar imediatamente usando dados em memória para velocidade instantânea
      this.drawList(container, routeType);
      
      // Atualizar dados em segundo plano de forma assíncrona
      this.loadData().then(() => {
        // Apenas redesenhar se o usuário ainda estiver na listagem e na mesma aba
        if (this.selectedClienteId === null && this.activeRoute === routeType) {
          this.drawList(container, routeType);
        }
      }).catch(console.error);
    }
  },

  drawList(container, routeType) {
    try {
      const user = API.getUser();
      // Filter clients
      const filtered = this.clientes.filter(c => {
        if (routeType !== 'estoque') {
          const hasEstoque = this.estoqueRecords.some(r => r.clienteId === c.id);
          if (!hasEstoque) return false;
        }

        // Vendedor scope filter
        if (user && user.role === 'vendedor' && user.clienteIds) {
          let uClientes = [];
          try {
            uClientes = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
          } catch (e) {
            uClientes = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
          }
          if (uClientes.length > 0) {
            return uClientes.includes(c.id);
          }
        }
        return true;
      });

      if (filtered.length === 0) {
        let msg = '';
        if (routeType === 'vendas') {
          msg = 'Nenhuma sugestão de venda disponível (nenhum cliente com estoque faltante registrado).';
        } else if (routeType === 'atendimento') {
          msg = 'Nenhuma sugestão de atendimento disponível (todos os clientes com estoque em dia).';
        } else {
          msg = 'Nenhum cliente atribuído ao seu perfil.';
        }
        container.innerHTML = Components.empty('sparkles', msg);
        return;
      }

      let cardsHtml = '';
      filtered.forEach((cliente, index) => {
        const clientId = cliente.id || cliente._id;
        const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
        const location = [cliente.bairro, cliente.cidade].filter(Boolean).join(', ');

        const stats = this.getClientStats(clientId);
        const photosHtml = this._renderPhotoGrid(stats.ultimasFotos);
        const avatarHtml = this._renderAvatar(clientName, index);
        const pillsHtml = this._renderPills(stats.padeirosList);
        const statsHtml = this._renderStats(stats);

        let btnLabel = '';
        let iconName = '';
        if (routeType === 'vendas') {
          btnLabel = 'Ver Itens Faltantes';
          iconName = 'trending-up';
        } else if (routeType === 'atendimento') {
          btnLabel = 'Ver Detalhes do Atendimento';
          iconName = 'calendar-days';
        } else {
          btnLabel = 'Ver Estoque';
          iconName = 'package';
        }

        cardsHtml += `
          <div class="escala-card scale-in">
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
              <button class="escala-btn-agendar" onclick="VendedorSugestoesHelper.openDetail('${clientId}')">
                <i data-lucide="${iconName}"></i>
                ${btnLabel}
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
      
      Components.renderIcons();
      if (window.lucide) lucide.createIcons();
      
      // Lazy load photos
      if (typeof ImageLoader !== 'undefined') {
        container.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
          ImageLoader.load(img, img.dataset.src);
        });
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = Components.empty('alert-circle', 'Erro ao renderizar dados.');
    }
  },

  openDetail(clientId) {
    this.selectedClienteId = clientId;
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.classList.add('cperfil-active');
    }
    
    // Hide headers matching baker detail behavior
    const iosHeader = document.getElementById('ios-header');
    if (iosHeader) iosHeader.style.display = 'none';
    const desktopHeader = document.querySelector('.ios-desktop-header');
    if (desktopHeader) desktopHeader.style.display = 'none';

    this.renderDetail(pageContainer);
  },

  backToList() {
    this.selectedClienteId = null;
    const pageContainer = document.getElementById('page-container');
    if (pageContainer) {
      pageContainer.classList.remove('cperfil-active');
    }

    const iosHeader = document.getElementById('ios-header');
    if (iosHeader) iosHeader.style.display = '';
    const desktopHeader = document.querySelector('.ios-desktop-header');
    if (desktopHeader) desktopHeader.style.display = '';

    this.renderList(this.activeRoute);
  },

  confirmPedidoFeito(clientId) {
    Components.confirm(
      'Deseja realmente marcar o pedido como feito? Isso zerará os produtos faltantes deste cliente.',
      async () => {
        try {
          // 1. Atualizar em memória no frontend imediatamente
          this.estoqueRecords = this.estoqueRecords.filter(r => r.clienteId !== clientId);
          
          // 2. Atualizar no cache IndexedDB em background
          if (typeof OfflineManager !== 'undefined') {
            OfflineManager.updateLocalCache(`/api/estoque/cliente/${clientId}`, 'DELETE', null).catch(console.error);
          }
          
          // 3. Feedback local e navegação instantânea
          Components.toast('Pedido marcado como feito!', 'success', 2000);
          this.backToList();
          
          // 4. Disparar requisição de rede em background (sem aguardar a resposta)
          API.delete(`/api/estoque/cliente/${clientId}`).catch(async (err) => {
            console.warn('[Vendedor] Falha no DELETE direto, salvando na fila offline:', err);
            if (typeof OfflineManager !== 'undefined') {
              try {
                const pending = await OfflineManager.getPendingRequests();
                const exists = pending.some(p => p.url === `/api/estoque/cliente/${clientId}` && p.method === 'DELETE');
                if (!exists) {
                  await OfflineManager.saveRequest(`/api/estoque/cliente/${clientId}`, 'DELETE', null);
                }
              } catch (e) {}
            }
          });
        } catch (e) {
          console.error(e);
          Components.toast('Erro ao processar pedido.', 'danger', 3000);
        }
      }
    );
  },

  renderDetail(container) {
    const cliente = this.clientes.find(c => c.id === this.selectedClienteId);
    if (!cliente) return this.backToList();

    if (this.activeRoute === 'estoque') {
      return this.renderSalesForm(container, cliente);
    }

    const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
    const clientCnpj = cliente.cnpj || 'Sem CNPJ';
    const clientInitial = clientName[0].toUpperCase();

    // Get all missing stock records for this client
    const clientRecords = this.estoqueRecords.filter(r => r.clienteId === this.selectedClienteId);
    clientRecords.sort((a, b) => new Date(b.dataRegistro) - new Date(a.dataRegistro));

    const recordsHtml = clientRecords.length === 0
      ? `<div style="text-align:center; padding: 48px 16px; color:#8e8e93; font-weight:600;">Sem registros de estoque faltante.</div>`
      : clientRecords.map(rec => {
          const pNome = rec.padeiroNome || 'Padeiro';
          const dateFormatted = rec.dataRegistro
            ? new Date(rec.dataRegistro).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })
            : '---';

          let parsedItens = [];
          if (Array.isArray(rec.itensFaltantes)) {
            parsedItens = rec.itensFaltantes;
          } else {
            try {
              parsedItens = JSON.parse(rec.itensFaltantes);
            } catch (e) {
              parsedItens = [];
            }
          }
          const totalItensCount = parsedItens.length;
          const recordId = rec.id || rec._id;

          return `
            <div class="fade-in" style="background: white; border-radius: 18px; padding: 16px; margin-bottom: 14px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span style="font-size: 11px; color:#8e8e93; font-weight: 600; display:block; text-transform:uppercase; letter-spacing: 0.2px;">Registrado por</span>
                  <strong style="font-size: 15px; color:#1c1c1e; display: flex; align-items: center; gap: 6px;">
                    <i data-lucide="user" style="width: 14px; height: 14px; color: #1E4BFF;"></i>
                    ${pNome}
                  </strong>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 11px; color:#8e8e93; font-weight: 600; display:block; text-transform:uppercase; letter-spacing: 0.2px;">Data da Falta</span>
                  <strong style="font-size: 13px; color:#1c1c1e; display: flex; align-items: center; gap: 6px; justify-content: flex-end;">
                    <i data-lucide="calendar" style="width: 13px; height: 13px; color: #8e8e93;"></i>
                    ${dateFormatted}
                  </strong>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.06);">
                <span style="font-size: 13px; font-weight: 600; color: #ef4444; background: rgba(239, 68, 68, 0.08); padding: 4px 10px; border-radius: 20px;">
                  ${totalItensCount} ${totalItensCount === 1 ? 'produto faltante' : 'produtos faltantes'}
                </span>
                <button onclick="VendedorSugestoesHelper.openFaltantesModal('${recordId}')" style="background: #1E4BFF; color: white; border: none; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s;">
                  Ver Produtos <i data-lucide="chevron-right" style="width: 12px; height: 12px;"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');

    let actionButtonHtml = '';
    if (this.activeRoute === 'atendimento' || this.activeRoute === 'estoque') {
      actionButtonHtml = `
        <div style="display: flex; gap: 12px; margin-top: 20px; width: 100%;">
          <button onclick="App.navigate('vendedor-agendar-atendimento', { clienteId: '${cliente.id}', clienteNome: '${clientName.replace(/'/g, "\\'")}' })" 
                  style="flex: 1; padding: 16px; background: #1E4BFF; color: white; border: none; border-radius: 16px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(30, 75, 255, 0.2);">
            <i data-lucide="calendar"></i>
            Agendar Atendimento
          </button>
          <button onclick="VendedorSugestoesHelper.confirmPedidoFeito('${cliente.id}')" 
                  style="flex: 1; padding: 16px; background: #22C55E; color: white; border: none; border-radius: 16px; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);">
            <i data-lucide="check-circle"></i>
            Pedido Feito
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="cperfil-screen" style="background:#f2f2f7; min-height:100%; padding-bottom:100px;">
        <!-- Header / Hero section matching Client Profile -->
        <div class="cperfil-hero" style="border-radius: 0 0 28px 28px; margin-bottom: 20px; padding: 20px 20px 24px;">
          <div class="cperfil-hero-nav">
            <button class="cperfil-back-btn" onclick="VendedorSugestoesHelper.backToList()">
              <i data-lucide="chevron-left"></i>
            </button>
            <span class="cperfil-nav-title" style="color: #fff; font-size:15px; font-weight:600;">
              ${this.activeRoute === 'vendas' ? 'Sugestão de Venda' : (this.activeRoute === 'atendimento' ? 'Sugestão de Atendimento' : 'Estoque do Cliente')}
            </span>
            <div style="width: 34px;"></div>
          </div>
          
          <div class="cperfil-greeting-card" style="margin-bottom: 0; margin-top: 10px; width: 100%; box-sizing: border-box;">
            <div class="cperfil-greeting-icon">${clientInitial}</div>
            <div class="cperfil-greeting-text">
              <div class="cperfil-greeting-hi">${clientName}</div>
              <div class="cperfil-greeting-sub">CNPJ: ${clientCnpj}</div>
            </div>
          </div>
        </div>

        <div style="padding: 0 16px;">
          <h3 style="font-size:16px; font-weight:800; color:#1c1c1e; margin-bottom: 12px; padding-left: 4px;">Histórico de Faltas</h3>
          
          <div class="pf-pizza-list">
            ${recordsHtml}
          </div>

          ${actionButtonHtml}
        </div>
      </div>
    `;

    Components.renderIcons();
    if (window.lucide) lucide.createIcons();
    if (typeof ImageLoader !== 'undefined') {
      container.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  },

  openFaltantesModal(recordId) {
    const record = this.estoqueRecords.find(r => (r.id || r._id) === recordId);
    if (!record) return;

    let list = [];
    if (Array.isArray(record.itensFaltantes)) {
      list = record.itensFaltantes;
    } else {
      try {
        list = JSON.parse(record.itensFaltantes);
      } catch (e) {
        list = [];
      }
    }
    const items = list.map(item => this.parseItemFaltante(item)).filter(Boolean);
    const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";

    const itemsHtml = items.length === 0
      ? `<div style="text-align:center; padding: 32px 0; color:#8e8e93; font-weight:600;">Nenhum produto faltante.</div>`
      : items.map(item => {
          const imgSrc = item.codigo ? `${API_BASE_URL}/api/foto-produto/${item.codigo}` : fallbackSvg;
          return `
            <div class="pf-ios-card" style="display:flex; align-items:center; justify-content:space-between; background:#fff; padding:12px; border-radius:16px; margin-bottom:12px; border:1px solid rgba(0,0,0,0.04);">
              <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                <div style="width:45px; height:45px; border-radius:10px; overflow:hidden; background:#f2f2f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <img data-product-code="${item.codigo || ''}" class="lazy-img" data-src="${imgSrc}" src="${fallbackSvg}" onerror="this.src='${fallbackSvg}'" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="min-width:0; flex:1;">
                  <h4 style="font-size:14px; font-weight:700; color:#1c1c1e; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.descricao}</h4>
                  <p style="font-size:11px; color:#8e8e93; margin:2px 0 0 0;">Cód: ${item.codigo || 'Sem código'}</p>
                </div>
              </div>
              <div style="flex-shrink:0;">
                <span class="pf-pizza-tag" style="background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.12); font-weight: 800; font-size: 12px; padding: 6px 12px; border-radius: 20px; white-space: nowrap;">
                  Falta: ${item.quantidade} ${item.unidade}
                </span>
              </div>
            </div>
          `;
        }).join('');

    let overlay = document.getElementById('pf-faltantes-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pf-faltantes-modal-overlay';
      overlay.className = 'pf-modal-overlay';
      overlay.onclick = (e) => { if (e.target === overlay) VendedorSugestoesHelper.closeFaltantesModal() };
      document.body.appendChild(overlay);
    }

    const dateStr = record.dataRegistro
      ? new Date(record.dataRegistro).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '---';

    overlay.innerHTML = `
      <div class="pf-modal-ios" style="position:fixed; bottom:0; left:0; right:0; background:#f2f2f7; border-top-left-radius:24px; border-top-right-radius:24px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 -8px 30px rgba(0,0,0,0.15); animation: slideUp 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94); z-index: 100000;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05); background:#fff; border-top-left-radius:24px; border-top-right-radius:24px;">
          <button onclick="VendedorSugestoesHelper.closeFaltantesModal()" style="background:none; border:none; color:#1E4BFF; font-size:14px; font-weight:600; cursor:pointer; padding: 4px 8px;">Voltar</button>
          <h3 style="font-size:16px; font-weight:800; color:#1c1c1e; margin:0;">Produtos Faltantes</h3>
          <div style="width:50px;"></div>
        </div>
        
        <div style="flex:1; overflow-y:auto; padding:20px 16px;">
          <div style="background:#fff; border-radius:12px; padding:12px; margin-bottom:16px; border:1px solid rgba(0,0,0,0.02); font-size:13px; color:#475569;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Registrado por:</span>
              <strong style="color:#1c1c1e;">${record.padeiroNome || 'Padeiro'}</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Data do registro:</span>
              <strong style="color:#1c1c1e;">${dateStr}</strong>
            </div>
          </div>
          ${itemsHtml}
        </div>
      </div>
    `;

    overlay.classList.add('active');
    if (window.lucide) lucide.createIcons();
    if (typeof ImageLoader !== 'undefined') {
      overlay.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  },

  closeFaltantesModal() {
    const overlay = document.getElementById('pf-faltantes-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
  },

  renderSalesForm(container, cliente) {
    const clientName = cliente.nomeFantasia || cliente.nome || 'Cliente';
    const clientCnpj = cliente.cnpj || 'Sem CNPJ';
    const clientInitial = clientName[0].toUpperCase();

    // Obter fornecedores únicos e ordená-los com prioridade para IREKS
    const forbiddenSup = ['DOUPAN', 'ORGAO', 'DIMINAS', 'MELHOR BOCADO', 'AB BRASIL', 'RICONI', 'ALUMIFORMAS', 'GOIAS', 'GOIÁS', 'POLICO', 'PONTA', 'SS ALIMENTOS', 'PEROLA SS'];
    let fornecedores = [...new Set(this.produtos.map(p => p.fornecedor).filter(f => f && f.trim() !== ''))]
      .filter(f => {
        const up = f.toUpperCase().trim();
        if (forbiddenSup.some(b => up.includes(b))) return false;
        if (up === 'SS' || up.startsWith('SS ') || up.endsWith(' SS') || up.includes(' SS ')) return false;
        return true;
      });
    const PRIORITY = ['IREKS'];
    fornecedores.sort((a, b) => {
      const isA = PRIORITY.some(p => a.toUpperCase().includes(p));
      const isB = PRIORITY.some(p => b.toUpperCase().includes(p));
      if (isA && !isB) return -1;
      if (!isA && isB) return 1;
      return a.localeCompare(b);
    });

    const supplierTabsHtml = `
      <div class="pf-pizza-tabs" style="margin-bottom: 16px; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch;">
        <div class="pf-pizza-tab active" onclick="VendedorSugestoesHelper.filterSalesByTab(this, 'all')" style="padding: 8px 16px; border-radius: 20px; background: #1E4BFF; color: #fff; font-weight: 700; font-size: 13px; border: 1px solid #1E4BFF; cursor: pointer; white-space: nowrap;">Todos</div>
        ${fornecedores.map(f => {
          const isPrio = PRIORITY.some(p => f.toUpperCase().includes(p));
          const style = isPrio ? 'background: #FFF9E6; color: #D97706; border-color: #FCD34D;' : 'background: #fff; color: #1c1c1e; border-color: rgba(0,0,0,0.05);';
          const icon = isPrio ? '<i data-lucide="star" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"></i>' : '';
          return `<div class="pf-pizza-tab" onclick="VendedorSugestoesHelper.filterSalesByTab(this, '${f.trim().toLowerCase()}')" style="padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; border: 1px solid; cursor: pointer; white-space: nowrap; ${style}">${icon}${f.trim().split(' ')[0]}</div>`;
        }).join('')}
      </div>
    `;

    container.innerHTML = `
      <div class="cperfil-screen" style="background:#f2f2f7; min-height:100%; padding-bottom:100px;">
        <div class="cperfil-hero" style="border-radius: 0 0 28px 28px; margin-bottom: 20px; padding: 20px 20px 24px;">
          <div class="cperfil-hero-nav">
            <button class="cperfil-back-btn" onclick="VendedorSugestoesHelper.backToList()">
              <i data-lucide="chevron-left"></i>
            </button>
            <span class="cperfil-nav-title" style="color: #fff; font-size:15px; font-weight:600;">
              Estoque do Cliente
            </span>
            <div style="width: 34px;"></div>
          </div>
          
          <div class="cperfil-greeting-card" style="margin-bottom: 0; margin-top: 10px; width: 100%; box-sizing: border-box;">
            <div class="cperfil-greeting-icon">${clientInitial}</div>
            <div class="cperfil-greeting-text">
              <div class="cperfil-greeting-hi">${clientName}</div>
              <div class="cperfil-greeting-sub">CNPJ: ${clientCnpj}</div>
            </div>
          </div>
        </div>

        <div style="padding: 0 16px;">
          <!-- 1. Banner de Vendas Selecionadas (Estilo Carteira Padeiro) -->
          <div class="pf-wallet-banner" style="margin-bottom: 16px; background: linear-gradient(135deg, #1E4BFF 0%, #0F2C99 100%); cursor: pointer;" onclick="VendedorSugestoesHelper.openSalesCartModal()">
            <div class="pf-wallet-banner-content">
              <div class="pf-wallet-banner-title" style="color: rgba(255,255,255,0.9); font-weight:700;">Produtos Selecionados</div>
              <span class="pf-wallet-banner-action" id="sales-banner-action" style="font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.15); color:#fff; border: 1px solid rgba(255,255,255,0.1); margin-top:6px; display:inline-block;">Nenhum item marcado</span>
            </div>
            <div class="pf-wallet-banner-icon" style="color: #fff; opacity: 0.9;">
              <i data-lucide="shopping-cart" style="width:28px;height:28px"></i>
            </div>
          </div>

          <!-- 2. Fornecedores Tabs -->
          ${supplierTabsHtml}

          <!-- Search Bar -->
          <div style="background: white; border-radius: 20px; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 4px 16px rgba(0,0,0,0.02);">
            <div style="position: relative; display: flex; align-items: center;">
              <input type="text" id="sales-search-input" placeholder="Buscar produto..." oninput="VendedorSugestoesHelper.filterSalesProducts()" style="width: 100%; padding: 12px 12px 12px 38px; border-radius: 12px; border: 1px solid #e5e5ea; font-size: 14px; background-color: #f2f2f7; color: #1c1c1e; box-sizing: border-box;">
              <i data-lucide="search" style="position: absolute; left: 12px; width: 18px; height: 18px; color: #8e8e93;"></i>
            </div>
          </div>

          <!-- Product Grid/List -->
          <h3 style="font-size: 16px; font-weight: 800; color: #1c1c1e; margin-bottom: 12px; padding-left: 4px;">Selecione os Produtos</h3>
          <div id="sales-products-grid" style="margin-bottom: 20px;"></div>
        </div>
      </div>
    `;

    this.vendasCorrentes = {}; // Mapeamento { [prodId]: { v: qty } }
    this.selectedClienteId = cliente.id;
    this.selectedFornecedor = 'all';
    this.filterSalesProducts();
    this.updateSalesTotals();

    Components.renderIcons();
    if (window.lucide) lucide.createIcons();
  },

  filterSalesByTab(tabElement, fornecedor) {
    const searchInput = document.getElementById('sales-search-input');
    if (searchInput) searchInput.value = '';

    // Atualizar classes ativas nas abas
    document.querySelectorAll('.pf-pizza-tabs .pf-pizza-tab').forEach(tab => {
      tab.classList.remove('active');
      // Restaurar cor padrão baseada se é IREKS ou não
      if (tab.innerHTML.includes('star')) {
        tab.style.background = '#FFF9E6';
        tab.style.color = '#D97706';
        tab.style.borderColor = '#FCD34D';
      } else {
        tab.style.background = '#fff';
        tab.style.color = '#1c1c1e';
        tab.style.borderColor = 'rgba(0,0,0,0.05)';
      }
    });

    if (tabElement) {
      tabElement.classList.add('active');
      tabElement.style.background = '#1E4BFF';
      tabElement.style.color = '#fff';
      tabElement.style.borderColor = '#1E4BFF';
    }

    this.selectedFornecedor = fornecedor;
    this.filterSalesProducts();
  },

  filterSalesProducts() {
    const searchInput = document.getElementById('sales-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const grid = document.getElementById('sales-products-grid');
    if (!grid) return;

    const filtered = this.produtos.filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const code = (p.codigo || '').toLowerCase();
      const matchQuery = desc.includes(query) || code.includes(query);

      const prodFornecedor = (p.fornecedor || '').trim().toLowerCase();
      const matchFornecedor = this.selectedFornecedor === 'all' || prodFornecedor === this.selectedFornecedor;

      return matchQuery && matchFornecedor;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center; padding: 48px 16px; background: white; border-radius: 20px; border: 1px solid rgba(0,0,0,0.03); color:#8e8e93; font-weight:600; font-size:13px;">
          Nenhum produto encontrado.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isSelected = !!this.vendasCorrentes[p.id];
      const qtyVal = isSelected ? this.vendasCorrentes[p.id].v : 0;
      const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";
      const imgSrc = typeof OfflineManager !== 'undefined'
        ? OfflineManager.getProductPhotoSrc(p.codigo, p.temFoto, fallbackSvg)
        : (p.temFoto && p.codigo ? `/api/foto-produto/${p.codigo}` : fallbackSvg);

      let actionHtml = '';
      if (isSelected) {
        actionHtml = `
          <div class="pf-pizza-tag" style="background: rgba(30, 75, 255, 0.08); color: #1E4BFF; border: 1px solid rgba(30, 75, 255, 0.12); font-weight: 800; font-size: 13px; padding: 6px 14px; border-radius: 20px; cursor: pointer; white-space: nowrap;" onclick="VendedorSugestoesHelper.openSalesCartModal()">
            ${qtyVal} kg
          </div>
        `;
      } else {
        const safeDesc = p.descricao.replace(/'/g, "\\'");
        const safeCode = (p.codigo || '').replace(/'/g, "\\'");
        actionHtml = `
          <button class="pf-pizza-add-btn" onclick="VendedorSugestoesHelper.quickAddSalesItem('${p.id}', '${safeDesc}', '${safeCode}')" style="background: #1E4BFF; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 12px; cursor: pointer;">
            Adicionar
          </button>
        `;
      }

      return `
        <div class="pf-pizza-row fade-in ${isSelected ? 'selected' : ''}" style="margin-bottom: 12px; background: #fff; padding: 12px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: space-between;">
          <div style="display:flex; align-items:center; gap: 12px; flex: 1; min-width: 0;">
            <div class="pf-pizza-img-wrap" style="width: 50px; height: 50px; border-radius: 10px; overflow:hidden; background: #f2f2f7; display:flex; align-items:center; justify-content:center; flex-shrink: 0;">
              <img data-product-code="${p.codigo || ''}" class="lazy-img" data-src="${imgSrc}" src="${fallbackSvg}" onerror="this.src='${fallbackSvg}'" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="pf-pizza-content" style="min-width: 0; flex: 1;">
              <h3 class="pf-pizza-title" style="font-size:14px; font-weight:700; color:#1c1c1e; margin:0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.descricao}</h3>
              <span class="pf-pizza-desc" style="font-size:11px; color:#8e8e93;">Cód: ${p.codigo || 'Sem código'}</span>
            </div>
          </div>
          <div style="margin-left: 12px; flex-shrink: 0;">
            ${actionHtml}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();

    // Resolver imagens lazy-load a partir do cache indexado do offline manager
    if (typeof OfflineManager !== 'undefined') {
      OfflineManager.loadLazyImages();
    }
    if (typeof ImageLoader !== 'undefined') {
      grid.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  },

  quickAddSalesItem(id, desc, code) {
    if (!this.vendasCorrentes[id]) {
      this.vendasCorrentes[id] = { v: 20 }; // Padrão 20kg
    }
    this.filterSalesProducts();
    this.updateSalesTotals();
  },

  changeSalesCartItemQty(id, delta) {
    if (!this.vendasCorrentes[id]) return;
    let val = parseFloat(this.vendasCorrentes[id].v) || 0;
    val += delta;
    if (val <= 0) {
      delete this.vendasCorrentes[id];
    } else {
      this.vendasCorrentes[id].v = parseFloat(val.toFixed(2));
    }
    this.updateSalesTotals();
    this.filterSalesProducts();
    this.openSalesCartModal();
  },

  changeSalesCartItemVal(id, textVal) {
    if (!this.vendasCorrentes[id]) return;
    const val = parseFloat(textVal);
    if (isNaN(val) || val <= 0) {
      delete this.vendasCorrentes[id];
    } else {
      this.vendasCorrentes[id].v = parseFloat(val.toFixed(2));
    }
    this.updateSalesTotals();
    this.filterSalesProducts();
  },

  removeSalesCartItem(id) {
    delete this.vendasCorrentes[id];
    this.updateSalesTotals();
    this.filterSalesProducts();
    this.openSalesCartModal();
  },

  updateSalesTotals() {
    const keys = Object.keys(this.vendasCorrentes);
    const bannerAction = document.getElementById('sales-banner-action');
    if (bannerAction) {
      if (keys.length > 0) {
        bannerAction.innerText = `${keys.length} produto(s) no relatório`;
        bannerAction.style.background = '#22c55e';
        bannerAction.style.color = '#fff';
      } else {
        bannerAction.innerText = 'Nenhum item marcado';
        bannerAction.style.background = 'rgba(255,255,255,0.15)';
        bannerAction.style.color = '#fff';
      }
    }

    // Floating Action Button (FAB)
    let fab = document.getElementById('pf-cart-fab');
    if (!fab) {
      fab = document.createElement('div');
      fab.id = 'pf-cart-fab';
      fab.className = 'pf-cart-fab';
      fab.onclick = () => VendedorSugestoesHelper.openSalesCartModal();
      fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        <div id="pf-cart-badge" class="pf-cart-badge">0</div>
      `;
      document.body.appendChild(fab);
    }

    if (this.selectedClienteId && this.activeRoute === 'estoque') {
      fab.classList.add('visible');
    } else {
      fab.classList.remove('visible');
    }

    const badge = document.getElementById('pf-cart-badge');
    if (badge) {
      badge.innerText = keys.length;
      badge.style.display = keys.length > 0 ? 'flex' : 'none';
    }
  },

  openSalesCartModal() {
    let overlay = document.getElementById('pf-cart-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pf-cart-modal-overlay';
      overlay.className = 'pf-modal-overlay';
      overlay.onclick = (e) => { if (e.target === overlay) VendedorSugestoesHelper.closeSalesCartModal() };
      document.body.appendChild(overlay);
    }

    const keys = Object.keys(this.vendasCorrentes);
    let itemsHtml = '';
    let totalKg = 0;

    if (keys.length === 0) {
      itemsHtml = '<div style="text-align:center; padding: 48px 0; color: #8e8e93; font-weight:600;">Nenhum item marcado. Adicione produtos na listagem.</div>';
    } else {
      itemsHtml = keys.map(id => {
        const item = this.vendasCorrentes[id];
        totalKg += item.v;

        const prod = this.produtos.find(p => p.id === id);
        const desc = prod ? prod.descricao : 'Produto';
        const code = prod ? prod.codigo : '';
        const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='12' cy='12' r='3'/><path d='M3 5h18M3 19h18M3 12h18'/></svg>";
        const imgSrc = typeof OfflineManager !== 'undefined' && prod
          ? OfflineManager.getProductPhotoSrc(prod.codigo, prod.temFoto, fallbackSvg)
          : (prod && prod.temFoto && prod.codigo ? `/api/foto-produto/${prod.codigo}` : fallbackSvg);

        return `
          <div class="pf-ios-card" style="display:flex; align-items:center; justify-content:space-between; background:#fff; padding:12px; border-radius:16px; margin-bottom:12px; border:1px solid rgba(0,0,0,0.04);">
            <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
              <div style="width:45px; height:45px; border-radius:10px; overflow:hidden; background:#f2f2f7; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <img data-product-code="${code || ''}" class="lazy-img" data-src="${imgSrc}" src="${fallbackSvg}" onerror="this.src='${fallbackSvg}'" style="width:100%; height:100%; object-fit:cover;">
              </div>
              <div style="min-width:0; flex:1;">
                <h4 style="font-size:14px; font-weight:700; color:#1c1c1e; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${desc}</h4>
                <p style="font-size:11px; color:#8e8e93; margin:2px 0 0 0;">Cód: ${code || '---'}</p>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
              <div style="display:flex; align-items:center; background:#f2f2f7; border-radius:10px; overflow:hidden; height:34px;">
                <button onclick="VendedorSugestoesHelper.changeSalesCartItemQty('${id}', -5)" style="border:none; background:transparent; width:30px; height:100%; font-size:16px; font-weight:800; color:#1E4BFF; cursor:pointer;">-</button>
                <input type="number" value="${item.v}" oninput="VendedorSugestoesHelper.changeSalesCartItemVal('${id}', this.value)" style="border:none; background:transparent; width:50px; text-align:center; font-weight:800; font-size:14px; color:#1c1c1e; outline:none; -moz-appearance: textfield; box-sizing: border-box;">
                <button onclick="VendedorSugestoesHelper.changeSalesCartItemQty('${id}', 5)" style="border:none; background:transparent; width:30px; height:100%; font-size:16px; font-weight:800; color:#1E4BFF; cursor:pointer;">+</button>
              </div>
              <span style="font-size:12px; color:#8e8e93; font-weight:600;">kg</span>
              <button onclick="VendedorSugestoesHelper.removeSalesCartItem('${id}')" style="background:rgba(239,68,68,0.08); border:none; color:#ef4444; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    overlay.innerHTML = `
      <div class="pf-modal-ios" style="position:fixed; bottom:0; left:0; right:0; background:#f2f2f7; border-top-left-radius:24px; border-top-right-radius:24px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 -8px 30px rgba(0,0,0,0.15); animation: slideUp 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94); z-index: 100000;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,0.05); background:#fff; border-top-left-radius:24px; border-top-right-radius:24px;">
          <button onclick="VendedorSugestoesHelper.closeSalesCartModal()" style="background:none; border:none; color:#1E4BFF; font-size:14px; font-weight:600; cursor:pointer; padding: 4px 8px;">Voltar</button>
          <h3 style="font-size:16px; font-weight:800; color:#1c1c1e; margin:0;">Venda Informada</h3>
          <div style="width:50px;"></div>
        </div>
        
        <div style="flex:1; overflow-y:auto; padding:20px 16px;">
          ${itemsHtml}
        </div>
        
        <div style="background:#fff; padding:16px 20px 32px 20px; border-top:1px solid rgba(0,0,0,0.05); box-sizing: border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <span style="font-size:14px; color:#8e8e93; font-weight:600;">Total Informado</span>
            <span style="font-size:20px; font-weight:800; color:#1E4BFF;">${totalKg.toLocaleString('pt-BR')} kg</span>
          </div>
          <button onclick="VendedorSugestoesHelper.submitEstoqueAlvo('${this.selectedClienteId}')" style="width:100%; padding:16px; background:#22C55E; color:white; border:none; border-radius:16px; font-weight:700; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px-12px rgba(34,197,94,0.2);">
            <i data-lucide="check"></i> Atualizar Estoque Alvo
          </button>
        </div>
      </div>
    `;

    overlay.classList.add('active');
    if (window.lucide) lucide.createIcons();
    if (typeof ImageLoader !== 'undefined') {
      overlay.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  },

  closeSalesCartModal() {
    const overlay = document.getElementById('pf-cart-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 400);
  },

  async submitEstoqueAlvo(clientId) {
    const keys = Object.keys(this.vendasCorrentes);
    if (keys.length === 0) {
      return Components.toast('Selecione pelo menos um produto e informe a quantidade.', 'warning');
    }

    const btn = document.querySelector('button[onclick*="submitEstoqueAlvo"]');
    const originalContent = btn ? btn.innerHTML : '';
    const originalBg = btn ? btn.style.background : '';

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.85';
      btn.style.pointerEvents = 'none';
      
      // Garantir keyframe de rotação
      if (!document.getElementById('pf-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'pf-spinner-style';
        style.innerHTML = `@keyframes pf-spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }

      btn.innerHTML = `<span style="display:inline-block; width:16px; height:16px; border:2.5px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation: pf-spin 0.6s linear infinite; margin-right:8px; vertical-align:middle; box-sizing:border-box;"></span> Enviando dados...`;
    }

    const totalKg = keys.reduce((sum, id) => sum + this.vendasCorrentes[id].v, 0);

    // Timeout para mudar o texto para "Quase lá..." se demorar
    const progressTimeout = setTimeout(() => {
      if (btn && btn.disabled) {
        btn.innerHTML = `<span style="display:inline-block; width:16px; height:16px; border:2.5px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation: pf-spin 0.6s linear infinite; margin-right:8px; vertical-align:middle; box-sizing:border-box;"></span> Quase lá...`;
      }
    }, 1200);

    try {
      const res = await API.patch(`/api/clientes/${clientId}/estoque-alvo`, { estoqueAlvo: totalKg });
      clearTimeout(progressTimeout);

      // Atualizar cache local na memória
      const localClient = this.clientes.find(c => c.id === clientId);
      if (localClient) {
        localClient.estoqueAlvo = totalKg;
      }

      if (btn) {
        btn.style.background = '#22C55E';
        btn.style.opacity = '1';
        btn.innerHTML = `<i data-lucide="check-circle-2" style="width:18px; height:18px; vertical-align:middle; margin-right:6px; display:inline-block;"></i> Sucesso! Estoque Atualizado`;
        if (window.lucide) lucide.createIcons();
      }

      // Esperar 1.5s para a animação de sucesso
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.closeSalesCartModal();
      
      const fab = document.getElementById('pf-cart-fab');
      if (fab) fab.classList.remove('visible');
      
      this.backToList();
    } catch (e) {
      clearTimeout(progressTimeout);
      console.error(e);
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        btn.style.background = originalBg;
        btn.innerHTML = originalContent;
      }
      Components.toast('Erro ao atualizar o estoque alvo no servidor.', 'danger');
    }
  }
};

const VendedorAgendamentos = {
  async render() {
    await VendedorSugestoesHelper.renderList('vendas');
  }
};

const VendedorSugestoes = {
  async render() {
    await VendedorSugestoesHelper.renderList('atendimento');
  }
};

const VendedorEstoque = {
  async render() {
    await VendedorSugestoesHelper.renderList('estoque');
  }
};

const VendedorCalculadora = {
  async render() {
    const container = document.getElementById('page-container');
    if (!container) return;
    
    container.innerHTML = `
      <div class="calculator-container" style="padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; color: var(--text-secondary); text-align: center;">
        <div style="background: rgba(0, 113, 227, 0.08); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; color: var(--primary); transition: transform 0.3s ease;">
          <i data-lucide="calculator" style="width: 38px; height: 38px;"></i>
        </div>
        <h2 style="font-size: 22px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Calculadora de Gastos</h2>
        <p style="font-size: 15px; max-width: 320px; line-height: 1.6; margin: 0 auto; color: var(--text-tertiary); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Esta funcionalidade está sendo preparada e estará disponível em breve.</p>
      </div>
    `;
    Components.renderIcons();
  }
};

