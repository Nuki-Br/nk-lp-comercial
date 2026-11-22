import type { PricingState } from "@/app/(admin)/admin/proposals/[id]/pricing/actions";
import { Alert, AlertList } from "@/components/admin/ui/Alert";

/** O bloco de retorno das Server Functions de preço: problemas que barraram o
    salvamento, o erro ou o aviso de sucesso, e por último os avisos que não
    barram nada. */
export function Feedback({ state }: { state: PricingState }) {
  if (!state.error && !state.notice && !state.issues.length && !state.warnings.length) return null;

  return (
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
  );
}
