const { Avaliacao } = require('../data/db-adapter');

exports.listAvaliacoes = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'padeiro') {
      query.padeiroId = req.user.id;
    }
    if (req.query.padeiroId) {
      query.padeiroId = req.query.padeiroId;
    }
    if (req.query.tipo) {
      query.tipo = req.query.tipo;
    }
    const avaliacoes = await Avaliacao.find(query);
    res.json(avaliacoes);
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({ error: 'Erro ao carregar avaliações' });
  }
};

exports.createAvaliacao = async (req, res) => {
  try {
    // Campos que REALMENTE existem na tabela MySQL 'avaliacoes'
    const validColumns = [
      'id', 'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'atividadeId',
      'tipo', 'respostas', 'nota', 'observacao', 'avaliadoPor', 'avaliadoPorNome', 'criadoEm'
    ];

    const nova = {
      avaliadoPor: req.user.id,
      avaliadoPorNome: req.user.nome,
      criadoEm: new Date().toISOString()
    };

    // Mapeamento Inteligente: Front -> Banco
    // 1. Campos diretos
    validColumns.forEach(col => {
      if (req.body[col] !== undefined) nova[col] = req.body[col];
    });

    // 2. Traduções de nomes do Frontend para o Banco
    if (req.body.nota !== undefined) nova.nota = req.body.nota;
    if (req.body.respostas !== undefined) nova.respostas = req.body.respostas;
    if (req.body.observacao !== undefined) nova.observacao = req.body.observacao;

    // Remove qualquer campo que não esteja na lista de colunas válidas (segurança extra)
    Object.keys(nova).forEach(key => {
      if (!validColumns.includes(key)) delete nova[key];
    });

    const avaliacao = await Avaliacao.create(nova);
    res.status(201).json(avaliacao);
  } catch (error) {
    console.error('ERRO AO SALVAR AVALIAÇÃO:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar avaliação', 
      details: error.message,
      doc: req.body // Nos ajuda a ver o que o front enviou
    });
  }
};

exports.resetAllAvaliacoes = async (req, res) => {
  try {
    await Avaliacao.deleteMany({});
    res.json({ success: true, message: 'Todas as avaliações foram removidas.' });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao resetar avaliações' });
  }
};
