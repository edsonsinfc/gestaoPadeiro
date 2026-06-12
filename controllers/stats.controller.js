const { Padeiro, Produto, Cliente, Meta, Atividade, Avaliacao, Colaborador } = require('../data/db-adapter');

exports.getGeneralStats = async (req, res) => {
  try {
    const padeiroQuery = { ativo: true, deletado: { $ne: true } };
    const metaQuery = {};
    const atividadeQuery = {};
    const avaliacaoQuery = {};
    
    const hasFilialFilter = req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null';

    if (hasFilialFilter) {
      const filiaisArray = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
      padeiroQuery.filial = { $in: filiaisArray };
      const padeirosDaFilial = await Padeiro.find({ filial: { $in: filiaisArray }, deletado: { $ne: true } });
      const ids = padeirosDaFilial.map(p => p.id);
      metaQuery.padeiroId = { $in: ids };
      atividadeQuery.padeiroId = { $in: ids };
      avaliacaoQuery.padeiroId = { $in: ids };
    }

    let [
      padeirosDocs, produtosDocs, clientesDocs, 
      metasDocs, atividadesDocs, avaliacoesDocs, colaboradoresDocs
    ] = await Promise.all([
      Padeiro.find(padeiroQuery),
      Produto.find(),
      Cliente.find(),
      Meta.find(metaQuery),
      Atividade.find(atividadeQuery),
      Avaliacao.find(avaliacaoQuery),
      Colaborador.find()
    ]);

    // Redundant filtering removed as it's handled by queries above
    // but keeping isRegional check for any other logic if needed.

    const padeiros = padeirosDocs.map(d => d.toJSON());
    const produtos = produtosDocs.map(d => d.toJSON());
    const clientes = clientesDocs.map(d => d.toJSON());
    const metas = metasDocs.map(d => d.toJSON());
    const atividades = atividadesDocs.map(d => d.toJSON());
    const avaliacoes = avaliacoesDocs.map(d => d.toJSON());
    const colaboradoresLength = colaboradoresDocs.length;

    // Stats by cargo
    const porCargo = {};
    padeiros.forEach(p => {
      if (!p.cargo) return;
      porCargo[p.cargo] = (porCargo[p.cargo] || 0) + 1;
    });

    // Stats by filial
    const porFilial = {};
    padeiros.forEach(p => {
      if (!p.filial) return;
      porFilial[p.filial] = (porFilial[p.filial] || 0) + 1;
    });

    // Recent activities
    const recentes = atividades.slice(-10).reverse();

    // Average ratings
    const avalClientes = avaliacoes.filter(a => a.tipo === 'cliente' && !isNaN(parseFloat(a.nota)) && parseFloat(a.nota) >= 0 && parseFloat(a.nota) <= 5);
    const mediaCliente = avalClientes.length > 0
      ? avalClientes.reduce((sum, a) => sum + (parseFloat(a.nota) || 0), 0) / avalClientes.length
      : 0;

    const MesAtual = new Date().toISOString().slice(0, 7);
    const atividadesMes = atividades.filter(a => a.data && a.data.startsWith(MesAtual) && a.status === 'finalizada');
    const totalProduzidoMes = atividadesMes.reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);
    const totalLitrosMes = atividadesMes.reduce((s, a) => s + (parseFloat(a.lTotal) || 0), 0);

    const producaoPorPadeiro = {};
    atividadesMes.forEach(a => {
      if (!producaoPorPadeiro[a.padeiroId]) {
        producaoPorPadeiro[a.padeiroId] = { id: a.padeiroId, nome: a.padeiroNome, totalKg: 0, totalLiters: 0, totalAtividades: 0 };
      }
      producaoPorPadeiro[a.padeiroId].totalKg += parseFloat(a.kgTotal) || 0;
      producaoPorPadeiro[a.padeiroId].totalLiters += parseFloat(a.lTotal) || 0;
      producaoPorPadeiro[a.padeiroId].totalAtividades++;
    });

    const rankingProducao = Object.values(producaoPorPadeiro)
      .sort((a, b) => b.totalKg - a.totalKg);
    const top10Pads = rankingProducao.slice(0, 10).map((p, i) => {
      const padeiro = padeiros.find(x => x.id === p.id);
      const avsPadeiro = avaliacoes.filter(a => a.padeiroId === p.id);
      const notaMedia = avsPadeiro.length > 0
        ? avsPadeiro.reduce((s, a) => s + (a.nota || 0), 0) / avsPadeiro.length : null;
      return { ...p, posicao: i + 1, cargo: padeiro?.cargo || '', notaMedia };
    });

    const notasPorPadeiro = {};
    avaliacoes.forEach(a => {
      if (!notasPorPadeiro[a.padeiroId]) {
        notasPorPadeiro[a.padeiroId] = { id: a.padeiroId, nome: a.padeiroNome, notas: [], totalAvals: 0 };
      }
      const notaNum = parseFloat(a.nota);
      if (!isNaN(notaNum) && notaNum <= 5) {
        notasPorPadeiro[a.padeiroId].notas.push(notaNum);
        notasPorPadeiro[a.padeiroId].totalAvals++;
      }
    });
    const pontoCritico = Object.values(notasPorPadeiro)
      .map(p => ({
        ...p,
        media: p.notas.length > 0 ? p.notas.reduce((a, b) => a + parseFloat(b), 0) / p.notas.length : null,
        cargo: padeiros.find(x => x.id === p.id)?.cargo || ''
      }))
      .filter(p => p.media !== null)
      .sort((a, b) => a.media - b.media)
      .slice(0, 10);

    const atendimentosPorCliente = {};
    atividades.filter(a => a.status === 'finalizada').forEach(a => {
      const key = a.clienteId || a.clienteNome;
      if (!key) return;
      if (!atendimentosPorCliente[key]) {
        atendimentosPorCliente[key] = { id: a.clienteId, nome: a.clienteNome, totalAtendimentos: 0, totalKg: 0, totalLiters: 0, notas: [] };
      }
      atendimentosPorCliente[key].totalAtendimentos++;
      atendimentosPorCliente[key].totalKg += parseFloat(a.kgTotal) || 0;
      atendimentosPorCliente[key].totalLiters += parseFloat(a.lTotal) || 0;
      const nota = a.notaPadeiroCliente !== undefined && a.notaPadeiroCliente !== null ? a.notaPadeiroCliente : a.notaCliente;
      if (nota) atendimentosPorCliente[key].notas.push(nota);
    });
    const rankingClientes = Object.values(atendimentosPorCliente)
      .map(c => ({
        ...c,
        notaMedia: c.notas.length > 0 ? c.notas.reduce((a, b) => a + parseFloat(b), 0) / c.notas.length : null
      }))
      .sort((a, b) => b.totalAtendimentos - a.totalAtendimentos)
      .slice(0, 10);

    const produtosMaisUsadosMap = {};
    atividades.filter(a => a.status === 'finalizada').forEach(a => {
      let items = [];
      if (a.kgItens) {
        if (typeof a.kgItens === 'string') {
          try {
            items = JSON.parse(a.kgItens);
          } catch (e) {
            items = [];
          }
        } else if (Array.isArray(a.kgItens)) {
          items = a.kgItens;
        }
      }
      items.forEach(item => {
        const name = item.produtoNome || item.produto || 'Produto Desconhecido';
        const id = item.produtoId || '';
        const qtd = parseFloat(item.quantidade) || parseFloat(item.kg) || 0;
        const un = (item.unidade || 'KG').toUpperCase();
        
        if (!produtosMaisUsadosMap[name]) {
          produtosMaisUsadosMap[name] = {
            produtoNome: name,
            produtoId: id,
            totalQtd: 0,
            unidade: un,
            totalAtendimentos: 0
          };
        }
        produtosMaisUsadosMap[name].totalQtd += qtd;
        produtosMaisUsadosMap[name].totalAtendimentos++;
      });
    });

    const produtosMaisUsados = Object.values(produtosMaisUsadosMap)
      .sort((a, b) => b.totalQtd - a.totalQtd)
      .slice(0, 5);

    // Calcular Padeiros Inativos Hoje
    const Hoje = new Date().toISOString().split('T')[0];
    const atividadesHoje = atividades.filter(a => a.data && a.data.startsWith(Hoje) && a.status === 'finalizada');
    const padeirosAtivosHojeIds = new Set(atividadesHoje.map(a => a.padeiroId));
    
    const padeirosInativos = padeiros
      .filter(p => !padeirosAtivosHojeIds.has(p.id))
      .map(p => ({
        id: p.id,
        nome: p.nome,
        telefone: p.telefone || '',
        filial: p.filial || ''
      }));

    res.json({
      produtosMaisUsados,
      totalPadeiros: padeiros.length,
      totalProdutos: produtos.length,
      totalClientes: clientes.length,
      totalClientesAtendidos: Object.keys(atendimentosPorCliente).length,
      totalColaboradores: colaboradoresLength,
      totalMetas: metas.length,
      totalAtividades: atividades.length,
      mediaAvaliacaoCliente: Math.round(mediaCliente * 10) / 10,
      porCargo,
      porFilial,
      atividadesRecentes: recentes,
      totalProduzidoMes: Math.round(totalProduzidoMes * 10) / 10,
      totalLitrosMes: Math.round(totalLitrosMes * 10) / 10,
      mesAtual: MesAtual,
      top10Pads,
      pontoCritico,
      rankingClientes,
      rankingProducao: rankingProducao.slice(0, 10),
      padeirosInativos
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
};

exports.getFiliaisStats = async (req, res) => {
  try {
    const [padeiros, atividades, avaliacoes] = await Promise.all([
      Padeiro.find({ ativo: true, deletado: { $ne: true } }),
      Atividade.find(),
      Avaliacao.find()
    ]);

    const filiais = ['Brago Brasília', 'Brago Goiania', 'Brago Palmas', 'Brago Campo Grande'];
    const metrics = filiais.map(f => {
      const pFilial = padeiros.filter(p => p.filial === f);
      const ids = pFilial.map(p => p.id);
      
      const aFilial = atividades.filter(a => ids.includes(a.padeiroId));
      const avFilial = avaliacoes.filter(av => ids.includes(av.padeiroId));
      
      const kgTotal = aFilial.reduce((sum, a) => sum + parseFloat(a.kgTotal || 0), 0);
      const lTotal = aFilial.reduce((sum, a) => sum + parseFloat(a.lTotal || 0), 0);
      const notaMedia = avFilial.length > 0 
        ? avFilial.reduce((sum, av) => sum + parseFloat(av.nota || 0), 0) / avFilial.length 
        : 0;

      return {
        nome: f,
        totalPadeiros: pFilial.length,
        totalAtividades: aFilial.length,
        kgTotal: kgTotal.toFixed(1),
        lTotal: lTotal.toFixed(1),
        notaMedia: notaMedia.toFixed(1)
      };
    });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar métricas das filiais' });
  }
};

exports.getFilialDetail = async (req, res) => {
  try {
    const filialNome = req.params.nome;
    const [padeiros, atividades, avaliacoes] = await Promise.all([
      Padeiro.find({ filial: filialNome, ativo: true, deletado: { $ne: true } }),
      Atividade.find(),
      Avaliacao.find()
    ]);

    const padeiroIds = padeiros.map(p => p.id);
    const atividadesFilial = atividades.filter(a => padeiroIds.includes(a.padeiroId));
    const avaliacoesFilial = avaliacoes.filter(av => padeiroIds.includes(av.padeiroId));

    const padeirosStats = padeiros.map(p => {
      const pAtiv = atividadesFilial.filter(a => a.padeiroId === p.id);
      const pAv = avaliacoesFilial.filter(av => av.padeiroId === p.id);
      
      const kgTotal = pAtiv.reduce((sum, a) => sum + parseFloat(a.kgTotal || 0), 0);
      const lTotal = pAtiv.reduce((sum, a) => sum + parseFloat(a.lTotal || 0), 0);
      const notaMedia = pAv.length > 0 
        ? pAv.reduce((sum, av) => sum + parseFloat(av.nota || 0), 0) / pAv.length 
        : null;

      return {
        id: p.id,
        nome: p.nome,
        kgTotal: kgTotal.toFixed(1),
        lTotal: lTotal.toFixed(1),
        notaMedia: notaMedia ? notaMedia.toFixed(1) : null,
        totalAtividades: pAtiv.length
      };
    }).sort((a, b) => b.kgTotal - a.kgTotal);

    res.json({
      nome: filialNome,
      totalPadeiros: padeiros.length,
      totalAtividades: atividadesFilial.length,
      kgTotal: atividadesFilial.reduce((sum, a) => sum + parseFloat(a.kgTotal || 0), 0).toFixed(1),
      lTotal: atividadesFilial.reduce((sum, a) => sum + parseFloat(a.lTotal || 0), 0).toFixed(1),
      padeiros: padeirosStats,
      atividadesRecentes: atividadesFilial.slice(-10).reverse()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar detalhes da filial' });
  }
};
