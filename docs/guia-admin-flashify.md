# Guia de uso da rota `/admin` do Flashify

Este material explica, em linguagem simples, o que a área `/admin` do Flashify faz hoje, como navegar por ela e como usar cada parte da tela com segurança.

O objetivo deste guia é ajudar a equipe a usar a ferramenta no dia a dia sem depender de interpretação técnica.

## 1. O que é a rota `/admin`

A rota `/admin` é o painel interno de acompanhamento do Flashify.

Ela foi feita para que a equipe consiga:

- enxergar o volume de usuários dentro de um recorte escolhido
- entender de onde esses usuários vieram
- ver em que ponto da jornada cada pessoa está
- acompanhar sinais de uso real do produto
- abrir o detalhe de um usuário específico
- marcar contas internas, contas de teste ou contas bloqueadas
- registrar notas internas para acompanhamento
- exportar dados para compartilhar análises com outras pessoas

## 2. Quem pode acessar

Essa tela é voltada para uso interno da equipe.

Na prática:

- pessoas da equipe veem a rota `/admin`
- pessoas sem esse acesso não devem usar essa área

## 3. O que aparece no topo da tela

No topo existe um bloco principal com:

- o nome da visão administrativa
- um resumo rápido do recorte atual
- botões de ação
- a área de filtros

Esse bloco foi pensado para concentrar os controles principais da página.

### 3.1. Resumo rápido do topo

No topo aparecem pequenos cartões com leitura imediata do recorte atual:

- `Janela`: mostra quantos dias estão sendo analisados
- `Ativação`: mostra a taxa de ativação do recorte atual
- `Origens`: mostra quantas origens diferentes aparecem no recorte
- `Usuários`: mostra o total de usuários visíveis naquele recorte

Esses números mudam quando os filtros mudam.

### 3.2. Botões do topo

No topo também existem estes botões:

- `Exportar CSV`
- `Exportar PDF`
- `Atualizar`
- `Expandir filtros` ou `Minimizar filtros`

#### `Exportar CSV`

Gera um arquivo em formato de planilha com a base filtrada.

Uso indicado:

- compartilhar uma lista de usuários
- analisar dados fora do sistema
- guardar um recorte para acompanhamento

#### `Exportar PDF`

Abre uma janela para montar um relatório em PDF.

Esse relatório pode ser gerado com combinações prontas ou com seleção manual do conteúdo.

#### `Atualizar`

Recarrega os dados da tela.

Use esse botão quando:

- quiser buscar dados mais recentes
- tiver feito alterações e quiser confirmar o resultado
- desconfiar que a tela ficou desatualizada

#### `Expandir filtros` / `Minimizar filtros`

Abre ou recolhe a área de filtros.

Serve para:

- deixar mais espaço livre na tela
- focar na leitura dos gráficos e tabelas
- voltar rapidamente aos filtros quando precisar trocar o recorte

## 4. Como funcionam os filtros

Os filtros servem para trocar o grupo de usuários que está sendo analisado.

Tudo o que aparece na tela depende deles:

- cartões
- gráficos
- listas
- tabela de usuários
- exportações

### 4.1. Filtro de período

Opções disponíveis:

- `Últimos 7 dias`
- `Últimos 30 dias`
- `Últimos 90 dias`

Esse filtro define a janela de tempo usada na análise.

### 4.2. Filtro de forma de acesso

Na tela esse filtro aparece como `Provider`.

Em termos simples, ele mostra a forma como a pessoa entrou ou criou a conta.

Opções disponíveis:

- `Todos`
- `Google`
- `Email e senha`

### 4.3. Filtro de etapa da jornada

Na tela esse filtro aparece como `Estágio`.

Ele separa os usuários pelo ponto em que cada um chegou dentro do produto.

Opções disponíveis:

- `Todos`
- `Registrado`
- `Criou deck`
- `Estudou`
- `Quiz concluído`
- `Ativado`

Leitura simples dessas etapas:

