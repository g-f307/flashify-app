# Release fechada: melhorias na experiência de estudo e operação

## 1. Identificação

- `Título da release`: Melhorias na experiência de estudo e operação
- `Slug`: `melhorias-na-experiencia-de-estudo-e-operacao`
- `Status`: `Fechada`
- `Data de abertura`: `2026-05-11`
- `Data de fechamento`: `2026-05-11`
- `Responsável`: `Equipe Flashify`

## 2. Visão geral

Esta release concentra melhorias estruturais na experiência de estudo, criação e manutenção de flashcards, com foco especial em conteúdo técnico, científico e acadêmico. O objetivo é permitir que o produto trate melhor textos formatados, equações matemáticas, notação técnica e fluxos de edição mais robustos, ao mesmo tempo em que incorpora correções operacionais importantes, como estabilização da exclusão de decks e maior robustez visual para títulos longos em cards e na página individual do deck. A release também incorpora evoluções no painel administrativo, incluindo rastreamento real de telas e métricas de modos de estudo.

## 3. Objetivo

- elevar a qualidade da edição de flashcards com suporte a texto rico nativo
- suportar conteúdo técnico e matemático gerado ou editado com ajuda da IA
- manter boa experiência visual no desktop e no mobile sem quebra de layout
- consolidar melhorias de estabilidade e usabilidade em áreas críticas do produto
- evitar regressão visual causada por títulos extensos em cards e cabeçalhos de deck
- garantir exclusão de decks sem falhas por referências residuais no backend
- entregar visibilidade operacional sobre modos de estudo e telas mais acessadas no admin

## 4. Escopo da release

### 4.1. Entradas confirmadas

- editor de texto nativo para campos de frente e verso
- suporte a renderização de conteúdo rico e equações matemáticas nos flashcards
- adaptação dos cards para conteúdo técnico mais denso no estudo e na edição
- estabilização de interações sensíveis em modais e áreas de gerenciamento
- correções de layout para títulos longos em cards de deck e na página individual
- estabilização do fluxo de exclusão de decks e dados associados
- ajustes de documentação e ajuda contextual para o sistema de revisão inteligente
- refinos visuais na exibição de barras de progresso para evitar progresso artificial
- correção de duplicidade do menu de ações em flashcards no mobile
- rastreamento real de visitas por tela no frontend (fire-and-forget)
- métricas de modos de estudo no painel administrativo (flashcards, quiz, estudo guiado)
- aba "Uso" no admin com ranking de telas e distribuição de sessões por modo

### 4.2. Fora de escopo

- reformulação visual ampla da identidade do produto
- reestruturação completa da arquitetura de analytics
- substituição do fluxo principal de estudo por um modelo novo

## 5. Funcionalidades concluídas

### 5.1. Editor de texto nativo para flashcards

- `Nome`: Editor de texto nativo para frente e verso
- `Status`: `Concluída`
- `Descrição`: Foi introduzido um editor nativo com recursos de formatação leve para os campos de frente e verso, cobrindo edição individual e edição em massa.
- `Impacto no usuário`: O usuário pode destacar termos-chave, enfatizar trechos, organizar partes do conteúdo e estruturar melhor respostas sem depender de texto puro.
- `Impacto técnico`: O frontend passou a trabalhar com conteúdo rico controlado e com uma representação preparada para persistência e renderização segura.

### 5.2. Suporte a conteúdo técnico, científico e matemático

- `Nome`: Renderização de conteúdo técnico com equações e notação especializada
- `Status`: `Concluída`
- `Descrição`: O fluxo de geração e exibição de flashcards foi ajustado para aceitar melhor equações matemáticas complexas, fórmulas de física, notação técnica e conteúdo estruturado vindo da IA.
- `Impacto no usuário`: Flashcards técnicos passaram a suportar melhor disciplinas com alto uso de símbolos, fórmulas e estrutura textual mais densa.
- `Impacto técnico`: Houve ampliação da pipeline de renderização no frontend e adequação do backend para preservar estrutura de texto e conteúdo técnico com menos perda semântica.

### 5.3. Adaptação visual do flashcard para conteúdo rico

- `Nome`: Adaptação do flashcard para rich text e conteúdo extenso
- `Status`: `Concluída`
- `Descrição`: O card foi ajustado para receber melhor blocos de texto, listas, citações, trechos técnicos e fórmulas, sem comprometer a legibilidade nem a navegação principal.
- `Impacto no usuário`: O estudo continua fluido mesmo com conteúdo mais elaborado, tanto em telas maiores quanto em dispositivos móveis.
- `Impacto técnico`: Foram adicionadas regras de renderização e estilos específicos para overflow, scroll, centralização de conteúdo e consistência visual entre as faces do card.

