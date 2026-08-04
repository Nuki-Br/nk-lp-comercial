# nk-lp-comercial

Ferramenta comercial da Nuki. O time monta uma proposta customizada por cliente
e manda um link com senha, prazo de validade e rastreamento — e mantém um deck
genérico pronto pra um pitch de improviso.

Vive num repositório próprio (separado do [`nk-lp`](https://github.com/Nuki-Br/nk-lp),
a landing page pública) porque os dois dividiam o mesmo app Next.js e as sessões
de pitch contaminavam as métricas de marketing. **Este repo não tem analytics de
terceiros, de propósito.**

> **Em construção.** A migração do deck estático pra aplicação acontece em três
> etapas. O status de cada uma está em [`docs/stages/README.md`](docs/stages/README.md)
> — consulte antes de assumir que uma rota existe.

## As superfícies

| Rota | O que é | Portão |
|---|---|---|
| `/admin` | painel onde as propostas são montadas | login (Supabase Auth) |
| `/p/[slug]` | a proposta de um cliente | senha própria, validada no servidor |
| `/fast` | o deck genérico, pra pitch rápido | senha compartilhada |

## Rodando local

```bash
npm install
cp .env.example .env.local   # e preencha as variáveis
npm run dev
```

Abre em `http://localhost:3000`. Sem `NEXT_PUBLIC_DECK_PASSWORD`, o `/fast` cai
no fallback `nuki2026` — é a única variável do projeto com fallback.

## Os slides

A ordem abaixo é o padrão: é o que o `/fast` mostra e o ponto de partida de toda
proposta nova. Numa proposta, quais slides aparecem e em que ordem é configurável
no painel. A âncora é o `id` da seção.

| # | Slide | Componente | Âncora | |
|---|---|---|---|---|
| 1 | Capa | `CoverSlide` | `#cover` | |
| 2 | O problema | `ProblemSlide` | `#problem` | |
| 3 | O que é a Nuki | `WhatIsNukiSlide` | `#what-is-nuki` | |
| 4 | Planner | `ModuleSlides` | `#planner` | |
| 5 | Personaliza | `ModuleSlides` | `#personaliza` | |
| 6 | Inspetor | `ModuleSlides` | `#inspetor` | |
| 7 | Demo do Inspetor | `ModuleDemoSlide` | `#inspetor-demo` | |
| 8 | Diferenciais | `DifferentiatorsSlide` | `#differentiators` | ⚠ oculto |
| 9 | Pra quem serve | `AudienceSlide` | `#audience` | ⚠ oculto |
| 10 | Cases | `CasesSlide` | `#cases` | |
| 11 | Plano & contato | `PricingSlide` | `#pricing` | |
| 12 | Estime o setup | `CalculatorSlide` | `#calculator` | |
| 13 | Total estimado | `EstimatedTotalSlide` | `#total` | |

⚠ **Os dois marcados como ocultos estão comentados em `src/app/page.tsx`**
(commit `e49dd8e`) mas continuam no `deckNav` — então o nav lateral tem dois
pontos que não levam a lugar nenhum. Ver [`docs/tech-debt.md`](docs/tech-debt.md) §6.

Navegação: `←` `→`, `PageUp` / `PageDown`, `Espaço`, `Home` / `End`, ou os pontos
na lateral direita.

## Editando o conteúdo

Os **padrões** — copy, preço do plano, ciclos de desconto, defaults da
calculadora — estão em `src/content/`, sem tocar em componente. Ver
[`docs/content-guide.md`](docs/content-guide.md).

**Regra de ouro:** pode mudar o que está entre aspas; não mude o que vem antes
dos dois-pontos.

Os valores de uma proposta já criada são editados no painel e ficam no banco.
Se ela já foi publicada, guarda uma cópia congelada — editar `src/content/` não
altera um documento que o cliente já recebeu.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome |
| `npm run lint:next` | ESLint, só as regras do Next |
| `npm run check` | typecheck + Biome + ESLint + Vitest |

## Deploy

Vercel, a partir da branch `main`. Supabase pra Postgres e Auth. Ver
[`docs/deployment.md`](docs/deployment.md) — em especial o aviso sobre deploys de
preview herdarem as variáveis de produção.

## Documentação

Comece pelo roteador: **[`docs/README.md`](docs/README.md)**. Ele indexa por
tarefa e manda ler *um* documento, não cinco.

| Doc | Assunto |
|---|---|
| [`AGENTS.md`](AGENTS.md) | as regras e os invariantes. Sem explicações, de propósito |
| [`docs/stages/`](docs/stages/README.md) | as três etapas da construção, em formato de prompt |
| [`docs/architecture.md`](docs/architecture.md) | o que roda onde, e onde fica a fronteira de confiança |
| [`docs/deck-runtime.md`](docs/deck-runtime.md) | contrato dos slides e do DOM |
| [`docs/estimate.md`](docs/estimate.md) | a matemática da calculadora e os números canônicos |
| [`docs/content-guide.md`](docs/content-guide.md) | editar copy e preços sem mexer em código |
| [`docs/testing.md`](docs/testing.md) | o que é testado, o que não é, e os checklists manuais |
| [`docs/deployment.md`](docs/deployment.md) | Vercel, Supabase, env, migrations |
| [`docs/decisions.md`](docs/decisions.md) | por que as coisas são como são |
| [`docs/tech-debt.md`](docs/tech-debt.md) | o que está morto e ainda não foi removido |
| [`docs/demo-embedding.md`](docs/demo-embedding.md) | embutir a demo de um módulo em iframe |
| [`docs/context/`](docs/context/README.md) | contexto de produto e negócio (fonte da copy) |

## O que este repo não tem

Analytics de terceiros, CMS, router de slide, biblioteca de componentes,
biblioteca de gráficos. Cada ausência é deliberada e tem um ADR em
[`docs/decisions.md`](docs/decisions.md).
