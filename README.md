# nk-lp-comercial

Apresentação comercial da Nuki — o deck que o time usa para apresentar a
plataforma a incorporadoras e construtoras. Roda em `/`, protegido por senha.

Vive num repositório próprio (separado do [`nk-lp`](https://github.com/Nuki-Br/nk-lp),
a landing page pública) porque os dois dividiam o mesmo app Next.js e as sessões
de pitch contaminavam as métricas de marketing. **Este repo não tem analytics
nenhum, de propósito.**

## Rodando local

```bash
npm install
cp .env.example .env.local   # e defina a senha
npm run dev
```

Abre em `http://localhost:3000`. Sem `NEXT_PUBLIC_DECK_PASSWORD` definida, o
código cai no fallback `nuki2026`.

## Os slides

Na ordem em que aparecem. A âncora é o `id` da seção — dá pra pular direto pra
qualquer uma com `/#ancora`.

| # | Slide | Componente | Âncora | Copy em |
|---|---|---|---|---|
| 1 | Capa | `CoverSlide` | `#cover` | no componente |
| 2 | O problema | `ProblemSlide` | `#problem` | `content/deck.ts` |
| 3 | O que é a Nuki | `WhatIsNukiSlide` | `#what-is-nuki` | `content/deck.ts` |
| 4 | Planner | `ModuleSlides` | `#planner` | `content/modules.ts` |
| 5 | Personaliza | `ModuleSlides` | `#personaliza` | `content/modules.ts` |
| 6 | Inspetor | `ModuleSlides` | `#inspetor` | `content/modules.ts` |
| 7 | Demo do Inspetor | `ModuleDemoSlide` | `#inspetor-demo` | protótipo em iframe |
| 8 | Diferenciais | `DifferentiatorsSlide` | `#differentiators` | `content/deck.ts` |
| 9 | Pra quem serve | `AudienceSlide` | `#audience` | `content/deck.ts` |
| 10 | Cases | `CasesSlide` | `#cases` | no componente |
| 11 | Plano & contato | `PricingSlide` | `#pricing` | `content/deck.ts` |
| 12 | Estime o setup | `CalculatorSlide` | `#calculator` | `content/deck.ts` |
| 13 | Total estimado | `EstimatedTotalSlide` | `#total` | no componente |

Navegação: `←` `→`, `PageUp` / `PageDown`, `Espaço`, `Home` / `End`, ou os pontos
na lateral direita.

## Editando o conteúdo

Quase tudo que muda antes de um pitch — copy, preço do plano, ciclos de desconto,
defaults da calculadora — está em `src/content/`, sem tocar em componente. Ver
[`docs/content-guide.md`](docs/content-guide.md).

**Regra de ouro:** pode mudar o que está entre aspas; não mude o que vem antes
dos dois-pontos.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run check` | typecheck + lint |

## Deploy

Vercel, a partir da branch `main`. Definir `NEXT_PUBLIC_DECK_PASSWORD` no
projeto antes do primeiro deploy. Ver [`docs/deployment.md`](docs/deployment.md).

## Documentação

| Doc | Assunto |
|---|---|
| [`AGENTS.md`](AGENTS.md) | regras e invariantes para desenvolvimento por IA |
| [`docs/architecture.md`](docs/architecture.md) | camadas, contrato dos slides, comportamento |
| [`docs/content-guide.md`](docs/content-guide.md) | editar copy e preços sem mexer em código |
| [`docs/demo-embedding.md`](docs/demo-embedding.md) | embutir a demo de um módulo em iframe |
| [`docs/deployment.md`](docs/deployment.md) | Vercel, env, redirects |
| [`docs/decisions.md`](docs/decisions.md) | por que as coisas são como são |
| [`docs/pending-css-rename.md`](docs/pending-css-rename.md) | limpeza de CSS morto ainda pendente |
| [`docs/context/`](docs/context/README.md) | contexto de produto e negócio (fonte da copy) |

## O que este repo não tem

Analytics, testes, CMS, router. Cada ausência é deliberada — os motivos estão em
[`docs/decisions.md`](docs/decisions.md).
