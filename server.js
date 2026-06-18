require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const emailService = require('./data/emailService');
const { initTables } = require('./data/init-mysql');
const { PORT, JWT_SECRET, BASE_URL } = require('./config');
const upload = require('./config/multer');
const corsMiddleware = require('./config/cors');
const { authMiddleware, adminOnly } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { initLocationSocket } = require('./sockets/location.socket');
const webpush = require('web-push');



const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Middleware
app.use(corsMiddleware);
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; connect-src * 'unsafe-inline' ws: wss:; img-src * data: blob:; style-src * 'unsafe-inline';");
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
// Middleware de proxy transparente para servir arquivos da pasta local ou do Google Drive
const fs = require('fs');
const driveMappings = require('./data/driveMappings');
const googleDriveService = require('./data/googleDriveService');

app.use('/storage/:type/:filename', async (req, res, next) => {
  const { type, filename } = req.params;
  const localPath = path.join(__dirname, 'uploads', type, filename);
  
  // 1. Se o arquivo existe localmente (ainda não subiu pro drive ou drive inativo), serve imediatamente
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }
  
  // 2. Se não existir localmente, verifica se temos um mapeamento para o Google Drive
  try {
    let fileId = driveMappings.getMapping(filename);
    
    // Fallback: Se não tem mapeamento no cache, busca no Drive pelo nome (recuperação de cache perdido)
    if (!fileId && googleDriveService.isEnabled()) {
      fileId = await googleDriveService.findFileByName(filename);
      if (fileId) {
        console.log(`[STORAGE Proxy] Arquivo recuperado no Drive! ID: ${fileId}. Salvando cache...`);
        driveMappings.saveMapping(filename, fileId);
      }
    }

    if (fileId) {
      console.log(`[STORAGE Proxy] Servindo arquivo ${filename} do Google Drive (ID: ${fileId})`);
      const { stream, contentType, contentLength } = await googleDriveService.getFileStream(fileId);
      
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // Cache de 30 dias
      
      return stream.pipe(res);
    }
  } catch (err) {
    console.error(`❌ [STORAGE Proxy] Erro ao servir do Google Drive (${filename}):`, err.message);
  }
  
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ============================================================
// FTP PRODUCT IMAGE PROXY (read-only, optimized)
// ============================================================
const ftp = require('basic-ftp');
const PRODUTO_IMG_CACHE = path.join(__dirname, 'data', 'produtos_cache');
if (!fs.existsSync(PRODUTO_IMG_CACHE)) {
  fs.mkdirSync(PRODUTO_IMG_CACHE, { recursive: true });
}

// Catálogo FTP em memória: { "14510": "14510.JPG", "12103": "12103.jpg", ... }
let ftpCatalog = null;
let ftpCatalogLoading = null;

async function loadFtpCatalog() {
  if (ftpCatalog) return ftpCatalog;
  if (ftpCatalogLoading) return ftpCatalogLoading;

  ftpCatalogLoading = (async () => {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
      await client.access({
        host: 'cloud-6010.reposit.com.br',
        port: 30037,
        user: 'brago',
        password: 'brago@cloud',
        secure: false
      });
      const files = await client.list();
      client.close();

      const catalog = {};
      const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
      for (const f of files) {
        if (f.type === 2) continue; // skip directories
        const dotIdx = f.name.lastIndexOf('.');
        if (dotIdx === -1) continue;
        const ext = f.name.substring(dotIdx).toLowerCase();
        if (!validExts.includes(ext)) continue;
        const baseName = f.name.substring(0, dotIdx);
        // Guardar apenas a primeira ocorrência (prioridade: jpg > png etc já pela ordem do FTP)
        if (!catalog[baseName]) {
          catalog[baseName] = f.name;
        }
      }
      ftpCatalog = catalog;
      console.log(`📸 [FTP] Catálogo carregado: ${Object.keys(catalog).length} fotos de produtos encontradas`);
      return catalog;
    } catch (err) {
      client.close();
      console.error('❌ [FTP] Erro ao carregar catálogo:', err.message);
      ftpCatalogLoading = null; // Reset para permitir tentar de novo nas próximas requisições
      return {};
    }
  })();

  return ftpCatalogLoading;
}

