---
name: smart-gestor-design
description: |
  Guia e Manual do Design System do SmartGestor (Brago Distribuidora).
  Use quando precisar criar novas interfaces, ajustar estilos,
  ou criar modais, pop-ups, mini pop-ups e animações seguindo o padrão
  premium do sistema (Apple HIG & Bento UI).
  Contém códigos prontos de CSS e templates HTML/JS para copiar e colar.
---

# 🎨 SmartGestor — Manual & Guia do Design System

Este guia contém os padrões visuais, tokens de design, micro-animações, modais (pop-ups), alertas e toasts do SmartGestor da Brago Distribuidora. Use os blocos de código abaixo para manter a consistência visual em novas telas ou ajustes.

---

## 1. Design Tokens (Variáveis CSS)

### 1.1 Cores e Estilos Gerais (`public/css/variables.css`)
```css
:root {
  /* Brago Design System - Premium Light Palette */
  --primary: #1E4BFF;       /* Brago Blue */
  --primary-dark: #1032CC;
  --primary-light: rgba(30, 75, 255, 0.08);
  --accent: #E8450A;        /* Brago Orange */
  
  --bg-main: #F7F8FA;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F9FAFB;
  --bg-input: #F3F4F6;
  
  --text-main: #111827;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  
  --success: #10B981;
  --error: #EF4444;
  --warning: #F59E0B;
  --info: #3B82F6;
  
  --glass: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(0, 0, 0, 0.05);
  --glass-glow: rgba(30, 75, 255, 0.1);
  
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  --font-main: 'Inter', 'Outfit', sans-serif;
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 1.2 Paleta Apple HIG Desktop (`public/css/hig-desktop.css`)
```css
:root {
  --hig-font: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --hig-bg-primary: #FFFFFF;
  --hig-bg-secondary: rgba(246, 246, 246, 0.92);
  --hig-bg-tertiary: #F5F5F7;
  --hig-bg-card: #FFFFFF;

  /* Labels */
  --hig-label-primary: #1C1C1E;
  --hig-label-secondary: #6C6C70;
  --hig-label-tertiary: #AEAEB2;

  /* System Colors */
  --hig-system-blue: #007AFF;
  --hig-system-green: #34C759;
  --hig-system-orange: #FF9500;
  --hig-system-red: #FF3B30;
  --hig-system-yellow: #FFCC00;

  /* Fills e Sombras */
  --hig-fill-blue: rgba(0, 122, 255, 0.10);
  --hig-radius-lg: 14px;
  --hig-shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.05);
}
```

---

## 2. Elementos Básicos (Buttons & Inputs)

### 2.1 Botões Premium e Entradas (`public/css/components.css`)
```css
/* Glassmorphism Card */
.glass-card {
  background: var(--glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition: var(--transition);
}
.glass-card:hover {
  border-color: var(--primary-light);
  box-shadow: 0 0 20px var(--glass-glow);
}

/* Botão Principal */
.btn-premium {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #FFFFFF !important;
  font-weight: 600;
  padding: 0.8rem 1.5rem;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  box-shadow: 0 4px 15px rgba(30, 75, 255, 0.2);
  cursor: pointer;
  transition: var(--transition);
}
.btn-premium:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(30, 75, 255, 0.35);
  filter: brightness(1.1);
}

/* Botão Secundário */
.btn-secondary {
  background: var(--bg-card-hover);
  color: var(--text-main);
  border: 1px solid var(--glass-border);
  padding: 0.8rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}
.btn-secondary:hover {
  background: var(--bg-input);
  border-color: var(--text-muted);
}

/* Input Premium */
.input-premium {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 0.8rem 1rem;
  color: var(--text-main);
  transition: var(--transition);
}
.input-premium:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--glass-glow);
}
```

---

## 3. Pop-ups (Modais)

### 3.1 Modal Global (Desktop & Padrão)
O modal global é acionado em `Components.showModal(title, contentHtml, footerHtml, customClass)`.

#### Estrutura CSS (`public/css/styles.css`)
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.modal-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.modal-content {
  background-color: var(--surface-bg, #FFFFFF);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  transform: scale(0.95);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-overlay.active .modal-content {
  transform: scale(1);
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 0.5px solid var(--separator, rgba(0, 0, 0, 0.08));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 0.5px solid var(--separator, rgba(0, 0, 0, 0.08));
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

#### Código JS para Controle (`public/js/components.js`)
```javascript
// Exibir Modal
Components.showModal(
  "Título do Pop-up", 
  `<p>Este é o corpo do pop-up.</p>`, 
  `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
   <button class="btn btn-primary" onclick="salvarAcao()">Confirmar</button>`
);

