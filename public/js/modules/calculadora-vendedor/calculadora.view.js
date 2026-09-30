/**
 * Calculadora de Gastos - View Renderer
 * BRAGO Distribuidora - Perfil Vendedor
 */

const CalculadoraView = {
  // Lista de produtos obtidos do banco para obter preço de tabela se houver
  productsList: [],
  clienteId: null,

  async render(containerId, productsList = [], clienteId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.productsList = productsList;
    this.clienteId = clienteId;

    // Garante que o estado esteja carregado para o cliente
    await CalculadoraState.init(clienteId);

    this.renderLayout(container);
    this.updateCalculations();
  },

  renderLayout(container) {
    const receitasOptions = CalculadoraState.receitas.map(r => `
      <option value="${r.id}" ${r.id === CalculadoraState.selectedReceitaId ? 'selected' : ''}>
        ${r.nome}
      </option>
    `).join('');

    const receitaAtiva = CalculadoraState.getReceitaAtiva();

    container.innerHTML = `
      <div class="apple-calc-wrapper" style="max-width: 1100px; margin: 0 auto; padding: 16px; font-family: var(--font-main);">
        
        <!-- Receita Selection Card -->
        <div class="apple-card" style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px; box-shadow: var(--shadow-md); margin-bottom: 24px; border: 1px solid var(--glass-border);">
          <div class="calc-header-grid" style="display: grid; grid-template-columns: 1fr; gap: 16px; align-items: center;">
            <div>
              <label style="display: block; font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Escolha um Produto / Receita:</label>
              <select id="calc-recipe-select" onchange="CalculadoraView.handleRecipeChange(this.value)" style="width: 100%; padding: 12px 16px; border-radius: var(--radius-md); border: 1.5px solid var(--glass-border); background: var(--bg-main); font-size: 15px; font-weight: 500; color: var(--text-main); outline: none; transition: border-color 0.2s;">
                ${receitasOptions}
              </select>
            </div>
          </div>
        </div>

        <!-- Main Workspace Grid -->
        <div class="calc-workspace-grid" style="display: grid; grid-template-columns: 1fr; gap: 24px;">
          
          <!-- Column Left: Inputs & Table -->
          <div class="calc-col-left" style="display: flex; flex-direction: column; gap: 24px;">
            
            <div class="apple-card" style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-md); border: 1px solid var(--glass-border);">
              <h3 style="font-size: 18px; font-weight: 600; color: var(--text-main); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="scale" style="width: 20px; height: 20px; color: var(--primary);"></i> Ficha Técnica e Custos
              </h3>
              
              <!-- Qty Input Base -->
              <div style="background: var(--primary-light); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid rgba(30, 75, 255, 0.15);">
                <label for="calc-base-qty" style="display: block; font-size: 13px; font-weight: 600; color: var(--primary); margin-bottom: 6px;">Quantidade da Mistura IREKS (g):</label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="number" id="calc-base-qty" value="${CalculadoraState.quantidadeBaseInput}" oninput="CalculadoraView.handleBaseQtyChange(this.value)" style="width: 100%; padding: 12px 48px 12px 16px; border-radius: var(--radius-sm); border: 1.5px solid rgba(30, 75, 255, 0.3); background: #ffffff; font-size: 16px; font-weight: 600; color: var(--text-main); outline: none;" />
                  <span style="position: absolute; right: 16px; font-size: 14px; font-weight: 600; color: var(--text-secondary);">g</span>
                </div>
                <small style="display: block; margin-top: 6px; color: var(--text-secondary); font-size: 11px;">Insira a quantidade desejada de <strong>${receitaAtiva.produtoPrincipal}</strong>. Os demais ingredientes serão calculados automaticamente.</small>
              </div>

              <!-- Ingredients Table -->
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--bg-main);">
                      <th style="padding: 10px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Ingrediente</th>
                      <th style="padding: 10px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; text-align: center;">%</th>
                      <th style="padding: 10px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; text-align: right;">Qtd. (g)</th>
                      <th style="padding: 10px; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; text-align: right; min-width: 120px;">Preço/kg (R$)</th>
                    </tr>
                  </thead>
                  <tbody id="calc-ingredients-body">
                    <!-- Dynamic Rows Loaded Here -->
                  </tbody>
                </table>
              </div>

              <!-- Reset Button -->
              <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                <button onclick="CalculadoraView.handleReset()" class="btn" style="background: transparent; color: var(--error); border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 16px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; border-radius: var(--radius-sm); cursor: pointer; transition: background-color 0.2s;">
                  <i data-lucide="rotate-ccw" style="width: 14px; height: 14px;"></i> Restaurar Preços Padrão
                </button>
              </div>

            </div>
          </div>

          <!-- Column Right: Output Card & Markup -->
          <div class="calc-col-right" style="display: flex; flex-direction: column; gap: 24px;">
            
            <div class="apple-card" style="background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-md); border: 1px solid var(--glass-border);">
              <h3 style="font-size: 18px; font-weight: 600; color: var(--text-main); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="calculator" style="width: 20px; height: 20px; color: var(--success);"></i> Resultados e Margem
              </h3>

              <!-- Quebra & Rendimento Row -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="background: var(--bg-main); padding: 12px; border-radius: var(--radius-md); text-align: center; border: 1px solid var(--glass-border);">
                  <span style="display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Quebra no Forno</span>
                  <span style="font-size: 20px; font-weight: 700; color: var(--accent);">${receitaAtiva.quebraPadrao}%</span>
                </div>
                <div style="background: var(--bg-main); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: flex; flex-direction: column; justify-content: center; align-items: center;">
                  <span style="display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Rendimento</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" id="calc-rendimento" value="${CalculadoraState.rendimentoInput}" oninput="CalculadoraView.handleRendimentoChange(this.value)" style="width: 60px; text-align: center; font-size: 18px; font-weight: 700; color: var(--text-main); background: #ffffff; border: 1.5px solid var(--glass-border); border-radius: var(--radius-sm); outline: none; padding: 2px 4px;" />
                    <span style="font-size: 12px; font-weight: 500; color: var(--text-secondary);">un</span>
                  </div>
                </div>
              </div>

              <!-- Process Metrics (Corte, Custos) -->
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; border-bottom: 1.5px dashed var(--bg-main); padding-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Corte Peças (Massa Crua):</span>
                  <span id="res-corte-cru" style="color: var(--text-main); font-weight: 600;">--</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Peso Peça Assada (Aprox.):</span>
                  <span id="res-peso-assado" style="color: var(--text-main); font-weight: 600;">--</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Custo por kg (Massa Assada):</span>
                  <span id="res-custo-kg-assado" style="color: var(--text-main); font-weight: 600; color: var(--error);">--</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Custo por Unidade:</span>
                  <span id="res-custo-unidade" style="color: var(--text-main); font-weight: 600; color: var(--error);">--</span>
                </div>
              </div>

              <!-- Markup Control -->
              <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label for="calc-markup-range" style="font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase;">Markup (%) / Lucratividade:</label>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" id="calc-markup-number" value="${CalculadoraState.markup}" oninput="CalculadoraView.handleMarkupChange(this.value)" style="width: 60px; text-align: center; font-size: 14px; font-weight: 600; border: 1px solid var(--glass-border); border-radius: var(--radius-sm); outline: none; padding: 2px;" />
                    <span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">%</span>
                  </div>
                </div>
                <input type="range" id="calc-markup-range" min="10" max="300" step="5" value="${CalculadoraState.markup}" oninput="CalculadoraView.handleMarkupChange(this.value)" style="width: 100%; height: 6px; border-radius: var(--radius-full); background: var(--bg-main); outline: none; cursor: pointer;" />
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                  <span>10% (Markup 1.1x)</span>
                  <span>150% (Markup 2.5x)</span>
                  <span>300% (Markup 4.0x)</span>
                </div>
              </div>

              <!-- Bento Price Suggestions (Destaque Premium) -->
              <div style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                <!-- Preço Sugerido kg -->
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 18px; border-radius: var(--radius-md); color: #ffffff; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                  <span style="display: block; font-size: 11px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px;">Sugestão de Venda / kg (Pronto)</span>
                  <span id="res-sugestao-kg" style="font-size: 28px; font-weight: 800; display: block; margin-top: 4px;">R$ 0,00</span>
                </div>

                <!-- Preço Sugerido Unidade -->
                <div style="background: linear-gradient(135deg, var(--primary) 0%, #1032CC 100%); padding: 18px; border-radius: var(--radius-md); color: #ffffff; box-shadow: 0 4px 12px rgba(30, 75, 255, 0.2);">
                  <span style="display: block; font-size: 11px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px;">Sugestão de Venda / Unidade</span>
                  <span id="res-sugestao-unidade" style="font-size: 28px; font-weight: 800; display: block; margin-top: 4px;">R$ 0,00</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    `;

    // Inicializa os ícones do Lucide
    if (window.lucide) {
      lucide.createIcons();
    }
  },

  // Recalcula e renderiza apenas os valores dinâmicos
  updateCalculations() {
    const result = CalculadoraMath.calculate(CalculadoraState, this.productsList);
    const receita = CalculadoraState.getReceitaAtiva();

    // 1. Renderizar linhas de ingredientes na tabela
    const tbody = document.getElementById('calc-ingredients-body');
    if (tbody) {
      tbody.innerHTML = result.ingredientes.map((ing, idx) => {
        const isIreksText = ing.nome.includes('(IREKS)') ? `<span style="font-size: 10px; background: rgba(30, 75, 255, 0.08); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-left: 6px;">IREKS</span>` : '';
        const weightText = ing.pesoG >= 1000 ? `${(ing.pesoG / 1000).toFixed(2)} kg` : `${Math.round(ing.pesoG)} g`;
        
        return `
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.03); hover: background-color: var(--bg-card-hover);">
            <td style="padding: 12px 10px; font-size: 14px; font-weight: 500; color: var(--text-main);">
              ${ing.nome} ${isIreksText}
            </td>
            <td style="padding: 12px 10px; font-size: 13px; color: var(--text-secondary); text-align: center; font-weight: 500;">
              ${ing.proporcao}%
            </td>
            <td style="padding: 12px 10px; font-size: 14px; font-weight: 600; color: var(--text-main); text-align: right;">
              ${weightText}
            </td>
            <td style="padding: 8px 10px; text-align: right;">
              <div style="display: inline-flex; align-items: center; background: var(--bg-input); border-radius: var(--radius-sm); padding: 4px 8px; border: 1px solid var(--glass-border);">
                <span style="font-size: 12px; color: var(--text-muted); margin-right: 4px;">R$</span>
                <input type="number" step="0.01" value="${ing.precoKg.toFixed(2)}" oninput="CalculadoraView.handleIngredientPriceChange('${ing.nome}', this.value)" style="width: 60px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: var(--text-main); outline: none; text-align: right;" />
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Atualizar Métricas e Resultados na Coluna Direita
    const resCorteCru = document.getElementById('res-corte-cru');
    const resPesoAssado = document.getElementById('res-peso-assado');
    const resCustoKgAssado = document.getElementById('res-custo-kg-assado');
    const resCustoUnidade = document.getElementById('res-custo-unidade');
    const resSugestaoKg = document.getElementById('res-sugestao-kg');
    const resSugestaoUnidade = document.getElementById('res-sugestao-unidade');

    if (resCorteCru) resCorteCru.innerText = `${result.cortePecaCruG} g`;
    if (resPesoAssado) resPesoAssado.innerText = `${result.pesoPecaAssadoG} g`;
    if (resCustoKgAssado) resCustoKgAssado.innerText = `R$ ${result.custoPorKgMassaAssada.toFixed(2)}`;
    if (resCustoUnidade) resCustoUnidade.innerText = `R$ ${result.custoPorUnidade.toFixed(2)}`;
    
    if (resSugestaoKg) resSugestaoKg.innerText = `R$ ${result.sugestaoVendaPorKg.toFixed(2)}`;
    if (resSugestaoUnidade) resSugestaoUnidade.innerText = `R$ ${result.sugestaoVendaPorUnidade.toFixed(2)}`;
  },

  // Handlers para eventos disparados pela UI
  handleRecipeChange(recipeId) {
    CalculadoraState.selectedReceitaId = recipeId;
    const receita = CalculadoraState.getReceitaAtiva();
    CalculadoraState.rendimentoInput = receita.rendimentoPadrao;
    
    // Atualizar input de rendimento no DOM
    const rendInput = document.getElementById('calc-rendimento');
    if (rendInput) rendInput.value = receita.rendimentoPadrao;

    this.renderLayout(document.getElementById('page-container').querySelector('.apple-calc-wrapper').parentElement);
    this.updateCalculations();
  },

  handleBaseQtyChange(val) {
    CalculadoraState.quantidadeBaseInput = parseFloat(val) || 0;
    this.updateCalculations();
  },

  handleIngredientPriceChange(nome, val) {
    CalculadoraState.setPrecoInsumo(nome, val, this.clienteId);
    
    // Atualiza apenas os cálculos matemáticos para manter a responsividade alta
    // (não recria a tabela inteira para evitar que o cursor perca o foco do input de preço)
    const result = CalculadoraMath.calculate(CalculadoraState, this.productsList);
    const resCustoKgAssado = document.getElementById('res-custo-kg-assado');
    const resCustoUnidade = document.getElementById('res-custo-unidade');
    const resSugestaoKg = document.getElementById('res-sugestao-kg');
    const resSugestaoUnidade = document.getElementById('res-sugestao-unidade');

    if (resCustoKgAssado) resCustoKgAssado.innerText = `R$ ${result.custoPorKgMassaAssada.toFixed(2)}`;
    if (resCustoUnidade) resCustoUnidade.innerText = `R$ ${result.custoPorUnidade.toFixed(2)}`;
    if (resSugestaoKg) resSugestaoKg.innerText = `R$ ${result.sugestaoVendaPorKg.toFixed(2)}`;
    if (resSugestaoUnidade) resSugestaoUnidade.innerText = `R$ ${result.sugestaoVendaPorUnidade.toFixed(2)}`;
  },

  handleRendimentoChange(val) {
    CalculadoraState.rendimentoInput = parseInt(val) || 1;
    this.updateCalculations();
  },

  handleMarkupChange(val) {
    const markup = parseInt(val) || 0;
    CalculadoraState.markup = markup;
    
    // Sincroniza slider e campo numérico
    const range = document.getElementById('calc-markup-range');
    const number = document.getElementById('calc-markup-number');
    if (range && range.value !== markup.toString()) range.value = markup;
    if (number && number.value !== markup.toString()) number.value = markup;

    this.updateCalculations();
  },

  handleReset() {
    CalculadoraState.resetPrecos(this.clienteId);
    
    // Recarrega layout completo
    const wrapper = document.querySelector('.apple-calc-wrapper');
    if (wrapper) {
      this.renderLayout(wrapper.parentElement);
      this.updateCalculations();
      Components.toast('Preços padrão restaurados!', 'success');
    }
  }
};

window.CalculadoraView = CalculadoraView;
