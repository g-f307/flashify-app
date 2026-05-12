# Release em construcao: melhorias na experiencia de estudo e operacao

## 1. Identificacao

- `Titulo da release`: Melhorias na experiencia de estudo e operacao
- `Slug`: `melhorias-na-experiencia-de-estudo-e-operacao`
- `Status`: `Em construcao`
- `Data de abertura`: `2026-05-11`
- `Data prevista para fechamento`: `Em definicao`
- `Responsavel`: `Equipe Flashify`

## 2. Visao geral

Esta release concentra melhorias estruturais na experiencia de estudo, criacao e manutencao de flashcards, com foco especial em conteudo tecnico, cientifico e academico. O objetivo e permitir que o produto trate melhor textos formatados, equacoes matematicas, notacao tecnica e fluxos de edicao mais robustos, ao mesmo tempo em que incorpora correcoes operacionais importantes, como estabilizacao da exclusao de decks e maior robustez visual para titulos longos em cards e na pagina individual do deck.

## 3. Objetivo

- elevar a qualidade da edicao de flashcards com suporte a texto rico nativo
- suportar conteudo tecnico e matematico gerado ou editado com ajuda da IA
- manter boa experiencia visual no desktop e no mobile sem quebra de layout
- consolidar melhorias de estabilidade e usabilidade em areas criticas do produto
- evitar regressao visual causada por titulos extensos em cards e cabecalhos de deck
- garantir exclusao de decks sem falhas por referencias residuais no backend
- preparar a release para incorporar novos ajustes operacionais antes do fechamento

## 4. Escopo da release

### 4.1. Entradas confirmadas

- editor de texto nativo para campos de frente e verso
- suporte a renderizacao de conteudo rico e equacoes matematicas nos flashcards
- adaptacao dos cards para conteudo tecnico mais denso no estudo e na edicao
- estabilizacao de interacoes sensiveis em modais e areas de gerenciamento
- correcoes de layout para titulos longos em cards de deck e na pagina individual
- estabilizacao do fluxo de exclusao de decks e dados associados
- ajustes futuros em bugs de interface
- revisao futura da logica de algumas barras de progresso
- adicoes futuras na rota `/admin`

### 4.2. Fora de escopo

- reformulacao visual ampla da identidade do produto
- reestruturacao completa da arquitetura de analytics
- substituicao do fluxo principal de estudo por um modelo novo

## 5. Funcionalidades concluidas

### 5.1. Editor de texto nativo para flashcards

- `Nome`: Editor de texto nativo para frente e verso
- `Status`: `Concluida`
- `Descricao`: Foi introduzido um editor nativo com recursos de formatacao leve para os campos de frente e verso, cobrindo edicao individual e edicao em massa.
- `Impacto no usuario`: O usuario pode destacar termos-chave, enfatizar trechos, organizar partes do conteudo e estruturar melhor respostas sem depender de texto puro.
- `Impacto tecnico`: O frontend passou a trabalhar com conteudo rico controlado e com uma representacao preparada para persistencia e renderizacao segura.

### 5.2. Suporte a conteudo tecnico, cientifico e matematico

- `Nome`: Renderizacao de conteudo tecnico com equacoes e notacao especializada
- `Status`: `Concluida`
- `Descricao`: O fluxo de geracao e exibicao de flashcards foi ajustado para aceitar melhor equacoes matematicas complexas, formulas de fisica, notacao tecnica e conteudo estruturado vindo da IA.
- `Impacto no usuario`: Flashcards tecnicos passaram a suportar melhor disciplinas com alto uso de simbolos, formulas e estrutura textual mais densa.
- `Impacto tecnico`: Houve ampliacao da pipeline de renderizacao no frontend e adequacao do backend para preservar estrutura de texto e conteudo tecnico com menos perda semantica.

### 5.3. Adaptacao visual do flashcard para conteudo rico

- `Nome`: Adaptacao do flashcard para rich text e conteudo extenso
- `Status`: `Concluida`
- `Descricao`: O card foi ajustado para receber melhor blocos de texto, listas, citacoes, trechos tecnicos e formulas, sem comprometer a legibilidade nem a navegacao principal.
- `Impacto no usuario`: O estudo continua fluido mesmo com conteudo mais elaborado, tanto em telas maiores quanto em dispositivos moveis.
- `Impacto tecnico`: Foram adicionadas regras de renderizacao e estilos especificos para overflow, scroll, centralizacao de conteudo e consistencia visual entre as faces do card.

### 5.4. Refinos de interacao em edicao e gerenciamento

