import { describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
import type { DeckConfig } from "@/deck/types";
import { validateDeckConfig } from "@/server/config/validate";

/* docs/testing.md names the rejections this file must make. They are here, plus
   the ones the same reasoning implies. The baseline assertion matters as much as
   the rejections: a validator that rejects everything passes every negative
   test. */

const base = (): DeckConfig => structuredClone(buildDefaultDeck());

const codesOf = (config: DeckConfig): string[] => {
  const result = validateDeckConfig(config);
  return result.ok ? [] : result.issues.map((i) => i.code);
};

describe("validateDeckConfig", () => {
  it("accepts the shipped default deck, with nothing to warn about", () => {
    expect(validateDeckConfig(buildDefaultDeck())).toEqual({ ok: true, warnings: [] });
  });

  it("rejects a demo whose module is disabled", () => {
    const config = base();
    const demo = config.slides.find((n) => n.parentId);
    expect(demo, "the default deck should have a child slide").toBeDefined();

    const parent = config.slides.find((n) => n.id === demo?.parentId);
    if (parent) parent.enabled = false;

    /* This is the one that blanks the whole progress nav: the demo keeps
       pointing data-nav-id at a dot that is no longer rendered. */
    expect(codesOf(config)).toContain("orphan-child");
  });

  it("rejects a total slide placed before the calculator", () => {
    const config = base();
    const calculator = config.slides.findIndex((n) => n.id === "calculator");
    const total = config.slides.findIndex((n) => n.id === "total");
    expect(calculator).toBeGreaterThanOrEqual(0);
    expect(total).toBeGreaterThan(calculator);

    const [totalNode] = config.slides.splice(total, 1);
    config.slides.splice(calculator, 0, totalNode);

    expect(codesOf(config)).toContain("total-before-calculator");
  });

  it("rejects a negative image tariff", () => {
    const config = base();
    config.estimate.imagePrices.base = -84;
    expect(codesOf(config)).toContain("negative-price");
  });

  it("rejects NaN where a number is required", () => {
    const config = base();
    config.estimate.imagePrices.option = Number.NaN;
    expect(codesOf(config)).toContain("negative-price");
  });

  it("rejects duplicate slide ids", () => {
    const config = base();
    config.slides.push(structuredClone(config.slides[0]));
    expect(codesOf(config)).toContain("duplicate-id");
  });

  it("rejects a deck with nothing enabled", () => {
    const config = base();
    for (const node of config.slides) node.enabled = false;
    expect(codesOf(config)).toContain("empty-deck");
  });

  it("reports every problem at once, rather than the first", () => {
    const config = base();
    config.estimate.imagePrices.base = -1;
    config.slides.push(structuredClone(config.slides[0]));

    expect(codesOf(config)).toEqual(expect.arrayContaining(["negative-price", "duplicate-id"]));
  });

  /* The warning channel has no producer today — the two rules that wrote to it
     belonged to the plan slide (ADR 26). Both arms still carry it, because the
     composer reads it on either, and a caller that narrows on `ok === false`
     must not lose it. */
  it("carries the warnings list on both arms", () => {
    expect(validateDeckConfig(base()).warnings).toEqual([]);

    const broken = base();
    broken.estimate.imagePrices.base = -1;
    const result = validateDeckConfig(broken);

    expect(result.ok).toBe(false);
    expect(result.warnings).toEqual([]);
  });
});
