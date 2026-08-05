/** Anel girando, para o estado pendente de um submit.
 *
 * `aria-hidden` porque o rótulo do botão já mudou para "Salvando…" — quem usa
 * leitor de tela recebe o fato pelo texto, e o anel repetiria a mesma coisa. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        className ??
        "size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      }
    />
  );
}
