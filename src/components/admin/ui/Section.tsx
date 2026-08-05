import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Uma seção de ajustes, sem caixa.
 *
 * `Card` continua sendo o certo para um bloco que se lê como uma unidade
 * fechada — o painel de envio, o simulador ao vivo de preços. Para uma tela de
 * ajustes ele era o errado: cinco cards empilhados dão cinco bordas, cinco
 * sombras e cinco rodapés cinza para dizer "título", "senha", "atenção", e a
 * moldura acaba pesando mais que o campo. Aqui a hierarquia sai do rótulo à
 * esquerda e de um fio entre uma seção e a seguinte.
 *
 * A coluna de rótulo só entra em `xl`. Abaixo disso o compositor já está
 * dividido entre o conteúdo e o painel de envio de 20rem, e um terceiro corte
 * vertical deixaria o campo mais estreito que o texto de apoio dele.
 *
 * `scroll-mt` é a faixa grudenta do compositor (barra do painel + título +
 * abas): sem ela, um `#senha` vindo do painel de envio para embaixo do cabeçalho
 * e a seção some justamente na hora em que se clicou nela. A medida é
 * `--admin-anchor`, calculada em `admin.css` a partir da altura da barra e da
 * régua — era um `12rem` cravado aqui, que só por sorte batia com o `10.5rem`
 * cravado nos três painéis grudentos. */
export function Section({
  id,
  title,
  description,
  children,
  className,
}: {
  /** Alvo de âncora — o painel de envio aponta para cá. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid scroll-mt-[var(--admin-anchor)] gap-x-10 gap-y-4 border-t border-border pt-6",
        "xl:grid-cols-[13rem_minmax(0,1fr)]",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A linha do submit de uma seção: a consequência à esquerda, o botão à direita.
 *
 * É o rodapé de card sem a faixa cinza — que existia para separar o rodapé do
 * corpo dentro de uma caixa, e sem caixa não separa nada. */
export function SectionActions({
  hint,
  children,
  className,
}: {
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 pt-1", className)}>
      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {/* `ml-auto` e não só o `justify-between`: quando a dica é longa ela toma a
          linha inteira e o botão desce — e sem isto ele desceria para a
          ESQUERDA, com o de cima à direita. A borda direita é a mesma nas duas
          seções, com dica curta ou longa. */}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
