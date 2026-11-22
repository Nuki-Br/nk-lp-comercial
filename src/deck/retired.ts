import type { DeckConfig } from "@/deck/types";

/* O que este deck deixou de renderizar, e como um documento guardado perde isso.

   O slide de plano saiu do produto (ADR 26), mas um `config_snapshot` congelado
   antes disso ainda traz o nó `pricing` e os campos de plano em `estimate`. O
   braço `default` do registry já devolveria `null` para o `kind` desconhecido
   (ADR 18) — só que o nó continuaria `enabled`, e `anchorsOf` desenharia um
   ponto de nav apontando para uma âncora que não existe no DOM. Isso apaga o
   progress-nav inteiro, em silêncio. Então o nó sai na LEITURA, antes de
   qualquer consumidor vê-lo.

   Nada aqui escreve no banco. O snapshot fica como foi congelado; quem o
   republica grava um documento que já nasce sem essas chaves.

   Livre de React e de `server-only`, como o resto de `src/deck/`: a DAL e o
   `parseDeckOverride` usam, e nenhum dos dois pode puxar um componente. */

/** Tipos de slide que já existiram e não renderizam mais. */
const RETIRED_KINDS: ReadonlySet<string> = new Set(["pricing"]);

/** Campos de `estimate` que só o slide de plano lia. */
const RETIRED_ESTIMATE_KEYS = ["plans", "billingCycles", "maxMonths", "defaultMonths"] as const;

/** Rótulos do frame de fechamento que só a linha de plataforma lia. */
const RETIRED_TOTAL_LABELS = [
  "platform",
  "noMonthsHint",
  "monthsHintTemplate",
  "monthOne",
  "monthOther",
] as const;

const without = <T extends object>(source: T, keys: readonly string[]): T => {
  const out = { ...(source as Record<string, unknown>) };
  for (const key of keys) delete out[key];
  return out as T;
};

/** Um `estimate` (inteiro ou parcial) sem os campos de plano. */
export function stripRetiredEstimate<T extends object>(estimate: T): T {
  return without(estimate, RETIRED_ESTIMATE_KEYS);
}

/**
 * Um config guardado, sem o que foi aposentado.
 *
 * Idempotente, e a identidade num config escrito por este build — é o que
 * mantém `buildDefaultDeck()` um ponto fixo também daqui.
 */
export function stripRetired(config: DeckConfig): DeckConfig {
  const slides = config.slides
    .filter((node) => !RETIRED_KINDS.has(node.kind))
    .map((node) =>
      node.kind === "total"
        ? { ...node, labels: without(node.labels, RETIRED_TOTAL_LABELS) }
        : node,
    );

  return { ...config, slides, estimate: stripRetiredEstimate(config.estimate) };
}
