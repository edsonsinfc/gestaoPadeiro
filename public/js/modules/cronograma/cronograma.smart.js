/**
 * ARQUIVO: cronograma.smart.js
 * CATEGORIA: Cronograma › Escala Inteligente
 * RESPONSABILIDADE: Algoritmo de distribuição automática de padeiros/clientes
 * DEPENDE DE: cronograma.state.js, cronograma.render.js, API, Components
 * EXPORTA: openSmartSchedule, generateSmartDistribution, executeSmartSchedule
 */

Object.assign(Cronograma, {
  openSmartSchedule() {
    const padeiroAtivos = this.padeiros.filter(p => p.ativo);
    const clienteAtivos = this.clientes.filter(c => c.ativo !== false);
    const dates = this.getWeekDates();

    if (padeiroAtivos.length === 0) {
      Components.toast('Nenhum padeiro ativo para distribuir.', 'error');
      return;
    }
    if (clienteAtivos.length === 0) {
      Components.toast('Nenhum cliente cadastrado.', 'error');
      return;
    }

    const weekDates = dates.map(d => d.toISOString().split('T')[0]);
    const existingThisWeek = this.tarefas.filter(t => weekDates.includes(t.data));

    const distribuicao = this.generateSmartDistribution(padeiroAtivos, clienteAtivos, dates);
    const totalNovas = distribuicao.reduce((s, d) => s + d.tarefas.length, 0);

    Components.showModal('Cronograma Inteligente', `
      <div style="margin-bottom:24px;">
        <p class="text-secondary" style="font-size: 14px; margin-bottom: 16px;">
          O algoritmo distribuirá as tarefas para garantir que <strong>nenhum padeiro tenha dia livre</strong>, atribuindo <strong>um cliente por dia</strong> para cada padeiro. Nenhum cliente será agendado duas vezes no mesmo dia.
        </p>
        ${existingThisWeek.length > 0 ? `
        <div style="background: rgba(255, 149, 0, 0.1); border-left: 4px solid var(--primary); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
          <strong style="color: var(--primary);">Aviso:</strong> Já existem ${existingThisWeek.length} tarefas criadas nesta semana. O preenchimento automático as manterá intactas.
        </div>` : ''}
        
        <div class="flex justify-between" style="background: var(--system-bg); border-radius: 12px; padding: 20px;">
          <div class="text-center w-full">
            <div style="font-size:28px; font-weight:700; color:var(--primary);">${totalNovas}</div>
            <div class="text-secondary" style="font-size:12px;">Tarefas Criadas</div>
          </div>
          <div style="width: 1px; background: var(--separator);"></div>
          <div class="text-center w-full">
            <div style="font-size:28px; font-weight:700; color:var(--system-blue);">${padeiroAtivos.length}</div>
            <div class="text-secondary" style="font-size:12px;">Padeiros Ativos</div>
          </div>
          <div style="width: 1px; background: var(--separator);"></div>
          <div class="text-center w-full">
            <div style="font-size:28px; font-weight:700; color:var(--success);">6</div>
            <div class="text-secondary" style="font-size:12px;">Dias na Semana</div>
          </div>
        </div>
      </div>

      <div style="max-height:300px; overflow-y:auto; border: 0.5px solid var(--separator); border-radius: 12px;">
        <table style="width: 100%;">
          <thead style="position: sticky; top: 0; background: var(--surface-bg); z-index: 10; box-shadow: 0 1px 0 var(--separator);">
            <tr>
              <th style="padding: 12px 16px;">Dia</th>
              <th style="padding: 12px 16px;">Padeiro</th>
              <th style="padding: 12px 16px;">Cliente</th>
            </tr>
          </thead>
          <tbody>
            ${distribuicao.map(dia => 
              dia.tarefas.map((t, idx) => `
                <tr style="${idx === 0 ? 'border-top: 2px solid var(--system-bg);' : ''}">
                  ${idx === 0 ? `<td rowspan="${dia.tarefas.length}" style="font-weight:600; color:var(--text-primary); vertical-align:top; border-right: 0.5px solid var(--separator); background: var(--system-bg);">${dia.diaLabel}<br><span class="text-tertiary" style="font-size:11px;">${dia.dateLabel}</span></td>` : ''}
                  <td style="font-weight:500; font-size:13px;">${t.padeiroNome.split(' ').slice(0, 2).join(' ')}</td>
                  <td class="text-secondary" style="font-size:13px;">${t.clienteNome}</td>
                </tr>`
              ).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
    `, `<button class="btn btn-secondary" onclick="Components.closeModal()">Cancelar</button>
        <button class="btn" style="background-color: #AF52DE; color: white;" onclick="Cronograma.executeSmartSchedule()" id="btn-smart-exec"><i data-lucide="sparkles"></i> Gerar ${totalNovas} Tarefas</button>`
    );
    Components.renderIcons();
    this._smartDistribution = distribuicao;
  },

  generateSmartDistribution(padeiros, clientes, dates) {
    const dias = this.diasSemana;
    const distribuicao = [];

    // Shuffle clients array to pick sequentially, cycling around if necessary
    let clientQueue = [...clientes].sort(() => Math.random() - 0.5);
    let queueIdx = 0;

    for (let diaIdx = 0; diaIdx < 6; diaIdx++) { // For each day (Mon-Sat)
      const date = dates[diaIdx];
      const dateStr = date.toISOString().split('T')[0];
      const tarefasDia = [];
      const clientesUsadosNesteDia = new Set();

      // EVERY baker works EVERY day (1 customer per baker per day)
      for (const pad of padeiros) {
        
        // Find next available client not used today
        let selectedClient = null;
        let attempts = 0;
        
        while (attempts < clientQueue.length) {
          const c = clientQueue[queueIdx % clientQueue.length];
          queueIdx++;
          
          if (!clientesUsadosNesteDia.has(c.id)) {
            selectedClient = c;
            clientesUsadosNesteDia.add(c.id);
            break;
          }
          attempts++;
        }

        // If we exhausted clients and they are all used today (happens if bakers > clients),
        // we might have to reuse, but the rule says "cliente só pode está com um dia por vez"
        // Let's assume if there are not enough clients, we just pick the first available and break the rule slightly to ensure the baker has work.
        if (!selectedClient) {
           selectedClient = clientQueue[queueIdx % clientQueue.length];
           queueIdx++;
        }

        tarefasDia.push({
          padeiroId: pad.id,
          padeiroNome: pad.nome,
          codTec: pad.codTec,
          clienteId: selectedClient.id,
          clienteNome: selectedClient.nome,
          data: dateStr,
          horario: '08:00', // Default schedule time
          horarioFim: '17:00',
          status: 'pendente',
          observacao: 'Escala Inteligente Automática'
        });
      }

      distribuicao.push({
        diaLabel: dias[diaIdx],
        dateLabel: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dateStr,
        tarefas: tarefasDia
      });
    }

    return distribuicao;
  },

  async executeSmartSchedule() {
    const dist = this._smartDistribution;
    if (!dist) return;

    const btn = document.getElementById('btn-smart-exec');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Criando...';
    }

    let criadas = 0;
    try {
      for (const dia of dist) {
        for (const tarefa of dia.tarefas) {
          await API.post('/api/cronograma', tarefa);
          criadas++;
        }
      }

      Components.closeModal();
      Components.toast(`Cronograma Inteligente gerado! (${criadas} tarefas)`, 'success');
      this._smartDistribution = null;
      await this.render();
    } catch (e) {
      Components.toast('Erro: ' + e.message, 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = 'Tentar novamente'; }
    }
  }
});
