import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Aviso em caixa. Erro, alerta, confirmação.
 *
 * O tom NUNCA carrega o fato sozinho: a borda colorida acompanha um texto que
 * já diz o que aconteceu, e `role="alert"` só entra quando a caixa aparece
 * DEPOIS de uma ação do usuário — uma caixa presente desde o carregamento com
 * `role="alert"` faz o leitor de tela interromper a leitura da página por uma
 * informação que não é nova. Daí o `live` ser um parâmetro e não o padrão. */

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, string> = {
  info: "border-border bg-muted/50 text-foreground",
  success: "border-success/30 bg-success/8 text-foreground",
  warning: "border-warning/40 bg-warning/8 text-foreground",
  danger: "border-destructive/40 bg-destructive/8 text-foreground",
};

const ICON_TONES: Record<AlertTone, string> = {
  info: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

function AlertIcon({ tone }: { tone: AlertTone }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("mt-0.5 size-4 shrink-0", ICON_TONES[tone])}
    >
      <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1.5" />
      {tone === "success" ? (
        <path
          d="M5.25 8.25 7 10l3.75-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M8 4.75v4M8 11.1v.15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function Alert({
  tone = "info",
  title,
  live = false,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  /** `true` quando a caixa é a resposta a um envio de formulário. */
  live?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    /* `animate-rise` porque uma caixa de aviso quase sempre é a RESPOSTA a algo:
       o retorno de um envio, um campo que faltou. Aparecendo de uma vez, ela
       empurra o resto da tela para baixo sem que se perceba de onde veio — a
       entrada de meio passo é o que liga a caixa ao clique que a produziu. */
    <div
      role={live ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm leading-relaxed animate-rise",
        TONES[tone],
        className,
      )}
    >
      <AlertIcon tone={tone} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && (
          <div className={cn(title ? "mt-0.5" : undefined, "text-muted-foreground")}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** Uma lista de avisos no mesmo tom — o formato que as Server Functions do
    painel devolvem em `issues` e `warnings`. */
export function AlertList({
  tone,
  title,
  items,
  live = true,
}: {
  tone: AlertTone;
  title?: ReactNode;
  items: readonly string[];
  live?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <Alert tone={tone} title={title} live={live}>
      <ul className={cn(items.length > 1 && "list-disc space-y-0.5 pl-4")}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Alert>
  );
}
