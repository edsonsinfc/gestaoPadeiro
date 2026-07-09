# SmartGestor — Referência Rápida de Arquivos

> Use este documento para navegar rapidamente entre os módulos do sistema.

## Backend — Arquivos Críticos (NÃO ALTERAR sem cuidado)

| Arquivo | Função | Impacto |
|---------|--------|---------|
| `server.js` | Entry point, middlewares, FTP proxy, push, CRON | 🔴 Alto |
| `data/mysqlDB.js` | Wrapper MySQL (interface Mongoose-like) | 🔴 Crítico |
| `data/db-adapter.js` | Exporta models MySQL | 🔴 Crítico |
| `data/init-mysql.js` | Schema do banco + migrações inline | 🔴 Alto |
| `middleware/auth.js` | JWT auth, adminOnly, adminOrSelf | 🔴 Crítico |
| `config/index.js` | JWT_SECRET, GOOGLE_CLIENT_ID | 🔴 Alto |

## Backend — Controllers (Lógica de Negócio)

| Controller | Responsabilidade |
|-----------|-----------------|
| `auth.controller.js` | Login (email/Google), primeiro acesso, definir senha |
| `management.controller.js` | CRUD de usuários, troca de role (padeiro↔gestor), sync clientes |
| `mastergestor.controller.js` | Dashboard executivo, metas comerciais por filial |
| `auditoria.controller.js` | Logs de login, compliance, métricas de engajamento |
| `atividades.controller.js` | CRUD atividades de produção, socket emit |
| `cronograma.controller.js` | Agenda semanal, CRUD tarefas, push de nova tarefa |
| `cronograma-template.controller.js` | Templates reutilizáveis de cronograma |
| `tracking.controller.js` | GPS trail, sync offline, reset tracking |
| `stats.controller.js` | Dashboard KPIs, rankings, produção por padeiro |
| `padeiros.controller.js` | CRUD padeiros |
| `produtos.controller.js` | CRUD produtos |
| `clientes.controller.js` | CRUD clientes |
| `metas.controller.js` | Metas de produção (kg/mês) |
| `avaliacoes.controller.js` | Avaliações de qualidade |
| `timeline.controller.js` | Eventos de timeline |
| `upload.controller.js` | Upload de imagens (Multer → Google Drive) |

## Frontend — Módulos JS por Perfil

### Admin / Gestor
| Arquivo | Função |
|---------|--------|
| `app.js` (49KB) | Router SPA, navegação, state |
| `auth.js` (14KB) | Login, Google Sign-In, sessão |
| `components.js` (58KB) | Componentes reutilizáveis |
| `admin-dashboard.js` (63KB) | Dashboard com gráficos |
| `gestao.js` (62KB) | Gestão de agenda/cronograma |
| `metas.js` (54KB) | Gestão de metas |
| `avaliacoes.js` (26KB) | Sistema de avaliações |
| `rastreamento.js` (76KB) | Mapa GPS tempo real |
| `timeline.js` (35KB) | Timeline de eventos |
| `relatorios.js` (35KB) | Relatórios PDF |
| `filiais.js` (16KB) | Visão multi-filial |
| `auditoria.js` (29KB) | Painel compliance |
| `dev.js` (75KB) | Ferramentas dev (admin only) |

### Master Gestor
| Arquivo | Função |
|---------|--------|
| `master-gestor.js` (25KB) | Dashboard executivo |
| `master-metas.js` (31KB) | Metas comerciais |

### Padeiro (Mobile)
| Arquivo | Função |
|---------|--------|
| `padeiro-flow.js` (109KB) | ⭐ Core mobile - fluxo step-by-step |
| `padeiro-dashboard.js` (21KB) | Dashboard pessoal |
| `padeiro-agenda.js` (21KB) | Agenda do dia |
| `padeiro-tutorial.js` (9KB) | Tutorial interativo |
| `location-service.js` (17KB) | GPS foreground/background |
| `notification-service.js` (4KB) | Push notifications |

## Banco de Dados — Tabelas

| Tabela | Registros típicos | Controller principal |
|--------|-------------------|---------------------|
| `padeiros` | ~50 | padeiros.controller |
| `admins` | ~10 | management.controller |
| `produtos` | ~500 | produtos.controller |
| `clientes` | ~200 | clientes.controller |
| `atividades` | ~5000/mês | atividades.controller |
| `cronogramas` | ~1000/mês | cronograma.controller |
| `avaliacoes` | ~200/mês | avaliacoes.controller |
| `metas` | ~50 | metas.controller |
| `localizacoes` | ~50 | location.socket |
| `historico_localizacoes` | ~50000/mês | location.socket |
| `timeline_events` | ~5000/mês | location.socket |
| `audit_logs` | ~500/mês | auth.controller |
| `push_subscriptions` | ~100 | server.js |
| `criterios` | ~20 | criterios.controller |
| `cronograma_templates` | ~10 | cronograma-template.controller |
| `colaboradores` | ~100 | colaboradores.controller |
