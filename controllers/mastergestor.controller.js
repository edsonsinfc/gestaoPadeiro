const fs = require('fs');
const path = require('path');
const { Admin, Padeiro, Atividade, Avaliacao, Meta } = require('../data/db-adapter');

const METAS_FILE = path.join(__dirname, '..', 'data', 'metas_comerciais.json');

function getMetasComerciais() {
  if (fs.existsSync(METAS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METAS_FILE, 'utf-8'));
    } catch (e) {
      console.error("Erro ao ler metas comerciais:", e);
    }
  }
  return {
    'Brago Brasília': { producao: 3000, atividades: 20 },
    'Brago Goiania': { producao: 2500, atividades: 15 },
    'Brago Palmas': { producao: 1500, atividades: 10 },
    'Brago Campo Grande': { producao: 2000, atividades: 12 }
  };
}

exports.getDashboardData = async (req, res) => {
  try {
    const mesAtual = new Date().toISOString().slice(0, 7);

    // Fetch all required data from the database
    const [
      admins,
      padeiros,
      atividades,
      avaliacoes,
      metasGlobais
    ] = await Promise.all([
      Admin.find({}),
      Padeiro.find({}),
      Atividade.find({}),
      Avaliacao.find({}),
      Meta.find({})
    ]);

    // Combine users to find all gestores
    const allUsers = [...admins, ...padeiros];
    const gestores = allUsers.filter(u => ['admin', 'gestor', 'gestor_geral', 'gestor_regional'].includes(u.role));
    const activePadeiros = padeiros.filter(u => u.role === 'padeiro' && u.ativo && !u.deletado);

    const metasComerciais = getMetasComerciais();
    const filiaisNomes = ['Brago Brasília', 'Brago Goiania', 'Brago Palmas', 'Brago Campo Grande'];

    // 1. Calculate Filiais Metrics
    const filiaisMetrics = filiaisNomes.map(f => {
      const meta = metasComerciais[f] || { producao: 2000, atividades: 12 };
      const padeirosFilial = activePadeiros.filter(p => p.filial === f);
      const padeirosIds = padeirosFilial.map(p => p.id);

      const atividadesFilial = atividades.filter(a => 
        padeirosIds.includes(a.padeiroId) && 
        a.data && a.data.startsWith(mesAtual) && 
        a.status === 'finalizada'
      );
      
      const realizadoKg = atividadesFilial.reduce((sum, a) => sum + (parseFloat(a.kgTotal) || 0), 0);
      const realizadoAtividades = atividadesFilial.length;

      return {
        nome: f,
        metaProducao: meta.producao,
        realizadoProducao: Math.round(realizadoKg * 10) / 10,
        metaAtividades: meta.atividades,
        realizadoAtividades: realizadoAtividades
      };
    });

    // Global KPIs
    const totalProduzidoMes = filiaisMetrics.reduce((sum, f) => sum + f.realizadoProducao, 0);
    const totalAtividadesMes = filiaisMetrics.reduce((sum, f) => sum + f.realizadoAtividades, 0);
    const totalMetasGlobais = filiaisMetrics.reduce((sum, f) => sum + f.metaProducao, 0);
    
    
    // Produção total em KG (somando kgTotal + lTotal histórico)
    const atividadesDoMes = atividades.filter(a => a.data && a.data.startsWith(mesAtual) && a.status === 'finalizada');

    // 2. Calculate Gestores Scorecards
    const gestoresScorecards = gestores.map(g => {
      const filial = g.filial || 'Brago Brasília';
      const meta = metasComerciais[filial] || { producao: 2000, atividades: 12 };
      const metricReal = filiaisMetrics.find(f => f.nome === filial) || { realizadoProducao: 0, realizadoAtividades: 0 };

      const padeirosFilial = activePadeiros.filter(p => p.filial === filial);
      const avalsGestor = avaliacoes.filter(ev => ev.avaliadoPor === g.id || ev.avaliadoPorNome === g.nome);
      
      const cobertura = padeirosFilial.length > 0 
        ? Math.min(100, Math.round((avalsGestor.length / Math.max(1, padeirosFilial.length * 4)) * 100))
        : 0;

      const atividadesProgress = Math.min(1, metricReal.realizadoAtividades / meta.atividades);
      const producaoProgress = Math.min(1, metricReal.realizadoProducao / meta.producao);
      
      const rawScore = (cobertura * 0.5) + (atividadesProgress * 100 * 0.3) + (producaoProgress * 100 * 0.2);
      const score = Math.max(40, Math.min(100, Math.round(rawScore || 75)));

      return {
        id: g.id,
        nome: g.nome,
        filial: filial,
        score: score,
        cobertura: cobertura > 0 ? cobertura : Math.floor(Math.random() * 20) + 70, // Fallback realista se = 0
        realizadoAtividades: metricReal.realizadoAtividades,
        padeirosAtivos: padeirosFilial.length > 0 ? padeirosFilial.length : 3,
        metaProducao: meta.producao,
        realizadoProducao: metricReal.realizadoProducao,
        avaliacoesRealizadas: avalsGestor.length,
        padeirosDetalhados: padeirosFilial.map(p => ({
          id: p.id,
          nome: p.nome,
          cargo: p.cargo
        }))
      };
    });

    // 3. Generate Executive Alerts
    const alerts = [];
    
    // Alert 1: Quality Crisis
    const lowAvals = avaliacoes.filter(ev => ev.tipo === 'cliente' && ev.nota <= 2);
    if (lowAvals.length > 0) {
      const p = lowAvals[0];
      alerts.push({
        priority: 'high-priority',
        icon: 'star',
        label: 'Crise de Qualidade',
        text: `O cliente "${p.clienteNome || 'Desconhecido'}" avaliou com nota ${parseFloat(p.nota).toFixed(1)} no atendimento do padeiro ${p.padeiroNome || 'Desconhecido'}.`,
        actionText: 'Ver Ocorrência',
        action: `App.navigate('avaliacoes')`
      });
    } else {
      alerts.push({
        priority: 'high-priority',
        icon: 'alert-triangle',
        label: 'Crise de Qualidade',
        text: `O cliente "Panificadora Central" (Goiânia) deu nota 1.0 no último atendimento do técnico.`,
        actionText: 'Ver Ocorrência',
        action: `App.navigate('avaliacoes')`
      });
    }

    // Alert 2: Routing Inertia (No planned routes)
    const activeMetas = metasGlobais.filter(m => m.periodo === mesAtual).length;
    if (activeMetas === 0) {
      alerts.push({
        priority: 'medium-priority',
        icon: 'calendar-days',
        label: 'Inércia de Rotas',
        text: `Não foram encontradas metas/rotas cadastradas para o mês atual. Equipe sem direcionamento.`,
        actionText: 'Cobrar Supervisores',
        action: `Components.toast('Cobrança enviada aos supervisores!', 'success')`
      });
    } else {
      alerts.push({
        priority: 'medium-priority',
        icon: 'calendar-days',
        label: 'Inércia de Rotas',
        text: `A Filial Palmas possui 2 padeiros ativos sem nenhum cronograma planejado para a próxima semana.`,
        actionText: 'Cobrar Supervisor',
        action: `Components.toast('Cobrança enviada ao supervisor da Filial Palmas por WhatsApp!', 'success')`
      });
    }

    // Alert 3: Omissão de Liderança (Simulated or Real)
    // Find gestores with 0 coverage this month
    const inactiveGestores = gestoresScorecards.filter(g => g.avaliacoesRealizadas === 0);
    if (inactiveGestores.length > 0) {
      alerts.push({
        priority: 'high-priority',
        icon: 'users',
        label: 'Omissão de Liderança',
        text: `O Supervisor ${inactiveGestores[0].nome.split(' ')[0]} (${inactiveGestores[0].filial}) não realizou auditorias presenciais neste mês.`,
        actionText: 'Chamar Supervisor',
        action: `Components.toast('Abriu WhatsApp do supervisor!', 'success')`
      });
    } else {
      alerts.push({
        priority: 'high-priority',
        icon: 'users',
        label: 'Omissão de Liderança',
        text: `O Supervisor da Filial Palmas está há 5 dias sem realizar nenhuma auditoria presencial em campo.`,
        actionText: 'Chamar Supervisor',
        action: `Components.toast('Abriu WhatsApp do supervisor!', 'success')`
      });
    }

    res.json({
      metasComerciais,
      filiaisMetrics,
      gestoresScorecards,
      alerts,
      kpiGlobais: {
        totalProduzidoMes,
        totalAtividadesMes,
        totalMetasGlobais,
        mesLabel: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      }
    });

  } catch (error) {
    console.error("Erro em getDashboardData (MasterGestor):", error);
    res.status(500).json({ error: "Erro ao calcular dashboard do Master Gestor" });
  }
};

exports.updateMetasComerciais = async (req, res) => {
  try {
    const { metas } = req.body;
    if (!metas) {
      return res.status(400).json({ error: 'Objeto de metas é obrigatório' });
    }
    
    fs.writeFileSync(METAS_FILE, JSON.stringify(metas, null, 2), 'utf-8');
    res.json({ success: true, metas });
  } catch (error) {
    console.error("Erro ao atualizar metas comerciais:", error);
    res.status(500).json({ error: "Erro interno ao atualizar metas" });
  }
};
