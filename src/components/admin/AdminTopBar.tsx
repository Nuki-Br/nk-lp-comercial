import Link from "next/link";
import { AccountMenu } from "@/components/admin/ui/AccountMenu";
import { NukiLogo } from "@/components/admin/ui/NukiLogo";
import { ADMIN_COLUMN } from "@/components/admin/ui/Page";
import { ThemeToggle } from "@/components/admin/ui/ThemeToggle";

/* A barra do painel: marca, tema, conta.
 *
 * Não está no root layout, e sim em cada página que já chamou `requireAdmin()`.
 * Dois motivos, na ordem: `/admin/login` mora sob o mesmo root layout e não pode
 * exibir uma barra com "Sair"; e o e-mail vem da identidade que a página já
 * carregou — colocar a barra no layout significaria ou passar o e-mail para
 * baixo, ou o layout chamar `requireAdmin()` como se fosse um portão, que é
 * exatamente o buraco do ADR 15.
 *
 * O lado direito é um agrupamento, não três controles soltos: o tema é
 * preferência da máquina e a conta é identidade, então são dois grupos
 * separados por um divisor, e o que era um `<span>` com o e-mail cru virou o
 * gatilho do menu. Server component — só `ThemeToggle` e `AccountMenu` são
 * client.
 *
 * A LARGURA NÃO É MAIS UMA PROP. Ela era, com `max-w-5xl` de padrão, e as duas
 * únicas chamadas passavam `max-w-7xl` — ou seja, o padrão era um valor que
 * nenhuma tela usava e que só existia para ser esquecido numa terceira. A
 * medida agora é `ADMIN_COLUMN`, a mesma do `<main>` abaixo. */
export function AdminTopBar({ email, role }: { email: string; role: string }) {
  return (
    /* `bg-background/70` e um pouco mais de desfoque que antes: com a névoa da
       marca no `<main>`, uma barra quase opaca cortava o gradiente numa linha
       reta no topo da tela. Translúcida, ela deixa a névoa passar e a borda de
       baixo vira a única separação — que é o que se quer de uma barra grudenta. */
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className={`${ADMIN_COLUMN} flex h-14 items-center gap-3`}>
        <Link
          href="/admin"
          aria-label="Painel comercial Nuki"
          className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        >
          <NukiLogo className="h-7 transition-opacity duration-200 group-hover:opacity-70" />
          <span aria-hidden="true" className="text-border select-none">
            /
          </span>
          <span className="text-sm font-medium transition-colors duration-200 group-hover:text-muted-foreground">
            Painel comercial
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <AccountMenu email={email} role={role} />
        </div>
      </div>
    </header>
  );
}
