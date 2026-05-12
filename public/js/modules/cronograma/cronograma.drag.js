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
    
    const newDate      = cell.dataset.date;
    const newPadeiroId = cell.dataset.padeiroId;
    const newPadeiroNome = cell.dataset.padeiroNome;
    const newPadeiroCod  = cell.dataset.padeiroCod;
    
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
    task.data        = newDate;
    task.padeiroId   = newPadeiroId;
    task.padeiroNome = newPadeiroNome;
    task.codTec      = newPadeiroCod;
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
        clienteId:   task.clienteId,
        clienteNome: task.clienteNome,
        padeiroId:   newPadeiroId,
        padeiroNome: newPadeiroNome,
        codTec:      newPadeiroCod,
        data:        newDate,
        horario:     task.horario,
        horarioFim:  task.horarioFim,
        status:      'pendente',
        posicao:     targetPos || 0,
        observacao:  task.observacao ? `[Cópia] ${task.observacao}` : '[Cópia]'
      };
      const criada = await API.post('/api/cronograma', novaTarefa);
      this.tarefas.push(criada);
      this.renderSemanal();
      Components.toast(`📎 Duplicado para ${newPadeiroNome.split(' ')[0]}!`, 'success');
    } catch (err) {
      Components.toast('Erro ao duplicar: ' + err.message, 'error');
    }
  },
});
