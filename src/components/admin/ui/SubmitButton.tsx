"use client";

import { useFormStatus } from "react-dom";
import { type ButtonSize, type ButtonVariant, buttonClass } from "@/components/admin/ui/Button";
import { Spinner } from "@/components/admin/ui/Spinner";

/** O submit de um Server Function, com o estado pendente já ligado.
 *
 * `useFormStatus` só lê o form ANCESTRAL, então este componente tem de estar
 * dentro do `<form>` — nunca é o próprio `<form>`. Era isso que os seis
 * `function Submit()` copiados por `src/components/admin/` faziam; agora é um. */
export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
}: {
  label: string;
  /** Texto durante o envio. Sem ele, o rótulo não muda — só o spinner aparece. */
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)}>
      {pending && <Spinner />}
      {pending ? (pendingLabel ?? label) : label}
    </button>
  );
}
