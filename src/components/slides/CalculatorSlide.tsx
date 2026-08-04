"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildDefaultRooms,
  noImpactedRooms,
  ROOM_PRESETS,
  PROJECT_SIZE_PRESETS,
  ESTIMATE_DEFAULTS,
  ESTIMATE_RANGES,
  CUSTOM_ROOM_DEFAULTS,
  type ProjectSizePreset,
  type RoomAreaType,
  type RoomConfig,
  type UnitTypeState,
} from "@/content/deck";
import { Stepper } from "@/components/ui/Stepper";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency, clamp } from "@/lib/format";
import {
  computeEstimate,
  estimateCost,
  type ImageMix,
  type RoomUnit,
  type UnitTypeBreakdown,
} from "@/lib/estimate";
import { useEstimate } from "@/components/deck/EstimateProvider";

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

export function CalculatorSlide() {
  const [dryOptions, setOpcoesSecas] = useState(ESTIMATE_DEFAULTS.dryOptions);
  const [wetOptions, setOpcoesMolhadas] = useState(ESTIMATE_DEFAULTS.wetOptions);
  const [baseImagePrice, setBaseImagePrice] = useState(ESTIMATE_DEFAULTS.baseImagePrice);
  const [optionImagePrice, setOptionImagePrice] = useState(ESTIMATE_DEFAULTS.optionImagePrice);
  const [unitTypes, setMetragens] = useState<UnitTypeState[]>(() =>
    ESTIMATE_DEFAULTS.initialUnitTypes(),
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
  }, [adminOpen]);

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
    const next = preset.buildUnitTypes();
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
      weight: CUSTOM_ROOM_DEFAULTS.weight,
      units: CUSTOM_ROOM_DEFAULTS.units,
      components: CUSTOM_ROOM_DEFAULTS.components,
    };
    mutate((prev) =>
      prev.map((m, i) =>
        i === activeUnitTypeIndex ? { ...m, rooms: [...m.rooms, updated] } : m,
      ),
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
      rooms: buildDefaultRooms(),
      variants: 1,
      impactedRooms: noImpactedRooms(),
    };
    mutate((prev) =>
      prev.length >= ESTIMATE_RANGES.unitTypes.max ? prev : [...prev, updated],
    );
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
        <div
          className="calc-admin-panel"
          role="dialog"
          aria-label="Configuração da apresentação"
        >
          <div className="calc-admin-header">
            <span className="calc-admin-title">Config apresentação</span>
            <button
              type="button"
              className="calc-admin-close"
              onClick={() => setAdminOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <div className="calc-admin-field">
            <label className="calc-admin-label" htmlFor="calc-admin-base-price">
              Valor da imagem base (R$)
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
              Valor da imagem de opção (R$)
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
          <p className="calc-admin-hint">Ctrl+Alt+K abre/fecha · ESC fecha</p>
        </div>
      )}
    <section className="slide calculator" id="calculator" data-reveal-group="">
      <div className="slide-inner">
        <div className="section-head">
          <p className="tag reveal">Estime o setup</p>
          <h2 className="reveal">
            Descubra quantas imagens seu empreendimento{" "}
            <em>vai precisar.</em>
          </h2>
          <p className="lead reveal">
            Cada ambiente é modelado em 3D uma vez — dessa modelagem sai a <em>imagem base</em>. As opções de acabamento são recortes de material sobre ela, e por isso custam bem menos. Escolha um ponto de partida e ajuste ambiente por ambiente.
          </p>
        </div>

        <div className="calc-grid reveal">
          {/* ============ INPUTS ============ */}
          <div className="calc-inputs">
            {/* Presets de porte — substituem o estado inteiro da calculadora */}
            <div className="calc-field calc-presets">
              <label className="calc-label calc-label-sm">Ponto de partida</label>
              <div
                className="calc-preset-list"
                role="radiogroup"
                aria-label="Porte do empreendimento"
              >
                {PROJECT_SIZE_PRESETS.map((preset) => (
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
                <label className="calc-label calc-label-sm">Opções por componente · secas</label>
                <Stepper
                  value={dryOptions}
                  min={ESTIMATE_RANGES.dryOptions.min}
                  max={ESTIMATE_RANGES.dryOptions.max}
                  onChange={changeDryOptions}
                  ariaLabel="Opções por componente em áreas secas"
                />
              </div>
              <div className="calc-field">
                <label className="calc-label calc-label-sm">Opções por componente · molhadas</label>
                <Stepper
                  value={wetOptions}
                  min={ESTIMATE_RANGES.wetOptions.min}
                  max={ESTIMATE_RANGES.wetOptions.max}
                  onChange={changeWetOptions}
                  ariaLabel="Opções por componente em áreas molhadas"
                />
              </div>
            </div>

            {/* Tabs de metragens */}
            <div className="calc-unit-type-tabs" role="tablist" aria-label="Metragens do empreendimento">
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
                    Metragem {String(i + 1).padStart(2, "0")}
                  </button>
                  {unitTypes.length > ESTIMATE_RANGES.unitTypes.min && (
                    <button
                      type="button"
                      className="calc-unit-type-tab-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMetragem(i);
                      }}
                      aria-label={`Remover metragem ${i + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {unitTypes.length < ESTIMATE_RANGES.unitTypes.max && (
                <button
                  type="button"
                  className="calc-unit-type-add"
                  onClick={addMetragem}
                  aria-label="Adicionar metragem"
                >
                  + Adicionar
                </button>
              )}
            </div>

            {/* Painel da metragem ativa */}
            {isActive && (
              <div className="calc-unit-type-panel">
                <div className="calc-room-rows">
                  <p className="calc-label calc-room-rows-head">Ambientes personalizáveis</p>
                  {isActive.rooms.map((a) => (
                    <RoomRow
                      key={a.id}
                      room={a}
                      onQuantidadeChange={(v) => updateAmbiente(a.id, { units: v })}
                      onComponentesChange={(v) => updateAmbiente(a.id, { components: v })}
                      onRemove={() => removeAmbiente(a.id)}
                    />
                  ))}

                  <AddAmbienteControl
                    state={addingAmbiente}
                    onOpen={() => setAddingAmbiente({ mode: "picker" })}
                    onSelectPreset={(preset) => addAmbient(preset.name, preset.areaType)}
                    onSelectCustom={() =>
                      setAddingAmbiente({ mode: "custom", name: "", areaType: "molhada" })
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
                  <label className="calc-label">Variações desta metragem</label>
                  <div className="calc-pills" role="radiogroup" aria-label="Variações">
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
                      <label className="calc-label">Ambientes impactados nas variações</label>
                      <p className="calc-axes-hint">
                        Layout novo é modelagem nova: 1 unidade de cada ambiente marcado entra de novo na contagem por variação extra — com a imagem base dela e os componentes configurados acima.
                      </p>
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
                <span className="calc-out-label">imagens necessárias</span>
                {/* Sem useCountUp: legenda com número animado vira ruído. */}
                <span className="calc-out-mix">
                  {imageMix.base.toLocaleString("pt-BR")} base ·{" "}
                  {imageMix.option.toLocaleString("pt-BR")} de opção
                </span>
              </div>
              <div className="calc-out-divider" aria-hidden="true" />
              <div className="calc-out-block">
                <span className="calc-out-value">{formatCurrency(costDisplay)}</span>
                <span className="calc-out-label">setup de imagens estimado</span>
              </div>
            </div>

            <aside className="calc-disclaimer" role="note" aria-label="Aviso sobre a estimativa">
              <span className="calc-disclaimer-icon" aria-hidden="true">
                <InfoIcon />
              </span>
              <div className="calc-disclaimer-body">
                <p className="calc-disclaimer-title">Este valor é uma aproximação</p>
                <p className="calc-disclaimer-text">
                  A estimativa serve como referência inicial pra dimensionar o setup do empreendimento. O valor oficial só é fechado quando são consideradas as particularidades reais do empreendimento e do catálogo de acabamentos.
                </p>
              </div>
            </aside>

            <p className="calc-note">
              {unitTypes.length} {unitTypes.length === 1 ? "metragem" : "metragens"} · escala {dryOptions}/{wetOptions} opções por componente (secas/molhadas).
              {activeBreakdown && (
                <>
                  {" "}
                  Metragem {String(activeUnitTypeIndex + 1).padStart(2, "0")}:{" "}
                  {activeBreakdown.total.total} imgs ({activeBreakdown.total.base} base ·{" "}
                  {activeBreakdown.total.option} de opção)
                  {activeBreakdown.extraVariants.total > 0 &&
                    `, sendo ${activeBreakdown.extraVariants.total} das variações`}
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
  room,
  onQuantidadeChange,
  onComponentesChange,
  onRemove,
}: {
  room: RoomConfig;
  onQuantidadeChange: (v: number) => void;
  onComponentesChange: (v: number) => void;
  onRemove: () => void;
}) {
  const isEmpty = room.units <= 0;
  return (
    <div className={`calc-room-row${isEmpty ? " is-empty" : ""}`}>
      <span className="calc-room-row-name">
        {room.name}
        {!room.locked && (
          <span className="calc-room-row-class" aria-label={`Classificação: ${room.areaType}`}>
            {room.areaType === "seca" ? "seca" : "molhada"}
          </span>
        )}
      </span>
      <div className="calc-room-row-fields">
        <div className="calc-micro-field">
          <span className="calc-micro-label">unidades</span>
          <Stepper
            value={room.units}
            min={ESTIMATE_RANGES.units.min}
            max={ESTIMATE_RANGES.units.max}
            onChange={onQuantidadeChange}
            ariaLabel={`Unidades de ${room.name}`}
          />
        </div>
        <div className="calc-micro-field">
          <span className="calc-micro-label">componentes</span>
          <Stepper
            value={room.components}
            min={ESTIMATE_RANGES.components.min}
            max={ESTIMATE_RANGES.components.max}
            onChange={onComponentesChange}
            ariaLabel={`Componentes por ${room.name}`}
          />
        </div>
        {!room.locked && (
          <button
            type="button"
            className="calc-room-remove"
            onClick={onRemove}
            aria-label={`Remover ${room.name}`}
            title={`Remover ${room.name}`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function AddAmbienteControl({
  state,
  onOpen,
  onSelectPreset,
  onSelectCustom,
  onChange,
  onConfirm,
  onCancel,
}: {
  state: AddRoomState;
  onOpen: () => void;
  onSelectPreset: (preset: (typeof ROOM_PRESETS)[number]) => void;
  onSelectCustom: () => void;
  onChange: (patch: Partial<{ name: string; areaType: RoomAreaType }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (state === null) {
    return (
      <button type="button" className="calc-add-room-btn" onClick={onOpen}>
        + Adicionar ambiente
      </button>
    );
  }

  /* Passo 1: picker com os 5 presets + opção "Personalizado" que abre o
     form de nome livre. Clicar num preset já adiciona o ambient. */
  if (state.mode === "picker") {
    return (
      <div className="calc-add-room-picker" role="group" aria-label="Escolher ambiente">
        <p className="calc-add-room-picker-label">Escolha um ambiente:</p>
        <div className="calc-add-room-preset-list">
          {ROOM_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={`calc-add-room-preset calc-add-ambient-preset-${preset.areaType}`}
              onClick={() => onSelectPreset(preset)}
            >
              <span className="calc-add-room-preset-name">{preset.name}</span>
              <span className="calc-add-room-preset-class">
                {preset.areaType === "seca" ? "seca" : "molhada"}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="calc-add-room-preset calc-add-room-preset-custom"
            onClick={onSelectCustom}
          >
            <span className="calc-add-room-preset-name">+ Personalizado</span>
          </button>
        </div>
        <button type="button" className="calc-add-room-cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    );
  }

  /* Passo 2 (só se user escolheu "Personalizado"): form de nome + classe. */
  const canConfirm = state.name.trim().length > 0;
  return (
    <div className="calc-add-room-form" role="group" aria-label="Adicionar ambiente personalizado">
      <input
        type="text"
        className="calc-add-room-input"
        placeholder="Nome do ambiente (ex: Home Office)"
        value={state.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canConfirm) onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        autoFocus
        maxLength={40}
      />
      <div className="calc-add-room-class" role="radiogroup" aria-label="Classificação">
        <button
          type="button"
          role="radio"
          aria-checked={state.areaType === "seca"}
          className={`calc-pill${state.areaType === "seca" ? " is-active" : ""}`}
          onClick={() => onChange({ areaType: "seca" })}
        >
          Seca
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={state.areaType === "molhada"}
          className={`calc-pill${state.areaType === "molhada" ? " is-active" : ""}`}
          onClick={() => onChange({ areaType: "molhada" })}
        >
          Molhada
        </button>
      </div>
      <div className="calc-add-room-actions">
        <button
          type="button"
          className="calc-add-room-confirm"
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          Adicionar
        </button>
        <button type="button" className="calc-add-room-cancel" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function UnitTypeGroup({
  index,
  unitType,
  calc,
  isActive,
  onSelect,
}: {
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
      aria-label={`Editar Metragem ${String(index + 1).padStart(2, "0")}`}
      onClick={onSelect}
      onKeyDown={handleKey}
    >
      <header className="unit-type-group-head">
        <span className="unit-type-group-index">Metragem {String(index + 1).padStart(2, "0")}</span>
        <span className="unit-type-group-images">
          {calc.total.total.toLocaleString("pt-BR")} imagens
        </span>
      </header>
      <div className="unit-type-group-cards">
        {Array.from({ length: unitType.variants }, (_, v) => {
          const isMain = v === 0;
          return (
            <VariantCard
              key={v}
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
  variantIndex,
  mode,
  rooms,
  images,
}: {
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
          Variação {String(variantIndex).padStart(2, "0")}
          {!isMain && <span className="variant-tag">apenas ambientes impactados</span>}
        </span>
        <span className="variant-images">
          {isMain ? "" : "+"}
          {images.total.toLocaleString("pt-BR")} imgs
        </span>
      </header>
      {rooms.length > 0 ? (
        <div className="variant-room-grid">
          {rooms.map((a) => (
            <div
              key={a.key}
              className={`room-tile weight-${a.weight}`}
              title={`${a.label}: ${a.baseImages} base + ${a.optionImages} de opção`}
            >
              <span className="room-tile-label">{a.label}</span>
              <span className="room-tile-images">{a.images}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="variant-empty">
          {isMain
            ? "Nenhum ambiente adicionado. Suba as unidades acima."
            : "Nenhum ambiente marcado como impactado."}
        </p>
      )}
    </article>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
        fill="currentColor"
      />
    </svg>
  );
}
