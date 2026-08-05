import { fieldCopy, slideMetaCopy } from "@/content/slideMeta";
import type { SlideKind } from "@/deck/types";

/* Metadado de slide para o /admin: rótulo, descrição e o SCHEMA DOS CAMPOS
   editáveis.

   O schema (e não só um rótulo) é requisito da ADR 18: com ele o compositor
   desenha o formulário a partir do metadado em vez de dar switch em `kind`, e um
   tipo novo de slide não obriga a reabrir o /admin. */

export type FieldKind = "text" | "richtext" | "textarea" | "boolean" | "list";

export type FieldSpec = {
  key: string;
  label: string;
  kind: FieldKind;
};

export type SlideMeta = {
  kind: SlideKind;
  label: string;
  description: string;
  /** O compositor pode inserir um destes? */
  addable: boolean;
  /** O compositor pode remover (em vez de só desabilitar)? */
  removable: boolean;
  /** No máximo um por deck. */
  singleton: boolean;
  fields: FieldSpec[];
};

const HEAD_FIELDS: FieldSpec[] = [
  { key: "head.tag", label: fieldCopy.tag, kind: "text" },
  { key: "head.title", label: fieldCopy.title, kind: "richtext" },
  { key: "head.lead", label: fieldCopy.lead, kind: "textarea" },
];

const meta = (
  kind: SlideKind,
  fields: FieldSpec[],
  opts: Partial<Pick<SlideMeta, "addable" | "removable" | "singleton">> = {},
): SlideMeta => ({
  kind,
  label: slideMetaCopy[kind].label,
  description: slideMetaCopy[kind].description,
  addable: opts.addable ?? false,
  removable: opts.removable ?? false,
  singleton: opts.singleton ?? true,
  fields,
});

export const SLIDE_META: Record<SlideKind, SlideMeta> = {
  cover: meta("cover", [
    { key: "kicker", label: fieldCopy.kicker, kind: "text" },
    { key: "title", label: fieldCopy.title, kind: "richtext" },
    { key: "lead", label: fieldCopy.lead, kind: "textarea" },
  ]),
  problem: meta("problem", [
    ...HEAD_FIELDS,
    { key: "cards", label: fieldCopy.cards, kind: "list" },
  ]),
  "what-is-nuki": meta("what-is-nuki", [
    ...HEAD_FIELDS,
    { key: "flow", label: fieldCopy.flow, kind: "list" },
  ]),
  /* `hasDemo` É o "checkbox no módulo" que o deck-runtime.md pede: ligá-lo
     insere o nó `module-demo` logo depois do pai, desligá-lo o remove. Por isso
     `module-demo` não é `addable` — o órfão não pode ser construído pela UI, e
     `normalizeDeck` é só o backstop pra configs escritos à mão. */
  module: meta("module", [{ key: "hasDemo", label: fieldCopy.hasDemo, kind: "boolean" }], {
    singleton: false,
  }),
  "module-demo": meta("module-demo", [], { singleton: false }),
  differentiators: meta("differentiators", [
    ...HEAD_FIELDS,
    { key: "items", label: fieldCopy.items, kind: "list" },
  ]),
  audience: meta("audience", [
    ...HEAD_FIELDS,
    { key: "personas", label: fieldCopy.personas, kind: "list" },
    { key: "fit.title", label: fieldCopy.fitTitle, kind: "text" },
    { key: "fit.items", label: fieldCopy.fitItems, kind: "list" },
  ]),
  cases: meta("cases", [...HEAD_FIELDS, { key: "logos", label: fieldCopy.logos, kind: "list" }]),
  pricing: meta("pricing", HEAD_FIELDS),
  calculator: meta("calculator", HEAD_FIELDS),
  total: meta("total", [
    { key: "head.tag", label: fieldCopy.tag, kind: "text" },
    { key: "head.title", label: fieldCopy.title, kind: "richtext" },
  ]),
  custom: meta("custom", [], { addable: true, removable: true, singleton: false }),
};

/** Degrada em vez de estourar num `kind` que este deploy não conhece — mesmo
    contrato do braço `default` do registry. */
export const slideMetaOf = (kind: SlideKind): SlideMeta => SLIDE_META[kind] ?? SLIDE_META.custom;