- `Registrado`: criou conta
- `Criou deck`: já criou pelo menos um material
- `Estudou`: já teve uso de estudo registrado
- `Quiz concluído`: já concluiu quiz
- `Ativado`: atingiu o marco de ativação definido pela ferramenta

### 4.4. Filtro de contas internas e de teste

Na tela esse filtro aparece como `Internos`.

Opções disponíveis:

- `Ocultar equipe/teste`
- `Incluir equipe/teste`

Uso prático:

- escolha ocultar quando quiser uma leitura mais próxima do uso real de clientes
- escolha incluir quando quiser ver tudo, sem esconder contas internas ou de teste

### 4.5. Filtro de origem

Na tela esse filtro aparece como `Origem`.

Ele separa os usuários pela origem registrada, por exemplo a fonte de entrada.

### 4.6. Filtro de campanha

Na tela esse filtro aparece como `Campanha`.

Ele ajuda a isolar usuários ligados a uma campanha específica.

### 4.7. Filtro de equipe

Na tela esse filtro aparece como `Equipe`.

Opções disponíveis:

- `Todos`
- `Somente equipe`
- `Sem equipe`

Uso prático:

- `Somente equipe`: mostra apenas contas internas
- `Sem equipe`: esconde contas internas

### 4.8. Filtro de teste

Na tela esse filtro aparece como `Teste`.

Opções disponíveis:

- `Todos`
- `Somente teste`
- `Sem teste`

Uso prático:

- `Somente teste`: mostra só contas marcadas para teste
- `Sem teste`: esconde essas contas

### 4.9. Filtro de bloqueio

Na tela esse filtro aparece como `Bloqueio`.

Opções disponíveis:

- `Todos`
- `Bloqueados`
- `Não bloqueados`

Uso prático:

- localizar contas bloqueadas
- revisar contas ativas sem bloqueio

## 5. O primeiro bloco visual da página

Logo abaixo do topo, a tela mostra um conjunto de cartões e gráficos rápidos.

Essa parte serve para leitura imediata do recorte atual.

### 5.1. Cartões principais

Os quatro cartões principais mostram:

- `Base total`
- `Novos usuários`
- `Ativados`
- `Decks concluídos`

#### `Base total`

Mostra quantos usuários estão visíveis no recorte atual.

#### `Novos usuários`

Mostra quantos cadastros entraram no período escolhido.

#### `Ativados`

Mostra quantos usuários atingiram o marco de ativação.

#### `Decks concluídos`

Mostra quantos processamentos concluídos aparecem naquele recorte.

### 5.2. Composição da base

Há um gráfico de pizza com o título `Distribuição por acesso`.

Ele mostra como a base filtrada está distribuída pela forma de acesso.

Exemplo de leitura:

- quantos vieram por Google
- quantos vieram por email e senha

Ao lado do gráfico aparece a contagem de usuários filtrados e a legenda dessa distribuição.

### 5.3. Saúde do recorte atual

Esse bloco mostra três indicadores centrais:

- `Cobertura de estudo`
- `Conversão em quiz`
- `Retenção 7d`

Também existe um gráfico de barras horizontais para comparar esses indicadores.

#### `Cobertura de estudo`

Mostra quantos usuários do recorte chegaram a estudar.

#### `Conversão em quiz`

Mostra quantos usuários do recorte chegaram ao quiz.

#### `Retenção 7d`

Mostra quantos usuários voltaram depois.

## 6. Abas principais da tela

A rota `/admin` é organizada em quatro abas:

- `Visão geral`
- `Campanhas`
- `Rotina`
- `Usuários`

Cada aba tem um foco diferente.

## 7. Aba `Visão geral`

Essa aba reúne uma leitura ampla da base filtrada.

Ela serve para responder perguntas como:

- a base está crescendo?
- a base está usando de verdade?
- as pessoas estão avançando dentro do produto?
- elas estão voltando depois?

### 7.1. Resumo operacional em camadas

Esse bloco resume sinais centrais de uso e avanço.

Ele mostra leituras como:

