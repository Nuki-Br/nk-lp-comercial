import type { Metadata } from "next";
import { THEME_BOOTSTRAP } from "@/components/admin/ui/ThemeToggle";
import { geist, geistMono } from "@/styles/fonts";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "Nuki — Painel comercial",
  robots: { index: false, follow: false },
};

/**
 * Root layout #2 — o painel. Irmão do layout do `(deck)`, não filho dele.
 *
 * Importa SÓ `admin.css`. Nada de `deck.css`, `slides.css` ou `gate.css`: é
 * disso que "o CSS do deck está provavelmente ausente do /admin" depende, e o
 * checklist C verifica exatamente isso —
 * `getComputedStyle(document.documentElement).scrollSnapType === "none"`.
 *
 * Sem `deck-root` no `<html>`, então a regra de `scroll-snap-type` de
 * slides.css não casa aqui nem se a folha vazasse. Ver ADR 17.
 *
 * `tokens.css` passou a ser só do deck: os tokens do painel vivem em
 * `admin.css`, com tema claro e escuro que o deck não tem nem quer. ADR 21.
 */
export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      /* O script abaixo escreve `class="dark"` neste mesmo elemento antes da
         hidratação. Sem isto o React reclama de um atributo que ele próprio
         mandou o navegador mudar. */
      suppressHydrationWarning
    >
      <head>
        {/*
          Bloqueante e inline, no `<head>`, de propósito: qualquer coisa que rode
          depois do primeiro paint — `useEffect`, `next/script`, um import — pinta
          a tela clara antes de escurecê-la, e o flash aparece em TODA navegação
          do painel, não só na primeira.

          biome-ignore lint/security/noDangerouslySetInnerHtml: string literal do próprio repo, sem entrada de usuário; é a única forma de rodar antes do paint.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
