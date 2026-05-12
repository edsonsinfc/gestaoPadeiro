const { Colaborador } = require('../data/db-adapter');

exports.listColaboradores = async (req, res) => {
  const colaboradores = await Colaborador.find();
  res.json(colaboradores);
};

exports.getColaboradoresByFilial = async (req, res) => {
  const filial = req.params.filial;
  // Use regex for case-insensitive partial match
  const colaboradores = await Colaborador.find({ filial: new RegExp(filial, 'i') });
  res.json(colaboradores);
};
