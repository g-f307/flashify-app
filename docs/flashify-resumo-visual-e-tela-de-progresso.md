# Flashify: resumo do produto, identidade visual e tela de progresso

Baseado no estado atual do frontend do Flashify.

## O que o Flashify e

O Flashify e uma plataforma de estudo que transforma textos, PDFs, imagens, Word e PowerPoint em materiais de aprendizagem com apoio de IA.

Hoje o produto se organiza em cinco frentes principais:

- criacao de decks a partir de conteudo enviado pelo usuario
- biblioteca para organizar decks e pastas
- estudo com flashcards, quizzes e revisao inteligente
- estudo guiado como trilha estruturada de aprendizagem
- acompanhamento de desempenho e habito de estudo

Em termos de percepcao, o Flashify mistura duas ideias:

- velocidade e praticidade: estudar sem montar tudo manualmente
- inteligencia amigavel: IA como assistente leve, visualmente calorosa e nao intimidadora

## Hierarquia das cores

O sistema visual atual trabalha com uma base clara, duas cores assinatura e uma terceira cor funcional para o estudo guiado.

- fundo principal: quase branco, limpo e muito leve
- texto principal: azul acinzentado escuro
- cor primaria de destaque: amarelo vivo `#FACC15` ou `#FFC300`
- cor secundaria/tecnologica: azul-ciano `#48cfea` e variacoes como `#6BDEF3`
- cor funcional de estudo guiado: verde `#7FD9A0`

Leitura de hierarquia:

1. amarelo
   usado para acao, energia, streak, flashcards, progresso positivo, CTA e momentos de recompensa
2. azul-ciano
   usado para IA, quizzes, apoio visual, tecnologia, refinamento e contraste com o amarelo
3. neutros claros
   sustentam legibilidade, espacamento e respiracao da interface
4. verde
   usado para estudo guiado, trilha, progressao pedagogica e consolidacao
5. vermelho
   aparece como cor de erro, falha ou alerta destrutivo

Leitura semantica que ja existe no produto:

- amarelo = memorizar, revisar, continuar, conquistar
- azul = sistema, IA, quiz, suporte, camada analitica
- verde = trilha guiada, evolucao, cobertura de conteudo, consolidacao
- neutro = estrutura

## Identidade visual

A identidade do Flashify e amigavel, didatica e energica. Ela evita um ar academico pesado e tambem evita parecer uma ferramenta corporativa fria.

Principais tracos:

- logo com wordmark em gradiente amarelo para azul
- mascote "Flashinho" em forma de raio amarelo, com capelo azul
- uso forte de cantos arredondados
- cards como unidade principal de interface
- brilho suave, gradientes e halos em pontos de destaque
- icones simples, majoritariamente `lucide-react`
- tom visual positivo, jovem e acessivel

Elementos que definem a cara do produto:

- contraste entre amarelo quente e azul frio
- gradientes lineares amarelo + azul em marca, CTAs e alguns blocos especiais
- sombras suaves e hover com glow
- superficies claras com bordas delicadas
- ilustracoes e mascote reforcando leveza e proximidade
- uso pontual de verde para o modo guiado, criando uma terceira familia visual sem competir com a marca principal

## Composicao das telas

O Flashify tem duas familias visuais bem claras.

### 1. Area publica

A landing page e mais promocional e emocional.

- hero com fundo em gradiente azul claro
- tipografia grande e headline aspiracional
- composicao em duas colunas
- cartoes/animacoes inclinados para sugerir movimento
- divisores em onda entre secoes
- CTA redondo e forte

Objetivo da composicao publica:

- vender facilidade
- mostrar IA como algo simples
- passar sensacao de fluidez e dinamismo

### 2. Area autenticada

Dentro do app, a composicao fica mais utilitaria e orientada a rotina.

- sidebar fixa a esquerda no desktop
- logo no topo da navegacao
- menu com icones e item ativo preenchido com a cor primaria
- conteudo principal em area larga, com padding generoso
- telas organizadas por titulo, subtitulo e blocos em cards
- modulos de estudo separados por modo: flashcards, quiz e estudo guiado

Padrao estrutural mais recorrente:

1. cabecalho da tela
2. subtitulo curto de contexto
3. grid de cards/resumos
4. bloco principal de conteudo
5. estados de loading, erro ou vazio em cards dedicados