### 5.4. Refinos de interação em edição e gerenciamento

- `Nome`: Refinos de usabilidade nos modais de edição e gerenciamento
- `Status`: `Concluída`
- `Descrição`: Foram feitos ajustes de responsividade, organização da interface de formatação, comportamento de preview, isolamento de eventos e correções de cliques e toques indevidos em fluxos sensíveis.
- `Impacto no usuário`: A experiência de editar um flashcard e gerenciar vários cards ficou mais previsível, com menos interferência acidental no uso.
- `Impacto técnico`: A camada de modais e interações passou por estabilização específica para desktop e mobile.

### 5.5. Robustez visual para títulos longos de decks

- `Nome`: Estabilização de layout para nomes extensos de deck
- `Status`: `Concluída`
- `Descrição`: Foram aplicados ajustes na exibição de títulos longos nos cards da biblioteca, cards recentes do dashboard e na página individual do deck, preservando alinhamento, altura consistente e comportamento previsível tanto no mobile quanto no desktop.
- `Impacto no usuário`: Decks com nomes extensos deixaram de empurrar o corpo dos cards, desalinharem badges ou invadirem áreas vizinhas da interface.
- `Impacto técnico`: O frontend passou a usar limites de largura, truncamento controlado e distribuição vertical mais estável nos componentes de card e no cabeçalho do deck.

### 5.6. Estabilização da exclusão de decks

- `Nome`: Correção de falha na exclusão de decks com referências associadas
- `Status`: `Concluída`
- `Descrição`: O fluxo de exclusão de decks foi ajustado para limpar ou desassociar registros relacionados antes da remoção do documento principal, evitando erro interno ao apagar decks que ainda possuam eventos e vínculos residuais.
- `Impacto no usuário`: O usuário consegue excluir decks sem encontrar falhas inesperadas durante a operação.
- `Impacto técnico`: O backend passou a tratar explicitamente dependências como eventos de produto, sessões guiadas, tentativas de quiz e referências associadas ao documento excluído.

### 5.7. Documentação contextual do SRS

- `Nome`: Esclarecimento da sigla SRS e atalhos de ajuda na interface
- `Status`: `Concluída`
- `Descrição`: A documentação de revisão inteligente passou a explicar explicitamente que SRS significa Spaced Repetition System, e a interface recebeu atalhos com ícone de ajuda nos pontos em que a sigla aparece.
- `Impacto no usuário`: O usuário entende com mais clareza o que significa SRS e consegue abrir rapidamente a explicação sem precisar procurar manualmente no suporte.
- `Impacto técnico`: Foi criado um padrão reutilizável de link de ajuda contextual conectado ao guia de revisão inteligente.

### 5.8. Ajuste de progresso visual real

- `Nome`: Barras de progresso exibem avanços apenas quando há progresso efetivo
- `Status`: `Concluída`
- `Descrição`: As barras de progresso do quiz e do card "Continue de onde parou" foram ajustadas para não sugerirem avanços artificiais em 0% ou antes da conclusão real de uma etapa.
- `Impacto no usuário`: O progresso visual ficou mais honesto e previsível, sem transmitir a impressão de avanços que ainda não aconteceram.
- `Impacto técnico`: O frontend deixou de forçar preenchimento mínimo visual e passou a calcular o quiz com base em etapas efetivamente concluídas.

### 5.9. Correção do menu duplicado em flashcard mobile

- `Nome`: Remoção de duplicidade do menu de ações no verso do flashcard
- `Status`: `Concluída`
- `Descrição`: O menu de três pontos do flashcard individual foi corrigido para aparecer apenas na face ativa do card, evitando duplicidade visual em navegadores mobile.
- `Impacto no usuário`: A experiência no mobile ficou mais limpa e sem elementos sobrepostos no verso do flashcard.
- `Impacto técnico`: A renderização do menu de ações passou a respeitar o estado ativo da face do flashcard durante a rotação 3D.

### 5.10. Rastreamento real de telas acessadas

- `Nome`: Page view tracking por rota no frontend
- `Status`: `Concluída`
- `Descrição`: O layout principal do app passou a registrar uma visita de tela a cada mudança de rota do usuário autenticado. A chamada ao backend é fire-and-forget com `keepalive: true`, sem nenhum impacto na navegação.
- `Impacto no usuário`: Nenhum impacto direto. Os dados passam a ser coletados silenciosamente.
- `Impacto técnico`: Foi adicionado um `useEffect` no `layout.tsx` que extrai a chave de tela do `pathname` e chama `POST /analytics/screen-view`. O backend grava um `ProductEvent("screen_view")` na tabela já existente, sem necessidade de migration.

