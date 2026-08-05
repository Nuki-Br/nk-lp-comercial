import type { Metadata } from "next";
import { manrope } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/gate.css";
import "@/styles/deck.css";
import "@/styles/slides.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nukibr.com"),
  title: "Nuki — Apresentação comercial",
  description:
    "Do planejamento do memorial à validação em obra — como a Nuki organiza, profissionaliza e centraliza o ciclo completo de personalização de acabamentos em uma plataforma só.",
  // Material comercial privado. O portão de senha é client-side, então um
  // crawler que busca o HTML veria o deck inteiro — preços inclusive.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Nuki",
    locale: "pt_BR",
    title: "Nuki — Apresentação comercial",
    description:
      "Do planejamento do memorial à validação em obra — como a Nuki organiza o ciclo completo de personalização em uma plataforma só.",
    images: [
      {
        url: "/jornada/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Nuki — Apresentação comercial",
      },
    ],
  },
};

/**
 * Root layout #1 — as superfícies de deck (`/fast` e, na etapa 2, `/p/[slug]`).
 *
 * É um root layout de verdade (emite `<html>` e `<body>`), irmão do layout do
 * `(admin)`. São dois porque o Next não remove stylesheets em navegação
 * client-side: com um só, sair de um deck pro /admin deixaria `slides.css`
 * grudado no documento — inclusive a regra de `scroll-snap-type` e o bloco
 * `.gate*`, que não tem escopo. Dois roots forçam page load na fronteira, o que
 * torna o isolamento demonstrável em vez de torcido. Ver ADR 17.
 *
 * `deck-root` no `<html>` é o que liga o `scroll-snap-type` de slides.css; sem
 * a classe o snap do slide de demo morre em silêncio.
 *
 * O portão de senha NÃO mora mais aqui: ele desceu pro `fast/layout.tsx`. Este
 * layout cobre as duas superfícies de deck, e o `AccessGate` é a senha
 * compartilhada do time — deixá-lo aqui colocaria a senha da Nuki na frente do
 * link de cada cliente. `gate.css` continua importado aqui de propósito: o
 * `ProposalGate` do `/p/[slug]` reaproveita a mesma marcação `.gate*`.
 *
 * Sem analytics, por decisão de projeto.
 */
export default function DeckRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} deck-root h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-nuki-gray-light text-nuki-black">
        {children}
      </body>
    </html>
  );
}
