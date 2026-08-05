import type { DeckOverride } from "@/deck/overrides";
import type { DeckConfig, EstimateConfig, SlideNode } from "@/deck/types";

const isDev = process.env.NODE_ENV !== "production";

/** Só as chaves com valor definido. `JSON` nunca produz `undefined`, mas um
    override montado à mão na etapa 3 pode — e `{ maxMonths: undefined }` não
    pode apagar o default. */
const defined = <T extends object>(patch: T | undefined): Partial<T> => {
  if (!patch) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
};

/**
 * Aplica um patch de estimativa.
 *
 * NÃO é um deep merge genérico. Arrays SUBSTITUEM, nunca concatenam: um
 * override parcial de `plans` tem que trocar o plano, não acrescentar um
 * segundo card ao lado do default. `imagePrices`, `defaults` e
 * `customRoomDefaults` mesclam um nível raso, pra que dar override só em
 * `imagePrices.base` não zere `option`.
 */
export function mergeEstimate(
  base: EstimateConfig,
  patch?: Partial<EstimateConfig>,
): EstimateConfig {
  if (!patch) return base;
  const p = defined(patch);

  return {
    // substituição inteira
    plans: p.plans ?? base.plans,
    billingCycles: p.billingCycles ?? base.billingCycles,
    projectSizePresets: p.projectSizePresets ?? base.projectSizePresets,
    roomPresets: p.roomPresets ?? base.roomPresets,
    defaultRooms: p.defaultRooms ?? base.defaultRooms,
    maxMonths: p.maxMonths ?? base.maxMonths,
    // merge raso de um nível
    imagePrices: { ...base.imagePrices, ...defined(p.imagePrices) },
    customRoomDefaults: { ...base.customRoomDefaults, ...defined(p.customRoomDefaults) },
    defaults: { ...base.defaults, ...defined(p.defaults) },
  };
}

/** Reordena por id. Ids desconhecidos são pulados (ADR 13: um rollback não pode
    derrubar um pitch); nós não citados vão pro fim na ordem original, então uma
    ordem parcial funciona. */
function applyOrder(slides: SlideNode[], order?: string[]): SlideNode[] {
  if (!order?.length) return slides;

  const byId = new Map(slides.map((n) => [n.id, n]));
  const out: SlideNode[] = [];
  const taken = new Set<string>();

  for (const id of order) {
    const node = byId.get(id);
    if (node && !taken.has(id)) {
      out.push(node);
      taken.add(id);
    }
  }
  for (const node of slides) if (!taken.has(node.id)) out.push(node);

  return out;
}

function applyEnabled(slides: SlideNode[], hidden?: string[], shown?: string[]): SlideNode[] {
  if (!hidden?.length && !shown?.length) return slides;
  const hide = new Set(hidden ?? []);
  const show = new Set(shown ?? []);

  return slides.map((n) => {
    // `shown` por último: uma reativação explícita ganha.
    if (show.has(n.id)) return { ...n, enabled: true };
    if (hide.has(n.id)) return { ...n, enabled: false };
    return n;
  });
}

/**
 * Recalcula tudo que é fato entre-nós, DEPOIS de ordenar e desabilitar.
 *
 * Idempotente por construção: todo campo derivado é recomputado do zero, nunca
 * acumulado. É isso que faz `buildDefaultDeck()` ser um ponto fixo e, por
 * consequência, `resolveDeckConfig(base, null)` ser deep-equal a `base`.
 *
 * Nenhum passo aqui menciona `kind`.
 */
export function normalizeDeck(config: DeckConfig): DeckConfig {
  // 1. Unicidade de id. Duplicatas fazem getElementById pegar o primeiro, acendem
  //    dois pontos e dobram a caminhada por seta — tudo em silêncio.
  const seen = new Set<string>();
  const unique: SlideNode[] = [];
  for (const node of config.slides) {
    if (seen.has(node.id)) {
      if (isDev) throw new Error(`DeckConfig: id de slide duplicado "${node.id}"`);
      console.warn(`DeckConfig: id de slide duplicado "${node.id}" — descartando o segundo`);
      continue;
    }
    seen.add(node.id);
    unique.push(node);
  }

  // 2. Órfãos: um nó cujo pai sumiu ou está desabilitado morre junto. É o
  //    backstop pra "esconder o módulo inspetor mas manter a demo dele", que
  //    apontaria `data-nav-id` pra um ponto inexistente e apagaria o nav.
  const aliveById = new Map(unique.map((n) => [n.id, n]));
  const surviving = unique.filter((n) => {
    if (!n.parentId) return true;
    const parent = aliveById.get(n.parentId);
    return !!parent?.enabled;
  });

  // 3. Reancoragem: filho toma o ponto do pai emprestado e senta logo depois
  //    dele. Uma `order` que separou os dois é reparada, não rejeitada.
  const ordered: SlideNode[] = [];
  const children = new Map<string, SlideNode[]>();
  for (const n of surviving) {
    if (n.parentId) {
      const list = children.get(n.parentId) ?? [];
      list.push({ ...n, navId: n.parentId, inNav: false });
      children.set(n.parentId, list);
    }
  }
  for (const n of surviving) {
    if (n.parentId) continue;
    const kids = children.get(n.id) ?? [];
    // 4. `childId` é derivado — e a CHAVE SOME quando não há filho. Setar
    //    `undefined` quebraria o round-trip JSON (stringify descarta a chave).
    const { childId: _drop, ...rest } = n;
    ordered.push(kids.length ? { ...rest, childId: kids[0].id } : (rest as SlideNode));
    ordered.push(...kids);
  }

  // 5. Ordinais por grupo, sobre os nós HABILITADOS na ordem final — é o que
  //    mantém os numerais de fundo em 01/02/03 quando um módulo é escondido.
  const counters = new Map<string, number>();
  const numbered = ordered.map((n) => {
    if (!n.ordinalGroup || !n.enabled) return n;
    const next = (counters.get(n.ordinalGroup) ?? 0) + 1;
    counters.set(n.ordinalGroup, next);
    return { ...n, ordinal: next };
  });

  // 6. Checagem de ordem, só aviso. O validador que REJEITA é da etapa 2
  //    (`src/server/config/validate.ts`, ver docs/testing.md); aqui o resultado
  //    degradado é um R$ 0 no frame de fechamento, não uma página quebrada.
  if (isDev) {
    const ids = numbered.filter((n) => n.enabled).map((n) => n.id);
    const calc = ids.indexOf("calculator");
    const total = ids.indexOf("total");
    if (calc !== -1 && total !== -1 && total < calc) {
      console.warn('DeckConfig: "total" vem antes de "calculator" — o fechamento lerá zeros.');
    }
  }

  return { ...config, slides: numbered };
}

/**
 * `base` + delta → o config que renderiza.
 *
 * `resolveDeckConfig(base, null)` é deep-equal a `base`. Isso NÃO é
 * curto-circuito: `normalizeDeck` roda sempre, mesmo sem override. Um
 * `if (!override) return base` deixaria a identidade verdadeira por vacuidade e
 * esconderia o caso em que `buildDefaultDeck()` sai da forma normal — que é
 * justamente o que o teste precisa pegar.
 */
export function resolveDeckConfig(base: DeckConfig, override: DeckOverride | null): DeckConfig {
  const next: DeckConfig = structuredClone(base);

  if (override) {
    next.document = { ...next.document, ...defined(override.document) };
    next.estimate = mergeEstimate(next.estimate, override.estimate);
    next.slides = applyEnabled(
      applyOrder(next.slides, override.order),
      override.hidden,
      override.shown,
    );
  }

  return normalizeDeck(next);
}
