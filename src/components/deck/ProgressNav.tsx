import { deckNav } from "@/content/deck";

export function ProgressNav() {
  return (
    <nav className="progress-nav" aria-label="Progresso da apresentação">
      {deckNav.map((n) => (
        <a key={n.id} href={`#${n.id}`} data-section-id={n.id}>
          <span className="progress-nav-label">{n.label}</span>
          <span className="progress-nav-dot" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
