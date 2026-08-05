"use client";

import { useActionState, useRef, useState } from "react";
import {
  type EstimateState,
  saveEstimateAction,
} from "@/app/(admin)/admin/proposals/[id]/estimate/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { Button } from "@/components/admin/ui/Button";
import { CardContent, CardFooter } from "@/components/admin/ui/Card";
import { Checkbox, FieldLabel, Input, Select } from "@/components/admin/ui/Field";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import type { ProjectSizePreset, RoomPreset } from "@/deck/types";
import {
  ESTIMATE_RANGES,
  materializeUnitTypes,
  type RoomAreaType,
  type RoomConfig,
  type UnitTypeState,
} from "@/lib/estimateTypes";
import { clamp } from "@/lib/format";

/* The estimator seed: what the client's calculator opens with.
 *
 * This is stage 1's no-functions-in-config decision cashing out. `unitTypes` is
 * plain data all the way down, so the admin writes `UnitTypeState[]` directly —
 * no factories, no `buildUnitTypes`, nothing to call on the way in or out. The
 * only care needed is ALIASING: applying a preset must deep-clone, or two unit
 * types end up sharing one `rooms` array and move together. `materializeUnitTypes`
 * is exactly that clone, and it is why it exists.
 *
 * Presets are a seeding affordance here and a per-proposal keep-list. Their room
 * compositions are calibrated content and are never edited through this form —
 * only which of them the client sees. */

const EMPTY: EstimateState = { error: null, notice: null, issues: [], warnings: [] };

function GroupTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {hint && (
        <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <FieldLabel label={label} className={className ?? "w-28"}>
      <Input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(clamp(Math.trunc(Number(e.target.value) || 0), min, max))}
      />
    </FieldLabel>
  );
}