- quantos usuários estão ativos
- quantos têm deck
- como está o movimento dentro do produto

### 7.2. Pulso de retorno

Esse bloco mostra atividade recente e retorno da base filtrada.

Serve para observar se o grupo analisado está voltando ao produto.

### 7.3. Etapas da ativação

Existe uma visualização da passagem pelas etapas principais da jornada.

Ela ajuda a perceber:

- onde as pessoas avançam
- onde elas param
- em que ponto pode haver perda de evolução

### 7.4. Origens mais presentes

Essa parte ajuda a entender quais origens aparecem com mais força no recorte atual.

Também ajuda a perceber quando existem usuários sem origem identificada.

## 8. Aba `Campanhas`

Essa aba é focada em qualidade de entrada e comparação entre fontes e campanhas.

Ela serve para responder perguntas como:

- de onde estão vindo os usuários
- quais grupos parecem ter melhor qualidade de uso
- quais campanhas estão trazendo pessoas que realmente avançam

### 8.1. Qualidade da aquisição

Esse bloco ajuda a comparar a qualidade da entrada dos usuários.

Em linguagem simples, ele tenta mostrar não só quem entrou, mas quem realmente começou a usar.

### 8.2. Como interpretar as taxas

Existe um bloco visual de apoio para leitura das taxas.

Ele ajuda a equipe a não olhar só volume, mas também avanço real.

### 8.3. Performance por fonte

Mostra comparação entre origens.

Uso prático:

- comparar fontes de entrada
- observar quais grupos avançam mais
- encontrar fontes com muito volume e pouco uso real

### 8.4. Performance por campanha

Mostra campanhas ordenadas pela qualidade de uso.

Uso prático:

- identificar campanhas mais saudáveis
- revisar campanhas com resultado fraco
- comparar campanhas entre si

## 9. Aba `Rotina`

Essa aba é focada em padrões de comportamento e recorrência dos usuários.

Ela serve para responder perguntas como:

- os usuários estão voltando com regularidade?
- quantos dias por semana a base usa o produto?
- em quais horários existe mais atividade?
- quais usuários são os mais consistentes?

Os dados dessa aba são gerados a partir de uma tabela de cache materializado (`UserActivityDay`) que é atualizada automaticamente a cada 3 horas por uma tarefa agendada.

Essa aba respeita todos os filtros globais, incluindo o filtro de período.

### 9.1. Cartões de resumo

No topo da aba aparecem quatro cartões:

- `Usuários ativos`: quantos usuários tiveram alguma atividade no período
- `Dias ativos (média)`: média de dias ativos por usuário
- `Recorde de dias`: maior sequência de dias ativos encontrada
- `Ativos últimos 3d`: quantos usuários tiveram atividade nos últimos 3 dias

Cada cartão também mostra uma informação complementar no rodapé.

### 9.2. Mapa de calor de uso

Esse bloco mostra um mapa de calor estilo calendário.

Cada quadrado representa um dia. A intensidade da cor indica o volume de atividade naquele dia.

A legenda vai de `Menos` até `Mais` com cinco níveis de intensidade.

Abaixo do mapa aparecem também:

- total de dias ativos no período
- total de sessões registradas

Esse visual ajuda a perceber padrões de uso ao longo do tempo, como intervalos sem atividade ou picos.

### 9.3. Atividade por dia da semana

Esse bloco mostra um gráfico de barras com a distribuição de atividade pelos dias da semana.

Dias de semana aparecem em ciano e fins de semana em amarelo.

Abaixo do gráfico aparecem dois destaques:

- `Dia mais ativo`: o dia da semana com mais atividade
- `Dia menos ativo`: o dia da semana com menos atividade

### 9.4. Atividade por hora (UTC)

Esse bloco mostra barras verticais para cada hora do dia.

As legendas mostram apenas as horas `0h`, `6h`, `12h` e `18h` para não sobrecarregar o visual.

Ao passar o mouse em cada barra, aparece o número de sessões e usuários ativos naquela hora.

