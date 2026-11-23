import type { DeckConfig } from "@/deck/types";

/** O delta que uma proposta guarda por cima dos defaults.

    Chaveado por id de nó, NUNCA por índice de array — reordenar não pode
    embaralhar patches. Ver ADR 13.

    Repare no que NÃO está aqui: `chrome`. Rodapé e dica de teclado são do
    deck, não de uma proposta. */
export type DeckOverride = {
  /** Ids de nó na ordem desejada. Ids desconhecidos são IGNORADOS, não lançam. */
  order?: string[];
  /** Ids a desabilitar. Verbo aditivo — nunca o conjunto autoritativo. */
  hidden?: string[];
  /** Ids a reabilitar, aplicado depois de `hidden`. Deixa a etapa 3 reativar um
      slide que vem desligado por default (hoje: differentiators, audience). */
  shown?: string[];
  /** V2: sobrescritas de copy por nó. Tipado agora, sem migração depois. */
  slides?: Record<string, unknown>;
  document?: Partial<DeckConfig["document"]>;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const stringArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

/**
 * Lê um `config_override` cru do banco. NUNCA lança.
 *
 * Uma linha corrompida tem que degradar pro deck default, não derrubar um pitch
 * ao vivo com um 500 — mesmo raciocínio de "ids desconhecidos são ignorados" da
 * ADR 13. Escrito à mão em vez de com `zod` porque a etapa 1 não adiciona
 * dependência de runtime; a etapa 2 pode trocar por um schema `server-only`.
 */
export function parseDeckOverride(input: unknown): DeckOverride {
  if (!isPlainObject(input)) return {};

  const out: DeckOverride = {};

  const order = stringArray(input.order);
  if (order) out.order = order;

  const hidden = stringArray(input.hidden);
  if (hidden) out.hidden = hidden;

  const shown = stringArray(input.shown);
  if (shown) out.shown = shown;

  if (isPlainObject(input.slides)) out.slides = input.slides;
  /* `estimate` não é lido de propósito: um delta gravado antes da ADR 27 ainda
     traz o bloco da calculadora, e deixá-lo de fora aqui é o que impede o
     próximo salvamento de regravá-lo na linha. */
  if (isPlainObject(input.document)) {
    out.document = input.document as Partial<DeckConfig["document"]>;
  }

  return out;
}