## Linguagem visual recorrente

Para mockar novas telas sem perder identidade, vale preservar estes principios:

- superficies claras e respiraveis
- cards como container principal
- arredondamento medio para alto
- destaques em amarelo, azul e verde com papeis bem separados
- texto principal escuro e texto secundario em tom apagado
- hover delicado com borda mais viva e sombra suave
- mistura de utilidade com acolhimento visual

## O que a tela de progresso e no contexto do produto

A tela de progresso e o painel de leitura da jornada de estudo. Ela nao cria conteudo nem executa a sessao de estudo; ela interpreta o que ja aconteceu.

No fluxo do Flashify, ela funciona como:

- espelho de consistencia
- resumo semanal
- comparador entre flashcards, quizzes e estudo guiado
- camada motivacional do produto

Ela traduz uso em sinais simples:

- quantos cards foram estudados
- quantos quizzes foram concluidos
- quanto da trilha guiada foi percorrido
- qual a sequencia ativa
- qual o nivel medio de desempenho
- como a semana se distribuiu

Ou seja: a tela de progresso e menos operacional e mais narrativa. Ela mostra "como voce esta estudando", nao apenas "o que existe no sistema".

### Onde o estudo guiado entra

O estudo guiado nao e um detalhe lateral do produto. Ele e um terceiro modo de estudo, com identidade propria, fluxo proprio e semantica propria.

Hoje ele aparece no app como:

- trilha estruturada por topicos e passos
- mistura de flashcards e perguntas dentro de uma sequencia orientada
- relatorio final proprio
- linguagem visual em verde, diferente do amarelo dos flashcards e do azul dos quizzes

Por isso, na memoria do produto, ele deve entrar na tela de progresso como uma terceira camada oficial de leitura, e nao como uma nota secundaria.

## Estrutura atual da tela de progresso

### Entrada visual

A tela abre com:

- titulo `Seu Progresso`
- subtitulo explicando que a area acompanha desempenho em flashcards e quizzes

Isso posiciona a pagina como painel pessoal, nao como analytics frio.

### Navegacao interna

Logo abaixo existe uma barra de abas com tres visoes:

- `Visao Geral`
- `Flashcards`
- `Quizzes`

Essa barra e central para a arquitetura da tela. Ela divide a leitura em:

- panorama consolidado
- leitura especifica de revisao
- leitura especifica de avaliacao

Leitura importante para evolucao:

- no estado atual da tela, o estudo guiado ainda nao aparece como aba ou bloco proprio
- para a proxima versao, ele deveria entrar como parte formal da arquitetura da pagina

### Aba 1: Visao Geral

E a visao mais executiva da pagina.

Ela possui:

- card de `Sequencia`
- card de `Cards (Semana)`
- card de `Quizzes (Semana)`
- card de `Performance`
- grafico de atividade semanal de flashcards

Logica visual da aba:

- amarelo domina streak e flashcards
- azul domina quizzes e media geral
- o grafico fecha a leitura com uma visao temporal da semana

Funcao dessa aba:

- responder rapido se o usuario esta engajado
- mostrar equilibrio entre volume e qualidade
- entregar uma leitura "em 10 segundos"

Na proxima iteracao, essa aba deveria absorver estudo guiado com pelo menos um destes sinais:

- trilhas concluidas na semana
- passos guiados completos
- cobertura de topicos
- tempo investido em estudo guiado

### Aba 2: Flashcards

E a camada de revisao/memorizacao.

Ela traz:

- card de `Cards Estudados`
- card de `Precisao`
- bloco `Insights de Flashcards`

O bloco de insights e condicional. Ele muda conforme o comportamento do usuario, por exemplo:

- parabens por sequencia alta
- elogio por alta precisao
- dica para estudar mais cards na semana

Papel dessa aba:

- reforcar habito
- traduzir repeticao em conquista
- aproximar metrica de aconselhamento

### Aba 3: Quizzes

E a camada de verificacao de conhecimento.

Ela traz:

- card de `Quizzes Completos`
- card de `Pontuacao Media`
- barra horizontal de performance
- bloco `Insights de Quizzes`

Os insights tambem sao condicionais:

- performance excelente
- no caminho certo
- espaco para melhorar
- convite para usar quizzes
- incentivo para manter ritmo

Papel dessa aba:

