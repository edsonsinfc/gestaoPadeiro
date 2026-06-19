/**
 * Components - Reusable UI Components
 * BRAGO Sistema Padeiro
 */

const Components = {
  // Toast notifications
  toast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    this.renderIcons();
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, duration);
  },

  // Modal
  showModal(title, contentHtml, footerHtml = '', customClass = '') {
    let overlay = document.getElementById('global-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal-content ${customClass}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" onclick="Components.closeModal()">&times;</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>`;
    requestAnimationFrame(() => overlay.classList.add('active'));
    overlay.addEventListener('click', e => { if (e.target === overlay) Components.closeModal(); });
  },

  closeModal() {
    const overlay = document.getElementById('global-modal');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        // Only remove if it's still inactive (no new modal was opened in the meantime)
        if (overlay && !overlay.classList.contains('active')) {
          overlay.remove();
        }
      }, 300);
    }
  },

  // Apple HIG Style Alert
  showAlert(title, message, btnText = 'OK') {
    let overlay = document.getElementById('ios-alert-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ios-alert-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
      overlay.style.zIndex = '99999999'; // Extremely high z-index to appear over pf-modal-overlay (which has 9999999)
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s ease';
      document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
      <div style="background: #ffffff; width: 270px; border-radius: 14px; text-align: center; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.2); transform: scale(0.95); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="ios-alert-box">
        <div style="padding: 20px 16px 16px;">
          <h3 style="margin: 0 0 6px; font-size: 17px; font-weight: 600; color: #000; line-height: 1.2;">${title}</h3>
          <p style="margin: 0; font-size: 13px; font-weight: 400; color: #333; line-height: 1.35;">${message}</p>
        </div>
        <div style="border-top: 1px solid rgba(0,0,0,0.1); display: flex;">
          <button style="flex: 1; padding: 12px; background: none; border: none; font-size: 17px; font-weight: 600; color: #007aff; cursor: pointer; user-select: none;" onclick="Components.closeAlert()">${btnText}</button>
        </div>
      </div>
    `;
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      const box = document.getElementById('ios-alert-box');
      if (box) box.style.transform = 'scale(1)';
    });
  },

  closeAlert() {
    const overlay = document.getElementById('ios-alert-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      const box = document.getElementById('ios-alert-box');
      if (box) box.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        // Restore scrolling if no other modals are active
        if (!document.getElementById('global-modal') && !document.querySelector('.pf-modal-ios.active')) {
          document.body.style.overflow = '';
        }
      }, 200);
    }
  },

  // Confirm dialog
  confirm(message, onConfirm) {
    this._confirmCallback = onConfirm;
    this.showModal('Confirmação', `<p style="margin-bottom:8px">${message}</p>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-danger" onclick="Components.closeModal(); Components._triggerConfirm()">Confirmar</button>`
    );
  },

  _triggerConfirm() {
    if (this._confirmCallback) {
      this._confirmCallback();
      this._confirmCallback = null;
    }
  },

  // Loading
  loading() {
    return '<div class="loading-screen"><div class="loader"></div></div>';
  },

  // Empty state
  empty(icon, text) {
    return `<div class="empty-state" style="text-align:center;padding:48px;color:var(--text-tertiary);">
      <div class="empty-icon" style="font-size:48px;margin-bottom:16px;"><i data-lucide="${icon}" size="48"></i></div>
      <p>${text}</p>
    </div>`;
  },

  // Star rating (interactive)
  starRating(currentValue = 0, name = 'rating') {
    let html = `<div class="stars" data-name="${name}" data-value="${currentValue}" style="display: flex; gap: 4px; cursor: pointer;">`;
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= currentValue;
      html += `<i data-lucide="star" class="star ${isFilled ? 'filled' : ''}" data-value="${i}" onclick="Components.setStarRating(this)" style="fill: ${isFilled ? 'currentColor' : 'none'};"></i>`;
    }
    html += '</div>';
    return html;
  },

  setStarRating(starEl) {
    const val = parseInt(starEl.dataset.value);
    const container = starEl.parentElement;
    container.dataset.value = val;
    container.querySelectorAll('.star').forEach(s => {
      const v = parseInt(s.dataset.value);
      const isFilled = v <= val;
      s.classList.toggle('filled', isFilled);
      s.style.fill = isFilled ? 'currentColor' : 'none';
    });
  },

  // Star rating (display only)
  starsDisplay(value) {
    let html = '<div class="stars stars-display" style="display: flex; gap: 2px;">';
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= value;
      html += `<i data-lucide="star" size="14" style="fill: ${isFilled ? 'currentColor' : 'none'}; color: ${isFilled ? '#FFD60A' : 'var(--text-tertiary)'};"></i>`;
    }
    html += '</div>';
    return html;
  },

  // Progress bar
  progressBar(value, max, colorClass = '') {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return `<div class="progress-bar"><div class="progress-fill ${colorClass}" style="width:${pct}%"></div></div>`;
  },

  // Badge
  badge(text, type = 'amber') {
    return `<span class="badge badge-${type}">${text}</span>`;
  },

  // Avatar
  avatar(name, size = '') {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return `<div class="avatar-sm ${size}">${initials}</div>`;
  },

  // Search bar
  searchBar(placeholder, onInput) {
    const id = 'search-' + Math.random().toString(36).substr(2, 6);
    return `<div class="search-bar"><i data-lucide="search"></i><input id="${id}" type="text" placeholder="${placeholder}" oninput="(${onInput.toString()})(this.value)"></div>`;
  },

  // Pagination helper
  paginate(items, page, perPage) {
    const total = Math.ceil(items.length / perPage);
    const start = (page - 1) * perPage;
    return { data: items.slice(start, start + perPage), total, page, perPage, totalItems: items.length };
  },
  
  // Re-render Lucide icons
  renderIcons() {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          'stroke-width': 1.75
        }
      });
    }
    // Lazy load product images from cache or remote
    if (typeof OfflineManager !== 'undefined') {
      OfflineManager.loadLazyImages();
    }
  },

  // Create ripple effect
  createRipple(event, element) {
    const rect = element.getBoundingClientRect();
    const circle = document.createElement("span");
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add("ripple");

    const ripple = element.getElementsByClassName("ripple")[0];
    if (ripple) ripple.remove();

    element.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }
};

