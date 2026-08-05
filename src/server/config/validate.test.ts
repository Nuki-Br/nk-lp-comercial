import { describe, expect, it } from "vitest";
import { buildDefaultDeck } from "@/deck/defaults";
import type { DeckConfig } from "@/deck/types";
import { validateDeckConfig } from "@/server/config/validate";

/* docs/testing.md names four rejections this file must make. They are here, plus
   the ones the same reasoning implies. The baseline assertion matters as much as
   the rejections: a validator that rejects everything passes every negative
   test. */

const base = (): DeckConfig => structuredClone(buildDefaultDeck());

const codesOf = (config: DeckConfig): string[] => {
  const result = validateDeckConfig(config);
  return result.ok ? [] : result.issues.map((i) => i.code);
};

const warningsOf = (config: DeckConfig): string[] =>
  validateDeckConfig(config).warnings.map((i) => i.code);

/** Disable by id the way the composer does, instead of splicing the node out —
    the delta hides slides, it never deletes them. */
const disable = (config: DeckConfig, ...ids: string[]): DeckConfig => {
  for (const node of config.slides) if (ids.includes(node.id)) node.enabled = false;
  return config;
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

  it("rejects a negative plan price", () => {
    const config = base();
    config.estimate.plans[0].monthlyPrice = -1;
    expect(codesOf(config)).toContain("negative-price");
  });

  it("rejects a negative image tariff", () => {
    const config = base();
    config.estimate.imagePrices.base = -84;
    expect(codesOf(config)).toContain("negative-price");
  });

  it("rejects a discount of 1 or more", () => {
    for (const discount of [1, 1.5, 100]) {
      const config = base();
      config.estimate.billingCycles[0].discount = discount;
      expect(codesOf(config), `discount ${discount} was accepted`).toContain(
        "discount-out-of-range",
      );
    }
  });

  it("rejects a negative discount", () => {
    const config = base();
    config.estimate.billingCycles[0].discount = -0.1;
    expect(codesOf(config)).toContain("discount-out-of-range");
  });

  it("accepts a discount just under 1", () => {
    const config = base();
    config.estimate.billingCycles[0].discount = 0.999;
    expect(codesOf(config)).not.toContain("discount-out-of-range");
  });

  it("rejects NaN where a number is required", () => {
    const config = base();
    config.estimate.plans[0].monthlyPrice = Number.NaN;
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

  it("rejects a non-integer or zero maxMonths", () => {
    for (const maxMonths of [0, -12, 12.5]) {
      const config = base();
      config.estimate.maxMonths = maxMonths;
      expect(codesOf(config), `maxMonths ${maxMonths} was accepted`).toContain(
        "invalid-max-months",
      );
    }
  });

  it("reports every problem at once, rather than the first", () => {
    const config = base();
    config.estimate.plans[0].monthlyPrice = -1;
    config.estimate.billingCycles[0].discount = 2;
    config.estimate.maxMonths = 0;

    const codes = codesOf(config);
    expect(codes).toEqual(
      expect.arrayContaining(["negative-price", "discount-out-of-range", "invalid-max-months"]),
    );
  });

  /* `cycleForMonths` seeds its reduce on cycles[0] and only ever moves to a
     HIGHER floor, so both of these mis-quote a real proposal in silence. */
  describe("billing cycles", () => {
    it("rejects an empty cycle list — that one is a crash, not a wrong number", () => {
      const config = base();
      config.estimate.billingCycles = [];
      expect(codesOf(config)).toContain("no-billing-cycles");
    });

    it("rejects cycles whose floors do not ascend", () => {
      const config = base();
      config.estimate.billingCycles = [
        { id: "anual", label: "Anual", discount: 0.1, minMonths: 12 },
        { id: "mensal", label: "Mensal", discount: 0, minMonths: 1 },
      ];
      expect(codesOf(config)).toContain("cycles-out-of-order");
    });

    it("rejects a first floor above one month", () => {
      // Below the first floor nothing matches and the seed wins by default, so a
      // one-month contract would be quoted at the semiannual discount.
      const config = base();
      config.estimate.billingCycles = [
        { id: "semestral", label: "Semestral", discount: 0.05, minMonths: 6 },
        { id: "anual", label: "Anual", discount: 0.1, minMonths: 12 },
      ];
      expect(codesOf(config)).toContain("cycles-out-of-order");
    });

    it("accepts the shipped cycles", () => {
      expect(codesOf(base())).not.toContain("cycles-out-of-order");
    });
  });

  /* The warning channel. These configs SAVE — refusing them would be the
     validator deciding a commercial question. */
  describe("warnings do not block", () => {
    it("warns when total survives but pricing is disabled", () => {
      const config = disable(base(), "pricing");

      expect(validateDeckConfig(config).ok).toBe(true);
      expect(warningsOf(config)).toContain("total-without-pricing");
    });

    it("says nothing when both are disabled together", () => {
      const config = disable(base(), "pricing", "total");
      expect(warningsOf(config)).not.toContain("total-without-pricing");
    });

    it("warns on an empty plan list without rejecting it", () => {
      const config = base();
      config.estimate.plans = [];

      expect(validateDeckConfig(config).ok).toBe(true);
      expect(warningsOf(config)).toContain("no-plans");
    });

    it("still reports warnings on a config that also has blocking issues", () => {
      /* The arm a caller narrows on `ok === false` must still carry them, or the
         admin loses them exactly when the form is already open in front of them. */
      const config = disable(base(), "pricing");
      config.estimate.maxMonths = 0;

      const result = validateDeckConfig(config);
      expect(result.ok).toBe(false);
      expect(result.warnings.map((w) => w.code)).toContain("total-without-pricing");
    });
  });
});
