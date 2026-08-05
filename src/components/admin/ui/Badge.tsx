import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Pílula de status. Um ponto colorido e uma palavra.
 *
 * O ponto existe porque o status de uma proposta é a informação que um vendedor
 * varre a coluna inteira procurando, e uma diferença de cor é lida antes da
 * palavra — sem que a cor seja a ÚNICA portadora do fato, que é o que quebraria
 * para quem não distingue as duas. */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "brand";

const TONES: Record<BadgeTone, { chip: string; dot: string }> = {
  neutral: { chip: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  success: { chip: "border-success/25 bg-success/10 text-success", dot: "bg-success" },
  warning: { chip: "border-warning/30 bg-warning/10 text-warning", dot: "bg-warning" },
  danger: {
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  brand: { chip: "border-border bg-secondary text-secondary-foreground", dot: "bg-foreground" },
};

export function Badge({
  tone = "neutral",
  dot = true,
  className,
  children,
}: {
  tone?: BadgeTone;
  /** Desligue quando a pílula já for autoexplicativa — um contador, uma data. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { chip, dot: dotClass } = TONES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        /* A pílula de status troca de tom quando a proposta muda de estado, e a
           troca acontece sob os olhos de quem clicou em "Publicar". Sem
           transição ela pisca de cinza para verde; com ela, a cor atravessa. */
        "transition-colors duration-300 ease-out-quart",
        chip,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dotClass)} />}
      {children}
    </span>
  );
}
