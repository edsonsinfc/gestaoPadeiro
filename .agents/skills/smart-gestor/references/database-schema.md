# SmartGestor — Schema do Banco de Dados MySQL

> Referência completa de todas as 16 tabelas, com tipos e constraints.
> Fonte: `data/init-mysql.js`

---

## Tabela: `padeiros`

Armazena os técnicos/padeiros de campo. Login via tabela `padeiros`.

```sql
CREATE TABLE IF NOT EXISTS padeiros (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255),
  cargo VARCHAR(255),           -- "Padeiro", "Técnico", etc.
  funcao VARCHAR(255),
  filial VARCHAR(255),          -- "Brago Brasília", "Brago Goiania", etc.
  localTrabalho VARCHAR(255),
  dataNascimento VARCHAR(50),
  cpf VARCHAR(50),
  rg VARCHAR(50),
  pis VARCHAR(50),
  carteiraTrabalho VARCHAR(50),
  numSerie VARCHAR(50),
  email VARCHAR(255),           -- Email principal (usado para login)
  emailPessoal VARCHAR(255),
  emailCorporativo VARCHAR(255),
  telefone VARCHAR(50),
  estado VARCHAR(100),
  codigoExterno VARCHAR(100),
  desligado VARCHAR(10),
  codTec VARCHAR(50),           -- Código técnico (indexado)
  dataAdmissao VARCHAR(50),
  fusoHorario VARCHAR(100),
  passwordHash TEXT,            -- bcrypt hash
  firstAccessToken TEXT,        -- JWT para primeiro acesso
  firstAccessExpiry VARCHAR(50),
  ativo BOOLEAN DEFAULT TRUE,
  deletado BOOLEAN DEFAULT FALSE, -- Soft delete
  role VARCHAR(50) DEFAULT 'padeiro', -- Sempre 'padeiro' nesta tabela
  criadoEm VARCHAR(100),
  atualizadoEm VARCHAR(100)
);
```

**Relações**:
- `padeiros.id` → referenciado por `atividades.padeiroId`
- `padeiros.id` → referenciado por `cronogramas.padeiroId`
- `padeiros.id` → referenciado por `metas.padeiroId`
- `padeiros.id` → referenciado por `avaliacoes.padeiroId`
- `padeiros.id` → referenciado por `localizacoes.userId`
- `padeiros.id` → referenciado por `historico_localizacoes.userId`
- `padeiros.id` → referenciado por `timeline_events.padeiroId`
- `padeiros.id` → referenciado por `push_subscriptions.padeiroId`
- `padeiros.id` → referenciado por `audit_logs.userId`

---

## Tabela: `admins`

Armazena admin, gestores e master_gestor. Login via tabela `admins`.

```sql
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255),
  email VARCHAR(255),
  passwordHash TEXT,
  role VARCHAR(50) DEFAULT 'admin',  -- 'admin' | 'gestor_geral' | 'gestor_regional' | 'master_gestor'
  filial VARCHAR(255),               -- NULL para admin/gestor_geral, específica para regional
  ativo BOOLEAN DEFAULT TRUE,
  deletado BOOLEAN DEFAULT FALSE,
  criadoEm VARCHAR(100),
  atualizadoEm VARCHAR(100)
);
```

**Roles possíveis**:
- `admin` — Acesso total, ferramentas dev
- `master_gestor` — Dashboard executivo, metas comerciais
- `gestor_geral` — Multi-filial, CRUD usuários
- `gestor_regional` — Restrito à filial especificada

---

## Tabela: `atividades`

Registros de produção dos padeiros. Cada atividade é um atendimento a um cliente.

