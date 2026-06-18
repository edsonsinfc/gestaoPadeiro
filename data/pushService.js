const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
let admin = null;
let firebaseAdminEnabled = false;

// 1. Inicializar Firebase Admin SDK para Push Nativo (Android)
const firebaseConfigPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
if (fs.existsSync(firebaseConfigPath)) {
  try {
    admin = require('firebase-admin');
    const serviceAccount = require(firebaseConfigPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseAdminEnabled = true;
    console.log('🔥 [Push Service] Firebase Admin SDK inicializado com sucesso!');
  } catch (err) {
    console.error('❌ [Push Service] Erro ao inicializar Firebase Admin:', err.message);
  }
} else {
  console.log('⚠️ [Push Service] Chave "config/firebase-service-account.json" não encontrada. Push nativo desativado.');
}

// 2. Inicializar Web Push (Browser VAPID)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@brago.com.br',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('🔔 [Push Service] Web Push (VAPID) configurado com sucesso!');
  } catch (err) {
    console.error('❌ [Push Service] Erro ao configurar Web Push VAPID:', err.message);
  }
}

/**
 * Envia notificação para uma inscrição específica (Nativa ou Web Push)
 */
async function sendPushToSubscription(sub, title, body, url = '/') {
  const payloadObj = { title, body, url };

  // Caso 1: Push Nativo (Android FCM)
  if (sub.isNative || (sub.endpoint && sub.endpoint.startsWith('native_fcm_'))) {
    if (!firebaseAdminEnabled) {
      console.warn('⚠️ [Push Service] FCM não habilitado. Não foi possível enviar notificação nativa.');
      return false;
    }

    const token = sub.fcmToken || sub.endpoint.replace('native_fcm_', '');
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        url: url
      },
      token: token
    };

    try {
      await admin.messaging().send(message);
      console.log(`📡 [Push Nativo] Enviado com sucesso para o token FCM: ${token.substring(0, 15)}...`);
      return true;
    } catch (error) {
      console.error(`❌ [Push Nativo] Erro ao enviar para token ${token.substring(0, 15)}... :`, error.message);
      // Se o token não estiver mais registrado, removemos a assinatura obsoleta
      if (error.code === 'messaging/registration-token-not-registered') {
        try {
          const { PushSubscription } = require('./db-adapter');
          await PushSubscription.deleteMany({ endpoint: sub.endpoint });
          console.log(`🗑️ [Push Nativo] Token inválido removido do banco: ${sub.endpoint}`);
        } catch (dbErr) {
          console.error('[Push Service] Erro ao limpar token expirado:', dbErr.message);
        }
      }
      return false;
    }
  } 
  
  // Caso 2: Web Push Clássico (VAPID)
  else {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('⚠️ [Push Service] VAPID keys não configuradas. Não foi possível enviar Web Push.');
      return false;
    }

    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
      }, JSON.stringify(payloadObj));
      console.log(`📡 [Web Push] Enviado com sucesso para endpoint: ${sub.endpoint.substring(0, 30)}...`);
      return true;
    } catch (err) {
      console.error(`❌ [Web Push] Erro ao enviar para ${sub.endpoint.substring(0, 30)}... :`, err.message);
      if (err.statusCode === 404 || err.statusCode === 410) {
        try {
          const { PushSubscription } = require('./db-adapter');
          await PushSubscription.deleteMany({ endpoint: sub.endpoint });
          console.log(`🗑️ [Web Push] Endpoint expirado removido do banco: ${sub.endpoint}`);
        } catch (dbErr) {
          console.error('[Push Service] Erro ao limpar endpoint expirado:', dbErr.message);
        }
      }
      return false;
    }
  }
}

/**
 * Envia notificação para todas as inscrições de um padeiro específico
 */
async function sendPushToUser(padeiroId, title, body, url = '/') {
  try {
    const { PushSubscription } = require('./db-adapter');
    const subs = await PushSubscription.find({ padeiroId });
    
    if (subs.length === 0) {
      console.log(`ℹ️ [Push Service] Padeiro ${padeiroId} não possui dispositivos inscritos.`);
      return { sent: 0, total: 0 };
    }

    console.log(`🔔 [Push Service] Disparando push para o padeiro ${padeiroId} em ${subs.length} dispositivo(s)...`);
    
    let sentCount = 0;
    for (const sub of subs) {
      const success = await sendPushToSubscription(sub, title, body, url);
      if (success) sentCount++;
    }

    return { sent: sentCount, total: subs.length };
  } catch (err) {
    console.error(`❌ [Push Service] Erro ao enviar push para o usuário ${padeiroId}:`, err.message);
    return { sent: 0, total: 0 };
  }
}

module.exports = {
  sendPushToSubscription,
  sendPushToUser,
  isFirebaseEnabled: () => firebaseAdminEnabled
};