// Expõe o getter globalmente de forma imediata
global.getFtpCatalog = loadFtpCatalog;

// Inicia o carregamento em background no startup do servidor
loadFtpCatalog().catch(err => console.error('❌ [FTP] Erro inicial de catálogo:', err.message));

// Fila de downloads sequenciais (uma conexão FTP por vez)
let downloadQueue = Promise.resolve();

function enqueueDownload(remoteFile, destPath) {
  downloadQueue = downloadQueue.then(async () => {
    if (fs.existsSync(destPath)) return; // já baixou enquanto esperava
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
      await client.access({
        host: 'cloud-6010.reposit.com.br',
        port: 30037,
        user: 'brago',
        password: 'brago@cloud',
        secure: false
      });
      await client.downloadTo(destPath, remoteFile);
      client.close();
      console.log(`📸 [FTP] Foto baixada: ${remoteFile}`);
    } catch (err) {
      try { client.close(); } catch(e) {}
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      console.error(`❌ [FTP] Erro download ${remoteFile}:`, err.message);
    }
  });
  return downloadQueue;
}

app.get('/api/foto-produto/:codigo', async (req, res) => {
  const codigo = req.params.codigo.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!codigo) return res.status(400).json({ error: 'Código inválido' });

  // 1. Verificar cache local
  const validExts = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'JPG', 'PNG'];
  for (const ext of validExts) {
    const cachedPath = path.join(PRODUTO_IMG_CACHE, `${codigo}.${ext}`);
    if (fs.existsSync(cachedPath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(cachedPath);
    }
  }

  // 2. Consultar catálogo em memória (rápido, sem I/O)
  const catalog = await loadFtpCatalog();
  const remoteFile = catalog[codigo];

  if (!remoteFile) {
    return res.status(404).json({ error: 'Foto não encontrada' });
  }

  // 3. Verificar se temos o arquivo mapeado no Google Drive
  if (googleDriveService.isEnabled()) {
    try {
      let fileId = driveMappings.getMapping(remoteFile);
      if (!fileId) {
        fileId = await googleDriveService.findFileByName(remoteFile);
        if (fileId) {
          driveMappings.saveMapping(remoteFile, fileId);
        }
      }

      if (fileId) {
        const { stream, contentType, contentLength } = await googleDriveService.getFileStream(fileId);
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return stream.pipe(res);
      }
    } catch (err) {
      console.error(`❌ [FOTO-PRODUTO Proxy] Erro ao buscar do Drive (${remoteFile}):`, err.message);
    }
  }

  // 4. Baixar do FTP (enfileirado para não sobrecarregar)
  const destPath = path.join(PRODUTO_IMG_CACHE, remoteFile);
  await enqueueDownload(remoteFile, destPath);

  if (fs.existsSync(destPath)) {
    // Se o Drive estiver ativo, envia em background para futuras requisições
    if (googleDriveService.isEnabled()) {
      (async () => {
        try {
          console.log(`☁️ [FOTO-PRODUTO] Iniciando upload em background pro Drive: ${remoteFile}`);
          const mimeType = remoteFile.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          const uploadResult = await googleDriveService.uploadStream(fs.createReadStream(destPath), remoteFile, mimeType, 'produtos');
          if (uploadResult.isDrive && uploadResult.fileId) {
            driveMappings.saveMapping(remoteFile, uploadResult.fileId);
          }
        } catch (e) {
          console.error(`❌ [FOTO-PRODUTO] Erro no upload em background pro Drive:`, e.message);
        }
      })();
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(destPath);
  }

  return res.status(500).json({ error: 'Erro ao baixar foto' });
});

