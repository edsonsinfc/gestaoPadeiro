const bcrypt = require('bcryptjs');
const { Admin } = require('../data/db-adapter');

exports.listUsers = async (req, res) => {
  console.log(`[AUTH DEBUG] User ${req.user.email} with role ${req.user.role} requesting admin list`);
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
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
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
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
      role: role || 'gestor',
      filial: role === 'gestor' ? filial : null,
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
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
};
