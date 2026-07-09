# SmartGestor — Guardrails e Regras de Segurança para o Agente

> Este documento define o que o agente PODE e NÃO PODE fazer ao trabalhar no SmartGestor.
> O objetivo é proteger a integridade do sistema em produção.

---

## 🔴 PROIBIÇÕES ABSOLUTAS

### 1. Nunca deletar dados de produção diretamente

**NÃO FAÇA**:
```javascript
// Deletar todos os padeiros!
await Padeiro.deleteMany({});

// Deletar todas as atividades!
await Atividade.deleteMany({});
```

**POR QUÊ**: O sistema está em produção com dados reais de padeiros da Brago.
Qualquer `deleteMany({})` sem filtro é irreversível.

**FAÇA EM VEZ DISSO**:
```javascript
// Soft delete com filtro específico
await Padeiro.findByIdAndUpdate(id, { deletado: true });
```

---

### 2. Nunca alterar o schema de tabelas existentes de forma destrutiva

**NÃO FAÇA**:
```sql
ALTER TABLE atividades DROP COLUMN fotos;
ALTER TABLE padeiros RENAME COLUMN email TO emailLogin;
ALTER TABLE cronogramas MODIFY COLUMN status VARCHAR(10); -- reduzir tamanho
```

**FAÇA EM VEZ DISSO**:
```javascript
// Adicionar coluna nova (verificando se já existe)
const [cols] = await pool.query("SHOW COLUMNS FROM atividades");
const colNames = cols.map(c => c.Field);
if (!colNames.includes('novaColuna')) {
  await pool.execute("ALTER TABLE atividades ADD COLUMN novaColuna VARCHAR(255)");
}
```

---

### 3. Nunca quebrar a interface do mysqlDB.js

O `SqlCollection` em `data/mysqlDB.js` é o coração do sistema.
Estes métodos **NÃO PODEM ter assinatura alterada**:

```
find(query)         → retorna array-like thenable
findOne(query)      → retorna doc ou null
findById(id)        → retorna doc ou null
create(doc)         → retorna doc criado
findByIdAndUpdate(id, update, options)
findByIdAndDelete(id)
deleteMany(query)
updateMany(query, update)
countDocuments(query)
```

Se precisar de nova funcionalidade no DB, **adicione métodos novos**, nunca altere os existentes.

---

### 4. Nunca remover ou reordenar rotas registradas em routes/index.js

**NÃO FAÇA**:
```javascript
// Remover uma rota existente
// router.use('/atividades', require('./atividades.routes')); ← NÃO COMENTE
```

**POR QUÊ**: O frontend e o APK dependem de todas as rotas existentes.
Remover uma rota quebra o app para todos os usuários logados.

---

### 5. Nunca alterar o JWT_SECRET em produção

O `JWT_SECRET` está em `.env` e `config/index.js`.
**Alterar invalida TODOS os tokens ativos** — todos os usuários seriam deslogados imediatamente.

---

### 6. Nunca alterar os valores de role dos usuários existentes sem testar

Os roles `admin`, `gestor_geral`, `gestor_regional`, `master_gestor`, `padeiro` são hardcoded
em múltiplos lugares do frontend e backend. Adicionar um novo role requer:

1. Atualizar `middleware/auth.js` (lista `allowed`)
2. Atualizar todos os controllers que checam `req.user.role`
3. Atualizar o frontend (`app.js`, `auth.js`) para renderizar a tela correta

---

## 🟡 ATENÇÃO REDOBRADA

### 7. Service Worker — SEMPRE incrementar CACHE_NAME

**Toda vez** que alterar qualquer arquivo em `public/`:

```javascript
// public/sw.js — LINHA 1
const CACHE_NAME = 'brago-padeiro-v63'; // ← INCREMENTAR para v64, v65...
```

Se esquecer, usuários verão a versão antiga cacheada mesmo após deploy.

---

### 8. Campos permitidos em atividades (allowedFields)

Em `atividades.controller.js`, há uma whitelist `allowedFields` que controla
quais campos do body são aceitos. Se adicionar nova coluna em `atividades`:

1. Adicione a coluna no schema (`init-mysql.js`)
2. Adicione o campo em `allowedFields` no `createAtividade()` e `updateAtividade()`

```javascript
const allowedFields = [
  'id', 'padeiroId', 'padeiroNome', 'clienteId', 'clienteNome', 'cronogramaId',
  'produtoId', 'produtoNome', 'kgTotal', 'lTotal', 'status', 'data', 'hora',
  'inicioEm', 'terminadoEm', 'fimEm', 'tempoMinimoMinutos', 'fotos',
  'assinatura', 'localizacao', 'latitude', 'longitude', 'observacao', 'observacaoCliente',
  'notaCliente', 'notaPadeiroCliente', 'kgItens', 'atualizadoEm', 'lastStep', 'timeline',
  'NOVO_CAMPO_AQUI'  // ← adicionar aqui
];
```

