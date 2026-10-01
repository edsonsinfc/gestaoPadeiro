# Módulo BIA Agent — Smart Gestor

Módulo independente e modular de Inteligência Artificial para operações de gestão de padeiros, escalas e otimização de atendimentos.

## Arquitetura de Arquivos

- `bia.config.js`: Chaves de API, endpoints do Google Gemini, lista de modelos e prompt de sistema (Persona BIA).
- `bia.api.js`: Cliente de integração com o Google Gemini, fallback automático de modelos e parser de ações.
- `bia.actions.js`: Ações nativas no sistema:
  - `criarEscalaAltaPerformance`: Cruza padeiros com maior produção histórica com clientes de maior volume de consumo.
  - `criarEscalaPadraoAnterior`: Replica o histórico e rotina praticados anteriormente pela equipe para a semana atual.
  - `aplicarTarefasNoSistema`: Salva as tarefas em lote no banco de dados e sincroniza o cronograma em tempo real, registrando no histórico local.
  - `desfazerUltimaAcao`: Permite reverter as tarefas criadas pela Bia, excluindo-as via API e atualizando o cronograma instantaneamente.
- `bia.ui.js`: Interface estilo Apple HIG (sem emojis, utilizando Lucide Icons) com botão flutuante com gradiente da aba Cronograma, ícone SVG de estrela com estrelinha lateral, chat modal, cards interativos com botão de confirmação e reversão direta (Desfazer).
- `bia.main.js`: Ponto de inicialização que detecta login do usuário, verifica permissões (exclusivo para gestores e administradores) e monitora navegação SPA.
- `public/css/agent-bia.css`: Folha de estilos Apple HIG (vidro jateado/blur, botões de ação e reversão, animações suaves e responsividade total para desktop e mobile).

