import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

/* Os controles de formulário.
 *
 * Todos são `<input>`, `<select>` e `<textarea>` nativos com classe — nenhum é
 * um widget reimplementado. É de propósito: `type="date"`, `type="number"` e
 * `<select>` nativos trazem teclado numérico no celular, o date picker do
 * sistema e navegação por teclado que nenhuma reimplementação acerta de graça.
 * O que muda aqui é a moldura. */

const CONTROL =
  "w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs " +
  "transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground " +
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** A classe crua, para os poucos lugares que precisam do elemento sem wrapper. */
export const controlClass = cn(CONTROL, "h-9");

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-9", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24 py-2 leading-relaxed", className)} {...rest} />;
}

/** Seta nativa, de propósito: `color-scheme` em `admin.css` já a inverte no
    tema escuro, e desenhar uma própria custaria um chevron por tema. */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL, "h-9 pr-2", className)} {...rest}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)} {...rest}>
      {children}
    </label>
  );
}

/** Texto de apoio abaixo de um campo. Explica a consequência, não o campo. */
export function Hint({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>{children}</p>
  );
}

/** Rótulo + controle + apoio, empilhados. O layout de campo padrão. */
export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Versão de `Field` em que o `<label>` embrulha o controle — sem `id`, sem
    `htmlFor`, e sem o risco de os dois saírem de sincronia numa lista dinâmica
    de ambientes ou de planos. */
export function FieldLabel({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <Hint>{hint}</Hint>}
    </label>
  );
}

/** Caixa de seleção com rótulo clicável.
 *
 * `accent-primary` é o caminho mais curto para uma checkbox na cor da marca sem
 * reimplementá-la: o controle continua nativo, com foco, teclado e estado
 * indeterminado de graça. */
export function Checkbox({
  label,
  description,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cn(
        "flex items-start gap-2.5 text-sm",
        rest.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-[inherit] rounded accent-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
        {...rest}
      />
      <span className="min-w-0">
        <span className="font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
