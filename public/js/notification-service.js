/**
 * Notification Service for Baker app reminders
 */
const NotificationService = {
  async init() {
    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isCapacitor) {
      console.log('[NotificationService] Not on a native platform, skipping initialization.');
      return;
    }

    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications) {
      console.warn('[NotificationService] LocalNotifications plugin not found.');
      return;
    }

    try {
      // 1. Check and request notification permissions
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[NotificationService] Notification permission denied by user.');
          return;
        }
      }

      // 2. Clear previously scheduled notifications to avoid duplicates and reset timer
      const pending = await LocalNotifications.getPending();
      if (pending && pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
        console.log('[NotificationService] Cancelled pending notifications:', pending.notifications.length);
      }

      // 3. Schedule access reminders
      // Reminder 1: 18 hours from now
      // Reminder 2: 36 hours from now
      // Reminder 3: 60 hours from now
      const reminders = [
        {
          id: 1001,
          title: 'Smart Gestor 🥖',
          body: 'Olá! Notamos que você não abriu o app hoje. Que tal registrar sua produção?',
          delayMs: 18 * 60 * 60 * 1000 // 18 hours
        },
        {
          id: 1002,
          title: 'Smart Gestor 🥖',
          body: 'Ainda sem novidades? Não se esqueça de entrar no app e atualizar seu status.',
          delayMs: 36 * 60 * 60 * 1000 // 36 hours
        },
        {
          id: 1003,
          title: 'Smart Gestor 🥖',
          body: 'Você está fora há mais de 2 dias! Por favor, abra o aplicativo para sincronizar seus dados.',
          delayMs: 60 * 60 * 60 * 1000 // 60 hours
        }
      ];

      // Wait, 18 hours is 18 * 60 * 60 * 1000 ms = 64,800,000 ms
      // 36 hours is 36 * 60 * 60 * 1000 ms = 129,600,000 ms
      // 60 hours is 60 * 60 * 60 * 1000 ms = 216,000,000 ms (wait, 60 * 60 * 60 * 1000 is actually 60 * 60 * 1000 * 60? No, 60 * 60 * 1000 is 1 hour, so 60 hours is 60 * (60 * 60 * 1000) = 60 * 3,600,000 = 216,000,000 ms. So delayMs should be 60 * 60 * 60 * 1000!)
      // Yes! Let's write it mathematically: 60 * 60 * 1000 * 60 is 216,000,000.
      
      const notifications = reminders.map(r => ({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: { at: new Date(Date.now() + r.delayMs) },
        sound: null,
        attachments: null,
        actionTypeId: "",
        extra: null
      }));

      await LocalNotifications.schedule({ notifications });
      console.log('[NotificationService] Scheduled notification reminders successfully.');
    } catch (err) {
      console.error('[NotificationService] Error initializing notifications:', err);
    }
  }
};
