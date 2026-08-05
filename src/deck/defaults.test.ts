import { describe, expect, it } from "vitest";
import { anchorsOf, walkableIdsOf } from "@/deck/anchors";
import { buildDefaultDeck } from "@/deck/defaults";
import { parseDeckOverride } from "@/deck/overrides";
import { mergeEstimate, normalizeDeck, resolveDeckConfig } from "@/deck/resolve";
import type { DeckConfig } from "@/deck/types";

/* O contrato entre as três etapas. A etapa 2 projeta este tipo em JSONB e a
   etapa 3 edita formulários em cima dele — se qualquer coisa aqui quebrar,
   quebra depois de a migração já ter rodado. Ver ADR 13 e docs/testing.md. */

describe("serialização — a razão de existir do DeckConfig", () => {
  it("buildDefaultDeck() sobrevive ao round-trip JSON", () => {
    const deck = buildDefaultDeck();

    /* `toEqual`, NÃO `toStrictEqual`: `JSON.stringify` descarta chaves com valor
       `undefined`, e `toStrictEqual` trataria "chave ausente" e "chave presente
       com undefined" como diferentes. A regra que isso protege é a de escrever
       campos opcionais OMITINDO a chave. */
    expect(JSON.parse(JSON.stringify(deck))).toEqual(deck);
  });

  it("não carrega função, Date nem Map em lugar nenhum", () => {
    const offenders: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "function") return void offenders.push(`${path}: function`);
      if (value instanceof Date) return void offenders.push(`${path}: Date`);
      if (value instanceof Map || value instanceof Set) {
        return void offenders.push(`${path}: ${value.constructor.name}`);
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          walk(v, `${path}[${i}]`);
        });
        return;
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(buildDefaultDeck(), "deck");

    expect(offenders).toEqual([]);
  });

  it("nenhum campo opcional é `undefined` explícito", () => {
    // Um `tone: undefined` some no round-trip e faz o deep-equal acima falhar.
    // Este teste aponta o campo culpado em vez de só dizer "não bate".
    const withUndefined: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => {
          walk(v, `${path}[${i}]`);
        });
        return;
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          if (v === undefined) withUndefined.push(`${path}.${k}`);
          else walk(v, `${path}.${k}`);
        }
      }
    };
    walk(buildDefaultDeck(), "deck");

    expect(withUndefined).toEqual([]);
  });
});

describe("a identidade resolve(base, null) === base", () => {
  /* "Uma proposta sem customização é idêntica ao deck" deixa de ser uma
     propriedade mantida à mão e vira esta asserção. ADR 13. */

  it("resolver contra null devolve exatamente o base", () => {
    expect(resolveDeckConfig(buildDefaultDeck(), null)).toEqual(buildDefaultDeck());
  });

  it("resolver contra um override vazio também", () => {
    expect(resolveDeckConfig(buildDefaultDeck(), {})).toEqual(buildDefaultDeck());
  });

  it("buildDefaultDeck() já é ponto fixo de normalizeDeck", () => {
    // É isto que impede a identidade acima de ser verdadeira por acidente.
    const deck = buildDefaultDeck();
    expect(normalizeDeck(deck)).toEqual(deck);
  });

  it("normalizeDeck é idempotente", () => {
    const once = normalizeDeck(buildDefaultDeck());
    expect(normalizeDeck(once)).toEqual(once);
  });

  it("resolver não muta o base que recebeu", () => {
    const base = buildDefaultDeck();
    const snapshot = JSON.parse(JSON.stringify(base));
    resolveDeckConfig(base, { hidden: ["cases"], order: ["total", "cover"] });
    expect(base).toEqual(snapshot);
  });
});

describe("slides desabilitados", () => {
  const deck = buildDefaultDeck();

  it("differentiators e audience existem, porém desligados", () => {
    /* Modelados como PRESENTES e desabilitados, não ausentes. Era isso ou os
       dois pontos mortos que o commit e49dd8e deixou no nav. */
    for (const id of ["differentiators", "audience"]) {
      const node = deck.slides.find((n) => n.id === id);
      expect(node, `${id} sumiu do deck padrão`).toBeDefined();
      expect(node?.enabled).toBe(false);
    }
  });

  it("anchorsOf pula os desabilitados — 10 pontos, não 12", () => {
    const ids = anchorsOf(deck.slides).map((a) => a.id);

    expect(ids).toEqual([
      "cover",
      "problem",
      "what-is-nuki",
      "planner",
      "personaliza",
      "inspetor",
      "cases",
      "pricing",
      "calculator",
      "total",
    ]);
  });

  it("walkableIdsOf inclui a demo, que não tem ponto próprio", () => {
    const ids = walkableIdsOf(deck.slides);

    expect(ids).toContain("inspetor-demo");
    expect(ids).toHaveLength(11);
    // A demo vem logo depois do módulo pai — é a ordem que as setas percorrem.
    expect(ids.indexOf("inspetor-demo")).toBe(ids.indexOf("inspetor") + 1);
  });

  it("`shown` reabilita um slide que vem desligado por padrão", () => {
    const resolved = resolveDeckConfig(buildDefaultDeck(), { shown: ["audience"] });
    expect(anchorsOf(resolved.slides).map((a) => a.id)).toContain("audience");
  });
});