### 5.11. Métricas de modos de estudo no admin

- `Nome`: Aba "Uso" no painel administrativo com distribuição de sessões por modo
- `Status`: `Concluída`
- `Descrição`: Foi adicionada uma nova aba "Uso" no admin com dois blocos: distribuição de sessões e tempo por modo de estudo (flashcards, quiz, estudo guiado) e ranking das telas mais acessadas. Os dados respeitam todos os filtros globais do admin e carregam de forma lazy ao selecionar a aba.
- `Impacto no usuário (admin)`: A equipe passa a ter visibilidade sobre qual modo de estudo é mais utilizado e quais telas os usuários mais acessam, sem precisar consultar o banco diretamente.
- `Impacto técnico`: Foram adicionados três endpoints em `analytics.py` (`POST /screen-view`, `GET /study-modes`, `GET /screen-activity`), dois novos tipos em `api.ts` e o componente da aba no `admin/page.tsx`, seguindo o padrão de carregamento lazy já existente na aba Rotina.

## 6. Correções e ajustes incluídos

- reorganização da interface de ferramentas do editor para um padrão mais discreto e coerente
- remoção de preview desnecessário da edição individual para restaurar um fluxo mais direto
- ajuste de responsividade do modal de edição individual com scroll interno e melhor distribuição de espaço
- restauração do comportamento esperado do preview em edição em massa ao alternar foco entre frente e verso
- refinamento da posição e leitura do menu de ações do flashcard nas duas faces
- blindagem de interações indevidas em modais de gerenciamento, inclusive em cenários mobile
- correções de truncamento, alinhamento e distribuição vertical para decks com títulos longos em cards da biblioteca e do dashboard
- correção da sobreposição do título na página individual do deck sem alterar a composição desejada da sidebar
- estabilização da exclusão de decks com limpeza de referências residuais que bloqueavam a operação no backend
- explicação explícita da sigla SRS no guia de revisão inteligente
- inclusão de atalhos de ajuda com ícone de interrogação nos pontos da interface em que SRS aparece
- ajuste da barra de progresso do quiz para avançar apenas após a progressão real entre perguntas
- remoção de preenchimento mínimo artificial da barra de progresso em 0% no card de continuidade
- correção do menu de três pontos duplicado no verso do flashcard individual no mobile
- adição do endpoint `POST /analytics/screen-view` para registro de visitas por tela
- adição dos endpoints `GET /analytics/study-modes` e `GET /analytics/screen-activity`
- adição do tracking fire-and-forget de page views no `layout.tsx`
- adição da aba "Uso" no painel admin com donut chart, barras de progresso e ranked list

## 7. Impacto técnico

### 7.1. Frontend

- componentes afetados: estudo, edição individual, edição em massa, modais, renderização de conteúdo, cards de deck, página individual do deck, layout principal, painel admin e estilos globais
- riscos principais: regressão visual em componentes compartilhados e sensibilidade de interações em modal no mobile
- cuidados de responsividade: preservar leitura, scroll interno, overflow controlado, estabilidade do card em telas menores e comportamento consistente para títulos extensos

### 7.2. Backend

- serviços ou rotas afetadas: geração por IA, persistência de flashcards, fluxo de documentos relacionados, exclusão de decks e endpoints de analytics
- impactos de compatibilidade: necessidade de preservar conteúdo com mais estrutura sem degradar o fluxo legado e manter integridade ao remover documentos com referências associadas

### 7.3. Banco de dados

- migrations envolvidas: expansão do campo `front` de flashcards para suportar conteúdo mais extenso
- impacto esperado: maior flexibilidade para frente e verso em cards técnicos ou mais densos
- cuidados de rollback: avaliar impacto da reversão em ambientes que já tenham conteúdo maior persistido
- sem novas migrations para o tracking de telas: reutiliza a tabela `ProductEvent` existente

### 7.4. Dependências

- novas dependências: bibliotecas de renderização e saneamento de rich text e matemática no frontend
- dependências alteradas: locks e manifestos do frontend atualizados para suportar a nova stack de exibição

## 8. QA e validação

### 8.1. Cenários obrigatórios

- [x] validar fluxo principal no desktop
- [x] validar fluxo principal no mobile
- [x] validar estados vazios e estados de erro
- [x] validar regressão nas áreas adjacentes

### 8.2. Casos específicos desta release

