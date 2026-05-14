const bcrypt = require('bcryptjs');
const { Padeiro, Atividade, Meta, Avaliacao, Cronograma } = require('../data/db-adapter');

exports.listPadeiros = async (req, res) => {
  try {
    let query = { deletado: { $ne: true } };
    if (req.user.role === 'gestor_regional' && req.user.filial) {
      query.filial = req.user.filial;
    }
    const padeiros = await Padeiro.find(query).select('-passwordHash -firstAccessToken');
    res.json(padeiros);
  } catch (error) {
    console.error('Erro ao listar padeiros:', error);
    res.status(500).json({ error: 'Erro ao carregar lista de padeiros' });
  }
};

exports.getPadeiro = async (req, res) => {
  try {
    const p = await Padeiro.findById(req.params.id).select('-passwordHash -firstAccessToken');
    if (!p) return res.status(404).json({ error: 'Padeiro não encontrado' });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: 'ID inválido' });
  }
};

exports.createPadeiro = async (req, res) => {
  try {
    const { senha, ...rest } = req.body;
    const novo = {
      ...rest,
      ativo: true,
      role: req.body.cargo === 'GESTOR' ? 'gestor' : 'padeiro',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    // Auto-generate codTec if not provided
    if (!novo.codTec) {
      let isUnique = false;
      let code;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const exists = await Padeiro.findOne({ codTec: code });
        if (!exists) isUnique = true;
        attempts++;
      }
      novo.codTec = code;
    }

    if (senha && senha.trim() !== '') {
      novo.passwordHash = await bcrypt.hash(senha, 10);
      novo.firstAccessToken = null; // Clear if set manually
    }

    const padeiro = new Padeiro(novo);
    await padeiro.save();
    
    const pObj = padeiro.toObject();
    delete pObj.passwordHash;
    delete pObj.firstAccessToken;
    res.status(201).json(pObj);
  } catch (error) {
    console.error("Error creating padeiro:", error);
    res.status(500).json({ error: 'Erro ao criar padeiro: ' + error.message });
  }
};

exports.updatePadeiro = async (req, res) => {
  try {
    const { senha, ...rest } = req.body;
    const updateData = { ...rest, atualizadoEm: new Date().toISOString() };
    if (req.body.cargo) updateData.role = req.body.cargo === 'GESTOR' ? 'gestor' : 'padeiro';
    
    if (senha && senha.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(senha, 10);
      updateData.firstAccessToken = null;
    }

    // Protect firstAccessToken from general updates unless explicitly clearing it above
    if (!senha) delete updateData.firstAccessToken;

    const p = await Padeiro.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!p) return res.status(404).json({ error: 'Não encontrado' });
    res.json(p);
  } catch (e) {
    console.error("Error updating padeiro:", e);
    res.status(400).json({ error: 'ID inválido ou erro na atualização' });
  }
};

exports.deletePadeiro = async (req, res) => {
  try {
    const padeiroId = req.params.id;
    
    // Perform cascade deletion
    await Promise.all([
      Padeiro.findByIdAndDelete(padeiroId),
      Atividade.deleteMany({ padeiroId }),
      Meta.deleteMany({ padeiroId }),
      Avaliacao.deleteMany({ padeiroId }),
      Cronograma.deleteMany({ padeiroId })
    ]);

    res.json({ success: true, message: 'Padeiro e todos os seus registros associados foram excluídos com sucesso.' });
  } catch (e) {
    console.error("Erro na exclusão em cascata:", e);
    res.status(400).json({ error: 'Erro ao excluir padeiro e seus registros' });
  }
};
