/**
 * Calculadora de Gastos - Math Logic
 * BRAGO Distribuidora - Perfil Vendedor
 */

const CalculadoraMath = {
  // Calcula todas as variáveis de peso e custos com base no estado atual da calculadora
  // e na tabela de produtos do banco de dados (para os preços de tabela de produtos IREKS)
  calculate(state, productsDbList = []) {
    const receita = state.getReceitaAtiva();
    const qtyInput = state.quantidadeBaseInput; // em gramas (ex: 2000g)
    const markupPercent = state.markup; // em % (ex: 150% de markup)
    const rendimento = state.rendimentoInput || receita.rendimentoPadrao;

    // 1. Achar a proporção do produto IREKS nesta receita
    const ireksIngrediente = receita.ingredientes.find(i => i.isIreks);
    const ireksProporcao = ireksIngrediente ? ireksIngrediente.proporcao : 100;

    // 2. Determinar o peso do ingrediente base (100%) em gramas
    let pesoBase100 = 0;
    if (ireksProporcao === 100) {
      // Se o produto IREKS é a própria base 100% da receita (ex: Brioche)
      pesoBase100 = qtyInput;
    } else {
      // Se o produto IREKS é uma fração da base (ex: 10% do peso de farinha)
      pesoBase100 = qtyInput * (100 / ireksProporcao);
    }

    // 3. Calcular a quantidade de cada ingrediente e seu custo individual
    let pesoTotalCru = 0;
    let custoTotalReceita = 0;

    const ingredientesCalculados = receita.ingredientes.map(ing => {
      const pesoG = pesoBase100 * (ing.proporcao / 100);
      pesoTotalCru += pesoG;

      // Buscar o preço do ingrediente
      let precoDb = null;
      if (ing.isIreks && ing.codigo) {
        // Tentar obter preço de venda do banco de dados
        const prodDb = productsDbList.find(p => p.codigo === ing.codigo);
        if (prodDb && prodDb.precoVenda) {
          precoDb = parseFloat(prodDb.precoVenda);
        }
      }
      
      const precoKg = state.getPrecoInsumo(ing.nome, precoDb);
      const custoIngrediente = (pesoG / 1000) * precoKg;
      custoTotalReceita += custoIngrediente;

      return {
        nome: ing.nome,
        proporcao: ing.proporcao,
        pesoG: Math.round(pesoG * 10) / 10, // arredonda para 1 casa decimal
        precoKg: precoKg,
        custo: custoIngrediente
      };
    });

    // 4. Calcular perdas por assamento
    const quebraPercent = receita.quebraPadrao; // ex: 10%
    const pesoTotalAssado = pesoTotalCru * (1 - quebraPercent / 100);

    // 5. Peso das peças individuais (Corte cru e peso assado)
    const cortePecaCruG = rendimento > 0 ? (pesoTotalCru / rendimento) : 0;
    const pesoPecaAssadoG = rendimento > 0 ? (pesoTotalAssado / rendimento) : 0;

    // 6. Custo por kg e custo unitário
    const pesoTotalAssadoKg = pesoTotalAssado / 1000;
    const custoPorKgMassaAssada = pesoTotalAssadoKg > 0 ? (custoTotalReceita / pesoTotalAssadoKg) : 0;
    const custoPorUnidade = rendimento > 0 ? (custoTotalReceita / rendimento) : 0;

    // 7. Sugestão de venda com base no Markup percentual
    // Markup de 150% significa que o preço sugerido é Custo + 150% do Custo = Custo * 2.5
    // Markup de 10% significa que o preço sugerido é Custo + 10% do Custo = Custo * 1.1
    const multiplicador = 1 + (markupPercent / 100);
    const sugestaoVendaPorKg = custoPorKgMassaAssada * multiplicador;
    const sugestaoVendaPorUnidade = custoPorUnidade * multiplicador;

    return {
      ingredientes: ingredientesCalculados,
      pesoTotalCruG: Math.round(pesoTotalCru),
      pesoTotalAssadoG: Math.round(pesoTotalAssado),
      custoTotalReceita: custoTotalReceita,
      cortePecaCruG: Math.round(cortePecaCruG),
      pesoPecaAssadoG: Math.round(pesoPecaAssadoG),
      custoPorKgMassaAssada: custoPorKgMassaAssada,
      custoPorUnidade: custoPorUnidade,
      sugestaoVendaPorKg: sugestaoVendaPorKg,
      sugestaoVendaPorUnidade: sugestaoVendaPorUnidade,
      multiplicador: multiplicador
    };
  }
};

window.CalculadoraMath = CalculadoraMath;
