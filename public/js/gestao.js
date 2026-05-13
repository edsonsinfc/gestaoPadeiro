/**
 * Gestão Module - CRUD Padeiros, Produtos, Clientes
 * BRAGO Sistema Padeiro
 */
const Gestao = {
  currentTab: 'padeiros',
  searchTerm: '',
  allData: { padeiros: [], produtos: [], clientes: [], atividades: [], usuarios: [] },

  renderStyles() {
    if (document.getElementById('gestao-mobile-css')) return;
    const style = document.createElement('style');
    style.id = 'gestao-mobile-css';
    style.innerHTML = `
      @media (max-width: 430px) {
        :root {
          --apple-blue: #1C7EF2;
          --apple-gray: #8E8E93;
          --apple-bg: #F2F2F7;
          --apple-surface: #FFFFFF;
          --apple-separator: #E5E5EA;
          --apple-label: #000000;
          --apple-secondary-label: #3C3C43;
          --apple-orange: #FF9500;
          --apple-green: #34C759;
          --apple-purple: #AF52DE;
          --font-apple: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif;
        }

        #page-container { padding: 0 !important; background: var(--apple-bg) !important; overflow-x: hidden !important; }
        .gestao-view { padding: 16px !important; }
        .gestao-view .gestao-header-main { flex-direction: column !important; align-items: stretch !important; gap: 20px !important; margin-bottom: 24px !important; }
        .gestao-view .page-title { font: 700 28px/1.2 var(--font-apple) !important; letter-spacing: -0.5px !important; margin-bottom: 4px !important; }
        
        /* Menu de Navegação - Apple Style */
        .gestao-view .segmented-control { 
          width: calc(100% + 32px) !important; 
          margin-left: -16px !important;
          margin-right: -16px !important;
          overflow-x: auto !important; 
          justify-content: flex-start !important; 
          white-space: nowrap !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 4px 16px !important;
          gap: 8px !important;
          background: transparent !important;
          border-radius: 0 !important;
          height: auto !important;
        }
        .gestao-view .segmented-control::-webkit-scrollbar { display: none; }
        .gestao-view .segmented-slider { display: none !important; }
        .gestao-view .segmented-item { 
          flex: none !important; 
          padding: 8px 16px !important; 
          border-radius: 12px !important; 
          font: 500 14px var(--font-apple) !important;
          color: var(--apple-gray) !important;
          background: #E5E5EA !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          text-transform: none !important;
          letter-spacing: 0 !important;
          opacity: 1 !important;
          min-width: auto !important;
        }
        .gestao-view .segmented-item.active { 
          background: var(--apple-blue) !important; 
          color: white !important; 
          font-weight: 700 !important;
          box-shadow: 0 2px 8px rgba(28,126,242,0.3) !important;
        }

        /* Header da Lista */
        .gestao-list-header { 
          flex-direction: row !important; 
          justify-content: space-between !important;
          align-items: center !important; 
          margin-bottom: 16px !important;
          padding: 0 4px !important;
        }
        .gestao-list-header h3 { 
          font: 700 17px var(--font-apple) !important; 
          color: var(--apple-label) !important;
        }
        .gestao-list-header .badge {
          background: #D1D1D6 !important;
          color: #3A3A3C !important;
          font-size: 13px !important;
          padding: 2px 8px !important;
          border-radius: 10px !important;
          border: none !important;
        }

        /* Botão Novo Padeiro */
        .btn-new-padeiro { 
          width: 100% !important; 
          height: 50px !important; 
          border-radius: 14px !important; 
          background: var(--apple-blue) !important;
          box-shadow: 0 4px 14px rgba(28,126,242,0.3) !important;
          font: 600 15px var(--font-apple) !important;
          margin-bottom: 24px !important;
          border: none !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }

        /* Apple List & Cards */
        .desktop-only { display: none !important; }
        .tab-padeiros.card { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
        
        .apple-list { 
          display: flex !important; 
          flex-direction: column !important; 
          background: var(--apple-surface) !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          margin-bottom: 32px !important;
        }
        
        .apple-card {
          display: flex !important;
          align-items: center !important;
          padding: 12px 16px !important;
          min-height: 72px !important;
          position: relative !important;
          cursor: pointer !important;
          text-decoration: none !important;
          color: inherit !important;
        }
        
        .apple-card:not(:last-child)::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          left: 72px !important;
          height: 1px !important;
          background: var(--apple-separator) !important;
        }
        
        .apple-card:active { background: #F2F2F7 !important; }

        .apple-avatar {
          width: 44px !important;
          height: 44px !important;
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font: 700 15px var(--font-apple) !important;
          margin-right: 12px !important;
          flex-shrink: 0 !important;
        }

        .apple-card-info { flex: 1 !important; min-width: 0 !important; display: flex !important; flex-direction: column !important; gap: 2px !important; }
        
        .apple-card-top { display: flex !important; justify-content: space-between !important; align-items: baseline !important; gap: 8px !important; }
        .apple-card-name { font: 700 16px var(--font-apple) !important; color: var(--apple-label) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
        .apple-card-code { font: 400 13px var(--font-apple) !important; color: var(--apple-gray) !important; flex-shrink: 0 !important; }
        
        .apple-card-mid { display: flex !important; align-items: center !important; gap: 8px !important; }
        .apple-badge-pill { 
          font: 600 11px var(--font-apple) !important; 
          padding: 2px 8px !important; 
          border-radius: 999px !important; 
          text-transform: uppercase !important;
        }
        
        .apple-card-cpf { font: 400 13px var(--font-apple) !important; color: var(--apple-gray) !important; }
        
        .apple-chevron { color: #C7C7CC !important; margin-left: 8px !important; flex-shrink: 0 !important; }

        /* Badges de Cargo Apple */
        .badge-apple-blue { background: rgba(0, 122, 255, 0.1) !important; color: #007AFF !important; }
        .badge-apple-orange { background: rgba(255, 149, 0, 0.1) !important; color: #FF9500 !important; }
        .badge-apple-green { background: rgba(52, 199, 89, 0.1) !important; color: #34C759 !important; }
        .badge-apple-purple { background: rgba(175, 82, 222, 0.1) !important; color: #AF52DE !important; }
        .badge-apple-red { background: rgba(255, 59, 48, 0.1) !important; color: #FF3B30 !important; }
        .badge-apple-gray { background: rgba(142, 142, 147, 0.1) !important; color: #8E8E93 !important; }
      }
    `;
    document.head.appendChild(style);
  },

  async render() {
    this.renderStyles();

    // Listener para busca global (mobile iOS)
    if (!this._searchListenerAdded) {
      document.addEventListener('app-search', (e) => {
        if (App.currentRoute === 'gestao' || App.currentRoute === 'produtos' || App.currentRoute === 'clientes') {
          this.search(e.detail);
        }
      });
      this._searchListenerAdded = true;
    }

    const c = document.getElementById('page-container');
    const searchContainer = document.getElementById('global-search-container');
    if (searchContainer) {
      if (window.innerWidth <= 430) {
        searchContainer.innerHTML = '';
      } else {
        searchContainer.innerHTML = `
          <div class="input-icon-wrapper w-full">
            <i data-lucide="search"></i>
            <input class="input-control" type="text" placeholder="Buscar..." id="gestao-search-input" value="${this.searchTerm}" oninput="Gestao.search(this.value)">
          </div>
        `;
      }
    }

    c.innerHTML = `
    <div class="fade-in gestao-view">
      <div class="flex justify-between items-center mb-6 gestao-header-main">
        <h1 class="page-title" style="margin-bottom:0; font-size: 24px; font-weight: 700;">Gestão</h1>
        <div class="segmented-control" style="margin-bottom:0;" onclick="Components.createRipple(event, this)">
          <div class="segmented-slider" style="width: ${API.getUser().role === 'admin' ? '20%' : '25%'}; transform: translateX(${this.currentTab === 'produtos' ? '100%' : this.currentTab === 'clientes' ? '200%' : this.currentTab === 'atividades' ? '300%' : this.currentTab === 'usuarios' ? '400%' : '0'})"></div>
          <div class="segmented-item ${this.currentTab === 'padeiros' ? 'active' : ''}" onclick="Gestao.switchTab('padeiros')">Padeiros</div>
          <div class="segmented-item ${this.currentTab === 'produtos' ? 'active' : ''}" onclick="Gestao.switchTab('produtos')">Produtos</div>
          <div class="segmented-item ${this.currentTab === 'clientes' ? 'active' : ''}" onclick="Gestao.switchTab('clientes')">Clientes</div>
          <div class="segmented-item ${this.currentTab === 'atividades' ? 'active' : ''}" onclick="Gestao.switchTab('atividades')">Registros</div>
          ${['admin', 'gestor_geral'].includes(API.getUser().role) ? `
            <div class="segmented-item ${this.currentTab === 'usuarios' ? 'active' : ''}" onclick="Gestao.switchTab('usuarios')">Usuários</div>
          ` : ''}
        </div>
      </div>
      <div id="gestao-content">${Components.loading()}</div>
    </div>`;
    await this.loadTab();
  },

  async switchTab(tab) {
    this.currentTab = tab;
    this.searchTerm = '';
    const searchInput = document.getElementById('gestao-search-input');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.segmented-item').forEach(t => t.classList.remove('active'));
    const isSuper = ['admin', 'gestor_geral'].includes(API.getUser().role);
    const items = isSuper ? ['padeiros', 'produtos', 'clientes', 'atividades', 'usuarios'] : ['padeiros', 'produtos', 'clientes', 'atividades'];
    const idx = items.indexOf(tab);
    document.querySelectorAll('.segmented-item')[idx]?.classList.add('active');

    const slider = document.querySelector('.segmented-control .segmented-slider');
    if (slider) {
      slider.style.width = isSuper ? '20%' : '25%';
      slider.style.transform = `translateX(${idx * 100}%)`;
    }
    document.getElementById('gestao-content').innerHTML = Components.loading();
    await this.loadTab();
  },

  async loadTab() {
    try {
      const endpoint = this.currentTab === 'usuarios' ? 'management/users' : this.currentTab;
      const data = await API.get(`/api/${endpoint}`);
      this.allData[this.currentTab] = data;
      this.renderTabContent(data);
    } catch (e) {
      document.getElementById('gestao-content').innerHTML = `<div class="toast error">Erro: ${e.message}</div>`;
    }
  },

  search(val) {
    this.searchTerm = val;
    this.renderTabContent(this.allData[this.currentTab] || []);
  },

  renderTabContent(data) {
    const filtered = this.searchTerm
      ? data.filter(item => JSON.stringify(item).toLowerCase().includes(this.searchTerm.toLowerCase()))
      : data;
    const c = document.getElementById('gestao-content');

    if (this.currentTab === 'padeiros') this.renderPadeiros(c, filtered);
    else if (this.currentTab === 'produtos') this.renderProdutos(c, filtered);
    else if (this.currentTab === 'clientes') this.renderClientes(c, filtered);
    else if (this.currentTab === 'atividades') this.renderAtividades(c, filtered);
    else this.renderUsuarios(c, filtered);
    Components.renderIcons();
  },

  // -- PADEIROS --
  renderPadeiros(c, data) {
    c.innerHTML = `
    <div class="tab-padeiros card">
      <div class="flex justify-between items-center mb-6 gestao-list-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="chef-hat" class="text-primary"></i> 
          Lista de Padeiros
          <span class="badge badge-secondary">${data.length}</span>
        </h3>
      </div>
      
      <button class="btn btn-primary btn-new-padeiro" onclick="Gestao.openPadeiroForm()">
        <i data-lucide="plus"></i> Novo Padeiro
      </button>

      ${data.length === 0 ? '<div class="text-tertiary">Nenhum padeiro encontrado.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only" style="max-height:500px;">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);">
            <tr><th>Nome</th><th>Cargo</th><th>COD TEC</th><th>CPF</th><th>Filial</th><th>Email</th><th>Status</th><th style="text-align: right;">Ações</th></tr>
          </thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td style="font-weight:600; color: var(--text-primary);">${p.nome}</td>
                <td><span class="badge badge-${this.cargoBadge(p.cargo)}">${p.cargo || '-'}</span></td>
                <td style="font-family:monospace;color:var(--primary); font-weight:600;">${p.codTec || '-'}</td>
                <td class="text-secondary" style="font-size:13px">${this.formatCPF(p.cpf)}</td>
                <td class="text-secondary" style="font-size:13px">${(p.filial || '').replace('Brago ', '')}</td>
                <td class="text-secondary" style="font-size:13px">${p.email || '-'}</td>
                <td>${p.ativo ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}</td>
                <td style="text-align: right;">
                  <div class="row-actions flex gap-2 justify-end">
                    <button class="btn btn-icon btn-sm" onclick="Gestao.openPadeiroForm('${p.id}')"><i data-lucide="pencil" class="text-blue"></i></button>
                    <button class="btn btn-icon btn-sm" onclick="Gestao.deletePadeiro('${p.id}','${p.nome}')"><i data-lucide="trash-2" class="text-danger"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Apple List -->
      <div class="apple-list mobile-only">
        ${data.map(p => {
      const initials = this.getInitials(p.nome);
      const badgeClass = this.cargoBadge(p.cargo);
      const roleColor = this.getRoleColor(p.cargo);
      return `
          <div class="apple-card" onclick="Gestao.openPadeiroForm('${p.id}')">
            <div class="apple-avatar" style="background-color: ${roleColor}; color: ${this.getDarkColor(badgeClass)}">${initials}</div>
            <div class="apple-card-info">
              <div class="apple-card-top">
                <span class="apple-card-name">${p.nome}</span>
                <span class="apple-card-code">${p.codTec || ''}</span>
              </div>
              <div class="apple-card-mid">
                <span class="apple-badge-pill badge-apple-${badgeClass}">${p.cargo || '-'}</span>
              </div>
              <div class="apple-card-cpf">CPF: ${this.formatCPF(p.cpf)}</div>
            </div>
            <i data-lucide="chevron-right" class="apple-chevron" style="width:16px; height:16px;"></i>
          </div>`;
    }).join('')}
      </div>
      `}
    </div>`;
  },

  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  },

  getRoleColor(cargo) {
    const badge = this.cargoBadge(cargo);
    const colors = {
      'apple-blue': 'rgba(0, 122, 255, 0.1)',
      'apple-orange': 'rgba(255, 149, 0, 0.1)',
      'apple-green': 'rgba(52, 199, 89, 0.1)',
      'apple-purple': 'rgba(175, 82, 222, 0.1)',
      'apple-red': 'rgba(255, 59, 48, 0.1)',
      'blue': 'rgba(0, 122, 255, 0.1)',
      'purple': 'rgba(175, 82, 222, 0.1)',
      'red': 'rgba(255, 59, 48, 0.1)',
      'amber': 'rgba(255, 204, 0, 0.1)'
    };
    return colors[badge] || 'rgba(142, 142, 147, 0.1)';
  },

  getDarkColor(badge) {
    const colors = {
      'apple-blue': '#007AFF',
      'apple-orange': '#FF9500',
      'apple-green': '#34C759',
      'apple-purple': '#AF52DE',
      'apple-red': '#FF3B30',
      'blue': '#007AFF',
      'purple': '#AF52DE',
      'red': '#FF3B30',
      'amber': '#FFCC00'
    };
    return colors[badge] || '#8E8E93';
  },

  formatCPF(v) {
    if (!v) return '-';
    const clean = v.replace(/\D/g, '');
    if (clean.length !== 11) return v;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  cargoBadge(cargo) {
    if (!cargo) return 'amber';
    const c = cargo.toUpperCase();
    if (c.includes('PROMOTOR')) return 'apple-blue';
    if (c.includes('TRAINEE')) return 'apple-orange';
    if (c.includes('JUNIOR')) return 'apple-green';
    if (c.includes('ASSISTENTE')) return 'apple-purple';
    if (c.includes('SENIOR')) return 'purple';
    if (c.includes('PLENO')) return 'blue';
    if (c.includes('GESTOR')) return 'red';
    return 'amber';
  },

  openPadeiroForm(id) {
    const p = id ? this.allData.padeiros.find(x => x.id === id) : {};
    const isEdit = !!id;
    Components.showModal(isEdit ? 'Editar Padeiro' : 'Novo Padeiro', `
      <form id="padeiro-form">
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Nome Completo</label><input class="input-control" name="nome" value="${p.nome || ''}" required></div>
          <div class="form-group w-full"><label>Cargo</label>
            <select class="input-control" name="cargo">
              ${['PADEIRO TREINEE', 'PADEIRO JUNIOR', 'PADEIRO PLENO', 'PADEIRO SENIOR', 'GESTOR', 'PROMOTOR', 'ASSISTENTE DE PANIFICAÇÃO'].map(c =>
      `<option ${p.cargo === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>CPF</label><input class="input-control" name="cpf" value="${p.cpf || ''}"></div>
          <div class="form-group w-full"><label>RG</label><input class="input-control" name="rg" value="${p.rg || ''}"></div>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>COD TEC</label><input class="input-control" name="codTec" value="${p.codTec || ''}" ${isEdit ? '' : 'placeholder="Gerado automaticamente"'}></div>
          <div class="form-group w-full"><label>Filial</label>
            <select class="input-control" name="filial">
              ${['Brago Brasília', 'Brago Goiania', 'Brago Palmas', 'Brago Campo Grande'].map(f =>
        `<option ${p.filial === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Email</label><input class="input-control" type="email" name="email" value="${p.email || ''}" required></div>
          <div class="form-group w-full"><label>Telefone</label><input class="input-control" name="telefone" value="${p.telefone || ''}"></div>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Data de Nascimento</label><input class="input-control" type="date" name="dataNascimento" value="${p.dataNascimento || ''}"></div>
          <div class="form-group w-full"><label>Senha ${isEdit ? '(deixe em branco para não alterar)' : ''}</label><input class="input-control" type="password" name="senha" placeholder="${isEdit ? '••••••••' : 'Defina uma senha'}"></div>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Gestao.savePadeiro('${id || ''}')">Salvar</button>`
    );

    // Add CPF mask listener
    const cpfInput = document.querySelector('input[name="cpf"]');
    if (cpfInput) {
      cpfInput.maxLength = 14;
      cpfInput.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.substring(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = v;
      });
    }

    Components.renderIcons();
  },

  async savePadeiro(id) {
    const form = document.getElementById('padeiro-form');
    if (!form.checkValidity()) return form.reportValidity();

    const fd = new FormData(form);
    const body = Object.fromEntries(fd);
    try {
      if (id) await API.put(`/api/padeiros/${id}`, body);
      else await API.post('/api/padeiros', body);
      Components.closeModal();
      Components.toast(id ? 'Padeiro atualizado!' : 'Padeiro cadastrado!', 'success');
      await this.loadTab();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  deletePadeiro(id, nome) {
    if (confirm(`Deseja excluir o padeiro ${nome}?`)) {
      API.delete(`/api/padeiros/${id}`).then(() => {
        Components.toast('Padeiro excluído.', 'success');
        Gestao.loadTab();
      }).catch(e => Components.toast(e.message, 'error'));
    }
  },

  // -- PRODUTOS --
  renderProdutos(c, data) {
    c.innerHTML = `
    <div class="card tab-produtos">
      <div class="flex justify-between items-center mb-6 gestao-list-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="package" class="text-primary"></i> 
          Lista de Produtos
          <span class="badge badge-secondary">${data.length}</span>
        </h3>
      </div>

      <button class="btn btn-primary btn-new-padeiro" onclick="Gestao.openProdutoForm()">
        <i data-lucide="plus"></i> Novo Produto
      </button>

      ${data.length === 0 ? '<div class="text-tertiary">Nenhum produto encontrado.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only" style="max-height:500px;">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);">
            <tr><th>Código</th><th>Descrição</th><th>Fornecedor</th><th style="text-align: right;">Ações</th></tr>
          </thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td style="font-family:monospace;color:var(--primary); font-weight:600;">${p.codigo}</td>
                <td style="font-weight: 500; color: var(--text-primary);">${p.descricao}</td>
                <td class="text-secondary" style="font-size:13px">${p.fornecedor || '-'}</td>
                <td style="text-align: right;">
                  <div class="row-actions flex gap-2 justify-end">
                    <button class="btn btn-icon btn-sm" onclick="Gestao.openProdutoForm('${p.id}')"><i data-lucide="pencil" class="text-blue"></i></button>
                    <button class="btn btn-icon btn-sm" onclick="Gestao.deleteProduto('${p.id}')"><i data-lucide="trash-2" class="text-danger"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Apple List -->
      <div class="apple-list mobile-only">
        ${data.map(p => `
          <div class="apple-card" onclick="Gestao.openProdutoForm('${p.id}')">
            <div class="apple-avatar" style="background-color: rgba(0, 122, 255, 0.1); color: #007AFF;">
              <i data-lucide="package" style="width:22px; height:22px;"></i>
            </div>
            <div class="apple-card-info">
              <div class="apple-card-top">
                <span class="apple-card-name">${p.descricao}</span>
                <span class="apple-card-code">${p.codigo}</span>
              </div>
              <div class="apple-card-mid">
                <span class="apple-card-cpf">${p.fornecedor || 'Sem fornecedor'}</span>
              </div>
            </div>
            <i data-lucide="chevron-right" class="apple-chevron" style="width:16px; height:16px;"></i>
          </div>
        `).join('')}
      </div>
      `}
    </div>`;
  },

  openProdutoForm(id) {
    const p = id ? this.allData.produtos.find(x => x.id === id) : {};
    Components.showModal(id ? 'Editar Produto' : 'Novo Produto', `
      <form id="produto-form">
        <div class="flex gap-4">
          <div class="form-group w-full"><label>Código</label><input class="input-control" name="codigo" value="${p.codigo || ''}" required></div>
          <div class="form-group w-full"><label>Fornecedor</label><input class="input-control" name="fornecedor" value="${p.fornecedor || ''}"></div>
        </div>
        <div class="form-group"><label>Descrição</label><input class="input-control" name="descricao" value="${p.descricao || ''}" required></div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Gestao.saveProduto('${id || ''}')">Salvar</button>`
    );
    Components.renderIcons();
  },

  async saveProduto(id) {
    const form = document.getElementById('produto-form');
    if (!form.checkValidity()) return form.reportValidity();
    const body = Object.fromEntries(new FormData(form));
    try {
      if (id) await API.put(`/api/produtos/${id}`, body);
      else await API.post('/api/produtos', body);
      Components.closeModal();
      Components.toast('Produto salvo!', 'success');
      await this.loadTab();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  async deleteProduto(id) {
    if (confirm('Deseja excluir este produto?')) {
      try { await API.delete(`/api/produtos/${id}`); Components.toast('Excluído.', 'success'); await Gestao.loadTab(); }
      catch (e) { Components.toast(e.message, 'error'); }
    }
  },

  // -- CLIENTES --
  renderClientes(c, data) {
    c.innerHTML = `
    <div class="card tab-clientes">
      <div class="flex justify-between items-center mb-6 gestao-list-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="building-2" class="text-primary"></i> 
          Lista de Clientes
          <span class="badge badge-secondary">${data.length}</span>
        </h3>
      </div>

      <button class="btn btn-primary btn-new-padeiro" onclick="Gestao.openClienteForm()">
        <i data-lucide="plus"></i> Novo Cliente
      </button>

      ${data.length === 0 ? '<div class="text-tertiary">Nenhum cliente encontrado.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only" style="max-height:500px;">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);"><tr><th>#</th><th>Cliente</th><th>Status</th><th style="text-align: right;">Ações</th></tr></thead>
          <tbody>
            ${data.map(cl => `
              <tr>
                <td class="text-tertiary" style="font-weight:600;">${cl.numero || '-'}</td>
                <td style="font-weight:600; color: var(--text-primary);">${cl.nome}</td>
                <td>${cl.ativo !== false ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-danger">Inativo</span>'}</td>
                <td style="text-align: right;">
                  <div class="row-actions flex gap-2 justify-end">
                    <button class="btn btn-icon btn-sm" onclick="Gestao.openClienteForm('${cl.id}')"><i data-lucide="pencil" class="text-blue"></i></button>
                    <button class="btn btn-icon btn-sm" onclick="Gestao.deleteCliente('${cl.id}')"><i data-lucide="trash-2" class="text-danger"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Apple List -->
      <div class="apple-list mobile-only">
        ${data.map(cl => `
          <div class="apple-card" onclick="Gestao.openClienteForm('${cl.id}')">
            <div class="apple-avatar" style="background-color: rgba(52, 199, 89, 0.1); color: #34C759;">
              ${cl.numero || 'CL'}
            </div>
            <div class="apple-card-info">
              <div class="apple-card-top">
                <span class="apple-card-name">${cl.nome}</span>
              </div>
              <div class="apple-card-mid">
                <span class="apple-badge-pill badge-apple-${cl.ativo !== false ? 'green' : 'red'}">${cl.ativo !== false ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
            <i data-lucide="chevron-right" class="apple-chevron" style="width:16px; height:16px;"></i>
          </div>
        `).join('')}
      </div>
      `}
    </div>`;
  },

  openClienteForm(id) {
    const cl = id ? this.allData.clientes.find(x => x.id === id) : {};
    Components.showModal(id ? 'Editar Cliente' : 'Novo Cliente', `
      <form id="cliente-form">
        <div class="form-group"><label>Nome do Cliente / Razão Social</label><input class="input-control" name="nome" value="${cl.nome || ''}" required></div>
        
        <div class="flex gap-4">
          <div class="form-group w-full"><label>CNPJ</label><input class="input-control" name="cnpj" id="cnpj-input" value="${cl.cnpj || ''}"></div>
          <div class="form-group w-full"><label>Inscrição Estadual (IE)</label><input class="input-control" name="inscricaoEstadual" value="${cl.inscricaoEstadual || ''}"></div>
        </div>

        <div class="form-group"><label>Endereço Completo</label><input class="input-control" name="endereco" value="${cl.endereco || ''}"></div>
        
        <div class="flex gap-4">
          <div class="form-group w-full" style="flex: 2;"><label>Cidade</label><input class="input-control" name="cidade" value="${cl.cidade || ''}"></div>
          <div class="form-group w-full" style="flex: 1;"><label>UF</label><input class="input-control" name="estado" maxlength="2" placeholder="Ex: SP" value="${cl.estado || ''}"></div>
          <div class="form-group w-full" style="flex: 1.5;"><label>Telefone</label><input class="input-control" name="telefone" value="${cl.telefone || ''}"></div>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Gestao.saveCliente('${id || ''}')">Salvar</button>`
    );

    // Add CNPJ mask listener
    const cnpjInput = document.getElementById('cnpj-input');
    if (cnpjInput) {
      cnpjInput.maxLength = 18;
      cnpjInput.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 14) v = v.substring(0, 14);
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
        e.target.value = v;
      });
    }

    Components.renderIcons();
  },

  async saveCliente(id) {
    const form = document.getElementById('cliente-form');
    if (!form.checkValidity()) return form.reportValidity();
    const body = Object.fromEntries(new FormData(form));
    try {
      if (id) await API.put(`/api/clientes/${id}`, body);
      else await API.post('/api/clientes', body);
      Components.closeModal();
      Components.toast('Cliente salvo!', 'success');
      await this.loadTab();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  async deleteCliente(id) {
    if (confirm('Deseja excluir este cliente?')) {
      try { await API.delete(`/api/clientes/${id}`); Components.toast('Excluído.', 'success'); await Gestao.loadTab(); }
      catch (e) { Components.toast(e.message, 'error'); }
    }
  },

  // -- ATIVIDADES (REGISTROS) --
  renderAtividades(c, data) {
    const sorted = [...data].sort((a, b) => new Date(b.inicioEm || b.data) - new Date(a.inicioEm || a.data));

    c.innerHTML = `
    <div class="card tab-atividades">
      <div class="flex justify-between items-center mb-6 gestao-list-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="history" class="text-primary"></i> 
          Registros de Produção
          <span class="badge badge-secondary">${data.length}</span>
        </h3>
      </div>

      ${sorted.length === 0 ? '<div class="text-tertiary">Nenhum registro de atividade encontrado.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only" style="max-height:600px;">
        <table>
          <thead style="position: sticky; top: 0; background: var(--system-bg);">
            <tr><th>Data/Hora</th><th>Padeiro</th><th>Cliente</th><th>KG Total</th><th>Status</th><th style="text-align: right;">Ver</th></tr>
          </thead>
          <tbody>
            ${sorted.map(a => `
              <tr>
                <td class="text-secondary" style="font-size:13px">${new Date(a.inicioEm || a.data).toLocaleString('pt-BR')}</td>
                <td style="font-weight:600; color: var(--text-primary);">${a.padeiroNome}</td>
                <td>${a.clienteNome}</td>
                <td style="font-weight:700; color: var(--primary);">${a.kgTotal || '0'} kg</td>
                <td><span class="badge badge-${a.status === 'finalizado' ? 'success' : 'amber'}">${a.status}</span></td>
                <td style="text-align: right;">
                  <button class="btn btn-icon btn-sm" onclick="Gestao.viewAtividade('${a.id}')"><i data-lucide="eye"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Apple List -->
      <div class="apple-list mobile-only">
        ${sorted.map(a => {
      const initials = this.getInitials(a.padeiroNome);
      return `
          <div class="apple-card" onclick="Gestao.viewAtividade('${a.id}')">
            <div class="apple-avatar" style="background-color: rgba(255, 149, 0, 0.1); color: #FF9500;">
              ${initials}
            </div>
            <div class="apple-card-info">
              <div class="apple-card-top">
                <span class="apple-card-name">${a.clienteNome}</span>
                <span class="apple-card-code" style="color: var(--apple-blue); font-weight: 700;">${a.kgTotal || '0'} kg</span>
              </div>
              <div class="apple-card-mid">
                <span class="apple-card-cpf">${a.padeiroNome}</span>
              </div>
              <div class="apple-card-mid" style="margin-top: 4px;">
                 <span class="apple-card-code" style="font-size: 11px;">${new Date(a.inicioEm || a.data).toLocaleString('pt-BR')}</span>
              </div>
            </div>
            <i data-lucide="chevron-right" class="apple-chevron" style="width:16px; height:16px;"></i>
          </div>`;
    }).join('')}
      </div>
      `}
    </div>`;
  },

  viewAtividade(id) {
    const a = this.allData.atividades.find(x => x.id === id);
    if (!a) return;

    const itemsHtml = (a.kgItens || []).map(item => `
      <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--separator);">
        <div>
          <div style="font-weight:600; font-size:14px;">${item.produtoNome}</div>
          <div class="text-tertiary" style="font-size:12px;">ID: ${item.produtoId}</div>
        </div>
        <div style="font-weight:700; color:var(--primary);">${item.kg} kg</div>
      </div>
    `).join('') || '<div class="text-tertiary">Nenhum produto detalhado.</div>';

    const fotosHtml = (a.fotos || []).map(f => `
      <div style="position:relative; aspect-ratio:1; border-radius:8px; overflow:hidden; border:1px solid var(--separator);">
        <img src="${f.path}" style="width:100%; height:100%; object-fit:cover;" onclick="window.open('${f.path}', '_blank')">
      </div>
    `).join('');

    Components.showModal('Detalhes da Atividade', `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
        <div><p class="text-tertiary uppercase font-bold" style="font-size:10px;">Padeiro</p><p class="font-bold">${a.padeiroNome}</p></div>
        <div><p class="text-tertiary uppercase font-bold" style="font-size:10px;">Cliente</p><p class="font-bold">${a.clienteNome}</p></div>
        <div><p class="text-tertiary uppercase font-bold" style="font-size:10px;">Data</p><p class="font-bold">${new Date(a.inicioEm).toLocaleDateString('pt-BR')}</p></div>
        <div><p class="text-tertiary uppercase font-bold" style="font-size:10px;">KG Total</p><p class="font-bold" style="color:var(--primary);">${a.kgTotal} kg</p></div>
      </div>

      <h4 style="margin-bottom:12px; font-size:14px; border-bottom:2px solid var(--primary); display:inline-block; padding-bottom:4px;">Produtos Produzidos</h4>
      <div style="background:var(--system-bg); padding:0 16px; border-radius:12px; margin-bottom:24px;">
        ${itemsHtml}
      </div>

      ${a.fotos && a.fotos.length > 0 ? `
        <h4 style="margin-bottom:12px; font-size:14px; border-bottom:2px solid var(--primary); display:inline-block; padding-bottom:4px;">Fotos da Produção</h4>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:24px;">
          ${fotosHtml}
        </div>
      ` : ''}

      ${a.assinatura ? `
        <h4 style="margin-bottom:12px; font-size:14px; border-bottom:2px solid var(--primary); display:inline-block; padding-bottom:4px;">Assinatura do Cliente</h4>
        <div style="background:white; border:1px solid var(--separator); border-radius:8px; padding:8px;">
          <img src="${a.assinatura}" style="width:100%; max-height:150px; object-fit:contain;">
        </div>
      ` : ''}

      ${a.observacao ? `<div style="margin-top:20px; padding:12px; background:var(--system-bg); border-radius:8px; font-size:13px;"><strong>Obs:</strong> ${a.observacao}</div>` : ''}
    `, `<button class="btn btn-primary" onclick="Components.closeModal()">Fechar</button>`, 'modal-lg');

    Components.renderIcons();
  },

  // -- USUÁRIOS (ADMINS/GESTORES) --
  renderUsuarios(c, data) {
    c.innerHTML = `
    <div class="tab-usuarios card">
      <div class="flex justify-between items-center mb-6 gestao-list-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="users" class="text-primary"></i> 
          Gestão de Usuários (Painel)
          <span class="badge badge-secondary">${data.length}</span>
        </h3>
      </div>
      
      <button class="btn btn-primary btn-new-padeiro" onclick="Gestao.openUsuarioForm()">
        <i data-lucide="user-plus"></i> Adicionar Usuário
      </button>

      ${data.length === 0 ? '<div class="text-tertiary">Nenhum usuário encontrado.</div>' : `
      <!-- Desktop Table -->
      <div class="table-responsive desktop-only">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Filial</th>
              <th>Status</th>
              <th class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.sort((a,b) => a.nome.localeCompare(b.nome)).map(u => `
              <tr style="${!u.ativo ? 'opacity: 0.6;' : ''}">
                <td><strong>${u.nome}</strong></td>
                <td>${u.email}</td>
                <td>${Components.badge(
                  u.role === 'admin' ? 'Administrador' : 
                  u.role === 'gestor_geral' ? 'Gestor Geral' : 
                  u.role === 'gestor_regional' ? 'Gestor Regional' : 
                  u.role === 'padeiro' ? 'Padeiro' : 'Gestor', 
                  u.role === 'admin' ? 'blue' : u.role === 'gestor_geral' ? 'purple' : u.role === 'padeiro' ? 'green' : 'amber'
                )}</td>
                <td>${(u.filial && u.filial !== 'null') ? u.filial : 'Todas'}</td>
                <td>${u.ativo ? '<span class="text-green font-bold">Ativo</span>' : '<span class="text-danger font-bold">Inativo</span>'}</td>
                <td class="text-right">
                  <div class="row-actions flex gap-2 justify-end">
                    <button class="btn-icon text-blue" onclick="Gestao.openUsuarioForm('${u.id}')" title="Editar">
                      <i data-lucide="pencil"></i>
                    </button>
                    <button class="btn-icon text-danger" onclick="Gestao.deleteUsuario('${u.id}', '${u.nome}')" title="Excluir">
                      <i data-lucide="trash-2"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile List -->
      <div class="mobile-only apple-list">
        ${data.sort((a,b) => a.nome.localeCompare(b.nome)).map(u => `
          <div class="apple-card" style="${!u.ativo ? 'opacity: 0.6;' : ''}">
            <div class="apple-card-info" onclick="Gestao.openUsuarioForm('${u.id}')">
              <div class="apple-card-name">${u.nome} ${!u.ativo ? '<span style="font-size:10px; color:var(--apple-red);">(Inativo)</span>' : ''}</div>
              <div class="apple-list-subtitle" style="font-size: 13px; color: var(--apple-gray);">
                ${u.role === 'admin' ? 'Admin' : u.role === 'gestor_geral' ? 'Geral' : u.role === 'gestor_regional' ? 'Regional' : u.role === 'padeiro' ? 'Padeiro' : 'Gestor'} • 
                ${(u.filial && u.filial !== 'null') ? u.filial : 'Todas'}
              </div>
            </div>
            <div class="flex items-center gap-2">
               <button class="btn-icon text-danger" onclick="event.stopPropagation(); Gestao.deleteUsuario('${u.id}', '${u.nome}')" style="padding: 8px;">
                 <i data-lucide="trash-2" style="width:18px; height:18px;"></i>
               </button>
               <i data-lucide="chevron-right" class="apple-chevron" style="width:16px; height:16px;"></i>
            </div>
          </div>
        `).join('')}
      </div>
      `}
    </div>`;
  },

  openUsuarioForm(id = null) {
    const u = id ? this.allData.usuarios.find(x => x.id === id) : {};
    
    const html = `
      <form id="form-usuario" class="flex flex-col gap-4">
        <div class="input-group">
          <label class="label">Nome Completo</label>
          <input type="text" name="nome" class="input-control" required placeholder="Ex: João Silva" value="${u.nome || ''}">
        </div>
        <div class="input-group">
          <label class="label">E-mail (Login)</label>
          <input type="email" name="email" class="input-control" required placeholder="joao@brago.com" value="${u.email || ''}">
        </div>
        <div class="input-group">
          <label class="label">${id ? 'Nova Senha (deixe em branco para manter)' : 'Senha Inicial'}</label>
          <input type="password" name="senha" class="input-control" ${id ? '' : 'required'} placeholder="Mínimo 6 caracteres">
        </div>
        <div class="input-group">
          <label class="label">Papel (Role)</label>
          <select name="role" class="input-control" onchange="document.getElementById('filial-selector').style.display = this.value === 'gestor_regional' ? 'block' : 'none'">
            <option value="gestor_regional" ${u.role === 'gestor_regional' || u.role === 'gestor' ? 'selected' : ''}>Gestor Regional (Acesso a uma filial)</option>
            <option value="gestor_geral" ${u.role === 'gestor_geral' ? 'selected' : ''}>Gestor Geral (Acesso total)</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador (Acesso total + Desenvolvimento)</option>
          </select>
        </div>
        <div class="input-group" id="filial-selector" style="display: ${u.role === 'gestor_regional' || u.role === 'gestor' || (!id) ? 'block' : 'none'}">
          <label class="label">Filial Atribuída</label>
          <select name="filial" class="input-control">
            <option value="Brago Brasília" ${u.filial === 'Brago Brasília' ? 'selected' : ''}>Brago Brasília</option>
            <option value="Brago Goiania" ${u.filial === 'Brago Goiania' ? 'selected' : ''}>Brago Goiania</option>
            <option value="Brago Palmas" ${u.filial === 'Brago Palmas' ? 'selected' : ''}>Brago Palmas</option>
            <option value="Brago Campo Grande" ${u.filial === 'Brago Campo Grande' ? 'selected' : ''}>Brago Campo Grande</option>
          </select>
        </div>
        <div class="input-group">
          <label class="label">Status do Acesso</label>
          <select name="ativo" class="input-control">
            <option value="true" ${u.ativo !== false ? 'selected' : ''}>Ativo (Pode acessar)</option>
            <option value="false" ${u.ativo === false ? 'selected' : ''}>Inativo (Acesso bloqueado)</option>
          </select>
        </div>
      </form>
    `;

    const footer = `
      <div class="flex justify-between w-full">
        <div>
          ${id ? `
            <button class="btn btn-outline text-danger border-danger" onclick="Gestao.deleteUsuario(\`${u.id}\`, \`${u.nome}\`)">
              <i data-lucide="trash-2" style="width:16px; height:16px; vertical-align: middle; margin-right: 4px;"></i>
              Excluir Usuário
            </button>
          ` : ''}
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="Gestao.saveUsuario('${id || ''}')">${id ? 'Salvar Alterações' : 'Criar Usuário'}</button>
        </div>
      </div>
    `;

    Components.showModal(id ? 'Editar Usuário' : 'Novo Usuário do Painel', html, footer);
    Components.renderIcons();
  },

  async saveUsuario(id = null) {
    const form = document.getElementById('form-usuario');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      if (id) {
        await API.put(`/api/management/users/${id}`, data);
        Components.toast('Usuário atualizado com sucesso!', 'success');
      } else {
        await API.post('/api/management/users', data);
        Components.toast('Usuário criado com sucesso!', 'success');
      }
      Components.closeModal();
      this.loadTab();
    } catch (e) {
      Components.toast(e.message, 'error');
    }
  },

  deleteUsuario(id, nome) {
    Components.confirm(`Deseja realmente excluir o usuário ${nome}?`, async () => {
      try {
        await API.delete(`/api/management/users/${id}`);
        Components.toast('Usuário excluído!', 'success');
        Gestao.loadTab();
      } catch (e) {
        Components.toast(e.message, 'error');
      }
    });
  }
};
