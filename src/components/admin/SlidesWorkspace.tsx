"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  type SlidesState,
  saveSlidesAction,
} from "@/app/(admin)/admin/proposals/[id]/slides/actions";
import { UnpublishedChangesBanner } from "@/components/admin/ComposerTabs";
import { DeckPreview } from "@/components/admin/DeckPreview";
import { type PickerRow, SlidePicker } from "@/components/admin/SlidePicker";
import { Alert, AlertList } from "@/components/admin/ui/Alert";
import { SubmitButton } from "@/components/admin/ui/SubmitButton";
import { cn } from "@/lib/cn";

/* A aba Slides inteira: prévia à esquerda, rail à direita.
 *
 * Aqui mora TODO o estado da tela — ordem, ligado/desligado, o que já foi salvo
 * e qual slide a prévia está mostrando. O rail desenha, a prévia mostra, e nem
 * um nem outro guarda nada: é o que permite que um arrasto no rail e um clique
 * na prévia falem da mesma lista sem nenhum caminho de volta.
 *
 * Um formulário, uma action, uma escrita. A ordem e os interruptores são
 * instantâneos porque vivem em React; o que atravessa é um campo escondido só,
 * na hora do salvar — a validação do `saveProposalOverride` precisa do quadro
 * inteiro, não de um delta por clique. */

const EMPTY: SlidesState = { error: null, notice: null, warnings: [], issues: [] };

/* The stored order names every node, with each demo immediately after its
   module. `normalizeDeck` re-anchors a stray child anyway, but writing a delta
   that already needs repairing is writing a delta nobody can read. */
function payloadOf(rows: PickerRow[]): string {
  return JSON.stringify({
    order: rows.flatMap((row) => (row.demo ? [row.id, row.demo.id] : [row.id])),
    enabled: Object.fromEntries(
      rows.flatMap((row) =>
        row.demo
          ? [[row.id, row.enabled] as const, [row.demo.id, row.demo.enabled] as const]
          : [[row.id, row.enabled] as const],
      ),
    ),
  });
}

export function SlidesWorkspace({
  id,
  initialRows,
  previewSrc,
  snapshotStale,
}: {
  id: string;
  initialRows: PickerRow[];
  previewSrc: string;
  /** Publicada, com edições que o cliente ainda não vê. */
  snapshotStale: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [state, action] = useActionState<SlidesState, FormData>(saveSlidesAction, EMPTY);
  const [savedPayload, setSavedPayload] = useState(() => payloadOf(initialRows));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const activeIdRef = useRef<string | null>(null);
  /* O que FOI enviado, capturado no envio. Ler `rows` depois da resposta
     marcaria como salvo uma edição feita enquanto a action rodava. */
  const submittedPayload = useRef(savedPayload);
  const handledState = useRef(state);

  const payload = payloadOf(rows);
  const dirty = payload !== savedPayload;
  const activeCount = rows.filter((row) => row.enabled).length;

  const move = (from: number, to: number) => {
    setRows((previous) => {
      const next = [...previous];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggle = (rowId: string, enabled: boolean) => {
    setRows((previous) => previous.map((row) => (row.id === rowId ? { ...row, enabled } : row)));
  };

  const toggleDemo = (rowId: string, enabled: boolean) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId && row.demo ? { ...row, demo: { ...row.demo, enabled } } : row,
      ),
    );
  };

  /** Rola a prévia até o slide. Mesma origem, então é um `getElementById` no
      documento de dentro — não há protocolo de mensagem para manter em dia.
      Um slide desligado não tem elemento: o realce acontece, o scroll não. */
  const scrollPreviewTo = (slideId: string) => {
    const target = frameRef.current?.contentDocument?.getElementById(slideId);
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  const select = (slideId: string) => {
    setActiveId(slideId);
    activeIdRef.current = slideId;
    scrollPreviewTo(slideId);
  };

  /* Salvou: a prévia que está na tela virou passado. Recarrega, e o estado
     "salvo" passa a ser o que acabou de ser aceito — não o que está no rail
     agora. */
  useEffect(() => {
    if (state === handledState.current) return;
    handledState.current = state;
    if (!state.notice) return;
    setSavedPayload(submittedPayload.current);
    setReloadToken((token) => token + 1);
  }, [state]);

  return (
    /* Altura de janela, não de conteúdo: as duas colunas rolam por dentro e a
       página não rola. O valor desconta a barra do painel, a faixa grudenta do
       compositor e o respiro do `<main>` — e é `lg:` porque abaixo disso as
       colunas empilham e cada uma volta a ter a altura que pedir.
     *
     * O RAIL FICA À ESQUERDA. Como em qualquer construtor de site: a lista das
     * peças de um lado, o que elas produzem do outro. As outras três abas já
     * eram assim — edita-se à esquerda e confere-se o resultado à direita — e a
     * prévia é exatamente o painel de consequência delas, em tamanho grande. */
    <div className="flex flex-col gap-4 animate-fade lg:grid lg:h-[var(--admin-workspace)] lg:min-h-[34rem] lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-stretch">
      <form
        action={(formData) => {
          submittedPayload.current = String(formData.get("state") ?? "");
          action(formData);
        }}
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="state" value={payload} />

        <div className="flex flex-col gap-3 border-b border-border px-3.5 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Slides desta proposta</h2>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
              Arraste para reordenar, esconda com o olho o que não vai, clique para ver na prévia.
            </p>
          </div>
          {/* No rail e não acima da área de trabalho: a altura das duas colunas
              é medida da janela, e um aviso empurrando tudo para baixo faria a
              prévia sair de vista exatamente nas propostas já publicadas. */}
          {snapshotStale && <UnpublishedChangesBanner id={id} />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <SlidePicker
            rows={rows}
            activeId={activeId}
            onSelect={select}
            onMove={move}
            onToggle={toggle}
            onToggleDemo={toggleDemo}
          />
        </div>

        {(state.issues.length > 0 || state.error || state.notice || state.warnings.length > 0) && (
          <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
            <AlertList tone="danger" items={state.issues} />
            {state.error && (
              <Alert tone="danger" live>
                {state.error}
              </Alert>
            )}
            {state.notice && !dirty && (
              <Alert tone="success" live>
                {state.notice}
              </Alert>
            )}
            <AlertList tone="warning" items={state.warnings} live={false} />
          </div>
        )}

        {/* Sem a faixa cinza que o rodapé de card tinha: o painel de envio da
            Visão geral já a deixou para trás, e o fio sozinho separa igual. */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {/* O ponto laranja é a única coisa na tela que diz "há trabalho não
                salvo aqui", e ele aparece em resposta a um clique em qualquer
                lugar do rail. Escalando de zero, o olho o encontra no canto
                inferior sem ter de procurá-lo. */}
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full transition-[scale,background-color] duration-300 ease-out-back",
                dirty ? "scale-100 bg-warning" : "scale-0 bg-transparent",
              )}
            />
            {dirty ? "Alterações não salvas" : `${activeCount} de ${rows.length} slides ativos`}
          </p>
          <SubmitButton label="Salvar slides" pendingLabel="Salvando…" size="sm" />
        </div>
      </form>

      <DeckPreview
        src={previewSrc}
        frameRef={frameRef}
        reloadToken={reloadToken}
        stale={dirty}
        /* Depois de recarregar, volta para onde o vendedor estava olhando. */
        onFrameLoad={() => {
          if (activeIdRef.current) scrollPreviewTo(activeIdRef.current);
        }}
        className="h-[28rem] lg:h-auto"
      />
    </div>
  );
}
