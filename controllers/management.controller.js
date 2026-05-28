const bcrypt = require('bcryptjs');
const { Admin, Padeiro, Atividade, Meta, Avaliacao, Cronograma, Cliente } = require('../data/db-adapter');

exports.listUsers = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    let admins, padeiros;
    try {
      admins = await Admin.find({ deletado: { $ne: true } });
      padeiros = await Padeiro.find({ deletado: { $ne: true } });
    } catch (e) {
      // Fallback if 'deletado' column doesn't exist yet
      console.warn('Fallback: deletado column missing, fetching all users');
      admins = await Admin.find();
      padeiros = await Padeiro.find();
    }
    
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

    // Check if email already exists in either collection
    const existsAdmin = await Admin.findOne({ email });
    const existsPadeiro = await Padeiro.findOne({ email });
    if (existsAdmin || existsPadeiro) return res.status(400).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(senha, 10);
    
    let novo;
    if (role === 'padeiro') {
      novo = await Padeiro.create({
        nome,
        email,
        passwordHash,
        role: 'padeiro',
        filial: filial || null,
        ativo: req.body.ativo !== undefined ? (req.body.ativo === 'true' || req.body.ativo === true) : true,
        criadoEm: new Date().toISOString()
      });
    } else {
      novo = await Admin.create({
        nome,
        email,
        passwordHash,
        role: role || 'gestor_regional',
        filial: role === 'gestor_regional' ? filial : null,
        ativo: req.body.ativo !== undefined ? (req.body.ativo === 'true' || req.body.ativo === true) : true,
        criadoEm: new Date().toISOString()
      });
    }

    const result = { ...novo };
    delete result.passwordHash;
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

exports.deleteUser = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    
    const userId = req.params.id;

    // Try to delete from Admin
    const deletedAdmin = await Admin.findByIdAndDelete(userId);
    
    // If not admin, try Padeiro and perform cascade delete
    if (!deletedAdmin) {
      await Promise.all([
        Padeiro.findByIdAndDelete(userId),
        Atividade.deleteMany({ padeiroId: userId }),
        Meta.deleteMany({ padeiroId: userId }),
        Avaliacao.deleteMany({ padeiroId: userId }),
        Cronograma.deleteMany({ padeiroId: userId })
      ]);
    } else {
      // If it was an admin, also clean up evaluations performed by them if necessary
      // (Optional, but matches "any screen" requirement)
      await Avaliacao.deleteMany({ avaliadoPor: userId });
    }
    
    res.json({ success: true, message: 'Usuário e todos os seus registros foram excluídos permanentemente.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário permanentemente', details: error.message });
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
    
    if (role === 'gestor_regional' || role === 'padeiro') {
      updateData.filial = filial;
    } else if (role !== undefined) {
      updateData.filial = null;
    }

    if (senha) {
      updateData.passwordHash = await bcrypt.hash(senha, 10);
    }

    // Check if user is currently in Admin or Padeiro collection
    const currentAdmin = await Admin.findById(req.params.id);
    const currentPadeiro = await Padeiro.findById(req.params.id);

    if (role === 'padeiro') {
      // If we are changing role to baker:
      if (currentAdmin) {
        // Move from Admin to Padeiro collection
        await Admin.findByIdAndDelete(req.params.id);
        await Padeiro.create({
          id: req.params.id,
          nome: updateData.nome || currentAdmin.nome,
          email: updateData.email || currentAdmin.email,
          passwordHash: updateData.passwordHash || currentAdmin.passwordHash,
          role: 'padeiro',
          filial: updateData.filial !== undefined ? updateData.filial : currentAdmin.filial,
          ativo: updateData.ativo !== undefined ? updateData.ativo : currentAdmin.ativo,
          criadoEm: currentAdmin.criadoEm || new Date().toISOString()
        });
      } else if (currentPadeiro) {
        // Just update in Padeiro collection
        await Padeiro.findByIdAndUpdate(req.params.id, updateData);
      }
    } else {
      // If we are changing role to manager/admin (i.e. not baker):
      if (currentPadeiro) {
        // Move from Padeiro to Admin collection
        await Padeiro.findByIdAndDelete(req.params.id);
        await Admin.create({
          id: req.params.id,
          nome: updateData.nome || currentPadeiro.nome,
          email: updateData.email || currentPadeiro.email,
          passwordHash: updateData.passwordHash || currentPadeiro.passwordHash,
          role: role || 'gestor_regional',
          filial: updateData.filial !== undefined ? updateData.filial : currentPadeiro.filial,
          ativo: updateData.ativo !== undefined ? updateData.ativo : currentPadeiro.ativo,
          criadoEm: currentPadeiro.criadoEm || new Date().toISOString()
        });
      } else if (currentAdmin) {
        // Just update in Admin collection
        await Admin.findByIdAndUpdate(req.params.id, updateData);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: 'Erro ao atualizar usuário', details: error.message });
  }
};

exports.syncClientesFromJson = async (req, res) => {
  const allowed = ['admin', 'gestor_geral'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Acesso restrito' });

  const path = require('path');
  const fs = require('fs');

  try {
    const filePath = path.join(__dirname, '..', 'data', 'clientes.json');
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'Arquivo data/clientes.json não encontrado no servidor.' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[SYNC CLIENTES] Iniciando sincronização de ${data.length} clientes via API...`);

    // Limpar clientes antigos (MySQL)
    const { pool } = require('../data/mysqlDB');
    await pool.query('DELETE FROM clientes');

    let inseridos = 0;
    for (const item of data) {
      if (!item.nome) continue;
      await Cliente.create({
        id: item.id || Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
        codigo: item.codigo ? String(item.codigo) : '',
        nome: item.nome ? String(item.nome) : '',
        nomeFantasia: item.nomeFantasia ? String(item.nomeFantasia) : '',
        inscricaoEstadual: item.inscricaoEstadual ? String(item.inscricaoEstadual) : '',
        cnpj: item.cnpj ? String(item.cnpj) : '',
        endereco: item.endereco ? String(item.endereco) : '',
        bairro: item.bairro ? String(item.bairro) : '',
        estado: item.estado ? String(item.estado) : '',
        ativo: item.ativo !== undefined ? !!item.ativo : true,
        criadoEm: item.criadoEm || new Date().toISOString()
      });
      inseridos++;
    }

    console.log(`[SYNC CLIENTES] Sincronização concluída! ${inseridos} clientes importados.`);
    res.json({ success: true, message: `Banco de dados sincronizado com sucesso! ${inseridos} clientes importados.` });
  } catch (error) {
    console.error('Erro na sincronização de clientes:', error);
    res.status(500).json({ error: 'Erro interno ao sincronizar os clientes.', details: error.message });
  }
};
