const bcrypt = require('bcryptjs');
const { Admin, Padeiro } = require('../data/db-adapter');

exports.listUsers = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const admins = await Admin.find({ deletado: { $ne: true } });
    const padeiros = await Padeiro.find({ deletado: { $ne: true } });
    
    const combined = [
      ...admins.map(a => ({ ...a, source: 'admin' })),
      ...padeiros.map(p => ({ ...p, source: 'padeiro' }))
    ];

    res.json(combined.map(u => {
      const { passwordHash, firstAccessToken, ...rest } = u;
      return rest;
    }));
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
};

exports.createUser = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const { nome, email, senha, role, filial } = req.body;
    
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });

    // Check if email already exists
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(senha, 10);
    const novo = await Admin.create({
      nome,
      email,
      passwordHash,
      role: role || 'gestor_regional',
      filial: role === 'gestor_regional' ? filial : null,
      ativo: req.body.ativo !== undefined ? (req.body.ativo === 'true' || req.body.ativo === true) : true,
      criadoEm: new Date().toISOString()
    });

    const result = { ...novo };
    delete result.passwordHash;
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

exports.deleteUser = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    
    // Soft delete: set deletado=true
    const update = { deletado: true, ativo: false, atualizadoEm: new Date().toISOString() };
    
    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, update);
    if (!updatedAdmin) {
      await Padeiro.findByIdAndUpdate(req.params.id, update);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};
exports.updateUser = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const { nome, email, senha, role, filial, ativo } = req.body;
    const updateData = { nome, email, role };
    
    if (ativo !== undefined) {
      updateData.ativo = (ativo === 'true' || ativo === true);
    }
    
    if (role === 'gestor_regional') updateData.filial = filial;
    else if (role !== undefined) updateData.filial = null;

    if (senha) {
      updateData.passwordHash = await bcrypt.hash(senha, 10);
    }

    // Update in both potential collections
    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, updateData);
    if (!updatedAdmin) {
      await Padeiro.findByIdAndUpdate(req.params.id, updateData);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};