- `Nome`: Refinos de usabilidade nos modais de edicao e gerenciamento
- `Status`: `Concluida`
- `Descricao`: Foram feitos ajustes de responsividade, organizacao da interface de formatacao, comportamento de preview, isolamento de eventos e correcoes de cliques e toques indevidos em fluxos sensiveis.
- `Impacto no usuario`: A experiencia de editar um flashcard e gerenciar varios cards ficou mais previsivel, com menos interferencia acidental no uso.
- `Impacto tecnico`: A camada de modais e interacoes passou por estabilizacao especifica para desktop e mobile.

### 5.5. Robustez visual para titulos longos de decks

- `Nome`: Estabilizacao de layout para nomes extensos de deck
- `Status`: `Concluida`
- `Descricao`: Foram aplicados ajustes na exibicao de titulos longos nos cards da biblioteca, cards recentes do dashboard e na pagina individual do deck, preservando alinhamento, altura consistente e comportamento previsivel tanto no mobile quanto no desktop.
- `Impacto no usuario`: Decks com nomes extensos deixaram de empurrar o corpo dos cards, desalinharem badges ou invadirem areas vizinhas da interface.
- `Impacto tecnico`: O frontend passou a usar limites de largura, truncamento controlado e distribuicao vertical mais estavel nos componentes de card e no cabecalho do deck.

### 5.6. Estabilizacao da exclusao de decks

- `Nome`: Correcao de falha na exclusao de decks com referencias associadas
- `Status`: `Concluida`
- `Descricao`: O fluxo de exclusao de decks foi ajustado para limpar ou desassociar registros relacionados antes da remocao do documento principal, evitando erro interno ao apagar decks que ainda possuam eventos e vinculos residuais.
- `Impacto no usuario`: O usuario consegue excluir decks sem encontrar falhas inesperadas durante a operacao.
- `Impacto tecnico`: O backend passou a tratar explicitamente dependencias como eventos de produto, sessoes guiadas, tentativas de quiz e referencias associadas ao documento excluido.

## 6. Itens em andamento

### 6.1. Correcoes adicionais de erros e bugs de interface

- `Nome`: Correcao complementar de bugs de interface
- `Status`: `Em aberto`
- `Descricao atual`: Esta frente permanece aberta para tratar inconsistencias residuais de comportamento visual e de interacao que ainda surgirem durante a validacao da release.
- `Dependencias`: Validacao manual, testes exploratorios e consolidacao dos cenarios mais criticos.
- `Risco atual`: Baixo a medio, dependendo da profundidade dos ajustes necessarios em componentes compartilhados.

## 7. Itens planejados

### 7.1. Ajustes na logica de barras de progresso

- `Nome`: Revisao da logica de algumas barras de progresso
- `Status`: `Planejado`
- `Descricao esperada`: Revisar regras de calculo, exibicao e coerencia de progresso em fluxos relevantes do produto.
- `Criterio de entrada na release`: Definicao final de quais barras serao impactadas e quais regras atuais precisam ser ajustadas.

### 7.2. Adicoes na rota `/admin`

- `Nome`: Evolucoes na rota administrativa
- `Status`: `Planejado`
- `Descricao esperada`: Incorporar novas capacidades ou refinamentos na area `/admin`, alinhados com as necessidades operacionais da equipe.
- `Criterio de entrada na release`: Fechamento do escopo funcional desta frente e definicao dos impactos em UX e dados.

## 8. Correcoes e ajustes incluidos

- reorganizacao da interface de ferramentas do editor para um padrao mais discreto e coerente
- remocao de preview desnecessario da edicao individual para restaurar um fluxo mais direto
- ajuste de responsividade do modal de edicao individual com scroll interno e melhor distribuicao de espaco
- restauracao do comportamento esperado do preview em edicao em massa ao alternar foco entre frente e verso
- refinamento da posicao e leitura do menu de acoes do flashcard nas duas faces
- blindagem de interacoes indevidas em modais de gerenciamento, inclusive em cenarios mobile
- correcoes de truncamento, alinhamento e distribuicao vertical para decks com titulos longos em cards da biblioteca e do dashboard
- correcao da sobreposicao do titulo na pagina individual do deck sem alterar a composicao desejada da sidebar
- estabilizacao da exclusao de decks com limpeza de referencias residuais que bloqueavam a operacao no backend

## 9. Impacto tecnico

### 9.1. Frontend

- componentes afetados: estudo, edicao individual, edicao em massa, modais, renderizacao de conteudo, cards de deck, pagina individual do deck e estilos globais
- riscos principais: regressao visual em componentes compartilhados e sensibilidade de interacoes em modal no mobile
- cuidados de responsividade: preservar leitura, scroll interno, overflow controlado, estabilidade do card em telas menores e comportamento consistente para titulos extensos

