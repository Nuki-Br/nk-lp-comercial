"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type SlidesState,
  saveSlidesAction,
} from "@/app/(admin)/admin/proposals/[id]/slides/actions";

/* The slide picker.
 *
 * Nothing here switches on `kind` — the labels, the description and whether a
 * row can carry a demo all arrive as data from SLIDE_META, computed on the
 * server. That is the ADR 18 promise: a new slide type must not force this file
 * open.
 *
 * The demo is a CHECKBOX ON ITS MODULE, never a row of its own. deck-runtime.md
 * asks for exactly that, and the reason is that the demo borrows the module's
 * nav dot: as an independent row a salesperson could move it away from its
 * parent or keep it while hiding the parent, and `normalizeDeck` would silently
 * undo both. Modelled this way the orphan is not constructible, and the
 * validator stays a backstop for configs written by hand.
 *
 * Order and enabled state live in client state so the arrows are instant, and
 * the whole picture is submitted once. One form, one action, one write. */

export type PickerRow = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Present only when this node has a child node in the config. */
  demo?: { id: string; enabled: boolean };
};

const EMPTY: SlidesState = { error: null, notice: null, warnings: [], issues: [] };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-nuki-green-03 px-5 py-2.5 font-semibold text-nuki-white transition hover:bg-nuki-green-08 disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar slides"}
    </button>
  );
}

export function SlidePicker({ id, initialRows }: { id: string; initialRows: PickerRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [state, action] = useActionState<SlidesState, FormData>(saveSlidesAction, EMPTY);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggle = (rowId: string, enabled: boolean) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, enabled } : r)));
  };

  const toggleDemo = (rowId: string, enabled: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId && r.demo ? { ...r, demo: { ...r.demo, enabled } } : r)),
    );
  };

  /* The stored order names every node, with each demo immediately after its
     module. `normalizeDeck` re-anchors a stray child anyway, but writing a delta
     that already needs repairing is writing a delta nobody can read. */
  const payload = JSON.stringify({
    order: rows.flatMap((r) => (r.demo ? [r.id, r.demo.id] : [r.id])),
    enabled: Object.fromEntries(
      rows.flatMap((r) =>
        r.demo
          ? [[r.id, r.enabled] as const, [r.demo.id, r.demo.enabled] as const]
          : [[r.id, r.enabled] as const],
      ),
    ),
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="state" value={payload} />

      <ol className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="flex flex-wrap items-start gap-3 rounded-xl border border-nuki-gray-border p-3"
          >
            <div className="flex flex-col gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Mover ${row.label} para cima`}
                className="rounded-md border border-nuki-gray-border px-2 text-sm leading-6 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === rows.length - 1}
                aria-label={`Mover ${row.label} para baixo`}
                className="rounded-md border border-nuki-gray-border px-2 text-sm leading-6 disabled:opacity-30"
              >
                ↓
              </button>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => toggle(row.id, e.target.checked)}
                />
                {row.label}
              </label>
              <p className="text-xs text-nuki-gray-7">{row.description}</p>

              {row.demo && (
                <label className="mt-1 flex items-center gap-2 text-sm text-nuki-gray-mid">
                  <input
                    type="checkbox"
                    checked={row.demo.enabled}
                    disabled={!row.enabled}
                    onChange={(e) => toggleDemo(row.id, e.target.checked)}
                  />
                  Incluir a demo navegável deste módulo
                </label>
              )}
            </div>

            <span className="pt-1 text-xs tabular-nums text-nuki-gray-7">{index + 1}</span>
          </li>
        ))}
      </ol>

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
