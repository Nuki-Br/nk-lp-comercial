/** Formatação de valores exibidos ao usuário — sempre pt-BR / BRL. */
export const formatCurrency = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
