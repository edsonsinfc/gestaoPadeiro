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

  // Confirm dialog
  confirm(message, onConfirm) {
    this.showModal('Confirmação', `<p style="margin-bottom:8px">${message}</p>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-danger" onclick="Components.closeModal();(${onConfirm.toString()})()">Confirmar</button>`
    );
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
  dbVersion: 2, // Incremented version for new stores
  db: null,

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
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => resolve(null);
    });
  },

  async saveRequest(url, method, body) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingRequests'], 'readwrite');
      const store = transaction.objectStore('pendingRequests');
      const request = store.add({ url, method, body, timestamp: Date.now() });
      request.onsuccess = () => {
        Components.toast('Modo Offline: Alteração salva localmente!', 'info');
        resolve();
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Suporte para Upload de Arquivos Offline
  async saveUpload(url, files, type) {
    if (!this.db) await this.init();
    // Convert files to Array of objects with Blobs
    const fileData = await Promise.all(Array.from(files).map(async f => ({
      name: f.name,
      type: f.type,
      blob: f
    })));

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
      const store = transaction.objectStore('pendingUploads');
      const request = store.add({ url, fileData, type, timestamp: Date.now() });
      request.onsuccess = () => {
        Components.toast('Modo Offline: Arquivos salvos para envio posterior!', 'info');
        resolve({ offline: true, files: fileData.map(f => ({ name: f.name, offline: true })) });
      };
      request.onerror = (e) => reject(e.target.error);
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
    const transaction = this.db.transaction(['pendingRequests'], 'readwrite');
    const store = transaction.objectStore('pendingRequests');
    store.delete(id);
  },

  async deleteUpload(id) {
    const transaction = this.db.transaction(['pendingUploads'], 'readwrite');
    const store = transaction.objectStore('pendingUploads');
    store.delete(id);
  },

  startSyncCheck() {
    window.addEventListener('online', () => {
      Components.toast('Conexão restabelecida! Sincronizando dados...', 'success');
      this.syncPending();
    });
    // Check periodically anyway
    setInterval(() => {
      if (navigator.onLine) this.syncPending();
    }, 60000);
  },

  async syncPending() {
    // Sync Requests
    const pending = await this.getPendingRequests();
    for (const req of pending) {
      try {
        await API.request(req.url, { 
          method: req.method, 
          body: JSON.stringify(req.body),
          isSyncing: true 
        });
        await this.deleteRequest(req.id);
      } catch (err) {
        console.error(`[Offline] Falha ao sincronizar requisição ${req.id}:`, err);
      }
    }

    // Sync Uploads
    const uploads = await this.getPendingUploads();
    for (const up of uploads) {
      try {
        const files = up.fileData.map(f => new File([f.blob], f.name, { type: f.type }));
        await API.uploadFiles(files, up.type, true);
        await this.deleteUpload(up.id);
      } catch (err) {
        console.error(`[Offline] Falha ao sincronizar upload ${up.id}:`, err);
      }
    }

    if (pending.length > 0 || uploads.length > 0) {
      Components.toast('Sincronização concluída!', 'success');
      // Trigger a refresh if needed
      if (typeof App !== 'undefined' && App.currentRoute) {
        App.renderPage(App.currentRoute);
      }
    }
  }
};

// API Helper
const API = {
  token: localStorage.getItem('brago_token'),

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('brago_token', token);
    else localStorage.removeItem('brago_token');
  },

  getUser() {
    const data = localStorage.getItem('brago_user');
    return data ? JSON.parse(data) : null;
  },

  setUser(user) {
    if (user) localStorage.setItem('brago_user', JSON.stringify(user));
    else localStorage.removeItem('brago_user');
  },

  async request(url, options = {}) {
    const method = options.method || 'GET';
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    try {
      const res = await fetch(url, { ...options, headers });
      
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          this.setToken(null);
          this.setUser(null);
          Components.toast('Sessão expirada ou dados inválidos.', 'error');
          App.navigate('login');
        }
        throw new Error(data.message || data.error || 'Erro na requisição. Verifique seus dados.');
      }

      // Cache successful GET requests
      if (method === 'GET') {
        OfflineManager.cacheData(url, data);
      }

      return data;
    } catch (err) {
      // HANDLE OFFLINE
      const isOffline = !navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('Network error');
      
      if (isOffline) {
        if (method === 'GET') {
          const cached = await OfflineManager.getCachedData(url);
          if (cached) {
            console.warn('[Offline] Retornando dados do cache para:', url);
            return cached;
          }
        } else if (!options.isSyncing) {
          // POST/PUT/PATCH/DELETE
          await OfflineManager.saveRequest(url, method, options.body ? JSON.parse(options.body) : null);
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
    try {
      const res = await fetch(`/api/upload/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      return data;
    } catch (err) {
      if (!navigator.onLine && !isSyncing) {
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
