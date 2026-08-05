"use client";

import { useEffect, useRef, useState } from "react";
import { useEstimate } from "@/components/deck/EstimateProvider";
import { SectionHead } from "@/components/slides/SectionHead";
import { Stepper } from "@/components/ui/Stepper";
import type {
  CalculatorLabels,
  CalculatorNode,
  EstimateConfig,
  ProjectSizePreset,
  RoomPreset,
} from "@/deck/types";
import { useCountUp } from "@/hooks/useCountUp";
import {
  computeEstimate,
  estimateCost,
  type ImageMix,
  type RoomUnit,
  type UnitTypeBreakdown,
} from "@/lib/estimate";
import {
  ESTIMATE_RANGES,
  materializeRooms,
  materializeUnitTypes,
  type RoomAreaType,
  type RoomConfig,
  type UnitTypeState,
} from "@/lib/estimateTypes";
import { clamp, fill, formatCurrency, ordinal2 } from "@/lib/format";

/* Uma pill por variação possível. Sai do range em vez de ser literal, senão o
   seletor para em 3 e nenhum preset com mais variações fica editável. */
const VARIANT_CHOICES = Array.from(
  { length: ESTIMATE_RANGES.variants.max - ESTIMATE_RANGES.variants.min + 1 },
  (_, i) => ESTIMATE_RANGES.variants.min + i,
);

/* ============ COMPONENTE PRINCIPAL ============ */

/** UI de "+ Adicionar ambiente" tem 3 estados:
    - null: botão colapsado
    - picker: mostra os 5 chips de preset + "Personalizado"
    - custom: mostra o form de nome + classe (fluxo antigo) */
type AddRoomState =
  | null
  | { mode: "picker" }
  | { mode: "custom"; name: string; areaType: RoomAreaType };