Os horários são sempre mostrados em UTC.

### 9.5. Frequência de uso

Esse bloco mostra a distribuição dos usuários em faixas de frequência.

Exemplo de faixas:

- `1-2 dias`
- `3-5 dias`
- `6-10 dias`
- `11-20 dias`
- `21+ dias`

Ele ajuda a entender quantos usuários usam pouco, moderadamente ou com alta frequência.

### 9.6. Ranking de consistência

Esse bloco lista os usuários mais consistentes no período.

Para cada pessoa aparece:

- posição no ranking
- nome e email
- dias ativos
- streak atual

Cada item é clicável e abre o detalhe completo daquele usuário.

## 10. Aba `Usuários`

Essa aba é a mais operacional da rota `/admin`.

É nela que a equipe consegue:

- buscar pessoas específicas
- ordenar a lista de várias formas
- paginar resultados
- abrir o detalhe completo de uma conta
- fazer marcações administrativas
- registrar notas internas

### 9.1. Blocos do topo da aba

No topo da aba aparecem dois blocos:

- `Quem está dentro do recorte`
- `Como navegar esta base`

#### `Quem está dentro do recorte`

Mostra gráficos de barras com a composição da base filtrada por:

- forma de acesso
- etapa dominante da jornada

#### `Como navegar esta base`

Mostra um resumo prático da amostra carregada na tela:

- `Carregados`: quantos registros estão disponíveis no navegador
- `Filtrados`: quantos ficaram depois dos filtros e da busca
- `Ordenação`: qual ordem está sendo usada e quantos itens aparecem por página

## 11. Tabela de usuários

A tabela de usuários é a área central de operação.

Ela apresenta a lista de pessoas do recorte atual.

### 11.1. Busca

Há um campo de busca com o texto:

`Buscar por nome, email, origem ou campanha`

Essa busca ajuda a localizar pessoas ou grupos rapidamente.

Importante:

- a própria tela informa que essa busca é feita sobre a amostra carregada no navegador

### 11.2. Ordenação

Existem controles para ordenar a lista.

Você pode escolher:

- por qual campo quer ordenar
- em ordem crescente
- em ordem decrescente

Também é possível clicar em alguns títulos da tabela para trocar a ordenação.

### 11.3. Itens por página

Existe um seletor para definir quantos registros aparecem por página.

Isso ajuda a escolher entre:

- leitura mais compacta
- mais registros visíveis de uma vez

### 11.4. Colunas da tabela

A tabela mostra, para cada usuário:

- `Usuário`: nome e email
- `Origem`: forma de acesso, origem e campanha
- `Estágio`: etapa da jornada
- `Métricas`: quantidade de decks, estudos e quizzes
- `Ativação`: datas dos marcos principais
- `Ações`: botão `Ver detalhe`
- `Último login`: data do acesso mais recente

### 11.5. Navegação entre páginas

Na parte inferior da tabela aparecem:

- a faixa que mostra de quantos até quantos usuários estão sendo exibidos
- botão `Anterior`
- indicador de página atual
- botão `Próxima`

## 12. Botão `Ver detalhe`

Cada linha da tabela tem um botão `Ver detalhe`.

Esse botão abre um painel lateral com a ficha completa do usuário.

Essa é a área mais rica da rota `/admin`.

## 13. O que existe dentro do detalhe do usuário

Ao abrir o detalhe, a equipe vê um painel lateral com várias seções.

## 13.1. Cabeçalho do usuário

Mostra:

- nome
- email
- forma de acesso
- etapa atual da jornada
- marcações visuais quando a conta for:
  - interna
  - de teste
  - bloqueada

Também mostra três números rápidos:

- `Decks`
- `Estudos`
- `Quizzes`

## 13.2. Aquisição e contexto

Essa seção mostra os dados de origem daquela conta.

Os campos exibidos hoje são:

- `Origem`
- `Campanha`
- `Medium`
- `Term`
- `Primeiro toque`
- `Landing page`
- `Referrer`

Em linguagem simples:

