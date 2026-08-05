"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type EstimateState,
  saveEstimateAction,
} from "@/app/(admin)/admin/proposals/[id]/estimate/actions";
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

const field =
  "rounded-lg border border-nuki-gray-border bg-nuki-white px-2 py-1.5 outline-none focus:border-nuki-green-02";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-nuki-gray-7";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar calculadora"}
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex w-28 flex-col gap-1">
      <span className={labelClass}>{label}</span>
      <input
        className={field}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(clamp(Math.trunc(Number(e.target.value) || 0), min, max))}
      />
    </label>
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

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={payload} />

      <fieldset className="flex flex-col gap-3">
        <legend className={labelClass}>Começar de um porte</legend>
        <p className="text-sm text-nuki-gray-mid">
          Substitui tudo abaixo pela composição do preset. Depois é só ajustar para o empreendimento
          do cliente.
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => seedFrom(preset)}
              className="rounded-full border border-nuki-gray-border px-4 py-2 text-sm font-semibold transition hover:border-nuki-green-02"
            >
              Começar do {preset.name}
              <span className="ml-2 font-normal text-nuki-gray-7">{preset.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-wrap gap-4">
        <legend className={labelClass}>Opções por componente</legend>
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
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={labelClass}>Metragens</legend>

        {unitTypes.map((type, typeIndex) => (
          <div
            key={type.id}
            className="flex flex-col gap-3 rounded-xl border border-nuki-gray-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Metragem {typeIndex + 1}</h3>
              <button
                type="button"
                onClick={() => removeUnitType(typeIndex)}
                disabled={unitTypes.length <= ESTIMATE_RANGES.unitTypes.min}
                className="text-sm text-nuki-gray-mid underline disabled:opacity-40"
              >
                Remover metragem
              </button>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-nuki-gray-7">
                <tr>
                  <th className="pb-1 font-semibold">Ambiente</th>
                  <th className="pb-1 font-semibold">Classe</th>
                  <th className="pb-1 font-semibold">Qtd.</th>
                  <th className="pb-1 font-semibold">Componentes</th>
                  <th className="pb-1 font-semibold">Varia</th>
                  <th className="pb-1" />
                </tr>
              </thead>
              <tbody>
                {type.rooms.map((room) => (
                  <tr key={room.id} className="border-t border-nuki-gray-divider">
                    <td className="py-1.5 pr-2">
                      <input
                        className={`${field} w-full`}
                        value={room.name}
                        aria-label="Nome do ambiente"
                        onChange={(e) => patchRoom(typeIndex, room.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        className={field}
                        value={room.areaType}
                        aria-label="Classe do ambiente"
                        onChange={(e) =>
                          patchRoom(typeIndex, room.id, {
                            areaType: e.target.value as RoomAreaType,
                          })
                        }
                      >
                        <option value="dry">Seca</option>
                        <option value="wet">Molhada</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        className={`${field} w-16`}
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
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        className={`${field} w-16`}
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
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      {/* Impacted by the extra floor-plan variants: each ticked
                          room contributes one more unit of images per extra
                          variant. Without any, the extra variants render zero. */}
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
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeRoom(typeIndex, room.id)}
                        aria-label={`Remover ${room.name}`}
                        className="px-1 text-nuki-gray-mid hover:text-nuki-orange"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2">
                {roomPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addRoom(typeIndex, preset.name, preset.areaType)}
                    className="rounded-full border border-nuki-gray-border px-3 py-1 text-xs font-semibold transition hover:border-nuki-green-02"
                  >
                    + {preset.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addRoom(typeIndex, "Novo ambiente", "dry")}
                  className="rounded-full border border-nuki-gray-border px-3 py-1 text-xs font-semibold transition hover:border-nuki-green-02"
                >
                  + Personalizado
                </button>
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
          <button
            type="button"
            onClick={addUnitType}
            disabled={unitTypes.length >= ESTIMATE_RANGES.unitTypes.max}
            className="rounded-full border border-nuki-gray-border px-4 py-2 text-sm font-semibold transition hover:border-nuki-green-02 disabled:opacity-40"
          >
            + Adicionar metragem
          </button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={labelClass}>Atalhos de porte visíveis ao cliente</legend>
        <p className="text-sm text-nuki-gray-mid">
          Os chips que aparecem no topo da calculadora. Desmarque todos e o bloco inteiro some da
          apresentação do cliente.
        </p>
        {presets.map((preset) => (
          <label key={preset.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={keptPresetIds.includes(preset.id)}
              onChange={(e) =>
                setKeptPresetIds((prev) =>
                  e.target.checked
                    ? [...prev, preset.id]
                    : prev.filter((keptId) => keptId !== preset.id),
                )
              }
            />
            {preset.name}
            <span className="text-nuki-gray-7">{preset.hint}</span>
          </label>
        ))}
      </fieldset>

      {state.issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-nuki-orange p-3">
          {state.issues.map((issue) => (
            <li key={issue} className="text-sm font-semibold text-nuki-orange">
              {issue}
            </li>
          ))}
        </ul>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-nuki-orange">
          {state.error}
        </p>
      )}
      {state.notice && <p className="text-sm font-semibold text-nuki-green-02">{state.notice}</p>}
      {state.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-nuki-gray-light p-3">
          {state.warnings.map((warning) => (
            <li key={warning} className="text-sm text-nuki-gray-mid">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
