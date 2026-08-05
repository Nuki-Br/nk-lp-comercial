import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { NukiLogo } from "@/components/admin/ui/NukiLogo";
import { ThemeToggle } from "@/components/admin/ui/ThemeToggle";

export const metadata: Metadata = {
  title: "Entrar — Nuki",
  robots: { index: false, follow: false },
};

/* The only /admin route that does not call requireAdmin(), for the obvious
   reason. proxy.ts redirects an already-signed-in visitor away from here.

   Sem `AdminTopBar`: a barra tem o menu da conta e "Sair", e nenhum dos dois
   existe antes de existir uma sessão. O seletor de tema, sim — quem trabalha no
   escuro passa por esta tela antes de qualquer outra.

   DUAS COLUNAS, e a da esquerda some abaixo de `lg`. Ela não carrega nenhuma
   informação que a direita não tenha: é enquadramento, e enquadramento é a
   primeira coisa a cair quando a tela encolhe. O logo aparece nos dois lados,
   com `lg:hidden` de um deles, para que a marca nunca suma junto.

   A COLUNA DA ESQUERDA NÃO EXPLICA O PRODUTO, e isso é uma decisão, não uma
   pendência. Esta tela só é vista por quem já trabalha aqui e por quem não
   deveria estar aqui: para o primeiro, uma lista do que a ferramenta faz é
   ruído; para o segundo, é reconhecimento gratuito de que existe algo que vale
   a pena tentar abrir. O painel se identifica pelo nome e para por aí — a massa
   tipográfica vem do tamanho e do espaço em volta, não de mais palavras. */

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* ---- Coluna da marca ------------------------------------------- */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-nuki-green-03 p-12 text-nuki-white lg:flex">
        {/* Duas camadas de puro CSS, nenhum asset: uma grade fina e um brilho
            radial por cima dela. É o que dá profundidade sem pedir uma imagem
            que alguém teria de manter em duas resoluções e dois temas. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-24 size-[32rem] rounded-full opacity-40 blur-3xl"
          style={{
            background: "radial-gradient(circle, var(--color-nuki-green-02), transparent 70%)",
          }}
        />

        <div className="relative">
          <NukiLogo tone="light" className="h-8" />
        </div>

        {/* Os dois viram um bloco só: o `justify-between` do `<aside>` distribui
            os FILHOS diretos, e soltos aqui o título e a linha de apoio seriam
            empurrados para pontos diferentes da coluna. */}
        <div className="relative flex flex-col gap-4">
          {/* `<p>`, não `<h1>`: o título do documento é "Entrar", que é o que a
              página faz e a única coisa que existe nos dois breakpoints. Isto é
              marca — peso visual sem peso semântico. Quebra em duas linhas por
              `max-w`, não por `<br>`, para não quebrar errado em outra largura. */}
          <p className="max-w-[8ch] text-5xl leading-[1.05] font-semibold tracking-tight xl:text-6xl">
            Painel comercial
          </p>

          {/* Diz para QUEM a ferramenta é, não o que ela faz — o produto
              continua sem se explicar numa tela que qualquer um alcança. Não
              repete o "Acesso restrito" do rodapé: aquilo é a restrição, isto é
              o público. */}
          <p className="max-w-[34ch] text-base leading-relaxed text-nuki-white/50">
            Uso interno do time comercial da Nuki.
          </p>
        </div>

        <p className="relative text-xs text-nuki-white/40">
          © {new Date().getFullYear()} Nuki · Acesso restrito
        </p>
      </aside>

      {/* ---- Coluna do formulário -------------------------------------- */}
      <main className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="flex w-full max-w-[22rem] flex-col gap-8">
          <div className="flex flex-col gap-2">
            <NukiLogo className="mb-4 h-8 lg:hidden" />
            <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          </div>

          <LoginForm next={next} />

          {/* A única linha que sobrou, e ela é operacional, não descritiva:
              não há recuperação por e-mail, então sem isto o caminho de quem
              perdeu a senha é ficar tentando. */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sem acesso? Fale com o administrador do painel.
          </p>
        </div>
      </main>
    </div>
  );
}
