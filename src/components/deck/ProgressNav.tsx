import { deckNav } from "@/content/deck";

export function ProgressNav() {
  return (
    <nav className="progress" aria-label="Progresso da apresentação">
      {deckNav.map((n) => (
        <a key={n.id} href={`#${n.id}`} data-t={n.id}>
          <span className="t">{n.label}</span>
          <span className="d" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
