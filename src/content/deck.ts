/* Conteúdo da apresentação comercial Nuki.
   Rascunhos baseados em contexto-de-produto-v2.md (§§ 1-12). Copy pode ser
   refinado pelo user; estrutura das seções serve como base. */

/** Rótulo do ponto de cada seção no progress-nav, indexado pelo id da âncora.

    Módulos não aparecem: o rótulo deles é o `title.strong` de `modules.ts`. */
export const slideLabels: Record<string, string> = {
  cover: "Capa",
  value: "Por que personalizar",
  problem: "O problema",
  "what-is-nuki": "O que é a Nuki",
  differentiators: "Diferenciais",
  audience: "Pra quem serve",
  cases: "Cases",
};

/** A ordem+rótulos que o `ProgressNav` ainda consome diretamente.

    TRANSITÓRIO: `buildDefaultDeck()` passa a ser dono da ordem, e o `ProgressNav`
    passa a receber `anchorsOf(config.slides)` por prop — aí este array sai e
    `slideLabels` acima fica sendo a única fonte dos rótulos. Enquanto os dois
    coexistem, `slideLabels` é a fonte de verdade dos textos; a ordem aqui tem
    que bater com a do DOM ou os pontinhos andam pra trás. */
export const deckNav = [
  { id: "cover", label: slideLabels.cover },
  { id: "value", label: slideLabels.value },
  { id: "problem", label: slideLabels.problem },
  { id: "what-is-nuki", label: slideLabels["what-is-nuki"] },
  { id: "planner", label: "Planner" },
  { id: "personaliza", label: "Personaliza" },
  { id: "inspetor", label: "Inspetor" },
  { id: "differentiators", label: slideLabels.differentiators },
  { id: "audience", label: slideLabels.audience },
  { id: "cases", label: slideLabels.cases },
];

/* ============================================================
   O valor da personalização — o "porquê" comercial. Abre a
   apresentação logo depois da capa, antes de qualquer menção ao
   problema: estabelece a tese (personalização é alavanca de
   negócio) para que o frame seguinte, o problema, seja lido como
   "e é exatamente isso que hoje trava" em vez de abrir no tom
   defensivo.

   Todo número daqui é dito em voz alta numa reunião e pode ser
   contestado na hora, então cada item carrega a própria fonte.
   Se atualizar um dado, atualize a fonte na mesma linha: número
   sem procedência neste slide é pior do que número nenhum.
   ============================================================ */

/** Trecho de citação. `emphasis` vira <strong> — a fonte original destaca os
    percentuais e o slide reproduz esse destaque. Segmentos em vez de HTML
    porque `content/` não carrega JSX. */
export type QuoteSegment = {
  text: string;
  emphasis?: boolean;
};

/** Dado âncora do slide: sai da boca do comprador, não da nossa. Vem primeiro
    justamente porque é o único que fala de demanda — os demais falam do que a
    incorporadora faz com ela. */
export type ValueQuote = {
  segments: QuoteSegment[];
  author: string;
  detail: string;
};

export const valueQuote: ValueQuote = {
  segments: [
    { text: "75% dos compradores", emphasis: true },
    {
      text: " preferem construtoras que oferecem opções de design personalizado, sendo que ",
    },
    { text: "67% estão dispostos a pagar mais", emphasis: true },
    { text: " por essas customizações." },
  ],
  author: "Ashton Woods",
  detail: "National Homebuyer Survey · 2018",
};

export type ValueEvidence = {
  /** Número em destaque. String, não number: carrega sinal e unidade
      ("+10–15%", "~60%") e nunca entra em conta. */
  metric: string;
  title: string;
  /** Frase autocontida — não continua a leitura do `metric`, porque no mobile
      os dois deixam de ficar na mesma linha. */
  description: string;
  /** Procedência citável: quem publicou e quando. */
  source: string;
};

/* Ordem é argumentativa: dois números de upside, um de experiência de compra,
   um de custo evitado e um de ESG. Fecha na pauta que hoje chega à
   incorporadora pelo lado do investidor, não pelo do comprador. */
export const valueEvidence: ValueEvidence[] = [
  {
    metric: "+10–15%",
    title: "Receita",
    description:
      "É o ganho típico de quem trata personalização como estratégia — de 5% a 25%, conforme o setor e a execução.",
    source: "McKinsey & Company · Next in Personalization, 2021",
  },
  {
    metric: "+20%",
    title: "Prêmio de preço",
    description:
      "Um em cada cinco compradores interessados paga até 20% a mais pelo produto customizado. Receita sobre a mesma unidade, sem mais terreno.",
    source: "Deloitte · Made-to-order: The Rise of Mass Personalisation",
  },
  {
    metric: "78%",
    title: "Experiência de compra",
    description:
      "É quanto do público acha importante escolher todos os materiais e acabamentos em um só lugar. Planilha e e-mail queimam esse ponto.",
    source: "Ashton Woods · National Homebuyer Survey, 2018",
  },
  {
    metric: "5%",
    title: "Retrabalho evitado",
    description:
      "É quanto o retrabalho direto consome do custo de uma obra — 21% com os indiretos. Decisão registrada antes da execução não se refaz.",
    source: "Construction Industry Institute · Get It Right Initiative",
  },
  {
    metric: "~60%",
    title: "Pauta ESG",
    description:
      "É a fatia dos resíduos sólidos urbanos do Brasil vinda de construção e demolição. Personalizar na planta evita o quebra-quebra pós-entrega.",
    source: "ABRELPE · Panorama dos Resíduos Sólidos no Brasil",
  },
];

