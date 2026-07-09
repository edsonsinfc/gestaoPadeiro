---
name: smart-gestor
description: |
  Documentação e regras do sistema SmartGestor (Brago Distribuidora).
  Use quando for trabalhar em qualquer parte do código do SmartGestor:
  backend, frontend, banco de dados, APK Android, ou configuração.
  Contém visão geral da arquitetura, mapa de perfis de acesso,
  esquema do banco MySQL, regras de proteção para não quebrar o sistema,
  e documentação do empacotamento APK via Capacitor.
---

# 🍞 SmartGestor — Documentação Completa do Sistema

> **Sistema de Gestão e Produção para a Brago Distribuidora**
> Stack: Node.js + Express + MySQL + Vanilla JS SPA + Capacitor Android

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTES                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Browser  │  │ PWA      │  │ APK Android      │  │
│  │ Desktop  │  │ Mobile   │  │ (Capacitor)      │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       └──────────────┼─────────────────┘            │
│                      ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │         Express Server (server.js)           │   │
│  │  ┌────────┐ ┌───────────┐ ┌──────────────┐  │   │
│  │  │ CORS   │ │ JWT Auth  │ │ Static Files │  │   │
│  │  └────────┘ └───────────┘ └──────────────┘  │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │           API Routes (/api/*)          │  │   │
│  │  │  auth│admin│padeiros│atividades│...    │  │   │
│  │  └───────────────┬────────────────────────┘  │   │
│  │  ┌───────────────┴────────────────────────┐  │   │
│  │  │          Controllers (18 files)        │  │   │
│  │  └───────────────┬────────────────────────┘  │   │
│  │                  ▼                            │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │ DB Adapter (mysqlDB.js → MySQL)        │  │   │
│  │  │ Mongoose-like API over mysql2/promise   │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │ Socket.IO (GPS em tempo real)          │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │ Integrações: Google Drive, FTP Brago,  │  │   │
│  │  │ Web Push, Firebase, Email (Nodemailer) │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 1.1 Stack Tecnológica

| Camada       | Tecnologia                         | Arquivo(s) chave                   |
|-------------|------------------------------------|------------------------------------|
| Runtime     | Node.js                            | `server.js`                        |
| Framework   | Express 4.x                        | `server.js`, `routes/index.js`     |
| Banco       | MySQL (mysql2/promise)             | `data/mysqlDB.js`, `data/init-mysql.js` |
| ORM         | Custom Mongoose-like wrapper       | `data/mysqlDB.js` (SqlCollection)  |
| Auth        | JWT (jsonwebtoken) + bcryptjs      | `middleware/auth.js`, `controllers/auth.controller.js` |
| Realtime    | Socket.IO                          | `sockets/location.socket.js`       |
| Frontend    | Vanilla JS SPA (sem framework)     | `public/js/*.js`, `public/css/*.css` |
| Mobile      | Capacitor 8.x (WebView nativo)     | `capacitor.config.json`, `android/` |
| Push        | Web Push (VAPID) + Firebase (FCM)  | `data/pushService.js`              |
| Storage     | Google Drive API + FTP Brago       | `data/googleDriveService.js`       |
| Email       | Nodemailer                         | `data/emailService.js`             |
| Mapas       | Leaflet + Turf.js                  | `public/js/rastreamento.js`        |
| Gráficos    | Chart.js                           | Dashboard no frontend              |

---

## 2. Estrutura de Diretórios

```
gestaoPadeiro/
├── server.js                  # Entry point do servidor Express
├── package.json               # Dependências e scripts
├── capacitor.config.json      # Config do Capacitor para build Android
├── .env.example               # Variáveis de ambiente necessárias
│
├── config/
│   ├── index.js               # PORT, JWT_SECRET, BASE_URL, GOOGLE_CLIENT_ID
│   ├── cors.js                # Configuração CORS
│   ├── multer.js              # Upload de arquivos (imagens)
│   └── google-drive-config.json
│
├── middleware/
│   ├── auth.js                # authMiddleware, adminOnly, adminOrSelf
│   └── errorHandler.js        # Error handler global (Multer etc)
│
├── routes/                    # Definição de todas as rotas da API
│   ├── index.js               # Registra todos os sub-routers em /api/*
│   ├── auth.routes.js         # /api/auth/*
│   ├── admin.routes.js        # /api/admin/*
│   ├── management.routes.js   # /api/management/*
│   ├── mastergestor.routes.js # /api/master-gestor/*
│   ├── padeiros.routes.js     # /api/padeiros/*
│   ├── produtos.routes.js     # /api/produtos/*
│   ├── clientes.routes.js     # /api/clientes/*
│   ├── atividades.routes.js   # /api/atividades/*
│   ├── avaliacoes.routes.js   # /api/avaliacoes/*
│   ├── cronograma.routes.js   # /api/cronograma/*
│   ├── metas.routes.js        # /api/metas/*
│   ├── stats.routes.js        # /api/stats/*
│   ├── tracking.routes.js     # /api/tracking/*
│   ├── timeline.routes.js     # /api/timeline-events/*
│   ├── upload.routes.js       # /api/upload/*
│   ├── auditoria.routes.js    # /api/auditoria/*
│   ├── criterios.routes.js    # /api/criterios/*
│   └── colaboradores.routes.js
│
├── controllers/               # Lógica de negócios (18 controllers)
│   ├── auth.controller.js     # Login, Google Login, primeiro acesso, senha
│   ├── management.controller.js # CRUD de usuários (admin/padeiro), sync clientes
│   ├── mastergestor.controller.js # Dashboard executivo multi-filial
│   ├── auditoria.controller.js    # Logs de login, compliance, métricas
│   ├── atividades.controller.js   # CRUD atividades de produção
│   ├── cronograma.controller.js   # Agenda semanal, tarefas, templates
│   ├── cronograma-template.controller.js # Templates de cronograma
│   ├── tracking.controller.js     # GPS, trails, sync offline
│   ├── stats.controller.js        # Dashboard de estatísticas
│   ├── padeiros.controller.js     # CRUD padeiros
│   ├── produtos.controller.js     # CRUD produtos
│   ├── clientes.controller.js     # CRUD clientes
│   ├── metas.controller.js        # Metas de produção
│   ├── avaliacoes.controller.js   # Avaliações/feedbacks
│   ├── timeline.controller.js     # Eventos de timeline
│   ├── upload.controller.js       # Upload de imagens (Multer → Drive)
│   └── colaboradores.controller.js
│
├── data/                      # Camada de dados
│   ├── db-adapter.js          # Ponto único de exportação (→ mysqlDB)
│   ├── mysqlDB.js             # Wrapper MySQL com interface Mongoose-like
│   ├── init-mysql.js          # Criação de tabelas + migrações inline
│   ├── models.js              # Schemas Mongoose (legado, não usado em prod)
│   ├── migrate.js             # Auto-migração de dados JSON → MySQL
│   ├── emailService.js        # Envio de e-mails (Nodemailer)
│   ├── googleDriveService.js  # Google Drive API (upload/download/stream)
│   ├── driveMappings.js       # Cache local filename→driveId
│   ├── pushService.js         # Web Push + FCM (Firebase)
│   ├── *.json / *.db          # Dados seed/legado (não são o banco real)
│   └── produtos_cache/        # Cache local de fotos FTP
│
├── sockets/
│   └── location.socket.js     # GPS real-time via Socket.IO
│
├── public/                    # Frontend SPA (servido como static)
│   ├── index.html             # Shell principal do SPA
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (offline-first, cache v63)
│   ├── smartgestor.apk        # APK compilado para download
│   ├── css/                   # Estilos organizados por módulo
│   │   ├── variables.css      # Tokens de design
│   │   ├── reset.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   ├── animations.css
│   │   ├── styles.css         # Principal (111KB)
│   │   ├── padeiro-flow.css   # Fluxo mobile do padeiro
│   │   ├── hig-desktop.css    # Design system desktop (HIG)
│   │   ├── auditoria.css
│   │   ├── master-gestor.css
│   │   └── tutorial.css
│   ├── js/                    # Módulos JavaScript do SPA
│   │   ├── app.js             # Router SPA, navegação, state global
│   │   ├── auth.js            # Login, Google Sign-In, sessão
│   │   ├── components.js      # Componentes reutilizáveis (modais, toasts etc)
│   │   ├── admin-dashboard.js # Dashboard admin/gestor
│   │   ├── gestao.js          # Gestão de cronograma/agenda
│   │   ├── padeiro-flow.js    # Fluxo mobile do padeiro (109KB, core mobile)
│   │   ├── padeiro-dashboard.js
│   │   ├── padeiro-agenda.js
│   │   ├── padeiro-tutorial.js
│   │   ├── metas.js           # Gestão de metas
│   │   ├── avaliacoes.js      # Sistema de avaliações
│   │   ├── rastreamento.js    # Mapa GPS (Leaflet)
│   │   ├── timeline.js        # Timeline de eventos
│   │   ├── relatorios.js      # Relatórios e exportação PDF
│   │   ├── filiais.js         # Visão multi-filial
│   │   ├── master-gestor.js   # Painel executivo
│   │   ├── master-metas.js
│   │   ├── auditoria.js       # Painel de auditoria
│   │   ├── location-service.js # GPS foreground/background
│   │   ├── notification-service.js
│   │   ├── dev.js             # Ferramentas de desenvolvimento (admin)
│   │   └── tutorial.js
│   ├── assets/                # Ícones, logos, fontes
│   └── img/                   # Imagens do sistema
│
├── android/                   # Projeto Android (Capacitor)
│   ├── app/
│   │   ├── build.gradle       # Config de build Android
│   │   ├── google-services.json
│   │   ├── release/           # APK compilado
│   │   └── src/               # Sources Java/XML Android
│   ├── build.gradle
│   ├── variables.gradle       # minSdkVersion, compileSdkVersion etc
│   └── capacitor.settings.gradle
│
├── Email/                     # Templates de email (legado)
├── Banco Padeiros/            # Dados seed de padeiros
├── Banco produtos/            # Dados seed de produtos
└── clientes/                  # Dados seed de clientes
```

---

## 3. Sistema de Perfis de Acesso (Roles)

### 3.1 Hierarquia de Perfis

```
master_gestor (CEO/Diretoria)
    ↓
admin (Administrador do Sistema)
    ↓
gestor_geral (Gestor Multi-filial)
    ↓
gestor_regional (Gestor de uma filial específica)
    ↓
padeiro (Técnico/Padeiro de campo)
```

### 3.2 Detalhamento de Cada Perfil

#### 🔑 `admin` — Administrador do Sistema
- **Tabela**: `admins`
- **Acesso**: Total. CRUD de tudo, ferramentas dev, auditoria, reset de dados
- **Telas**: Dashboard completo, gestão de usuários, dev tools, auditoria, rastreamento
- **Token JWT**: `{ id, email, role: 'admin', nome, filial: null }`
- **Sem restrição de filial** (vê tudo)
- **Arquivo principal**: `public/js/admin-dashboard.js`, `public/js/dev.js`

#### 🔑 `master_gestor` — Master Gestor (Diretoria)
- **Tabela**: `admins` (com `role: 'master_gestor'`)
- **Acesso**: Dashboard executivo multi-filial, métricas consolidadas, alertas estratégicos
- **Rota exclusiva**: `GET /api/master-gestor/dashboard` (middleware `masterGestorOnly`)
- **NÃO tem acesso a**: ferramentas dev, reset de dados, CRUD de usuários (pode só visualizar)
- **Arquivo principal**: `public/js/master-gestor.js`, `public/js/master-metas.js`

#### 🔑 `gestor_geral` — Gestor Multi-filial
- **Tabela**: `admins` (com `role: 'gestor_geral'`)
- **Acesso**: Dashboard, agenda, CRUD de usuários, filiais, avaliações
- **Filial**: `null` ou múltiplas — vê dados de TODAS as filiais
- **Diferença do admin**: Não tem acesso a ferramentas dev

#### 🔑 `gestor_regional` — Gestor de Filial Específica
- **Tabela**: `admins` (com `role: 'gestor_regional'`, `filial: 'Brago Brasília'`)
- **Acesso**: Dashboard filtrado por filial, agenda da filial, avaliações da filial
- **Filial**: SEMPRE especificada — só vê dados da SUA filial
- **Filtro automático**: O middleware filtra atividades, padeiros, cronograma por filial

#### 🔑 `padeiro` — Técnico de Campo
- **Tabela**: `padeiros`
- **Acesso**: Seu próprio fluxo de trabalho, agenda pessoal, registro de atividades
- **Telas**: Dashboard pessoal, agenda do dia, fluxo de atividade (step-by-step), tutorial
- **Token JWT**: `{ id, email, role: 'padeiro', nome, cargo, filial }`
- **Arquivo principal**: `public/js/padeiro-flow.js` (109KB — é o core mobile)

### 3.3 Middleware de Autorização

**Localização**: `middleware/auth.js`

| Middleware      | Roles permitidos                                           |
|----------------|-----------------------------------------------------------|
| `authMiddleware` | Qualquer token JWT válido                                |
| `adminOnly`     | `admin`, `gestor`, `gestor_geral`, `gestor_regional`, `master_gestor` |
| `adminOrSelf`   | Mesmos do adminOnly OU o próprio usuário (por ID)         |
| `masterGestorOnly` | Somente `master_gestor` (definido inline em `mastergestor.routes.js`) |

### 3.4 Filiais Existentes

```
- Brago Brasília
- Brago Goiania
- Brago Palmas
- Brago Campo Grande
```

---

## 4. Banco de Dados MySQL — Esquema Completo

### 4.1 Tabelas Principais (16 tabelas)

| Tabela                  | Descrição                          | Chave Primária |
|------------------------|------------------------------------|----------------|
| `padeiros`             | Técnicos/padeiros de campo         | `id VARCHAR(50)` |
| `admins`               | Admin, gestores, master_gestor     | `id VARCHAR(50)` |
| `produtos`             | Catálogo de produtos Brago         | `id VARCHAR(50)` |
| `clientes`             | Clientes/panificadoras atendidas   | `id VARCHAR(50)` |
| `colaboradores`        | Colaboradores internos             | `id VARCHAR(50)` |
| `atividades`           | Registros de produção dos padeiros | `id VARCHAR(50)` |
| `avaliacoes`           | Avaliações de qualidade            | `id VARCHAR(50)` |
| `cronogramas`          | Agenda/cronograma de tarefas       | `id VARCHAR(50)` |
| `cronograma_templates` | Templates reutilizáveis de agenda  | `id VARCHAR(50)` |
| `metas`                | Metas de produção (Kg/mês)         | `id VARCHAR(50)` |
| `criterios`            | Critérios de avaliação             | `id VARCHAR(50)` |
| `localizacoes`         | Última localização GPS conhecida   | `id VARCHAR(50)` |
| `historico_localizacoes` | Trilha GPS completa              | `id VARCHAR(50)` |
| `timeline_events`      | Eventos de timeline dos padeiros   | `id VARCHAR(50)` |
| `push_subscriptions`   | Inscrições Web Push / FCM          | `id VARCHAR(255)` |
| `audit_logs`           | Logs de login e compliance         | `id VARCHAR(50)` |

### 4.2 Campos Críticos

#### Tabela `padeiros`
```sql
id, nome, cargo, funcao, filial, localTrabalho, dataNascimento,
cpf, rg, pis, carteiraTrabalho, numSerie, email, emailPessoal,
emailCorporativo, telefone, estado, codigoExterno, desligado,
codTec, dataAdmissao, fusoHorario, passwordHash, firstAccessToken,
firstAccessExpiry, ativo, deletado, role, criadoEm, atualizadoEm
```

#### Tabela `admins`
```sql
id, nome, email, passwordHash, role, filial, ativo, deletado,
criadoEm, atualizadoEm
```

#### Tabela `atividades` (mais complexa)
```sql
id, padeiroId, padeiroNome, clienteId, clienteNome, cronogramaId,
produtoId, produtoNome, kgTotal, lTotal, status, data, hora,
inicioEm, terminadoEm, fimEm, tempoMinimoMinutos, fotos,
assinatura (LONGTEXT), localizacao, latitude, longitude,
observacao, notaCliente, notaPadeiroCliente, kgItens (JSON TEXT),
lastStep, timeline (JSON TEXT), atualizadoEm
```

#### Tabela `cronogramas`
```sql
id, padeiroId, padeiroNome, codTec, clienteId, clienteNome,
data, horario, status, tempoMinimoMinutos, posicao,
observacao, criadoPor, criadoEm, atualizadoEm
```

### 4.3 Geração de IDs

Todos os IDs são gerados no backend com o padrão:
```javascript
const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
// Exemplo: "k7f3m2x1a1njk5h7z"
```

Audit logs usam prefixo: `aud_` + random + timestamp

### 4.4 Soft Delete vs Hard Delete

- **Padeiros**: Soft delete (`deletado = true`). Listagens filtram com `deletado: { $ne: true }`.
- **Admins**: Soft delete (`deletado = true`).
- **Atividades/Cronogramas/Metas/Avaliações**: Hard delete (DELETE FROM).
- **Clientes**: Sync completo (deleta tudo e reimporta).

---

## 5. API — Endpoints Completos

### 5.1 Autenticação (`/api/auth/`)

| Método | Rota                    | Auth | Descrição                        |
|--------|-------------------------|------|----------------------------------|
| POST   | `/api/auth/login`       | ❌   | Login com nome/email + senha     |
| POST   | `/api/auth/google`      | ❌   | Login com Google ID Token        |
| POST   | `/api/auth/first-access`| ❌   | Solicitar e-mail de primeiro acesso |
| POST   | `/api/auth/set-password` | ❌  | Definir senha via token de primeiro acesso |

### 5.2 Admin / Management (`/api/admin/`, `/api/management/`)

| Método | Rota                         | Auth      | Roles                         | Descrição                      |
|--------|------------------------------|-----------|-------------------------------|--------------------------------|
| GET    | `/api/admin/users`           | ✅ admin  | admin, gestor_geral, master   | Lista todos usuários           |
| POST   | `/api/admin/users`           | ✅ admin  | admin, gestor_geral, master   | Cria usuário                   |
| DELETE | `/api/admin/users/:id`       | ✅ admin  | admin, gestor_geral, master   | Exclui usuário (cascade)       |
| PUT    | `/api/management/users/:id`  | ✅ admin  | admin, gestor_geral, master   | Atualiza usuário (troca role)  |
| POST   | `/api/admin/sync-clientes`   | ✅ admin  | admin, gestor_geral, master   | Sincroniza clientes do JSON    |

### 5.3 Master Gestor (`/api/master-gestor/`)

| Método | Rota                                | Auth            | Descrição                        |
|--------|-------------------------------------|-----------------|----------------------------------|
| GET    | `/api/master-gestor/dashboard`      | ✅ master_gestor | Dashboard executivo consolidado  |
| PUT    | `/api/master-gestor/metas`          | ✅ master_gestor | Atualiza metas comerciais        |

### 5.4 Atividades (`/api/atividades/`)

| Método | Rota                    | Auth    | Descrição                        |
|--------|-------------------------|---------|----------------------------------|
| GET    | `/api/atividades`       | ✅      | Lista atividades (filtro por role)|
| POST   | `/api/atividades`       | ✅      | Inicia nova atividade            |
| PUT    | `/api/atividades/:id`   | ✅      | Atualiza atividade (step-by-step)|
| DELETE | `/api/atividades/reset` | ✅ admin| Reseta todas atividades          |

### 5.5 Cronograma (`/api/cronograma/`)

| Método | Rota                           | Auth    | Descrição                      |
|--------|--------------------------------|---------|--------------------------------|
| GET    | `/api/cronograma`              | ✅      | Lista tarefas do cronograma    |
| GET    | `/api/admin/agenda-semanal`    | ✅      | Agenda semanal por filial      |
| POST   | `/api/cronograma`              | ✅ admin| Cria tarefa                    |
| PUT    | `/api/cronograma/:id`          | ✅ admin| Atualiza tarefa                |
| PUT    | `/api/cronograma/:id/status`   | ✅      | Atualiza status da tarefa      |
| DELETE | `/api/cronograma/:id`          | ✅ admin| Exclui tarefa                  |
| DELETE | `/api/cronograma`              | ✅ admin| Exclui cronograma do período   |
| GET    | `/api/cronograma/padeiro-agenda`| ✅ padeiro| Agenda pessoal do padeiro     |
| GET    | `/api/cronograma/progress`     | ✅      | Progresso do padeiro no dia    |

### 5.6 Tracking/GPS (`/api/tracking/`)

| Método | Rota                            | Auth    | Descrição                     |
|--------|---------------------------------|---------|-------------------------------|
| GET    | `/api/tracking/trail/:userId`   | ✅ admin| Trilha GPS de um dia          |
| POST   | `/api/tracking/update`          | ✅      | Atualiza localização (HTTP)   |
| POST   | `/api/tracking/sync`            | ✅      | Sincroniza pontos offline     |
| DELETE | `/api/tracking/reset/all`       | ✅ admin| Reseta todo histórico GPS     |
| DELETE | `/api/tracking/trail/:userId`   | ✅ admin| Reseta GPS de um padeiro      |

### 5.7 Estatísticas (`/api/stats/`)

| Método | Rota                        | Auth    | Descrição                      |
|--------|-----------------------------|---------|--------------------------------|
| GET    | `/api/stats`                | ✅ admin| Dashboard geral com KPIs       |
| GET    | `/api/stats/filiais`        | ✅      | Métricas por filial            |
| GET    | `/api/stats/filiais/:nome`  | ✅      | Detalhe de uma filial          |

### 5.8 Auditoria (`/api/auditoria/`)

| Método | Rota                        | Auth    | Descrição                       |
|--------|-----------------------------|---------|----------------------------------|
| GET    | `/api/auditoria/logs`       | ✅ admin| Logs de login com filtros       |
| GET    | `/api/auditoria/dashboard`  | ✅ admin| Dashboard de compliance         |
| GET    | `/api/auditoria/padeiro/:id`| ✅ admin| Histórico detalhado de padeiro  |

### 5.9 Outros Endpoints

| Método | Rota                        | Auth    | Descrição                      |
|--------|-----------------------------|---------|--------------------------------|
| GET    | `/api/padeiros`             | ✅      | Lista padeiros                 |
| GET    | `/api/produtos`             | ✅      | Lista produtos                 |
| GET    | `/api/clientes`             | ✅      | Lista clientes                 |
| GET    | `/api/metas`                | ✅      | Lista metas                    |
| GET    | `/api/avaliacoes`           | ✅      | Lista avaliações               |
| GET    | `/api/criterios`            | ✅      | Lista critérios de avaliação   |
| GET    | `/api/ping`                 | ❌      | Health check                   |
| GET    | `/api/app-version`          | ❌      | Versão atual do APK            |
| GET    | `/api/foto-produto/:codigo` | ❌      | Foto de produto (FTP → cache)  |
| GET    | `/api/push/vapid-public-key`| ❌      | Chave pública VAPID            |
| POST   | `/api/push/subscribe`       | ✅      | Inscrever push                 |
| POST   | `/api/push/notify`          | ✅ admin| Notificar padeiros inativos    |

---

## 6. Frontend SPA — Navegação

O frontend é uma **SPA pura (Vanilla JS)** sem framework. A navegação é controlada por `App.navigate()` em `app.js`.

### 6.1 Telas por Perfil

#### Admin/Gestor
- `dashboard` → Dashboard principal com KPIs, rankings, gráficos
- `gestao` → Agenda semanal drag-and-drop
- `padeiros` → CRUD de padeiros
- `produtos` → Catálogo de produtos
- `clientes` → Lista de clientes
- `metas` → Gestão de metas
- `avaliacoes` → Avaliações e feedback
- `rastreamento` → Mapa GPS tempo real (Leaflet)
- `timeline` → Timeline de eventos
- `relatorios` → Relatórios e exportação PDF
- `filiais` → Visão multi-filial
- `auditoria` → Painel de compliance/auditoria
- `dev` → Ferramentas de desenvolvimento (admin only)

#### Master Gestor
- `master-gestor` → Dashboard executivo
- `master-metas` → Metas comerciais por filial

#### Padeiro (Mobile)
- `padeiro-dashboard` → Dashboard pessoal
- `padeiro-agenda` → Agenda do dia
- `padeiro-flow` → Fluxo de atividade step-by-step (core mobile):
  1. Selecionar cliente
  2. Check-in GPS
  3. Registrar produtos e quantidades
  4. Fotos da produção
  5. Assinatura digital do cliente
  6. Avaliação do atendimento
  7. Finalizar

### 6.2 Persistência de Estado (localStorage)

```
brago_token  → JWT token de autenticação
brago_user   → JSON do usuário logado {id, nome, email, role, filial...}
```

---

## 7. Integrações Externas

### 7.1 Google Drive
- **Arquivo**: `data/googleDriveService.js`
- **Uso**: Backup de fotos de atividades, APK, fotos de produtos
- **Cache**: `data/drive-mappings.json` (filename → driveFileId)
- **Ativação**: Requer `google-drive-config.json` com credenciais

### 7.2 FTP Brago (Fotos de Produtos)
- **Endpoint**: `GET /api/foto-produto/:codigo`
- **Host**: `cloud-6010.reposit.com.br:30037`
- **Fluxo**: Cache local → Google Drive → FTP download sequencial
- **Cache**: `data/produtos_cache/`

### 7.3 Web Push / Firebase
- **Arquivo**: `data/pushService.js`
- **VAPID**: Requer `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` no `.env`
- **FCM**: Requer `firebase-admin` + `google-services.json`

### 7.4 Email (Nodemailer)
- **Arquivo**: `data/emailService.js`
- **Uso**: Primeiro acesso do padeiro (link para definir senha)

### 7.5 CRON interno
- **checkAndAlertInactiveBakers()**: Roda a cada 2 horas, envia push para padeiros que têm tarefas pendentes mas não registraram atividade (entre 9h e 17h).

---

## 8. APK Android (Capacitor)

### 8.1 Configuração

**`capacitor.config.json`**:
```json
{
  "appId": "com.brago.smartgestor",
  "appName": "Smart Gestor",
  "webDir": "public",
  "plugins": { "CapacitorHttp": { "enabled": true } }
}
```

### 8.2 Plugins Capacitor Utilizados

| Plugin                                | Uso                          |
|---------------------------------------|------------------------------|
| `@capacitor/core` v8.4                | Core Capacitor               |
| `@capacitor/android` v8.4             | Plataforma Android           |
| `@capacitor/camera` v8.2              | Captura de fotos             |
| `@capacitor/app` v8.1                 | Lifecycle do app             |
| `@capacitor/push-notifications` v8.1  | Push nativo (FCM)            |
| `@capacitor/local-notifications` v8.2 | Notificações locais          |
| `@capacitor-community/background-geolocation` v1.2 | GPS background |

### 8.3 Build do APK

```bash
# 1. Sincronizar o web com o projeto Android
npx cap sync android

# 2. Build do APK (via Gradle)
cd android
./gradlew assembleRelease

# O APK fica em: android/app/release/SmartGestor.apk
```

### 8.4 Distribuição do APK

O APK é servido pelo próprio servidor em:
- `GET /smartgestor.apk` ou `GET /SmartGestor.apk`
- Prioridade: `public/smartgestor.apk` → `android/app/release/SmartGestor.apk` → Google Drive

### 8.5 Versionamento do APK

- **Endpoint**: `GET /api/app-version`
- Verifica `app-version.json` no Google Drive primeiro
- Fallback: versão estática `1.0.1`
- O APK nativo checa essa rota no startup e mostra modal de atualização se houver versão mais recente

### 8.6 GPS Background no APK

O GPS em background usa `@capacitor-community/background-geolocation` e sincroniza com o servidor via:
1. **Socket.IO** (quando online, tempo real)
2. **HTTP POST `/api/tracking/update`** (fallback quando socket cai)
3. **HTTP POST `/api/tracking/sync`** (batch de pontos offline)

---

## 9. Socket.IO — Eventos em Tempo Real

### 9.1 Eventos do Servidor → Cliente

| Evento                     | Dados                      | Descrição                       |
|---------------------------|----------------------------|---------------------------------|
| `location-broadcast`      | `[{userId, coords, ...}]` | Todas localizações ativas       |
| `location-broadcast-single`| `{userId, newPoints}`     | Sync de pontos de um user       |
| `activity-updated`        | `{...atividade}`           | Atividade criada/atualizada     |
| `agenda-updated`          | `{action, tarefa}`         | Cronograma alterado             |

### 9.2 Eventos do Cliente → Servidor

| Evento                | Dados                      | Descrição                       |
|----------------------|----------------------------|---------------------------------|
| `update-location`    | `{userId, coords, ...}`   | Enviar posição GPS              |
| `timeline-event`     | `{userId, action, ...}`   | Registrar evento de timeline    |

---

## 10. ⛔ REGRAS DE PROTEÇÃO — LEIA ANTES DE ALTERAR QUALQUER COISA

### 10.1 🔴 NUNCA ALTERE (Arquivos Críticos)

Estes arquivos são a espinha dorsal do sistema. **Qualquer alteração pode derrubar o sistema inteiro**:

1. **`data/mysqlDB.js`** — O wrapper do banco. Se quebrar, NENHUMA operação funciona.
   - A classe `SqlCollection` implementa interface Mongoose-like sobre MySQL.
   - Os métodos `buildWhere()`, `find()`, `create()`, `findByIdAndUpdate()` são usados por TODOS os controllers.
   - **NÃO altere a assinatura de nenhum método**.

2. **`data/db-adapter.js`** — Ponto único de exportação dos models.
   - Todos os controllers fazem `require('../data/db-adapter')`.
   - Se mudar o export, quebra tudo.

3. **`middleware/auth.js`** — Middleware de autenticação/autorização.
   - Qualquer alteração na lista `allowed` do `adminOnly` afeta TODAS as rotas admin.
   - O `authMiddleware` popula `req.user` — se quebrar, nenhuma rota autenticada funciona.

4. **`data/init-mysql.js`** — Schema do banco + migrações.
   - **NUNCA remova colunas** existentes (quebraria dados em produção).
   - **Apenas ADICIONE** colunas novas (com `ALTER TABLE ADD COLUMN IF NOT EXISTS`).
   - Respeite o padrão de migração inline existente.

5. **`config/index.js`** — Variáveis de ambiente.
   - `JWT_SECRET` é compartilhado entre todos os tokens. Alterar invalida TODOS os logins ativos.
   - `GOOGLE_CLIENT_ID` é fixo para o projeto Brago no Google Cloud.

### 10.2 🟡 CUIDADO AO ALTERAR

1. **`server.js`** — Entry point do servidor.
   - Contém lógica inline (FTP proxy, push routes, CRON, APK serving).
   - Adicionar middlewares ANTES do `express.static` pode causar problemas de performance.
   - O `app.get('*')` é o SPA fallback e DEVE ser a última rota registrada.

2. **`routes/index.js`** — Registra todos os sub-routers.
   - A ordem importa (rotas específicas antes de genéricas).
   - Cuidado com conflito de paths.

3. **Controllers que fazem CASCADE delete**:
   - `management.controller.js → deleteUser()`: Deleta padeiro + todas atividades + metas + avaliações + cronograma.
   - `cronograma.controller.js → deleteAllTarefas()`: Desassocia atividades (`cronogramaId = null`).
   - `atividades.controller.js → listAtividades()`: Auto-deleta atividades órfãs.

4. **`public/js/padeiro-flow.js`** (109KB):
   - É o **core do fluxo mobile**. Contém o step-by-step inteiro de produção.
   - Alterar a ordem dos steps ou os campos enviados pode corromper dados de atividade.
   - Testar SEMPRE no mobile após qualquer mudança.

5. **`public/sw.js`** — Service Worker:
   - **Incrementar `CACHE_NAME`** a cada mudança no frontend (atualmente `brago-padeiro-v63`).
   - Se esquecer de incrementar, os usuários continuam vendo a versão antiga cacheada.

### 10.3 🟢 SEGURO PARA ALTERAR

1. **CSS**: Qualquer arquivo em `public/css/` pode ser alterado livremente.
2. **Novos controllers**: Crie novos em `controllers/` seguindo o padrão existente.
3. **Novas rotas**: Adicione em `routes/` e registre em `routes/index.js`.
4. **Novos módulos JS**: Adicione em `public/js/` e inclua em `index.html`.
5. **Dados seed**: `data/*.json` são dados de backup/seed, não afetam produção.
6. **Scripts utilitários**: Arquivos na raiz como `check*.js`, `export*.js`, `fix*.js`.

### 10.4 Checklist Obrigatório Antes de Commitar

- [ ] Rodou `node server.js` e o servidor subiu sem erros?
- [ ] Testou login de admin E padeiro?
- [ ] Se alterou endpoint existente, testou com o frontend?
- [ ] Se alterou frontend, incrementou `CACHE_NAME` no `sw.js`?
- [ ] Se adicionou coluna no banco, usou `ALTER TABLE ADD COLUMN IF NOT EXISTS`?
- [ ] Se alterou `padeiro-flow.js`, testou no celular (via rede local ou ngrok)?
- [ ] Se alterou permissões/roles, verificou que não fechou acesso a algo que funciona?

---

## 11. Padrões de Código

### 11.1 Backend — Controllers

```javascript
// Padrão de controller
const { Model1, Model2 } = require('../data/db-adapter');

exports.myAction = async (req, res) => {
  try {
    // 1. Validação de input
    if (!req.body.campo) return res.status(400).json({ error: 'Campo obrigatório' });
    
    // 2. Verificação de permissão (se necessário além do middleware)
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
    
    // 3. Lógica de negócio
    const resultado = await Model1.find({ filtro });
    
    // 4. Resposta
    res.json(resultado);
  } catch (error) {
    console.error('Contexto do erro:', error);
    res.status(500).json({ error: 'Mensagem amigável em português' });
  }
};
```

### 11.2 Frontend — Módulos JS

```javascript
// Padrão de módulo frontend (SPA)
const MeuModulo = {
  async init() {
    // Carregar dados
    const response = await fetch('/api/endpoint', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('brago_token')}` }
    });
    const data = await response.json();
    this.render(data);
  },
  
  render(data) {
    document.getElementById('container').innerHTML = `...HTML...`;
  }
};
```

### 11.3 Filtro por Filial (padrão recorrente no backend)

```javascript
// Padrão para filtrar por filial do gestor regional
if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
  const filiais = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
  const padeirosDaFilial = await Padeiro.find({ filial: { $in: filiais } });
  const ids = padeirosDaFilial.map(p => p.id);
  resultado = resultado.filter(item => ids.includes(item.padeiroId));
}
```

---

## 12. Variáveis de Ambiente (.env)

```bash
# Servidor
PORT=3000
JWT_SECRET=brago-padeiro-secret-2026
BASE_URL=http://localhost:3000

# MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=sistema_padeiro

# Google OAuth
GOOGLE_CLIENT_ID=222151940219-ithbdoleku13oqpo58qaglbmtddq1m02.apps.googleusercontent.com

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@brago.com.br

# Google Drive (opcional)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
```

---

## 13. Como Adicionar uma Nova Feature (Guia Passo a Passo)

### Nova rota de API:

1. Crie o controller: `controllers/meuModulo.controller.js`
2. Crie o arquivo de rotas: `routes/meuModulo.routes.js`
3. Registre em `routes/index.js`: `router.use('/meu-modulo', require('./meuModulo.routes'));`
4. Se precisar de nova tabela, adicione em `data/init-mysql.js` (array `TABLES`)
5. Adicione o model em `data/mysqlDB.js` (no `module.exports` no final)
6. Teste com `node server.js`

### Nova tela no frontend:

1. Crie o JS em `public/js/meuModulo.js`
2. Adicione o `<script>` em `public/index.html`
3. Adicione a rota em `public/js/app.js` (função `navigate`)
4. Adicione CSS necessário em `public/css/`
5. Incremente `CACHE_NAME` em `public/sw.js`
6. Adicione os novos arquivos em `LOCAL_ASSETS` no `sw.js`

### Nova coluna no banco:

```javascript
// Em data/init-mysql.js, na seção de migrações da tabela:
try {
  const [cols] = await pool.query("SHOW COLUMNS FROM minha_tabela");
  const colNames = cols.map(c => c.Field);
  if (!colNames.includes('minhaNovaColuna')) {
    await pool.execute("ALTER TABLE minha_tabela ADD COLUMN minhaNovaColuna VARCHAR(255)");
  }
} catch (e) {
  console.log('Migração:', e.message);
}
```

---

## 14. Problemas Conhecidos e Dívida Técnica

1. **Mongoose models legado**: `data/models.js` define schemas Mongoose mas o banco real é MySQL. Este arquivo é LEGADO e NÃO é utilizado em produção.

2. **Dados seed na pasta `data/`**: Arquivos `.json` e `.db` são dados de backup/migração, NÃO são o banco real.

3. **FTP credentials hardcoded**: Em `server.js` linhas 103-109 e 156-161. Deveria ser `.env`.

4. **CSP muito permissiva**: Linha 27 de `server.js` permite `unsafe-inline`, `unsafe-eval`, etc.

5. **CORS origin: "*"**: Socket.IO aceita conexão de qualquer origem.

6. **Service Worker cache**: Precisa incrementar manualmente `CACHE_NAME` a cada deploy.

7. **Frontend monolítico**: `padeiro-flow.js` (109KB), `styles.css` (111KB), `dev.js` (75KB) são arquivos muito grandes.

8. **Sem testes automatizados**: O projeto não tem testes unitários ou de integração.