### 9.2. Backend

- servicos ou rotas afetadas: geracao por IA, persistencia de flashcards, fluxo de documentos relacionados e exclusao de decks
- impactos de compatibilidade: necessidade de preservar conteudo com mais estrutura sem degradar o fluxo legado e manter integridade ao remover documentos com referencias associadas

### 9.3. Banco de dados

- migrations envolvidas: expansao do campo `front` de flashcards para suportar conteudo mais extenso
- impacto esperado: maior flexibilidade para frente e verso em cards tecnicos ou mais densos
- cuidados de rollback: avaliar impacto da reversao em ambientes que ja tenham conteudo maior persistido

### 9.4. Dependencias

- novas dependencias: bibliotecas de renderizacao e saneamento de rich text e matematica no frontend
- dependencias alteradas: locks e manifestos do frontend atualizados para suportar a nova stack de exibicao

## 10. QA e validacao

### 10.1. Cenarios obrigatorios

- [ ] validar fluxo principal no desktop
- [ ] validar fluxo principal no mobile
- [ ] validar estados vazios e estados de erro
- [ ] validar regressao nas areas adjacentes

### 10.2. Casos especificos desta release

- [ ] validar negrito, italico, citacao, listas e codigo no editor nativo
- [ ] validar equacoes matematicas e formulas tecnicas em flashcards gerados pela IA
- [ ] validar cards longos, conteudo extenso e overflow horizontal de formulas
- [ ] validar edicao individual sem quebra de layout em viewport reduzida
- [ ] validar edicao em massa com preview coerente entre frente e verso
- [ ] validar ausencia de cliques ou toques fantasmas em gerenciamento no desktop e no mobile
- [ ] validar alinhamento de badges e altura padronizada dos cards com titulos curtos, medios e muito longos
- [ ] validar pagina individual do deck com titulo extenso sem sobreposicao da sidebar no desktop
- [ ] validar exclusao de deck com flashcards, quiz, sessoes guiadas e eventos associados

## 11. Deploy

### 11.1. Pre-requisitos

- [ ] migration aplicada no banco
- [ ] dependencias do frontend instaladas
- [ ] rebuild do frontend executado
- [ ] validacao da nova renderizacao em ambiente alvo

### 11.2. Passos de deploy

1. aplicar as migrations do backend
2. garantir instalacao das dependencias atualizadas do frontend
3. recriar ou rebuildar os servicos necessarios
4. validar edicao, renderizacao e estudo de um card com rich text e formula

## 12. Rollback

Descrever como desfazer a release se necessario.

- `Aplicacao`: reverter os commits da release e restaurar a renderizacao anterior dos flashcards
- `Banco de dados`: avaliar cuidadosamente rollback da migration caso ja existam dados com conteudo mais extenso
- `Risco do rollback`: medio, principalmente se a reversao afetar compatibilidade de dados persistidos

## 13. Riscos e pontos de atencao

- conteudo tecnico mais denso aumenta a superficie de testes de layout e responsividade
- qualquer ajuste em modais compartilhados pode gerar regressao indireta em fluxos adjacentes
- a release ainda depende de definicao final das melhorias de interface, barras de progresso e `/admin`
- ajustes em cards compartilhados exigem cuidado para nao introduzir desalinhamentos entre biblioteca, dashboard e pastas
- a exclusao de decks deve continuar sendo observada em cenarios com historico analitico e eventos antigos

## 14. Criterios para fechamento da release

- [ ] correcoes adicionais de bugs de interface foram implementadas e validadas
- [ ] ajustes previstos nas barras de progresso foram definidos e entregues
- [ ] adicoes planejadas para a rota `/admin` foram implementadas
- [ ] checklist de QA foi concluido com validacao em desktop e mobile
- [ ] riscos bloqueantes foram resolvidos ou formalmente aceitos
- [ ] documentacao final da release foi atualizada para estado de fechamento

## 15. Evidencias e referencias

- documento base relacionado: `docs/guia-admin-flashify.md`
- evidencias visuais da feature: `Adicionar capturas ou gravacoes quando consolidado`
- PRs e commits: `Preencher ao consolidar a release`
- testes e validacoes: `Preencher ao finalizar a rodada de QA`

## 16. Historico de atualizacao

### 2026-05-11

- criacao do primeiro documento oficial da release em construcao
- registro das funcionalidades ja entregues para rich text, conteudo tecnico e estabilizacao inicial de UX
- abertura formal das frentes futuras de bugs de interface, barras de progresso e evolucoes em `/admin`
- inclusao das correcoes de layout para titulos longos em cards e na pagina do deck
- inclusao da correcao operacional para exclusao de decks com referencias residuais no backend
