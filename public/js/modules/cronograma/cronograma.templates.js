/**
 * ARQUIVO: cronograma.templates.js
 * CATEGORIA: Cronograma › Templates
 * RESPONSABILIDADE: Lida com salvar e carregar templates de semanas do cronograma
 * DEPENDE DE: cronograma.state.js, API, Components
 */

Object.assign(Cronograma, {
  async openSaveTemplateModal() {
    const modalContent = `
      <div class="form-group">
        <label>Nome do Template</label>
        <input type="text" id="template-nome" class="input-control" style="padding-left: 16px;" placeholder="Ex: Semana Padrão, Alta Demanda" required>
      </div>
      <div class="form-group mt-3">
        <label>Descrição (Opcional)</label>
        <textarea id="template-desc" class="input-control" style="padding-left: 16px;" placeholder="Breve descrição deste padrão"></textarea>
      </div>
      <p class="text-secondary mt-3" style="font-size: 12px;">
        As tarefas atuais desta semana (semana ${this.weekOffset === 0 ? 'atual' : this.weekOffset}) serão salvas como um padrão. As datas serão ignoradas e apenas o "Dia da Semana" e "Horário" serão preservados.
      </p>
    `;

    Components.showModal('Salvar como Template', modalContent, `
      <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="Cronograma.saveTemplate()">Salvar Template</button>
    `);
  },

  async saveTemplate() {
    const nome = document.getElementById('template-nome').value.trim();
    const descricao = document.getElementById('template-desc').value.trim();

    if (!nome) {
      alert('Por favor, informe um nome para o template.');
      return;
    }

    let btn = null;
    let originalText = '';
    try {
      btn = document.querySelector('#global-modal .btn-primary') || 
            document.querySelector('.modal-footer .btn-primary') || 
            (typeof event !== 'undefined' && event && event.target ? event.target.closest('button') : null);
      
      originalText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></div> Salvando...';
        btn.disabled = true;
      }

      await API.post('/api/cronograma/templates', {
        nome,
        descricao,
        semana: this.weekOffset
      });

      Components.closeModal();
      alert('Template salvo com sucesso!');
    } catch (e) {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
      alert('Erro ao salvar template: ' + e.message);
    }
  },

  async openLoadTemplateModal() {
    Components.showModal('Carregar Template', '<div class="spinner mx-auto my-4"></div>', `
      <button class="btn btn-outline" onclick="Components.closeModal()">Cancelar</button>
    `);

    try {
      const templates = await API.get('/api/cronograma/templates');
      
      if (templates.length === 0) {
        document.querySelector('.modal-body').innerHTML = `
          <div class="empty-state text-center py-4">
            <i data-lucide="folder-open" size="48" style="color:var(--text-tertiary);margin-bottom:16px;"></i>
            <h4 class="mb-2">Nenhum template salvo</h4>
            <p class="text-secondary">Você ainda não salvou nenhum template. Use o botão "Salvar Template" para criar um padrão a partir da semana atual.</p>
          </div>
        `;
        Components.renderIcons();
        return;
      }

      const listHtml = templates.map(t => `
        <div class="template-card mb-3 p-3 rounded" style="border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600; font-size: 15px;">${t.nome}</div>
            ${t.descricao ? `<div class="text-secondary mt-1" style="font-size: 13px;">${t.descricao}</div>` : ''}
            <div class="text-tertiary mt-1" style="font-size: 11px;">Criado por ${t.criadoPor || 'Admin'}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-icon text-danger" onclick="Cronograma.deleteTemplate('${t.id}')" title="Excluir">
              <i data-lucide="trash-2"></i>
            </button>
            <button class="btn btn-primary" onclick="Cronograma.loadTemplate('${t.id}', '${t.nome}')">
              Carregar
            </button>
          </div>
        </div>
      `).join('');

      document.querySelector('.modal-body').innerHTML = `
        <div class="mb-3">
          <p class="text-secondary" style="font-size: 13px;">
            Escolha um template abaixo para carregar as tarefas na semana atual da visualização (semana ${this.weekOffset === 0 ? 'atual' : this.weekOffset > 0 ? '+' + this.weekOffset : this.weekOffset}).
          </p>
        </div>
        <div class="templates-list" style="max-height: 300px; overflow-y: auto;">
          ${listHtml}
        </div>
      `;
      Components.renderIcons();
    } catch (e) {
      document.querySelector('.modal-body').innerHTML = `<div class="toast error">Erro ao carregar templates: ${e.message}</div>`;
    }
  },

  async loadTemplate(id, nome) {
    if (!confirm(`Tem certeza que deseja aplicar o template "${nome}" nesta semana?\nIsso adicionará as tarefas programadas no template aos dias da semana corrente da sua visualização.`)) {
      return;
    }

    try {
      const btn = event.target.closest('button');
      if (btn) {
        btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff;"></div>';
        btn.disabled = true;
      }

      await API.post(`/api/cronograma/templates/${id}/load`, {
        semana: this.weekOffset
      });

      Components.closeModal();
      this.render(); // Recarrega todas as tarefas
    } catch (e) {
      alert('Erro ao carregar template: ' + e.message);
      if (btn) {
        btn.innerHTML = 'Carregar';
        btn.disabled = false;
      }
    }
  },

  async deleteTemplate(id) {
    if (!confirm('Deseja realmente excluir este template?')) return;
    
    try {
      const btn = event.target.closest('button');
      if (btn) {
        btn.disabled = true;
      }
      
      await API.delete(`/api/cronograma/templates/${id}`);
      this.openLoadTemplateModal(); // Recarrega a lista
    } catch (e) {
      alert('Erro ao excluir: ' + e.message);
      if (btn) {
        btn.disabled = false;
      }
    }
  }
});