```sql
CREATE TABLE IF NOT EXISTS atividades (
  id VARCHAR(50) PRIMARY KEY,
  padeiroId VARCHAR(50),          -- FK → padeiros.id
  padeiroNome VARCHAR(255),       -- Desnormalizado para performance
  clienteId VARCHAR(50),          -- FK → clientes.id
  clienteNome VARCHAR(255),
  cronogramaId VARCHAR(50),       -- FK → cronogramas.id (NULL se atividade avulsa)
  produtoId VARCHAR(50),
  produtoNome VARCHAR(255),
  kgTotal DOUBLE,                 -- Total em Kg produzido
  lTotal DOUBLE,                  -- Total em Litros
  status VARCHAR(50),             -- 'em_andamento' | 'finalizada'
  data VARCHAR(50),               -- 'YYYY-MM-DD' (indexado)
  hora VARCHAR(20),
  inicioEm VARCHAR(100),          -- ISO timestamp início
  terminadoEm VARCHAR(100),       -- ISO timestamp término
  fimEm VARCHAR(100),
  tempoMinimoMinutos INT DEFAULT 0, -- Tempo mínimo obrigatório (do cronograma)
  fotos TEXT,                     -- JSON array de URLs de fotos
  assinatura LONGTEXT,            -- Base64 da assinatura do cliente
  localizacao TEXT,               -- Endereço textual
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  observacao TEXT,
  notaCliente INT,                -- Nota do cliente (1-5)
  notaPadeiroCliente INT,
  kgItens TEXT,                   -- JSON array: [{produtoId, produtoNome, quantidade, unidade}]
  lastStep INT DEFAULT 0,         -- Último step completado no fluxo mobile (1-7)
  timeline TEXT,                  -- JSON: eventos dentro da atividade
  atualizadoEm VARCHAR(100)
);
```

**Status possíveis**: `em_andamento` → `finalizada`

**Campo `kgItens`** (JSON):
```json
[
  { "produtoId": "abc123", "produtoNome": "Farinha Ireks", "quantidade": 25, "unidade": "KG" },
  { "produtoId": "def456", "produtoNome": "Fermento Bio", "quantidade": 2, "unidade": "L" }
]
```

---

## Tabela: `cronogramas`

Agenda/cronograma semanal dos padeiros.

```sql
CREATE TABLE IF NOT EXISTS cronogramas (
  id VARCHAR(50) PRIMARY KEY,
  padeiroId VARCHAR(50),         -- FK → padeiros.id
  padeiroNome VARCHAR(255),
  codTec VARCHAR(50),
  clienteId VARCHAR(50),         -- FK → clientes.id
  clienteNome VARCHAR(255),
  data VARCHAR(50),              -- 'YYYY-MM-DD' (indexado)
  horario VARCHAR(20),           -- 'HH:MM'
  status VARCHAR(50),            -- 'pendente' | 'concluida' | 'cancelada'
  tempoMinimoMinutos INT DEFAULT 0,
  posicao INT DEFAULT 0,         -- Ordem no dia
  observacao TEXT,
  criadoPor VARCHAR(255),        -- ID do gestor que criou
  criadoEm VARCHAR(100),
  atualizadoEm VARCHAR(100)
);
```

**Status possíveis**: `pendente` → `concluida` ou `cancelada`

---

## Tabela: `produtos`

```sql
CREATE TABLE IF NOT EXISTS produtos (
  id VARCHAR(50) PRIMARY KEY,
  codigo VARCHAR(50),            -- Código do produto no ERP/FTP
  descricao TEXT,
  fornecedor VARCHAR(255),
  fotoPath TEXT,                 -- URL da foto (local ou Drive)
  ativo BOOLEAN DEFAULT TRUE,
  criadoEm VARCHAR(100)
);
```

---

## Tabela: `clientes`

```sql
CREATE TABLE IF NOT EXISTS clientes (
  id VARCHAR(50) PRIMARY KEY,
  codigo VARCHAR(50),
  numero VARCHAR(50),
  nome VARCHAR(255),
  nomeFantasia VARCHAR(255),
  ramoAtividade VARCHAR(255),
  cnpj VARCHAR(50),
  inscricaoEstadual VARCHAR(50),
  telefone VARCHAR(50),
  endereco TEXT,
  bairro VARCHAR(255),
  cidade VARCHAR(255),
  estado VARCHAR(100),
  cep VARCHAR(20),
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  horarioAbertura VARCHAR(20),
  horarioFechamento VARCHAR(20),
  diasFuncionamento TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criadoEm VARCHAR(100)
);
```

---

## Tabela: `avaliacoes`

```sql
CREATE TABLE IF NOT EXISTS avaliacoes (
  id VARCHAR(50) PRIMARY KEY,
  padeiroId VARCHAR(50),
  padeiroNome VARCHAR(255),
  clienteId VARCHAR(50),
  clienteNome VARCHAR(255),
  atividadeId VARCHAR(50),       -- FK → atividades.id
  tipo VARCHAR(50),              -- 'cliente' | 'gestor' | 'auto'
  respostas TEXT,                -- JSON: respostas do formulário
  nota DOUBLE,                   -- 0-5
  avaliadoPor VARCHAR(255),      -- ID de quem avaliou
  avaliadoPorNome VARCHAR(255),
  observacao TEXT,
  criadoEm VARCHAR(100)
);
```

