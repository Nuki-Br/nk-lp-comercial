"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { Button, buttonClass } from "@/components/admin/ui/Button";
import { Spinner } from "@/components/admin/ui/Spinner";
import { cn } from "@/lib/cn";

/* A prévia do deck dentro do compositor.
 *
 * IFRAME, e a escolha é a única que respeita a tabela de camadas: o deck tem
 * folha própria (`deck.css` + `slides.css`, incluindo um `scroll-snap-type` sem
 * escopo) e o painel tem a dele; renderizar `<Deck>` aqui dentro obrigaria o
 * `(admin)` a importar CSS de deck, que é o vazamento que a ADR 17 fechou com
 * dois root layouts. Mesma origem, então o rail ainda rola a prévia com um
 * `getElementById` — sem protocolo de mensagem, sem contrato novo. ADR 22.
 *
 * A moldura tem tamanho LÓGICO fixo e é escalada para caber. Sem isso o iframe
 * herdaria a altura do painel e cada `.slide` (que é `min-height: 100vh`)
 * viraria um retângulo alto e estreito que não se parece com nada que o cliente
 * vai abrir. Com 1440×900 e 414×896 a prévia é uma tela de verdade, reduzida.
 *
 * O que a prévia mostra é o config SALVO. Ela não tenta espelhar o rail em
 * tempo real, e isso é deliberado: reordenar renumera os módulos ("01/02/03") e
 * remaneja os pontinhos de navegação no servidor, então um DOM remexido daqui
 * mostraria uma apresentação que não existe. Salvou, recarrega. */

const DEVICES = {
  desktop: { label: "Computador", width: 1440, height: 900 },
  mobile: { label: "Celular", width: 414, height: 896 },
} as const;

type Device = keyof typeof DEVICES;

export function DeckPreview({
  src,
  frameRef,
  reloadToken,
  stale = false,
  onFrameLoad,
  className,
}: {
  src: string;
  /** Do dono do estado: é ele que rola a prévia até o slide selecionado. */
  frameRef: RefObject<HTMLIFrameElement | null>;
  /** Qualquer mudança neste número recarrega a moldura. */
  reloadToken: number;
  /** Há edições não salvas — o que está na tela não é mais o que o rail diz. */
  stale?: boolean;
  onFrameLoad?: () => void;
  className?: string;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [loaded, setLoaded] = useState(false);
  const [pane, setPane] = useState({ width: 0, height: 0 });
  const shellRef = useRef<HTMLDivElement>(null);

  /* Mede o espaço disponível. O nó medido é o contêiner; a moldura é absoluta
     dentro dele e por isso não realimenta a medida — sem isso o observer entra
     em laço no primeiro frame. */
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setPane({ width: box.width, height: box.height });
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  /* Recarrega sob comando. `location.replace` e não uma troca de `src`: trocar
     o atributo empilha uma entrada no histórico do documento pai, e o botão
     "voltar" do navegador passaria a desfazer recarregamentos de prévia em vez
     de sair da tela. O `reloadToken` inicial não dispara nada — o primeiro load
     é o do próprio atributo `src`. */
  const firstToken = useRef(reloadToken);
  useEffect(() => {
    if (reloadToken === firstToken.current) return;
    setLoaded(false);
    frameRef.current?.contentWindow?.location.replace(src);
  }, [reloadToken, src, frameRef]);

  const { label, width, height } = DEVICES[device];
  /* `min(…, 1)`: numa tela larga a moldura para de crescer no tamanho real. Uma
     prévia ampliada além de 100% mostraria um deck que ninguém vê assim. */
  const scale = pane.width
    ? Math.min(pane.width / width, pane.height / height, 1)
    : /* Antes da primeira medida a moldura fica invisível em vez de saltar do
         tamanho lógico para o escalado. */
      0;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-2.5 py-2">
        <div
          role="group"
          aria-label="Tamanho da prévia"
          className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
        >
          {(Object.keys(DEVICES) as Device[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              className={cn(
                "rounded-[0.3125rem] px-2.5 py-1 text-xs font-medium transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/25",
                device === key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {DEVICES[key].label}
            </button>
          ))}
        </div>

        {stale && (
          <p className="hidden min-w-0 truncate text-xs text-warning sm:block">
            Prévia desatualizada — salve para atualizar.
          </p>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoaded(false);
              frameRef.current?.contentWindow?.location.replace(src);
            }}
          >
            Recarregar
          </Button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("ghost", "sm")}
            /* Abre a mesma rota fora da moldura — é onde dá para conferir a
               demo do módulo, que num retângulo de 700px não diz nada. */
          >
            Abrir <span aria-hidden="true">↗</span>
            <span className="sr-only">em uma nova aba</span>
          </a>
        </div>
      </div>

      <div ref={shellRef} className="relative min-h-0 flex-1 overflow-hidden bg-muted/30">
        <div
          className="absolute top-0 left-0 origin-top-left overflow-hidden rounded-lg border border-border bg-card shadow-lg transition-[width,height] duration-200"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            marginLeft: Math.max(0, (pane.width - width * scale) / 2),
            marginTop: Math.max(0, (pane.height - height * scale) / 2),
          }}
        >
          <iframe
            ref={frameRef}
            src={src}
            title={`Prévia da proposta — ${label}`}
            className="size-full border-0"
            onLoad={() => {
              setLoaded(true);
              onFrameLoad?.();
            }}
          />
        </div>

        <div
          aria-hidden={loaded}
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-2",
            "bg-card text-sm text-muted-foreground transition-opacity duration-300",
            loaded ? "opacity-0" : "opacity-100",
          )}
        >
          <Spinner />
          Carregando a prévia…
        </div>
      </div>
    </div>
  );
}