// --- Offline & Sync Manager (IndexedDB) ---
const OfflineManager = {
  dbName: 'BragoPadeiroDB',
  dbVersion: 3, // Incremented version for new stores and photos cache
  db: null,
  photosMemoryCache: {}, // Cache em memória para renderização instantânea das fotos
  isSyncing: false,
  _syncFailCount: 0, // Contador de falhas consecutivas de sincronização
  _lastSyncToast: 0, // Timestamp do último toast de sincronização
  MAX_RETRIES: 5, // Máximo de tentativas antes de descartar um request

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('pendingRequests')) {
          db.createObjectStore('pendingRequests', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('dataCache')) {
          db.createObjectStore('dataCache', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('pendingUploads')) {
          db.createObjectStore('pendingUploads', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('fotosCache')) {
          db.createObjectStore('fotosCache', { keyPath: 'codigo' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        console.log('[Offline] IndexedDB inicializado');
        this.startSyncCheck();
        resolve();
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Cache para requisições GET
  async cacheData(url, data) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['dataCache'], 'readwrite');
      const store = transaction.objectStore('dataCache');
      const request = store.put({ url, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async getCachedData(url) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['dataCache'], 'readonly');
      const store = transaction.objectStore('dataCache');
      const request = store.get(url);
      request.onsuccess = async () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          // Fallback se for a agenda do padeiro e estiver offline/sem cache direto
          if (url === '/api/cronograma/agenda') {
            const fallbackData = await this.getAgendaFromWeeklyCacheFallback();
            if (fallbackData) {
              console.log('[Offline Cache] Usando fallback da agenda semanal para /api/cronograma/agenda');
              resolve(fallbackData);
              return;
            }
          }
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  },

  async getAgendaFromWeeklyCacheFallback() {
    return new Promise((resolve) => {
      const userData = localStorage.getItem('brago_user');
      const user = userData ? JSON.parse(userData) : null;
      if (!user) {
        resolve(null);
        return;
      }
      
      const transaction = this.db.transaction(['dataCache'], 'readonly');
      const store = transaction.objectStore('dataCache');
      const request = store.openCursor();
      let foundAgenda = null;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const key = cursor.key;
          if (key.includes('/api/admin/agenda-semanal')) {
            const cacheItem = cursor.value;
            if (cacheItem && cacheItem.data && Array.isArray(cacheItem.data.agenda)) {
              const myTasks = cacheItem.data.agenda.filter(t => t && (t.padeiroId === user.id || t.codTec === user.codTec));
              if (myTasks.length > 0) {
                foundAgenda = myTasks;
              }
            }
          }
          cursor.continue();
        } else {
          resolve(foundAgenda);
        }
      };
      request.onerror = () => resolve(null);
    });
  },

  async saveRequest(url, method, body) {
    if (!this.db) await this.init();

    // Deduplicação: Para PUTs à mesma URL, substituir a entrada anterior
    // Isso garante que só o estado MAIS RECENTE (ex: status 'finalizada') seja sincronizado
    if (method === 'PUT') {
      try {
        const existing = await this.getPendingRequests();
        const duplicate = existing.find(r => r.url === url && r.method === 'PUT');
        if (duplicate) {
          console.log(`[Offline] Deduplicando PUT para ${url} (substituindo id ${duplicate.id})`);
          await this.deleteRequest(duplicate.id);
        }
      } catch (e) {
        console.warn('[Offline] Erro na deduplicação, salvando normalmente:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const request = store.add({ url, method, body, timestamp: Date.now(), _retryCount: 0 });
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async updateLocalCache(url, method, body) {
    if (!this.db) await this.init();
    
    // 1. Atualizar cache de /api/atividades
    if (url.includes('/api/atividades')) {
      const cacheUrl = '/api/atividades';
      let cachedList = await this.getCachedData(cacheUrl) || [];
      if (!Array.isArray(cachedList)) cachedList = [];

      if (method === 'POST') {
        const newActivity = { 
          ...body, 
          status: body.status || 'em_andamento',
          timeline: body.timeline || []
        };
        const idx = cachedList.findIndex(a => (a.id === newActivity.id || a._id === newActivity.id));
        if (idx !== -1) {
          cachedList[idx] = newActivity;
        } else {
          cachedList.push(newActivity);
        }
      } else if (method === 'PUT') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        
        const idx = cachedList.findIndex(a => (a.id === id || a._id === id || a.id === body.id || a._id === body.id));
        if (idx !== -1) {
          cachedList[idx] = { ...cachedList[idx], ...body };
        } else {
          cachedList.push({ id, ...body });
        }
      } else if (method === 'DELETE') {
        const parts = url.split('/');
        const id = parts[parts.length - 1];
        cachedList = cachedList.filter(a => (a.id !== id && a._id !== id));
      }
      
      await this.cacheData(cacheUrl, cachedList);
      console.log('[Offline Cache] Cache de /api/atividades atualizado:', cachedList);
    }
    
    // 2. Atualizar cache da agenda /api/cronograma/agenda
    if (url.includes('/api/cronograma/agenda')) {
      const cacheUrl = '/api/cronograma/agenda';
      let cachedAgenda = await this.getCachedData(cacheUrl) || [];
      if (!Array.isArray(cachedAgenda)) cachedAgenda = [];
      
      if (url.includes('/status') && method === 'PATCH') {
        const parts = url.split('/');
        const id = parts[parts.length - 2];
        const status = body ? body.status : null;
        
        const idx = cachedAgenda.findIndex(a => (a.id === id || a._id === id));
        if (idx !== -1) {
          cachedAgenda[idx] = { ...cachedAgenda[idx], status };
          await this.cacheData(cacheUrl, cachedAgenda);
          console.log('[Offline Cache] Cache de agenda atualizado:', cachedAgenda[idx]);
        }

        // Também atualizar nos caches de /api/admin/agenda-semanal se existirem
        await this.updateWeeklyAgendaCacheStatus(id, status);
      }
    }
  },

  async updateWeeklyAgendaCacheStatus(id, status) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['dataCache'], 'readwrite');
      const store = transaction.objectStore('dataCache');
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const key = cursor.key;
          if (key.includes('/api/admin/agenda-semanal')) {
            const cacheItem = cursor.value;
            if (cacheItem && cacheItem.data && Array.isArray(cacheItem.data.agenda)) {
              let changed = false;
              cacheItem.data.agenda = cacheItem.data.agenda.map(t => {
                if (t && (t.id === id || t._id === id)) {
                  changed = true;
                  return { ...t, status };
                }
                return t;
              });
              if (changed) {
                cursor.update(cacheItem);
                console.log('[Offline Cache] Status atualizado no cache da agenda semanal:', id, status);
              }
            }
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => resolve();
    });
  },

  // Suporte para Upload de Arquivos Offline
  async saveUpload(url, files, type) {
    if (!this.db) await this.init();
    
    // Convert files to Array of objects with Base64 strings to prevent Android WebView Structured Clone serialization bugs/hangs
    const fileData = await Promise.all(Array.from(files).map(async f => {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(f);
      });
      return {
        name: f.name,
        type: f.type,
        base64: base64Data
      };
    }));

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
        const store = transaction.objectStore('pendingUploads');
        const request = store.add({ url, fileData, type, timestamp: Date.now() });
        request.onsuccess = () => {
          Components.toast('Modo Offline: Arquivos salvos para envio posterior!', 'info');
          resolve({ offline: true, files: fileData.map(f => ({ name: f.name, filename: f.name, offline: true, path: 'offline_pending' })) });
        };
        request.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  },

  async getPendingRequests() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['pendingRequests'], 'readonly');
      const store = transaction.objectStore('pendingRequests');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  async getPendingUploads() {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['pendingUploads'], 'readonly');
      const store = transaction.objectStore('pendingUploads');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  },

  async deleteRequest(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteUpload(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
      const store = transaction.objectStore('pendingUploads');
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
    });
  },

  // Incrementa o _retryCount de um request pendente no IndexedDB
  async _incrementRetryCount(id, currentRetryCount) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record._retryCount = (currentRetryCount || 0) + 1;
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  },

  startSyncCheck() {
    // Reseta o contador de falhas ao voltar online
    window.addEventListener('online', () => {
      this._syncFailCount = 0;
      Components.toast('Conexão restabelecida! Sincronizando dados em instantes...', 'success');
      setTimeout(() => this.syncPending(), 2000); // Wait 2s for connection stability
      
      // Atualizar a agenda local ao voltar a ficar online
      if (typeof API !== 'undefined' && typeof API.get === 'function') {
        API.get('/api/cronograma/agenda')
          .then(() => {
            if (typeof App !== 'undefined') {
              if (App.currentRoute === 'padeiro-agenda') {
                if (typeof PadeiroAgenda !== 'undefined' && typeof PadeiroAgenda.render === 'function') {
                  PadeiroAgenda.render();
                }
              } else if (App.currentRoute === 'padeiro-atividade') {
                if (typeof PadeiroFlow !== 'undefined' && PadeiroFlow.currentStep === 0 && typeof PadeiroFlow.renderStep === 'function') {
                  console.log('🔄 Recarregando o seletor de tarefas (passo 0) após restabelecer conexão online...');
                  PadeiroFlow.renderStep();
                }
              }
            }
          })
          .catch(() => {});
      }
    });
    
    // Sincroniza na inicialização se estiver online com pequeno delay
    if (navigator.onLine) {
      console.log('[Offline] Online na inicialização, agendando sincronização em segundo plano...');
      setTimeout(() => this.syncPending(), 2000);
    }

    // Intervalo adaptativo: começa em 30s, aumenta com backoff em caso de falhas consecutivas
    // Máximo de 5 minutos entre tentativas
    this._syncIntervalId = setInterval(async () => {
      if (!navigator.onLine) return;
      
      // Backoff exponencial: 30s, 60s, 120s, 240s, 300s (cap)
      const baseInterval = 30000;
      const backoffMs = Math.min(baseInterval * Math.pow(2, this._syncFailCount), 300000);
      const now = Date.now();
      if (this._lastSyncAttempt && (now - this._lastSyncAttempt) < backoffMs) {
        return; // Ainda dentro do período de backoff, pula esta iteração
      }

      try {
        const uploads = await this.getPendingUploads();
        const pending = await this.getPendingRequests();
        if (uploads.length > 0 || pending.length > 0) {
          console.log(`[Offline] ${uploads.length + pending.length} itens pendentes. Sincronizando (tentativa após ${Math.round(backoffMs/1000)}s)...`);
          this.syncPending();
        }
      } catch (e) {
        console.warn('[Offline] Erro ao verificar pendentes:', e);
      }
    }, 15000); // Verifica a cada 15s mas o backoff controla se realmente executa
  },

  async syncPending() {
    if (this.isSyncing) return;
    
    const uploads = await this.getPendingUploads();
    const pending = await this.getPendingRequests();
    
    if (uploads.length === 0 && pending.length === 0) return;
    
    this.isSyncing = true;
    this._lastSyncAttempt = Date.now();
    let successCount = 0;
    let failCount = 0;
    let permanentFailCount = 0; // Requests descartados por exceder retries
    
    // Throttle de toast: máximo 1 toast de início de sync a cada 60s
    const now = Date.now();
    const canShowToast = (now - this._lastSyncToast) > 60000;
    if (canShowToast) {
      this._lastSyncToast = now;
      Components.toast(`Sincronizando ${uploads.length + pending.length} dados salvos offline...`, 'info');
    }

    try {
    // Passo 1: Sincronizar Uploads PRIMEIRO
    const uploadedPaths = {}; // Mapa para guardar filename -> real path
    const allUploadedFiles = []; // Lista de TODOS os arquivos enviados com sucesso
    for (const up of uploads) {
      try {
        const files = up.fileData.map(f => {
          if (f.base64) {
            // Reconstruct File from base64 string
            const arr = f.base64.split(',');
            const mime = f.type || (arr[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], f.name, { type: mime });
          } else {
            return new File([f.blob], f.name, { type: f.type });
          }
        });
        const result = await API.uploadFiles(files, up.type, true);
        if (result && result.files) {
          result.files.forEach(f => {
            // Guarda na lista global de uploads bem-sucedidos
            allUploadedFiles.push(f);
            // Usa o filename original ou ajustado para mapear
            uploadedPaths[f.filename] = f;
            uploadedPaths[f.filename.replace(/^compress_/, '')] = f; // caso tenha mudado
            if (f.originalname) {
              uploadedPaths[f.originalname] = f;
              uploadedPaths[f.originalname.replace(/^compress_/, '')] = f;
            }
          });
        }
        await this.deleteUpload(up.id);
        successCount++;
      } catch (err) {
        console.error(`[Offline] Falha ao sincronizar upload ${up.id}:`, err);
        failCount++;
      }
    }

    // Passo 2: Sincronizar Requisições e Atualizar Placeholders
    // Tratamento especial para assinaturas (base64) enviadas offline
    const signatureRequests = pending.filter(req => req.url.includes('/api/upload/base64/assinaturas'));
    let lastSignaturePath = null;
    
    for (const req of signatureRequests) {
      try {
        const res = await API.request(req.url, { 
          method: req.method, 
          body: JSON.stringify(req.body),
          isSyncing: true 
        });
        if (res && res.path) lastSignaturePath = res.path;
        await this.deleteRequest(req.id);
        successCount++;
      } catch (err) {
        console.error(`[Offline] Falha ao sincronizar assinatura ${req.id}:`, err);
        // Verifica se é erro permanente (servidor rejeitou) vs temporário (rede)
        const handled = await this._handleSyncError(req, err);
        if (handled === 'discarded') {
          permanentFailCount++;
        } else {
          failCount++;
        }
      }
    }

    // Agora processa as requisições normais (ex: atualização da atividade, conclusão da agenda)
    const allNormal = pending.filter(req => !req.url.includes('/api/upload/base64'));
    
    // DEDUPLICAÇÃO: Para PUTs à mesma URL, manter apenas o ÚLTIMO (com dados mais completos)
    // Isso é crucial para atividades: o wizard salva várias vezes, mas só o último PUT
    // contém status='finalizada' e todos os dados preenchidos
    const deduplicatedMap = new Map();
    const nonPutRequests = [];
    const idsToDelete = [];
    
    for (const req of allNormal) {
      if (req.method === 'PUT') {
        if (deduplicatedMap.has(req.url)) {
          // Já existe um PUT para esta URL - remover o antigo, manter o mais recente
          const older = deduplicatedMap.get(req.url);
          idsToDelete.push(older.id);
          console.log(`[Offline] Deduplicando PUT antigo para ${req.url} (id ${older.id})`);
        }
        deduplicatedMap.set(req.url, req);
      } else {
        nonPutRequests.push(req);
      }
    }
    
    // Limpar os registros duplicados do IndexedDB
    for (const id of idsToDelete) {
      try { await this.deleteRequest(id); successCount++; } catch(e) {}
    }
    
    // Montar lista final contendo todos os PUTs deduplicados e outras requisições
    const normalRequests = [...deduplicatedMap.values(), ...nonPutRequests];
    // Ordenar estritamente de forma cronológica pelo timestamp do registro local.
    // Isso garante a ordem correta: POST (início) -> PUT (atualização/fotos) -> PATCH (finalização da agenda).
    normalRequests.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    for (const req of normalRequests) {
      try {
        // Se for requisição com body JSON, injetar os caminhos reais
        if (req.body) {
          // Atualiza fotos offline com os caminhos reais dos uploads
          if (Array.isArray(req.body.fotos)) {
            const hasOfflineFotos = req.body.fotos.some(f => f.offline || f.path === 'offline_pending');
            
            if (hasOfflineFotos) {
              const validMappedFotos = [];
              req.body.fotos.forEach(foto => {
                if (foto.offline || foto.path === 'offline_pending') {
                  const realUpload = uploadedPaths[foto.filename] || uploadedPaths[foto.name];
                  if (realUpload) {
                    validMappedFotos.push({
                      filename: realUpload.filename,
                      path: realUpload.path,
                      size: realUpload.size
                    });
                  } else {
                    console.warn(`[Offline] Desconsiderando foto offline sem correspondência (falha no upload): ${foto.name || foto.filename}`);
                  }
                } else {
                  validMappedFotos.push(foto);
                }
              });
              req.body.fotos = validMappedFotos;
            }
          }
          
          // Se a assinatura faltou por estar offline, injeta a última sincronizada
          if (lastSignaturePath && req.body.assinatura === undefined) {
            req.body.assinatura = lastSignaturePath;
          }
        }

        await API.request(req.url, { 
          method: req.method, 
          body: JSON.stringify(req.body),
          isSyncing: true 
        });
        await this.deleteRequest(req.id);
        successCount++;
      } catch (err) {
        console.error(`[Offline] Falha ao sincronizar requisição ${req.id}:`, err);
        // Verifica se é erro permanente (servidor rejeitou) vs temporário (rede)
        const handled = await this._handleSyncError(req, err);
        if (handled === 'discarded') {
          permanentFailCount++;
        } else {
          failCount++;
        }
      }
    }

    // Atualiza o contador de falhas consecutivas para controlar o backoff
    if (failCount > 0 && successCount === 0) {
      this._syncFailCount = Math.min(this._syncFailCount + 1, 5);
    } else if (successCount > 0) {
      this._syncFailCount = 0; // Reset backoff se algo funcionou
    }

    // Toast de resultado com contagem real (throttled)
    if ((successCount > 0 || failCount > 0 || permanentFailCount > 0) && canShowToast) {
      if (failCount === 0 && permanentFailCount === 0) {
        Components.toast('Sincronização concluída com sucesso!', 'success');
      } else if (permanentFailCount > 0 && failCount === 0) {
        Components.toast(`Sincronização concluída. ${successCount} salvos, ${permanentFailCount} descartados (dados inválidos).`, 'info');
      } else if (successCount > 0) {
        Components.toast(`Sincronização parcial. ${successCount} salvos, ${failCount} aguardando conexão.`, 'info');
      } else {
        // Só mostra erro se não estiver em backoff pesado (evita spam)
        if (this._syncFailCount <= 2) {
          Components.toast('Sincronização aguardando conexão estável. Tentaremos novamente.', 'info');
        }
      }
      // Atualiza a tela se não estiver no meio do formulário
      if (successCount > 0 && typeof App !== 'undefined' && App.currentRoute) {
        if (App.currentRoute !== 'padeiro-atividade') {
          App.renderPage(App.currentRoute);
        } else if (typeof PadeiroFlow !== 'undefined' && PadeiroFlow.currentStep === 0 && typeof PadeiroFlow.renderStep === 'function') {
          console.log('🔄 Recarregando o seletor de tarefas (passo 0) após sincronização offline...');
          PadeiroFlow.renderStep();
        }
      }
    }

    } finally {
      // CRÍTICO: Sempre libera o flag, mesmo em caso de exceção
      this.isSyncing = false;
    }
  },

  /**
   * Trata erros de sincronização diferenciando erros permanentes (servidor rejeitou)
   * de erros transientes (rede, timeout).
   * Retorna 'discarded' se o request foi removido, 'retry' se será tentado novamente.
   */
  async _handleSyncError(req, err) {
    if (err && err.status !== undefined) {
      const status = err.status;
      if (status >= 400 && status < 500) {
        if (status === 401 || status === 403) {
          console.warn(`[Offline] Request ${req.id} falhou com status ${status}. Mantendo na fila para quando o usuário logar/atualizar permissões.`);
          return 'retry';
        }
        console.warn(`[Offline] Descartando request ${req.id} (${req.method} ${req.url}) - erro permanente do cliente (Status ${status}): ${err.message}`);
        try { await this.deleteRequest(req.id); } catch(e) {}
        return 'discarded';
      } else {
        console.log(`[Offline] Falha temporária do servidor (Status ${status}) para request ${req.id}. Mantendo na fila.`);
        return 'retry';
      }
    }

    const errMsg = (err.message || '').toLowerCase();
    const isNetworkError = 
      errMsg.includes('failed to fetch') || 
      errMsg.includes('network error') || 
      errMsg.includes('timeout') || 
      errMsg.includes('abort') ||
      errMsg.includes('connecting');
      
    if (isNetworkError) {
      return 'retry';
    }

    const isPermanentError = 
      errMsg.includes('não encontrad') ||
      errMsg.includes('not found') ||
      errMsg.includes('validat') ||
      errMsg.includes('inválid') ||
      errMsg.includes('invalid') ||
      errMsg.includes('duplicate') ||
      errMsg.includes('duplicat') ||
      errMsg.includes('já existe') ||
      errMsg.includes('already exists');
    
    if (isPermanentError) {
      console.warn(`[Offline] Descartando request ${req.id} (${req.method} ${req.url}) - erro de string permanente: ${errMsg}`);
      try { await this.deleteRequest(req.id); } catch(e) {}
      return 'discarded';
    }
    
    const currentRetries = req._retryCount || 0;
    if (currentRetries >= this.MAX_RETRIES) {
      console.warn(`[Offline] Descartando request ${req.id} (${req.method} ${req.url}) - excedeu ${this.MAX_RETRIES} tentativas.`);
      try { await this.deleteRequest(req.id); } catch(e) {}
      return 'discarded';
    }
    
    try { await this._incrementRetryCount(req.id, currentRetries); } catch(e) {}
    console.log(`[Offline] Request ${req.id} será re-tentado (tentativa ${currentRetries + 1}/${this.MAX_RETRIES}).`);
    return 'retry';
  },

  // --- Cache de Fotos de Produtos ---
  async getProductPhotoCache(codigo) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const transaction = this.db.transaction(['fotosCache'], 'readonly');
      const store = transaction.objectStore('fotosCache');
      const request = store.get(codigo);
      request.onsuccess = () => resolve(request.result ? request.result.dataUrl : null);
      request.onerror = () => resolve(null);
    });
  },

  compressImageBlob(blob, maxDim = 250, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(img.src);
        reject(err);
      };
    });
  },

  async cacheProductPhoto(codigo, url) {
    if (!this.db) await this.init();
    // Evita cachear se já estiver no cache
    const existing = await this.getProductPhotoCache(codigo);
    if (existing) return;

    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const blob = await response.blob();
      
      // Comprimir imagem para max 250px e 70% de qualidade JPEG
      const dataUrl = await this.compressImageBlob(blob, 250, 0.7);

      const transaction = this.db.transaction(['fotosCache'], 'readwrite');
      const store = transaction.objectStore('fotosCache');
      store.put({ codigo, dataUrl, timestamp: Date.now() });
      console.log(`📸 Foto do produto ${codigo} salva no cache local de forma otimizada.`);
    } catch (e) {
      console.warn(`Erro ao salvar foto ${codigo} no cache:`, e);
    }
  },

  loadLazyImages() {
    document.querySelectorAll('img[src*="/api/foto-produto/"]').forEach(async (img) => {
      const src = img.src;
      // Extrair o código do produto da URL (ex: /api/foto-produto/14510)
      const parts = src.split('/');
      const codigo = parts[parts.length - 1];
      if (!codigo || codigo.startsWith('data:')) return;

      try {
        const cachedDataUrl = await this.getProductPhotoCache(codigo);
        if (cachedDataUrl) {
          // Se achou no cache, substitui o src da imagem pela versão local offline
          if (img.src !== cachedDataUrl) {
            img.src = cachedDataUrl;
          }
        } else {
          // Se não está no cache, reescreve o src para o servidor absoluto se estiver rodando local no webview
          if (src.includes('localhost') || !src.startsWith('http')) {
            const relativePath = src.substring(src.indexOf('/api/'));
            img.src = `${API_BASE_URL}${relativePath}`;
          }
          // Baixa em background para o cache se estiver online
          if (navigator.onLine) {
            const absoluteUrl = img.src;
            this.cacheProductPhoto(codigo, absoluteUrl).catch(console.warn);
          }
        }
      } catch (err) {
        console.warn('Erro ao processar imagem em cache:', err);
      }
    });
  },

  async preloadProductPhotos(produtos) {
    if (!navigator.onLine || !produtos || produtos.length === 0) return;
    console.log('[Offline] Iniciando pré-carregamento de fotos de produtos em background...');
    
    // Filtra produtos que têm foto cadastrada
    const prodsComFoto = produtos.filter(p => p.temFoto && p.codigo);
    
    // Processa de 2 em 2 com um delay maior para não travar a UI nativa
    const limit = 2;
    let index = 0;

    const nextBatch = async () => {
      if (index >= prodsComFoto.length) {
        console.log('[Offline] Pré-carregamento de fotos concluído!');
        return;
      }
      const batch = prodsComFoto.slice(index, index + limit);
      index += limit;

      await Promise.all(batch.map(async (p) => {
        try {
          const absoluteUrl = `${API_BASE_URL}/api/foto-produto/${p.codigo}`;
          await this.cacheProductPhoto(p.codigo, absoluteUrl);
        } catch (e) {}
      }));

      // Maior espaçamento entre lotes para suavidade (2000ms)
      setTimeout(() => {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(nextBatch);
        } else {
          nextBatch();
        }
      }, 2000);
    };

    // Inicia após 5 segundos para deixar o app renderizar a tela inicial livre de concorrência
    setTimeout(() => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(nextBatch);
      } else {
        nextBatch();
      }
    }, 5000);
  },

  // Popula o cache de imagens em memória para renderização síncrona instantânea
  async loadPhotosToMemoryCache(produtos) {
    if (!this.db) await this.init();
    if (!produtos || produtos.length === 0) return;

    return new Promise((resolve) => {
      const transaction = this.db.transaction(['fotosCache'], 'readonly');
      const store = transaction.objectStore('fotosCache');
      
      const prodsComFoto = produtos.filter(p => p.temFoto && p.codigo);
      if (prodsComFoto.length === 0) {
        resolve();
        return;
      }

      let loaded = 0;
      prodsComFoto.forEach(p => {
        const req = store.get(p.codigo);
        req.onsuccess = () => {
          if (req.result && req.result.dataUrl) {
            this.photosMemoryCache[p.codigo] = req.result.dataUrl;
            // Atualiza dinamicamente as imagens na tela que possuem esse código
            const imgs = document.querySelectorAll(`img[data-product-code="${p.codigo}"]`);
            imgs.forEach(img => {
              img.src = req.result.dataUrl;
            });
          }
          loaded++;
          if (loaded === prodsComFoto.length) {
            resolve();
          }
        };
        req.onerror = () => {
          loaded++;
          if (loaded === prodsComFoto.length) {
            resolve();
          }
        };
      });
    });
  },

  // Retorna a URL da imagem (ou o Base64 se estiver no cache)
  getProductPhotoSrc(codigo, temFoto, fallback) {
    if (!temFoto || !codigo) return fallback;
    if (this.photosMemoryCache[codigo]) {
      return this.photosMemoryCache[codigo];
    }
    // Retorna a URL absoluta do servidor central
    return `${API_BASE_URL}/api/foto-produto/${codigo}`;
  }
};

