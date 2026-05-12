/**
 * ARQUIVO: cronograma.mensal.js
 * CATEGORIA: Cronograma › Visão mensal
 * RESPONSABILIDADE: Renderiza a grade anual e abre detalhes por mês
 * DEPENDE DE: cronograma.state.js, Components
 * EXPORTA: renderMensal, getStatsForMonth, openMonthDetails
 */

Object.assign(Cronograma, {
  getStatsForMonth(year, monthIndex) {
    // monthIndex is 0-11
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const atividadesMes = this.atividades.filter(a => a.data && a.data.startsWith(monthStr) && a.status === 'finalizada');
    const totalKg = atividadesMes.reduce((s, a) => s + (parseFloat(a.kgTotal) || 0), 0);
    const totalAtividades = atividadesMes.length;

    const tarefasMes = this.tarefas.filter(t => t.data && t.data.startsWith(monthStr));
    const tarefasConcluidas = tarefasMes.filter(t => t.status === 'concluida').length;
    const tarefasPendentes = tarefasMes.filter(t => t.status === 'pendente').length;
    
    return { totalKg, totalAtividades, tarefasConcluidas, tarefasPendentes };
  },

  openMonthDetails(year, monthIndex) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesLabel = meses[monthIndex];
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const diasNoMes = new Date(year, monthIndex + 1, 0).getDate();
    const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const padeirosAtivos = this.padeiros.filter(p => p.ativo);
    
    // Gather all task dates in this month
    const tarefasMes = this.tarefas.filter(t => t.data && t.data.startsWith(monthStr));
    
    // Build all workdays of the month (Mon-Sat)
    const dias = [];
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(year, monthIndex, d);
      const dow = date.getDay(); // 0=Sun
      if (dow !== 0) { // skip sundays
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dias.push({ d, dateStr, label: `${diasDaSemana[dow]} ${d}` });
      }
    }

    const tableHeader = dias.map(dia => `<th>${dia.label}</th>`).join('');

    const tableRows = padeirosAtivos.map(p => {
      const cells = dias.map(dia => {
        const tarefa = tarefasMes.find(t => t.data === dia.dateStr && t.padeiroId === p.id);
        if (!tarefa) return `<td></td>`;
        let bg = '';
        if (tarefa.status === 'concluida') bg = 'background-color:rgba(40,167,69,0.08);';
        if (tarefa.status === 'em_andamento') bg = 'background-color:rgba(30,75,255,0.06);';
        return `<td style="${bg}">
          <div style="font-weight:600;color:#2C2C2A;line-height:1.3;margin-bottom:2px;">${(tarefa.clienteNome || '—').split(' ').slice(0,2).join(' ')}</div>
          ${tarefa.horario ? `<div style="color:var(--text-tertiary);">${tarefa.horario}</div>` : ''}
        </td>`;
      }).join('');
      return `<tr>
        <td class="col-padeiro">${p.nome.toUpperCase()}</td>
        ${cells}
      </tr>`;
    }).join('');

    Components.showModal(
      `Agenda: ${mesLabel} de ${year}`,
      `<div class="agenda-table-wrapper">
        <table class="agenda-table">
          <thead><tr>
            <th class="col-padeiro">Padeiro</th>
            ${tableHeader}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>`,
      `<button class="agenda-btn-close" onclick="Components.closeModal()">Fechar</button>`,
      'agenda-modal'
    );
    Components.renderIcons();
  },

  renderMensal() {
    const cc = document.getElementById('cronograma-content');
    const year = new Date().getFullYear();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const abrevs = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const META_FIXA = 5000;

    cc.innerHTML = `
    <div style="text-align:center;margin-bottom:32px;">
      <h3 style="font-size:20px;text-transform:capitalize;margin:0;">Visão Anual - ${year}</h3>
      <p class="text-secondary" style="margin-top:4px;font-size:13px;">Clique em um mês para ver a agenda dos padeiros</p>
    </div>

    <div class="month-grid">
      ${meses.map((nomeMes, index) => {
        const stats = this.getStatsForMonth(year, index);
        const totalClientes = this.tarefas.filter(t => t.data && t.data.startsWith(`${year}-${String(index+1).padStart(2,'0')}`)).length;
        const progresso = Math.min(100, Math.round((stats.totalKg / META_FIXA) * 100));
        return `
        <div class="month-card" onclick="Cronograma.openMonthDetails(${year}, ${index})">
          <div style="position: relative; z-index: 2;">
            <div class="month-abbr">${abrevs[index]}</div>
            <div class="month-subtitle">${totalClientes} cliente${totalClientes !== 1 ? 's' : ''} agendado${totalClientes !== 1 ? 's' : ''}</div>
          </div>
          <div class="month-progress-wrapper">
            <div class="month-meta-header">
              <span class="month-meta-text">${progresso}%</span>
            </div>
          </div>
          <div class="month-card-blob"></div>
        </div>`;
      }).join('')}
    </div>
    `;
  },
});
