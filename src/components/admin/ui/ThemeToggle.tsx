"use client";

import { useSyncExternalStore } from "react";
import { buttonClass } from "@/components/admin/ui/Button";
import { cn } from "@/lib/cn";

/* Claro / escuro.
 *
 * A troca é uma classe `dark` no `<html>` — `admin.css` declara
 * `@custom-variant dark (&:is(.dark *))`, ou seja, por classe e não por
 * `prefers-color-scheme`. A escolha do vendedor tem de ganhar do sistema
 * operacional; a preferência do SO é só o palpite inicial.
 *
 * Quem aplica a classe no primeiro paint é o script inline do root layout, não
 * este componente: um efeito roda depois da pintura, e o resultado seria um
 * flash branco a cada navegação do painel.
 *
 * Daí o `useSyncExternalStore` em vez de `useState` + `useEffect`: o estado da
 * verdade é o `classList` do `<html>`, que é um sistema externo ao React e que
 * já foi escrito antes de o React existir na página. `getServerSnapshot`
 * devolve `false` porque no HTML do servidor não existe `localStorage` — o
 * React troca para o snapshot real logo após a hidratação, sem acusar mismatch.
 * É exatamente o caso de uso para o qual o hook foi feito. */

const STORAGE_KEY = "nuki-admin-theme";

const listeners = new Set<() => void>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const getSnapshot = () => document.documentElement.classList.contains("dark");

/* Sem DOM no servidor. `false` = tema claro, que é o que o HTML já vem sendo. */
const getServerSnapshot = () => false;

function setDark(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    /* Modo privado, cookies bloqueados: o tema vale para esta aba e pronto. */
  }
  for (const onChange of listeners) onChange();
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /* OS DOIS ÍCONES FICAM MONTADOS, e o que muda é qual deles está visível.
   *
   * Trocar um pelo outro com um ternário é uma troca instantânea: o sol some e a
   * lua aparece no mesmo frame em que a página inteira troca de cor, e o botão
   * é a única coisa na tela que não participa da transição que ele mesmo
   * disparou. Empilhados no mesmo `grid`, um gira e encolhe enquanto o outro
   * cresce, e o gesto acompanha a troca de tema.
   *
   * Nada disso muda o que um leitor de tela ouve: os dois são `aria-hidden`, e o
   * fato continua no `aria-label` e no `aria-pressed` do botão. */
  return (
    <button
      type="button"
      onClick={() => setDark(!getSnapshot())}
      aria-pressed={isDark}
      aria-label={isDark ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      className={buttonClass("ghost", "icon", "grid place-items-center")}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className={cn(
          "col-start-1 row-start-1 size-4 transition-[rotate,scale,opacity] duration-300 ease-out-quart",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
        )}
      >
        <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11 3.05 3.05"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className={cn(
          "col-start-1 row-start-1 size-4 transition-[rotate,scale,opacity] duration-300 ease-out-quart",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
        )}
      >
        <path
          d="M13.5 9.7A5.75 5.75 0 0 1 6.3 2.5a5.75 5.75 0 1 0 7.2 7.2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** O script que roda ANTES do primeiro paint, injetado pelo root layout.
 *
 * Fica aqui, ao lado da chave de storage e do nome da classe, porque os três só
 * fazem sentido juntos — separá-los é como um deles fica para trás numa
 * renomeação. */
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`;
