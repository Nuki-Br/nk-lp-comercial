import Link from "next/link";
import { AccountMenu } from "@/components/admin/ui/AccountMenu";
import { NukiLogo } from "@/components/admin/ui/NukiLogo";
import { ThemeToggle } from "@/components/admin/ui/ThemeToggle";
import { cn } from "@/lib/cn";

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
 * client. */
export function AdminTopBar({
  email,
  role,
  container = "max-w-5xl",
}: {
  email: string;
  role: string;
  /**
   * A largura da coluna, para a barra alinhar com o conteúdo abaixo dela.
   *
   * Existe porque o compositor deixou de caber em `max-w-5xl`: a aba Slides é
   * uma prévia ao lado de um rail, e a prévia num painel de 700px não mostra
   * nada. O padrão continua sendo o do painel — só quem pede é que muda.
   */
  container?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      {/* `px-4 sm:px-6` é o recuo do painel, e toda tela usa exatamente o mesmo
          — é o que alinha o logo com o título da página em vez de deixar dois
          recuos diferentes na mesma coluna. */}
      <div className={cn("mx-auto flex h-14 w-full items-center gap-3 px-4 sm:px-6", container)}>
        <Link
          href="/admin"
          aria-label="Painel comercial Nuki"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        >
          <NukiLogo />
          <span aria-hidden="true" className="text-border select-none">
            /
          </span>
          <span className="text-sm font-medium">Painel comercial</span>
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