// API Helper — Multi-URL com Fallback Inteligente
// Primário: Hostinger (produção, sempre online). Fallback: túnel Cloudflare (dev local).
const API_URLS = {
  hostinger: 'https://app2.bragodistribuidora.com.br',
  cloudflare: 'https://pearl-establishing-sat-discover.trycloudflare.com'
};

// Determina se estamos no APK/WebView ou no browser com servidor local
const _isNativeOrRemote = !!(window.Capacitor || (window.location.hostname === 'localhost' && !window.location.port));

// URL ativa — começa com Hostinger (produção estável)
let API_BASE_URL = _isNativeOrRemote ? API_URLS.hostinger : '';

// Health-check rápido na inicialização para escolher a melhor URL
(async function detectBestApiUrl() {
  if (!_isNativeOrRemote) return; // No browser local, usa '' (mesmo servidor)
  
  // 1. Tenta Hostinger primeiro (produção, sempre estável)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_URLS.hostinger}/api/ping`, { 
      signal: controller.signal,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);
    if (res.ok) {
      API_BASE_URL = API_URLS.hostinger;
      console.log('[API] ✅ Hostinger ativo. Usando:', API_BASE_URL);
      return;
    }
  } catch (e) {
    console.warn('[API] ⚠️ Hostinger indisponível, tentando Cloudflare tunnel...');
  }
  
  // 2. Hostinger falhou — tenta Cloudflare tunnel (dev local)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URLS.cloudflare}/api/ping`, { 
      signal: controller.signal,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);
    if (res.ok) {
      API_BASE_URL = API_URLS.cloudflare;
      console.log('[API] ✅ Cloudflare tunnel ativo. Usando:', API_BASE_URL);
      return;
    }
  } catch (e) {
    console.warn('[API] ⚠️ Cloudflare tunnel também indisponível.');
  }
  
  // Nenhum respondeu — mantém Hostinger como padrão
  API_BASE_URL = API_URLS.hostinger;
  console.log('[API] 🔄 Nenhum servidor respondeu. Padrão: Hostinger:', API_BASE_URL);
})();

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

