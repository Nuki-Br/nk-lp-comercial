# Contexto de produto e negócio

Estes documentos são a **fonte da verdade** sobre o que a Nuki é, o que vende e
o que ainda não faz. Toda a copy do deck sai daqui. Antes de escrever ou revisar
qualquer afirmação num slide, confira contra eles.

Estão em pt-BR de propósito: é o vocabulário exato que o deck precisa falar.
Traduzir corromperia justamente o que os torna úteis.

## Índice por pergunta

Leia **um** documento, não os cinco.

| Pergunta | Documento | Seção |
|---|---|---|
| Qual é a proposta de valor? | `produto.md` | §3 |
| Quem são as personas? | `produto.md` | §6 |
| Quando a Nuki faz mais sentido? | `produto.md` | §9 |
| Quais os diferenciais estratégicos? | `produto.md` | §5 |
| Por que três módulos? Por que recorrência? | `pivot-modelo-negocio.md` | §1, §2 |
| O que é o hub de parceiros e o que falta nele? | `pivot-modelo-negocio.md` | §3 |
| Como argumentar com cada interlocutor? | `modulo-planner-comercial.md` | §5 |
| Como responder a uma objeção? | `modulo-planner-comercial.md` | §6 |
| **O que a Nuki não faz?** | `modulo-planner-comercial.md` | §8 |
| O que aparece em cada tela do Planner? | `modulo-planner-produto.md` | §3 |
| Como funciona o fluxo do Inspetor? | `modulo-inspetor-produto.md` | §3 |

Os dois documentos de produto (Planner, Inspetor) são longos e valem leitura sob
demanda — só quando a tarefa envolve as telas daquele módulo.

## Duas lacunas a registrar

**Não existe documento de contexto do Personaliza.** É o módulo original, o único
validado em produção, e o slide dele no deck — a copy, os quatro beats, o
destaque de "100% das escolhas formalizadas" — não tem fonte da verdade neste
repo. Ao revisar essa copy, não invente: pergunte. Vale escrever
`modulo-personaliza-produto.md` para fechar o buraco.

**Alguns números nos slides dos módulos não têm origem registrada.** Em
`src/content/modules.ts`: `60% menos tempo no orçamento`, `100% das escolhas
formalizadas`, `10x menos custo de retrabalho`, `95% conformidade na entrega`.
Nenhum deles rastreia até um documento aqui. São afirmações usadas em venda —
antes de repetir, alterar ou reforçar qualquer um, confirme com o time.

## Nota sobre o pivot

O modelo de negócio mudou: de projeto fechado por empreendimento (com a Nuki
operando configuração e geração de imagens 3D) para recorrência por
empreendimento ativo, entregando só a plataforma. `pivot-modelo-negocio.md` §4 é
um resumo pensado justamente para servir de contexto a IA.

Isso governa o slide de plano e toda a premissa da calculadora. Documentos mais
antigos que descrevam o modelo de projeto fechado estão desatualizados nesse
ponto.