// Fechar Modal
Components.closeModal();
```

---

### 3.2 Modal do Cronograma / Criar Tarefa (Exemplo de Bento UI)
Formulário bento de alta fidelidade visual usado para criar ou editar tarefas no desktop.

#### Código HTML/JS Gerador (`public/js/modules/cronograma/cronograma.tasks.js`)
```javascript
const isDesktop = window.innerWidth >= 768;

const contentHtml = `
  <form id="tarefa-form" class="premium-desktop-form">
    <div class="p-bento-container">
      <!-- Coluna 1: Responsáveis -->
      <div class="p-bento-col">
        <div class="p-bento-card">
          <h4 class="p-bento-title"><i data-lucide="user"></i> Responsáveis</h4>
          <div class="p-form-group">
            <label>Padeiro</label>
            <select class="p-input" name="padeiroId" id="tarefa-padeiro" required>
              <option value="">Selecione o padeiro...</option>
              <!-- Options dinâmicos -->
            </select>
          </div>
          <div class="p-form-group">
            <label>Cliente</label>
            <input type="text" class="p-input" id="tarefa-cliente-search" placeholder="Buscar cliente...">
          </div>
          <div class="p-form-group">
            <label>Status</label>
            <select class="p-input" name="status">
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Coluna 2: Agendamento -->
      <div class="p-bento-col">
        <div class="p-bento-card">
          <h4 class="p-bento-title"><i data-lucide="calendar-clock"></i> Agendamento</h4>
          <div class="p-form-row">
            <div class="p-form-group">
              <label>Data</label>
              <input class="p-input" type="date" name="data" required>
            </div>
            <div class="p-form-group">
              <label>Tempo Mínimo (min)</label>
              <input class="p-input" type="number" name="tempoMinimoMinutos" value="0">
            </div>
          </div>
          <div class="p-form-row">
            <div class="p-form-group">
              <label>Início</label>
              <input class="p-input" type="time" name="horario">
            </div>
            <div class="p-form-group">
              <label>Término</label>
              <input class="p-input" type="time" name="horarioFim">
            </div>
          </div>
        </div>
        
        <div class="p-bento-card">
          <h4 class="p-bento-title"><i data-lucide="align-left"></i> Observação</h4>
          <div class="p-form-group" style="margin-bottom:0;">
            <textarea class="p-input" name="observacao" rows="2" placeholder="Notas sobre a tarefa..."></textarea>
          </div>
        </div>
      </div>
    </div>
  </form>
`;

const footerHtml = `
  <button type="button" class="btn-premium-secondary" onclick="Components.closeModal()">Cancelar</button>
  <button type="button" class="btn-premium-primary" onclick="Cronograma.saveTask()">Salvar Tarefa</button>
`;

Components.showModal('Nova Tarefa', contentHtml, footerHtml, 'premium-task-modal');
```

#### Estilos CSS Bento UI (`public/css/hig-desktop.css`)
```css
/* Modal Estilo Premium */
.premium-task-modal {
  max-width: 860px !important;
  width: 100%;
  background: var(--hig-bg-tertiary) !important;
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.6) !important;
  padding: 0 !important;
}

.premium-task-modal .modal-header {
  padding: 24px 32px 20px !important;
  border-bottom: none !important;
  background: var(--hig-bg-tertiary);
}

.premium-task-modal .modal-title {
  font-size: 22px !important;
  font-weight: 700 !important;
  letter-spacing: -0.5px !important;
  color: var(--hig-label-primary) !important;
}

.premium-task-modal .modal-body {
  padding: 0 32px 8px !important;
  background: var(--hig-bg-tertiary);
}

/* Bento Grid Layout */
.premium-desktop-form .p-bento-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.premium-desktop-form .p-bento-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.premium-desktop-form .p-bento-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.03);
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-desktop-form .p-bento-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.08);
}

