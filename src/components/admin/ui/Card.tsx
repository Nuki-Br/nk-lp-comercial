import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* O card do painel. Cada seção de uma tela é um destes.
 *
 * Composição em vez de props booleanas: `<Card>` não conhece "temTítulo" nem
 * "temRodapé" — quem monta a tela empilha `CardHeader`, `CardContent` e
 * `CardFooter` na ordem que quiser, e uma seção sem cabeçalho simplesmente não
 * renderiza um. */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Cabeçalho: título, descrição e — opcionalmente — uma ação à direita. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-5", className)}>{children}</div>;
}

/** Rodapé em faixa `muted` — é onde mora o submit, como no Vercel dashboard. */
export function CardFooter({
  className,
  children,
  hint,
}: {
  className?: string;
  children: ReactNode;
  /** Texto à esquerda do botão: a consequência de salvar, em uma linha. */
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-border bg-muted/50 px-5 py-3",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Título de página — acima dos cards, nunca dentro de um. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
