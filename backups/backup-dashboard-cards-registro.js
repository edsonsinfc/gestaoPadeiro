/**
 * BACKUP: Sessões "Peso Total", "Produtos", "Unidades" e "Pacotes" da Aba Registro de Atividade (PadeiroFlow)
 * Data do Backup: 07/10/2026
 *
 * Este arquivo contém o código HTML, JS e CSS original das 4 métricas exibidas no topo da etapa
 * de Produção (stepProducao) em public/js/padeiro-flow.js.
 *
 * Caso deseje restaurar esses cards no futuro, siga as instruções no final deste arquivo.
 */

// ============================================================================
// 1. CÓDIGO HTML ORIGINAL (public/js/padeiro-flow.js - dentro de stepProducao)
// ============================================================================
export const HTML_DASHBOARD_GRID_BACKUP = `
      <!-- 1. Grid Dashboard (2x2) -->
      <div class="pf-dashboard-grid pf-animate-cascade" style="animation-delay: 0.10s">
        <!-- Card 1: KG -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="scale" style="width:14px;height:14px"></i> Peso Total</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-kg-display">\${this.activity.kgTotal || '0.0'}</span>
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

        <!-- Card 4: Pacotes -->
        <div class="pf-dash-card">
          <div class="pf-dash-card-label"><i data-lucide="boxes" style="width:14px;height:14px"></i> Pacotes</div>
          <div class="pf-dash-card-value">
            <span id="flow-wallet-pct-display">0</span>
            <span class="pf-dash-card-unit" style="font-size:12px; margin-left:2px;">pct</span>
          </div>
        </div>
      </div>
`;

// ============================================================================
// 2. CÓDIGO JAVASCRIPT DE ATUALIZAÇÃO DOS VALORES (public/js/padeiro-flow.js - updateCartVisuals)
// ============================================================================
export const JS_UPDATE_VISUALS_BACKUP = `
    // Update visible Wallet text
    const displayKg = document.getElementById('flow-wallet-kg-display');
    if (displayKg) displayKg.innerText = totalKg > 0 ? totalKg.toFixed(2) : '0.0';

    const displayUn = document.getElementById('flow-wallet-un-display');
    if (displayUn) displayUn.innerText = totalUn > 0 ? totalUn : '0';

    const displayItems = document.getElementById('flow-wallet-items-display');
    if (displayItems) displayItems.innerText = selectedCount;

    const displayPct = document.getElementById('flow-wallet-pct-display');
    if (displayPct) displayPct.innerText = totalPct > 0 ? totalPct : '0';
`;

// ============================================================================
// 3. ESTILOS CSS CORRESPONDENTES (public/css/padeiro-flow.css)
// ============================================================================
export const CSS_STYLES_BACKUP = `
/* Dashboard Grid 2x2 */
.pf-dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}
.pf-dash-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pf-dash-card-label {
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pf-dash-card-value {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.pf-dash-card-unit {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}
`;

/**
 * INSTRUÇÕES DE RESTAURAÇÃO:
 * 1. Para recolocar os 4 cards na tela, insira o bloco HTML_DASHBOARD_GRID_BACKUP
 *    logo acima de <input type="hidden" id="flow-kg-total" ...> em stepProducao()
 *    no arquivo public/js/padeiro-flow.js.
 * 2. O código de atualização JS já possui salvaguardas (if (displayKg)...) e voltará a
 *    atualizar os números automaticamente no momento em que os elementos existirem no DOM.
 */
