/** Formatação de valores exibidos ao usuário — sempre pt-BR / BRL. */
export const formatCurrency = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Substitui `{chave}` pelos valores dados. Os rótulos de slide vivem em
    `src/content/slides.ts` como dado, então uma frase com número no meio
    ("Metragem 01", "Remover Cozinha") precisa de interpolação por nome — um
    template literal no componente traria a copy de volta pro código.

    Placeholder sem valor correspondente fica intocado, de propósito: um rótulo
    incompleto vindo do banco deve aparecer como está, não virar "undefined". */
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key as keyof typeof vars]) : match,
  );

/** Índice 1-based com zero à esquerda — "01", "02". Formatação, não copy. */
export const ordinal2 = (n: number) => String(n).padStart(2, "0");