---

### 9. Lógica de filtro por filial — padrão obrigatório

Todo novo endpoint que retorna dados deve respeitar o filtro de filial para gestores regionais:

```javascript
// PADRÃO OBRIGATÓRIO em todo controller que retorna dados de padeiros/atividades
if (req.user.role !== 'admin' && req.user.filial && req.user.filial !== 'null') {
  const filiais = Array.isArray(req.user.filial) ? req.user.filial : [req.user.filial];
  // ... filtrar por filial
}
```

**Se omitir este filtro**, gestores regionais verão dados de outras filiais. Isso é um vazamento de dados.

---

### 10. padeiro-flow.js — Testar SEMPRE no mobile

Este arquivo (109KB) controla o fluxo completo de atividade do padeiro:
- Steps 1-7 precisam ser executados em ordem
- Campos `lastStep` e `timeline` rastreiam o progresso
- Qualquer mudança na ordem ou nos campos enviados ao servidor pode corromper atividades em andamento

**Após qualquer alteração em `padeiro-flow.js`**:
1. Testar no celular (via ngrok ou rede local com HTTPS)
2. Completar um ciclo completo: check-in → produtos → fotos → assinatura → finalizar
3. Verificar no banco se `atividades.status = 'finalizada'` e `kgItens` está correto

---

### 11. Cascade delete — cuidado ao deletar usuários

`management.controller.js → deleteUser()` faz cascade delete:
```javascript
// Ao deletar padeiro:
await Padeiro.findByIdAndDelete(userId);
await Atividade.deleteMany({ padeiroId: userId });   // ← deleta TODO histórico
await Meta.deleteMany({ padeiroId: userId });
await Avaliacao.deleteMany({ padeiroId: userId });
await Cronograma.deleteMany({ padeiroId: userId });
```

Antes de deletar um usuário, confirmar se o usuário realmente deve ser removido
ou se deveria apenas ser desativado (`ativo = false`).

---

## 🟢 BOAS PRÁTICAS OBRIGATÓRIAS

### 12. Sempre validar input no backend

```javascript
// NUNCA confie no frontend
if (!req.body.campo) return res.status(400).json({ error: 'Campo obrigatório' });
if (typeof req.body.nota !== 'number' || req.body.nota < 0 || req.body.nota > 5) {
  return res.status(400).json({ error: 'Nota inválida (0-5)' });
}
```

---

### 13. Usar try/catch em todos os controllers

```javascript
exports.meuEndpoint = async (req, res) => {
  try {
    // ... lógica
    res.json(resultado);
  } catch (error) {
    console.error('Contexto:', error);
    res.status(500).json({ error: 'Mensagem amigável em português' });
  }
};
```

---

### 14. Emitir socket após alterar cronograma ou atividade

```javascript
const { getIo } = require('../sockets/location.socket');

// Após criar/atualizar atividade:
const io = getIo();
if (io) io.emit('activity-updated', atividade);

// Após criar/atualizar cronograma:
if (io) io.emit('agenda-updated', { action: 'create', tarefa });
```

Se omitir, o dashboard do gestor não atualiza em tempo real.

---

### 15. Logs de auditoria para ações sensíveis

Ações de login já são logadas automaticamente em `auth.controller.js`.
Para novas ações administrativas sensíveis (deletar dados, resetar senha, etc.),
considere adicionar log:

```javascript
await AuditLog.create({
  id: 'aud_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
  userId: req.user.id,
  userName: req.user.nome,
  userRole: req.user.role,
  action: 'minha_acao',
  ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
  userAgent: (req.headers['user-agent'] || '').substring(0, 500),
  platform: 'web',
  filial: req.user.filial || '',
  timestamp: new Date().toISOString()
});
```

---

## Checklist de Revisão Antes de Qualquer PR

```
□ Não removi nenhuma tabela, coluna ou rota existente?
□ Não alterei a assinatura de métodos em mysqlDB.js?
□ Filtro de filial está aplicado em endpoints que retornam dados de padeiros?
□ allowedFields atualizado se adicionei coluna em atividades?
□ CACHE_NAME incrementado em sw.js se alterei qualquer arquivo de public/?
□ Soft delete usado em vez de hard delete para padeiros/admins?
□ try/catch em todos os novos controllers?
□ Nenhuma credencial hardcoded (senhas, tokens, secrets)?
□ Testei no mobile se alterei padeiro-flow.js?
□ Emiti socket events para alterações em cronograma/atividade?
```
