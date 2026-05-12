const { Criterio } = require('../data/db-adapter');

exports.listCriterios = async (req, res) => {
  try {
    let criterios = await Criterio.find();
    if (criterios.length === 0) {
      const defaultCriterios = [
        { texto: 'Cumpriu o horário?', tipo: 'boolean' },
        { texto: 'Cumpriu a meta semanal?', tipo: 'boolean' },
        { texto: 'Qualidade dos produtos', tipo: 'nota' },
        { texto: 'Higiene e organização', tipo: 'nota' },
        { texto: 'Uso correto do uniforme/EPIs', tipo: 'boolean' },
        { texto: 'Relacionamento com o cliente', tipo: 'nota' },
        { texto: 'Registrou atividades corretamente?', tipo: 'boolean' }
      ];
      await Criterio.insertMany(defaultCriterios);
      criterios = await Criterio.find();
    }
    res.json(criterios);
  } catch (error) {
    console.error('Erro ao listar critérios:', error);
    res.status(500).json({ error: 'Erro ao carregar critérios' });
  }
};

exports.updateCriterios = async (req, res) => {
  try {
    await Criterio.deleteMany({});
    await Criterio.insertMany(req.body.map(c => ({ texto: c.texto, tipo: c.tipo })));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar critérios:', error);
    res.status(500).json({ error: 'Erro ao atualizar critérios' });
  }
};
