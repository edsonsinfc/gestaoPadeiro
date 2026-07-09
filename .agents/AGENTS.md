# AGENTS.md — Regras do Projeto SmartGestor

> Regras de comportamento do agente específicas para este workspace.
> Lidas automaticamente em toda conversa neste projeto.

---

## Identidade do Projeto

Este é o **SmartGestor**, sistema de gestão de produção da **Brago Distribuidora**.
Antes de qualquer trabalho, o agente DEVE carregar a skill `smart-gestor` lendo:

```
.agents/skills/smart-gestor/SKILL.md
```

---

## Regras de Comportamento

### 1. Leia a documentação antes de mexer em qualquer arquivo

Antes de editar qualquer arquivo do projeto, consulte:
- **SKILL.md** — Arquitetura geral, perfis de acesso, padrões de código
- **references/database-schema.md** — Schema completo das 16 tabelas MySQL
- **references/guardrails.md** — O que pode e não pode fazer
- **references/file-map.md** — Mapa rápido de todos os arquivos
- **references/apk-build-guide.md** — Se a tarefa envolver o APK Android

### 2. Nunca altere os 5 arquivos críticos sem aviso explícito

Se a tarefa exigir alteração em qualquer destes arquivos, **pare e confirme com o usuário** antes:

1. `data/mysqlDB.js` — Wrapper do banco (interface Mongoose-like sobre MySQL)
2. `data/db-adapter.js` — Ponto único de exportação dos models
3. `data/init-mysql.js` — Schema + migrações do banco
4. `middleware/auth.js` — JWT auth e controle de acesso por role
5. `config/index.js` — JWT_SECRET e configurações globais

### 3. Sempre usar o padrão de filtro por filial

Todo endpoint novo que retorna dados de padeiros, atividades, cronogramas, avaliações
ou metas **DEVE** incluir o filtro de filial para gestores regionais:

```javascript
if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
  const filiais = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
  // Filtrar dados pela(s) filial(is) do gestor
}
```

### 4. Incrementar CACHE_NAME ao alterar qualquer arquivo em public/

A cada alteração em `public/css/`, `public/js/`, `public/index.html` ou `public/assets/`:

```javascript
// public/sw.js, linha 1:
const CACHE_NAME = 'brago-padeiro-v64'; // ← incrementar versão
```

### 5. Soft delete para padeiros e admins

Nunca deletar padeiros ou admins com hard delete. Sempre usar soft delete:
```javascript
// CORRETO — soft delete
await Padeiro.findByIdAndUpdate(id, { deletado: true, ativo: false });

// ERRADO — hard delete irreversível
await Padeiro.findByIdAndDelete(id);
```
Exceção: o `deleteUser()` no management.controller.js faz hard delete
por design (com cascade), e só deve ser chamado quando o usuário explicitamente
confirmar a exclusão permanente.

### 6. Migrations são sempre aditivas

Nunca remover ou renomear colunas do banco. Apenas adicionar:

```javascript
// SEMPRE verificar se a coluna já existe antes de adicionar
if (!colNames.includes('novaColuna')) {
  await pool.execute("ALTER TABLE tabela ADD COLUMN novaColuna TIPO DEFAULT valor");
}
```

### 7. Emitir socket events após mutations

Ao criar/atualizar atividades ou cronogramas, sempre emitir socket:
```javascript
const io = getIo();
if (io) io.emit('activity-updated', atividade);
if (io) io.emit('agenda-updated', { action: 'update', tarefa });
```

### 8. Idioma do código e mensagens

- **Código**: inglês (nomes de variáveis, funções, etc.)
- **Mensagens de erro para o usuário**: português do Brasil
- **Comentários no código**: português do Brasil
- **Logs de console**: português do Brasil com emojis (padrão do projeto ✅ ❌ 📍 🍞)

### 9. Nunca colocar credenciais hardcoded

Credenciais devem sempre vir de variáveis de ambiente (`.env`):
```javascript
// ERRADO — hardcoded
const secret = 'minha-senha-123';

// CORRETO — variável de ambiente
const secret = process.env.MINHA_SENHA;
```

**Exceção conhecida** (não altere): O FTP em `server.js` tem credenciais hardcoded
(`brago`/`brago@cloud`). Isso é uma dívida técnica conhecida — não introduza mais.

### 10. Padrão de resposta de erro da API

