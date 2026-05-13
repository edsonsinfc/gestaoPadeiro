const bcrypt = require('bcryptjs');
const { Admin } = require('../data/db-adapter');

exports.listUsers = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const admins = await Admin.find();
    res.json(admins.map(a => {
      const { passwordHash, ...rest } = a;
      return rest;
    }));
  } catch (error) {
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
    
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};
exports.updateUser = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    const { nome, email, senha, role, filial } = req.body;
    const updateData = { nome, email, role };
    
    if (role === 'gestor_regional') updateData.filial = filial;
    else updateData.filial = null;

    if (senha) {
      updateData.passwordHash = await bcrypt.hash(senha, 10);
    }

    await Admin.findByIdAndUpdate(req.params.id, updateData);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};
