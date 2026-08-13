---
audience: agent
status: current
verified_against: scripts/prepare-inspetor-demo.mjs
size: 213
---

# Padrão: demo interativa dos módulos no deck

> **Carregue sob demanda.** 213 linhas. Só leia se for embutir uma demo nova —
> os gotchas medidos aqui custaram caro e não cabem num resumo.

Este doc explica como integrar o HTML de um módulo (Planner / Personaliza / Inspetor) como demo interativa dentro de um slide do deck. Foi escrito depois da integração do **Planner** — o mesmo passo-a-passo vale pra adicionar os outros.

> **Status atual.** As demos do **Planner** e do **Personaliza** foram aposentadas: os produtos estão no ar e os slides linkam direto pra eles (`links` em `src/content/modules.ts` → `planner.nukibr.com`, `admin.nukibr.com`, `structa.nukibr.com`). `scripts/prepare-planner-demo.mjs` e `public/demos/planner/` foram removidos junto. **O único demo vivo é o Inspetor** — e `scripts/prepare-inspetor-demo.mjs` é a referência de código deste doc. O padrão segue válido pra módulos sem produto público acessível ao prospect. Trechos abaixo que citam o Planner são exemplos históricos dos patches, não arquivos existentes.

## Convenção de paths

| Papel                 | Localização                                             |
| --------------------- | ------------------------------------------------------- |
| HTML original         | `src/HTML/Nuki-<NomeDoModulo>-Embed.html`               |
| Imagens injetadas     | `src/HTML/assets/*.webp`                                |
| Script de trim/unpack | `scripts/prepare-<slug>-demo.mjs`                       |
| HTML pronto (público) | `public/demos/<slug>/index.html`                        |
| Pattern React (data)  | `src/content/modules.ts` → `demoUrl`  |

`<slug>` = `planner`, `personaliza`, `inspetor`.

## Como ler os HTMLs (importante)

Os HTMLs são gerados pelo Claude Design em wrapper `__bundler`. **Milhões de bytes em poucas centenas de linhas gigantes** (manifest + template em uma linha só) — o export atual do Inspetor tem 5,7 MB em ~400 linhas. O `Read` do Claude Code estoura o token limit.

Formas seguras de inspecionar:

- `head -n 40 <arquivo>` — vê o loader (as primeiras 40 linhas são o skeleton HTML + script de decodificação)
- `sed -n '<start>,<end>p'` — extrai range específico
- Node script — `fs.readFileSync` + regex + `console.log`

Preferir delegar a análise pra um agente Explore com prompt específico (ver seção "Como adicionar um módulo novo" abaixo).

## Estrutura do wrapper `__bundler`

Todo HTML segue o mesmo formato:

- `<script type="__bundler/manifest">` — JSON com N entries `{uuid: {data: base64, compressed: bool, type: mime}}`. Entradas `compressed: true` são gzip-encoded.
- `<script type="__bundler/template">` — JSON com o HTML do template (`<div id="root">` + tags `<script type="text/babel">` referenciando UUIDs por blob URL)
- Loader nas linhas ~40-170 — descompacta manifest, cria blob URLs, injeta template em `document.body.innerHTML`, boota o React

## Os 3 patches conceituais (em cada HTML)

Cada Claude Design tem um módulo App com estado inicial que abre numa "landing" (dashboard, lista de projetos, etc.). Pra virar demo interativa que abre já dentro de UM item pré-selecionado, aplicamos 3 patches no módulo App:

1. **Screen inicial** — `React.useState('<landing>')` vira `React.useState('<primeira_tela_interna>')`. Nomes variam por módulo (Planner: `'dashboard'` → `'typologies'`).

2. **Item selecionado** — `React.useState(null)` do "projeto/vistoria/etc" ativo vira lazy init: `React.useState(() => (window.<Data>Global || {}).<ITEM_FIXO> || null)`. Depende de haver um global no data module (Planner: `window.PlannerData.THE_PROJECT`).

3. **Intercept do navigate** — a função `const navigate = (dest, params = {}) => {` ganha um early check: `if (dest === '<landing>') dest = '<primeira_tela_interna>';`. Isso protege contra sidebar / breadcrumbs / etc que tentem levar o user de volta pra landing.

Além disso, injeta uma **ESC bridge** no `<head>` (postMessage) — genérica, reutilizável:

```js
window.addEventListener('keydown', function(e){
  if (e.key === 'Escape' && window.parent !== window) {
    e.preventDefault();
    try { window.parent.postMessage({ type: 'nuki-demo:esc' }, '*'); } catch(_){}
  }
}, { capture: true });
```

## Variante: App-in-template (Inspetor)

Nem todo módulo tem o App root num entry do manifest. O **Inspetor** define
`PrototypeFlow` + `App` inline dentro de `<script type="__bundler/template">`,
num bloco `<script type="text/babel">`. Sinal: procurar por `function PrototypeFlow`
ou similar dentro do template — se aparecer, o trim opera contra a string do
template, não contra entries de manifest (que passam intactas).

Fluxo dessa variante:

1. Extrair template com regex `<script type="__bundler/template">([\s\S]*?)<\/script>`.
2. `JSON.parse(match[1].trim())` → string plana do template (é uma string JSON-encoded).
3. Aplicar patches direto na string (regex sobre JSX literal — `<TweaksPanel>`, `useState("login")`, etc).
4. **Gotcha do JSON.stringify** — o template original grava tags de fechamento como
   `<\/Tag>` (com `/` escapado) pro parser HTML não terminar o `<script type="__bundler/template">`
   no primeiro `</` do payload. `JSON.stringify` do Node **não** re-escapa `/`, então
   a saída teria `</Tag>` literal e o browser fecharia o `<script>` ali, arruinando
   o loader. Mitigação obrigatória — mesma que o próprio loader do bundler usa em
   `window.__resources`:
   ```js
   const encoded = JSON.stringify(patched).replace(/<\//g, "<\\/");
   ```
5. Re-injetar via `html.replace(TEMPLATE_RE, `<script type="__bundler/template">${encoded}</script>`)`.

**Patches canônicos 1/2/3 são opcionais nessa variante.** Se o fluxo original
do protótipo já é aceitável como demo (ex: Inspetor mantém `login → emp → torres →
unidades → overview → inspect → report`), pula patches 1 e 3 — não tem tela pulada
pra proteger. Pula patch 2 se não houver estado top-level de "item atual" com
data global pra fazer o seed (Inspetor tem só `item`/`room` que legitimamente
começam null e são setados por clique). No caso do Inspetor, o único patch é o
strip do `<TweaksPanel>` (rail de dev tooling do Claude Design que não deveria
aparecer pro prospect).

Referência histórica: essa variante descreve o export **anterior** do Inspetor
(`src/HTML/Nuki Inspector - Protótipo (offline).html`). O export atual é a
variante `x-dc` logo abaixo.

## Variante: x-dc (Inspetor, export atual)

O export atual do Inspetor (`src/HTML/Nuki-Inspetor-Embed.html`) vem de uma
geração mais nova do Claude Design. Diferenças que importam:

- O app é um `<script type="text/x-dc" data-dc-script data-props="…">` dentro do
  template, com componente em classe (`class Component extends DCLogic`) — não
  há `PrototypeFlow`, `function App` nem bloco `text/babel`.
- Não há `<TweaksPanel>` — o rail de dev tooling sumiu, então **não existe patch
  de conteúdo a aplicar**. O script pula o round-trip do template inteiro nesse
  caso (ver abaixo).
- `data-props` traz `$preview: { width: 390, height: 844 }`: o protótipo é
  desenhado como app de celular. Na prática ele se vira bem num iframe largo —
  renderiza uma coluna de 390px centrada (medido: `x = 445` num frame de 1280).
- O documento externo vem cru: `<title>Bundled Page</title>` e `<html>` sem
  `lang`. O script reescreve os dois — mas note que o loader troca o
  `documentElement` no boot, então isso é cosmético e some em runtime.
- Assets 100% self-contained (manifest base64, inclusive React via
  `__bundler/ext_resources`). Nada de rede.

### 🔴 Gotcha do `$` na string de substituição

`TEMPLATE_RE` tem um grupo de captura. Passar uma **string** de substituição pro
`String.replace` faz `$1` dentro dela expandir pro template capturado. O export
x-dc contém exatamente um `$1` — na chamada de mascaramento de e-mail da tela de
login, cujo segundo argumento é a string `"$1•••••"`.

Resultado medido ao rodar a transformação antiga contra o arquivo novo:

```
OLD  dollarTokens: {}        bloat: 0        reparse: ok
NEW  dollarTokens: {$1: 1}   bloat: 188000   reparse: FAILED
     Bad control character in string literal in JSON at position 184010
```

