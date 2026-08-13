import type { ReactElement } from "react";
import {
  AudienceSlide,
  CalculatorSlide,
  CasesSlide,
  CoverSlide,
  DifferentiatorsSlide,
  EstimatedTotalSlide,
  ModuleDemoSlide,
  ModuleSlide,
  PricingSlide,
  ProblemSlide,
  ValueSlide,
  WhatIsNukiSlide,
} from "@/components/slides";
import type { DeckChrome, EstimateConfig, SlideNode } from "@/deck/types";

/**
 * O ÚNICO módulo do repo que dá switch em `kind`.
 *
 * No momento em que o `ProgressNav`, o `DeckBehaviors` ou o /admin ganharem um
 * `if (kind === "module")`, slides sob medida quebram em algum lugar que
 * ninguém está olhando. Tudo que outros consumidores precisam ler mora na base
 * do nó (`enabled`, `inNav`, `walkable`, `ordinal`, `childId`).
 */
export type SlideContext = {
  estimate: EstimateConfig;
  chrome: DeckChrome;
};

export function renderSlide(node: SlideNode, ctx: SlideContext): ReactElement | null {
  if (!node.enabled) return null;

  switch (node.kind) {
    case "cover":
      return <CoverSlide key={node.id} node={node} />;
    case "value":
      return <ValueSlide key={node.id} node={node} />;
    case "problem":
      return <ProblemSlide key={node.id} node={node} />;
    case "what-is-nuki":
      return <WhatIsNukiSlide key={node.id} node={node} />;
    case "module":
      return <ModuleSlide key={node.id} node={node} />;
    case "module-demo":
      return <ModuleDemoSlide key={node.id} node={node} />;
    case "differentiators":
      return <DifferentiatorsSlide key={node.id} node={node} />;
    case "audience":
      return <AudienceSlide key={node.id} node={node} />;
    case "cases":
      return <CasesSlide key={node.id} node={node} />;
    case "pricing":
      return <PricingSlide key={node.id} node={node} estimate={ctx.estimate} />;
    case "calculator":
      return (
        <CalculatorSlide
          key={node.id}
          node={node}
          estimate={ctx.estimate}
          allowPriceOverride={ctx.chrome.allowPriceOverride}
        />
      );
    case "total":
      return <EstimatedTotalSlide key={node.id} node={node} />;
    default:
      /* V2 e degradação. Um config escrito por um deploy MAIS NOVO pode trazer
         um `kind` que este build não conhece; devolver `null` faz o slide sumir
         em vez de derrubar um pitch ao vivo com um 500. ADR 18. */
      return null;
  }
}
