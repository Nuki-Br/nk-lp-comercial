import { Manrope } from "next/font/google";

/**
 * A ÚNICA instância de `next/font` do repo.
 *
 * São dois root layouts — `(deck)` e `(admin)` — e cada chamada de `Manrope()`
 * cria uma instância de fonte própria, com seu próprio `--font-manrope` e seus
 * próprios arquivos no build. Chamar nos dois layouts serviria a mesma fonte
 * duas vezes. Importe daqui; não chame `Manrope()` em nenhum outro lugar.
 *
 * Ver docs/decisions.md ADR 17.
 */
export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
