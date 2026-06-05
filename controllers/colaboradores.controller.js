const { Colaborador } = require('../data/db-adapter');

exports.listColaboradores = async (req, res) => {
  try {
    const colaboradores = await Colaborador.find();
    res.json(colaboradores);
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error);
    res.status(500).json({ error: 'Erro ao listar colaboradores' });
  }
};

exports.getColaboradoresByFilial = async (req, res) => {
  try {
    const filial = req.params.filial || '';
    // Escapa a string para evitar erro na Regex e Injeção de Regex (ReDoS)
    const safeFilial = filial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const colaboradores = await Colaborador.find({ filial: new RegExp(safeFilial, 'i') });
    res.json(colaboradores);
  } catch (error) {
    console.error('Erro ao buscar colaboradores por filial:', error);
    res.status(500).json({ error: 'Erro ao buscar colaboradores por filial' });
  }
};
