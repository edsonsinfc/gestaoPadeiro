const fs = require('fs');
const path = require('path');
const driveMappings = require('../data/driveMappings');
const { Produto } = require('../data/db-adapter');

const PRODUTO_IMG_CACHE = path.join(__dirname, '..', 'data', 'produtos_cache');
const validExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'JPG', 'PNG'];

function cacheHasProductPhoto(codigo) {
  if (!codigo) return false;
  for (const ext of validExts) {
    const cachedPath = path.join(PRODUTO_IMG_CACHE, `${codigo}.${ext}`);
    if (fs.existsSync(cachedPath)) {
      return true;
    }
  }
  return false;
}

function hasDriveMapping(codigo) {
  if (!codigo) return false;
  for (const ext of validExts) {
    const filename = `${codigo}.${ext}`;
    if (driveMappings.getMapping(filename)) {
      return true;
    }
  }
  return false;
}

const FORBIDDEN_SUPPLIERS = [
  'DOUPAN',
  'ORGAO PUBLICO',
  'ÓRGÃO PÚBLICO',
  'DIMINAS',
  'MELHOR BOCADO',
  'AB BRASIL',
  'RICONI'
];

function isForbiddenProduct(p) {
  if (!p) return true;
  const f = (p.fornecedor || '').toUpperCase().trim();
  const d = (p.descricao || '').toUpperCase().trim();
  if (FORBIDDEN_SUPPLIERS.some(forbidden => f.includes(forbidden))) return true;
  if (d.includes('BATEDOR') && (d.includes('ARAME') || d.includes('FOUET') || d.includes('INOX'))) return true;
  if (d.includes('BATEDOR DE ARAME')) return true;
  return false;
}

exports.listProdutos = async (req, res) => {
  try {
    const rawProdutos = await Produto.find();
    const produtos = rawProdutos.filter(p => !isForbiddenProduct(p));
    
    // Check if the FTP catalog is loaded/available
    let catalog = {};
    if (typeof global.getFtpCatalog === 'function') {
      try {
        catalog = await global.getFtpCatalog();
      } catch (err) {
        console.warn('Erro ao obter catálogo FTP no controller:', err);
      }
    }
    
    // Map products to include the temFoto flag
    const result = produtos.map(p => {
      const pObj = p.toObject ? p.toObject() : p;
      const codigo = p.codigo || '';
      const temFoto = !!(codigo && (catalog[codigo] || cacheHasProductPhoto(codigo) || hasDriveMapping(codigo)));
      return {
        ...pObj,
        temFoto
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
};

exports.createProduto = async (req, res) => {
  try {
    const novo = { ...req.body, ativo: true, criadoEm: new Date().toISOString() };
    const produto = await Produto.create(novo);
    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
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
