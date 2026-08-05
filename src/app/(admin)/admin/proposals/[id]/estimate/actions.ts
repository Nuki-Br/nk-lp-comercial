"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ESTIMATE_RANGES } from "@/lib/estimateTypes";
import { clamp } from "@/lib/format";
import { getAdmin } from "@/server/auth/requireAdmin";
import { saveProposalOverride } from "@/server/proposals/config";

/* Re-checks, like every other action. ADR 15. */

export type EstimateState = {
  error: string | null;
  notice: string | null;
  issues: string[];
  warnings: string[];
};

const EMPTY = { error: null, notice: null, issues: [], warnings: [] };

/* Shape only. The RANGES are applied below with `clamp` and never restated as
   Zod `.min()/.max()`, because docs/estimate.md is explicit that ESTIMATE_RANGES
   is the single home of those numbers — a second copy here is a second thing to
   forget when one of them moves. Zod's job is "is this a room", not "is 40
   components plausible". */
const room = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(60),
  areaType: z.enum(["dry", "wet"]),
  units: z.number().int(),
  components: z.number().int(),
  locked: z.boolean().optional(),
});

const unitType = z.object({
  id: z.number().int(),
  rooms: z.array(room).max(30),
  variants: z.number().int(),
  impactedRooms: z.record(z.string(), z.boolean()),
});

const estimateState = z.object({
  dryOptions: z.number().int(),
  wetOptions: z.number().int(),
  unitTypes: z.array(unitType).min(1),
  /** Ids of the size presets that survive on THIS proposal's calculator. */
  keptPresetIds: z.array(z.string()),
});

/** The tile's visual tier, derived from what the tile is actually showing.
    Same rule the shipped presets are built with, so an edited room and a preset
    room never disagree about their own weight. */
const weightFor = (components: number): "light" | "medium" | "heavy" =>
  components <= 3 ? "light" : components <= 6 ? "medium" : "heavy";

export async function saveEstimateAction(
  _prev: EstimateState,
  formData: FormData,
): Promise<EstimateState> {
  const admin = await getAdmin();
  if (!admin) return { ...EMPTY, error: "Sessão expirada. Entre novamente." };

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { ...EMPTY, error: "Proposta inválida." };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("state") ?? ""));
  } catch {
    return { ...EMPTY, error: "Não foi possível ler o formulário. Recarregue e tente de novo." };
  }

  const parsed = estimateState.safeParse(payload);
  if (!parsed.success) {
    return {
      ...EMPTY,
      error: "Confira os ambientes: cada um precisa de um nome e de números inteiros.",
    };
  }

  /* THE CLAMP, in the estimator seed — which is where the stage brief puts it
     and where the ranges already live. An admin typo must not become an absurd
     quote in front of a client, and it must not become one silently either: the
     value is pulled back into range rather than rejected, because "6 opções" is
     a plausible thing to type and refusing the whole form over it is worse. */
  const unitTypes = parsed.data.unitTypes.slice(0, ESTIMATE_RANGES.unitTypes.max).map((type) => {
    const rooms = type.rooms.map((r) => {
      const components = clamp(
        r.components,
        ESTIMATE_RANGES.components.min,
        ESTIMATE_RANGES.components.max,
      );
      return {
        id: r.id,
        name: r.name,
        areaType: r.areaType,
        weight: weightFor(components),
        units: clamp(r.units, ESTIMATE_RANGES.units.min, ESTIMATE_RANGES.units.max),
        components,
        ...(r.locked ? { locked: true } : {}),
      };
    });

    /* An impacted-room key pointing at a room that was deleted contributes
         nothing to the estimate and everything to confusion the next time
         someone reads the JSONB. Drop it with the room. */
    const roomIds = new Set(rooms.map((r) => r.id));
    const impactedRooms = Object.fromEntries(
      Object.entries(type.impactedRooms).filter(([key, on]) => on && roomIds.has(key)),
    );

    return {
      id: type.id,
      rooms,
      variants: clamp(type.variants, ESTIMATE_RANGES.variants.min, ESTIMATE_RANGES.variants.max),
      impactedRooms,
    };
  });

  const result = await saveProposalOverride(id.data, {
    estimate: {
      defaults: {
        dryOptions: clamp(
          parsed.data.dryOptions,
          ESTIMATE_RANGES.dryOptions.min,
          ESTIMATE_RANGES.dryOptions.max,
        ),
        wetOptions: clamp(
          parsed.data.wetOptions,
          ESTIMATE_RANGES.wetOptions.min,
          ESTIMATE_RANGES.wetOptions.max,
        ),
        unitTypes,
      },
      /* Pruning is per proposal, and an empty list is a legitimate answer: the
         calculator drops the whole preset block rather than rendering an empty
         one. Order follows the shipped list so pruning never reshuffles chips. */
      projectSizePresets: (await presetsById()).filter((preset) =>
        parsed.data.keptPresetIds.includes(preset.id),
      ),
    },
  });

  if (!result.ok) {
    return {
      ...EMPTY,
      issues: result.issues.map((i) => i.message),
      warnings: result.warnings.map((i) => i.message),
    };
  }

  revalidatePath(`/admin/proposals/${id.data}`, "layout");
  return {
    ...EMPTY,
    notice: "Calculadora salva.",
    warnings: result.warnings.map((i) => i.message),
  };
}

/** The shipped presets, read from the defaults rather than round-tripped
    through the browser — a preset's room composition is calibrated content, not
    something a form should be able to rewrite by accident. Only WHICH ones
    survive is a per-proposal decision. */
async function presetsById() {
  const { buildDefaultDeck } = await import("@/deck/defaults");
  return buildDefaultDeck().estimate.projectSizePresets;
}
