import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Um número grande com um rótulo pequeno em cima e uma linha de apoio embaixo.
 *
 * Usado nos dois lugares que respondem à mesma pergunta em escalas diferentes:
 * o topo do painel (o portfólio inteiro) e o card de atenção de uma proposta.
 * São `<dt>`/`<dd>` porque isto é literalmente uma lista de termo e definição,
 * e um leitor de tela lê "Aberturas, 12" em vez de "12".
 *
 * `tabular-nums` não é cosmético: quatro tiles lado a lado com números que
 * mudam de largura dançam a cada revalidação. */
export function StatTile({
  label,
  value,
  hint,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** A segunda leitura do mesmo número — o recorte, a média, a fatia. */
  hint?: ReactNode;
  className?: string;
}) {
  return (
    /* O tile levanta um pixel no hover. Ele não é clicável, e é justamente por
       isso que a resposta é mínima: o suficiente para o ponteiro saber em qual
       dos quatro está pousado ao comparar dois números, e pouco o bastante para
       não prometer um clique que não existe. */
    <div
      className={cn(
        "group flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm",
        "transition-[box-shadow,border-color,translate] duration-200 ease-out-quart",
        "hover:-translate-y-px hover:border-ring/20 hover:shadow-md",
        className,
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

/** A barra de proporção que substitui um gráfico. A Regra 3 proíbe biblioteca
    de chart, e uma div com `width` em porcentagem diz o mesmo — num markup que
    um leitor de tela lê e uma impressora imprime.

    `aria-hidden` porque o número ao lado é o mesmo fato.

    A barra CRESCE da esquerda ao entrar (`animate-sweep`, com `origin-left`).
    Uma lista de seis barras já desenhadas obriga a comparar seis comprimentos
    parados; crescendo juntas, a mais longa se declara sozinha no meio da
    animação. É a única coisa que uma biblioteca de gráfico daria aqui, e são
    duas classes. */
export function ShareBar({ share, className }: { share: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-1.5 min-w-[2px] origin-left rounded-full bg-primary animate-sweep",
        /* A largura também transiciona: nas telas em que o número muda sem
           recarregar, a barra acompanha em vez de saltar. */
        "transition-[width] duration-500 ease-out-quart",
        className,
      )}
      style={{ width: `${Math.round(share * 100)}%` }}
    />
  );
}
