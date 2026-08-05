import { cn } from "@/lib/cn";

/* A marca, de `public/nuki/`.
 *
 * O arquivo é preto sobre transparente — e dentro do SVG há um raster embutido,
 * não paths, então não dá para trocar `fill`. Inverter um bitmap
 * preto-e-transparente dá branco-e-transparente, que é exatamente o logo
 * monocromático claro. Um segundo arquivo para o tema escuro seria um segundo
 * arquivo para manter em sincronia.
 *
 * `tone` é uma prop e não uma classe passada de fora porque as duas opções são
 * mutuamente exclusivas e nenhuma delas é "acrescentar uma classe": `auto`
 * segue o tema, `light` força branco. Empilhar `invert` por cima de um
 * `dark:invert` embutido funciona por acidente — as duas classes escrevem a
 * mesma declaração — e deixa de funcionar assim que uma delas vira outra coisa.
 * `className` aqui é só para tamanho.
 *
 * `<img>` e não `next/image`: é um SVG de tamanho fixo servido de `public/`, sem
 * nada para o otimizador fazer, e `noImgElement` está desligado no biome.json. */
export function NukiLogo({
  className,
  tone = "auto",
}: {
  className?: string;
  /** `auto`: preto no tema claro, branco no escuro. `light`: branco sempre —
      para quando o fundo é escuro nos dois temas, como o painel do login. */
  tone?: "auto" | "light";
}) {
  return (
    <img
      src="/nuki/nuki-logo-black-horizontal.svg"
      alt="Nuki"
      width={104}
      height={68}
      className={cn("w-auto", tone === "light" ? "invert" : "dark:invert", className ?? "h-7")}
    />
  );
}
