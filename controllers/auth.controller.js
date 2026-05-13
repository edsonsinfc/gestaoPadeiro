const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { JWT_SECRET, BASE_URL, GOOGLE_CLIENT_ID } = require('../config');
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const { Admin, Padeiro } = require('../data/db-adapter');
const emailService = require('../data/emailService');

exports.login = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const emailLower = email.toLowerCase().trim();

  try {
    // Check admin
    let admin = await Admin.findOne({ email: new RegExp(`^${emailLower}$`, 'i') });
    if (admin) {
      const valid = await bcrypt.compare(senha, admin.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
      if (admin.deletado) return res.status(403).json({ error: 'Usuário inexistente' });
      if (!admin.ativo) return res.status(403).json({ error: 'Usuário desativado' });
      
      const role = admin.role || 'admin';
      const token = jwt.sign({ 
        id: admin.id, 
        email: admin.email, 
        role: role, 
        nome: admin.nome,
        filial: admin.filial || null 
      }, JWT_SECRET, { expiresIn: '12h' });
      
      return res.json({ 
        token, 
        user: { 
          id: admin.id, 
          nome: admin.nome, 
          email: admin.email, 
          role: role,
          filial: admin.filial || null
        } 
      });
    }

    // Check padeiro
    let padeiro = await Padeiro.findOne({ email: new RegExp(`^${emailLower}$`, 'i') });
    if (!padeiro || padeiro.deletado) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!padeiro.ativo) return res.status(403).json({ error: 'Usuário desativado' });
    if (!padeiro.passwordHash) return res.status(403).json({ error: 'first_access', message: 'Primeiro acesso. Verifique seu e-mail para definir sua senha.' });

    const valid = await bcrypt.compare(senha, padeiro.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign({ id: padeiro.id, email: padeiro.email, role: padeiro.role, nome: padeiro.nome, cargo: padeiro.cargo, filial: padeiro.filial }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: { id: padeiro.id, nome: padeiro.nome, email: padeiro.email, role: padeiro.role, cargo: padeiro.cargo, codTec: padeiro.codTec, filial: padeiro.filial } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Credencial do Google é obrigatória' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();

    let admin = await Admin.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (admin) {
      if (admin.deletado) return res.status(403).json({ error: 'Usuário inexistente' });
      if (!admin.ativo) return res.status(403).json({ error: 'Usuário desativado' });
      const role = admin.role || 'admin';
      const token = jwt.sign({ id: admin.id, email: admin.email, role: role, nome: admin.nome, filial: admin.filial || null }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, user: { id: admin.id, nome: admin.nome, email: admin.email, role: role, filial: admin.filial || null } });
    }

    let padeiro = await Padeiro.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!padeiro || padeiro.deletado) return res.status(404).json({ error: 'E-mail não cadastrado no sistema.' });
    if (!padeiro.ativo) return res.status(403).json({ error: 'Usuário desativado' });

    const token = jwt.sign({ id: padeiro.id, email: padeiro.email, role: padeiro.role, nome: padeiro.nome, cargo: padeiro.cargo, filial: padeiro.filial }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: { id: padeiro.id, nome: padeiro.nome, email: padeiro.email, role: padeiro.role, cargo: padeiro.cargo, codTec: padeiro.codTec, filial: padeiro.filial } });
  } catch (error) {
    console.error("Google Login error:", error);
    res.status(401).json({ error: 'Falha na autenticação com o Google' });
  }
};

/**
 * Handle Google Redirect (POST from Google)
 */
exports.googleLoginRedirect = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).send('Credencial ausente');

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();

    let user = null;
    let role = null;

    // Check admin
    let admin = await Admin.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (admin && !admin.deletado) {
      if (admin.ativo) {
        role = admin.role || 'admin';
        user = { id: admin.id, nome: admin.nome, email: admin.email, role: role, filial: admin.filial || null };
      }
    } else {
      // Check padeiro
      let padeiro = await Padeiro.findOne({ email: new RegExp(`^${email}$`, 'i') });
      if (padeiro && !padeiro.deletado && padeiro.ativo) {
        role = padeiro.role;
        user = { id: padeiro.id, nome: padeiro.nome, email: padeiro.email, role: padeiro.role, cargo: padeiro.cargo, codTec: padeiro.codTec, filial: padeiro.filial };
      }
    }

    if (!user) {
      return res.send(`
        <script>
          alert('E-mail não cadastrado no sistema.');
          window.location.href = '/';
        </script>
      `);
    }

    const token = jwt.sign({ ...user }, JWT_SECRET, { expiresIn: '12h' });

    // HTML that saves data to localStorage and redirects to home
    res.send(`
      <html>
        <head><title>Autenticando...</title></head>
        <body>
          <p>Autenticando, por favor aguarde...</p>
          <script>
            localStorage.setItem('brago_token', '${token}');
            localStorage.setItem('brago_user', '${JSON.stringify(user)}');
            window.location.href = '/';
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Google Redirect error:", error);
    res.status(401).send('Falha na autenticação');
  }
};

exports.firstAccess = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

  try {
    const padeiro = await Padeiro.findOne({ email: new RegExp(`^${email.trim()}$`, 'i') });
    if (!padeiro) return res.status(404).json({ error: 'E-mail não encontrado no sistema' });
    if (padeiro.passwordHash) return res.status(400).json({ error: 'Senha já definida. Faça login normalmente.' });

    // Generate token
    const token = jwt.sign({ email: padeiro.email, type: 'first_access' }, JWT_SECRET, { expiresIn: '24h' });
    padeiro.firstAccessToken = token;
    padeiro.firstAccessExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await padeiro.save();

    // Send email
    await emailService.sendFirstAccessEmail(padeiro.email, token, BASE_URL);
    
    res.json({ 
      success: true, 
      message: 'E-mail enviado! Verifique sua caixa de entrada.',
      ...(emailService.getProviderName() === 'mock' ? { token, mockMode: true } : {})
    });
  } catch (error) {
    console.error("First access error:", error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

exports.setPassword = async (req, res) => {
  const { token, senha } = req.body;
  if (!token || !senha) return res.status(400).json({ error: 'Token e senha são obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const padeiro = await Padeiro.findOne({ email: new RegExp(`^${decoded.email}$`, 'i') });
    if (!padeiro) return res.status(404).json({ error: 'Usuário não encontrado' });

    padeiro.passwordHash = await bcrypt.hash(senha, 10);
    padeiro.firstAccessToken = null;
    padeiro.firstAccessExpiry = null;
    padeiro.atualizadoEm = new Date().toISOString();
    await padeiro.save();

    res.json({ success: true, message: 'Senha definida com sucesso! Faça login.' });
  } catch (e) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }
};

exports.getPendingEmails = (req, res) => {
  const emails = emailService.getPendingEmails(req.params.email);
  res.json(emails);
};