export type ProblemCard = {
  step: string;
  title: string;
  description: string;
  pain: string;
};

export const problemCards: ProblemCard[] = [
  {
    step: "Etapa 01",
    title: "Planejamento",
    description:
      "Antes da venda, a construtora monta o memorial: catálogo, opções por tipologia, custos e preços. Hoje isso vive em planilhas com múltiplas versões por e-mail, com dados entrando na plataforma só ao final.",
    pain: "Processo consome 3 a 4 meses, com alto risco de erro e retrabalho.",
  },
  {
    step: "Etapa 02",
    title: "Atendimento",
    description:
      "Com o memorial pronto, o cliente escolhe seus acabamentos. Sem plataforma, isso acontece por planilhas, PDFs e e-mails, com troca manual entre pós-venda, engenharia e compras.",
    pain: "Erros de interpretação, falta de rastreabilidade e risco jurídico.",
  },
  {
    step: "Etapa 03",
    title: "Vistoria em obra",
    description:
      "Depois de executado, alguém confere se o que foi personalizado foi entregue. Prancheta, foto solta no celular e WhatsApp com a obra.",
    pain: "Problema encontrado na vistoria com o cliente custa muito mais para corrigir.",
  },
];

export type ModuleFlowStep = {
  phase: string;
  name: string;
  description: string;
};

export const moduleFlow: ModuleFlowStep[] = [
  {
    phase: "Antes da venda",
    name: "Planner",
    description: "Planejamento e formação de custo do memorial de personalização.",
  },
  {
    phase: "Durante a venda",
    name: "Personaliza",
    description: "Atendimento ao cliente e gestão das escolhas de acabamento.",
  },
  {
    phase: "Após a execução",
    name: "Inspetor",
    description: "Validação do que foi executado vs. o que foi personalizado pelo cliente.",
  },
];

export type Differentiator = {
  n: string;
  title: string;
  description: string;
};

export const differentiators: Differentiator[] = [
  {
    n: "01",
    title: "Cobertura do ciclo completo",
    description:
      "A única plataforma que conecta planejamento, atendimento e vistoria em obra — do custo à entrega.",
  },
  {
    n: "02",
    title: "Integração nativa entre módulos",
    description:
      "Os dados fluem automaticamente entre fases. Publicou no Planner, alimentou o Personaliza. Escolheu no Personaliza, virou checklist no Inspetor.",
  },
  {
    n: "03",
    title: "Flexibilidade sem perder estrutura",
    description:
      "Fórmulas de preço livres, catálogo customizável, fluxo adaptável ao porte da construtora — sem modelo imposto.",
  },
  {
    n: "04",
    title: "Feito pra realidade de obra",
    description:
      "O Inspetor funciona offline, com foco em velocidade e captura fotográfica no campo. Sincroniza sozinho ao voltar o sinal.",
  },
  {
    n: "05",
    title: "Rastreabilidade e segurança jurídica",
    description:
      "Cada decisão, custo, escolha e inspeção fica registrada com data, responsável e histórico. Em disputa, você tem a prova.",
  },
  {
    n: "06",
    title: "Escalabilidade operacional",
    description:
      "Processo estruturado que cresce com o volume de empreendimentos, sem aumentar headcount na mesma proporção.",
  },
];

export type Persona = {
  role: string;
  name: string;
  foco: string;
  pain: string;
};

export const personas: Persona[] = [
  {
    role: "Persona 01",
    name: "Coordenadora de Personalização",
    foco: "Organização e controle do processo, redução de retrabalho, visibilidade em tempo real do andamento das unidades.",
    pain: "Processos manuais sem padronização, falta de rastreabilidade das escolhas, pressão da obra e da diretoria.",
  },
  {
    role: "Persona 02",
    name: "Diretor / CEO",
    foco: "Eficiência operacional e margem, diferenciação de mercado, escalabilidade sem aumento de headcount, governança e redução de risco.",
    pain: "Retrabalho invisível que come margem, disputas jurídicas, tecnologia como vantagem competitiva ainda não capturada.",
  },
  {
    role: "Persona 03",
    name: "Supervisor de Obra",
    foco: "Clareza sobre o que precisa ser corrigido, documentação que sustenta decisões técnicas, comunicação limpa com o pós-venda.",
    pain: "Recebe comunicados vagos sobre o que corrigir, sem registro formal do que foi aprovado ou rejeitado.",
  },
];

export const fitList = [
  "Múltiplos empreendimentos ou torres simultâneas com personalização",
  "Retrabalho entre planejamento, pós-venda, engenharia e obra",
  "Objetivo de profissionalizar o atendimento ao cliente na etapa de personalização",
  "Necessidade de rastreabilidade e segurança jurídica no processo",
  "Escalar volume de empreendimentos sem aumentar headcount operacional",
];
