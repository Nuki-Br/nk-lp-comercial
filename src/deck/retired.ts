import type { DeckConfig } from "@/deck/types";

/* O que este deck deixou de renderizar, e como um documento guardado perde isso.

   Três tipos de slide saíram do produto: o de plano (ADR 26) e, depois, a
   calculadora de imagens com o frame de total (ADR 27). Um `config_snapshot`
   congelado antes disso ainda traz esses nós, o bloco `estimate` inteiro e a
   chave `chrome.allowPriceOverride`. O braço `default` do registry já
   devolveria `null` para o `kind` desconhecido (ADR 18) — só que o nó
   continuaria `enabled`, e `anchorsOf` desenharia um ponto de nav apontando
   para uma âncora que não existe no DOM. Isso apaga o progress-nav inteiro, em
   silêncio. Então o nó sai na LEITURA, antes de qualquer consumidor vê-lo.

   Nada aqui escreve no banco. O snapshot fica como foi congelado; quem o
   republica grava um documento que já nasce sem essas chaves.

   Livre de React e de `server-only`, como o resto de `src/deck/`. */

/** Tipos de slide que já existiram e não renderizam mais. */
const RETIRED_KINDS: ReadonlySet<string> = new Set(["pricing", "calculator", "total"]);

/** O que um documento guardado antes das ADRs 26 e 27 pode trazer a mais. */
type StoredDeckConfig = DeckConfig & {
  estimate?: unknown;
  chrome: DeckConfig["chrome"] & { allowPriceOverride?: unknown };
};

/**
 * Um config guardado, sem o que foi aposentado.
 *
 * Idempotente, e a identidade num config escrito por este build — é o que
 * mantém `buildDefaultDeck()` um ponto fixo também daqui.
 */
export function stripRetired(config: DeckConfig): DeckConfig {
  const { estimate: _estimate, ...rest } = config as StoredDeckConfig;
  const { allowPriceOverride: _allowPriceOverride, ...chrome } = rest.chrome;

  return {
    ...rest,
    slides: rest.slides.filter((node) => !RETIRED_KINDS.has(node.kind)),
    chrome,
  };
}
