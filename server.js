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



const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ============================================================
// API ROUTES
// ============================================================
app.get('/api/ping', (req, res) => res.json({ pong: true }));
app.use('/api', require('./routes'));



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
