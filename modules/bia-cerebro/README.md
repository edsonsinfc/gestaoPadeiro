# Módulo Cérebro da Bia — Cognição e Inteligência Operacional 360º
**SmartGestor — Brago Distribuidora**

O módulo **Cérebro da Bia** é o núcleo de inteligência analítica e contextual responsável por consolidar e interpretar em tempo real todas as informações da operação do SmartGestor.

---

## 1. Arquitetura do Cérebro

O cérebro unifica dados de todas as entidades do banco de dados (MySQL / Hostinger):

* **Força de Trabalho (`Padeiros`)**: Mapeamento de técnicos ativos, filiais, cargos, códigos técnicos e status.
* **Carteira de Atendimento (`Clientes`)**: Lojas atendidas, segmentação geográfica por UF/cidade (DF, GO, TO, MS), endereços e históricos de rotina.
* **Produção e Atendimentos (`Atividades`)**: Volume produzido em quilos (kg) e litros (l), atendimentos concluídos, cancelados e motivos de não realização.
* **Escalas e Programação (`Cronograma`)**: Visitas agendadas para a semana corrente (segunda a sábado), histórico completo de tarefas, identificação de técnicos com escala e cálculo de ociosidade operacional.
* **Metas Operacionais (`Metas`)**: Metas mensais cadastradas por técnico e consolidadas por filial, comparativo com volume realizado e taxa de atingimento (%).
* **Controle de Qualidade (`Avaliações`)**: Notas e feedback dos clientes sobre os técnicos e os produtos.
* **Controle de Abastecimento (`EstoqueFaltante`)**: Itens em falta nos clientes.

---

## 2. Estrutura de Arquivos

* [services/bia-cerebro.service.js](file:///c:/Users/Aprendiz%20Ti/OneDrive/Imagens/SmartGestor/gestaoPadeiro/services/bia-cerebro.service.js): Motor analítico principal com os métodos:
  * `carregarSnapshotOperacional()`: Coleta paralela de todas as coleções operacionais.
  * `processarRelatorioFiliais(snapshot)`: Agrupamento inteligente por filial (Brago Brasília, Brago Goiânia, Brago Palmas, Brago Campo Grande) e cálculo de KPIs.
  * `obterSituacaoFilial(nomeFilial)`: Radiografia individual de uma praça específica.
  * `construirBriefingCerebroOperacional(user, mensagem)`: Síntese de alta densidade cognitiva injetada no modelo Gemini.
* [modules/bia-cerebro/index.js](file:///c:/Users/Aprendiz%20Ti/OneDrive/Imagens/SmartGestor/gestaoPadeiro/modules/bia-cerebro/index.js): Ponto de entrada modular exportando o serviço central.
* [controllers/bia.controller.js](file:///c:/Users/Aprendiz%20Ti/OneDrive/Imagens/SmartGestor/gestaoPadeiro/controllers/bia.controller.js): Integração com o fluxo de chat e com o motor local da Bia.

---

## 3. Diretriz de Relatório de Filial

Ao responder sobre a situação de qualquer filial (ex.: Brasília), a Bia estrutura o diagnóstico corporativo nos seguintes pilares:

1. **Força de Trabalho**: Efetivo técnico ativo, nomes dos técnicos e código operacional.
2. **Carteira e Demanda**: Lojas e clientes cadastrados vinculados à praça.
3. **Produção e Volume**: Volume de produção do mês vigente vs. produção acumulada.
4. **Metas Operacionais**: Meta mensal estabelecida e percentual de atingimento.
5. **Status do Cronograma**: Total de visitas da semana, técnicos alocados e identificação nominal de técnicos desocupados (sem escala).
6. **Indicadores de Qualidade**: Nota média atribuída pelos clientes.
7. **Diagnóstico e Alertas**: Recomendações acionáveis para solucionar gargalos operacionais.
