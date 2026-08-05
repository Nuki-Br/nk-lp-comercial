import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Um link que abre fora do painel, com a setinha e o aviso de nova aba.
 *
 * Existia quatro vezes copiado — nos dois editores, na moldura da prévia e na
 * régua do compositor — e as quatro cópias já discordavam: duas tinham o
 * `<span class="sr-only">em uma nova aba</span>`, duas não. Um `target="_blank"`
 * sem esse aviso é uma janela que aparece sem explicação para quem usa leitor de
 * tela, e é exatamente o tipo de detalhe que some numa cópia.
 *
 * A seta anda para o canto superior direito no hover — o mesmo canto para onde a
 * aba nova vai. É a única animação do painel que aponta para fora dele. */
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground",
        "underline-offset-4 outline-none transition-colors duration-200",
        "hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className="transition-transform duration-200 ease-out-quart group-hover:-translate-y-px group-hover:translate-x-px"
      >
        ↗
      </span>
      <span className="sr-only">em uma nova aba</span>
    </a>
  );
}
