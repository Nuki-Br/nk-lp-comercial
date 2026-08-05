import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* A coluna do painel — a medida que todas as telas autenticadas compartilham.
 *
 * Existe porque a largura, o recuo lateral e o respiro vertical estavam escritos
 * em quatro arquivos, e três deles concordavam por coincidência: a lista de
 * propostas abria com `py-8`, o compositor com `py-6`, e a barra do painel
 * recebia a largura por prop com um `max-w-5xl` de padrão que nenhuma chamada
 * usava. O resultado era um painel em que o logo, o título da página e o
 * primeiro card não caíam na mesma linha vertical ao trocar de tela.
 *
 * `ADMIN_COLUMN` é para quem precisa da coluna sem o `<main>`: a barra grudenta
 * do topo e a régua de abas do compositor, que são faixas de largura total com
 * conteúdo alinhado ao miolo.
 */

export const ADMIN_WIDTH = "max-w-7xl";

/** O recuo lateral. Um só, em toda tela — é ele que alinha o logo da barra com
    o título da página abaixo dela. */
export const ADMIN_GUTTER = "px-4 sm:px-6";

/** Faixa de largura total com o conteúdo na coluna do painel. */
export const ADMIN_COLUMN = cn("mx-auto w-full", ADMIN_WIDTH, ADMIN_GUTTER);

/** O `<main>` de uma tela autenticada: a coluna, o respiro e a névoa.
 *
 * `gap-6` é o espaçamento entre blocos de primeiro nível, e vem daqui em vez de
 * de cada tela — duas telas do mesmo painel discordando sobre o espaço entre um
 * cabeçalho e o conteúdo é exatamente o tipo de diferença que ninguém consegue
 * nomear e todo mundo sente. */
export function PageShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main
      className={cn(
        "page-wash mx-auto flex w-full flex-1 flex-col gap-6 py-8",
        ADMIN_WIDTH,
        ADMIN_GUTTER,
        className,
      )}
    >
      {children}
    </main>
  );
}
