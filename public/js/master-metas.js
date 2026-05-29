/**
 * BRAGO Sistema Padeiro - Módulo de Metas do Master Gestor (Mobile-First)
 * Métricas: Volume de Produção (Kg), Atividades Concluídas, Clientes Captados
 */

const MasterMetas = {
  stats: null,
  users: [],
  clients: [],
  activities: [],
  selectedFilial: null,

  // Metas comerciais dos Gestores (Mapeado por Filial)
  get metasComerciais() {
    const saved = localStorage.getItem('brago_master_metas_comerciais_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao carregar metas do localStorage:", e);
      }
    }
    return {
      'Brago Brasília': { producao: 3000, atividades: 20, captacao: 8 },
      'Brago Goiania': { producao: 2500, atividades: 15, captacao: 6 },
      'Brago Palmas': { producao: 1500, atividades: 10, captacao: 4 },
      'Brago Campo Grande': { producao: 2000, atividades: 12, captacao: 5 }
    };
  },

  set metasComerciais(val) {
    localStorage.setItem('brago_master_metas_comerciais_v3', JSON.stringify(val));
  },

  async render() {
    const container = document.getElementById('page-container');
    if (!container) return;

    container.innerHTML = Components.loading();
    this.renderStyles();

    try {
      const [statsData, usersData, clData, atData] = await Promise.all([
        API.get('/api/stats'),
        API.get('/api/management/users'),
        API.get('/api/clientes').catch(() => []),
        API.get('/api/atividades').catch(() => [])
      ]);

      this.stats = statsData;
      this.users = usersData;
      this.clients = clData;
      this.activities = atData;

      this.renderContent(container);
    } catch (err) {
      console.error('Erro ao carregar metas corporativas:', err);
      container.innerHTML = Components.empty('alert-circle', `Erro ao carregar metas executivas: <br><small>${err.message}</small>`);
    }
  },

  renderContent(container) {
    const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const filiaisData = this.calculateFiliaisMetrics();
    
    // Totais consolidados
    const totalRealizadoProducao = filiaisData.reduce((sum, f) => sum + f.realizadoProducao, 0);
    const totalMetaProducao = filiaisData.reduce((sum, f) => sum + f.metaProducao, 0);
    const totalRealizadoAtividades = filiaisData.reduce((sum, f) => sum + f.realizadoAtividades, 0);
    const totalMetaAtividades = filiaisData.reduce((sum, f) => sum + f.metaAtividades, 0);
    const totalRealizadoCaptacao = filiaisData.reduce((sum, f) => sum + f.realizadoCaptacao, 0);
    const totalMetaCaptacao = filiaisData.reduce((sum, f) => sum + f.metaCaptacao, 0);

    const pctP = totalMetaProducao > 0 ? Math.round((totalRealizadoProducao / totalMetaProducao) * 100) : 0;
    const pctA = totalMetaAtividades > 0 ? Math.round((totalRealizadoAtividades / totalMetaAtividades) * 100) : 0;
    const pctC = totalMetaCaptacao > 0 ? Math.round((totalRealizadoCaptacao / totalMetaCaptacao) * 100) : 0;

    container.innerHTML = `
      <div class="master-metas-container fade-in">
        
        <!-- Header Card -->
        <div class="executive-header-card cascade-item" style="--index: 0;">
          <div class="header-overlay-glow"></div>
          <div class="header-text-block">
            <span class="executive-tag">Planejamento e Alocação de Metas</span>
            <h2 class="executive-title">Painel Executivo de Metas</h2>
            <p class="executive-subtitle">Produção física (Kg), rotatividade de visitas e captação de novos clientes por filial.</p>
          </div>
        </div>

        <!-- GLOBAL KPI CARDS -->
        <div class="executive-summary-grid">
          
          <!-- Volume de Produção -->
          <div class="executive-summary-card cascade-item" style="--index: 1;">
            <div class="summary-card-header">
              <div class="summary-icon-box" style="background: rgba(175, 82, 222, 0.1); color: #AF52DE;">
                <i data-lucide="package"></i>
              </div>
              <div class="summary-header-info">
                <span class="summary-label">Produção</span>
                <span class="summary-progress-percent" style="color: #AF52DE;">${pctP}%</span>
              </div>
            </div>
            <div class="summary-values-row">
              <span class="summary-realized">${Math.round(totalRealizadoProducao).toLocaleString('pt-BR')} kg</span>
              <span class="summary-target">meta ${totalMetaProducao.toLocaleString('pt-BR')} kg</span>
            </div>
            <div class="summary-progress-bar">
              <div class="summary-progress-fill" style="width: ${Math.min(pctP, 100)}%; background: linear-gradient(90deg, #AF52DE 0%, #DA70D6 100%);"></div>
            </div>
          </div>

          <!-- Atividades -->
          <div class="executive-summary-card cascade-item" style="--index: 2;">
            <div class="summary-card-header">
              <div class="summary-icon-box" style="background: rgba(0, 122, 255, 0.1); color: #007AFF;">
                <i data-lucide="clipboard-list"></i>
              </div>
              <div class="summary-header-info">
                <span class="summary-label">Atividades</span>
                <span class="summary-progress-percent" style="color: #007AFF;">${pctA}%</span>
              </div>
            </div>
            <div class="summary-values-row">
              <span class="summary-realized">${totalRealizadoAtividades} <span style="font-size:13px; font-weight:500; color:#8E8E93;">registros</span></span>
              <span class="summary-target">meta ${totalMetaAtividades}</span>
            </div>
            <div class="summary-progress-bar">
              <div class="summary-progress-fill" style="width: ${Math.min(pctA, 100)}%; background: linear-gradient(90deg, #007AFF 0%, #5AC8FA 100%);"></div>
            </div>
          </div>

          <!-- Clientes Captados (full width) -->
          <div class="executive-summary-card captacao-full-card cascade-item" style="--index: 3;">
            <div class="summary-card-header">
              <div class="summary-icon-box" style="background: rgba(52, 199, 89, 0.1); color: #34C759;">
                <i data-lucide="user-plus"></i>
              </div>
              <div class="summary-header-info">
                <span class="summary-label">Clientes Captados</span>
                <span class="summary-progress-percent" style="color: #34C759;">${pctC}%</span>
              </div>
            </div>
            <div class="captacao-values-inline">
              <div class="summary-values-row">
                <span class="summary-realized">${totalRealizadoCaptacao} <span style="font-size:13px; font-weight:500; color:#8E8E93;">novos clientes</span></span>
                <span class="summary-target">meta ${totalMetaCaptacao} captações</span>
              </div>
              <div class="captacao-emoji-indicator">${pctC >= 100 ? '🎉' : pctC >= 60 ? '📈' : '⚡'}</div>
            </div>
            <div class="summary-progress-bar">
              <div class="summary-progress-fill" style="width: ${Math.min(pctC, 100)}%; background: linear-gradient(90deg, #34C759 0%, #30D158 100%);"></div>
            </div>
          </div>

        </div>

        <!-- FILIAIS LEADERBOARD -->
        <div class="filiais-metas-section">
          <div class="section-compact-header">
            <h3 class="section-compact-title">
              <i data-lucide="map" style="color:#007AFF;"></i> Metas por Região
            </h3>
            <span class="ios-date-badge">${mesLabel}</span>
          </div>

          <div class="filiais-metas-list">
            ${filiaisData.map((f, index) => {
              const gestor = this.users.find(u => u.filial === f.nome && ['admin', 'gestor', 'gestor_geral', 'gestor_regional'].includes(u.role));
              const gestorNome = gestor ? gestor.nome : 'Sem supervisor alocado';
              const initials = gestorNome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

              const pctF = f.metaProducao > 0 ? Math.round((f.realizadoProducao / f.metaProducao) * 100) : 0;
              const pctAf = f.metaAtividades > 0 ? Math.round((f.realizadoAtividades / f.metaAtividades) * 100) : 0;
              const pctCf = f.metaCaptacao > 0 ? Math.round((f.realizadoCaptacao / f.metaCaptacao) * 100) : 0;

              const allDone = pctF >= 100 && pctAf >= 100 && pctCf >= 100;

              return `
              <div class="filial-meta-card cascade-item" style="--index: ${index + 4};">
                
                <div class="filial-card-header">
                  <div class="gestor-profile">
                    <div class="gestor-avatar">${initials}</div>
                    <div class="gestor-meta-details">
                      <span class="filial-name-tag">${f.nome.replace('Brago ', '')}</span>
                      <span class="gestor-name-sub">${gestorNome}</span>
                    </div>
                  </div>
                  <div class="filial-status-icon ${allDone ? 'status-completed' : 'status-progress'}">
                    <i data-lucide="${allDone ? 'check-circle' : 'activity'}"></i>
                  </div>
                </div>

                <div class="filial-card-divider"></div>

                <div class="filial-goals-progress-grid">
                  
                  <!-- Produção -->
                  <div class="filial-goal-progress-row">
                    <div class="goal-row-meta">
                      <span class="goal-row-label"><i data-lucide="package" style="color: #AF52DE;"></i> Produção</span>
                      <span class="goal-row-values">
                        <strong style="color: #AF52DE;">${Math.round(f.realizadoProducao).toLocaleString('pt-BR')} kg</strong> / ${f.metaProducao.toLocaleString('pt-BR')} kg
                        <span class="goal-pct-badge" style="background: rgba(175,82,222,0.1); color: #AF52DE;">${pctF}%</span>
                      </span>
                    </div>
                    <div class="goal-progress-bar-bg">
                      <div class="goal-progress-bar-fill" style="width: ${Math.min(pctF, 100)}%; background: #AF52DE;"></div>
                    </div>
                  </div>

                  <!-- Atividades -->
                  <div class="filial-goal-progress-row">
                    <div class="goal-row-meta">
                      <span class="goal-row-label"><i data-lucide="clipboard-list" style="color: #007AFF;"></i> Atividades</span>
                      <span class="goal-row-values">
                        <strong style="color: #007AFF;">${f.realizadoAtividades}</strong> / ${f.metaAtividades}
                        <span class="goal-pct-badge" style="background: rgba(0,122,255,0.1); color: #007AFF;">${pctAf}%</span>
                      </span>
                    </div>
                    <div class="goal-progress-bar-bg">
                      <div class="goal-progress-bar-fill" style="width: ${Math.min(pctAf, 100)}%; background: #007AFF;"></div>
                    </div>
                  </div>

                  <!-- Captação -->
                  <div class="filial-goal-progress-row">
                    <div class="goal-row-meta">
                      <span class="goal-row-label"><i data-lucide="user-plus" style="color: #34C759;"></i> Captação</span>
                      <span class="goal-row-values">
                        <strong style="color: #34C759;">${f.realizadoCaptacao}</strong> / ${f.metaCaptacao} clientes
                        <span class="goal-pct-badge" style="background: rgba(52,199,89,0.1); color: #34C759;">${pctCf}%</span>
                      </span>
                    </div>
                    <div class="goal-progress-bar-bg">
                      <div class="goal-progress-bar-fill" style="width: ${Math.min(pctCf, 100)}%; background: #34C759;"></div>
                    </div>
                  </div>

                </div>

                <button class="adjust-meta-action-btn" onclick="MasterMetas.openMetaAdjustment('${f.nome}')">
                  <i data-lucide="sliders"></i> Ajustar Metas Região
                </button>

              </div>`;
            }).join('')}
          </div>
        </div>

      </div>

      <!-- GOALS ADJUSTMENT BOTTOM SHEET -->
      <div class="bottom-sheet-overlay" id="meta-adjustment-overlay" onclick="MasterMetas.closeMetaAdjustment()"></div>
      <div class="bottom-sheet-panel" id="meta-adjustment-panel">
        <div class="bottom-sheet-drag-handle"></div>
        <div class="bottom-sheet-header">
          <span class="bottom-sheet-title" id="adjustment-sheet-title">Configurar Metas</span>
          <button class="bottom-sheet-close-btn" onclick="MasterMetas.closeMetaAdjustment()">
            <i data-lucide="x" size="16"></i>
          </button>
        </div>
        <div class="bottom-sheet-body" id="adjustment-sheet-body">
          <!-- Injetado dinamicamente -->
        </div>
      </div>
    `;

    Components.renderIcons();
  },

  calculateFiliaisMetrics() {
    const filiaisNomes = ['Brago Brasília', 'Brago Goiania', 'Brago Palmas', 'Brago Campo Grande'];
    const mesAtual = new Date().toISOString().slice(0, 7);
    
    return filiaisNomes.map(f => {
      const meta = this.metasComerciais[f] || { producao: 2000, atividades: 12, captacao: 5 };
      
      const padeirosFilial = this.users.filter(u => u.role === 'padeiro' && u.filial === f);
      const padeirosIds = padeirosFilial.map(p => p.id);
      
      // Atividades reais da filial concluídas no mês atual
      const atividadesFilial = (this.activities || []).filter(a => 
        padeirosIds.includes(a.padeiroId) && 
        a.data && a.data.startsWith(mesAtual) && 
        a.status === 'finalizada'
      );
      
      const realizadoKg = atividadesFilial.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
      const realizadoAtividades = atividadesFilial.length;
      
      // Clientes captados no mês: clientes com criadoEm no mês atual
      // Filtramos por clientes que possam estar vinculados à filial via atividades
      const clienteIdsFilial = new Set();
      (this.activities || []).filter(a => padeirosIds.includes(a.padeiroId)).forEach(a => {
        if (a.clienteId) clienteIdsFilial.add(a.clienteId);
      });
      
      const clientesCaptados = (this.clients || []).filter(c => {
        if (!c.criadoEm || !c.criadoEm.startsWith(mesAtual)) return false;
        // Se temos IDs de clientes da filial, usar para filtrar; senão contar todos
        if (clienteIdsFilial.size > 0) return clienteIdsFilial.has(c.id);
        return true;
      });
      
      return {
        nome: f,
        metaProducao: meta.producao,
        realizadoProducao: Math.round(realizadoKg * 10) / 10,
        metaAtividades: meta.atividades,
        realizadoAtividades: realizadoAtividades,
        metaCaptacao: meta.captacao || 5,
        realizadoCaptacao: clientesCaptados.length
      };
    });
  },

  openMetaAdjustment(filialNome) {
    this.selectedFilial = filialNome;
    const meta = this.metasComerciais[filialNome] || { producao: 2000, atividades: 12, captacao: 5 };

    const overlay = document.getElementById('meta-adjustment-overlay');
    const panel = document.getElementById('meta-adjustment-panel');
    const title = document.getElementById('adjustment-sheet-title');
    const body = document.getElementById('adjustment-sheet-body');

    title.innerText = `Metas: ${filialNome.replace('Brago ', '')}`;

    body.innerHTML = `
      <form id="master-metas-adjustment-form" onsubmit="event.preventDefault(); MasterMetas.saveAdjustment();" style="display:flex; flex-direction:column; gap:16px;">
        
        <div class="adjustment-info-card">
          <div class="info-card-title"><i data-lucide="info" size="14"></i> Definição de Metas</div>
          <p class="info-card-text">
            Defina os objetivos mensais de <strong>Volume de Produção (Kg)</strong>, <strong>Atividades</strong> e <strong>Captação de Clientes</strong> para esta filial.
          </p>
        </div>

        <div class="form-group-ios">
          <label class="form-label-ios">Meta de Produção (Kg Mensal)</label>
          <div class="input-ios-wrapper">
            <span class="input-prefix-ios">Kg</span>
            <input type="number" class="input-control-ios" id="adj-producao" value="${meta.producao}" step="100" min="500" required />
          </div>
          <span class="form-help-ios">Recomendado: 1.500 Kg a 5.000 Kg</span>
        </div>

        <div class="form-group-ios">
          <label class="form-label-ios">Meta de Atividades (Registros)</label>
          <div class="input-ios-wrapper">
            <span class="input-prefix-ios">#</span>
            <input type="number" class="input-control-ios" id="adj-atividades" value="${meta.atividades}" step="1" min="1" required />
          </div>
          <span class="form-help-ios">Quantidade de visitas/produções planejadas no mês.</span>
        </div>

        <div class="form-group-ios">
          <label class="form-label-ios">Meta de Captação (Novos Clientes)</label>
          <div class="input-ios-wrapper">
            <span class="input-prefix-ios"><i data-lucide="user-plus" style="width:14px;height:14px;"></i></span>
            <input type="number" class="input-control-ios" id="adj-captacao" value="${meta.captacao || 5}" step="1" min="1" required />
          </div>
          <span class="form-help-ios">Novos clientes cadastrados esperados neste mês.</span>
        </div>

        <button type="submit" class="submit-adj-action-btn">
          Salvar Metas Corporativas
        </button>
      </form>
    `;

    overlay.classList.add('active');
    panel.classList.add('active');

    Components.renderIcons();
    document.body.style.overflow = 'hidden';
  },

  closeMetaAdjustment() {
    const overlay = document.getElementById('meta-adjustment-overlay');
    const panel = document.getElementById('meta-adjustment-panel');
    if (overlay) overlay.classList.remove('active');
    if (panel) panel.classList.remove('active');
    document.body.style.overflow = '';
  },

  saveAdjustment() {
    const filial = this.selectedFilial;
    if (!filial) return;

    const producaoInput = document.getElementById('adj-producao');
    const atividadesInput = document.getElementById('adj-atividades');
    const captacaoInput = document.getElementById('adj-captacao');
    
    if (!producaoInput || !atividadesInput || !captacaoInput) return;

    const producao = parseFloat(producaoInput.value);
    const atividades = parseInt(atividadesInput.value);
    const captacao = parseInt(captacaoInput.value);

    const currentMetas = this.metasComerciais;
    currentMetas[filial] = { producao, atividades, captacao };
    this.metasComerciais = currentMetas;

    this.closeMetaAdjustment();
    Components.toast(`Metas da filial ${filial.replace('Brago ', '')} atualizadas com sucesso!`, 'success');
    
    this.render();
  },

  renderStyles() {
    if (document.getElementById('master-metas-styles')) return;
    const style = document.createElement('style');
    style.id = 'master-metas-styles';
    style.innerHTML = `
      .master-metas-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 16px;
        padding-bottom: 80px;
        width: 100%;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", sans-serif;
        overflow-x: hidden;
      }

      /* ─── EXECUTIVE BANNER ─── */
      .executive-header-card {
        background: linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%);
        color: white;
        border-radius: 20px;
        padding: 20px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      }

      .header-overlay-glow {
        position: absolute;
        top: -30px;
        right: -30px;
        width: 130px;
        height: 130px;
        background: radial-gradient(circle, rgba(0, 122, 255, 0.2) 0%, transparent 70%);
        pointer-events: none;
      }

      .header-text-block {
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 1;
        position: relative;
      }

      .executive-tag {
        font-size: 11px;
        font-weight: 700;
        color: #30B0C7;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .executive-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        color: #FFFFFF;
      }

      .executive-subtitle {
        font-size: 13px;
        color: #AEAEB2;
        margin: 0;
        margin-top: 4px;
        font-weight: 500;
        line-height: 1.4;
      }

      /* ─── SUMMARY KPI GRID ─── */
      .executive-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        width: 100%;
      }

      .executive-summary-card {
        background: #FFFFFF;
        border-radius: 18px;
        padding: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid rgba(0, 0, 0, 0.03);
      }

      /* Card de captação ocupa toda largura */
      .captacao-full-card {
        grid-column: 1 / -1;
      }

      .captacao-values-inline {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .captacao-emoji-indicator {
        font-size: 28px;
        line-height: 1;
      }

      .summary-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .summary-icon-box {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .summary-header-info {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .summary-label {
        font-size: 11px;
        font-weight: 700;
        color: #8E8E93;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .summary-progress-percent {
        font-size: 16px;
        font-weight: 800;
      }

      .summary-values-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .summary-realized {
        font-size: 20px;
        font-weight: 800;
        color: #1C1C1E;
        letter-spacing: -0.5px;
      }

      .summary-target {
        font-size: 11px;
        color: #8E8E93;
        font-weight: 600;
      }

      .summary-progress-bar {
        width: 100%;
        height: 6px;
        background: #F2F2F7;
        border-radius: 99px;
        overflow: hidden;
      }

      .summary-progress-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
      }

      /* ─── FILIAIS LEADERBOARD ─── */
      .filiais-metas-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
      }

      .section-compact-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-left: 4px;
      }

      .section-compact-title {
        font-size: 14px;
        font-weight: 700;
        color: #8E8E93;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }

      .ios-date-badge {
        background: rgba(0,0,0,0.05);
        color: #666;
        padding: 4px 10px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
        text-transform: capitalize;
      }

      .filiais-metas-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .filial-meta-card {
        background: #FFFFFF;
        border-radius: 20px;
        padding: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        border: 1px solid rgba(0, 0, 0, 0.03);
        display: flex;
        flex-direction: column;
        gap: 14px;
        position: relative;
      }

      .filial-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .gestor-profile {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .gestor-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, #007AFF 0%, #1032CC 100%);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,122,255,0.25);
      }

      .gestor-meta-details {
        display: flex;
        flex-direction: column;
      }

      .filial-name-tag {
        font-size: 16px;
        font-weight: 800;
        color: #1C1C1E;
      }

      .gestor-name-sub {
        font-size: 12px;
        color: #8E8E93;
        font-weight: 600;
        margin-top: 1px;
      }

      .filial-status-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .status-completed { color: #34C759; }
      .status-progress { color: #007AFF; }

      .filial-card-divider {
        height: 1px;
        background: #F2F2F7;
        width: 100%;
      }

      .filial-goals-progress-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .filial-goal-progress-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .goal-row-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: 600;
      }

      .goal-row-label {
        color: #8E8E93;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .goal-row-label i {
        width: 12px;
        height: 12px;
      }

      .goal-row-values {
        color: #8E8E93;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .goal-pct-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 6px;
        margin-left: 6px;
      }

      .goal-progress-bar-bg {
        width: 100%;
        height: 8px;
        background: #E5E5EA;
        border-radius: 99px;
        overflow: hidden;
      }

      .goal-progress-bar-fill {
        height: 100%;
        border-radius: 99px;
        transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .adjust-meta-action-btn {
        width: 100%;
        height: 44px;
        border-radius: 12px;
        border: 1px solid rgba(0, 122, 255, 0.15);
        background: rgba(0, 122, 255, 0.05);
        color: #007AFF;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s ease;
        margin-top: 4px;
      }

      .adjust-meta-action-btn:active {
        background: rgba(0, 122, 255, 0.12);
        transform: scale(0.99);
      }

      /* ─── FORM STYLES ─── */
      .adjustment-info-card {
        background: rgba(0, 122, 255, 0.05);
        border: 1px solid rgba(0, 122, 255, 0.1);
        border-radius: 14px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-card-title {
        font-size: 12px;
        font-weight: 700;
        color: #007AFF;
        display: flex;
        align-items: center;
        gap: 4px;
        text-transform: uppercase;
      }

      .info-card-text {
        margin: 0;
        font-size: 11px;
        color: #3A3A3C;
        line-height: 1.4;
      }

      .form-group-ios {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }

      .form-label-ios {
        font-size: 13px;
        font-weight: 700;
        color: #1C1C1E;
        padding-left: 2px;
      }

      .input-ios-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }

      .input-prefix-ios {
        position: absolute;
        left: 12px;
        font-size: 15px;
        font-weight: 600;
        color: #8E8E93;
        pointer-events: none;
        display: flex;
        align-items: center;
      }

      .input-control-ios {
        width: 100%;
        height: 48px;
        background: #FFFFFF;
        border: 1px solid #C7C7CC;
        border-radius: 12px;
        padding: 0 12px 0 38px;
        font-size: 16px;
        font-weight: 600;
        color: #1C1C1E;
        box-sizing: border-box;
        font-family: inherit;
        transition: border-color 0.2s ease;
      }

      .input-control-ios:focus {
        outline: none;
        border-color: #007AFF;
      }

      .form-help-ios {
        font-size: 11px;
        color: #8E8E93;
        padding-left: 2px;
      }

      .submit-adj-action-btn {
        width: 100%;
        height: 50px;
        border: none;
        border-radius: 14px;
        background: linear-gradient(135deg, #007AFF 0%, #1032CC 100%);
        color: white;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0,122,255,0.25);
        transition: all 0.2s ease;
        margin-top: 10px;
      }

      .submit-adj-action-btn:active {
        transform: scale(0.98);
        box-shadow: 0 2px 8px rgba(0,122,255,0.15);
      }
    `;
    document.head.appendChild(style);
  }
};
