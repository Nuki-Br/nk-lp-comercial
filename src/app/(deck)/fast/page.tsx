import { Deck } from "@/components/deck/Deck";
import { buildDefaultDeck } from "@/deck/defaults";
import { resolveDeckConfig } from "@/deck/resolve";

/**
 * O deck genérico, pra um pitch de improviso.
 *
 * Resolve contra `null` — sem banco, sem customização. `/p/[slug]` (etapa 2)
 * resolve o mesmo `buildDefaultDeck()` contra o delta guardado da proposta, e
 * é só isso que muda entre as duas superfícies.
 *
 * Que uma proposta sem customização fique idêntica a este deck não é uma
 * propriedade mantida à mão: é a identidade `resolve(base, null) === base`.
 */
export default function FastDeckPage() {
  const config = resolveDeckConfig(buildDefaultDeck(), null);
  return <Deck config={config} />;
}
