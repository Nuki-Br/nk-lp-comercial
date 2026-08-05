import { describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
import { SLIDE_META, slideMetaOf } from "@/deck/meta";
import { parseDeckOverride } from "@/deck/overrides";
import { resolveDeckConfig } from "@/deck/resolve";
import type { DeckConfig, SlideKind, SlideNode } from "@/deck/types";

/* ADR 18: V2 — per-slide copy overrides and bespoke slides — is typed in V1 and
   built later. That only works if the hooks stay hooks, so this file is the
   thing that notices when one of them quietly stops being one.

   The registry is deliberately NOT tested here. It imports every slide
   component, and docs/testing.md is explicit that slide components stay
   untested; what matters about its `default` arm is that `custom` never reaches
   the picker in the first place, which is asserted below. */

describe("the slide union stays open", () => {
  it("`custom` is a kind, and has metadata", () => {
    const custom: SlideKind = "custom";
    expect(SLIDE_META[custom]).toBeDefined();
  });

  it("`slideMetaOf` degrades instead of throwing on an unknown kind", () => {
    /* A config written by a NEWER deploy can carry a kind this build has never
       heard of. The admin must render something rather than 500 — same contract
       as the registry's `default` arm. */
    const unknown = slideMetaOf("bespoke-2027" as SlideKind);
    expect(unknown).toBe(SLIDE_META.custom);
  });

  it("`custom` is the only addable kind, and nothing else is removable", () => {
    // If a second kind ever becomes addable, the picker's affordances change and
    // whoever did it should have to look at this line.
    const addable = Object.values(SLIDE_META)
      .filter((meta) => meta.addable)
      .map((meta) => meta.kind);
    expect(addable).toEqual(["custom"]);
  });

  it("`module-demo` is not addable, so the orphan cannot be constructed", () => {
    /* The demo borrows its module's nav dot. It is reachable only as the
       `hasDemo` checkbox on the module — deck-runtime.md — and this is the flag
       that keeps it that way. */
    expect(SLIDE_META["module-demo"].addable).toBe(false);
    expect(SLIDE_META.module.fields.some((f) => f.key === "hasDemo")).toBe(true);
  });
});

describe("the V2 `copy` field survives without being read", () => {
  it("round-trips through JSON on a node that carries it", () => {
    const deck = buildDefaultDeck();
    const withCopy: DeckConfig = {
      ...deck,
      slides: deck.slides.map((node) =>
        node.id === "cover" ? { ...node, copy: { title: "Título sob medida" } } : node,
      ),
    };

    expect(JSON.parse(JSON.stringify(withCopy))).toEqual(withCopy);
  });

  it("survives a resolve, unread and unaltered", () => {
    const deck = buildDefaultDeck();
    const withCopy: DeckConfig = {
      ...deck,
      slides: deck.slides.map((node) =>
        node.id === "cover" ? { ...node, copy: { title: "Título sob medida" } } : node,
      ),
    };

    const resolved = resolveDeckConfig(withCopy, { hidden: ["cases"] });
    const cover = resolved.slides.find((n) => n.id === "cover");
    expect(cover?.copy).toEqual({ title: "Título sob medida" });
  });

  it("`DeckOverride.slides` is carried through the parser untouched", () => {
    // Typed now so V2 needs no migration. Nothing reads it in V1.
    const parsed = parseDeckOverride({ slides: { cover: { title: "x" } } });
    expect(parsed.slides).toEqual({ cover: { title: "x" } });
  });
});

describe("an unknown kind degrades rather than breaking the chrome", () => {
  it("nothing outside the registry needs to know the kind", () => {
    /* `anchorsOf`, `walkableIdsOf` and `normalizeDeck` read only SlideNodeBase.
       A node of an invented kind therefore still gets a dot, a position and a
       place in the arrow walk — which is what makes a bespoke slide additive. */
    const deck = buildDefaultDeck();
    /* Cast because the union has no arm for a kind that does not exist yet —
       which is exactly the situation being modelled: this node came from a
       deploy newer than the one reading it. */
    const invented = {
      ...deck.slides[0],
      id: "bespoke",
      kind: "bespoke-2027",
      label: "Slide sob medida",
    } as unknown as SlideNode;

    const resolved = resolveDeckConfig(
      { ...deck, slides: [...deck.slides, invented] },
      { order: ["bespoke"] },
    );

    expect(resolved.slides[0].id).toBe("bespoke");
    expect(resolved.slides[0].enabled).toBe(true);
  });
});
