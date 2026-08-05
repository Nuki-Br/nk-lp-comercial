import { Geist, Geist_Mono, Manrope } from "next/font/google";

/**
 * O ÚNICO módulo com `next/font` do repo.
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

/**
 * Geist — SÓ no root layout do `(admin)`.
 *
 * Não é a fonte da marca: Manrope é, e o deck continua com ela. O painel é
 * ferramenta interna, e a Geist foi desenhada para exatamente isto — tabela
 * densa, número tabular, rótulo pequeno. Nenhum byte dela chega ao `/fast` nem
 * ao `/p/[slug]`: os dois root layouts geram chunks de CSS separados (ADR 17),
 * então cada rota baixa só a fonte do seu.
 *
 * A regra do ADR 17 é "uma instância por família", não "uma família". Duas
 * chamadas para a MESMA família é que duplicariam arquivos; estas são famílias
 * diferentes, chamadas uma vez cada, neste arquivo.
 *
 * Ver ADR 21.
 */
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  /* Exatamente os pesos que o painel usa: corpo (400), `font-medium` (500) e
     `font-semibold` (600). Não há `font-bold` em nenhuma tela — declarar 700
     seria mais um arquivo baixado que nada renderiza. */
  weight: ["400", "500", "600"],
});

/** Mono do painel: `code` do link do cliente e a senha da proposta. */
export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400"],
});
