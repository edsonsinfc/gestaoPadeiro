/**
 * ARQUIVO: cronograma.drag.js
 * CATEGORIA: Cronograma › Drag and Drop
 * RESPONSABILIDADE: Gerencia arrastar e soltar tarefas entre células
 * DEPENDE DE: cronograma.state.js, cronograma.render.js, API, Components
 * EXPORTA: onDragStart, onDragEnd, onDragOver, onDragOverTask,
 *           onDragEnter, onDragLeave, onDropTask, onDrop,
 *           handleDrop, selectMdAction, executeMdAction,
 *           _confirmMove, _confirmDuplicate
 */

Object.assign(Cronograma, {
  onDragStart(e, taskId) {
    this.draggedTaskId = taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    e.target.style.opacity = '0.5';
  },
  onDragEnd(e) {
    this.draggedTaskId = null;
    e.target.style.opacity = '1';
  },
  onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
  onDragOverTask(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-target-top');
  },
  onDragEnter(e) {
    e.preventDefault();
    if (e.currentTarget.classList.contains('matrix-cell')) {
      e.currentTarget.classList.add('drag-over');
    }
  },
  onDragLeave(e) {
    if (e.currentTarget.classList.contains('matrix-cell')) {
      e.currentTarget.classList.remove('drag-over');
    }
    if (e.currentTarget.classList.contains('matrix-task-card')) {
      e.currentTarget.classList.remove('drag-target-top');
    }
  },
  async onDropTask(e, targetTaskId) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-target-top');

    const cell = e.currentTarget.closest('.matrix-cell');
    await this.handleDrop(e, cell, targetTaskId);
  },
  async onDrop(e) {
    e.preventDefault();
    const cell = e.currentTarget;
    await this.handleDrop(e, cell, null);
  },

  async handleDrop(e, cell, targetTaskId) {
    if (cell.classList.contains('matrix-cell')) {
      cell.classList.remove('drag-over');
    }

    const newDate = cell.dataset.date;
    const newPadeiroId = cell.dataset.padeiroId;
    const newPadeiroNome = cell.dataset.padeiroNome;
    const newPadeiroCod = cell.dataset.padeiroCod;

    const taskId = e.dataTransfer.getData('text/plain') || this.draggedTaskId;
    if (!taskId || !newDate || !newPadeiroId) return;

    const task = this.tarefas.find(t => t.id === taskId);
    if (!task) return;

    let targetPos = 0;
    const siblings = this.tarefas
      .filter(t => t.data === newDate && t.padeiroId === newPadeiroId && t.id !== taskId)
      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

    if (targetTaskId) {
      const targetTask = this.tarefas.find(t => t.id === targetTaskId);
      targetPos = (targetTask.posicao || 0) - 1;
    } else {
      targetPos = siblings.length > 0 ? (siblings[siblings.length - 1].posicao || 0) + 10 : 0;
    }

    if (task.padeiroId !== newPadeiroId) {
      this.selectedMdAction = 'mover';
      const padeiroOrigNome = task.padeiroNome || task.padeiro || 'padeiro original';
      const dataFmt = new Date(newDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

      Components.showModal(
        '',
        `<div class="md-modal-header">
          <h3 class="md-modal-title">Mover ou Duplicar?</h3>
          <button class="md-modal-close" onclick="Components.closeModal()"><i data-lucide="x" size="18"></i></button>
        </div>
        <div class="md-modal-divider"></div>

        <div class="md-info-card">
          <div class="md-info-icon"><i data-lucide="clipboard-list" size="20" style="color:#D94F1E;"></i></div>
          <div class="md-info-content">
            <div class="md-info-client">${task.clienteNome || 'Cliente'}</div>
            <div class="md-info-route">
              <b>De:</b> ${padeiroOrigNome}<br>
              <b>Para:</b> ${newPadeiroNome}
            </div>
            <div class="md-info-date-badge">
               • ${dataFmt}
            </div>
          </div>
        </div>

        <div class="md-action-grid">
          <div id="md-card-mover" class="md-action-card mover selected" onclick="Cronograma.selectMdAction('mover')">
            <div class="md-action-icon"><i data-lucide="external-link" size="20"></i></div>
            <div class="md-action-name">Mover</div>
            <div class="md-action-desc">Remove do padeiro original</div>
          </div>
          <div id="md-card-duplicar" class="md-action-card duplicar" onclick="Cronograma.selectMdAction('duplicar')">
            <div class="md-action-icon"><i data-lucide="copy" size="20"></i></div>
            <div class="md-action-name">Duplicar</div>
            <div class="md-action-desc">Mantém no padeiro original</div>
          </div>
        </div>

        <div class="md-modal-footer">
          <button class="md-btn-cancel" onclick="Components.closeModal()">Cancelar</button>
          <button class="md-btn-confirm" onclick="Cronograma.executeMdAction('${taskId}','${newDate}','${newPadeiroId}','${newPadeiroNome}','${newPadeiroCod}', ${targetPos})">Confirmar</button>
        </div>`,
        null,
        'md-modal-container'
      );

      const modalHeader = document.querySelector('#global-modal .modal-header');
      if (modalHeader) modalHeader.style.display = 'none';

      Components.renderIcons();
      return;
    }

    await this._confirmMove(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos);
  },

  selectMdAction(action) {
    this.selectedMdAction = action;
    document.querySelectorAll('.md-action-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.md-action-card.${action}`).classList.add('selected');
  },

  async executeMdAction(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos) {
    if (this.selectedMdAction === 'mover') {
      await this._confirmMove(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos);
    } else {
      await this._confirmDuplicate(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos);
    }
  },

  async _confirmMove(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos) {
    Components.closeModal();
    const task = this.tarefas.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic
    task.data = newDate;
    task.padeiroId = newPadeiroId;
    task.padeiroNome = newPadeiroNome;
    task.codTec = newPadeiroCod;
    if (targetPos !== undefined) task.posicao = targetPos;

    // Re-normalize all positions in that cell to keep them clean
    const cellTasks = this.tarefas
      .filter(t => t.data === newDate && t.padeiroId === newPadeiroId)
      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

    cellTasks.forEach((t, i) => t.posicao = i * 10);

    this.renderSemanal();

    try {
      // Save all positions to keep sync
      await Promise.all(cellTasks.map(t => API.put(`/api/cronograma/${t.id}`, {
        data: t.data,
        padeiroId: t.padeiroId,
        padeiroNome: t.padeiroNome,
        codTec: t.codTec,
        posicao: t.posicao
      })));
      Components.toast('✅ Atualizado!', 'success');
    } catch (err) {
      Components.toast('Erro ao mover: ' + err.message, 'error');
      await this.render();
    }
  },

  async _confirmDuplicate(taskId, newDate, newPadeiroId, newPadeiroNome, newPadeiroCod, targetPos) {
    Components.closeModal();
    const task = this.tarefas.find(t => t.id === taskId);
    if (!task) return;

    try {
      const novaTarefa = {
        clienteId: task.clienteId,
        clienteNome: task.clienteNome,
        padeiroId: newPadeiroId,
        padeiroNome: newPadeiroNome,
        codTec: newPadeiroCod,
        data: newDate,
        horario: task.horario,
        horarioFim: task.horarioFim,
        status: 'pendente',
        posicao: targetPos || 0,
        observacao: task.observacao ? `[Cópia] ${task.observacao}` : '[Cópia]'
      };
      const criada = await API.post('/api/cronograma', novaTarefa);
      this.tarefas.push(criada);
      this.renderSemanal();
      Components.toast(`📎 Duplicado para ${newPadeiroNome.split(' ')[0]}!`, 'success');
    } catch (err) {
      Components.toast('Erro ao duplicar: ' + err.message, 'error');
    }
  },

  onTouchStart(e, taskId) {
    if (e.target.closest('.reorder-btn, button, a')) return;

    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;
    this.draggedTaskId = taskId;
    this.touchStartCard = e.currentTarget;
    this.isLongPressActive = false;

    // Disable native HTML5 drag on touch to prevent iOS/Android native drag from hijacking the touch events
    if (this.touchStartCard.hasAttribute('draggable')) {
      this.touchStartCard.setAttribute('draggable', 'false');
    }

    // Clear any previous timeout
    if (this.longPressTimeout) clearTimeout(this.longPressTimeout);

    // Feedback visual imediato de "pressionado"
    this.touchStartCard.style.transform = 'scale(0.98)';
    this.touchStartCard.style.transition = 'transform 0.2s';

    // Start long press detection (150ms)
    this.longPressTimeout = setTimeout(() => {
      this.isLongPressActive = true;

      // Tactile vibration feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch (e) { }
      }

      // Feedback na tela para o usuário (e para nós sabermos que o timeout rodou)
      Components.toast('Card arrastado!', 'success');

      // Get viewport bounding box of the card
      const rect = this.touchStartCard.getBoundingClientRect();
      this.touchOffsetX = this.lastTouchX - rect.left;
      this.touchOffsetY = this.lastTouchY - rect.top;

      // Create drag ghost card for elevated "suspended" feedback
      this.dragGhost = this.touchStartCard.cloneNode(true);
      const reorder = this.dragGhost.querySelector('.matrix-reorder-btns');
      if (reorder) reorder.remove();

      Object.assign(this.dragGhost.style, {
        position: 'fixed',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: '2147483647',
        pointerEvents: 'none',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        transform: 'scale(1.05) rotate(2.5deg)',
        opacity: '1',
        transition: 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
        backgroundColor: '#ffffff',
        border: '3px solid #1C7EF2',
        borderRadius: '12px',
        margin: '0',
        boxSizing: 'border-box',
        userSelect: 'none',
        webkitUserSelect: 'none',
        webkitTouchCallout: 'none'
      });

      document.body.appendChild(this.dragGhost);
      this.touchStartCard.style.opacity = '0.35';
      this.lastTouchTarget = null;

      // Travar rolagem da página enquanto arrasta
      document.body.style.overflow = 'hidden';
    }, 250); // 250ms hold threshold
  },

  onTouchMove(e) {
    if (!this.draggedTaskId || !this.touchStartCard) return;

    const touch = e.touches[0];
    this.lastTouchX = touch.clientX;
    this.lastTouchY = touch.clientY;

    if (!this.isLongPressActive) {
      return; // Do not prevent scrolling or translate if drag isn't active yet
    }

    if (e.cancelable) {
      e.preventDefault(); // Prevent page scrolling during active drag
    }

    if (this.dragGhost) {
      const x = touch.clientX - this.touchOffsetX;
      const y = touch.clientY - this.touchOffsetY;
      this.dragGhost.style.left = `${x}px`;
      this.dragGhost.style.top = `${y}px`;
    }

    // Handle horizontal auto-scrolling when dragging near screen edges
    const scrollContainer = this.touchStartCard.closest('.days-scroll-mobile');
    if (scrollContainer) {
      const rect = scrollContainer.getBoundingClientRect();
      const edgeThreshold = 50; // pixels from edge
      if (touch.clientX > rect.right - edgeThreshold || touch.clientX < rect.left + edgeThreshold) {
        this.startAutoScroll(scrollContainer);
      } else {
        this.stopAutoScroll();
      }
    }

    // We must temporarily hide the ghost to reliably find the element underneath
    // because some mobile browsers ignore pointer-events: none for touch
    let prevDisplay = '';
    if (this.dragGhost) {
      prevDisplay = this.dragGhost.style.display || 'block';
      this.dragGhost.style.display = 'none';
    }

    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);

    if (this.dragGhost) {
      this.dragGhost.style.display = prevDisplay;
    }

    if (!targetElement) return;

    const cell = targetElement.closest('.day-column-mobile, .matrix-cell');
    const taskCard = targetElement.closest('.matrix-task-card');

    document.querySelectorAll('.drag-over, .drag-target-top').forEach(el => {
      if (el !== cell && el !== taskCard) {
        el.classList.remove('drag-over', 'drag-target-top');
      }
    });

    if (taskCard && taskCard.dataset.taskId !== this.draggedTaskId) {
      taskCard.classList.add('drag-target-top');
      this.lastTouchTarget = { type: 'task', id: taskCard.dataset.taskId, element: taskCard };
    } else if (cell) {
      cell.classList.add('drag-over');
      this.lastTouchTarget = { type: 'cell', element: cell };
    }
  },

  async onTouchEnd(e) {
    this.stopAutoScroll();

    if (this.longPressTimeout) clearTimeout(this.longPressTimeout);

    const wasDrag = this.isLongPressActive;
    const currentTaskId = this.draggedTaskId;

    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    if (this.touchStartCard) {
      this.touchStartCard.style.opacity = '1';
      this.touchStartCard.style.transform = '';
      this.touchStartCard.setAttribute('draggable', 'true');
    }

    document.body.style.overflow = '';

    document.querySelectorAll('.drag-over, .drag-target-top').forEach(el => {
      el.classList.remove('drag-over', 'drag-target-top');
    });

    this.lastTouchX = null;
    this.lastTouchY = null;
    this.isLongPressActive = false;

    // If it was NOT a drag (i.e. just a simple tap), open details modal
    if (!wasDrag && currentTaskId) {
      this.draggedTaskId = null;
      this.touchStartCard = null;
      this.lastTouchTarget = null;
      Cronograma.openTaskDetail(currentTaskId);
      return;
    }

    if (!this.draggedTaskId) return;

    if (this.lastTouchTarget) {
      const { type, id, element } = this.lastTouchTarget;
      let cell = null;
      let targetTaskId = null;

      if (type === 'task') {
        targetTaskId = id;
        cell = element.closest('.day-column-mobile, .matrix-cell');
      } else if (type === 'cell') {
        cell = element;
      }

      if (cell) {
        const mockEvent = {
          preventDefault: () => { },
          stopPropagation: () => { },
          dataTransfer: {
            getData: () => this.draggedTaskId
          }
        };

        await this.handleDrop(mockEvent, cell, targetTaskId);
      }
    }

    this.draggedTaskId = null;
    this.touchStartCard = null;
    this.lastTouchTarget = null;
  },

  startAutoScroll(scrollContainer) {
    if (this.autoScrollInterval) return;

    const rect = scrollContainer.getBoundingClientRect();
    const edgeThreshold = 50;

    this.autoScrollInterval = setInterval(() => {
      if (!this.draggedTaskId || !this.lastTouchX) {
        this.stopAutoScroll();
        return;
      }

      const x = this.lastTouchX;
      if (x > rect.right - edgeThreshold) {
        scrollContainer.scrollLeft += 12; // Scroll right
      } else if (x < rect.left + edgeThreshold) {
        scrollContainer.scrollLeft -= 12; // Scroll left
      } else {
        this.stopAutoScroll();
      }
    }, 25);
  },

  stopAutoScroll() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
  }
});
