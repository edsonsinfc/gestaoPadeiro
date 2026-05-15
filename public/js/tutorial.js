/**
 * Tutorial System - Guided Onboarding
 * BRAGO Sistema Padeiro
 */

const Tutorial = {
  steps: [
    {
      route: 'admin-dashboard',
      title: 'Bem-vindo ao Smart Gestor!',
      content: 'Este é o seu painel principal. Aqui você tem uma visão geral do desempenho dos padeiros, atividades recentes e métricas cruciais da Brago Distribuidora.',
      target: null
    },
    {
      route: 'filiais',
      title: 'Gerenciamento de Filiais',
      content: 'Aqui você pode visualizar e gerenciar as diferentes filiais atendidas pela Brago. Cada filial possui seus próprios padeiros e metas específicas.',
      target: '.nav-item[data-route="filiais"]'
    },
    {
      route: 'cronograma',
      title: 'Cronograma Inteligente',
      content: 'Planeje a semana ou o mês dos seus padeiros com facilidade. Arraste e solte atividades para organizar as rotas e atendimentos de forma eficiente.',
      target: '.nav-item[data-route="cronograma"]'
    },
    {
      route: 'gestao',
      title: 'Gestão Completa',
      content: 'O coração do sistema. Gerencie Padeiros, Produtos e Clientes em um só lugar. Você pode adicionar novos membros e editar informações importantes.',
      target: '.nav-item[data-route="gestao"]'
    },
    {
      route: 'metas',
      title: 'Metas de Produção',
      content: 'Acompanhe as metas de cada colaborador. Visualize quem está batendo os recordes e identifique onde precisamos de mais foco para crescer.',
      target: '.nav-item[data-route="metas"]'
    },
    {
      route: 'avaliacoes',
      title: 'Avaliações de Desempenho',
      content: 'Registre e consulte as avaliações técnicas dos padeiros. Mantenha o padrão de qualidade Brago em todas as visitas e produções.',
      target: '.nav-item[data-route="avaliacoes"]'
    },
    {
      route: 'rastreamento',
      title: 'Rastreamento em Tempo Real',
      content: 'Veja no mapa onde seus colaboradores estão agora e o histórico das rotas percorridas. Mais transparência e segurança para a operação.',
      target: '.nav-item[data-route="rastreamento"]'
    },
    {
      route: 'relatorios',
      title: 'Relatórios e BI',
      content: 'Transforme dados em decisões. Gere relatórios detalhados de produtividade, desperdício e faturamento para otimizar os resultados.',
      target: '.nav-item[data-route="relatorios"]'
    }
  ],

  currentStep: 0,
  isActive: false,

  start() {
    this.currentStep = 0;
    this.isActive = true;
    this.showStep();
  },

  async showStep() {
    if (!this.isActive) return;

    const step = this.steps[this.currentStep];
    
    // Navigate to the correct route if needed
    if (App.currentRoute !== step.route) {
      App.navigate(step.route);
      // Wait a bit for the page to render
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const isLast = this.currentStep === this.steps.length - 1;
    const isFirst = this.currentStep === 0;

    const footer = `
      <div class="tutorial-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
        <div class="tutorial-progress" style="font-size: 12px; color: var(--text-tertiary); font-weight: 600;">
          ${this.currentStep + 1} de ${this.steps.length}
        </div>
        <div style="display: flex; gap: 8px;">
          ${!isFirst ? `<button class="btn btn-secondary btn-touch" onclick="Tutorial.prev()">Voltar</button>` : ''}
          <button class="btn btn-primary btn-touch" onclick="Tutorial.next()">
            ${isLast ? 'Finalizar' : 'Próximo'}
          </button>
        </div>
      </div>
    `;

    const content = `
      <div class="tutorial-step-content" style="text-align: center; padding: 12px 0;">
        <div class="tutorial-icon-box" style="width: 64px; height: 64px; background: var(--primary-light); color: var(--primary); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <i data-lucide="${this.getIconForRoute(step.route)}" size="32"></i>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6; font-size: 15px;">${step.content}</p>
        ${step.target ? `<div class="tutorial-tip" style="margin-top: 16px; padding: 12px; background: var(--surface-hover); border-radius: 12px; font-size: 13px; color: var(--text-primary);">
          <i data-lucide="mouse-pointer-2" size="14" style="vertical-align: middle; margin-right: 4px;"></i>
          Localize esta opção no menu lateral para acessar.
        </div>` : ''}
      </div>
    `;

    Components.showModal(step.title, content, footer, 'tutorial-modal');
    Components.renderIcons();

    // Highlight the sidebar item if it exists
    this.clearHighlights();
    if (step.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.classList.add('tutorial-highlight');
      }
    }
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.showStep();
    } else {
      this.finish();
    }
  },

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep();
    }
  },

  finish() {
    this.isActive = false;
    this.clearHighlights();
    Components.closeModal();
    Components.toast('Tutorial concluído! Bom trabalho.', 'success');
    localStorage.setItem('brago_tutorial_seen', 'true');
  },

  clearHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  },

  getIconForRoute(route) {
    const icons = {
      'admin-dashboard': 'layout-dashboard',
      'filiais': 'map',
      'cronograma': 'calendar-days',
      'gestao': 'users',
      'metas': 'target',
      'avaliacoes': 'star',
      'rastreamento': 'map-pin',
      'relatorios': 'bar-chart-2'
    };
    return icons[route] || 'info';
  }
};
