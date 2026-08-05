import "server-only";

import { z } from "zod";
import type { DeckConfig } from "@/deck/types";

/* The only Zod in the read path (ADR 11: one validator, server-only).

   It guards a JSONB column that a rollback, a hand edit or a newer deploy could
   have left in a shape this build does not expect. It is NOT a restatement of
   `DeckConfig` — writing all ~200 label keys here would produce a second source
   of truth that drifts from src/deck/types.ts within a month, and would reject a
   config written by a NEWER deploy, which is exactly the live-pitch 500 that
   ADR 18 is designed to avoid.

   So: check the load-bearing structure, pass everything else through untouched.
   `looseObject` is the whole trick — unknown keys survive parsing. */

const richText = z.unknown();

const slideNode = z.looseObject({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string(),
  enabled: z.boolean(),
  parentId: z.string().optional(),
  inNav: z.boolean().optional(),
  walkable: z.boolean().optional(),
});

const estimate = z.looseObject({
  plans: z.array(z.looseObject({ n: z.string(), monthlyPrice: z.number().finite() })),
  billingCycles: z.array(
    z.looseObject({ id: z.string(), label: z.string(), discount: z.number().finite() }),
  ),
  maxMonths: z.number().int().positive(),
  imagePrices: z.looseObject({ base: z.number().finite(), option: z.number().finite() }),
});

export const deckConfigSchema = z.looseObject({
  key: z.string(),
  document: z.looseObject({ title: z.string(), description: z.string() }),
  slides: z.array(slideNode).min(1),
  estimate,
  chrome: z.looseObject({
    showFooter: z.boolean(),
    keyboardHint: richText,
    allowPriceOverride: z.boolean(),
  }),
});

/**
 * Never throws. A corrupt snapshot must produce a controlled "this proposal is
 * unavailable", not a stack trace in front of a client.
 *
 * The cast is deliberate and is the price of not restating the type: the schema
 * proves the structure the renderer depends on, and the loose fields carry the
 * rest through. If it ever grows into a full mirror of `DeckConfig`, delete the
 * cast — and reconsider the mirror.
 */
export function parseStoredDeckConfig(input: unknown): DeckConfig | null {
  const result = deckConfigSchema.safeParse(input);
  return result.success ? (result.data as unknown as DeckConfig) : null;
}
