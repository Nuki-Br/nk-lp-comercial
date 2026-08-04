# Editando o conteúdo do deck

Este guia é pra quem quer ajustar a apresentação sem mexer em código —
trocar uma frase, corrigir um preço, mudar o desconto de um ciclo.

## As duas regras

1. **Pode mudar o que está entre aspas. Não mude o que vem antes dos
   dois-pontos.** O texto entre aspas é o que aparece na tela; o nome antes dos
   dois-pontos é o que o código usa pra encontrar aquele texto.

   ```ts
   title: "Planejamento",
   //↑ não mexa      ↑ pode mudar à vontade
   ```

2. **Todo texto visível é em português.** Os nomes no código são em inglês. Não
   traduza os nomes pra "ficar consistente" — isso quebra a aplicação.

Depois de editar, rode `npm run check`. Se passar, está válido.

## Onde está cada coisa

Quase tudo vive em dois arquivos: `src/content/deck.ts` e `src/content/modules.ts`.

| Quero mudar… | Arquivo | Procure por |
|---|---|---|
| Os nomes na navegação lateral | `content/deck.ts` | `deckNav` |
| Os 3 cards de "O problema" | `content/deck.ts` | `problemCards` |
| As 3 fases (Planner/Personaliza/Inspetor) | `content/deck.ts` | `moduleFlow` |
| Os diferenciais | `content/deck.ts` | `differentiators` |
| As personas de "Pra quem serve" | `content/deck.ts` | `personas` |
| A lista "quando faz sentido" | `content/deck.ts` | `fitList` |
| **Preço do plano** | `content/deck.ts` | `plans` → `monthlyPrice` |
| O que está incluso no plano | `content/deck.ts` | `plans` → `items` |
| **Ciclos e descontos** | `content/deck.ts` | `billingCycles` → `discount` |
| Defaults da calculadora | `content/deck.ts` | `ESTIMATE_DEFAULTS` |
| Limites dos campos da calculadora | `content/deck.ts` | `ESTIMATE_RANGES` |
| **Preço por imagem** | `content/deck.ts` | `ESTIMATE_DEFAULTS.pricePerImage` |
| Texto e telas de cada módulo | `content/modules.ts` | `modules` |
| Link "Saiba mais" de um módulo | `content/modules.ts` | `learnMoreHref` |
| Botão que abre o app do módulo | `content/modules.ts` | `links` |

Três slides ainda têm o texto dentro do próprio componente: a capa
(`components/slides/CoverSlide.tsx`), os logos de cases
(`components/slides/CasesSlide.tsx`) e o frame de fechamento
(`components/slides/EstimatedTotalSlide.tsx`).

## Detalhes que confundem

**`discount` é fração, não porcentagem.** `0.1` = 10% de desconto. `0` = sem
desconto.

**`monthlyPrice` é número puro, sem "R$" e sem ponto.** `1150`, não `"R$ 1.150"`.
A formatação em reais é automática.

**Títulos partidos em duas partes.** Alguns títulos têm `pre` e `strong` — o
`strong` sai em negrito e é reaproveitado sozinho em botões e textos alternativos.

```ts
title: { pre: "Conheça o", strong: "Planner" },
```

Mantenha o `strong` curto: ele aparece em frases como "Explorar o Planner".

**Trocar o preço por imagem durante uma reunião.** Não precisa mexer no código —
`Ctrl+Alt+K` abre um painel escondido na calculadora que permite ajustar o valor
ao vivo. O valor volta ao default quando a página recarrega.

## Trocando as imagens de um módulo

Cada tela de módulo precisa de **4 arquivos** em `public/jornada/`, com o mesmo
nome-base:

- desktop: `<base>-740.webp`, `<base>-1480.webp`, `<base>-2220.webp`, `<base>-740.png`
- celular: `<base>-320.webp`, `<base>-640.webp`, `<base>-960.webp`, `<base>-320.png`

Se faltar um tamanho, a imagem some em alguns telas sem dar erro. O nome-base vai
no campo `base` dentro de `modules.ts` — e os nomes existentes ficam como estão,
incluindo o typo em `vizualizador-planner`.

## Antes de dizer que está pronto

Se você mudou um número ou uma afirmação sobre o produto, confira contra os
documentos em [`docs/context/`](context/README.md) — é a fonte da verdade sobre
o que a Nuki faz e o que ainda não faz. Alguns números que aparecem nos slides
dos módulos não têm origem registrada; ver o aviso no índice desses documentos.