- `Origem`: de onde a conta veio
- `Campanha`: qual campanha estava associada
- `Primeiro toque`: primeiro registro de entrada conhecido
- `Landing page`: página de entrada
- `Referrer`: local anterior de onde a pessoa veio, quando houver esse dado

## 13.3. Marcos da jornada

Essa seção mostra datas importantes da evolução da conta:

- `Cadastro`
- `Primeiro login`
- `Primeiro deck`
- `Primeiro estudo`
- `Primeiro quiz`
- `Ativação`
- `Último login`

Essa leitura ajuda a entender:

- se a conta só entrou e parou
- se começou a usar
- se chegou até ativação
- se voltou recentemente

## 13.4. Rotina de uso

Essa seção mostra o padrão de atividade e recorrência de um usuário individual.

Ela aparece automaticamente quando existem dados de rotina disponíveis.

### Classificação de engajamento

No canto superior direito da seção aparece um badge colorido com a classificação do usuário:

- `Diário`: ativo em 80% ou mais dos últimos 14 dias
- `Regular`: ativo em 40% ou mais dos últimos 14 dias
- `Ocasional`: ativo em 10% ou mais dos últimos 30 dias
- `Inativo`: sem atividade por mais de 14 dias
- `Novo`: conta criada há menos de 7 dias

### Cartões de resumo individual

São oito cartões com métricas centrais:

- `Dias ativos`: total de dias em que o usuário teve alguma atividade no período
- `Streak atual`: quantos dias consecutivos o usuário esteve ativo até hoje
- `Maior streak`: recorde de dias consecutivos ativos
- `Gap médio`: média de dias de intervalo entre atividades
- `Tempo total`: soma do tempo registrado em flashcards, quizzes e estudo guiado
- `Flashcards`: tempo registrado nas interações de flashcards
- `Quizzes`: tempo registrado nas tentativas de quiz
- `Guiado`: tempo registrado nas sessões de estudo guiado

### Sobre o tempo de estudo registrado

O cálculo do tempo de estudo usa a duração registrada das atividades:

- `Flashcards`: conta o intervalo entre a exibição do card e o momento em que a pessoa registra o feedback
- `Quiz`: conta o intervalo entre o início do quiz e o envio do resultado
- `Estudo guiado`: usa a duração calculada entre o início e o último acesso da sessão, com um limite máximo de 120 minutos por dia para evitar distorções de abas abertas

### Mapa de calor individual por tipo de atividade

Diferente do mapa de calor geral da aba `Rotina`, o heatmap individual usa cores para indicar o tipo de atividade feita naquele dia:

- `Amarelo`: flashcards
- `Ciano`: quiz
- `Verde`: estudo guiado
- `Roxo`: misto (mais de um tipo no mesmo dia)
- `Cinza claro`: apenas login, sem estudo
- `Cinza escuro/vazio`: sem atividade

Ao passar o mouse em cada quadrado, aparece a data, o tipo de atividade, o número de sessões e o tempo registrado.

### Histórico de atividade recente

Abaixo do heatmap aparece uma lista com os últimos 14 dias em que o usuário esteve ativo.

Cada item mostra:

- um ícone indicando o tipo de atividade (📚 flashcards, ✅ quiz, 📖 estudo guiado, 🔀 misto, 🔑 apenas login)
- a data por extenso com o dia da semana
- um resumo do que foi feito (ex: `3 flashcards · 1 quiz`)
- o tempo registrado de estudo, quando houver

Essa lista é rolável e ajuda a entender rapidamente o que o usuário fez nos dias em que acessou a plataforma.

### Dia preferido

Abaixo do histórico aparece um gráfico de barras verticais mostrando a distribuição de atividade por dia da semana.

O dia mais frequente é destacado em ciano e identificado como `Dia preferido`.

### Último acesso e engajamento

Na parte inferior aparece:

- há quantos dias foi o último acesso (ou `Ativo hoje` se for o dia atual)
- uma barra de progresso com a porcentagem de engajamento
- a cor da barra varia: verde para alto engajamento (≥70%), ciano para médio (≥30%) e amarelo para baixo (<30%)

## 13.5. Controles administrativos

Essa seção permite mudar três marcações da conta:

- `Equipe interna`
- `Conta de teste`
- `Bloquear conta`

Essas mudanças são feitas por chaves de ligar e desligar.

### `Equipe interna`

Marca a conta como interna.

Na própria tela aparece a explicação:

essa marca permite acesso aos módulos internos do admin.

### `Conta de teste`

Marca a conta como conta de teste.

Na própria tela aparece a explicação:

essa marca exclui a conta das leituras padrão quando a visualização está escondendo internos e testes.

### `Bloquear conta`

Marca a conta como bloqueada.

Na própria tela aparece a explicação:

essa marca impede acesso quando houver necessidade operacional.

### Atenção importante sobre mudanças administrativas

Depois de mexer nessas chaves, é preciso clicar em:

- `Salvar alterações`

Se a pessoa apenas ligar ou desligar uma chave e fechar o painel sem salvar, a mudança não fica gravada.

### Proteção para a própria conta

A ferramenta não permite que uma pessoa:

- bloqueie a própria conta
- remova o próprio acesso de equipe

Quando isso for tentado, a própria tela mostra um aviso.

## 13.6. Notas internas

Essa seção serve para registrar observações internas sobre a conta.

Ela possui:

- um campo de texto
- o botão `Salvar nota`
- a lista de notas já registradas

Uso recomendado:

- registrar contexto de suporte
- anotar decisões da equipe
- deixar histórico curto para próximos atendimentos

Cada nota mostra:

- quem escreveu
- o texto da nota
- data e hora de criação

Importante:

- a nota precisa ter conteúdo
- notas vazias não devem ser salvas

## 13.7. Histórico administrativo

Essa seção mostra mudanças feitas pela equipe naquela conta.

Ela ajuda a responder:

- quem alterou algo
- quando alterou
- o que foi alterado

Esse histórico é útil para continuidade de trabalho entre pessoas da equipe.

## 13.8. Documentos recentes

Essa seção mostra os documentos mais recentes ligados à conta.

Na prática, ela mostra os últimos decks e processamentos encontrados para esse usuário.

Cada item exibe:

- título
- data
- quantidade de flashcards
- status
- informação sobre quiz gerado ou não

## 13.9. Eventos recentes

Essa seção mostra os sinais de uso mais recentes registrados para a conta.

Ela ajuda a observar o que aconteceu por último com aquele usuário.

Cada item pode mostrar:

- nome do evento
- data e hora
- referência de documento, quando existir
- referência de quiz, quando existir

## 13.10. Botões do rodapé do painel lateral

No final do painel existem dois botões:

- `Fechar`
- `Salvar alterações`

### `Fechar`

Fecha o painel lateral.

### `Salvar alterações`

Grava mudanças feitas nas chaves administrativas.

## 14. Exportação em CSV

O botão `Exportar CSV` gera uma planilha com a base filtrada.

Ele é útil para:

- repassar dados para outras pessoas
- fazer conferência manual
- trabalhar a lista fora do sistema

## 15. Exportação em PDF

O botão `Exportar PDF` abre uma janela de configuração do relatório.

## 15.1. Presets prontos

A tela oferece combinações prontas de relatório:

- `Executivo`
- `Campanha`
- `Operacional`

Também pode aparecer o estado `Personalizado` quando a seleção for diferente dos modelos prontos.

### O que os presets fazem

Eles ligam ou desligam blocos do relatório para diferentes usos da equipe.

## 15.2. Blocos que podem entrar no PDF

Hoje é possível incluir ou retirar estas partes:

- `Filtros aplicados`
- `Resumo operacional`
- `Aquisição`
- `Tabela de usuários`
- `Milestones do funil`
- `Métricas de uso`

### `Filtros aplicados`

Inclui no relatório o contexto exato do recorte usado.

### `Resumo operacional`