---

## Tabela: `metas`

```sql
CREATE TABLE IF NOT EXISTS metas (
  id VARCHAR(50) PRIMARY KEY,
  padeiroId VARCHAR(50),
  padeiroNome VARCHAR(255),
  metaKg DOUBLE,                 -- Meta em Kg/mês
  periodo VARCHAR(100),          -- 'YYYY-MM' (mês)
  tipo VARCHAR(100),
  observacao TEXT,
  criadoPor VARCHAR(255),
  criadoEm VARCHAR(100),
  atualizadoEm VARCHAR(100)
);
```

---

## Tabela: `localizacoes` (última posição conhecida)

```sql
CREATE TABLE IF NOT EXISTS localizacoes (
  id VARCHAR(50) PRIMARY KEY,    -- = userId do padeiro
  userId VARCHAR(50),
  userName VARCHAR(255),
  filial VARCHAR(255),
  lat DOUBLE,
  lng DOUBLE,
  accuracy DOUBLE,
  lastUpdate VARCHAR(100)
);
```

---

## Tabela: `historico_localizacoes` (trilha GPS)

```sql
CREATE TABLE IF NOT EXISTS historico_localizacoes (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50),            -- INDEX
  userName VARCHAR(255),
  lat DOUBLE,
  lng DOUBLE,
  accuracy DOUBLE,
  timestamp VARCHAR(100),        -- INDEX
  INDEX (userId),
  INDEX (timestamp)
);
```

---

## Tabela: `timeline_events`

```sql
CREATE TABLE IF NOT EXISTS timeline_events (
  id VARCHAR(50) PRIMARY KEY,
  padeiroId VARCHAR(50),         -- INDEX
  padeiroNome VARCHAR(255),
  action VARCHAR(100),           -- 'checkin', 'checkout', 'pause', etc.
  lat DOUBLE,
  lng DOUBLE,
  accuracy DOUBLE,
  source VARCHAR(50),
  timestamp VARCHAR(100),        -- INDEX
  clienteId VARCHAR(50),
  clienteNome VARCHAR(255),
  INDEX (padeiroId),
  INDEX (timestamp)
);
```

---

## Tabela: `audit_logs`

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50),            -- INDEX
  userName VARCHAR(255),
  userRole VARCHAR(50),
  action VARCHAR(50),            -- INDEX: 'login', 'login_google', 'login_failed'
  ip VARCHAR(100),
  userAgent TEXT,
  platform VARCHAR(50),          -- 'web', 'android', 'ios'
  filial VARCHAR(255),
  timestamp VARCHAR(100),        -- INDEX
  INDEX (userId),
  INDEX (timestamp),
  INDEX (action)
);
```

---

## Tabela: `push_subscriptions`

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  padeiroId VARCHAR(255),
  endpoint TEXT,
  keys_p256dh TEXT,
  keys_auth TEXT,
  isNative BOOLEAN DEFAULT FALSE,
  fcmToken TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Tabelas Auxiliares

### `colaboradores`
```sql
CREATE TABLE IF NOT EXISTS colaboradores (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255),
  cargo VARCHAR(255),
  filial VARCHAR(255),
  emailPessoal VARCHAR(255),
  emailCorporativo VARCHAR(255),
  telefone VARCHAR(50),
  criadoEm VARCHAR(100)
);
```

### `criterios`
```sql
CREATE TABLE IF NOT EXISTS criterios (
  id VARCHAR(50) PRIMARY KEY,
  texto TEXT,
  tipo VARCHAR(50)
);
```

### `cronograma_templates`
```sql
CREATE TABLE IF NOT EXISTS cronograma_templates (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  itens TEXT NOT NULL,           -- JSON array de itens do template
  criadoPor VARCHAR(50),
  criadoEm VARCHAR(100),
  atualizadoEm VARCHAR(100)
);
```

---

## Migrações Inline

O sistema NÃO usa ferramentas de migração (Knex, Sequelize, etc.).
As migrações são feitas inline em `data/init-mysql.js` usando o padrão:

```javascript
// Padrão seguro para adicionar coluna
const [cols] = await pool.query("SHOW COLUMNS FROM tabela");
const colNames = cols.map(c => c.Field);
if (!colNames.includes('novaColuna')) {
  await pool.execute("ALTER TABLE tabela ADD COLUMN novaColuna TIPO");
}
```

**NUNCA use DROP COLUMN ou ALTER COLUMN para renomear** — sempre ADICIONE novas.