- [x] validar negrito, itálico, citação, listas e código no editor nativo
- [x] validar equações matemáticas e fórmulas técnicas em flashcards gerados pela IA
- [x] validar cards longos, conteúdo extenso e overflow horizontal de fórmulas
- [x] validar edição individual sem quebra de layout em viewport reduzida
- [x] validar edição em massa com preview coerente entre frente e verso
- [x] validar ausência de cliques ou toques fantasmas em gerenciamento no desktop e no mobile
- [x] validar alinhamento de badges e altura padronizada dos cards com títulos curtos, médios e muito longos
- [x] validar página individual do deck com título extenso sem sobreposição da sidebar no desktop
- [x] validar exclusão de deck com flashcards, quiz, sessões guiadas e eventos associados
- [x] validar que a barra de progresso do quiz inicia em 0% e só avança após cada próxima pergunta
- [x] validar que o card "Continue de onde parou" não mostra preenchimento quando o progresso estiver em 0%
- [x] validar os atalhos de ajuda do SRS em desktop e mobile
- [x] validar que o menu de três pontos do flashcard individual não aparece duplicado no mobile
- [x] validar que o tracking de telas é registrado sem impacto na navegação
- [x] validar que a aba "Uso" carrega dados de modos de estudo corretamente
- [x] validar que o ranking de telas exibe acessos reais após navegação

## 9. Deploy

### 9.1. Pré-requisitos

- [x] migration aplicada no banco
- [x] dependências do frontend instaladas
- [x] rebuild do frontend executado
- [x] validação da nova renderização em ambiente alvo

### 9.2. Passos de deploy

1. aplicar as migrations do backend
2. garantir instalação das dependências atualizadas do frontend
3. recriar ou rebuildar os serviços necessários
4. validar edição, renderização e estudo de um card com rich text e fórmula
5. acessar o painel admin, aba "Uso", e confirmar carregamento dos blocos

## 10. Rollback

- `Aplicação`: reverter os commits da release e restaurar a renderização anterior dos flashcards
- `Banco de dados`: avaliar cuidadosamente rollback da migration caso já existam dados com conteúdo mais extenso
- `Risco do rollback`: médio, principalmente se a reversão afetar compatibilidade de dados persistidos
- `Observação tracking`: os eventos `screen_view` registrados na `ProductEvent` não causam problema em caso de rollback; são dados aditivos sem impacto em funcionalidades existentes

## 11. Riscos e pontos de atenção

- conteúdo técnico mais denso aumenta a superfície de testes de layout e responsividade
- qualquer ajuste em modais compartilhados pode gerar regressão indireta em fluxos adjacentes
- a exclusão de decks deve continuar sendo observada em cenários com histórico analítico e eventos antigos
- o tracking de telas acumula dados apenas a partir do deploy; períodos anteriores não possuem histórico

## 12. Critérios para fechamento da release

- [x] adições planejadas para a rota `/admin` foram implementadas
- [x] checklist de QA foi concluído com validação em desktop e mobile
- [x] riscos bloqueantes foram resolvidos ou formalmente aceitos
- [x] documentação final da release foi atualizada para estado de fechamento

## 13. Evidências e referências

- documento base relacionado: `docs/guia-admin-flashify.md`
- PRs e commits: `feat(analytics): add screen-view, study-modes and screen-activity endpoints` / `feat(admin): add Usage tab with study modes breakdown and screen activity ranking`

## 14. Histórico de atualização

### 2026-05-11 — abertura

- criação do primeiro documento oficial da release em construção
- registro das funcionalidades já entregues para rich text, conteúdo técnico e estabilização inicial de UX
- abertura formal das frentes futuras de bugs de interface, barras de progresso e evoluções em `/admin`
- inclusão das correções de layout para títulos longos em cards e na página do deck
- inclusão da correção operacional para exclusão de decks com referências residuais no backend
- inclusão do esclarecimento da sigla SRS com atalhos de ajuda contextual na interface
- inclusão dos refinamentos de progresso visual real em quiz e card de continuidade
- inclusão da correção do menu duplicado no flashcard individual em navegadores mobile

### 2026-05-11 — fechamento

- adição do rastreamento real de telas via `layout.tsx` (fire-and-forget, sem impacto no UX)
- adição dos endpoints `POST /screen-view`, `GET /study-modes` e `GET /screen-activity` no backend
- adição da aba "Uso" no painel admin com distribuição de modos de estudo e ranking de telas acessadas
- conclusão de todos os itens planejados e em aberto desta release
- atualização do status para `Fechada` e registro da data de fechamento