```javascript
// 400 — input inválido
res.status(400).json({ error: 'Mensagem descritiva em português' });

// 401 — não autenticado
res.status(401).json({ error: 'Token não fornecido' });

// 403 — sem permissão
res.status(403).json({ error: 'Acesso negado' });

// 404 — não encontrado
res.status(404).json({ error: 'Recurso não encontrado' });

// 500 — erro interno
res.status(500).json({ error: 'Mensagem amigável', details: error.message });
```

---

## Mapa de Contexto Rápido

### Filiais do sistema
```
Brago Brasília | Brago Goiania | Brago Palmas | Brago Campo Grande
```

### Roles e suas tabelas
```
admin          → tabela admins  | vê tudo, sem filtro de filial
master_gestor  → tabela admins  | dashboard executivo, metas comerciais
gestor_geral   → tabela admins  | multi-filial, CRUD usuários
gestor_regional → tabela admins | filtrado pela filial do usuário
padeiro        → tabela padeiros| só seus próprios dados
```

### Token JWT contém
```javascript
{
  id, email, role, nome,
  filial,           // null para admin/gestor_geral, string para regional
  cargo,            // só para padeiros
  codTec            // só para padeiros
}
```

### Padrão de ID gerado
```javascript
const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
```

### Status de atividade
```
em_andamento → finalizada
```

### Status de cronograma
```
pendente → concluida | cancelada
```

### Steps do padeiro-flow.js (fluxo de atividade)
```
1 → Selecionar cliente
2 → Check-in GPS
3 → Selecionar produtos e quantidades (kgItens)
4 → Registrar fotos de produção
5 → Coletar assinatura digital do cliente
6 → Avaliação do atendimento
7 → Finalizar (status = 'finalizada')
```

---

## Arquivos que Geram o APK

Para qualquer tarefa relacionada ao app Android:

1. Leia `references/apk-build-guide.md` completamente
2. Considere que o `public/` inteiro vai pro APK (via `npx cap sync`)
3. Alterações de UI afetam browser E APK ao mesmo tempo
4. GPS, câmera e push funcionam diferente no APK vs browser
5. O `isNative = window.Capacitor?.isNativePlatform()` distingue os dois ambientes

---

## O que Fazer ao Encontrar um Bug

1. Identifique se é frontend, backend ou banco de dados
2. Verifique o console do servidor (logs com emojis indicam a origem)
3. Verifique o Network tab do browser para ver a resposta da API
4. Leia o controller responsável pelo endpoint afetado
5. **Nunca faça `deleteMany({})` ou `DROP TABLE` para "corrigir" um bug** — isso destrói dados
6. Prefira correções cirúrgicas com filtros específicos

---

## Tarefas Comuns e Como Abordá-las

### "Adicionar novo campo ao perfil do padeiro"
1. Adicionar coluna em `init-mysql.js` (migration inline)
2. Atualizar `allowedFields` no controller relevante
3. Atualizar formulário no frontend
4. Não esquecer de incrementar `CACHE_NAME`

### "Criar novo relatório/dashboard"
1. Criar endpoint em `stats.controller.js` ou novo controller
2. Registrar rota em `routes/`
3. Criar módulo JS em `public/js/`
4. Adicionar na navegação em `app.js`
5. Aplicar filtro de filial se necessário

### "Adicionar nova tela de menu"
1. Criar arquivo JS em `public/js/`
2. Adicionar `<script>` no `public/index.html`
3. Registrar rota em `App.navigate()` de `app.js`
4. Adicionar no menu do perfil correto (admin vs padeiro vs gestor)
5. Criar CSS se necessário em `public/css/`
6. Incrementar `CACHE_NAME` e adicionar arquivos ao `LOCAL_ASSETS` do `sw.js`

### "Corrigir permissão de acesso a endpoint"
1. Identificar qual middleware está na rota (`auditoria.routes.js`, etc.)
2. Verificar se usa `authMiddleware` + `adminOnly` ou middleware customizado
3. Se precisar nova role, atualizar `adminOnly` em `middleware/auth.js`
4. Testar com token de cada perfil afetado

### "Build e publicar novo APK"
1. Fazer alterações no código web (`public/`)
2. `npx cap sync android`
3. `cd android && ./gradlew assembleRelease`
4. Copiar `android/app/release/SmartGestor.apk` para `public/smartgestor.apk`
5. Atualizar `app-version.json` no Google Drive com nova versão
