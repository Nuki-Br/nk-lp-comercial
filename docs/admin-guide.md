---
audience: human
status: current
verified_against: src/app/(admin)/admin/**, src/server/proposals/config.ts, src/server/tracking/readout.ts
size: 143
---

# Montando uma proposta no /admin

Este guia é pra quem monta e envia propostas — não precisa saber programar pra
usar nada aqui.

> **Duas apresentações, duas coisas diferentes.** O `/fast` é o deck interno do
> time, sempre com o conteúdo padrão. Uma **proposta** é um link só daquele
> cliente, com senha, montado por você nesta tela. Mudar o conteúdo padrão
> ([`content-guide.md`](content-guide.md)) não altera uma proposta já publicada.

## O caminho, do começo ao fim

1. **Nova proposta** — nome da construtora e um título interno. Ela nasce
   idêntica ao deck padrão.
2. **Slides** — tire o que não vai nesta conversa, reordene o que sobrou.
3. **Planos e preços** — mensalidade, descontos por ciclo, tarifas de imagem.
4. **Calculadora** — deixe o empreendimento do cliente já modelado.
5. **Senha** — defina antes de mandar o link. Sem senha ninguém entra.
6. **Congelar e publicar** — só depois disso o link abre.
7. **Copiar link** e mandar pro cliente.

Rascunho não abre pra ninguém. Se você mandar o link antes de publicar, o cliente
vê "não encontrado" — de propósito, pra ele não descobrir que existe uma proposta
sendo preparada.

## As quatro abas

### Visão geral

Link, título, data de expiração, senha, atenção do cliente e publicação.

**Expira em** vazio significa "não expira" — não significa "expirada". Depois da
data, o cliente vê um aviso mesmo com a senha certa.

**Trocar a senha revoga a anterior.** Quem já estava com a proposta aberta
continua dentro até o cookie vencer. E **anote a senha na hora**: hoje ela não
pode ser lida de volta do sistema.

### Slides

Desmarque o que não vai e use as setas pra reordenar. Duas coisas se ajustam
sozinhas e você não precisa cuidar delas: a numeração 01/02/03 dos módulos, e os
pontinhos de navegação lateral.

**A demo do Inspetor é um checkbox dentro do módulo**, não uma linha separada.
Ela não tem pontinho próprio — usa o do módulo — então ela só existe se o módulo
existir. Por isso não dá pra separar os dois.

Se você montar algo que não funciona, o sistema recusa e explica o quê. Os dois
casos que aparecem na prática:

- **O total antes da calculadora.** O slide de total lê o que a calculadora
  calculou; invertido, ele mostraria R$ 0 na frente do cliente.
- **Nenhum slide ativo.** Não dá pra publicar uma apresentação vazia.

E um caso que **avisa mas deixa salvar**: desativar o slide de planos e manter o
de total. O total fecha só com o setup de imagens, sem mensalidade. Às vezes é
exatamente o que você quer.

### Planos e preços

**O desconto se digita em porcentagem.** Escreva `10` para dez por cento. Ao lado
do campo aparece quanto a mensalidade vira — confira ali antes de salvar, é o
número que o cliente vai ler.

**"Meses mínimos" é o piso que ativa cada ciclo.** O cliente não escolhe o ciclo:
ele escolhe quantos meses quer, e o desconto vem junto. Quem sobe o simulador até
12 meses cai no Anual sozinho. Você não precisa colocar em ordem — o sistema
ordena ao salvar.

**Tarifas de imagem: são duas, e são diferentes.** A **imagem base** é o render
3D do ambiente, uma por unidade de ambiente, e é a cara. A **imagem de opção** é
o recorte de acabamento sobre essa base, bem mais barata. É a base de custo por
trás da calculadora desta proposta.

> No deck interno existe um painel escondido (`Ctrl+Alt+K`) que edita essas
> tarifas ao vivo. **Ele não existe no link do cliente** — num link que fica com
> ele, um painel que expõe custo é um vazamento esperando acontecer. Aqui é onde
> você define esses números.

### Calculadora

O ponto de partida da calculadora do cliente. Ele ainda pode mexer em tudo
durante a apresentação; a diferença é começar a conversa no número certo.

**Comece de um porte** (Studio, Padrão, Alto padrão) e ajuste. É bem mais rápido
que montar do zero — o botão substitui tudo pela composição do preset.

Por ambiente: nome, se é área **seca** ou **molhada**, quantos existem, e quantos
componentes personalizáveis tem. Área molhada costuma ter mais superfície
personalizável, por isso o número de opções é separado.

**"Varia"** marca os ambientes que mudam nas variações extras de planta. Se você
subir "Variações" para 2 ou 3 e não marcar nenhum ambiente, as variações extras
não somam imagem nenhuma.

**Atalhos de porte visíveis ao cliente** decide quais chips aparecem na
calculadora dele. Desmarque todos e o bloco inteiro some da apresentação.

### Atenção do cliente

Quantas vezes abriram, quando foi a primeira vez, quanto tempo somaram, e o tempo
por slide — **do mais lido pro menos lido**, porque a pergunta real é "onde eles
pararam".

Duas coisas que valem saber ao ler esses números:

- **Suas próprias aberturas não contam.** Se você abrir o link do cliente estando
  logado no `/admin`, aquilo fica marcado como interno e não entra na conta.
- **O tempo só corre com a aba na frente.** Uma proposta esquecida aberta a noite
  toda não vira oito horas de atenção.

Se um slide aparece com um nome estranho, tipo `differentiators`, é um slide que
o cliente viu e que você tirou da proposta depois. O registro do que ele leu não
é reescrito quando você edita — de propósito.

## Congelar e publicar

Publicar tira uma **fotografia** da proposta. A partir daí o cliente vê aquela
fotografia e nada mais: mudar o conteúdo padrão do deck, ou o preço padrão, não
mexe num documento que já foi enviado.

Isso vale também pras **suas** edições. Se você mexer numa proposta já publicada,
as abas Slides, Planos e preços e Calculadora passam a mostrar um aviso laranja
no topo: há alterações que o cliente ainda não vê. Na Visão geral o mesmo aviso
aparece dentro do bloco "Publicação", ao lado do botão que resolve. As alterações
só chegam no cliente quando você **republicar**.

## Quando algo não abre

| O cliente diz… | Quase sempre é |
|---|---|
| "não encontrei nada" | a proposta ainda é rascunho, ou foi arquivada |
| "pede senha e não aceita" | senha trocada depois do envio — mande a nova |
| "diz que expirou" | a data em "Expira em" já passou |
| "travou depois de errar a senha" | limite de tentativas; espera 15 minutos |