export function CalculatorSlide({
  node,
  estimate,
  allowPriceOverride,
}: {
  node: CalculatorNode;
  estimate: EstimateConfig;
  /** Libera o painel Ctrl+Alt+K. `true` no /fast, `false` numa proposta: num
      link que fica com o cliente, um painel escondido que expõe custo-base é um
      vazamento descobrível. Ver docs/estimate.md. */
  allowPriceOverride: boolean;
}) {
  const labels = node.labels;
  const [dryOptions, setOpcoesSecas] = useState(estimate.defaults.dryOptions);
  const [wetOptions, setOpcoesMolhadas] = useState(estimate.defaults.wetOptions);
  const [baseImagePrice, setBaseImagePrice] = useState(estimate.imagePrices.base);
  const [optionImagePrice, setOptionImagePrice] = useState(estimate.imagePrices.option);
  const [unitTypes, setMetragens] = useState<UnitTypeState[]>(() =>
    materializeUnitTypes(estimate.defaults.unitTypes),
  );
  const [activeUnitTypeIndex, setMetragemAtiva] = useState(0);
  const [addingAmbiente, setAddingAmbiente] = useState<AddRoomState>(null);
  /** Preset de porte aplicado por último. Volta pra null na primeira edição —
      o chip aceso não pode afirmar um estado que o user já mexeu. */
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  /** Painel escondido de config da apresentação. Toggle via Ctrl+Alt+K,
      fecha com ESC. Nunca visível ao cliente sem o atalho. */
  const [adminOpen, setAdminOpen] = useState(false);
  const nextIdRef = useRef(unitTypes.length + 1);
  const nextCustomIdRef = useRef(1);

  /* Listener global do atalho do painel escondido. Ctrl+Alt+K (Control+Option+K
     no Mac) toggle, ESC fecha (só quando aberto — não intercepta ESC de outros
     contextos).

     Casa por `e.code`, NÃO por `e.key`: no Mac o Option é uma tecla morta que
     transforma o caractere, então Option+K chega como `e.key === "˚"` e o
     atalho nunca disparava pra quem usa macOS. `e.code` é a posição física da
     tecla, imune a isso e a layouts não-US (ABNT2 etc). */
  useEffect(() => {
    // Numa proposta o listener nem chega a existir: nada de painel escondido
    // num link que fica com o cliente.
    if (!allowPriceOverride) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.code === "KeyK") {
        e.preventDefault();
        setAdminOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && adminOpen) {
        setAdminOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adminOpen, allowPriceOverride]);

  const { breakdowns, total: imageMix } = computeEstimate(unitTypes, { dryOptions, wetOptions });
  const unitTypeBreakdowns = unitTypes.map((m, i) => ({ m, calc: breakdowns[i] }));
  const imageCount = imageMix.total;
  const totalImageCost = estimateCost(imageMix, { baseImagePrice, optionImagePrice });

  const imageCountDisplay = useCountUp(imageCount);
  const costDisplay = useCountUp(totalImageCost);

  const isActive = unitTypes[activeUnitTypeIndex];
  const activeBreakdown = unitTypeBreakdowns[activeUnitTypeIndex]?.calc;

  /* Publica os totais no context pra CTA compor o "Total consolidado".
     Sync intencional de estado derivado entre seções irmãs; alternativa
     seria lift-up completo do state da Calculadora — refactor grande demais. */
  const { setTotals } = useEstimate();
  useEffect(() => {
    setTotals({ imageCount, imageCost: totalImageCost });
  }, [imageCount, totalImageCost, setTotals]);

  /* ============ MUTATORS ============ */

  /* Todo caminho que altera as metragens passa por aqui, pra apagar o chip de
     preset junto. Selecionar outra metragem NÃO passa — trocar de aba não é
     editar, o preset continua descrevendo o estado. */
  const mutate = (fn: (prev: UnitTypeState[]) => UnitTypeState[]) => {
    setActivePresetId(null);
    setMetragens(fn);
  };

  /* Aplica um preset de porte: substitui o estado inteiro da calculadora e
     devolve o vendedor pra primeira metragem. `nextIdRef` precisa pular os
     ids que o preset já usou — sem isso um "+ Adicionar" depois do Alto
     padrão (ids 1 e 2) geraria um id 2 duplicado e quebraria as React keys. */
  const applyPreset = (preset: ProjectSizePreset) => {
    // Clona: `preset.unitTypes` agora é dado compartilhado do módulo, e aplicar
    // o mesmo preset duas vezes não pode reusar as mesmas referências.
    const next = materializeUnitTypes(preset.unitTypes);
    setMetragens(next);
    nextIdRef.current = next.length + 1;
    setMetragemAtiva(0);
    setOpcoesSecas(preset.dryOptions);
    setOpcoesMolhadas(preset.wetOptions);
    setAddingAmbiente(null);
    setActivePresetId(preset.id);
  };

  const changeDryOptions = (v: number) => {
    setActivePresetId(null);
    setOpcoesSecas(v);
  };

  const changeWetOptions = (v: number) => {
    setActivePresetId(null);
    setOpcoesMolhadas(v);
  };

  /* Selecionar outra metragem também fecha um eventual form de add-ambient
     aberto — evita que o form migre pra metragem errada sem intenção. */
  const selectMetragem = (idx: number) => {
    setMetragemAtiva(idx);
    setAddingAmbiente(null);
  };

  const updateAtiva = (patch: Partial<UnitTypeState>) => {
    mutate((prev) => prev.map((m, i) => (i === activeUnitTypeIndex ? { ...m, ...patch } : m)));
  };

  const updateAmbiente = (id: string, patch: Partial<RoomConfig>) => {
    mutate((prev) =>
      prev.map((m, i) =>
        i === activeUnitTypeIndex
          ? {
              ...m,
              rooms: m.rooms.map((a) => (a.id === id ? { ...a, ...patch } : a)),
            }
          : m,
      ),
    );
  };

  const removeAmbiente = (id: string) => {
    mutate((prev) =>
      prev.map((m, i) =>
        i === activeUnitTypeIndex
          ? {
              ...m,
              rooms: m.rooms.filter((a) => a.id !== id),
              impactedRooms: Object.fromEntries(
                Object.entries(m.impactedRooms).filter(([k]) => k !== id),
              ),
            }
          : m,
      ),
    );
  };

  /** Cria e insere um AmbienteConfig na metragem ativa a partir de
      {nome, classe} — usado tanto pelos presets quanto pelo custom form.
      Peso/quantidade/componentes vêm dos defaults; user edita nos controles
      do tile depois. */
  const addAmbient = (name: string, areaType: RoomAreaType) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `custom-${nextCustomIdRef.current++}`;
    const updated: RoomConfig = {
      id,
      name: trimmed,
      areaType,
      weight: estimate.customRoomDefaults.weight,
      units: estimate.customRoomDefaults.units,
      components: estimate.customRoomDefaults.components,
    };
    mutate((prev) =>
      prev.map((m, i) => (i === activeUnitTypeIndex ? { ...m, rooms: [...m.rooms, updated] } : m)),
    );
    setAddingAmbiente(null);
  };

  const confirmAddAmbiente = () => {
    if (addingAmbiente?.mode !== "custom") return;
    addAmbient(addingAmbiente.name, addingAmbiente.areaType);
  };

  const toggleImpacto = (id: string) => {
    mutate((prev) =>
      prev.map((m, i) =>
        i === activeUnitTypeIndex
          ? {
              ...m,
              impactedRooms: { ...m.impactedRooms, [id]: !m.impactedRooms[id] },
            }
          : m,
      ),
    );
  };

  /* Os guards de min/max rodam DENTRO do updater: `metragens.length` vem do
     closure do render, então cliques em sequência antes do commit leriam um
     length velho e furariam o teto (8 cliques rápidos = 9 metragens). */
  const addMetragem = () => {
    if (unitTypes.length >= ESTIMATE_RANGES.unitTypes.max) return;
    const id = nextIdRef.current++;
    const updated: UnitTypeState = {
      id,
      rooms: materializeRooms(estimate.defaultRooms),
      variants: 1,
      impactedRooms: {},
    };
    mutate((prev) => (prev.length >= ESTIMATE_RANGES.unitTypes.max ? prev : [...prev, updated]));
    setMetragemAtiva(Math.min(unitTypes.length, ESTIMATE_RANGES.unitTypes.max - 1));
    setAddingAmbiente(null);
  };

  const removeMetragem = (idx: number) => {
    if (unitTypes.length <= ESTIMATE_RANGES.unitTypes.min) return;
    mutate((prev) =>
      prev.length <= ESTIMATE_RANGES.unitTypes.min ? prev : prev.filter((_, i) => i !== idx),
    );
    setMetragemAtiva((prev) => {
      if (prev > idx) return prev - 1;
      if (prev === idx) return Math.max(0, idx - 1);
      return prev;
    });
    setAddingAmbiente(null);
  };

  /* ============ JSX ============ */

  return (
    <>
      {adminOpen && (
        <div className="calc-admin-panel" role="dialog" aria-label={labels.admin.dialogAria}>
          <div className="calc-admin-header">
            <span className="calc-admin-title">{labels.admin.title}</span>
            <button
              type="button"
              className="calc-admin-close"
              onClick={() => setAdminOpen(false)}
              aria-label={labels.admin.closeAria}
            >
              {labels.admin.closeGlyph}
            </button>
          </div>
          <div className="calc-admin-field">
            <label className="calc-admin-label" htmlFor="calc-admin-base-price">
              {labels.admin.basePriceLabel}
            </label>
            <input
              id="calc-admin-base-price"
              type="number"
              min={ESTIMATE_RANGES.baseImagePrice.min}
              max={ESTIMATE_RANGES.baseImagePrice.max}
              step={1}
              value={baseImagePrice}
              onChange={(e) =>
                setBaseImagePrice(
                  clamp(
                    parseInt(e.target.value, 10) || 1,
                    ESTIMATE_RANGES.baseImagePrice.min,
                    ESTIMATE_RANGES.baseImagePrice.max,
                  ),
                )
              }
            />
          </div>
          <div className="calc-admin-field">
            <label className="calc-admin-label" htmlFor="calc-admin-option-price">
              {labels.admin.optionPriceLabel}
            </label>
            <input
              id="calc-admin-option-price"
              type="number"
              min={ESTIMATE_RANGES.optionImagePrice.min}
              max={ESTIMATE_RANGES.optionImagePrice.max}
              step={1}
              value={optionImagePrice}
              onChange={(e) =>
                setOptionImagePrice(
                  clamp(
                    parseInt(e.target.value, 10) || 1,
                    ESTIMATE_RANGES.optionImagePrice.min,
                    ESTIMATE_RANGES.optionImagePrice.max,
                  ),
                )
              }
            />
          </div>
          <p className="calc-admin-hint">{labels.admin.hint}</p>
        </div>
      )}
      <section className="slide calculator" id={node.id} data-tone={node.tone} data-reveal-group="">
        <div className="slide-inner">
          <SectionHead head={node.head} />

          <div className="calc-grid reveal">
            {/* ============ INPUTS ============ */}
            <div className="calc-inputs">
              {/* Presets de porte — substituem o estado inteiro da calculadora */}
              <div className="calc-field calc-presets">
                <label className="calc-label calc-label-sm">{labels.presets.label}</label>
                <div
                  className="calc-preset-list"
                  role="radiogroup"
                  aria-label={labels.presets.groupAria}
                >
                  {estimate.projectSizePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={activePresetId === preset.id}
                      className={`calc-preset${activePresetId === preset.id ? " is-active" : ""}`}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="calc-preset-name">{preset.name}</span>
                      <span className="calc-preset-hint">{preset.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bar global */}
              <div className="calc-global-bar">
                <div className="calc-field">
                  <label className="calc-label calc-label-sm">{labels.options.dryLabel}</label>
                  <Stepper
                    value={dryOptions}
                    min={ESTIMATE_RANGES.dryOptions.min}
                    max={ESTIMATE_RANGES.dryOptions.max}
                    onChange={changeDryOptions}
                    ariaLabel={labels.options.dryAria}
                  />
                </div>
                <div className="calc-field">
                  <label className="calc-label calc-label-sm">{labels.options.wetLabel}</label>
                  <Stepper
                    value={wetOptions}
                    min={ESTIMATE_RANGES.wetOptions.min}
                    max={ESTIMATE_RANGES.wetOptions.max}
                    onChange={changeWetOptions}
                    ariaLabel={labels.options.wetAria}
                  />
                </div>
              </div>

              {/* Tabs de metragens */}
              <div
                className="calc-unit-type-tabs"
                role="tablist"
                aria-label={labels.unitTypes.tablistAria}
              >
                {unitTypes.map((m, i) => (
                  <div
                    key={m.id}
                    className={`calc-unit-type-tab${i === activeUnitTypeIndex ? " is-active" : ""}`}
                    role="tab"
                    aria-selected={i === activeUnitTypeIndex}
                  >
                    <button
                      type="button"
                      className="calc-unit-type-tab-btn"
                      onClick={() => selectMetragem(i)}
                    >
                      {fill(labels.unitTypes.tabTemplate, { n: ordinal2(i + 1) })}
                    </button>
                    {unitTypes.length > ESTIMATE_RANGES.unitTypes.min && (
                      <button
                        type="button"
                        className="calc-unit-type-tab-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMetragem(i);
                        }}
                        aria-label={fill(labels.unitTypes.removeTemplate, { n: i + 1 })}
                      >
                        {labels.unitTypes.removeGlyph}
                      </button>
                    )}
                  </div>
                ))}
                {unitTypes.length < ESTIMATE_RANGES.unitTypes.max && (
                  <button
                    type="button"
                    className="calc-unit-type-add"
                    onClick={addMetragem}
                    aria-label={labels.unitTypes.addAria}
                  >
                    {labels.unitTypes.addLabel}
                  </button>
                )}
              </div>

              {/* Painel da metragem ativa */}
              {isActive && (
                <div className="calc-unit-type-panel">
                  <div className="calc-room-rows">
                    <p className="calc-label calc-room-rows-head">{labels.rooms.heading}</p>
                    {isActive.rooms.map((a) => (
                      <RoomRow
                        key={a.id}
                        labels={labels}
                        room={a}
                        onQuantidadeChange={(v) => updateAmbiente(a.id, { units: v })}
                        onComponentesChange={(v) => updateAmbiente(a.id, { components: v })}
                        onRemove={() => removeAmbiente(a.id)}
                      />
                    ))}

                    <AddAmbienteControl
                      labels={labels}
                      roomPresets={estimate.roomPresets}
                      state={addingAmbiente}
                      onOpen={() => setAddingAmbiente({ mode: "picker" })}
                      onSelectPreset={(preset) => addAmbient(preset.name, preset.areaType)}
                      onSelectCustom={() =>
                        setAddingAmbiente({ mode: "custom", name: "", areaType: "wet" })
                      }
                      onChange={(patch) =>
                        setAddingAmbiente((prev) =>
                          prev?.mode === "custom" ? { ...prev, ...patch } : prev,
                        )
                      }
                      onConfirm={confirmAddAmbiente}
                      onCancel={() => setAddingAmbiente(null)}
                    />
                  </div>

                  <div className="calc-field">
                    <label className="calc-label">{labels.variants.label}</label>
                    <div
                      className="calc-pills"
                      role="radiogroup"
                      aria-label={labels.variants.groupAria}
                    >
                      {VARIANT_CHOICES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={n === isActive.variants}
                          className={`calc-pill${n === isActive.variants ? " is-active" : ""}`}
                          onClick={() => updateAtiva({ variants: n })}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isActive.variants > 1 && (
                    <div className="calc-field calc-axes">
                      <div className="calc-axes-head">
                        <label className="calc-label">{labels.variants.impactedLabel}</label>
                        <p className="calc-axes-hint">{labels.variants.impactedHint}</p>
                      </div>
                      <div className="calc-axes-grid">
                        {isActive.rooms.map((a) => (
                          <label key={a.id} className="calc-axis">
                            <input
                              type="checkbox"
                              checked={!!isActive.impactedRooms[a.id]}
                              onChange={() => toggleImpacto(a.id)}
                            />
                            <span className="calc-axis-box" aria-hidden="true" />
                            <span className="calc-axis-title">{a.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ============ VISUAL + OUTPUT ============ */}
            <div className="calc-visual">
              <div className="calc-cards">
                {unitTypeBreakdowns.map(({ m, calc }, mIdx) => (
                  <UnitTypeGroup
                    key={m.id}
                    labels={labels}
                    index={mIdx}
                    unitType={m}
                    calc={calc}
                    isActive={mIdx === activeUnitTypeIndex}
                    onSelect={() => selectMetragem(mIdx)}
                  />
                ))}
              </div>

              <div className="calc-output">
                <div className="calc-out-block">
                  <span className="calc-out-value">
                    {imageCountDisplay.toLocaleString("pt-BR")}
                  </span>
                  <span className="calc-out-label">{labels.output.countLabel}</span>
                  {/* Sem useCountUp: legenda com número animado vira ruído. */}
                  <span className="calc-out-mix">
                    {fill(labels.output.mixTemplate, {
                      base: imageMix.base.toLocaleString("pt-BR"),
                      option: imageMix.option.toLocaleString("pt-BR"),
                    })}
                  </span>
                </div>
                <div className="calc-out-divider" aria-hidden="true" />
                <div className="calc-out-block">
                  <span className="calc-out-value">{formatCurrency(costDisplay)}</span>
                  <span className="calc-out-label">{labels.output.costLabel}</span>
                </div>
              </div>

              <aside
                className="calc-disclaimer"
                role="note"
                aria-label={labels.output.disclaimerAria}
              >
                <span className="calc-disclaimer-icon" aria-hidden="true">
                  <InfoIcon />
                </span>
                <div className="calc-disclaimer-body">
                  <p className="calc-disclaimer-title">{labels.output.disclaimerTitle}</p>
                  <p className="calc-disclaimer-text">{labels.output.disclaimerBody}</p>
                </div>
              </aside>

              <p className="calc-note">
                {fill(labels.note.scaleTemplate, {
                  count: unitTypes.length,
                  unit:
                    unitTypes.length === 1 ? labels.note.unitTypeOne : labels.note.unitTypeOther,
                  dry: dryOptions,
                  wet: wetOptions,
                })}
                {activeBreakdown && (
                  <>
                    {" "}
                    {fill(labels.note.activeTemplate, {
                      n: ordinal2(activeUnitTypeIndex + 1),
                      total: activeBreakdown.total.total,
                      base: activeBreakdown.total.base,
                      option: activeBreakdown.total.option,
                    })}
                    {activeBreakdown.extraVariants.total > 0 &&
                      fill(labels.note.extraTemplate, {
                        extra: activeBreakdown.extraVariants.total,
                      })}
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ============ SUB-COMPONENTES ============ */

function RoomRow({
  labels,
  room,
  onQuantidadeChange,
  onComponentesChange,
  onRemove,
}: {
  labels: CalculatorLabels;
  room: RoomConfig;
  onQuantidadeChange: (v: number) => void;
  onComponentesChange: (v: number) => void;
  onRemove: () => void;
}) {
  const isEmpty = room.units <= 0;
  const areaTag = room.areaType === "dry" ? labels.rooms.dryTag : labels.rooms.wetTag;
  return (
    <div className={`calc-room-row${isEmpty ? " is-empty" : ""}`}>
      <span className="calc-room-row-name">
        {room.name}
        {!room.locked && (
          <span
            className="calc-room-row-class"
            /* The pt-BR tag, never `room.areaType` — the value is an English
               identifier now, and interpolating it here would read out
               "Classificação: dry" to a screen reader. */
            aria-label={fill(labels.rooms.classAriaTemplate, { areaType: areaTag })}
          >
            {areaTag}
          </span>
        )}
      </span>
      <div className="calc-room-row-fields">
        <div className="calc-micro-field">
          <span className="calc-micro-label">{labels.rooms.unitsLabel}</span>
          <Stepper
            value={room.units}
            min={ESTIMATE_RANGES.units.min}
            max={ESTIMATE_RANGES.units.max}
            onChange={onQuantidadeChange}
            ariaLabel={fill(labels.rooms.unitsAriaTemplate, { name: room.name })}
          />
        </div>
        <div className="calc-micro-field">
          <span className="calc-micro-label">{labels.rooms.componentsLabel}</span>
          <Stepper
            value={room.components}
            min={ESTIMATE_RANGES.components.min}
            max={ESTIMATE_RANGES.components.max}
            onChange={onComponentesChange}
            ariaLabel={fill(labels.rooms.componentsAriaTemplate, { name: room.name })}
          />
        </div>
        {!room.locked && (
          <button
            type="button"
            className="calc-room-remove"
            onClick={onRemove}
            aria-label={fill(labels.rooms.removeTemplate, { name: room.name })}
            title={fill(labels.rooms.removeTemplate, { name: room.name })}
          >
            {labels.rooms.removeGlyph}
          </button>
        )}
      </div>
    </div>
  );
}

function AddAmbienteControl({
  labels,
  roomPresets,
  state,
  onOpen,
  onSelectPreset,
  onSelectCustom,
  onChange,
  onConfirm,
  onCancel,
}: {
  labels: CalculatorLabels;
  roomPresets: RoomPreset[];
  state: AddRoomState;
  onOpen: () => void;
  onSelectPreset: (preset: RoomPreset) => void;
  onSelectCustom: () => void;
  onChange: (patch: Partial<{ name: string; areaType: RoomAreaType }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (state === null) {
    return (
      <button type="button" className="calc-add-room-btn" onClick={onOpen}>
        {labels.rooms.addButton}
      </button>
    );
  }

  /* Passo 1: picker com os 5 presets + opção "Personalizado" que abre o
     form de nome livre. Clicar num preset já adiciona o ambient. */
  if (state.mode === "picker") {
    return (
      <div className="calc-add-room-picker" role="group" aria-label={labels.rooms.pickerAria}>
        <p className="calc-add-room-picker-label">{labels.rooms.pickerPrompt}</p>
        <div className="calc-add-room-preset-list">
          {roomPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`calc-add-room-preset calc-add-ambient-preset-${preset.areaType}`}
              onClick={() => onSelectPreset(preset)}
            >
              <span className="calc-add-room-preset-name">{preset.name}</span>
              <span className="calc-add-room-preset-class">
                {preset.areaType === "dry" ? labels.rooms.dryTag : labels.rooms.wetTag}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="calc-add-room-preset calc-add-room-preset-custom"
            onClick={onSelectCustom}
          >
            <span className="calc-add-room-preset-name">{labels.rooms.customOption}</span>
          </button>
        </div>
        <button type="button" className="calc-add-room-cancel" onClick={onCancel}>
          {labels.rooms.cancel}
        </button>
      </div>
    );
  }

  /* Passo 2 (só se user escolheu "Personalizado"): form de nome + classe. */
  const canConfirm = state.name.trim().length > 0;
  return (
    <div className="calc-add-room-form" role="group" aria-label={labels.rooms.formAria}>
      <input
        type="text"
        className="calc-add-room-input"
        placeholder={labels.rooms.namePlaceholder}
        value={state.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canConfirm) onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
        maxLength={40}
      />
      <div className="calc-add-room-class" role="radiogroup" aria-label={labels.rooms.classAria}>
        <button
          type="button"
          role="radio"
          aria-checked={state.areaType === "dry"}
          className={`calc-pill${state.areaType === "dry" ? " is-active" : ""}`}
          onClick={() => onChange({ areaType: "dry" })}
        >
          {labels.rooms.dryPill}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={state.areaType === "wet"}
          className={`calc-pill${state.areaType === "wet" ? " is-active" : ""}`}
          onClick={() => onChange({ areaType: "wet" })}
        >
          {labels.rooms.wetPill}
        </button>
      </div>
      <div className="calc-add-room-actions">
        <button
          type="button"
          className="calc-add-room-confirm"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          {labels.rooms.confirm}
        </button>
        <button type="button" className="calc-add-room-cancel" onClick={onCancel}>
          {labels.rooms.cancel}
        </button>
      </div>
    </div>
  );
}

function UnitTypeGroup({
  labels,
  index,
  unitType,
  calc,
  isActive,
  onSelect,
}: {
  labels: CalculatorLabels;
  index: number;
  unitType: UnitTypeState;
  calc: UnitTypeBreakdown;
  isActive: boolean;
  onSelect: () => void;
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <div
      className={`unit-type-group${isActive ? " is-active" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={fill(labels.cards.groupAriaTemplate, { n: ordinal2(index + 1) })}
      onClick={onSelect}
      onKeyDown={handleKey}
    >
      <header className="unit-type-group-head">
        <span className="unit-type-group-index">
          {fill(labels.cards.indexTemplate, { n: ordinal2(index + 1) })}
        </span>
        <span className="unit-type-group-images">
          {fill(labels.cards.imagesTemplate, { count: calc.total.total.toLocaleString("pt-BR") })}
        </span>
      </header>
      <div className="unit-type-group-cards">
        {Array.from({ length: unitType.variants }, (_, v) => {
          const isMain = v === 0;
          return (
            <VariantCard
              key={v}
              labels={labels}
              variantIndex={v + 1}
              mode={isMain ? "main" : "extras"}
              rooms={isMain ? calc.rooms : calc.impactedRooms}
              images={isMain ? calc.mainVariant : calc.perExtraVariant}
            />
          );
        })}
      </div>
    </div>
  );
}

/** `mode` distingue a Variação 01 (composição completa) das 02+ (só os
    ambientes impactados). Nada a ver com "imagem base" — essa é uma das duas
    tarifas e aparece em `images.base`. */
function VariantCard({
  labels,
  variantIndex,
  mode,
  rooms,
  images,
}: {
  labels: CalculatorLabels;
  variantIndex: number;
  mode: "main" | "extras";
  rooms: RoomUnit[];
  images: ImageMix;
}) {
  const isMain = mode === "main";
  return (
    <article className={`variant-card variant-card-${mode}`} role="listitem">
      <header className="variant-head">
        <span className="variant-index">
          {fill(labels.cards.variantTemplate, { n: ordinal2(variantIndex) })}
          {!isMain && <span className="variant-tag">{labels.cards.extraTag}</span>}
        </span>
        <span className="variant-images">
          {isMain ? "" : labels.cards.extraPrefix}
          {images.total.toLocaleString("pt-BR")} {labels.cards.variantImagesSuffix}
        </span>
      </header>
      {rooms.length > 0 ? (
        <div className="variant-room-grid">
          {rooms.map((a) => (
            <div
              key={a.key}
              className={`room-tile weight-${a.weight}`}
              title={fill(labels.cards.tileTitleTemplate, {
                label: a.label,
                base: a.baseImages,
                option: a.optionImages,
              })}
            >
              <span className="room-tile-label">{a.label}</span>
              <span className="room-tile-images">{a.images}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="variant-empty">
          {isMain ? labels.cards.emptyMain : labels.cards.emptyExtras}
        </p>
      )}
    </article>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
        fill="currentColor"
      />
    </svg>
  );
}
