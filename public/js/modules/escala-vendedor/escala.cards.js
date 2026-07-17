/**
 * ARQUIVO: escala.cards.js — v2
 * MÓDULO: Escala de Atendimento — Vendedor
 * RESPONSABILIDADE: Renderizar os cards de clientes no design "Social Profile Card"
 *   Layout:
 *     1. Grade de 3 fotos (topo)
 *     2. Avatar circular centralizado com sobreposição
 *     3. Nome fantasia + local
 *     4. Pills com padeiros que atendem
 *     5. Linha de stats: Nota | Visitas | Kg Produzido
 *     6. Botão Agendar azul (full-width)
 * DEPENDE DE: escala.state.js (EscalaState)
 * USADO EM: escala.main.js
 */

const EscalaCards = {

  // Paleta de cores para os pills dos padeiros
  _pillColors: ['blue', 'purple', 'green', 'orange'],

  /**
   * Formata número com sufixo (ex: 1500 → "1,5 mil")
   */
  _fmt(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + ' mil';
    return parseFloat(n).toFixed(n % 1 === 0 ? 0 : 1).replace('.', ',');
  },

  /**
   * Gera o HTML da grade de fotos (3 células)
   * Fotos reais onde existirem, placeholder onde não
   */
  _renderPhotoGrid(fotos) {
    const cells = [];
    const totalCols = 3;

    for (let i = 0; i < totalCols; i++) {
      const foto = fotos[i];
      if (foto) {
        const url = typeof foto === 'string' ? foto : (foto.url || foto.path || '');
        // Usa data-src + ImageLoader para funcionar com ngrok no APK
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

  /**
   * Gera o avatar circular com as iniciais do cliente
   * Usa degradê baseado no índice do card para variar as cores
   */
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

  /**
   * Gera os pills dos padeiros que atendem o cliente
   */
  _renderPills(padeirosList) {
    if (!padeirosList || padeirosList.length === 0) {
      return `
        <div class="escala-pills">
          <span class="escala-pill escala-pill--muted">Sem padeiro atribuído</span>
        </div>`;
    }

    const pills = padeirosList.slice(0, 2).map((p, i) => {
      const color = this._pillColors[i % this._pillColors.length];
      const nome = p.nome || 'Padeiro';
      const display = nome.length > 16 ? nome.split(' ')[0] : nome;
      return `<span class="escala-pill escala-pill--${color}" title="${nome}">${display}</span>`;
    });

    return `<div class="escala-pills">${pills.join('')}</div>`;
  },

  /**
   * Gera a linha de stats (3 colunas)
   * Ordem: Nota | Visitas | Kg Produzido
   */
  _renderStats(stats) {
    // Nota média
    const notaVal = stats.mediaNota !== null
      ? stats.mediaNota.toFixed(1).replace('.', ',')
      : '—';

    // Kg produzido
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

  /**
   * Gera o HTML completo de um card de cliente
   * @param {Object} client  — dados do cliente
   * @param {Object} stats   — retorno de EscalaState.getClientStats(clientId)
   * @param {number} cardIndex — índice para variar cor do avatar
   */
  renderCard(client, stats, cardIndex) {
    const clientId = client.id || client._id;
    const clientName = client.nomeFantasia || client.nome || 'Cliente';
    const location = [client.bairro, client.cidade].filter(Boolean).join(', ');

    const photosHtml  = this._renderPhotoGrid(stats.ultimasFotos);
    const avatarHtml  = this._renderAvatar(clientName, cardIndex);
    const pillsHtml   = this._renderPills(stats.padeirosList);
    const statsHtml   = this._renderStats(stats);

    const safeNome = clientName.replace(/'/g, "\\'");

    return `
      <div class="escala-card">
        ${photosHtml}

        ${avatarHtml}

        <div class="escala-card-body">
          <!-- Nome fantasia -->
          <div class="escala-client-name">${clientName}</div>

          <!-- Local -->
          ${location ? `
            <div class="escala-client-location">
              <i data-lucide="map-pin"></i>
              <span>${location}</span>
            </div>` : ''}

          <!-- Pills padeiros -->
          ${pillsHtml}

          <!-- Stats -->
          ${statsHtml}

          <!-- Botão Agendar -->
          <button
            class="escala-btn-agendar"
            onclick="App.navigate('vendedor-agendar-atendimento', { clienteId: '${clientId}', clienteNome: '${safeNome}' })"
          >
            <i data-lucide="calendar-plus"></i>
            Agendar
          </button>
        </div>
      </div>`;
  },

  /**
   * Renderiza todos os cards na tela
   */
  renderAll() {
    const container = document.getElementById('page-container');
    if (!container) return;

    const { filteredClients } = EscalaState;

    if (filteredClients.length === 0) {
      container.innerHTML = `
        <div class="escala-empty">
          <i data-lucide="calendar-days"></i>
          <span class="escala-empty-title">Nenhum cliente na escala</span>
          <span class="escala-empty-sub">Os clientes atribuídos ao seu perfil aparecerão aqui.</span>
        </div>
        <button class="escala-floating-calendar" onclick="App.navigate('vendedor-agendar-atendimento')" title="Ver Calendário de Agendamentos">
          <i data-lucide="calendar"></i>
        </button>`;
      if (typeof Components !== 'undefined') Components.renderIcons();
      return;
    }

    const cardsHtml = filteredClients.map((c, i) => {
      const stats = EscalaState.getClientStats(c.id || c._id);
      return this.renderCard(c, stats, i);
    }).join('');

    container.innerHTML = `
      <div class="escala-list">${cardsHtml}</div>
      <button class="escala-floating-calendar" onclick="App.navigate('vendedor-agendar-atendimento')" title="Ver Calendário de Agendamentos">
        <i data-lucide="calendar"></i>
      </button>
    `;

    if (typeof Components !== 'undefined') Components.renderIcons();
    // Carrega as fotos com ImageLoader (header ngrok-skip-browser-warning)
    if (typeof ImageLoader !== 'undefined') {
      container.querySelectorAll('img.lazy-img[data-src]').forEach(img => {
        ImageLoader.load(img, img.dataset.src);
      });
    }
  }
};