- mostrar se o usuario nao apenas revisou, mas validou aprendizado
- dar leitura mais "avaliativa" do que a aba de flashcards

### Aba 4 esperada: Estudo Guiado

Se a tela de progresso for expandida corretamente, estudo guiado merece uma quarta visao dedicada, ou pelo menos um bloco robusto dentro da visao geral.

Essa camada deveria mostrar:

- trilhas iniciadas e concluidas
- passos concluidos
- topicos cobertos
- taxa de conclusao por trilha
- saude media das trilhas, aproveitando a logica do relatorio guiado
- tempo de estudo guiado

Semantica da aba:

- verde como cor principal
- leitura mais pedagogica e progressiva
- menos foco em repeticao pura
- mais foco em jornada, cobertura e consolidacao

Papel dessa aba:

- mostrar se o usuario consegue percorrer uma trilha inteira
- conectar revisao e avaliacao dentro de uma jornada unica
- traduzir profundidade de estudo, nao apenas volume

## Semantica visual da tela de progresso

A tela trabalha com um codigo de cor muito consistente:

- amarelo = repeticao, streak, flashcards, constancia
- azul = quiz, score, leitura de desempenho
- verde = estudo guiado, trilha, cobertura de topicos, consolidacao
- cinza/neutro = estrutura, labels, suporte

Isso e importante para mock:

- se a nova versao mantiver essa semantica, a leitura continua intuitiva
- se mudar as cores, vale manter a associacao funcional por outro mecanismo visual claro

## Composicao visual da tela de progresso

A composicao atual segue esta ordem:

1. cabecalho de pagina
2. seletor por abas
3. cards de KPI em grid responsivo
4. bloco analitico principal
5. bloco de insights

A sensacao que ela passa hoje e:

- organizada
- leve
- amigavel
- mais motivacional do que tecnica

Ela nao tem linguagem de dashboard pesado. Mesmo sendo uma tela de dados, continua parecendo um produto educacional.

Com estudo guiado incluido, a composicao ideal passa a precisar de tres camadas semanticas claras:

- habito: streak, frequencia, regularidade
- desempenho: acerto, score, media
- percurso: trilha, topicos, conclusao

## Estados e comportamentos que fazem parte da experiencia

Ao mockar novas versoes, vale considerar que a tela ja possui:

- skeletons de carregamento
- card de erro quando nao ha dados
- responsividade forte para mobile
- troca de label nas abas em telas menores
- hover de borda e cor nos cards

Esses estados nao sao detalhe tecnico; eles fazem parte da percepcao de qualidade da tela.

## O que nao deveria se perder numa nova versao

Se voce for mockar alternativas, estes pilares parecem essenciais:

- leitura imediata dos KPIs principais
- separacao clara entre flashcards, quizzes e estudo guiado
- destaque da sequencia como sinal emocional de progresso
- algum elemento temporal semanal
- bloco de insight ou recomendacao com tom humano
- linguagem de cards, nao de tabela pesada

## Oportunidades de mock para novas versoes

A tela atual funciona bem como base, mas abre espaco para evolucao.

Direcoes promissoras:

- transformar a `Visao Geral` em um hero de progresso mais marcante
- dar mais protagonismo ao streak
- unificar cards e grafico numa narrativa unica da semana
- incluir comparacao entre volume e desempenho
- incluir percurso guiado como terceira coluna de leitura
- diferenciar melhor "habito" de "resultado"
- diferenciar "resultado" de "cobertura pedagogica"
- explorar o mascote ou micro-ilustracoes em estados de insight

## Resumo para briefing de design

Se eu tivesse que resumir o Flashify para mock visual:

- produto educacional com IA, leve e amigavel
- identidade baseada em amarelo energetico + azul tecnologico, com verde funcional para estudo guiado
- interface quase toda montada em cards claros, arredondados e respiraveis
- composicao interna simples, modular e orientada a rotina
- tela de progresso como painel motivacional de habito e desempenho

Se eu tivesse que resumir a tela de progresso:

- e o painel pessoal que traduz estudo em consistencia, volume e performance
- usa amarelo para revisao/streak, azul para quizzes/desempenho e verde para estudo guiado/percurso
- mistura KPIs, historico semanal e insights textuais
- precisa tratar estudo guiado como terceira frente oficial da leitura de progresso
- deve continuar parecendo acolhedora, e nao um dashboard corporativo