// Servir o arquivo APK compilado automaticamente da pasta de build
app.get(['/smartgestor.apk', '/SmartGestor.apk'], (req, res) => {
  // 1. Tenta buscar na pasta public (onde fica em produção/Hostinger)
  let apkPath = path.join(__dirname, 'public', 'smartgestor.apk');
  if (!fs.existsSync(apkPath)) {
    // 2. Fallback para a pasta de build do Android (desenvolvimento local)
    apkPath = path.join(__dirname, 'android', 'app', 'release', 'SmartGestor.apk');
  }

  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename=SmartGestor.apk');
    return res.sendFile(apkPath);
  }
  res.status(404).send('Arquivo APK não encontrado.');
});

// ============================================================
// API ROUTES
// ============================================================
app.get('/api/ping', (req, res) => res.json({ pong: true }));
app.get('/api/app-version', (req, res) => {
  res.json({
    version: '1.0.1', // Versão do APK atualizada no servidor
    url: '/smartgestor.apk', // Caminho relativo/absoluto para download
    mandatory: false, // Define se a atualização é opcional (false) ou obrigatória (true)
    notes: 'Melhorias de desempenho na sincronização em tempo real das atividades offline.'
  });
});
app.use('/api', require('./routes'));

// ============================================================
// WEB PUSH NOTIFICATIONS
// ============================================================
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@brago.com.br',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('🔔 Web Push configurado com sucesso!');
}

