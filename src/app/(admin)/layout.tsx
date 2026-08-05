import type { Metadata } from "next";
import { manrope } from "@/styles/fonts";
import "@/styles/tokens.css";

export const metadata: Metadata = {
  title: "Nuki — Painel comercial",
  robots: { index: false, follow: false },
};

/**
 * Root layout #2 — o painel. Irmão do layout do `(deck)`, não filho dele.
 *
 * Importa SÓ `tokens.css`. Nada de `deck.css`, `slides.css` ou `gate.css`: é
 * disso que "o CSS do deck está provavelmente ausente do /admin" depende, e o
 * checklist C verifica exatamente isso —
 * `getComputedStyle(document.documentElement).scrollSnapType === "none"`.
 *
 * Sem `deck-root` no `<html>`, então a regra de `scroll-snap-type` de
 * slides.css não casa aqui nem se a folha vazasse. Ver ADR 17.
 */
export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-nuki-gray-light text-nuki-black">
        {children}
      </body>
    </html>
  );
}
