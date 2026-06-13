/**
 * ARQUIVO: cronograma.tasks.js
 * CATEGORIA: Cronograma › Formulários e CRUD de tarefas
 * RESPONSABILIDADE: Abre modais, salva, edita e exclui tarefas
 * DEPENDE DE: cronograma.state.js, API, Components
 * EXPORTA: openQuickAddForm, saveQuickAdd, openTaskForm, saveTask,
 *           deleteTask, deleteAllTasks, openTaskDetail, changeTaskOrder
 */

Object.assign(Cronograma, {

  // ──────────────────────────────────────────────────────────────
  // HELPER: Gera HTML do campo de busca de cliente com dropdown
  // ──────────────────────────────────────────────────────────────
  _clienteSearchHTML(selectedId = '', selectedNome = '') {
    return `
      <div class="cliente-search-wrapper" id="cliente-search-wrapper">
        <input type="hidden" id="tarefa-cliente-id" value="${selectedId}">
        <input type="hidden" id="tarefa-cliente-nome" value="${selectedNome}">
        <div class="cliente-search-input-wrap">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class="cliente-search-field${selectedNome ? ' has-value' : ''}"
            id="tarefa-cliente-search"
            placeholder="Pesquisar cliente..."
            value="${selectedNome}"
            autocomplete="off"
          >
        </div>
        <div class="cliente-dropdown" id="cliente-dropdown"></div>
      </div>`;
  },

  // ──────────────────────────────────────────────────────────────
  // HELPER: Inicializa o comportamento interativo do campo de busca
  // ──────────────────────────────────────────────────────────────
  _initClienteSearch() {
    const clientes = this.clientes.filter(c => c.ativo !== false);
    const input    = document.getElementById('tarefa-cliente-search');
    const dropdown = document.getElementById('cliente-dropdown');
    const hiddenId  = document.getElementById('tarefa-cliente-id');
    const hiddenNome = document.getElementById('tarefa-cliente-nome');

    if (!input || !dropdown) return;

    const renderItems = (filter = '') => {
      const q = filter.trim().toLowerCase();
      const filtered = q
        ? clientes.filter(c => {
            const nome   = (c.nomeFantasia || c.nome || '').toLowerCase();
            const bairro = (c.bairro || '').toLowerCase();
            return nome.includes(q) || bairro.includes(q);
          })
        : clientes;

      if (filtered.length === 0) {
        dropdown.innerHTML = `
          <div class="cliente-dropdown-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 8px;opacity:.4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Nenhum cliente encontrado
          </div>`;
        return;
      }

      dropdown.innerHTML = filtered.map(c => {
        const nome   = c.nomeFantasia || c.nome || '';
        const bairro = c.bairro || '';
        const initials = nome.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
        const display  = nome + (bairro ? ` - ${bairro}` : '');
        const safeDisplay = display.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
          <div class="cliente-dropdown-item"
               data-id="${c.id}"
               data-nome="${safeDisplay}"
               onmousedown="Cronograma._selectCliente('${c.id}', '${safeDisplay}')">
            <div class="item-avatar">${initials || '?'}</div>
            <div class="item-info">
              <div class="item-name">${nome}</div>
              ${bairro ? `<div class="item-bairro">${bairro}</div>` : ''}
            </div>
          </div>`;
      }).join('');
    };

    // Abre o dropdown ao focar
    input.addEventListener('focus', () => {
      renderItems(input.value);
      dropdown.classList.add('open');
    });

    // Fecha ao perder foco (mousedown do item é disparado antes do blur)
    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.remove('open'), 200);
    });

    // Filtra ao digitar
    input.addEventListener('input', () => {
      // Limpa a seleção se o usuário editar manualmente
      hiddenId.value   = '';
      hiddenNome.value = '';
      input.classList.remove('has-value');
      input.classList.remove('input-error');
      renderItems(input.value);
      if (!dropdown.classList.contains('open')) dropdown.classList.add('open');
    });
  },

  // ──────────────────────────────────────────────────────────────
  // HELPER: Seleciona um cliente do dropdown
  // ──────────────────────────────────────────────────────────────
  _selectCliente(id, nome) {
    const hiddenId   = document.getElementById('tarefa-cliente-id');
    const hiddenNome = document.getElementById('tarefa-cliente-nome');
    const input      = document.getElementById('tarefa-cliente-search');
    const dropdown   = document.getElementById('cliente-dropdown');

    if (hiddenId)   hiddenId.value   = id;
    if (hiddenNome) hiddenNome.value = nome;
    if (input) {
      input.value = nome;
      input.classList.add('has-value');
      input.classList.remove('input-error');
      input.style.borderColor = '';
    }
    if (dropdown) dropdown.classList.remove('open');
  },

  // ──────────────────────────────────────────────────────────────
  // MODAL: Adicionar cliente ao cronograma (mobile/quick)
  // ──────────────────────────────────────────────────────────────
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
          ${this._clienteSearchHTML()}
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
    this._initClienteSearch();
  },

  async saveQuickAdd(padeiroId) {
    const form = document.getElementById('tarefa-form');

    // Validar cliente (campo customizado não usa checkValidity nativo)
    const clienteId   = document.getElementById('tarefa-cliente-id')?.value?.trim();
    const clienteNome = document.getElementById('tarefa-cliente-nome')?.value?.trim();
    if (!clienteId) {
      const field = document.getElementById('tarefa-cliente-search');
      if (field) field.classList.add('input-error');
      Components.toast('Selecione um cliente da lista.', 'error');
      return;
    }

    const fd   = new FormData(form);
    const body = Object.fromEntries(fd);
    body.clienteId   = clienteId;
    body.clienteNome = clienteNome;

    const padeiro = this.padeiros.find(p => p.id === padeiroId);
    if (padeiro) {
      body.padeiroNome = padeiro.nome;
      body.codTec      = padeiro.codTec;
    }

    try {
      const criada = await API.post('/api/cronograma', body);
      this.tarefas.push(criada);
      Components.closeModal();
      Components.toast('Cliente adicionado!', 'success');
      this.renderSemanal();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  // ──────────────────────────────────────────────────────────────
  // MODAL: Nova / Editar Tarefa (formulário completo)
  // ──────────────────────────────────────────────────────────────
  openTaskForm(id, preDate) {
    const t = id ? this.tarefas.find(x => x.id === id) : {};
    const isEdit = !!id;
    const defaultDate = preDate || t.data || new Date().toISOString().split('T')[0];

    const isDesktop = window.innerWidth >= 768;
    let contentHtml, footerHtml;

    if (isDesktop) {
      contentHtml = `
        <form id="tarefa-form" class="premium-desktop-form">
          <div class="p-bento-container">
            <div class="p-bento-col">
              <div class="p-bento-card">
                <h4 class="p-bento-title"><i data-lucide="user"></i> Responsáveis</h4>
                <div class="p-form-group">
                  <label>Padeiro</label>
                  <select class="p-input" name="padeiroId" id="tarefa-padeiro" required>
                    <option value="">Selecione o padeiro...</option>
                    ${this.padeiros.filter(p => p.ativo).map(p =>
                      `<option value="${p.id}" data-nome="${p.nome}" data-cod="${p.codTec}" ${t.padeiroId === p.id ? 'selected' : ''}>${p.nome} — COD ${p.codTec}</option>`
                    ).join('')}
                  </select>
                </div>
                <div class="p-form-group">
                  <label>Cliente</label>
                  ${this._clienteSearchHTML(t.clienteId || '', t.clienteNome || '')}
                </div>
                <div class="p-form-group" style="margin-top: 4px;">
                  <label>Status</label>
                  <select class="p-input" name="status">
                    <option value="pendente" ${(!t.status || t.status === 'pendente') ? 'selected' : ''}>Pendente</option>
                    <option value="em_andamento" ${t.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
                    <option value="concluida" ${t.status === 'concluida' ? 'selected' : ''}>Concluída</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="p-bento-col">
              <div class="p-bento-card">
                <h4 class="p-bento-title"><i data-lucide="calendar-clock"></i> Agendamento</h4>
                <div class="p-form-row">
                  <div class="p-form-group">
                    <label>Data</label>
                    <input class="p-input" type="date" name="data" value="${defaultDate}" required>
                  </div>
                  <div class="p-form-group">
                    <label>T. Mínimo (min)</label>
                    <input class="p-input" type="number" name="tempoMinimoMinutos" value="${t.tempoMinimoMinutos || 0}" min="0">
                  </div>
                </div>
                <div class="p-form-row">
                  <div class="p-form-group">
                    <label>Início</label>
                    <input class="p-input" type="time" name="horario" value="${t.horario || ''}">
                  </div>
                  <div class="p-form-group">
                    <label>Término</label>
                    <input class="p-input" type="time" name="horarioFim" value="${t.horarioFim || ''}">
                  </div>
                </div>
              </div>
              
              <div class="p-bento-card">
                <h4 class="p-bento-title"><i data-lucide="align-left"></i> Observação</h4>
                <div class="p-form-group" style="margin-bottom:0;">
                  <textarea class="p-input" name="observacao" rows="2" placeholder="Notas sobre a tarefa...">${t.observacao || ''}</textarea>
                </div>
              </div>
            </div>
          </div>
        </form>
      `;
      footerHtml = `
        ${isEdit ? `<button type="button" class="btn-premium-danger" onclick="Cronograma.deleteTask('${id}')">Excluir</button>` : ''}
        <button type="button" class="btn-premium-secondary" onclick="Components.closeModal()">Cancelar</button>
        <button type="button" class="btn-premium-primary" onclick="Cronograma.saveTask('${id || ''}')">Salvar Tarefa</button>
      `;
    } else {
      contentHtml = `
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
            ${this._clienteSearchHTML(t.clienteId || '', t.clienteNome || '')}
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
        </form>
      `;
      footerHtml = `
        ${isEdit ? `<button type="button" class="btn btn-outline" style="color:var(--danger);border-color:var(--danger);" onclick="Cronograma.deleteTask('${id}')" style="margin-right:auto">Excluir</button>` : ''}
        <button type="button" class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="Cronograma.saveTask('${id || ''}')">Salvar</button>
      `;
    }

    Components.showModal(isEdit ? 'Editar Tarefa' : 'Nova Tarefa', contentHtml, footerHtml, isDesktop ? 'premium-task-modal' : 'cronograma-task-modal');
    Components.renderIcons();
    this._initClienteSearch();
    
    if (window.HigPopovers) {
      setTimeout(() => HigPopovers.init(), 50);
    }
  },

  async saveTask(id) {
    const form = document.getElementById('tarefa-form');
    if (!form.checkValidity()) return form.reportValidity();

    // Validar cliente (campo customizado)
    const clienteId   = document.getElementById('tarefa-cliente-id')?.value?.trim();
    const clienteNome = document.getElementById('tarefa-cliente-nome')?.value?.trim();
    if (!clienteId) {
      const field = document.getElementById('tarefa-cliente-search');
      if (field) field.classList.add('input-error');
      Components.toast('Selecione um cliente da lista.', 'error');
      return;
    }

    const fd   = new FormData(form);
    const body = Object.fromEntries(fd);
    body.clienteId   = clienteId;
    body.clienteNome = clienteNome;

    const padeiroSel = document.getElementById('tarefa-padeiro');
    if (padeiroSel && padeiroSel.selectedIndex > 0) {
      const opt = padeiroSel.options[padeiroSel.selectedIndex];
      body.padeiroNome = opt.dataset.nome;
      body.codTec      = opt.dataset.cod;
    }

    try {
      if (id) {
        const atualizada = await API.put(`/api/cronograma/${id}`, body);
        const index = this.tarefas.findIndex(t => t.id === id);
        if (index !== -1) this.tarefas[index] = atualizada;
      }
      else {
        const criada = await API.post('/api/cronograma', body);
        this.tarefas.push(criada);
      }
      Components.closeModal();
      Components.toast(id ? 'Tarefa atualizada!' : 'Tarefa criada!', 'success');
      this.renderSemanal();
    } catch (e) { Components.toast(e.message, 'error'); }
  },

  // ──────────────────────────────────────────────────────────────
  // Excluir tarefa
  // ──────────────────────────────────────────────────────────────
  async deleteTask(id) {
    if (confirm('Excluir esta tarefa?')) {
      try {
        await API.delete(`/api/cronograma/${id}`);
        Components.closeModal();
        Components.toast('Tarefa excluída.', 'success');
        
        // Optimistically update local tasks list and render weekly view without page reload
        this.tarefas = this.tarefas.filter(t => t.id !== id);
        this.renderSemanal();
      } catch (e) { Components.toast(e.message, 'error'); }
    }
  },

  // ──────────────────────────────────────────────────────────────
  // Excluir todo o cronograma
  // ──────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────
  // Exportar para PDF
  // ──────────────────────────────────────────────────────────────
  exportToPDF() {
    Components.toast('Preparando documento para impressão...', 'info');
    
    // Pegar as datas da semana atual
    const weekDates = this.getWeekDates();
    const startDate = new Date(weekDates[0] + 'T12:00:00');
    const endDate = new Date(weekDates[5] + 'T12:00:00');
    
    const formatDate = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace(' de ', ' de ').replace('.', '');
    const dataRangeStr = `${formatDate(startDate)} — ${formatDate(endDate)}`;
    
    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const generatedAt = `${today.toLocaleDateString('pt-BR')} ${today.toLocaleTimeString('pt-BR')}`;
    const filenameTitle = `Cronograma_Fornada_${weekDates[0]}_a_${weekDates[5]}`;
    
    // Iniciar HTML
    let html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${filenameTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          @page { size: A4 landscape; margin: 10mm 15mm; }
          body { 
            font-family: 'Inter', system-ui, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-top { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 25px; }
          .header-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px;}
          .brand h1 { margin: 0; font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.5px; }
          .brand p { margin: 4px 0 0; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .title-area { text-align: right; }
          .title-area h2 { margin: 0; font-size: 16px; font-weight: 800; color: #111827; }
          .title-area .date-range { margin: 4px 0 0; font-size: 12px; font-weight: 700; color: #ea580c; }
          .title-area .generated { margin: 4px 0 0; font-size: 9px; color: #9ca3af; }
          
          table { width: 100%; border-collapse: collapse; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; }
          th, td { border: 1px solid #e5e7eb; padding: 12px 8px; text-align: center; }
          th { padding-top: 14px; padding-bottom: 14px; border-top: none; }
          .th-tech { width: 160px; text-align: left; padding-left: 16px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; border-left: none; }
          .th-day { width: 110px; border-top: none; }
          th:last-child, td:last-child { border-right: none; }
          td:first-child { border-left: none; }
          
          .day-name { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
          .day-number { font-size: 18px; font-weight: 700; color: #9ca3af; }
          .day-today .day-number { color: #111827; }
          .day-today .day-name { color: #111827; }
          .today-badge { font-size: 8px; font-weight: 800; color: #9ca3af; text-transform: uppercase; margin-top: 4px; }
          
          .tech-cell { text-align: left; padding-left: 16px; display: flex; align-items: center; gap: 10px; }
          .tech-avatar { font-size: 12px; font-weight: 800; color: #111827; }
          .tech-info { display: flex; flex-direction: column; }
          .tech-name { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 2px;}
          .tech-cod { font-size: 9px; font-weight: 800; color: #ea580c; }
          
          .task-cell { vertical-align: top; padding: 6px; position: relative; }
          .empty-cell { color: #d1d5db; display: flex; align-items: center; justify-content: center; height: 100%; min-height: 40px;}
          
          .task-item { text-align: left; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px; margin-bottom: 4px; border-left: 3px solid #3b82f6; page-break-inside: avoid;}
          .task-item.status-concluida { border-left-color: #10b981; }
          .task-item.status-pendente { border-left-color: #f59e0b; }
          .task-client { font-size: 9px; font-weight: 700; color: #111827; line-height: 1.2; margin-bottom: 2px;}
          .task-time { font-size: 8px; font-weight: 600; color: #6b7280; display: flex; align-items: center; gap: 3px;}
        </style>
      </head>
      <body>
        <div class="header-top">
          <div>Cronograma</div>
          <div>${todayStr}</div>
        </div>
        
        <div class="header-main">
          <div class="brand">
            <h1>FORNADA</h1>
            <p>SISTEMA DE GESTÃO DE PANIFICAÇÃO</p>
          </div>
          <div class="title-area">
            <h2>Cronograma de Operações</h2>
            <div class="date-range">${dataRangeStr}</div>
            <div class="generated">Gerado em: ${generatedAt}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="th-tech">Técnico</th>
    `;
    
    // Colunas dos dias
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const todayISO = new Date().toISOString().split('T')[0];
    
    weekDates.forEach((dateStr, i) => {
      const d = new Date(dateStr + 'T12:00:00');
      const isToday = dateStr === todayISO;
      html += `
        <th class="th-day ${isToday ? 'day-today' : ''}">
          <div class="day-name">${dayNames[i]}</div>
          <div class="day-number">${d.getDate()}</div>
          ${isToday ? '<div class="today-badge">HOJE</div>' : ''}
        </th>
      `;
    });
    
    html += `
            </tr>
          </thead>
          <tbody>
    `;
    
    // Linhas dos padeiros
    this.padeiros.forEach(padeiro => {
      const init = padeiro.nome.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
      html += `
        <tr>
          <td>
            <div class="tech-cell">
              <div class="tech-avatar">${init}</div>
              <div class="tech-info">
                <span class="tech-name">${padeiro.nome}</span>
                <span class="tech-cod">COD ${padeiro.codTec || '000000'}</span>
              </div>
            </div>
          </td>
      `;
      
      weekDates.forEach(dateStr => {
        const tasks = this.tarefas
          .filter(t => t.padeiroId === padeiro.id && t.data === dateStr)
          .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));
          
        html += `<td class="task-cell">`;
        if (tasks.length === 0) {
          html += `<div class="empty-cell">—</div>`;
        } else {
          tasks.forEach(t => {
            html += `
              <div class="task-item status-${t.status || 'pendente'}">
                <div class="task-client">${t.clienteNome || 'Sem Cliente'}</div>
                <div class="task-time">
                  ${t.horario || '--:--'}
                </div>
              </div>
            `;
          });
        }
        html += `</td>`;
      });
      
      html += `</tr>`;
    });
    
    html += `
          </tbody>
        </table>
        
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;
    
    // Create an invisible iframe to print
    let printFrame = document.getElementById('print-frame');
    if (printFrame) {
      printFrame.remove();
    }
    
    printFrame = document.createElement('iframe');
    printFrame.id = 'print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);
    
    printFrame.contentWindow.document.open();
    printFrame.contentWindow.document.write(html);
    printFrame.contentWindow.document.close();
  },

  // ──────────────────────────────────────────────────────────────
  // MODAL: Detalhe da Tarefa (somente leitura)
  // ──────────────────────────────────────────────────────────────
  openTaskDetail(id) {
    const t = this.tarefas.find(x => x.id === id);
    if (!t) return;
    const padeiro = this.padeiros.find(p => p.id === t.padeiroId);
    let statusClass = 'badge-blue';
    let statusText  = 'Pendente';
    if (t.status === 'concluida')    { statusClass = 'badge-success'; statusText = 'Concluída'; }
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
        <button class="btn btn-outline" style="color:var(--primary); border-color:var(--primary);" onclick="Cronograma.openDuplicateTaskToDaysModal('${id}')">Duplicar p/ Dias</button>
        <button class="btn btn-primary" onclick="Components.closeModal();Cronograma.openTaskForm('${id}')">Editar Tarefa</button>`
    );
    Components.renderIcons();
  },

  // ──────────────────────────────────────────────────────────────
  // Reordenar tarefas
  // ──────────────────────────────────────────────────────────────
  async changeTaskOrder(taskId, direction) {
    const task = this.tarefas.find(t => t.id === taskId);
    if (!task) return;

    const siblings = this.tarefas
      .filter(t => t.data === task.data && t.padeiroId === task.padeiroId)
      .sort((a, b) => (a.posicao || 0) - (b.posicao || 0));

    const currentIndex = siblings.findIndex(t => t.id === taskId);
    const targetIndex  = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetTask = siblings[targetIndex];

    // Swap positions
    const oldPos = task.posicao || 0;
    const newPos = targetTask.posicao || 0;

    // If both are 0, assign proper indexes first
    if (oldPos === newPos) {
      siblings.forEach((t, i) => t.posicao = i * 10);
      task.posicao = siblings.findIndex(t => t.id === taskId) * 10;
      const targetSibling = siblings[siblings.findIndex(t => t.id === taskId) + direction];

      const temp = task.posicao;
      task.posicao = targetSibling.posicao;
      targetSibling.posicao = temp;

      await Promise.all(siblings.map(t => API.put(`/api/cronograma/${t.id}`, { posicao: t.posicao })));
    } else {
      task.posicao       = newPos;
      targetTask.posicao = oldPos;

      await Promise.all([
        API.put(`/api/cronograma/${task.id}`,       { posicao: task.posicao }),
        API.put(`/api/cronograma/${targetTask.id}`, { posicao: targetTask.posicao }),
      ]);
    }

    this.renderSemanal();
  },

  openDuplicateTaskToDaysModal(id) {
    const t = this.tarefas.find(x => x.id === id);
    if (!t) return;

    const dates = this.getWeekDates();
    const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    Components.showModal('Duplicar para outros dias', `
      <div style="margin-bottom: 16px; font-size:14px; line-height:1.5;">
        Duplicar a tarefa de <b>${t.clienteNome}</b> para os seguintes dias desta semana:
      </div>
      <form id="duplicate-days-form" style="display:flex; flex-direction:column; gap:10px;">
        ${dates.map((date, idx) => {
          const dateStr = date.toISOString().split('T')[0];
          const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const isCurrentDay = t.data === dateStr;
          return `
            <label style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--system-bg); border-radius:10px; cursor:${isCurrentDay ? 'not-allowed' : 'pointer'}; opacity:${isCurrentDay ? 0.6 : 1}">
              <input type="checkbox" name="selectedDates" value="${dateStr}" ${isCurrentDay ? 'disabled' : ''} style="width:20px; height:20px; accent-color:var(--primary);">
              <div>
                <span style="font-weight:600;">${dayLabels[idx]}</span>
                <span style="color:var(--text-tertiary); font-size:12px; margin-left:4px;">${formattedDate}</span>
              </div>
            </label>
          `;
        }).join('')}
      </form>
    `, `
      <button class="btn btn-secondary" onclick="Cronograma.openTaskDetail('${id}')">Voltar</button>
      <button class="btn btn-primary" onclick="Cronograma.duplicateTaskToDays('${id}')">Duplicar</button>
    `);
    Components.renderIcons();
  },

  async duplicateTaskToDays(id) {
    const t = this.tarefas.find(x => x.id === id);
    if (!t) return;

    const checkedBoxes = document.querySelectorAll('#duplicate-days-form input[name="selectedDates"]:checked');
    if (checkedBoxes.length === 0) {
      Components.toast('Selecione ao menos um dia para duplicar.', 'warning');
      return;
    }

    const selectedDates = Array.from(checkedBoxes).map(cb => cb.value);
    
    try {
      const criadas = await Promise.all(selectedDates.map(date => {
        const novaTarefa = {
          clienteId:   t.clienteId,
          clienteNome: t.clienteNome,
          padeiroId:   t.padeiroId,
          padeiroNome: t.padeiroNome,
          codTec:      t.codTec,
          data:        date,
          horario:     t.horario,
          horarioFim:  t.horarioFim,
          status:      'pendente',
          posicao:     t.posicao || 0,
          observacao:  t.observacao ? `[Cópia] ${t.observacao}` : '[Cópia]'
        };
        return API.post('/api/cronograma', novaTarefa);
      }));

      this.tarefas.push(...criadas);

      Components.closeModal();
      Components.toast('Tarefa duplicada com sucesso!', 'success');
      this.renderSemanal();
    } catch (e) {
      Components.toast('Erro ao duplicar tarefa: ' + e.message, 'error');
    }
  },
});