188 KB de payload cru entram no meio da string JSON, o
`<script type="__bundler/template">` deixa de parsear e a demo abre em branco —
**e o script imprimia sucesso e saía com código 0**. Sempre usar um replacer
*function*, que não interpreta `$`:

```js
html.replace(TEMPLATE_RE, () => `<script type="__bundler/template">${encoded}</script>`);
```

O script hoje ainda guarda contra isso de três formas: só reinjeta o template se
algum patch mudou alguma coisa, aborta se a saída crescer muito além dos patches
esperados, e faz `JSON.parse` do template que está prestes a escrever. Um
template corrompido continua sendo HTML válido — esse re-parse é a única
checagem que realmente pega o problema.

## Colocar imagens reais no lugar dos placeholders

O protótipo do Inspetor sai do Claude Design com caixas cinza
`PLACEHOLDER · FOTO DE REFERÊNCIA` / `PLACEHOLDER · FOTO DA OBRA`. O script
troca essas caixas por fotos reais **em um item só** — Reserva Atlântica ›
Torre A › Cobertura 1801 › Sala de estar › Piso (`Porcelanato Portobello
Eternal 90×90`). Os demais itens continuam com o placeholder original, que é o
comportamento certo: uma foto de porcelanato embaixo de "Tinta paredes" seria
pior do que o cinza.

Onde os arquivos moram: `src/HTML/assets/*.webp`, **não** `public/`. A demo é um
documento único e autocontido; um arquivo em `public/` seria uma segunda
requisição HTTP que o HTML exportado não consegue fazer fora do deck.

Como os bytes entram no bundle — usando o mecanismo do próprio bundler, não
data-URI na marcação:

1. O script insere uma entry por foto no `<script type="__bundler/manifest">`
   (`{"mime":"image/webp","compressed":false,"data":"<base64>"}`), por splice de
   texto logo depois da chave de abertura. Base64 não contém `<`, então nenhuma
   das preocupações de escape que valem pro template valem aqui.
2. O loader faz `template.split(uuid).join(blobUrls[uuid])` sobre a string
   inteira do template. Ou seja: **um uuid cru em qualquer lugar** vira a blob
   URL — atributo de markup ou código do componente, tanto faz. O script usa
   isso pra montar `Component.FOTOS`, uma tabela `esp → {esp, exe}` dentro do
   próprio componente.
3. Quatro props derivadas (`fotoEspImg` / `fotoEspPh` / `fotoExeImg` /
   `fotoExePh`) saem daí, e a marcação só **acrescenta** `background-image` ao
   fim do `style` que já existia, mais uma troca de `display` na label cinza.
   Nada de elemento novo, nada de `<sc-if>` novo — o `background-image` depois
   do shorthand `background:` ganha a cascata sem apagar a cor de fallback.

São 15 âncoras (5 superfícies: aba Especificado, aba Executado, as duas camadas
da cortina "Comparar em detalhe", os dois painéis do visor de tela cheia, mais
os 3 pontos no código do componente). **Cada âncora precisa casar exatamente uma
vez** — o script aborta se casar 0 ou 2+. Essa é a única defesa contra um export
novo mudar o markup e o patch virar no-op silencioso.

## Estrutura do trim script

Ver `scripts/prepare-inspetor-demo.mjs` como referência (único script sobrevivente). Fluxo canônico da variante manifest, como era feito no Planner:

1. Ler HTML
2. Regex extrair manifest JSON
3. Loop nas entries, decodificar (gzip if compressed)
4. String search por assinatura textual em cada entrada. Só a entrada que contém os patterns é decodificada + patchada — resto passa direto
5. Aplicar 3 patches via regex
6. Re-encoder como `compressed: false` + base64 plano (mais fácil pra debug/manutenção)
7. Injetar ESC bridge no `<head>` do HTML string
8. Escrever output

Contadores de patches aplicados no fim do script — se algum for 0, avisa (regex desatualizada).

## Lado React (já genérico, não precisa reescrever)

Tudo já espera novos módulos:

