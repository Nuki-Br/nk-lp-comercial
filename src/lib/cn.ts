/** Junta classes condicionais. É o `clsx` inteiro que este repo usa.
 *
 * Não é `tailwind-merge`: não há resolução de conflito aqui, e isso é uma
 * restrição de projeto, não uma economia. Os primitivos em
 * `src/components/admin/ui/` expõem variantes (`variant`, `size`, `tone`) em vez
 * de aceitarem que alguém sobrescreva `bg-*` por `className` — que é o único
 * caso em que o merge seria necessário. `className` existe para o que a variante
 * não cobre: largura, margem, grid-column.
 *
 * Regra 3 do AGENTS.md: `clsx` + `tailwind-merge` são dois pacotes para oito
 * linhas. */
export type ClassValue = string | false | null | undefined;

export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(" ");
