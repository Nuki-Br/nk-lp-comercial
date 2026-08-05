import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/* O botão do painel.
 *
 * Server component: não usa hook nenhum. `SubmitButton` é que precisa de
 * `useFormStatus` e mora em arquivo próprio, com `"use client"` — assim uma
 * página server-side pode renderizar um botão sem arrastar um client boundary
 * junto. `buttonClass` é exportado para os poucos casos em que o elemento
 * precisa ser um `<Link>` ou um `<label>` e não um `<button>`. */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "icon";

/* `active:translate-y-px` é a única parte disto que não é cosmética.
 *
 * Metade dos botões do painel dispara uma Server Function, e entre o clique e a
 * primeira resposta do `useFormStatus` passa o tempo de ida ao servidor. Sem
 * nenhum retorno no próprio clique, esse intervalo lê como "não pegou", e o
 * vendedor clica de novo. Um pixel para baixo enquanto o botão está apertado
 * resolve isso no frame do `pointerdown`, sem estado nenhum.
 *
 * `duration-75` no `active`: afundar tem de ser instantâneo, voltar não. A
 * duração maior fica para o hover, que é onde 200ms parecem suaves em vez de
 * lentos. */
const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap " +
  "transition-[color,background-color,border-color,box-shadow,translate,opacity] duration-200 " +
  "ease-out-quart outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 " +
  "focus-visible:border-ring active:translate-y-px active:duration-75 " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-md",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-card text-foreground shadow-xs hover:bg-accent hover:shadow-sm",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  destructive:
    "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:shadow-md",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-9 px-4 text-sm",
  icon: "size-9 p-0 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  /* `type` default "button": um `<button>` sem type dentro de um `<form>` é um
     submit, e metade destes botões vive dentro de um form fazendo outra coisa
     (mover um slide, adicionar um ambiente). */
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