describe("normalizeDeck — fatos derivados", () => {
  it("a demo herda o ponto do módulo pai", () => {
    const demo = buildDefaultDeck().slides.find((n) => n.id === "inspetor-demo");
    expect(demo?.navId).toBe("inspetor");
    expect(demo?.inNav).toBe(false);
  });

  it("o módulo com demo ganha childId; os sem demo não têm a chave", () => {
    const deck = buildDefaultDeck();
    const inspetor = deck.slides.find((n) => n.id === "inspetor");
    const planner = deck.slides.find((n) => n.id === "planner");

    expect(inspetor?.childId).toBe("inspetor-demo");
    // Chave AUSENTE, não `undefined` — senão o round-trip JSON quebra.
    expect(planner && "childId" in planner).toBe(false);
  });

  it("esconder o módulo derruba a demo junto", () => {
    /* O invariante do AGENTS.md: um config que esconde o módulo mas mantém a
       demo apontaria `data-nav-id` pra um ponto inexistente e apagaria o nav
       inteiro naquela seção. Aqui isso deixa de ser construível. */
    const resolved = resolveDeckConfig(buildDefaultDeck(), { hidden: ["inspetor"] });
    expect(resolved.slides.find((n) => n.id === "inspetor-demo")).toBeUndefined();
    expect(walkableIdsOf(resolved.slides)).not.toContain("inspetor-demo");
  });

  it("os ordinais dos módulos são 1..N na ordem final", () => {
    const modules = buildDefaultDeck().slides.filter((n) => n.ordinalGroup === "module");
    expect(modules.map((n) => n.ordinal)).toEqual([1, 2, 3]);
  });

  it("esconder um módulo renumera os seguintes em vez de deixar buraco", () => {
    // O numeral gigante de fundo lê `ordinal` — sem renumerar, ficaria 01/_/03.
    const resolved = resolveDeckConfig(buildDefaultDeck(), { hidden: ["planner"] });
    const enabled = resolved.slides.filter((n) => n.ordinalGroup === "module" && n.enabled);

    expect(enabled.map((n) => n.id)).toEqual(["personaliza", "inspetor"]);
    expect(enabled.map((n) => n.ordinal)).toEqual([1, 2]);
  });

  it("ids duplicados estouram em dev", () => {
    const deck = buildDefaultDeck();
    const dup: DeckConfig = { ...deck, slides: [...deck.slides, deck.slides[0]] };
    // getElementById pegaria o primeiro, dois pontos acenderiam e a caminhada
    // dobraria — tudo em silêncio. Melhor estourar.
    expect(() => normalizeDeck(dup)).toThrow(/duplicado/);
  });
});

describe("ordenação e override", () => {
  it("uma ordem parcial move o citado e preserva o resto", () => {
    const resolved = resolveDeckConfig(buildDefaultDeck(), { order: ["cases", "cover"] });
    const ids = resolved.slides.map((n) => n.id);

    expect(ids[0]).toBe("cases");
    expect(ids[1]).toBe("cover");
    expect(ids).toHaveLength(buildDefaultDeck().slides.length);
  });

  it("ids desconhecidos na ordem são ignorados, não lançam", () => {
    // ADR 13: um rollback não pode derrubar um pitch ao vivo.
    const resolved = resolveDeckConfig(buildDefaultDeck(), {
      order: ["slide-que-nao-existe", "cover"],
    });
    expect(resolved.slides.map((n) => n.id)).not.toContain("slide-que-nao-existe");
    expect(resolved.slides[0].id).toBe("cover");
  });

  it("uma ordem que separa a demo do módulo é reparada", () => {
    const resolved = resolveDeckConfig(buildDefaultDeck(), {
      order: ["inspetor-demo", "cover", "inspetor"],
    });
    const ids = resolved.slides.map((n) => n.id);
    expect(ids.indexOf("inspetor-demo")).toBe(ids.indexOf("inspetor") + 1);
  });
});

