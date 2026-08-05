"use client";

import { useState } from "react";
import { Switch } from "@/components/admin/ui/Switch";
import { cn } from "@/lib/cn";

/* O rail de slides — a lista arrastável ao lado da prévia.
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
 * ARRASTAR NÃO É O ÚNICO CAMINHO. O punho é um `<button>` de verdade e move a
 * linha com ↑/↓ quando está focado, porque a HTML5 Drag and Drop API não tem
 * equivalente de teclado nenhum — quem navega por teclado ficaria sem
 * reordenação, e reordenar é a metade do trabalho desta tela. As duas rotas
 * chamam o mesmo `onMove` e anunciam a mesma frase na região viva.
 *
 * O estado (ordem, ligado/desligado) NÃO mora aqui: mora no `SlidesWorkspace`,
 * que é quem submete tudo de uma vez e recarrega a prévia. Este arquivo desenha
 * e avisa. */

export type PickerRow = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** Present only when this node has a child node in the config. */
  demo?: { id: string; enabled: boolean };
};

export function SlidePicker({
  rows,
  activeId,
  onSelect,
  onMove,
  onToggle,
  onToggleDemo,
}: {
  rows: PickerRow[];
  /** A linha que a prévia está mostrando. Só realce — não muda o que é salvo. */
  activeId: string | null;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onToggleDemo: (id: string, enabled: boolean) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  /* A linha cujo punho está com o ponteiro em cima. É ela — e só ela — que fica
     `draggable`, pelo motivo abaixo. */
  const [liftedId, setLiftedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const dragIndex = dragId === null ? -1 : rows.findIndex((row) => row.id === dragId);

  const announce = (row: PickerRow, index: number) =>
    setAnnouncement(`${row.label} movido para a posição ${index + 1} de ${rows.length}.`);

  /** Reordena DURANTE o arrasto, em vez de desenhar uma linha de inserção e
      aplicar no drop. É estável porque a troca acontece só ao entrar numa linha
      diferente: depois dela o ponteiro está sobre a linha arrastada de novo, e o
      próximo `dragenter` é no mesmo índice e não faz nada. */
  const onDragEnterRow = (index: number) => {
    if (dragIndex === -1 || dragIndex === index) return;
    onMove(dragIndex, index);
  };

  const moveByKey = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    onMove(index, target);
    announce(rows[index], target);
  };

  return (
    <>
      <ol
        className="flex flex-col gap-1.5"
        /* No contêiner, não na linha: sem um `dragover` que chama
           `preventDefault`, o navegador recusa o drop e a animação de "voltar
           pro lugar" toca no fim de todo arrasto. */
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => event.preventDefault()}
      >
        {rows.map((row, index) => {
          const dragging = row.id === dragId;
          const active = row.id === activeId;

          return (
            <li
              key={row.id}
              /* SÓ enquanto o ponteiro está no punho.
                 Um `<li draggable>` permanente engole o clique de tudo que está
                 dentro dele: basta o ponteiro andar um ou dois pixels entre o
                 apertar e o soltar para o navegador ler a gestura como arrasto e
                 não emitir `click` nenhum — e o que está dentro desta linha é um
                 interruptor e o botão que rola a prévia. Ligar `draggable` no
                 `pointerdown` do punho chega a tempo: o `dragstart` só acontece
                 depois do primeiro movimento, um render inteiro adiante. */
              draggable={liftedId === row.id}
              onDragStart={(event) => {
                /* Firefox não começa arrasto nenhum sem payload. O valor não é
                   lido em lugar algum — quem move é o estado do React. */
                event.dataTransfer.setData("text/plain", row.id);
                event.dataTransfer.effectAllowed = "move";
                setDragId(row.id);
              }}
              onDragEnter={() => onDragEnterRow(index)}
              onDragEnd={() => {
                if (dragIndex !== -1) announce(row, dragIndex);
                setDragId(null);
                setLiftedId(null);
              }}
              className={cn(
                "group flex items-start gap-1.5 rounded-lg border px-1.5 py-2 transition-[border-color,box-shadow,opacity]",
                /* Um slide desligado continua na lista e continua arrastável —
                   só para de parecer parte da apresentação. */
                row.enabled ? "border-border bg-card" : "border-dashed border-border bg-muted/30",
                active && "border-primary/50 ring-[3px] ring-primary/15",
                dragging && "opacity-40",
              )}
            >
              <button
                type="button"
                aria-label={`Reordenar ${row.label}. Use as setas para cima e para baixo.`}
                onPointerDown={() => setLiftedId(row.id)}
                /* Soltar sem ter arrastado: `dragend` nunca vem, e a linha ficaria
                   `draggable` para sempre — de volta ao problema que isto resolve. */
                onPointerUp={() => setLiftedId(null)}
                onPointerCancel={() => setLiftedId(null)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                  event.preventDefault();
                  moveByKey(index, event.key === "ArrowDown" ? 1 : -1);
                }}
                className="mt-px flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 active:cursor-grabbing"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-3.5"
                >
                  <circle cx="6" cy="3.5" r="1.25" />
                  <circle cx="10" cy="3.5" r="1.25" />
                  <circle cx="6" cy="8" r="1.25" />
                  <circle cx="10" cy="8" r="1.25" />
                  <circle cx="6" cy="12.5" r="1.25" />
                  <circle cx="10" cy="12.5" r="1.25" />
                </svg>
              </button>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  /* O texto visível é "4 Planner", que diz o que a linha É e não
                     o que o botão FAZ. */
                  aria-label={`Ver "${row.label}" na prévia`}
                  className="flex w-full items-center gap-2 rounded text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                >
                  <span className="w-4 shrink-0 text-right text-[0.6875rem] text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      row.enabled ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {row.label}
                  </span>
                </button>

                <p className="mt-0.5 pl-6 text-xs leading-snug text-muted-foreground">
                  {row.description}
                </p>

                {row.demo && (
                  <label
                    className={cn(
                      "mt-2 ml-6 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs",
                      row.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={row.demo.enabled}
                      disabled={!row.enabled}
                      onChange={(event) => onToggleDemo(row.id, event.target.checked)}
                      className="size-3.5 shrink-0 cursor-[inherit] rounded accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                    />
                    <span className="min-w-0 text-foreground">Incluir a demo navegável</span>
                  </label>
                )}
              </div>

              <Switch
                checked={row.enabled}
                onChange={(next) => onToggle(row.id, next)}
                label={`Incluir "${row.label}" nesta apresentação`}
                className="mt-0.5"
              />
            </li>
          );
        })}
      </ol>

      {/* O arrasto não produz som nenhum para um leitor de tela, e o ↑/↓ produz
          um movimento sem texto. Esta linha é o feedback dos dois. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
