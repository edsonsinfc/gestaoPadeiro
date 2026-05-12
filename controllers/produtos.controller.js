const { Produto } = require('../data/db-adapter');

exports.listProdutos = async (req, res) => {
  const produtos = await Produto.find();
  res.json(produtos);
};

exports.createProduto = async (req, res) => {
  const novo = { ...req.body, ativo: true, criadoEm: new Date().toISOString() };
  const produto = await Produto.create(novo);
  res.status(201).json(produto);
};

exports.updateProduto = async (req, res) => {
  try {
    const produto = await Produto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!produto) return res.status(404).json({ error: 'Não encontrado' });
    res.json(produto);
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};

exports.deleteProduto = async (req, res) => {
  try {
    await Produto.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};
