/**
 * CONTROLLER DO MÓDULO BIA AUTÔNOMA
 * SmartGestor - Brago Distribuidora
 */

const MetasAutonomasService = require('./metas-autonomas.service');
const BiaCronMetasService = require('./bia-cron-metas.service');

exports.cadastrarMetasMensais = async (req, res) => {
  try {
    const user = req.user || {};

    if (user.role === 'padeiro') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores e gestores podem cadastrar metas.'
      });
    }

    const { periodo, fatorEvolucao } = req.body || {};

    const resultado = await MetasAutonomasService.processarMetasMensais({
      periodo,
      usuarioSolicitante: user,
      apenasSimulacao: false,
      fatorEvolucao: parseFloat(fatorEvolucao) || 1.06
    });

    if (!resultado.sucesso) {
      return res.status(400).json(resultado);
    }

    res.status(200).json(resultado);
  } catch (err) {
    console.error('[BIA Autônoma Controller] Erro ao cadastrar metas mensais:', err);
    res.status(500).json({
      error: 'Erro interno ao processar cadastro autônomo de metas.',
      detalhes: err.message
    });
  }
};

exports.preverMetasMensais = async (req, res) => {
  try {
    const user = req.user || {};

    if (user.role === 'padeiro') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores e gestores podem visualizar simulações de metas.'
      });
    }

    const { periodo, fatorEvolucao } = req.query || {};

    const resultado = await MetasAutonomasService.processarMetasMensais({
      periodo,
      usuarioSolicitante: user,
      apenasSimulacao: true,
      fatorEvolucao: parseFloat(fatorEvolucao) || 1.06
    });

    res.status(200).json(resultado);
  } catch (err) {
    console.error('[BIA Autônoma Controller] Erro ao simular metas mensais:', err);
    res.status(500).json({
      error: 'Erro interno ao simular metas autônomas.',
      detalhes: err.message
    });
  }
};

exports.getStatusAutonomia = async (req, res) => {
  try {
    const user = req.user || {};
    const hoje = new Date();
    const periodoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    res.status(200).json({
      status: 'ativo',
      versao: '1.0.0',
      modulo: 'bia-autonoma',
      periodoVigente: periodoAtual,
      periodoNome: MetasAutonomasService.getNomeMes(periodoAtual),
      recursosDisponiveis: [
        'cadastro_metas_mensais_por_padeiro',
        'simulacao_preditiva_metas',
        'balanceamento_historico_producao'
      ],
      permissoes: {
        usuario: user.nome || 'Desconhecido',
        role: user.role || 'guest',
        acessoGlobal: user.role === 'admin' || user.role === 'master_gestor',
        filial: user.filial || 'Todas'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar status da autonomia.' });
  }
};

exports.getCronStatus = async (req, res) => {
  try {
    const estado = BiaCronMetasService.carregarEstado();
    res.json({
      sucesso: true,
      estado,
      regras: {
        faseAtual: !estado.testeExecutadoEm ? 'Pendente de teste hoje' : (!estado.testeLimpo ? 'Teste ativo (será limpo amanhã)' : 'Teste limpo. Aguardando dia 20 oficial'),
        rotinaOficial: 'Todo dia 20 de cada mês para o próximo ciclo'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter status do cron', detalhes: err.message });
  }
};

exports.forcarTesteCron = async (req, res) => {
  try {
    const estado = await BiaCronMetasService.forcarTesteAgora();
    res.json({ sucesso: true, mensagem: 'Teste forçado executado com sucesso!', estado });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao executar teste forçado', detalhes: err.message });
  }
};

exports.forcarLimpezaCron = async (req, res) => {
  try {
    const resultado = await BiaCronMetasService.forcarLimpezaTesteAgora();
    res.json({ sucesso: true, mensagem: 'Limpeza de teste executada com sucesso!', resultado });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao executar limpeza forçada', detalhes: err.message });
  }
};
