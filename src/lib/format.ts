/** Formatação de valores exibidos ao usuário — sempre pt-BR / BRL. */
export const formatCurrency = (n: number) =>
  n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Duração legível, a partir de milissegundos.
 *
 * Aritmética, não `Intl.DurationFormat` — ele não existe na versão de Node em
 * que isto builda, e a Regra 3 não tem espaço para uma biblioteca de datas
 * renderizar "4 min 12 s".
 *
 * A unidade acompanha a grandeza porque os dois consumidores medem coisas
 * diferentes: o tempo de um slide numa proposta é de segundos a minutos, e o
 * tempo somado do portfólio inteiro passa de hora. "125 min" é uma resposta
 * pior que "2 h 05 min" para a mesma pergunta. */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60)
    return `${totalMinutes} min ${String(totalSeconds % 60).padStart(2, "0")} s`;

  return `${Math.floor(totalMinutes / 60)} h ${String(totalMinutes % 60).padStart(2, "0")} min`;
};

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