function formatBakerNames(data) {
  if (!data) return data;
  const isGestao = typeof App !== 'undefined' && App.currentRoute === 'gestao';
  if (isGestao) return data;

  const getFirstName = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return fullName;
    return fullName.trim().split(/\s+/)[0];
  };

  const processVal = (val) => {
    if (!val || typeof val !== 'object') return val;

    if (Array.isArray(val)) {
      return val.map(processVal);
    }

    // Se for um objeto de padeiro (tem nome e cargo/role/codTec/cpf)
    if (val.nome && (val.cargo || val.codTec || val.role === 'padeiro' || val.hasOwnProperty('codTec') || val.hasOwnProperty('cargo'))) {
      val.nome = getFirstName(val.nome);
    }

    // Se tiver a chave padeiroNome
    if (val.padeiroNome) {
      val.padeiroNome = getFirstName(val.padeiroNome);
    }

    // Percorre todas as propriedades
    for (const key in val) {
      if (val.hasOwnProperty(key)) {
        val[key] = processVal(val[key]);
      }
    }

    return val;
  };

  try {
    return processVal(JSON.parse(JSON.stringify(data)));
  } catch (e) {
    return data;
  }
}

const API = {
  token: localStorage.getItem('brago_token'),

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('brago_token', token);
    else localStorage.removeItem('brago_token');
  },

  getUser() {
    const data = localStorage.getItem('brago_user');
    if (!data) return null;
    try {
      const user = JSON.parse(data);
      const isGestao = typeof App !== 'undefined' && App.currentRoute === 'gestao';
      if (user && user.role === 'padeiro' && !isGestao) {
        user.nome = user.nome.trim().split(/\s+/)[0];
      }
      return user;
    } catch(e) {
      return null;
    }
  },

  setUser(user) {
    if (user) localStorage.setItem('brago_user', JSON.stringify(user));
    else localStorage.removeItem('brago_user');
  },

  async request(url, options = {}) {
    const method = options.method || 'GET';
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    // Bypass imediato se estiver offline de verdade
    if (!navigator.onLine && !options.isSyncing) {
      if (method === 'GET') {
        const cached = await OfflineManager.getCachedData(url);
        if (cached) {
          console.warn('[Offline] Retornando dados do cache instantaneamente para:', url);
          return formatBakerNames(cached);
        }
      } else {
        const parsedBody = options.body ? JSON.parse(options.body) : null;
        await OfflineManager.saveRequest(url, method, parsedBody);
        try {
          await OfflineManager.updateLocalCache(url, method, parsedBody);
        } catch (cacheErr) {
          console.warn('[Offline] Erro ao atualizar cache local:', cacheErr);
        }
        return { offline: true, message: 'Salvo localmente' };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const res = await fetch(`${API_BASE_URL}${url}`, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          this.setToken(null);
          this.setUser(null);
          Components.toast('Sessão expirada ou dados inválidos.', 'error');
          App.navigate('login');
        }
        throw new APIError(data.error || data.message || data.details || 'Erro na requisição. Verifique seus dados.', res.status);
      }

      // Cache successful GET requests
      if (method === 'GET') {
        OfflineManager.cacheData(url, data);
      } else {
        // Para POST/PUT/PATCH/DELETE bem-sucedidos online, atualizar o cache local também!
        try {
          const parsedBody = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : null;
          await OfflineManager.updateLocalCache(url, method, parsedBody || data);
        } catch (cacheErr) {
          console.warn('[Offline] Erro ao atualizar cache local (online):', cacheErr);
        }
      }

      return formatBakerNames(data);
    } catch (err) {
      clearTimeout(timeoutId);
      
      // FALLBACK: Se falhou com erro de rede e temos URL alternativa, tenta ela
      const errMsg = (err.message || '').toLowerCase();
      const isNetworkError = err.name === 'AbortError' || 
                        errMsg.includes('failed') || 
                        errMsg.includes('network') || 
                        errMsg.includes('fetch') || 
                        errMsg.includes('abort') || 
                        errMsg.includes('timeout') ||
                        errMsg.includes('connect');
      
      if (isNetworkError && _isNativeOrRemote && !options._fallbackAttempted) {
        // Descobre a URL alternativa
        const altUrl = API_BASE_URL === API_URLS.cloudflare ? API_URLS.hostinger : API_URLS.cloudflare;
        console.warn(`[API] ⚠️ Servidor ${API_BASE_URL} falhou. Tentando fallback: ${altUrl}...`);
        
        try {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000); // 8s para fallback
          const fallbackRes = await fetch(`${altUrl}${url}`, { ...options, headers, signal: fallbackController.signal });
          clearTimeout(fallbackTimeout);
          
          const data = await fallbackRes.json();
          if (fallbackRes.ok) {
            // Fallback funcionou! Atualiza a URL ativa para futuras requisições
            API_BASE_URL = altUrl;
            console.log(`[API] ✅ Fallback bem-sucedido! API_BASE_URL alterada para: ${altUrl}`);
            
            if (method === 'GET') {
              OfflineManager.cacheData(url, data);
            }
            return formatBakerNames(data);
          }
          
          if (fallbackRes.status === 401) {
            this.setToken(null);
            this.setUser(null);
            Components.toast('Sessão expirada ou dados inválidos.', 'error');
            App.navigate('login');
          }
          throw new APIError(data.error || data.message || 'Erro na requisição', fallbackRes.status);
        } catch (fallbackErr) {
          console.warn('[API] ⚠️ Fallback também falhou:', fallbackErr.message);
          // Continua para a lógica offline abaixo
        }
      }

      // HANDLE OFFLINE
      const isOffline = !navigator.onLine || isNetworkError;
      
      if (isOffline) {
        if (method === 'GET') {
          const cached = await OfflineManager.getCachedData(url);
          if (cached) {
            console.warn('[Offline] Retornando dados do cache para:', url);
            return formatBakerNames(cached);
          }
        } else if (!options.isSyncing) {
          // POST/PUT/PATCH/DELETE
          const parsedBody = options.body ? JSON.parse(options.body) : null;
          await OfflineManager.saveRequest(url, method, parsedBody);
          try {
            await OfflineManager.updateLocalCache(url, method, parsedBody);
          } catch (cacheErr) {
            console.warn('[Offline] Erro ao atualizar cache local:', cacheErr);
          }
          return { offline: true, message: 'Salvo localmente' };
        }
      }
      throw err;
    }
  },

  get(url) { return this.request(url); },
  post(url, body) { return this.request(url, { method: 'POST', body: JSON.stringify(body) }); },
  put(url, body) { return this.request(url, { method: 'PUT', body: JSON.stringify(body) }); },
  patch(url, body) { return this.request(url, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(url) { return this.request(url, { method: 'DELETE' }); },

  async uploadFiles(files, type = 'producao', isSyncing = false) {
    if (!navigator.onLine && !isSyncing) {
      return OfflineManager.saveUpload(`/api/upload/${type}`, files, type);
    }

    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for uploads

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          this.setToken(null);
          this.setUser(null);
          Components.toast('Sua sessão expirou, faça login novamente.', 'error');
          if (typeof App !== 'undefined') App.navigate('login');
        }
        throw new Error(data.error || 'Erro no upload');
      }
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      const errMsg = (err.message || '').toLowerCase();
      const isNetworkError = err.name === 'AbortError' || 
                        errMsg.includes('failed') || 
                        errMsg.includes('network') || 
                        errMsg.includes('fetch') || 
                        errMsg.includes('abort') || 
                        errMsg.includes('timeout') ||
                        errMsg.includes('connect');

      // FALLBACK: Tenta URL alternativa antes de salvar offline
      if (isNetworkError && _isNativeOrRemote) {
        const altUrl = API_BASE_URL === API_URLS.cloudflare ? API_URLS.hostinger : API_URLS.cloudflare;
        console.warn(`[API Upload] ⚠️ Tentando fallback upload: ${altUrl}...`);
        try {
          const altFormData = new FormData();
          Array.from(files).forEach(f => altFormData.append('files', f));
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 60000);
          const altRes = await fetch(`${altUrl}/api/upload/${type}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` },
            body: altFormData,
            signal: fallbackController.signal
          });
          clearTimeout(fallbackTimeout);
          const altData = await altRes.json();
          if (altRes.ok) {
            API_BASE_URL = altUrl;
            console.log(`[API Upload] ✅ Fallback upload bem-sucedido! URL alterada para: ${altUrl}`);
            return altData;
          }
        } catch (fallbackErr) {
          console.warn('[API Upload] ⚠️ Fallback upload também falhou:', fallbackErr.message);
        }
      }

      if ((isNetworkError || !navigator.onLine) && !isSyncing) {
        return OfflineManager.saveUpload(`/api/upload/${type}`, files, type);
      }
      console.error("Upload error:", err);
      throw err;
    }
  },

  async uploadBase64(data, type = 'assinaturas') {
    return this.post(`/api/upload/base64/${type}`, { data });
  }
};