// Rota pública: retorna a chave pública VAPID para o frontend
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Rota: inscrever dispositivo para push (suporta web e nativo)
app.post('/api/push/subscribe', authMiddleware, async (req, res) => {
  try {
    const { PushSubscription } = require('./data/db-adapter');
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    
    const padeiroId = req.user.id;
    const id = 'push_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    
    // Remove inscrições antigas do mesmo endpoint
    await PushSubscription.deleteMany({ endpoint: subscription.endpoint });
    
    await PushSubscription.create({
      id,
      padeiroId,
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys ? subscription.keys.p256dh : '',
      keys_auth: subscription.keys ? subscription.keys.auth : '',
      isNative: subscription.isNative ? 1 : 0,
      fcmToken: subscription.fcmToken || ''
    });
    
    console.log(`🔔 Push inscrito: padeiro ${padeiroId} (${subscription.isNative ? 'Nativo' : 'Web'})`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro ao inscrever push:', err);
    res.status(500).json({ error: 'Erro ao inscrever' });
  }
});

// Rota: enviar notificação push para padeiros inativos
app.post('/api/push/notify', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { PushSubscription, Padeiro, Atividade } = require('./data/db-adapter');
    const pushService = require('./data/pushService');
    
    // Buscar padeiros inativos hoje
    const hoje = new Date().toISOString().split('T')[0];
    const padeiros = await Padeiro.find({ ativo: true, deletado: { $ne: true } });
    const atividades = await Atividade.find({ data: hoje, status: 'finalizada' });
    const ativosHoje = new Set(atividades.map(a => a.padeiroId));
    const inativos = padeiros.filter(p => !ativosHoje.has(p.id));
    const inativosIds = inativos.map(p => p.id);
    
    if (inativosIds.length === 0) {
      return res.json({ sent: 0, message: 'Todos padeiros já registraram atividade hoje!' });
    }
    
    // Buscar inscrições push dos inativos
    const allSubs = await PushSubscription.find();
    const subsInativos = allSubs.filter(s => inativosIds.includes(s.padeiroId));
    
    const title = '🍞 Brago - Lembrete de Produção';
    const body = 'Você ainda não registrou suas produções de hoje. Acesse o sistema agora!';
    const url = '/';
    
    let sent = 0;
    let failed = 0;
    for (const sub of subsInativos) {
      const success = await pushService.sendPushToSubscription(sub, title, body, url);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    console.log(`🔔 Push enviado: ${sent} sucesso, ${failed} falha, ${inativos.length} inativos`);
    res.json({ sent, failed, totalInativos: inativos.length });
  } catch (err) {
    console.error('❌ Erro ao enviar push:', err);
    res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
});

// ============================================================
// CRON: ALERTA DE OCIOSIDADE DOS PADEIROS
// ============================================================
async function checkAndAlertInactiveBakers() {
  try {
    const { PushSubscription, Cronograma, Atividade } = require('./data/db-adapter');
    const pushService = require('./data/pushService');
    
    // Pegar data local considerando timezone BR (-3)
    const agora = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    const hoje = agora.toISOString().split('T')[0];
    const hora = agora.getUTCHours(); // O UTC agora equivale ao horário de Brasília pela subtração acima
    
    // Só alerta entre 09h e 17h
    if (hora < 9 || hora > 17) return;

    // Quem tem tarefa pendente hoje?
    const agendaHoje = await Cronograma.find({ data: hoje, status: 'pendente' });
    if (agendaHoje.length === 0) return;

    const padeirosComPendencias = new Set(agendaHoje.map(c => c.padeiroId));
    
    // Quem já tem atividade hoje?
    const atividades = await Atividade.find({ data: hoje });
    const ativosHoje = new Set(atividades.map(a => a.padeiroId));

    // Inativos = tem pendência mas NÃO fez nenhuma atividade
    const inativosIds = [...padeirosComPendencias].filter(id => !ativosHoje.has(id));

    if (inativosIds.length === 0) return;

    // Buscar inscrições
    const allSubs = await PushSubscription.find();
    const subsInativos = allSubs.filter(s => inativosIds.includes(s.padeiroId));
    
    if (subsInativos.length === 0) return;

    const title = '🍞 Lembrete Brago';
    const body = 'Você tem produções agendadas para hoje. Acesse o sistema agora para dar andamento!';
    const url = '/';
    
    for (const sub of subsInativos) {
      await pushService.sendPushToSubscription(sub, title, body, url);
    }
    console.log(`⏰ [CRON] Alerta de ociosidade enviado para ${subsInativos.length} dispositivos.`);
  } catch (error) {
    console.error('❌ [CRON] Erro ao checar ociosidade:', error);
  }
}

// Rodar a cada 2 horas (120 minutos = 7200000 ms)
setInterval(checkAndAlertInactiveBakers, 2 * 60 * 60 * 1000);


// Global Error Handler for Multer and others
app.use(errorHandler);



// SPA fallback
app.post('/', require('./controllers/auth.controller').googleLoginRedirect);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START
// ============================================================
async function start() {
  // Init MySQL tables
  try {
    await initTables();
  } catch (err) {
    console.error('   ❌ MySQL falhou:', err.message);
    console.error('   Verifique MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
    process.exit(1);
  }

  // Seed data from JSON on first run
  try {
    const { autoMigrate } = require('./data/migrate');
    await autoMigrate();
  } catch (err) {
    console.warn('   ⚠️  autoMigrate falhou (sem impacto):', err.message);
  }

  // Initialize Sockets
  await initLocationSocket(io);

  const HOST = '0.0.0.0';
  httpServer.listen(PORT, HOST, () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }

    console.log('🍞 ══════════════════════════════════════════');
    console.log('   BRAGO SISTEMA PADEIRO (PUBLIC IP ENABLED)');
    console.log('   ══════════════════════════════════════════');
    console.log(`   🏠 Local: http://localhost:${PORT}`);
    console.log(`   🌐 Rede:  http://${localIp}:${PORT}`);
    console.log(`   📧 Provedor: ${emailService.getProviderName()}`);
    console.log('   ──────────────────────────────────────────');
    console.log('   📍 GPS: Funciona em localhost ou HTTPS.');
    console.log('      Para testar GPS em celulares na rede:');
    console.log('      • Use ngrok: npx ngrok http 3000');
    console.log('      • Ou Chrome flags (celular Android):');
    console.log('        chrome://flags → Insecure origins');
    console.log(`        → adicione http://${localIp}:${PORT}`);
    console.log('   ══════════════════════════════════════════\n');
  });
}

start().catch(console.error);
