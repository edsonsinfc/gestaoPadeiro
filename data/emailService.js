/**
 * Email Service Abstraction - BRAGO Sistema Padeiro
 * 
 * Este módulo abstrai o envio de e-mails para facilitar a integração futura
 * com SendGrid, SMTP, ou qualquer outro provedor.
 * 
 * CONFIGURAÇÃO FUTURA (SendGrid):
 * 1. npm install @sendgrid/mail
 * 2. Definir SENDGRID_API_KEY no .env
 * 3. Alterar EMAIL_PROVIDER para 'sendgrid'
 * 
 * CONFIGURAÇÃO FUTURA (SMTP/Nodemailer):
 * 1. Definir SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS no .env
 * 2. Alterar EMAIL_PROVIDER para 'smtp'
 */

const nodemailer = require('nodemailer');

// ============================================================
// CONFIGURAÇÃO - Altere aqui para integrar com provedor real
// ============================================================
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'mock'; // 'mock' | 'smtp' | 'sendgrid'

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

const SENDGRID_CONFIG = {
  apiKey: process.env.SENDGRID_API_KEY || ''
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@bragodistribuidora.com.br';
const FROM_NAME = process.env.FROM_NAME || 'Sistema Padeiro - Brago';

// ============================================================
// PROVIDERS
// ============================================================

/**
 * Mock provider - Logs to console and stores for API retrieval
 */
const pendingEmails = [];

const mockProvider = {
  async sendMail({ to, subject, html, text }) {
    const email = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      to,
      subject,
      html,
      text,
      sentAt: new Date().toISOString(),
      read: false
    };
    pendingEmails.push(email);
    console.log('\n📧 ════════════════════════════════════════════');
    console.log(`   SIMULAÇÃO DE E-MAIL ENVIADO`);
    console.log('   ════════════════════════════════════════════');
    console.log(`   Para: ${to}`);
    console.log(`   Assunto: ${subject}`);
    console.log(`   ────────────────────────────────────────────`);
    if (text) console.log(`   ${text}`);
    console.log('   ════════════════════════════════════════════\n');
    return { success: true, provider: 'mock', emailId: email.id };
  },
  getPendingEmails(email) {
    return pendingEmails.filter(e => e.to === email);
  },
  getAllPendingEmails() {
    return pendingEmails;
  }
};

/**
 * SMTP provider via Nodemailer
 */
const smtpProvider = {
  transporter: null,
  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(SMTP_CONFIG);
    }
    return this.transporter;
  },
  async sendMail({ to, subject, html, text }) {
    try {
      const info = await this.getTransporter().sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`📧 E-mail enviado via SMTP para ${to}: ${info.messageId}`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail SMTP para ${to}:`, error.message);
      return { success: false, provider: 'smtp', error: error.message };
    }
  }
};

/**
 * SendGrid provider (placeholder - instalar @sendgrid/mail)
 * 
 * Para ativar:
 * 1. npm install @sendgrid/mail
 * 2. Descomente o código abaixo
 * 3. Defina SENDGRID_API_KEY no .env
 */
const sendgridProvider = {
  async sendMail({ to, subject, html, text }) {
    try {
      // ── DESCOMENTE PARA ATIVAR SENDGRID ──────────────────
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(SENDGRID_CONFIG.apiKey);
      // const msg = { to, from: FROM_EMAIL, subject, text, html };
      // await sgMail.send(msg);
      // console.log(`📧 E-mail enviado via SendGrid para ${to}`);
      // return { success: true, provider: 'sendgrid' };
      // ─────────────────────────────────────────────────────

      console.error('❌ SendGrid não configurado. Instale @sendgrid/mail e configure a API key.');
      return { success: false, provider: 'sendgrid', error: 'SendGrid não configurado' };
    } catch (error) {
      console.error(`❌ Erro SendGrid para ${to}:`, error.message);
      return { success: false, provider: 'sendgrid', error: error.message };
    }
  }
};

// ============================================================
// SERVICE PRINCIPAL
// ============================================================

function getProvider() {
  switch (EMAIL_PROVIDER) {
    case 'smtp': return smtpProvider;
    case 'sendgrid': return sendgridProvider;
    default: return mockProvider;
  }
}

const emailService = {
  /**
   * Envia e-mail de primeiro acesso com link para definir senha
   */
  async sendFirstAccessEmail(to, token, baseUrl) {
    const resetLink = `${baseUrl}/primeiro-acesso?token=${token}&email=${encodeURIComponent(to)}`;
    const subject = '🔑 Bem-vindo ao Sistema Padeiro - Defina sua senha';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #1a1a2e;">🍞 Sistema Padeiro</h1>
          <p style="margin: 5px 0 0; color: #1a1a2e; opacity: 0.8;">Brago Distribuidora</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #F59E0B; margin-top: 0;">Bem-vindo!</h2>
          <p>Você foi cadastrado no Sistema de Gerenciamento de Padeiros da Brago.</p>
          <p>Para acessar a plataforma, defina sua senha clicando no botão abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: #1a1a2e; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Definir Minha Senha
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="color: #F59E0B; font-size: 12px; word-break: break-all;">${resetLink}</p>
          <hr style="border: 1px solid #333; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Este link expira em 24 horas. Se você não solicitou este acesso, ignore este e-mail.</p>
        </div>
      </div>
    `;
    const text = `Bem-vindo ao Sistema Padeiro - Brago!\n\nDefina sua senha acessando: ${resetLink}\n\nEste link expira em 24 horas.`;
    return getProvider().sendMail({ to, subject, html, text });
  },

  /**
   * Envia e-mail de redefinição de senha
   */
  async sendPasswordResetEmail(to, token, baseUrl) {
    const resetLink = `${baseUrl}/redefinir-senha?token=${token}&email=${encodeURIComponent(to)}`;
    const subject = '🔐 Redefinição de Senha - Sistema Padeiro';
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🔐 Redefinição de Senha</h1>
        </div>
        <div style="padding: 30px;">
          <p>Você solicitou a redefinição da sua senha no Sistema Padeiro.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #999; font-size: 13px;">Link: ${resetLink}</p>
        </div>
      </div>
    `;
    const text = `Redefinição de Senha\n\nAcesse: ${resetLink}`;
    return getProvider().sendMail({ to, subject, html, text });
  },

  /**
   * Retorna e-mails pendentes (apenas para mock provider)
   */
  getPendingEmails(email) {
    if (EMAIL_PROVIDER === 'mock') {
      return mockProvider.getPendingEmails(email);
    }
    return [];
  },

  getAllPendingEmails() {
    if (EMAIL_PROVIDER === 'mock') {
      return mockProvider.getAllPendingEmails();
    }
    return [];
  },

  getProviderName() {
    return EMAIL_PROVIDER;
  }
};

module.exports = emailService;
