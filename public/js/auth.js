/**
 * Auth Module - Login, First Access, Password Setup
 * BRAGO Sistema Padeiro
 */

const Auth = {
  renderLogin() {
    return `
    <div class="login-page">
      <!-- Left Image Area -->
      <div class="login-left-image-area">
        <img src="/img/Frame 8656.svg" class="login-main-bg" alt="Brago Comodato">
        <!-- Overlay removed to favor SVG's internal filters -->
        <!-- Redundant text removed to favor SVG's internal typography -->
      </div>

      <!-- Right Form Area -->
      <div class="login-right-area">
        <div class="brago-login-card">
          <img src="/assets/logo.svg" alt="Brago App System" class="card-logo-img">
          
          <div id="login-content" class="comodato-form">
            ${this.loginForm()}
          </div>
        </div>

        <div class="comodato-footer">
          AppBrago © 2026 - Todos os direitos reservados
        </div>
      </div>
    </div>`;
  },

  loginForm() {
    return `
    <form onsubmit="Auth.handleLogin(event)">
      <div class="comodato-input-group">
        <label class="comodato-label">Usuário</label>
        <div class="comodato-input-wrapper">
          <input class="comodato-input" type="email" id="login-email" placeholder="exemplo@email.com" required autocomplete="username">
        </div>
      </div>
      
      <div class="comodato-input-group">
        <label class="comodato-label">Senha</label>
        <div class="comodato-input-wrapper">
          <input class="comodato-input" type="password" id="login-senha" placeholder="••••••••" required autocomplete="current-password">
          <button type="button" class="comodato-password-toggle" onclick="Auth.togglePassword('login-senha', this)">
            <i data-lucide="eye-off" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
      </div>

      <div class="comodato-row">
        <label class="comodato-checkbox">
          <input type="checkbox" style="width: 16px; height: 16px;">
          Manter conectado
        </label>
        <a href="#" class="comodato-forgot" onclick="Auth.showFirstAccess(); return false;">Esqueci a senha</a>
      </div>

      <div id="login-error" class="error-message-comodato"></div>
      
      <button type="submit" class="comodato-btn" id="login-btn">
        <span>ENTRAR</span>
      </button>

      <div class="comodato-divider">
        <span>ou acesse com</span>
      </div>

      <!-- Google Login Button Container -->
      <div id="google-login-btn" class="google-btn-container"></div>

      <!-- PWA Install Option -->
      <button type="button" id="pwa-install-btn" class="comodato-btn-pwa" style="display: flex;" onclick="Auth.handleInstallApp()">
        <i data-lucide="download" style="width: 18px; height: 18px; margin-right: 8px;"></i>
        BAIXAR APLICATIVO
      </button>
    </form>`;
  },

  async handleInstallApp() {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      window.deferredPrompt = null;
      document.getElementById('pwa-install-btn').style.display = 'none';
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const msg = isIOS 
        ? 'No iPhone: Toque no ícone de "Compartilhar" (quadrado com seta) e selecione "Adicionar à Tela de Início".'
        : 'Para instalar o App via IP: Clique nos 3 pontinhos do Chrome (topo direito) e selecione "Instalar Aplicativo".';
      alert(msg);
    }
  },


  togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('data-lucide', 'eye');
    } else {
      input.type = 'password';
      icon.setAttribute('data-lucide', 'eye-off');
    }
    lucide.createIcons();
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    const btnText = btn.querySelector('span');

    btn.disabled = true;
    const originalText = btnText.textContent;
    btnText.innerHTML = '<div class="comodato-spinner"></div>';
    errorEl.classList.remove('active');

    try {
      const data = await API.post('/api/auth/login', { email, senha });
      API.setToken(data.token);
      API.setUser(data.user);
      Components.toast(`Bem-vindo, ${data.user.nome}!`, 'success');
      const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional'].includes(data.user.role);
      App.navigate(isManagement ? 'admin-dashboard' : 'padeiro-inicio');
    } catch (err) {
      errorEl.classList.add('active');
      errorEl.textContent = err.message;
      btn.disabled = false;
      btnText.textContent = originalText;
    }
  },

  showFirstAccess() {
    document.getElementById('login-content').innerHTML = `
    <div style="text-align:left; margin-bottom:28px">
      <h2 style="color:#FFFFFF; font-size:20px; font-weight:700; margin-bottom:8px;">Primeiro Acesso</h2>
      <p style="color:rgba(255,255,255,0.7); font-size:13px; line-height:1.5;">Digite seu e-mail cadastrado para definir sua senha.</p>
    </div>
    <form onsubmit="Auth.handleFirstAccess(event)">
      <div class="comodato-input-group">
        <label class="comodato-label">E-mail</label>
        <div class="comodato-input-wrapper">
          <input class="comodato-input" type="email" id="first-access-email" placeholder="seu.email@exemplo.com" required autocomplete="email">
        </div>
      </div>

      <div id="first-access-error" class="error-message-comodato"></div>

      <div id="first-access-msg"></div>

      <button type="submit" class="comodato-btn" id="first-access-btn">
        <span>Enviar Link ↗</span>
      </button>

      <div style="text-align:center; margin-top:24px">
        <a href="#" class="comodato-forgot" onclick="Auth.backToLogin(); return false;">&larr; Voltar ao Login</a>
      </div>
    </form>`;
    lucide.createIcons();
  },

  async handleFirstAccess(e) {
    e.preventDefault();
    const email = document.getElementById('first-access-email').value.trim();
    const btn = document.getElementById('first-access-btn');
    const errorEl = document.getElementById('first-access-error');
    const msgEl = document.getElementById('first-access-msg');

    btn.disabled = true;
    const btnText = btn.querySelector('span');
    btnText.innerHTML = '<div class="comodato-spinner"></div>';
    errorEl.classList.remove('active');

    try {
      const data = await API.post('/api/auth/first-access', { email });
      if (data.mockMode && data.token) {
        // Mock mode - show the set password form directly
        msgEl.innerHTML = `
          <div class="alert alert-info" style="margin-bottom:16px; display: flex; align-items: center; gap: 12px;">
            <i data-lucide="mail"></i>
            <span>Modo de demonstração: Em produção, um e-mail seria enviado. Defina sua senha abaixo:</span>
          </div>`;
        btn.style.display = 'none';
        msgEl.innerHTML += Auth.setPasswordForm(data.token);
      } else {
        msgEl.innerHTML = `<div style="background:rgba(40,167,69,0.15); color:#90EE90; padding:12px; border-radius:12px; font-size:13px; margin-bottom:16px; text-align:center;">✅ E-mail enviado! Verifique sua caixa de entrada.</div>`;
        btnText.textContent = 'Reenviar';
        btn.disabled = false;
      }
    } catch (err) {
      errorEl.classList.add('active');
      errorEl.textContent = err.message;
      btnText.textContent = 'Enviar Link ↗';
      btn.disabled = false;
    }
  },

  setPasswordForm(token) {
    return `
    <form onsubmit="Auth.handleSetPassword(event, '${token}')">
      <div class="comodato-input-group">
        <label class="comodato-label">Nova Senha</label>
        <div class="comodato-input-wrapper">
          <input class="comodato-input" type="password" id="new-password" placeholder="Mínimo 6 caracteres" minlength="6" required>
        </div>
      </div>

      <div class="comodato-input-group">
        <label class="comodato-label">Confirmar Senha</label>
        <div class="comodato-input-wrapper">
          <input class="comodato-input" type="password" id="confirm-password" placeholder="Repita a nova senha" required>
        </div>
      </div>

      <div id="set-pass-error" class="error-message-comodato"></div>

      <button type="submit" class="comodato-btn" id="set-pass-btn">
        <span>Definir Senha</span>
      </button>
    </form>`;
  },

  async handleSetPassword(e, token) {
    e.preventDefault();
    const senha = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('set-pass-error');
    const btn = document.getElementById('set-pass-btn');

    if (senha !== confirm) { errorEl.textContent = 'As senhas não coincidem.'; errorEl.classList.add('active'); return; }
    if (senha.length < 6) { errorEl.textContent = 'Senha deve ter no mínimo 6 caracteres.'; errorEl.classList.add('active'); return; }

    btn.disabled = true;
    const btnText = btn.querySelector('span');
    btnText.innerHTML = '<div class="comodato-spinner"></div>';
    errorEl.classList.remove('active');

    try {
      await API.post('/api/auth/set-password', { token, senha });
      Components.toast('Senha definida com sucesso! Faça login.', 'success');
      Auth.backToLogin();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('active');
      btnText.textContent = 'Definir Senha';
      btn.disabled = false;
    }
  },

  backToLogin() {
    document.getElementById('login-content').innerHTML = Auth.loginForm();
    Components.renderIcons();
  },

  renderSetPassword() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return Auth.renderLogin();
    return `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">
          <div class="icon"><i data-lucide="lock" size="40"></i></div>
          <h1>Definir <span>Senha</span></h1>
          <p>Crie sua senha para acessar o sistema</p>
        </div>
        ${this.setPasswordForm(token)}
        <div style="text-align:center;margin-top:16px">
          <button class="btn btn-ghost" onclick="App.navigate('login')">← Voltar ao Login</button>
        </div>
      </div>
    </div>`;
  },

  logout() {
    API.setToken(null);
    API.setUser(null);
    App.navigate('login');
    Components.toast('Sessão encerrada.', 'info');
  },

  initGoogleLogin() {
    if (typeof google === 'undefined') {
      setTimeout(() => this.initGoogleLogin(), 500);
      return;
    }

    google.accounts.id.initialize({
      client_id: '222151940219-ithbdoleku13oqpo58qaglbmtddq1m02.apps.googleusercontent.com',
      ux_mode: 'redirect',
      login_uri: window.location.origin + '/'
    });

    const parent = document.getElementById('google-login-btn');
    if (parent) {
      google.accounts.id.renderButton(parent, {
        theme: 'outline',
        size: 'large',
        width: parent.offsetWidth,
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left'
      });
    }
  },

  async handleGoogleLogin(response) {
    const errorEl = document.getElementById('login-error');
    try {
      const data = await API.post('/api/auth/google-login', { credential: response.credential });
      API.setToken(data.token);
      API.setUser(data.user);
      Components.toast(`Bem-vindo, ${data.user.nome}!`, 'success');
      const isManagement = ['admin', 'gestor', 'gestor_geral', 'gestor_regional'].includes(data.user.role);
      App.navigate(isManagement ? 'admin-dashboard' : 'padeiro-inicio');
    } catch (err) {
      if (errorEl) {
        errorEl.classList.add('active');
        errorEl.textContent = err.message || 'Falha no login com Google';
      } else {
        Components.toast(err.message || 'Falha no login com Google', 'error');
      }
    }
  }
};
