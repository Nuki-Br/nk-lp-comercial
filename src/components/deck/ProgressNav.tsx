import type { Anchor } from "@/deck/anchors";

/**
 * Os pontinhos laterais. Recebe as âncoras já resolvidas — não sabe o que é um
 * slide, e não dá switch em `kind`.
 *
 * Antes lia `deckNav` direto do conteúdo, um array que carregava rótulo E ordem
 * à mão. Era possível (e aconteceu) listar uma seção que a página não
 * renderizava: o nav desenhava dois pontos que não levavam a lugar nenhum.
 * Vindo de `anchorsOf(config.slides)`, esse estado não é construível.
 */
export function ProgressNav({ anchors }: { anchors: Anchor[] }) {
  return (
    <nav className="progress-nav" aria-label="Progresso da apresentação">
      {anchors.map((a) => (
        <a key={a.id} href={`#${a.id}`} data-section-id={a.id}>
          <span className="progress-nav-label">{a.label}</span>
          <span className="progress-nav-dot" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
