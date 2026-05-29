const { google } = require('googleapis');
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
  console.error('❌ Erro: GOOGLE_DRIVE_CLIENT_ID ou GOOGLE_DRIVE_CLIENT_SECRET não estão configurados no arquivo .env.');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  REDIRECT_URI
);

const app = express();

app.get('/', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Necessário para gerar o refresh token
    prompt: 'consent',     // Garante que o consentimento seja exibido e o refresh token gerado
    scope: ['https://www.googleapis.com/auth/drive']
  });
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      console.warn('⚠️  Atenção: Nenhum Refresh Token foi retornado pelo Google.');
      console.warn('Isso geralmente acontece se você já tinha autorizado este app antes.');
      console.warn('Tente remover o acesso do app nas configurações da sua conta Google e tente novamente.');
    } else {
      console.log('\n=========================================');
      console.log('✅ Autenticação realizada com sucesso!');
      console.log('Refresh Token:', tokens.refresh_token);
      console.log('=========================================\n');

      const envPath = path.join(__dirname, '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envContent.includes('GOOGLE_DRIVE_REFRES_TOKEN=')) {
        envContent = envContent.replace(
          /GOOGLE_DRIVE_REFRES_TOKEN=.*/,
          `GOOGLE_DRIVE_REFRES_TOKEN=${tokens.refresh_token}`
        );
      } else {
        envContent += `\nGOOGLE_DRIVE_REFRES_TOKEN=${tokens.refresh_token}`;
      }
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('💾 Token salvo automaticamente no seu arquivo .env!');
    }

    res.send('<h1>Sucesso!</h1><p>O seu Refresh Token foi obtido e salvo no arquivo <b>.env</b>. Você já pode fechar esta aba e parar o script no terminal.</p>');
    setTimeout(() => process.exit(0), 1000);
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    res.status(500).send('Erro ao obter token: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log('========================================================================');
  console.log('🔌 Script de Autorização Google Drive iniciado!');
  console.log(`ID do Cliente em uso: ${process.env.GOOGLE_DRIVE_CLIENT_ID}`);
  console.log(`1. Certifique-se de que a URL "${REDIRECT_URI}" está adicionada aos`);
  console.log('   "URIs de redirecionamento autorizados" no seu painel Google Cloud.');
  console.log(`2. Abra no navegador: http://localhost:${PORT}`);
  console.log('========================================================================');
});