.premium-desktop-form .p-bento-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--hig-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-top: 0;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Inputs e Elementos Bento */
.premium-desktop-form .p-form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.premium-desktop-form .p-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.premium-desktop-form .p-input {
  background: var(--hig-bg-tertiary);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--hig-label-primary);
  transition: all 0.2s ease;
  outline: none;
  width: 100%;
}

.premium-desktop-form .p-input:focus {
  background: #ffffff;
  border-color: var(--hig-system-blue);
  box-shadow: 0 0 0 4px var(--hig-fill-blue);
}

/* Footer & Buttons */
.premium-task-modal .modal-footer {
  background: var(--hig-bg-tertiary) !important;
  border-top: none !important;
  padding: 16px 32px 32px !important;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.premium-task-modal .btn-premium-primary {
  background: var(--hig-system-blue);
  color: #fff;
  border-radius: 14px;
  padding: 12px 28px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 16px -4px var(--hig-fill-blue);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.premium-task-modal .btn-premium-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -4px rgba(0, 122, 255, 0.3);
}

.premium-task-modal .btn-premium-secondary {
  background: #ffffff;
  color: var(--hig-label-primary);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.premium-task-modal .btn-premium-danger {
  background: transparent;
  color: var(--hig-system-red);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 14px;
  padding: 12px 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
```

---

### 3.3 Modal Mobile (iOS Style bottom sheet)
Desliza de baixo para cima. Usado na parte operacional do padeiro (`padeiro-flow.js`).

#### Estrutura CSS (`public/css/padeiro-flow.css`)
```css
.pf-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9999999 !important;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.pf-modal-overlay.active {
  opacity: 1;
  pointer-events: auto;
}

.pf-modal-ios {
  width: 100%;
  height: 92vh;
  background: #f8f9fa;
  border-radius: 32px 32px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pf-modal-overlay.active .pf-modal-ios {
  transform: translateY(0);
}

.pf-modal-ios-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 20px;
}

.pf-modal-ios-back {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1f4cff;
  border: none;
}
```

---

## 4. Mini Pop-ups (Toasts & Alertas)

### 4.1 Toasts (Notificações Rápidas)
Aparecem no canto superior direito e somem automaticamente.

#### Código CSS (`public/css/styles.css`)
```css
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toast {
  background-color: var(--surface-bg, #FFFFFF);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  border-left: 4px solid var(--primary, #1E4BFF);
}

.toast.success { border-left-color: var(--success, #10B981); }
.toast.error { border-left-color: var(--error, #EF4444); }

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

#### Código JS (`public/js/components.js`)
```javascript
Components.toast("Sucesso ao salvar!", "success");
Components.toast("Erro no servidor.", "error");
Components.toast("Processando dados...", "info");
```

---

### 4.2 Apple HIG Style Alert (Caixa de Confirmação Rígida)
Pop-up central, limpo, estilo iOS nativo.

#### Código JS/CSS Inline (`public/js/components.js`)
```javascript
Components.showAlert("Permissão Necessária", "Ative o GPS para prosseguir.");
```

---

### 4.3 Banner Flutuante de Instalação do APK
Popup flutuante de instalação do App no estilo Apple HIG.

#### Código CSS (`public/css/components.css`)
```css
.apk-install-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(120%);
  z-index: 99999;
  width: calc(100% - 32px);
  max-width: 380px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
  pointer-events: none;
}

.apk-install-banner.active {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
  pointer-events: auto;
}
```

---

## 5. Animações e Efeitos

### 5.1 Efeitos de Transição e Hover (`public/css/animations.css`)
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.animate-fade {
  animation: fadeIn 0.5s ease-out forwards;
}

/* Efeito Elevação no Hover */
.hover-lift:hover {
  transform: translateY(-4px);
}

/* Efeito Glow / Brilho suave */
.hover-glow:hover {
  box-shadow: 0 0 15px var(--glass-glow);
}
```

### 5.2 Cascata Escalonada (Carga Staggered)
Aplica delay automático de acordo com a variável `--index` dos elementos filhos.
```css
@keyframes cascadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.cascade-item {
  opacity: 0;
  animation: cascadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--index, 0) * 0.08s);
}
```
*Uso no HTML:*
```html
<div class="cascade-item" style="--index: 1">Primeiro Item</div>
<div class="cascade-item" style="--index: 2">Segundo Item</div>
```