- `ModuleData.demoUrl?: string` — só setar em `src/content/modules.ts` pro módulo alvo
- `src/deck/defaults.ts` emite um nó `module-demo` logo depois do módulo quando `demoUrl` existe, com `parentId` apontando pro pai
- `ModuleSlide.tsx` troca "Saiba mais" por CTA "▷ Explorar o {título}" quando o nó tem `childId` — isto é, quando a demo sobreviveu ao config resolvido, e não quando `demoUrl` meramente existe
- `ModuleDemoSlide.tsx` — layout fullscreen (barra 44px sticky + iframe), botões `← Voltar` e `Seguir →`, e o estado de ativação da demo
- `DeckBehaviors.tsx` — reemite o postMessage `nuki-demo:esc` do iframe como o evento de janela `nuki-demo:exit`
- CSS `.module-demo-*` — cobre desktop + fallback mobile (<900px mostra "abrir em nova aba")

**Clique-para-ativar.** O iframe fica com `pointer-events: none` enquanto o slide
não tem `.is-active`. Isso não é enfeite: o documento embedado tem
`overscroll-behavior: none` e nenhum scroller interno, então um iframe vivo
engole a roda do mouse sem rolar nada e sem repassar o evento — a apresentação
parece travada. Inerte, o scroll atravessa. O CTA `▷ Explorar` dispara
`nuki-demo:activate` com o id do demo, então quem chega por ele já entra ativo.

**Encaixe do slide.** `.module-demo-slide` usa `scroll-snap-align: start` +
`scroll-snap-stop: always`, com `scroll-snap-type: y proximity` na raiz. Nada de
`overflow: hidden` — o antigo `html.demo-locked` congelava o deck num offset
arbitrário e chegava a deixar a barra de saída fora da tela.

**Falta só**: adicionar `<link rel="prefetch" href="/demos/<slug>/index.html" as="document" />` no `<div>` root de `page.tsx` pro novo demo (opcional mas melhora perceived perf).

## Como adicionar um módulo novo

1. Investigar o HTML — delegar pra Explore agent com prompt específico. Perguntas essenciais:
   - Qual UUID do módulo App? (o que tem o `useState('landing')`)
   - Qual é a `landing screen` e qual é a primeira screen interna razoável?
   - Qual o nome do state var do item ativo? (`project`, `vistoria`, `checklist`, …)
   - Qual o nome do data global? (`window.PlannerData`, `window.InspetorData`, …)
   - O item hardcoded no global tem nome próprio? (`THE_PROJECT`, `THE_VISTORIA`, …)
2. Copiar `scripts/prepare-inspetor-demo.mjs` → `scripts/prepare-<slug>-demo.mjs`
3. Ajustar constantes `SRC`, `OUT_DIR`, `OUT` no topo
4. Adaptar as regexes de cada patch pro pattern do novo módulo (nome do state var, screen, global)
5. Rodar: `node scripts/prepare-<slug>-demo.mjs`
6. Verificar contadores no output: os 3 patches devem sair como 1 cada. Se 0, revisa regex
7. Em `src/content/modules.ts`, adicionar `demoUrl: "/demos/<slug>/index.html"` no módulo
8. No layout raiz do grupo `(deck)`, adicionar `<link rel="prefetch" ... />` do novo path
9. `npx tsc --noEmit && npm run check`
10. Abrir `/fast#<slug>` no browser, testar: CTA "▷ Explorar" abre já ativo, iframe carrega, ← Voltar / Seguir → funcionam, ESC no iframe funciona (bridge), o scroll atravessa a demo quando ela está inerte e o slide encaixa alinhado

## Gotchas

- **Reading da HTML gigante** — nunca use `Read` tool nele. Use `head`/`sed`/Node.
- **CRLF/LF warnings** no `git add` — Windows, inofensivo.
- **Foco no iframe + ESC** — resolvido pela ESC bridge injetada. Sem ela, ESC do parent não funciona quando prospect clica dentro do iframe.
- **Módulos mobile-first** (Inspetor provavelmente) vão precisar de tratamento CSS diferente. HTML do Planner é desktop-fixed sidebar 212px + grids 4-col; se o novo módulo é responsivo, o iframe pode escalar melhor. Testar em mobile antes de dar por fechado.
- **Prefetch** só faz sentido pro módulo que o prospect mais provavelmente vai abrir. Se prefetch todos os 3, você baixa 4.5MB no primeiro load. Manter só o principal ou nenhum, à escolha.
- **Manifest entries que precisam ser patchadas** — normalmente é 1 (o módulo App). Se o script log mostrar > 1 sendo patchada, revisar (talvez algum regex está pegando algo genérico demais).
