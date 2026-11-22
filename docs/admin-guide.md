---
audience: human
status: current
verified_against: src/app/(admin)/admin/**, src/components/admin/{PublishPanel,ProposalDetailForms,SlidesWorkspace,ImagePricesForm,EstimateEditor}.tsx, src/server/proposals/{config,admin}.ts, src/server/tracking/{readout,reset}.ts
size: 216
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
3. **Tarifas de imagem** — a base de custo da calculadora desta proposta.
4. **Calculadora** — deixe o empreendimento do cliente já modelado.
5. **Senha** — defina antes de mandar o link. Sem senha ninguém entra.
6. **Publicar** — só depois disso o link abre. A pílula do painel "Envio" passa
   de "Rascunho" para "No ar".
7. **Copiar link** e mandar pro cliente.

Quer conferir o link como o cliente vai ver — numa janela anônima, sem sessão de
admin? Faça isso entre 6 e 7 e depois **zere as estatísticas** (em "Atenção do
cliente"), pra sua conferência não aparecer como se o cliente já tivesse lido.

Rascunho não abre pra ninguém. Se você mandar o link antes de publicar, o cliente
vê "não encontrado" — de propósito, pra ele não descobrir que existe uma proposta
sendo preparada.

## A cifra da lista

A lista de propostas mostra, à direita de cada linha, o **setup de imagens**
daquela proposta: o pacote de imagens com que a calculadora **abre**, em reais,
e embaixo quantas imagens são.

**O setup é um ponto de partida.** É o número da abertura da calculadora; o
cliente mexe nela durante a apresentação e o valor dele será outro.

Uma proposta **publicada** é cotada pelo documento que o cliente recebeu, não
pelas edições que você fez depois. Um **rascunho** é cotado pelo que publicar
congelaria. Passe o mouse sobre a cifra para ver qual dos dois está na tela.

## As quatro abas

### Visão geral

**O painel "Envio", à direita, responde a uma pergunta só: dá pra mandar isto
agora?** Ele fica na tela enquanto você rola, e traz o link, a lista do que falta
e o botão que publica. **A pílula ao lado de "Envio" é o estado do link** — a
tabela no fim deste guia lista as cinco. Os três itens da lista são sempre os
mesmos — senha, publicação, validade — e cada um diz o que acontece se ficar
pendente. Quando falta a senha, o próprio item leva até o campo dela.

À esquerda ficam os ajustes: título, validade e senha. **Depois que o cliente
abre a proposta, a atenção dele sobe para o topo dessa coluna** — antes de mandar
esta tela é um formulário, depois de mandar é um relatório.

**Expira em** vazio significa "não expira" — não significa "expirada". Depois da
data, o cliente vê um aviso mesmo com a senha certa.

**Trocar a senha revoga a anterior.** Quem já estava com a proposta aberta
continua dentro até o cookie vencer. E **anote a senha na hora**: hoje ela não
pode ser lida de volta do sistema.

### Slides

A lista à esquerda, a apresentação à direita. **Arraste as linhas pra reordenar**
e use o **olho** pra tirar um slide da conversa — olho cortado é slide que o
cliente não vê, e a linha fica tracejada. Duas coisas se ajustam sozinhas e você
não precisa cuidar delas: a numeração 01/02/03 dos módulos, e os pontinhos de
navegação lateral.

**Clique numa linha e a prévia vai até aquele slide.** É a forma rápida de
conferir o que o cliente lê antes de mandar o link. Em cima da prévia dá pra
trocar entre computador e celular, e "Abrir ↗" mostra a mesma coisa em tela
cheia — é lá que a demo do módulo e as setas do teclado funcionam de verdade.

**A prévia mostra o que está salvo.** Enquanto houver alteração pendente ela
avisa "prévia desatualizada"; salvou, ela se atualiza sozinha. Se você preferir
o teclado ao mouse, o punho de arrastar (as bolinhas à esquerda) move a linha
com ↑ e ↓ quando está selecionado.

**A demo do Inspetor é um checkbox dentro do módulo**, não uma linha separada.
Ela não tem pontinho próprio — usa o do módulo — então ela só existe se o módulo
existir. Por isso não dá pra separar os dois.

Se você montar algo que não funciona, o sistema recusa e explica o quê. Os dois
casos que aparecem na prática:

- **O total antes da calculadora.** O slide de total lê o que a calculadora
  calculou; invertido, ele mostraria R$ 0 na frente do cliente.
- **Nenhum slide ativo.** Não dá pra publicar uma apresentação vazia.

### Tarifas de imagem

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

**O painel da direita mostra o número enquanto você monta:** quantas imagens e
quanto de setup aquilo dá, com as tarifas desta proposta. Cada metragem também
traz o seu subtotal no cabeçalho, e cada ambiente o dele na coluna "Imagens" —
é assim que se descobre qual planta está pesando sem somar nada de cabeça.

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

**Zerar estatísticas** aparece embaixo da tabela, assim que existe alguma
abertura registrada. É o botão do ensaio: publique, abra o link numa janela
anônima pra conferir como o cliente vai ver, zere, e só então mande. Depois de
zerar, a proposta volta a ler como nunca aberta — aqui, na lista e no painel
inicial.

Nada é apagado: as aberturas passam a contar como **teste interno**, que é a
mesma marca que uma abertura sua logada no `/admin` já recebia. Não há como
desfazer por esta tela, então não use depois de mandar o link: as duas primeiras
leituras do cliente são justamente as que dizem se ele leu a proposta inteira.

Se a janela do ensaio continuar aberta enquanto você zera, o tempo dela segue
somando na sessão que acabou de virar teste — feche a aba antes de mandar o
link.

## Publicar

Publicar tira uma **fotografia** da proposta. A partir daí o cliente vê aquela
fotografia e nada mais: mudar o conteúdo padrão do deck, ou o preço padrão, não
mexe num documento que já foi enviado.

Isso vale também pras **suas** edições. Se você mexer numa proposta já publicada,
aparece um aviso laranja: há alterações que o cliente ainda não vê. Em Tarifas
de imagem e na Calculadora ele fica no topo da página; em Slides, dentro da lista à
esquerda, logo abaixo do título; e na Visão geral, a pílula do painel "Envio"
passa a dizer **Alterações pendentes** e o botão vira **Publicar alterações**. O
cliente só recebe o que você editou depois que você clica nele.

A pílula do painel "Envio" é o estado do link, em uma palavra:

| Pílula | O que significa |
|---|---|
| Rascunho | ainda não publicada — o link não abre |
| Sem senha | publicada, mas ninguém entra até você definir a senha |
| No ar | o cliente abre com a senha desta proposta |
| Alterações pendentes | publicada, com edições que ele ainda não vê |
| Expirada | passou da data de "Expira em" |
| Despublicada | você tirou do ar — o link mostra um aviso de indisponível |

## Despublicar e excluir

**Despublicar** fecha o link sem apagar nada: o cliente passa a ver um aviso de
proposta indisponível no momento, e a fotografia publicada (`config_snapshot`)
fica guardada. Publicar de novo — sem mexer em mais nada — devolve exatamente o
que ele já tinha visto. Use para tirar uma proposta do ar temporariamente, sem
perder o trabalho de configuração.

**Excluir** vive na seção "Excluir" da Visão geral, atrás de uma confirmação. O
link para de abrir, a proposta some desta lista — mas nada é apagado de verdade:
o histórico de aberturas de um cliente real é registro demais para perder por um
clique errado. Não há um "restaurar" nesta tela; se precisar reverter, fale com
quem administra o banco.

## Quando algo não abre

| O cliente diz… | Quase sempre é |
|---|---|
| "não encontrei nada" | a proposta ainda é rascunho, ou foi excluída |
| "diz que está indisponível no momento" | você despublicou a proposta — publique de novo |
| "pede senha e não aceita" | senha trocada depois do envio — mande a nova |
| "diz que expirou" | a data em "Expira em" já passou |
| "travou depois de errar a senha" | limite de tentativas; espera 15 minutos |