export function EstimateEditor({
  id,
  initialDryOptions,
  initialWetOptions,
  initialUnitTypes,
  initialKeptPresetIds,
  presets,
  roomPresets,
  customRoomDefaults,
}: {
  id: string;
  initialDryOptions: number;
  initialWetOptions: number;
  initialUnitTypes: UnitTypeState[];
  initialKeptPresetIds: string[];
  /** Every shipped preset, so pruning can put one back. */
  presets: ProjectSizePreset[];
  roomPresets: RoomPreset[];
  customRoomDefaults: { weight: string; units: number; components: number };
}) {
  const [dryOptions, setDryOptions] = useState(initialDryOptions);
  const [wetOptions, setWetOptions] = useState(initialWetOptions);
  const [unitTypes, setUnitTypes] = useState<UnitTypeState[]>(initialUnitTypes);
  const [keptPresetIds, setKeptPresetIds] = useState(initialKeptPresetIds);
  const [state, action] = useActionState<EstimateState, FormData>(saveEstimateAction, EMPTY);

  /* Ids only have to be unique WITHIN a unit type, but a single counter across
     the form is simpler to reason about and cannot collide after a preset seeds
     ids 1..N. Same trick the calculator uses for the same reason. */
  const nextRoomId = useRef(1);
  const nextTypeId = useRef(initialUnitTypes.reduce((max, t) => Math.max(max, t.id), 0) + 1);

  const patchType = (index: number, patch: Partial<UnitTypeState>) => {
    setUnitTypes((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const patchRoom = (typeIndex: number, roomId: string, patch: Partial<RoomConfig>) => {
    setUnitTypes((prev) =>
      prev.map((t, i) =>
        i === typeIndex
          ? { ...t, rooms: t.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) }
          : t,
      ),
    );
  };

  const addRoom = (typeIndex: number, name: string, areaType: RoomAreaType) => {
    const roomId = `custom-${nextRoomId.current++}`;
    setUnitTypes((prev) =>
      prev.map((t, i) =>
        i === typeIndex
          ? {
              ...t,
              rooms: [
                ...t.rooms,
                {
                  id: roomId,
                  name,
                  areaType,
                  weight: "medium",
                  units: customRoomDefaults.units,
                  components: customRoomDefaults.components,
                } as RoomConfig,
              ],
            }
          : t,
      ),
    );
  };

  const removeRoom = (typeIndex: number, roomId: string) => {
    setUnitTypes((prev) =>
      prev.map((t, i) => {
        if (i !== typeIndex) return t;
        const { [roomId]: _dropped, ...impactedRooms } = t.impactedRooms;
        return { ...t, rooms: t.rooms.filter((r) => r.id !== roomId), impactedRooms };
      }),
    );
  };

  const addUnitType = () => {
    if (unitTypes.length >= ESTIMATE_RANGES.unitTypes.max) return;
    setUnitTypes((prev) => [
      ...prev,
      /* Cloned from the last one: a new unit type in a real development is
         almost always a variation of the previous, and starting from empty
         means retyping seven rooms. */
      {
        ...materializeUnitTypes([prev[prev.length - 1]])[0],
        id: nextTypeId.current++,
      },
    ]);
  };

  const removeUnitType = (index: number) => {
    if (unitTypes.length <= ESTIMATE_RANGES.unitTypes.min) return;
    setUnitTypes((prev) => prev.filter((_, i) => i !== index));
  };

  /* Seeding. `materializeUnitTypes` is not optional here: `preset.unitTypes` is
     shared module data, so without the clone the N unit types of one preset all
     point at the same `rooms` array and editing one edits the others. */
  const seedFrom = (preset: ProjectSizePreset) => {
    const seeded = materializeUnitTypes(preset.unitTypes);
    setUnitTypes(seeded);
    setDryOptions(preset.dryOptions);
    setWetOptions(preset.wetOptions);
    nextTypeId.current = seeded.length + 1;
  };

  const payload = JSON.stringify({ dryOptions, wetOptions, unitTypes, keptPresetIds });

  const TH = "pb-2 text-xs font-medium text-muted-foreground";

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={payload} />

      <CardContent className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Começar de um porte</legend>
          <GroupTitle hint="Substitui tudo abaixo pela composição do preset. Depois é só ajustar para o empreendimento do cliente.">
            Começar de um porte
          </GroupTitle>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button key={preset.id} variant="outline" size="sm" onClick={() => seedFrom(preset)}>
                {preset.name}
                <span className="font-normal text-muted-foreground">{preset.hint}</span>
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Opções por componente</legend>
          <GroupTitle hint="Quantos acabamentos alternativos cada componente oferece. É o multiplicador de imagens de opção.">
            Opções por componente
          </GroupTitle>
          <div className="flex flex-wrap gap-3">
            <NumberField
              label="Área seca"
              value={dryOptions}
              min={ESTIMATE_RANGES.dryOptions.min}
              max={ESTIMATE_RANGES.dryOptions.max}
              onChange={setDryOptions}
            />
            <NumberField
              label="Área molhada"
              value={wetOptions}
              min={ESTIMATE_RANGES.wetOptions.min}
              max={ESTIMATE_RANGES.wetOptions.max}
              onChange={setWetOptions}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Metragens</legend>
          <GroupTitle hint="Uma por tipo de planta do empreendimento, com os ambientes que a compõem.">
            Metragens
          </GroupTitle>

          {unitTypes.map((type, typeIndex) => (
            <div
              key={type.id}
              className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">Metragem {typeIndex + 1}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUnitType(typeIndex)}
                  disabled={unitTypes.length <= ESTIMATE_RANGES.unitTypes.min}
                >
                  Remover metragem
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className={TH}>
                        Ambiente
                      </th>
                      <th scope="col" className={TH}>
                        Classe
                      </th>
                      <th scope="col" className={TH}>
                        Qtd.
                      </th>
                      <th scope="col" className={TH}>
                        Componentes
                      </th>
                      <th scope="col" className={TH}>
                        Varia
                      </th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {type.rooms.map((room) => (
                      <tr key={room.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-2">
                          <Input
                            value={room.name}
                            aria-label="Nome do ambiente"
                            onChange={(e) =>
                              patchRoom(typeIndex, room.id, { name: e.target.value })
                            }
                            className="h-8"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Select
                            value={room.areaType}
                            aria-label="Classe do ambiente"
                            onChange={(e) =>
                              patchRoom(typeIndex, room.id, {
                                areaType: e.target.value as RoomAreaType,
                              })
                            }
                            className="h-8 w-28"
                          >
                            <option value="dry">Seca</option>
                            <option value="wet">Molhada</option>
                          </Select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            aria-label="Quantidade"
                            min={ESTIMATE_RANGES.units.min}
                            max={ESTIMATE_RANGES.units.max}
                            value={room.units}
                            onChange={(e) =>
                              patchRoom(typeIndex, room.id, {
                                units: clamp(
                                  Math.trunc(Number(e.target.value) || 0),
                                  ESTIMATE_RANGES.units.min,
                                  ESTIMATE_RANGES.units.max,
                                ),
                              })
                            }
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            aria-label="Componentes"
                            min={ESTIMATE_RANGES.components.min}
                            max={ESTIMATE_RANGES.components.max}
                            value={room.components}
                            onChange={(e) =>
                              patchRoom(typeIndex, room.id, {
                                components: clamp(
                                  Math.trunc(Number(e.target.value) || 0),
                                  ESTIMATE_RANGES.components.min,
                                  ESTIMATE_RANGES.components.max,
                                ),
                              })
                            }
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          {/* Impacted by the extra floor-plan variants: each
                              ticked room contributes one more unit of images per
                              extra variant. Without any, the extra variants
                              render zero. */}
                          <input
                            type="checkbox"
                            aria-label={`${room.name} muda nas variações extras`}
                            checked={Boolean(type.impactedRooms[room.id])}
                            onChange={(e) =>
                              patchType(typeIndex, {
                                impactedRooms: {
                                  ...type.impactedRooms,
                                  [room.id]: e.target.checked,
                                },
                              })
                            }
                            className="size-4 accent-primary"
                          />
                        </td>
                        <td className="py-1.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRoom(typeIndex, room.id)}
                            aria-label={`Remover ${room.name}`}
                            className="size-8 hover:text-destructive"
                          >
                            <span aria-hidden="true">×</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {roomPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      onClick={() => addRoom(typeIndex, preset.name, preset.areaType)}
                      className="h-7 px-2.5 text-xs"
                    >
                      + {preset.name}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addRoom(typeIndex, "Novo ambiente", "dry")}
                    className="h-7 px-2.5 text-xs"
                  >
                    + Personalizado
                  </Button>
                </div>

                <NumberField
                  label="Variações"
                  value={type.variants}
                  min={ESTIMATE_RANGES.variants.min}
                  max={ESTIMATE_RANGES.variants.max}
                  onChange={(variants) => patchType(typeIndex, { variants })}
                />
              </div>
            </div>
          ))}

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={addUnitType}
              disabled={unitTypes.length >= ESTIMATE_RANGES.unitTypes.max}
            >
              + Adicionar metragem
            </Button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Atalhos de porte visíveis ao cliente</legend>
          <GroupTitle hint="Os chips que aparecem no topo da calculadora. Desmarque todos e o bloco inteiro some da apresentação do cliente.">
            Atalhos de porte visíveis ao cliente
          </GroupTitle>
          <div className="flex flex-col gap-2.5">
            {presets.map((preset) => (
              <Checkbox
                key={preset.id}
                label={preset.name}
                description={preset.hint}
                checked={keptPresetIds.includes(preset.id)}
                onChange={(e) =>
                  setKeptPresetIds((prev) =>
                    e.target.checked
                      ? [...prev, preset.id]
                      : prev.filter((keptId) => keptId !== preset.id),
                  )
                }
              />
            ))}
          </div>
        </fieldset>

        {(state.issues.length > 0 || state.error || state.notice || state.warnings.length > 0) && (
          <div className="flex flex-col gap-2">
            <AlertList tone="danger" items={state.issues} />
            {state.error && (
              <Alert tone="danger" live>
                {state.error}
              </Alert>
            )}
            {state.notice && (
              <Alert tone="success" live>
                {state.notice}
              </Alert>
            )}
            <AlertList tone="warning" items={state.warnings} live={false} />
          </div>
        )}
      </CardContent>

      <CardFooter
        hint={`${unitTypes.length} metragem${unitTypes.length === 1 ? "" : "s"} · ${keptPresetIds.length} atalho${keptPresetIds.length === 1 ? "" : "s"} visível${keptPresetIds.length === 1 ? "" : "eis"}`}
      >
        <SubmitButton label="Salvar calculadora" pendingLabel="Salvando…" />
      </CardFooter>
    </form>
  );
}
