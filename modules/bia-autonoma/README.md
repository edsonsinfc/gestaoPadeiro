# Módulo BIA Autônoma — SmartGestor (Brago Distribuidora)

Módulo dedicado exclusivamente aos recursos autônomos e proativos da inteligência artificial Bia, operando em segundo plano e sob demanda para tomada de decisões operacionais.

---

## 1. Visão Geral da Autonomia de Metas

A Bia pode calcular e cadastrar metas de produção em Kg **por padeiro e por mês** de forma 100% autônoma.

### Como o cálculo autônomo é realizado:
1. **Período Mensal**: As metas são atreladas estritamente ao mês no formato padrão `YYYY-MM` (ex.: `2026-10`), respeitando os dias úteis do mês de segunda a sábado.
2. **Padeiros com Histórico**:
   - Analisa o histórico de atividades finalizadas nos últimos 60 dias.
   - Extrai a média diária real de produção em kg por dia trabalhado.
   - Projeta a produção para o total de dias úteis do mês e aplica um desafio de evolução operacional (+6%).
3. **Padeiros Novos ou Sem Histórico Recente**:
   - Aplica a média ponderada da filial ou piso técnico operacional (mínimo de 1.500 kg/mês).
4. **Idempotência**:
   - Se já existir meta cadastrada para o padeiro naquele mês, a Bia atualiza o registro (`findByIdAndUpdate`).
   - Se não existir, cadastra uma nova meta (`Meta.create`).

---

## 2. Governança e Controle de Acesso

- **Admin & Master Gestor (Diretoria)**:
  - Podem disparar a geração autônoma de metas para todas as filiais simultaneamente ou para uma filial específica.
- **Gestor Regional**:
  - Pode disparar a autonomia estritamente para os padeiros de sua própria filial.
- **Padeiro**:
  - Acesso bloqueado para definição de metas (HTTP 403 Forbidden).

---

## 3. Endpoints da API

- `POST /api/bia/autonoma/metas/gerar`:
  Executa o cálculo e cadastra as metas mensais no MySQL da Hostinger.
  *Body (opcional)*: `{ "periodo": "2026-10", "fatorEvolucao": 1.06 }`

- `GET /api/bia/autonoma/metas/preview`:
  Simula o cálculo de metas sem gravar no banco de dados.
  *Query (opcional)*: `?periodo=2026-10&fatorEvolucao=1.06`

- `GET /api/bia/autonoma/status`:
  Retorna o status do módulo, período vigente e permissões do usuário logado.

---

## 4. Estrutura de Arquivos

- `index.js`: Ponto de entrada do módulo.
- `metas-autonomas.service.js`: Motor de regras de negócio, estatística ponderada e persistência no banco.
- `bia-autonoma.controller.js`: Controlador HTTP REST com controle de acesso por papel.
- `bia-autonoma.routes.js`: Definição de rotas Express integradas ao `/api/bia/autonoma`.
