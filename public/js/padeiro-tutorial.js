/**
 * Padeiro Tutorial System - Guided Onboarding for Bakers
 * BRAGO Sistema Padeiro - Premium Design
 * Features: Full flow simulation with mock data and visual highlights
 */

const PadeiroTutorial = {
  steps: [
    {
      route: 'padeiro-inicio',
      title: 'Bem-vindo, Padeiro!',
      content: 'Este é o seu novo painel de controle. Aqui você acompanha sua produção, metas e o feedback dos seus clientes de forma clara e rápida.',
      target: null,
      icon: 'layout-dashboard'
    },
    {
      route: 'padeiro-inicio',
      title: 'Seus Indicadores',
      content: 'Estes cartões mostram sua produção total, atividades do mês e sua nota média. Eles ajudam você a monitorar seu desempenho!',
      target: '.pd-kpi-row',
      icon: 'trending-up'
    },
    {
      route: 'padeiro-inicio',
      title: 'Foco na Meta',
      content: 'Aqui você vê o progresso da sua meta mensal. O anel muda de cor conforme você se aproxima do objetivo!',
      target: '.pd-progress-card',
      icon: 'target'
    },
    {
      route: 'padeiro-agenda',
      title: 'Minha Agenda',
      content: 'Acesse sua agenda para ver os clientes que você deve atender hoje e nos próximos dias. Organização é tudo!',
      target: '.sidebar-nav [data-route="padeiro-agenda"]',
      icon: 'calendar'
    },
    {
      route: 'padeiro-atividade',
      title: 'Simulação: Passo 1',
      content: 'Ao iniciar um atendimento, você primeiro confirma o cliente. O sistema já sugere quem está na sua rota!',
      target: '#wizard-content',
      icon: 'play-circle',
      action: () => {
        if (typeof PadeiroFlow !== 'undefined') {
          PadeiroFlow.activity = { clienteNome: 'Supermercado Modelo (Tutorial)', clienteId: 'mock' };
          PadeiroFlow.currentStep = 0;
          PadeiroFlow.renderWizard(document.getElementById('page-container'));
        }
      }
    },
    {
      route: 'padeiro-atividade',
      title: 'Simulação: Passo 2',
      content: 'Na etapa de Produção, você registra o que fabricou. É possível adicionar vários itens e tirar fotos para comprovação.',
      target: '#wizard-content',
      icon: 'package',
      action: () => {
        if (typeof PadeiroFlow !== 'undefined') {
          PadeiroFlow.currentStep = 1;
          PadeiroFlow.renderWizard(document.getElementById('page-container'));
          setTimeout(() => {
            const input = document.querySelector('.kg-produto-search');
            if (input) input.value = 'Pão Francês';
            const val = document.querySelector('.kg-valor');
            if (val) val.value = '45.5';
            PadeiroFlow.calculateTotals();
          }, 200);
        }
      }
    },
    {
      route: 'padeiro-atividade',
      title: 'Simulação: Passo 3',
      content: 'Depois de produzir, o responsável pela loja avalia o serviço e assina digitalmente no seu celular.',
      target: '#wizard-content',
      icon: 'star',
      action: () => {
        if (typeof PadeiroFlow !== 'undefined') {
          PadeiroFlow.currentStep = 2;
          PadeiroFlow.renderWizard(document.getElementById('page-container'));
        }
      }
    },
    {
      route: 'padeiro-atividade',
      title: 'Simulação: Passo 4',
      content: 'Por fim, você revisa o resumo e encerra a atividade. O sistema envia tudo em tempo real para a central!',
      target: '#wizard-content',
      icon: 'check-circle',
      action: () => {
        if (typeof PadeiroFlow !== 'undefined') {
          PadeiroFlow.activity.inicioEm = new Date(Date.now() - 3600000).toISOString(); // 1h ago
          PadeiroFlow.activity.tempoMinimoMinutos = 0;
          PadeiroFlow.currentStep = 3;
          PadeiroFlow.renderWizard(document.getElementById('page-container'));
        }
      }
    },
    {
      route: 'padeiro-atividade',
      title: 'Atendimento Concluído',
      content: 'Ao finalizar, você verá este resumo. Suas metas serão atualizadas instantaneamente com esses dados!',
      target: '.pf-success-card',
      icon: 'award',
      action: () => {
        if (typeof PadeiroFlow !== 'undefined') {
          PadeiroFlow.activity.kgTotal = 45.5;
          PadeiroFlow.activity.kgItens = [{ produtoNome: 'Pão Francês', kg: 45.5 }];
          PadeiroFlow.activity.notaCliente = 5;
          PadeiroFlow.renderSuccess();
        }
      }
    },
    {
      route: 'padeiro-inicio',
      title: 'Pronto para Começar!',
      content: 'O tutorial terminou. Agora é com você! Use o sistema para facilitar seu dia a dia e mostrar sua produtividade.',
      target: null,
      icon: 'thumbs-up'
    }
  ],

  currentStep: 0,
  isActive: false,

  start() {
    this.currentStep = 0;
    this.isActive = true;
    
    // Hide the FAB while tutorial is active
    const fab = document.getElementById('baker-tutorial-fab');
    if (fab) fab.style.display = 'none';

    this.showStep();
  },

  async showStep() {
    if (!this.isActive) return;

    const step = this.steps[this.currentStep];
    
    // Ensure we are on the right page
    if (App.currentRoute !== step.route) {
      App.navigate(step.route);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Execute custom action if defined
    if (step.action) {
      step.action();
    }

    const isLast = this.currentStep === this.steps.length - 1;
    const isFirst = this.currentStep === 0;

    const footer = `
      <div class="tutorial-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
        <div class="tutorial-progress" style="font-size: 12px; color: var(--text-tertiary); font-weight: 600;">
          ${this.currentStep + 1} de ${this.steps.length}
        </div>
        <div style="display: flex; gap: 8px;">
          ${!isFirst ? `<button class="btn btn-secondary btn-touch" onclick="PadeiroTutorial.prev()">Voltar</button>` : ''}
          <button class="btn btn-primary btn-touch" onclick="PadeiroTutorial.next()">
            ${isLast ? 'Finalizar' : 'Próximo'}
          </button>
        </div>
      </div>
    `;

    const content = `
      <div class="tutorial-step-content" style="text-align: center; padding: 12px 0;">
        <div class="tutorial-icon-box" style="width: 64px; height: 64px; background: var(--primary-light); color: var(--primary); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <i data-lucide="${step.icon || 'info'}" size="32"></i>
        </div>
        <h4 style="margin-bottom: 8px; color: var(--text-primary); font-weight: 700; font-size: 18px;">${step.title}</h4>
        <p style="color: var(--text-secondary); line-height: 1.6; font-size: 15px; margin-bottom: 0;">${step.content}</p>
        ${step.target ? `
          <div class="tutorial-tip" style="margin-top: 20px; padding: 12px; background: var(--surface-hover); border-radius: 12px; font-size: 13px; color: var(--text-primary); border-left: 4px solid var(--primary);">
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
              <i data-lucide="mouse-pointer-2" size="14"></i>
              <span>Veja o destaque em azul na tela</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    Components.showModal('', content, footer, 'tutorial-modal');
    Components.renderIcons();

    // Highlight the target element
    this.clearHighlights();
    if (step.target) {
      setTimeout(() => {
        const el = document.querySelector(step.target);
        if (el) {
          el.classList.add('tutorial-highlight');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
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
    Components.toast('Treinamento concluído! Boa produção.', 'success');
    localStorage.setItem('brago_padeiro_tutorial_seen', 'true');
    
    // Restore the FAB if we are still on the home page
    if (App.currentRoute === 'padeiro-inicio') {
      const fab = document.getElementById('baker-tutorial-fab');
      if (fab) fab.style.display = 'flex';
    }

    // Clear mock state and go home
    if (typeof PadeiroFlow !== 'undefined') {
      PadeiroFlow.activity = {};
      PadeiroFlow.currentStep = 0;
    }
    App.navigate('padeiro-inicio');
  },

  clearHighlights() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }
};
