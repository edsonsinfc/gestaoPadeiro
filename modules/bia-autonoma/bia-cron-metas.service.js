/**
 * SERVIÇO DE CRON AUTÔNOMO DA BIA - METAS MENSAIS
 * SmartGestor - Brago Distribuidora
 * 
 * Regra de Negócio:
 * 1. Hoje: Gera a meta de teste autônoma para a equipe.
 * 2. Amanhã: Limpa automaticamente as metas de teste geradas hoje.
 * 3. Rotina Permanente: Executa automaticamente de verdade todo dia 20 de cada mês
 *    para projetar e cadastrar as metas do ciclo subsequente para todos os técnicos.
 */

const fs = require('fs');
const path = require('path');
const MetasAutonomasService = require('./metas-autonomas.service');
const { Meta } = require('../../data/db-adapter');

const STATE_FILE = path.join(__dirname, '../../data/bia-cron-metas-state.json');

class BiaCronMetasService {
  constructor() {
    this.intervalId = null;
    this.isExecutando = false;
  }

  /**
   * Obtém a data de hoje no formato YYYY-MM-DD considerando o fuso do Brasil
   */
  static getHojeIso() {
    const agora = new Date();
    // Ajusta para fuso horário de Brasília (UTC-3)
    const offsetMs = 3 * 60 * 60 * 1000;
    const local = new Date(agora.getTime() - offsetMs);
    return local.toISOString().split('T')[0];
  }

