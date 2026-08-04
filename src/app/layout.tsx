import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ComercialGate } from "@/components/comercial/ComercialGate";
import "./globals.css";
import "./jornada.css";
import "./comercial.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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
 * Root layout. Este repo serve uma coisa só — a apresentação comercial — então
 * o portão de senha (`ComercialGate`) vive aqui e protege a aplicação inteira.
 * O CSS da apresentação também é importado aqui, pra estilizar o próprio gate
 * antes do `page.tsx` montar.
 *
 * Sem analytics, por decisão de projeto: este repo foi separado do `nk-lp`
 * justamente pra que sessões de pitch não contaminem as métricas da landing.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-nuki-cinza-claro text-nuki-preto">
        <ComercialGate>{children}</ComercialGate>
      </body>
    </html>
  );
}