Leva para o PDF os principais números gerais da tela.

### `Aquisição`

Leva a leitura de origem, fontes e campanhas.

### `Tabela de usuários`

Inclui a base filtrada no relatório.

### `Milestones do funil`

Inclui os marcos de jornada por usuário.

### `Métricas de uso`

Inclui medidas de uso, como decks, estudos e quizzes.

## 15.3. Botões da janela de PDF

Na janela de exportação existem:

- `Cancelar`
- `Gerar relatório`

### `Cancelar`

Fecha a janela sem gerar o arquivo.

### `Gerar relatório`

Monta o PDF com base na seleção atual.

## 16. Cuidados importantes para o uso da equipe

Alguns comportamentos da tela merecem atenção:

- tudo depende dos filtros escolhidos
- a busca da aba `Usuários` trabalha sobre a amostra carregada na tela
- mudanças nas chaves administrativas só ficam valendo depois de clicar em `Salvar alterações`
- notas internas devem ser escritas com clareza, porque servem de apoio para outras pessoas da equipe
- exportações refletem o recorte atual, então vale conferir os filtros antes de gerar arquivos

## 17. Exemplos práticos de uso

### Exemplo 1: verificar a saúde de um recorte recente

Passo a passo:

- escolher `Últimos 7 dias` ou `Últimos 30 dias`
- revisar os cartões principais
- olhar `Saúde do recorte atual`
- abrir a aba `Visão geral`
- confirmar avanço, uso e retorno

### Exemplo 2: analisar uma campanha

Passo a passo:

- escolher a campanha no filtro `Campanha`
- revisar `Base total`, `Novos usuários` e `Ativados`
- abrir a aba `Campanhas`
- comparar a qualidade dessa entrada com outras
- exportar PDF se precisar compartilhar a leitura

### Exemplo 3: encontrar e revisar um usuário

Passo a passo:

- abrir a aba `Usuários`
- buscar pelo nome, email, origem ou campanha
- clicar em `Ver detalhe`
- revisar origem, datas importantes, documentos e eventos
- se necessário, adicionar uma nota interna

### Exemplo 4: marcar uma conta para operação

Passo a passo:

- abrir `Ver detalhe`
- localizar `Controles administrativos`
- ligar ou desligar a marca necessária
- clicar em `Salvar alterações`
- conferir o histórico administrativo depois

### Exemplo 5: verificar a rotina de um usuário

Passo a passo:

- abrir a aba `Rotina`
- identificar o usuário no ranking ou na tabela de usuários
- clicar para abrir o detalhe
- verificar a classificação de engajamento (badge colorido)
- revisar o mapa de calor individual para ver padrões
- consultar o histórico de atividade para entender o que o usuário fez em cada dia
- observar o streak e o gap médio para avaliar consistência

### Exemplo 6: analisar a rotina geral da base

Passo a passo:

- abrir a aba `Rotina`
- escolher o período no filtro (7, 30 ou 90 dias)
- revisar os cartões principais para ter uma visão rápida
- observar o mapa de calor geral para identificar padrões ou intervalos
- comparar dias da semana para saber quando a base mais usa
- consultar os horários de pico para entender a distribuição ao longo do dia
- verificar a frequência de uso para entender quantos são regulares
- consultar o ranking para identificar os usuários mais fiéis

## 18. Resumo final

A rota `/admin` do Flashify é hoje um painel interno que reúne:

- visão geral da base
- leitura de entrada e campanhas
- análise de rotina e recorrência dos usuários
- tabela operacional de usuários
- ficha detalhada por conta, incluindo rotina individual
- controles administrativos
- notas internas
- exportação em CSV e PDF

Para uso seguro da equipe, a regra principal é simples:

- primeiro definir bem o recorte
- depois ler os números e gráficos
- por fim agir na aba `Usuários` quando for necessário

Se este guia for atualizado no futuro, o ideal é sempre conferir se a tela ainda possui exatamente os mesmos nomes, seções e botões descritos aqui.