describe("mergeEstimate — arrays substituem, não concatenam", () => {
  const base = buildDefaultDeck().estimate;

  it("um override parcial de plans troca o plano em vez de acrescentar", () => {
    const merged = mergeEstimate(base, {
      plans: [{ n: "Plano cliente", items: ["Planner"], monthlyPrice: 999 }],
    });

    expect(merged.plans).toHaveLength(1);
    expect(merged.plans[0].n).toBe("Plano cliente");
  });

  it("imagePrices mescla um nível raso", () => {
    const merged = mergeEstimate(base, { imagePrices: { base: 100 } as never });

    expect(merged.imagePrices.base).toBe(100);
    // Sobrescrever só `base` não pode zerar `option`.
    expect(merged.imagePrices.option).toBe(base.imagePrices.option);
  });

  it("um patch vazio devolve o base intacto", () => {
    expect(mergeEstimate(base, {})).toEqual(base);
    expect(mergeEstimate(base, undefined)).toEqual(base);
  });
});

describe("o delta como o Postgres devolve", () => {
  /* A precondição 4 da etapa 3, fixada como teste em vez de anotada numa
     mensagem de commit: um `config_override` gravado no jsonb e lido de volta
     tem que continuar mudando o deck renderizado.

     O literal abaixo é EXATAMENTE o que o PostgREST devolveu depois de um
     round-trip contra o banco real — repare que a ordem das chaves não é a que
     foi enviada. `jsonb` é uma representação binária parseada, não o texto que
     você entregou: ele normaliza a ordem das chaves de objeto (por comprimento,
     depois por bytes). ARRAYS mantêm a ordem, que é do que `order` depende.

     Consequência que custa caro em outro lugar: comparar dois configs com
     `JSON.stringify` para descobrir se um snapshot ficou obsoleto marca TODA
     proposta publicada como obsoleta, porque um lado veio do banco e o outro do
     `buildDefaultDeck()`. Compare em profundidade. */
  const stored = {
    order: ["cover", "problem", "pricing", "calculator", "total"],
    shown: ["differentiators"],
    hidden: ["cases"],
    estimate: {
      defaults: { dryOptions: 4, wetOptions: 5 },
      maxMonths: 24,
      imagePrices: { base: 99, option: 33 },
    },
  };

  const resolved = resolveDeckConfig(buildDefaultDeck(), parseDeckOverride(stored));

  it("muda o deck — o caminho não é morto", () => {
    expect(resolved).not.toEqual(buildDefaultDeck());
  });

  it("aplica hidden, shown e order de uma vez só", () => {
    const ids = anchorsOf(resolved.slides).map((a) => a.id);

    expect(ids).not.toContain("cases");
    expect(ids).toContain("differentiators");
    expect(ids.slice(0, 2)).toEqual(["cover", "problem"]);
    // Nós não citados na ordem vão pro fim, na ordem original.
    expect(ids.indexOf("pricing")).toBeLessThan(ids.indexOf("calculator"));
    expect(ids.indexOf("calculator")).toBeLessThan(ids.indexOf("total"));
  });

  it("aplica o patch de estimativa sem perder o que não foi citado", () => {
    expect(resolved.estimate.imagePrices).toEqual({ base: 99, option: 33 });
    expect(resolved.estimate.maxMonths).toBe(24);
    expect(resolved.estimate.defaults.dryOptions).toBe(4);
    expect(resolved.estimate.defaults.wetOptions).toBe(5);
    // `defaults` mescla raso: unitTypes não foi citado e tem que sobreviver.
    expect(resolved.estimate.defaults.unitTypes).toEqual(
      buildDefaultDeck().estimate.defaults.unitTypes,
    );
  });

  it("a ordem das chaves do objeto não muda o resultado", () => {
    // O mesmo delta com as chaves em outra ordem — que é o que o jsonb devolve.
    const reordered = {
      estimate: {
        imagePrices: { option: 33, base: 99 },
        maxMonths: 24,
        defaults: { wetOptions: 5, dryOptions: 4 },
      },
      hidden: ["cases"],
      shown: ["differentiators"],
      order: ["cover", "problem", "pricing", "calculator", "total"],
    };

    expect(resolveDeckConfig(buildDefaultDeck(), parseDeckOverride(reordered))).toEqual(resolved);
  });
});

describe("parseDeckOverride — nunca lança", () => {
  it.each([null, undefined, 42, "texto", [], true])("lixo (%s) vira {}", (input) => {
    expect(parseDeckOverride(input)).toEqual({});
  });

  it("descarta entradas não-string dentro de order/hidden", () => {
    const parsed = parseDeckOverride({ order: ["cover", 7, null, "total"], hidden: "nope" });

    expect(parsed.order).toEqual(["cover", "total"]);
    expect(parsed.hidden).toBeUndefined();
  });

  it("um override corrompido ainda resolve pro deck padrão", () => {
    // O caminho de degradação que importa: linha ruim no banco != pitch quebrado.
    const resolved = resolveDeckConfig(buildDefaultDeck(), parseDeckOverride("???"));
    expect(resolved).toEqual(buildDefaultDeck());
  });
});