  /**
   * Carrega o estado persistente do cron
   */
  static carregarEstado() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const conteudo = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(conteudo);
      }
    } catch (err) {
      console.warn('[BIA Cron State] Erro ao ler estado, iniciando novo:', err.message);
    }
    return {
      ativo: true,
      testeExecutadoEm: null,
      testeLimpo: false,
      ultimaExecucaoOficial: null,
      ultimoCheck: null,
      logs: []
    };
  }

  /**
   * Salva o estado persistente do cron
   */
  static salvarEstado(estado) {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(estado, null, 2), 'utf8');
    } catch (err) {
      console.error('[BIA Cron State] Erro ao salvar estado:', err.message);
    }
  }

  /**
   * Adiciona entrada de log de auditoria ao estado
   */
  static registrarLog(estado, mensagem) {
    const entrada = `[${new Date().toISOString()}] ${mensagem}`;
    console.log(`⏰ [BIA Cron] ${mensagem}`);
    estado.logs = estado.logs || [];
    estado.logs.unshift(entrada);
    if (estado.logs.length > 50) estado.logs.pop(); // Mantém os últimos 50 logs
  }

  /**
   * Executa o ciclo de monitoramento e autonomia do cron
   */
  static async executarCiclo() {
    const estado = this.carregarEstado();
    if (!estado.ativo) return;

    const agora = new Date();
    const hojeStr = this.getHojeIso();
    const diaDoMes = agora.getDate();
    estado.ultimoCheck = new Date().toISOString();

    // =========================================================================
    // FASE 1: TESTE AUTÔNOMO DE HOJE
    // =========================================================================
    if (!estado.testeExecutadoEm) {
      this.registrarLog(estado, `Iniciando geração de metas de teste da Bia para hoje (${hojeStr})...`);
      try {
        const resTeste = await MetasAutonomasService.processarMetasMensais({
          usuarioSolicitante: {
            id: 'cron-teste-bia',
            nome: 'Cron Teste',
            role: 'admin'
          },
          apenasSimulacao: false,
          fatorEvolucao: 1.06
        });

        estado.testeExecutadoEm = hojeStr;
        estado.testeLimpo = false;
        this.registrarLog(estado, `Metas de teste geradas com sucesso para ${resTeste.totalPadeiros} padeiros (${resTeste.metaTotalKg} kg total). Serão limpas amanhã.`);
      } catch (errTeste) {
        this.registrarLog(estado, `Erro ao gerar metas de teste de hoje: ${errTeste.message}`);
      }
      this.salvarEstado(estado);
      return;
    }

    // =========================================================================
    // FASE 2: LIMPEZA DAS METAS DE TESTE NO DIA SEGUINTE (AMANHÃ)
    // =========================================================================
    if (estado.testeExecutadoEm && hojeStr > estado.testeExecutadoEm && !estado.testeLimpo) {
      this.registrarLog(estado, `Virada de dia detectada (Hoje: ${hojeStr} > Teste: ${estado.testeExecutadoEm}). Limpando metas de teste...`);
      try {
        // Localiza e remove todas as metas criadas pelo teste
        const todasMetas = await Meta.find({});
        let removidas = 0;
        for (const m of todasMetas) {
          const criador = (m.criadoPor || '').toLowerCase();
          const obs = (m.observacao || '').toLowerCase();
          if (criador.includes('cron teste') || criador.includes('teste') || obs.includes('cron teste')) {
            await Meta.findByIdAndDelete(m.id || m._id);
            removidas++;
          }
        }
        estado.testeLimpo = true;
        this.registrarLog(estado, `Limpeza concluída com sucesso: ${removidas} metas de teste removidas do banco de dados.`);
      } catch (errLimpeza) {
        this.registrarLog(estado, `Erro ao limpar metas de teste: ${errLimpeza.message}`);
      }
      this.salvarEstado(estado);
    }

    // =========================================================================
    // FASE 3: ROTINA OFICIAL PERMANENTE (TODO DIA 20 DE CADA MÊS)
    // =========================================================================
    if (diaDoMes === 20) {
      const [anoAtual, mesAtual] = hojeStr.split('-');
      const chaveDia20 = `${anoAtual}-${mesAtual}-20`;

      if (estado.ultimaExecucaoOficial !== chaveDia20) {
        // No dia 20, gera o planejamento para o ciclo do próximo mês (ex: dia 20/10 gera para 2026-11)
        const proximoMesObj = new Date(parseInt(anoAtual, 10), parseInt(mesAtual, 10), 1);
        const proxPeriodo = `${proximoMesObj.getFullYear()}-${String(proximoMesObj.getMonth() + 1).padStart(2, '0')}`;

        this.registrarLog(estado, `Dia 20 identificado! Executando rotina oficial autônoma para o próximo ciclo (${proxPeriodo})...`);
        try {
          const resOficial = await MetasAutonomasService.processarMetasMensais({
            periodo: proxPeriodo,
            usuarioSolicitante: {
              id: 'cron-oficial-bia-dia20',
              nome: 'Cron Oficial - Dia 20',
              role: 'admin'
            },
            apenasSimulacao: false,
            fatorEvolucao: 1.06
          });

          estado.ultimaExecucaoOficial = chaveDia20;
          this.registrarLog(estado, `Rotina oficial do dia 20 concluída: ${resOficial.totalPadeiros} padeiros cadastrados com ${resOficial.metaTotalKg} kg para ${resOficial.periodoNome}.`);
        } catch (errOficial) {
          this.registrarLog(estado, `Erro na rotina oficial do dia 20: ${errOficial.message}`);
        }
        this.salvarEstado(estado);
      }
    }

    this.salvarEstado(estado);
  }

  /**
   * Força a execução imediata das metas de teste (para testes/auditorias)
   */
  static async forcarTesteAgora() {
    const estado = this.carregarEstado();
    estado.testeExecutadoEm = null;
    estado.testeLimpo = false;
    this.salvarEstado(estado);
    await this.executarCiclo();
    return this.carregarEstado();
  }

  /**
   * Força a limpeza das metas de teste imediatamente
   */
  static async forcarLimpezaTesteAgora() {
    const estado = this.carregarEstado();
    const todasMetas = await Meta.find({});
    let removidas = 0;
    for (const m of todasMetas) {
      const criador = (m.criadoPor || '').toLowerCase();
      const obs = (m.observacao || '').toLowerCase();
      if (criador.includes('cron teste') || criador.includes('teste') || obs.includes('cron teste')) {
        await Meta.findByIdAndDelete(m.id || m._id);
        removidas++;
      }
    }
    estado.testeLimpo = true;
    this.registrarLog(estado, `Limpeza forçada executada: ${removidas} metas de teste removidas.`);
    this.salvarEstado(estado);
    return { removidas, estado };
  }

  /**
   * Inicia o monitoramento em segundo plano no servidor
   */
  static iniciar() {
    console.log('⏰ [BIA Cron] Serviço de Metas Autônomas inicializado (Verificação a cada 30min | Dia 20 Oficial).');
    
    // Executa a primeira verificação 5 segundos após subir o servidor
    setTimeout(() => {
      this.executarCiclo().catch(err => console.error('❌ [BIA Cron] Falha no ciclo inicial:', err));
    }, 5000);

    // Repete a cada 30 minutos (1.800.000 ms)
    setInterval(() => {
      this.executarCiclo().catch(err => console.error('❌ [BIA Cron] Falha no ciclo periódico:', err));
    }, 30 * 60 * 1000);
  }
}

module.exports = BiaCronMetasService;
