"use client";

import { useEffect, useRef } from "react";
import { signOutAction } from "@/app/(admin)/admin/login/actions";

/* O menu da conta: avatar com iniciais, e-mail, papel, sair.
 *
 * `<details>` nativo, não um popover reimplementado. O navegador já dá o estado
 * aberto/fechado sem React, o `<summary>` já é focável e responde a Enter e
 * Espaço, e o conteúdo já entra na ordem de tabulação — três coisas que uma
 * `<div onClick>` teria de refazer, e que costumam ficar pela metade.
 *
 * O que o `<details>` NÃO dá é o light-dismiss: clicar fora, ou apertar ESC,
 * não fecha. O efeito abaixo é só isso, e escreve direto em `element.open` em
 * vez de espelhar o estado no React — duas fontes de verdade para "está aberto"
 * é como o menu fica aberto depois de navegar.
 *
 * `role="menu"` de propósito NÃO está aqui: o padrão ARIA de menu exige
 * navegação por setas e um roving tabindex, e um `role` sem o comportamento
 * dele é pior que nenhum. Isto é uma gaveta com dois links dentro, e é assim
 * que se anuncia. */

function initialsOf(email: string): string {
  const [name = ""] = email.split("@");
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Administrador",
  member: "Time comercial",
};

export function AccountMenu({ email, role }: { email: string; role: string }) {
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (details.current) details.current.open = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      const node = details.current;
      if (!node?.open) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={details} className="relative">
      <summary
        aria-label={`Conta de ${email}`}
        className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card py-1 pr-2.5 pl-1 text-sm outline-none transition-colors select-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/25 [&::-webkit-details-marker]:hidden"
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground"
        >
          {initialsOf(email)}
        </span>
        <span className="hidden max-w-[14rem] truncate text-muted-foreground sm:inline">
          {email}
        </span>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3.5 shrink-0">
          <path
            d="m4.5 6.5 3.5 3.5 3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
        <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initialsOf(email)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[role] ?? role}</p>
          </div>
        </div>

        <form action={signOutAction} className="p-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4 shrink-0">
              <path
                d="M6.5 2.75h-2a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h2M10.25 11l3-3-3-3M13 8H6.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sair
          </button>
        </form>
      </div>
    </details>
  );
}
