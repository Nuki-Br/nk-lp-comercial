import { cn } from "@/lib/cn";

/* Liga/desliga.
 *
 * `<button role="switch">` e não `<input type="checkbox">`, ao contrário de todo
 * o resto de `Field.tsx`. O motivo é estreito e vale escrever: o `Checkbox`
 * nativo existe porque ele é ENVIADO — está dentro de um `<form>` e o valor sai
 * no `FormData`. Este não é. O estado do rail de slides mora em React e é
 * serializado num único campo escondido, então não há nada para o `<input>`
 * carregar, e um `<input>` disfarçado de trilho custa um `appearance: none` e um
 * `::before` para chegar onde um `role="switch"` chega com um `aria-checked`.
 *
 * O rótulo é obrigatório porque o controle é só uma forma: quem lê com leitor de
 * tela precisa ouvir QUAL slide está sendo ligado, e a linha inteira do rail é
 * texto demais para virar `aria-labelledby`. */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Lido em voz alta no lugar do controle. Diga o que ele liga, não "switch". */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none",
        "transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-4 rounded-full bg-card shadow-xs transition-transform",
          checked ? "translate-x-[1.125rem]" : "translate-x-[0.125rem]",
        )}
      />
    </button>
  );
}
