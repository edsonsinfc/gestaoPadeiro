/**
 * Notification Service for Baker app reminders
 */
const NotificationService = {
  lastNotificationText: '',
  lastNotificationTime: 0,

  async triggerLocalNotification(title, body) {
    const now = Date.now();
    if (this.lastNotificationText === body && (now - this.lastNotificationTime) < 5000) {
      console.log('[NotificationService] Duplicate local notification ignored:', { title, body });
      return;
    }
    this.lastNotificationText = body;
    this.lastNotificationTime = now;

    const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isCapacitor) {
      console.log('[NotificationService] Not on a native platform, skipping local notification:', { title, body });
      return;
    }

    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
    if (!LocalNotifications) {
      console.warn('[NotificationService] LocalNotifications plugin not found.');
      return;
    }

    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          console.warn('[NotificationService] Notification permission denied.');
          return;
        }
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000) + 1,
            title: title,
            body: body,
            schedule: { at: new Date(Date.now() + 50) },
            sound: null,
            attachments: null,
            actionTypeId: "",
            extra: null
          }
        ]
      });
      console.log('[NotificationService] Native local notification sent:', { title, body });
    } catch (err) {
      console.error('[NotificationService] Error triggering local notification:', err);
    }
  },

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
      const reminders = [
        {
          id: 1001,
          title: 'Smart Gestor 🥖',
          body: 'Você não está usando o app, clique para entrar.',
          delayMs: 5 * 60 * 60 * 1000 // 5 hours
        },
        {
          id: 1002,
          title: 'Smart Gestor 🥖',
          body: 'Você não está usando o app, clique para entrar.',
          delayMs: 8 * 60 * 60 * 1000 // 8 hours
        },
        {
          id: 1003,
          title: 'Smart Gestor 🥖',
          body: 'Você não está usando o app, clique para entrar.',
          delayMs: 10 * 60 * 60 * 1000 // 10 hours
        }
      ];

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
