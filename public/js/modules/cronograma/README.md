# Módulo: Cronograma

Kanban semanal (Seg–Sáb) + Visão mensal anual do Sistema Padeiro.

## Arquivos (carregar nesta ordem)

| Arquivo                  | Responsabilidade                        | Linhas |
|--------------------------|-----------------------------------------|--------|
| cronograma.state.js      | Estado inicial e constantes             | ~15    |
| cronograma.styles.js     | CSS mobile dinâmico e accordion         | ~80    |
| cronograma.render.js     | Renderização semanal e navegação        | ~250   |
| cronograma.drag.js       | Drag & drop entre células               | ~180   |
| cronograma.tasks.js      | Formulários e CRUD de tarefas           | ~280   |
| cronograma.mensal.js     | Visão mensal e agenda por mês           | ~120   |
| cronograma.smart.js      | Algoritmo de escala inteligente         | ~100   |

## Como adicionar uma nova função

1. Identifique a categoria (render / tasks / drag / mensal / smart)
2. Abra o arquivo correspondente
3. Adicione dentro do `Object.assign(Cronograma, { ... })`
4. Não mexa nos outros arquivos

## Dependências externas usadas

- `API` — chamadas HTTP (get, post, put, delete)
- `Components` — modais, toasts, ícones, loading
- `lucide` — ícones via `data-lucide`

## Ordem de carregamento no HTML

```html
<script src="modules/cronograma/cronograma.state.js"></script>
<script src="modules/cronograma/cronograma.styles.js"></script>
<script src="modules/cronograma/cronograma.render.js"></script>
<script src="modules/cronograma/cronograma.drag.js"></script>
<script src="modules/cronograma/cronograma.tasks.js"></script>
<script src="modules/cronograma/cronograma.mensal.js"></script>
<script src="modules/cronograma/cronograma.smart.js"></script>
```
