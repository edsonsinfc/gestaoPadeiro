/**
 * ARQUIVO: cronograma.tasks.js
 * CATEGORIA: Cronograma › Formulários e CRUD de tarefas
 * RESPONSABILIDADE: Abre modais, salva, edita e exclui tarefas
 * DEPENDE DE: cronograma.state.js, API, Components
 * EXPORTA: openQuickAddForm, saveQuickAdd, openTaskForm, saveTask,
 *           deleteTask, deleteAllTasks, openTaskDetail, changeTaskOrder
 */

Object.assign(Cronograma, {
  openQuickAddForm(dateStr, padeiroId) {
    const padeiro = this.padeiros.find(p => p.id === padeiroId);
    
    Components.showModal('Adicionar Cliente', `
      <form id="tarefa-form">
        <div class="form-group" style="background: var(--system-bg); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
          <div class="avatar" style="width:36px;height:36px;font-size:13px;background:var(--primary);flex-shrink:0;">${padeiro ? padeiro.nome.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
          <div>
            <div style="font-weight:600;font-size:14px;">${padeiro ? padeiro.nome.split(' ').slice(0,2).join(' ') : '—'}</div>
            <div style="font-size:11px;font-family:monospace;color:var(--text-tertiary);">COD ${padeiro ? padeiro.codTec : '—'} • ${new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
          </div>
          <input type="hidden" name="padeiroId" value="${padeiroId}">
          <input type="hidden" name="data" value="${dateStr}">
        </div>
        <div class="form-group">
          <label>Cliente</label>
          <select class="input-control" name="clienteId" id="tarefa-cliente" required style="padding-left: 16px;">
            <option value="">Selecione o cliente...</option>
            ${this.clientes.filter(c => c.ativo !== false).map(c =>
              `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`
            ).join('')}
          </select>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full">
            <label>Início</label>
            <input class="input-control" type="time" name="horario" value="08:00" style="padding-left: 16px;">
          </div>
          <div class="form-group w-full">
            <label>Término</label>
            <input class="input-control" type="time" name="horarioFim" value="17:00" style="padding-left: 16px;">
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="input-control" name="status" style="padding-left: 16px;">
            <option value="pendente" selected>Pendente</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
        <div class="form-group">
          <label>Observação</label>
          <textarea class="input-control" name="observacao" rows="2" placeholder="Observações..." style="padding-left: 16px;"></textarea>
        </div>
      </form>`,
      `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Cronograma.saveQuickAdd('${padeiroId}')"><i data-lucide="plus"></i> Adicionar</button>`
    );
    Components.renderIcons();
  },

  async saveQuickAdd(padeiroId) {
    const form = document.getElementById('tarefa-form');
    if (!form.checkValidity()) return form.reportValidity();

    const fd = new FormData(form);
    const body = Object.fromEntries(fd);

    const padeiro = this.padeiros.find(p => p.id === padeiroId);
    if (padeiro) {
      body.padeiroNome = padeiro.nome;
      body.codTec = padeiro.codTec;
    }

    const clienteSel = document.getElementById('tarefa-cliente');
    if (clienteSel && clienteSel.selectedIndex > 0) {
      body.clienteNome = clienteSel.options[clienteSel.selectedIndex].dataset.nome;
    }

    try {
      await API.post('/api/cronograma', body);
      Components.closeModal();
      Components.toast('Cliente adicionado!', 'success');
      await this.render();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  openTaskForm(id, preDate) {
    const t = id ? this.tarefas.find(x => x.id === id) : {};
    const isEdit = !!id;
    const defaultDate = preDate || t.data || new Date().toISOString().split('T')[0];

    Components.showModal(isEdit ? 'Editar Tarefa' : 'Nova Tarefa', `
      <form id="tarefa-form">
        <div class="form-group">
          <label>Padeiro</label>
          <select class="input-control" name="padeiroId" id="tarefa-padeiro" required style="padding-left: 16px;">
            <option value="">Selecione o padeiro...</option>
            ${this.padeiros.filter(p => p.ativo).map(p => 
              `<option value="${p.id}" data-nome="${p.nome}" data-cod="${p.codTec}" ${t.padeiroId === p.id ? 'selected' : ''}>${p.nome} — COD ${p.codTec}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Cliente</label>
          <select class="input-control" name="clienteId" id="tarefa-cliente" required style="padding-left: 16px;">
            <option value="">Selecione o cliente...</option>
            ${this.clientes.filter(c => c.ativo !== false).map(c => 
              `<option value="${c.id}" data-nome="${c.nome}" ${t.clienteId === c.id ? 'selected' : ''}>${c.nome}</option>`
            ).join('')}
          </select>
        </div>
        <div class="flex gap-4">
          <div class="form-group w-full">
            <label>Data</label>
            <input class="input-control" type="date" name="data" value="${defaultDate}" required style="padding-left: 16px;">
          </div>
          <div class="form-group w-full">
            <label>Início</label>
            <input class="input-control" type="time" name="horario" value="${t.horario || ''}" style="padding-left: 16px;">
          </div>
          <div class="form-group w-full">
            <label>Término</label>
            <input class="input-control" type="time" name="horarioFim" value="${t.horarioFim || ''}" style="padding-left: 16px;">
          </div>
          <div class="form-group w-full">
            <label>Tempo Mínimo (min)</label>
            <input class="input-control" type="number" name="tempoMinimoMinutos" value="${t.tempoMinimoMinutos || 0}" min="0" style="padding-left: 16px;">
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select class="input-control" name="status" style="padding-left: 16px;">
            <option value="pendente" ${(!t.status || t.status === 'pendente') ? 'selected' : ''}>Pendente</option>
            <option value="em_andamento" ${t.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="concluida" ${t.status === 'concluida' ? 'selected' : ''}>Concluída</option>
          </select>
        </div>
        <div class="form-group">
          <label>Observação</label>
          <textarea class="input-control" name="observacao" rows="3" placeholder="Observações..." style="padding-left: 16px;">${t.observacao || ''}</textarea>
        </div>
      </form>`,
      `${isEdit ? `<button class="btn btn-outline" style="color:var(--danger);border-color:var(--danger);" onclick="Cronograma.deleteTask('${id}')" style="margin-right:auto">Excluir</button>` : ''}
       <button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
       <button class="btn btn-primary" onclick="Cronograma.saveTask('${id || ''}')">Salvar</button>`
    );
    Components.renderIcons();
  },

  async saveTask(id) {
    const form = document.getElementById('tarefa-form');
    if (!form.checkValidity()) return form.reportValidity();
    
    const fd = new FormData(form);
    const body = Object.fromEntries(fd);

    const padeiroSel = document.getElementById('tarefa-padeiro');
    const clienteSel = document.getElementById('tarefa-cliente');
    if (padeiroSel.selectedIndex > 0) {
      const opt = padeiroSel.options[padeiroSel.selectedIndex];
      body.padeiroNome = opt.dataset.nome;
      body.codTec = opt.dataset.cod;
    }
    if (clienteSel.selectedIndex > 0) {
      body.clienteNome = clienteSel.options[clienteSel.selectedIndex].dataset.nome;
    }

    try {
      if (id) await API.put(`/api/cronograma/${id}`, body);
      else await API.post('/api/cronograma', body);
      Components.closeModal();
      Components.toast(id ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
      await this.render();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  async deleteTask(id) {
    if (confirm('Excluir esta tarefa?')) {
      try {
        await API.delete(`/api/cronograma/${id}`);
        Components.closeModal();
        Components.toast('Tarefa excluída.', 'success');
        await Cronograma.render();
      } catch (e) { Components.toast(e.message, 'error'); }
    }
  },

  async deleteAllTasks() {
    if (confirm('ATENÇÃO: Você está prestes a excluir TODO o cronograma. Esta ação não pode ser desfeita. Deseja continuar?')) {
      try {
        await API.delete('/api/cronograma/all');
        Components.toast('Cronograma totalmente limpo!', 'success');
        await this.render();
      } catch (e) {
        Components.toast('Erro ao limpar cronograma: ' + e.message, 'error');
      }
    }
  },

  openTaskDetail(id) {
    const t = this.tarefas.find(x => x.id === id);
    if (!t) return;
    const padeiro = this.padeiros.find(p => p.id === t.padeiroId);
    let statusClass = 'badge-blue';
    let statusText = 'Pendente';
    if (t.status === 'concluida') { statusClass = 'badge-success'; statusText = 'Concluída'; }
    if (t.status === 'em_andamento') { statusClass = 'badge-primary'; statusText = 'Andamento'; }

    Components.showModal('Detalhes da Tarefa', `
      <div class="flex items-center gap-4 mb-6 p-4" style="background:var(--system-bg); border-radius:12px;">
        <div class="avatar" style="width:48px;height:48px;font-size:16px;background:var(--primary);">
          ${padeiro ? padeiro.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
        </div>
        <div class="flex-1">
          <div style="font-weight:700;font-size:17px;">${padeiro ? padeiro.nome : t.padeiroNome || '—'}</div>
          <div class="text-primary" style="font-family:monospace;font-size:13px;font-weight:600;">COD ${padeiro ? padeiro.codTec : t.codTec || '—'}</div>
        </div>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:14px;">
        <div>
          <div class="text-secondary mb-1" style="font-size:12px;">Cliente</div>
          <div style="font-weight:500; display:flex; align-items:center; gap:6px;"><i data-lucide="store" size="14" class="text-tertiary"></i> ${t.clienteNome || '—'}</div>
        </div>
        <div>
          <div class="text-secondary mb-1" style="font-size:12px;">Data</div>
          <div style="font-weight:500; display:flex; align-items:center; gap:6px;"><i data-lucide="calendar" size="14" class="text-tertiary"></i> ${t.data ? new Date(t.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</div>
        </div>
        <div>
          <div class="text-secondary mb-1" style="font-size:12px;">Horário</div>
          <div style="font-weight:500; display:flex; align-items:center; gap:6px;">
            <i data-lucide="clock" size="14" class="text-tertiary"></i>
            ${t.horario ? t.horario : 'Não definido'}${t.horario ? ` <span style="color:var(--text-tertiary);margin:0 4px;">→</span> ${t.horarioFim || '17:00'}` : ''}
          </div>
        </div>
        <div>
          <div class="text-secondary mb-1" style="font-size:12px;">Cargo</div>
          <div style="font-weight:500;">${padeiro ? padeiro.cargo : '—'}</div>
        </div>
      </div>
      
      ${t.observacao ? `
        <div class="mt-6 p-4" style="background:var(--system-bg); border-radius:12px;">
          <div class="text-secondary mb-1" style="font-size:12px;">Observações</div>
          <div style="font-size:14px;line-height:1.5;">${t.observacao}</div>
        </div>` : ''}
    `, `<button class="btn btn-secondary" onclick="Components.closeModal()">Fechar</button>
        <button class="btn btn-primary" onclick="Components.closeModal();Cronograma.openTaskForm('${id}')">Editar Tarefa</button>`
    );
    Components.renderIcons();
  },

  async changeTaskOrder(taskId, direction) {
    const task = this.tarefas.find(t => t.id === taskId);
    if (!task) return;

    const siblings = this.tarefas
      .filter(t => t.data === task.data && t.padeiroId === task.padeiroId)
      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

    const currentIndex = siblings.findIndex(t => t.id === taskId);
    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetTask = siblings[targetIndex];

    // Swap positions
    const oldPos = task.posicao || 0;
    const newPos = targetTask.posicao || 0;

    // If both are 0, we need to assign proper indexes first
    if (oldPos === newPos) {
      siblings.forEach((t, i) => t.posicao = i * 10);
      task.posicao = siblings.findIndex(t => t.id === taskId) * 10;
      const targetSibling = siblings[siblings.findIndex(t => t.id === taskId) + direction];
      
      const temp = task.posicao;
      task.posicao = targetSibling.posicao;
      targetSibling.posicao = temp;
      
      // Save all siblings that changed
      await Promise.all(siblings.map(t => API.put(`/api/cronograma/${t.id}`, { posicao: t.posicao })));
    } else {
      task.posicao = newPos;
      targetTask.posicao = oldPos;
      
      // Save both
      await Promise.all([
        API.put(`/api/cronograma/${task.id}`, { posicao: task.posicao }),
        API.put(`/api/cronograma/${targetTask.id}`, { posicao: targetTask.posicao })
      ]);
    }

    this.renderSemanal();
  },
});
