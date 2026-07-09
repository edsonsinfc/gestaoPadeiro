/**
 * Vendedor Module - Salesperson views and dashboards
 * BRAGO Sistema Vendedor - Apple HIG Premium Redesign
 */

const VendedorDashboard = {
  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.loading();
    
    try {
      const user = API.getUser();
      const initials = user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      
      // Load actual data in parallel (bakers, activities, evaluations, and clients)
      const [bakers, activities, evaluations, clients] = await Promise.all([
        API.get('/api/padeiros').catch(() => []),
        API.get('/api/atividades').catch(() => []),
        API.get('/api/avaliacoes').catch(() => []),
        API.get('/api/clientes').catch(() => [])
      ]);

      // Filter clients belonging to this vendedor
      let assignedClients = clients;
      if (user && user.role === 'vendedor' && user.clienteIds) {
        let uClientes = [];
        try {
          uClientes = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
        } catch (e) {
          uClientes = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
        }
        if (uClientes && uClientes.length > 0) {
          assignedClients = clients.filter(c => uClientes.includes(c.id));
        }
      }

      // Filter activities that belong to assigned clients if any, and have valid photos
      let filteredActivities = activities;
      if (assignedClients && assignedClients.length > 0) {
        const clientIds = assignedClients.map(c => c.id);
        filteredActivities = activities.filter(a => clientIds.includes(a.clienteId));
      }

      const activitiesWithPhotos = filteredActivities.filter(a => 
        a.status === 'finalizada' && 
        a.fotos && 
        Array.isArray(a.fotos) && 
        a.fotos.length > 0
      );

      // List of premium colors/gradients for client initials stories
      const storyGradients = [
        'linear-gradient(135deg, #FF5E3A 0%, #FFA751 100%)',
        'linear-gradient(135deg, #1E4BFF 0%, #4F8AFF 100%)',
        'linear-gradient(135deg, #7B3FC4 0%, #A855F7 100%)',
        'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
        'linear-gradient(135deg, #EF4444 0%, #F87171 100%)'
      ];

      // 1. Stories HTML (Apple Horizontal Scroll Under Header â€” now showing Clients)
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
        if (!dateStr) return '1 dia atrÃ¡s';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 60) return `${Math.max(1, diffMins)} min atrÃ¡s`;
        if (diffHours < 24) return `${diffHours} h atrÃ¡s`;
        return `${diffDays} dias atrÃ¡s`;
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
              : 'Nenhuma observaÃ§Ã£o registrada.';
        
        const postedTime = timeAgo(a.terminadoEm || a.fimEm || a.inicioEm);
        const caption = `ProduÃ§Ã£o concluÃ­da de ${a.produtoNome || 'itens'} no cliente ${a.clienteNome}.`;
        
        // Render photos as carousel slides
        const carouselSlidesHtml = a.fotos.map(foto => {
          const imgSrc = foto.path ? foto.path.replace('/uploads/', '/storage/') : `/storage/producao/${foto.filename || foto.name}`;
          return `
            <div class="apple-carousel-slide">
              <img src="${imgSrc}" class="apple-post-image" alt="Foto de produÃ§Ã£o" />
            </div>
          `;
        }).join('');

        // Render dots indicators if there's more than 1 photo
        const dotsHtml = a.fotos.length > 1 ? `
          <div class="apple-carousel-dots">
            ${a.fotos.map((_, idx) => `
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
              ${a.fotos.length > 1 ? `
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
              
              <!-- AvaliaÃ§Ã£o do Cliente Card -->
              <div class="apple-metric-card" onclick="Components.toast('AvaliaÃ§Ã£o fornecida pelo cliente', 'info')">
                <div class="apple-metric-icon-box rating">
                  <i data-lucide="star" style="width: 18px; height: 18px; fill: currentColor;"></i>
                </div>
                <div class="apple-metric-info">
                  <span class="apple-metric-label">AvaliaÃ§Ã£o</span>
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
                ObservaÃ§Ã£o do Cliente
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
            <h3 style="font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 6px;">Nenhuma foto de produÃ§Ã£o</h3>
            <p style="font-size: 12px; line-height: 1.4; color: #86868b; max-width: 240px; margin: 0 auto;">As fotos enviadas pelos padeiros nas atividades finalizadas aparecerÃ£o aqui em tempo real.</p>
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
    const vendedorInitials = user ? user.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'VD';
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
                        stroke-dasharray="213.6" stroke-dashoffset="${213.6 - (213.6 * Math.min(100, Math.round((totalKg / 200) * 100))) / 100}"
                        stroke-linecap="round" transform="rotate(-90 40 40)" style="transition: stroke-dashoffset 0.5s ease;" />
                <!-- Texto central -->
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ffffff" font-size="16" font-weight="800">
                  ${Math.min(100, Math.round((totalKg / 200) * 100))}%
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
                <span class="cperfil-progress-stock-val">200 kg</span>
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
      container.innerHTML = Components.empty('alert-circle', 'Padeiro nÃ£o especificado.');
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
      const activitiesWithPhotos = completedActivities.filter(a => a.fotos && Array.isArray(a.fotos) && a.fotos.length > 0);

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

      // Highlights matching day bubbles: TerÃ§a, Quarta, Quinta, Sexta, SÃ¡bado, Domingo
      const highlights = [
        { label: 'TerÃ§a', initials: 'T' },
        { label: 'Quarta', initials: 'Q' },
        { label: 'Quinta', initials: 'Q' },
        { label: 'Sexta', initials: 'S' },
        { label: 'SÃ¡bado', initials: 'S' },
        { label: 'Domingo', initials: 'D' }
      ];

      // Photos of baker production
      const gridPhotos = [];
      activitiesWithPhotos.forEach(act => {
        act.fotos.forEach(foto => {
          const fileSrc = foto.path ? foto.path.replace('/uploads/', '/storage/') : `/storage/producao/${foto.filename || foto.name}`;
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
                <img src="${item.src}" alt="ProduÃ§Ã£o" />
                ${item.activity.fotos.length > 1 ? `<div class="ig-grid-carousel-icon"><i data-lucide="layers" style="width:14px; height:14px; color:#fff;"></i></div>` : ''}
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
                <span class="ig-profile-stat-label">mÃ©dia nota</span>
              </div>
            </div>
          </div>

          <!-- Profile Bio / Details -->
          <div class="ig-profile-bio-section">
            <h2 class="ig-profile-bio-name">${padeiro.nome}</h2>
            <span class="ig-profile-bio-username">@${username}</span>
            <span class="ig-profile-bio-role">Padeiro TÃ©cnico</span>
            <p class="ig-profile-bio-details">
              ðŸ“ Filial: ${padeiro.filial || 'BrasÃ­lia'}<br>
              ðŸž CÃ³d. TÃ©cnico: ${padeiro.codTec || 'N/A'}<br>
              âœ‰ï¸ Email: ${padeiro.email || 'NÃ£o informado'}
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

          <!-- Highlight Bubbles (Instagram Highlights style: TerÃ§a, Quarta, Quinta...) -->
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
            <div class="ig-profile-tab-item" onclick="Components.toast('Aba indisponÃ­vel', 'info')">
              <i data-lucide="play" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="ig-profile-tab-item" onclick="Components.toast('Aba indisponÃ­vel', 'info')">
              <i data-lucide="contact" style="width: 20px; height: 20px;"></i>
            </div>
          </div>

          <!-- Grid feed -->
          ${feedGridHtml}
        </div>
      `;

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
      'TerÃ§a': 2,
      'Quarta': 3,
      'Quinta': 4,
      'Sexta': 5,
      'SÃ¡bado': 6
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
      if (act.fotos && act.fotos.length > 0) {
        act.fotos.forEach(foto => {
          const fileSrc = foto.path ? foto.path.replace('/uploads/', '/storage/') : `/storage/producao/${foto.filename || foto.name}`;
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
      VendedorPadeiroPerfil.showAppleAlert('Sem Fotos', 'Este padeiro nÃ£o possui fotos.');
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
      : `<img src="${slide.src}" class="ig-story-content-image" alt="Story" />`;

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
            : 'Nenhuma observaÃ§Ã£o registrada.';

      const modalContent = `
        <div style="font-family: -apple-system, sans-serif; font-size: 13px; color: #1d1d1f; line-height: 1.5;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="background: rgba(0, 113, 227, 0.05); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0071e3;">
              <i data-lucide="map-pin" style="width: 18px; height: 18px;"></i>
            </div>
            <div>
              <h4 style="margin: 0; font-size: 14px; font-weight: 700;">${act.clienteNome}</h4>
              <span style="font-size: 11px; color: #86868b;">Atividade ConcluÃ­da</span>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            <div style="flex: 1; background: #f5f5f7; border-radius: 8px; padding: 8px; text-align: center;">
              <span style="font-size: 10px; color: #86868b; text-transform: uppercase; font-weight: 600; display: block;">Produzido</span>
              <strong style="font-size: 13px; color: #1d1d1f;">${act.kgTotal || 0} kg</strong>
            </div>
            <div style="flex: 1; background: #f5f5f7; border-radius: 8px; padding: 8px; text-align: center;">
              <span style="font-size: 10px; color: #86868b; text-transform: uppercase; font-weight: 600; display: block;">AvaliaÃ§Ã£o</span>
              <strong style="font-size: 13px; color: #1d1d1f;">â˜… ${score} / 5</strong>
            </div>
          </div>

          <div style="background: rgba(0, 113, 227, 0.02); border-left: 3px solid #0071e3; border-radius: 8px; padding: 10px; margin-bottom: 10px; font-style: italic;">
            <span style="font-weight: 600; font-size: 10px; color: #0071e3; display: block; text-transform: uppercase; margin-bottom: 2px; font-style: normal;">ObservaÃ§Ã£o do Cliente</span>
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

  // Paleta de 6 degradÃªs (cÃ­clica)
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
      if (user && user.role === 'vendedor' && user.clienteIds) {
        let uClientes = [];
        try {
          uClientes = Array.isArray(user.clienteIds) ? user.clienteIds : JSON.parse(user.clienteIds);
        } catch (e) {
          uClientes = typeof user.clienteIds === 'string' ? user.clienteIds.split(',') : [];
        }
        if (uClientes && uClientes.length > 0) {
          assignedClients = clients.filter(c => uClientes.includes(c.id));
        }
      }

      this.clients = assignedClients;
      this.activities = activities.filter(a => a.status === 'finalizada');
      this.padeiros = padeiros;
      this.filteredClients = [...this.clients];
      
      this.renderList();
      
      // Conectar filtro de busca uma Ãºnica vez
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

  // Calcula dados agregados para um cliente especÃ­fico
  getClientStats(clientId) {
    const clientActivities = this.activities.filter(a => a.clienteId === clientId);
    const totalKg = clientActivities.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);

    // Padeiros Ãºnicos que atenderam este cliente
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
      const initials = (p.nome || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      if (p.foto) {
        html += `<div class="wallet-card-avatar" style="background-image: url('${p.foto}');" title="${p.nome}"></div>`;
      } else {
        html += `<div class="wallet-card-avatar" title="${p.nome}">${initials}</div>`;
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
    
    if (this.filteredClients.length === 0) {
      container.innerHTML = Components.empty('search', 'Nenhum cliente encontrado.');
      return;
    }

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
                <span>Ver SugestÃµes</span>
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

    container.innerHTML = `
      <div class="wallet-cards-container">
        ${cardsHtml}
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
          const initials = (p.nome || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
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
        <!-- Header com degradÃª -->
        <div class="coupon-modal-header ${gradientClass}">
          <div class="coupon-modal-handle"></div>
          <button class="coupon-modal-close" onclick="VendedorClientes.closeCouponModal()">&times;</button>
          <span class="coupon-modal-header-label">Cliente</span>
          <span class="coupon-modal-header-title">${c.nomeFantasia || c.nome || 'Cliente'}</span>
          <span class="coupon-modal-header-desc">${c.bairro || 'Sem localidade'}</span>
        </div>

        <!-- DivisÃ³ria picotada -->
        <div class="coupon-modal-tear">
          <div class="coupon-modal-tear-notch left"></div>
          <div class="coupon-modal-tear-notch right"></div>
        </div>

        <!-- Body scrollÃ¡vel -->
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

          <!-- RazÃ£o Social -->
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label">RazÃ£o Social</span>
            <span class="coupon-modal-info-value">${c.nome || 'NÃ£o informada'}</span>
          </div>

          <!-- EndereÃ§o -->
          <div class="coupon-modal-info">
            <span class="coupon-modal-info-label">EndereÃ§o Completo</span>
            <span class="coupon-modal-info-value">${c.endereco || 'NÃ£o informado'}</span>
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

    // AnimaÃ§Ã£o de entrada
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

const VendedorAgendamentos = {
  async render() {
    const container = document.getElementById('page-container');
    container.innerHTML = Components.empty('calendar', 'Nenhum agendamento para hoje.');
    Components.renderIcons();
  }
};

