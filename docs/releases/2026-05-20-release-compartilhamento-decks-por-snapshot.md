# Release fechada: compartilhamento de decks por snapshot e evolução da experiência de estudo

## 1. Identificação

- `Título da release`: Compartilhamento de decks por snapshot e evolução da experiência de estudo
- `Slug`: `compartilhamento-decks-por-snapshot`
- `Status`: `Fechada`
- `Data de abertura`: `2026-05-20`
- `Data de fechamento`: `2026-06-21`
- `Responsável`: `Equipe Flashify`

## 2. Visão geral

Esta release começou com uma frente principal de compartilhamento de decks por snapshot congelada, permitindo publicar o estado atual de um deck sem expor o deck vivo da biblioteca do remetente. Ao longo da execução, a mesma release passou a concentrar outras frentes independentes, mas convergentes, ligadas à criação de conteúdo, ao pós-estudo, à leitura de progresso e à organização da biblioteca.

Ao final, a release consolidou cinco grandes blocos:

- compartilhamento readonly de decks por snapshot, com importação segura para a biblioteca
- seleção avançada de páginas de `PDF` e melhora da qualidade dos flashcards gerados
- feedback pós-sessão com recompensa única, indicação do produto e mascote contextual
- nova tela de progresso, com ranking, visão por modo de estudo e experiência refinada em desktop, mobile e modo escuro
- organização da biblioteca com seções por revisão pendente, busca, ordenação e paginação mais coerente

Além das entregas funcionais, houve uma rodada extensa de refinamento visual e comportamental: adequação do mascote às telas de relatório, substituição de emojis por expressões do Flashinho, ajustes de dark mode, melhora do ranking global, redução de ruído visual em gráficos, revisão de escalas e integração de efeitos sonoros configuráveis nos fluxos de estudo.

## 3. Objetivo

### 3.1. Objetivo principal da release

- permitir compartilhamento seguro de decks sem acoplar o link ao deck vivo do remetente
- preservar o estado do deck no momento do compartilhamento
- oferecer leitura consistente do deck compartilhado em `flashcards`, `quiz` e `estudo guiado`
- permitir importação para a biblioteca do destinatário sem afetar o deck original

### 3.2. Segunda frente incluída na release

- permitir seleção parcial de páginas de `PDF` antes da geração
- reduzir ruído e aumentar concisão dos flashcards gerados
- melhorar a previsibilidade do fluxo de criação

### 3.3. Terceira frente incluída na release

- coletar feedback contextual ao final de `flashcards`, `quiz` e `estudo guiado`
- conceder recompensa única de `+3 gerações` apenas após envio válido do feedback
- transformar o pós-estudo em uma experiência de agradecimento e indicação

### 3.4. Quarta frente incluída na release

- implementar uma tela de progresso realmente integrada ao ecossistema do Flashify
- representar evolução por modo de estudo sem dados mockados
- exibir ranking global, atividade semanal, recomendações e mensagens contextuais
- garantir compatibilidade visual com modo escuro, mobile e identidade do produto

### 3.5. Quinta frente incluída na release

- reorganizar a biblioteca para destacar decks com revisões pendentes
- permitir busca rápida e ordenação previsível dos decks
- melhorar a experiência visual dos relatórios com o mascote e microinterações sonoras

## 4. Escopo da release

### 4.1. Entradas confirmadas

#### 4.1.1. Frente principal: compartilhamento por snapshot

- backend para criação, leitura e importação de snapshots compartilhadas
- persistência dedicada para payload congelado do deck
- página hub do deck compartilhado com CTA de importação
- experiências readonly para `study`, `quiz` e `guided`
- autenticação preservando `redirect` para links compartilhados
- modal de compartilhamento com ações de share e `Copiar link`

#### 4.1.2. Segunda frente: criação e qualidade de estudo

- inspeção e seleção de páginas de `PDF`
- persistência do filtro bruto de páginas no documento
- preview visual de páginas com seleção manual
- ajuste das instruções e da normalização dos flashcards para respostas mais curtas

#### 4.1.3. Terceira frente: feedback pós-sessão e indicação

- persistência de oferta e resgate único da recompensa de feedback
- ampliação do contrato de gerações
- modal responsivo de feedback
- etapa de agradecimento com confete e atualização imediata da barra de gerações
- modal de indicação reaproveitável na sidebar

#### 4.1.4. Quarta frente: nova experiência de progresso

- backend para resumo, tendências, atividade semanal, ranking e recomendações
- página `/progress` com abas para `Visão Geral`, `Flashcards`, `Quizzes` e `Estudo Guiado`
- cards de métricas por modo
- gráfico semanal contextual
- ranking global com preview, modal completo e fallback de carregamento
- recomendações dinâmicas de próxima ação
- refino visual completo para dark mode, mobile e densidade informacional

#### 4.1.5. Quinta frente: biblioteca, mascote e microinterações

- separação visual entre decks com revisões pendentes e decks sem pendência
- busca por deck no cabeçalho da biblioteca
- ordenação por `Mais recentes`, `Mais antigas` e `Nome A-Z`
- paginação abaixo das duas seções
- sistema de expressões do Flashinho para relatórios e feedback
- substituição dos emojis por assets do mascote
- efeitos sonoros globais configuráveis para estudo e relatórios

### 4.2. Fora de escopo

- compartilhamento do deck vivo com atualização em tempo real
- gestão de múltiplos links de share pelo remetente
- visualização pública sem autenticação
- estatísticas de progresso dentro do modo compartilhado
- suporte equivalente de seleção parcial para `DOCX`, `PPTX` e imagens
- programa recorrente de recompensas por feedback além do primeiro resgate
- sistema de áudio avançado com trilhas, mixer ou preferências por categoria de som

## 5. Funcionalidades concluídas

### 5.1. Persistência de snapshot compartilhada

- `Nome`: Persistência de deck compartilhado congelado
- `Status`: `Concluída`
- `Descrição`: Foi criado um modelo dedicado para snapshots compartilhadas, com token próprio e serialização do estado do deck no momento do share.
- `Impacto no usuário`: O link representa uma cópia congelada do deck, sem ser alterado por edições futuras no deck do remetente.
- `Impacto técnico`: O backend passou a persistir snapshots com `flashcards`, `quiz`, `guided_study` e estrutura pronta para extensões futuras.

### 5.2. API de share, leitura e importação

- `Nome`: Endpoints de compartilhamento e importação
- `Status`: `Concluída`
- `Descrição`: Foram implementados os fluxos `POST /documents/{document_id}/share`, `GET /documents/shared/{token}` e `POST /documents/shared/{token}/import`.
- `Impacto no usuário`: O remetente compartilha o deck atual e o destinatário pode importar uma cópia própria para a biblioteca.
- `Impacto técnico`: O backend ganhou contracts públicos específicos e lógica de clonagem isolada do documento original.

### 5.3. Leitura compartilhada por modo

- `Nome`: Rotas readonly para `study`, `quiz` e `guided`
- `Status`: `Concluída`
- `Descrição`: Foram criadas experiências individuais para os três modos dentro do deck compartilhado.
- `Impacto no usuário`: O destinatário explora o conteúdo como na biblioteca, sem responder, salvar progresso, SRS ou relatórios.
- `Impacto técnico`: A feature reutiliza a base visual do produto com restrição explícita de comportamento.

### 5.4. Hub compartilhado e UX de autenticação

- `Nome`: Hub do deck compartilhado e preservação de `redirect`
- `Status`: `Concluída`
- `Descrição`: Foi criada a página hub do deck compartilhado e o fluxo de auth foi ajustado para voltar corretamente ao link após login comum ou social.
- `Impacto no usuário`: A navegação entre share, login e consumo do conteúdo ficou previsível.
- `Impacto técnico`: Frontend e contexto de autenticação passaram a preservar o destino original do link.

### 5.5. Seleção parcial de páginas de `PDF`

- `Nome`: Filtro avançado por páginas no fluxo de criação
- `Status`: `Concluída`
- `Descrição`: O fluxo passou a permitir informar páginas ou intervalos, com parser backend e processamento parcial real do arquivo.
- `Impacto no usuário`: O usuário consegue gerar conteúdo apenas do trecho relevante do material.
- `Impacto técnico`: Backend e frontend passaram a suportar inspeção prévia, validação de recortes e persistência do filtro aplicado.

### 5.6. Preview visual de páginas de `PDF`

- `Nome`: Pré-visualização visual com seleção manual
- `Status`: `Concluída`
- `Descrição`: O wizard passou a exibir miniaturas e modal expandido das páginas do `PDF`, sincronizados com o filtro textual.
- `Impacto no usuário`: A escolha das páginas ficou mais confiável e menos abstrata.
- `Impacto técnico`: O frontend ganhou um componente dedicado para o picker visual com estados responsivos.

### 5.7. Geração de flashcards mais objetiva

- `Nome`: Refino de concisão nos flashcards gerados
- `Status`: `Concluída`
- `Descrição`: As instruções da IA e a normalização backend foram ajustadas para privilegiar cards com um conceito por vez e respostas curtas.
- `Impacto no usuário`: O resultado ficou mais apropriado para revisão rápida e memorização.
- `Impacto técnico`: Foram adicionados filtros adicionais de qualidade na etapa de normalização.

### 5.8. Feedback pós-sessão com bônus único

- `Nome`: Recompensa única por feedback de estudo
- `Status`: `Concluída`
- `Descrição`: Foi criado um fluxo autenticado para registrar a exibição da oferta, receber a resposta do usuário e liberar `+3 gerações` apenas uma vez.
- `Impacto no usuário`: O usuário recebe incentivo claro para responder ao feedback e vê a barra de gerações ser atualizada imediatamente.
- `Impacto técnico`: Backend, contrato de gerações e sidebar passaram a refletir estado de oferta, bônus e resgate.

### 5.9. Modal contextual de feedback e indicação

- `Nome`: Pós-estudo com feedback, agradecimento e convite de compartilhamento
- `Status`: `Concluída`
- `Descrição`: Os relatórios finais passaram a abrir um modal compartilhado com avaliação, campo condicional de melhoria, etapa de agradecimento e convite para indicar o Flashify.
- `Impacto no usuário`: O pós-estudo ficou mais orientado e consistente entre modos.
- `Impacto técnico`: O frontend ganhou um componente compartilhado e integração com `/api/support/experience`.

### 5.10. Sistema visual do Flashinho nos relatórios

- `Nome`: Expressões do mascote substituindo emojis
- `Status`: `Concluída`
- `Descrição`: Os relatórios e o modal de feedback deixaram de usar emojis e passaram a utilizar assets específicos do Flashinho, com padronização de escala, recorte e posicionamento por expressão.
- `Impacto no usuário`: A experiência ficou mais autoral, coerente com a marca e menos genérica.
- `Impacto técnico`: Foram criados um mapa de variantes do mascote e componentes reutilizáveis para renderização das expressões.

### 5.11. Nova tela de progresso integrada

- `Nome`: Implementação completa da nova experiência de progresso
- `Status`: `Concluída`
- `Descrição`: A rota `/progress` foi reestruturada para operar sobre dados reais do backend, com abas por modo de estudo, resumo semanal, recomendações e ranking.
- `Impacto no usuário`: O usuário passou a ter uma visão clara e contínua da própria evolução, em vez de uma tela estática ou desconectada.
- `Impacto técnico`: Frontend e backend ganharam contratos específicos para período, resumo, tendências, ranking, motivação e atividade diária.

### 5.12. Resumo visual por modo na tela de progresso

- `Nome`: Cards de métrica e atividade contextual por aba
- `Status`: `Concluída`
- `Descrição`: Cada guia da tela de progresso passou a refletir sua própria semântica visual e de dados. A `Visão Geral` mostra todos os modos, enquanto as guias individuais mostram somente o módulo correspondente.
- `Impacto no usuário`: A leitura ficou mais limpa, menos redundante e mais útil para entendimento por contexto.
- `Impacto técnico`: Foram criados componentes dedicados de métrica, gráfico semanal e composição de painéis com variação por aba.

### 5.13. Ranking global com fallback robusto

- `Nome`: Ranking com preview, modal completo e tolerância a timeout
- `Status`: `Concluída`
- `Descrição`: O card de ranking exibe preview da semana e abre um modal com o ranking completo; se o backend demorar, o frontend aborta a requisição e exibe a versão disponível em vez de manter loading infinito.
- `Impacto no usuário`: O botão `Ver ranking completo` deixou de travar visualmente e passou a degradar com segurança.
- `Impacto técnico`: O cliente de API passou a suportar `AbortSignal` e o card ganhou fallback para preview completo ou timeout.

### 5.14. Polimento visual e responsivo da tela de progresso

- `Nome`: Refinos de escala, hierarquia visual e dark mode
- `Status`: `Concluída`
- `Descrição`: A tela recebeu várias rodadas de ajuste de densidade, largura do ranking, navegação mobile, cores por guia, bordas no modo escuro, eliminação de ruído e reorganização da área de gráfico.
- `Impacto no usuário`: A interface ficou menos poluída, mais natural e alinhada com a identidade já consolidada do sistema.
- `Impacto técnico`: Os componentes de progresso passaram a respeitar tokens visuais implícitos do produto, sem alterar variáveis globais consolidadas.

### 5.15. Biblioteca organizada por revisão pendente

- `Nome`: Separação entre decks com pendência e decks regulares
- `Status`: `Concluída`
- `Descrição`: A biblioteca passou a destacar decks com revisões pendentes em uma seção própria e deixar os demais em uma segunda seção.
- `Impacto no usuário`: A priorização de estudo ficou mais evidente logo ao abrir a biblioteca.
- `Impacto técnico`: A listagem raiz passou a ser filtrada, ordenada e repartida dinamicamente antes da renderização.

### 5.16. Busca, ordenação e paginação coerente na biblioteca

- `Nome`: Busca no cabeçalho e ordenação por data ou nome
- `Status`: `Concluída`
- `Descrição`: Foi adicionada busca textual de decks, ordenação por `Mais recentes`, `Mais antigas` e `Nome A-Z`, com paginação posicionada abaixo do conjunto das duas seções.
- `Impacto no usuário`: A biblioteca ficou mais navegável, especialmente para contas com muitos decks.
- `Impacto técnico`: O frontend passou a paginar o conjunto filtrado e ordenado antes de redistribuir o resultado em seções.

### 5.17. Efeitos sonoros globais configuráveis

- `Nome`: Sistema de áudio para microinterações de estudo
- `Status`: `Concluída`
- `Descrição`: Foi criado um provider global de áudio com persistência da preferência do usuário, toggle em configurações e mapeamento centralizado de efeitos.
- `Impacto no usuário`: Flashcards, quiz, estudo guiado, relatórios e recompensa passaram a contar com feedback sonoro opcional.
- `Impacto técnico`: O app deixou de depender de elementos `<audio>` espalhados e passou a usar uma API única de som.

### 5.18. Feedback sonoro positivo e negativo em respostas

- `Nome`: Sons distintos para acerto e erro em perguntas
- `Status`: `Concluída`
- `Descrição`: As respostas corretas passaram a usar `mixkit-correct-answer-tone-2870.wav` e as incorretas `mixkit-wrong-answer-fail-notification-946.wav`.
- `Impacto no usuário`: O quiz e o estudo guiado passaram a comunicar acerto e erro com clareza imediata.
- `Impacto técnico`: O mapeamento de efeitos foi centralizado em `sound-effects.ts`, reaproveitado por quiz e estudo guiado.

## 6. Itens em andamento

Não há itens em andamento incorporados a esta release no momento do fechamento.

## 7. Itens planejados que saem desta release

- evoluções futuras da tela de progresso, como novas distribuições analíticas, devem entrar em release própria
- expansões do sistema de áudio por categoria ou personalização fina devem entrar em release própria
- melhorias de gestão administrativa de links compartilhados permanecem fora desta release

## 8. Correções e ajustes incluídos

### 8.1. Compartilhamento por snapshot

- simplificação do modal de compartilhamento
- inclusão de ícones oficiais de redes no modal
- remoção de explicações redundantes no hub compartilhado
- preservação do `redirect` no login com Google e login comum
- refinamento de responsividade das rotas readonly

### 8.2. Progresso

- remoção de repetição do gráfico semanal entre abas
- adaptação da cor da área de insight e do ícone conforme a guia ativa
- correção de bordas claras residuais no modo escuro
- ampliação do card de ranking global
- remoção de badges pouco úteis como “Novo nesta semana” e equivalentes
- ajuste do espaço morto abaixo do insight da semana
- remoção de loading infinito ao abrir o ranking completo

### 8.3. Biblioteca

- reposicionamento da busca e ordenação no cabeçalho existente
- alinhamento entre barra de busca e seletor
- centralização do ícone de lupa dentro do campo
- reposicionamento da paginação para baixo das duas seções

### 8.4. Relatórios, feedback e mascote

- substituição completa de emojis por expressões do Flashinho
- padronização fina de escala e alinhamento dos assets nas notas `Muito ruim`, `Ruim`, `Ok`, `Boa` e `Amei`
- aumento visual do mascote nos relatórios
- redução do contorno colorido ao redor do mascote para priorizar a própria ilustração

### 8.5. Áudio

- criação de preferências de som no app
- remoção de áudio local espalhado por páginas específicas
- integração dos sons em fluxos compartilhados readonly
- distinção clara entre som positivo, negativo, conclusão e recompensa

## 9. Impacto técnico

### 9.1. Frontend

- áreas afetadas: deck individual, compartilhamento, auth, criação, progresso, biblioteca, relatórios finais, feedback, sidebar, configurações e fluxos compartilhados
- componentes novos relevantes:
  - `front/components/progress/progress-metric-card.tsx`
  - `front/components/progress/progress-next-actions.tsx`
  - `front/components/progress/progress-ranking-card.tsx`
  - `front/components/progress/progress-weekly-activity-card.tsx`
  - `front/components/ui/flashinho-expression.tsx`
  - `front/contexts/sound-context.tsx`
- utilitários novos relevantes:
  - `front/lib/flashinho-expression.ts`
  - `front/lib/sound-effects.ts`
- principais cuidados de implementação:
  - manter compatibilidade com dark mode
  - não alterar variáveis globais consolidadas para evitar regressão em cascata
  - respeitar responsividade mobile sem introduzir barras de rolagem desnecessárias

### 9.2. Backend

- rotas e serviços afetados:
  - compartilhamento de decks por snapshot
  - inspeção e extração parcial de `PDF`
  - feedback de estudo com recompensa
  - agregações e respostas da rota `/progress`
- impacto funcional:
  - a API passou a responder estruturas mais ricas para motivação, ranking, série temporal e recomendações
  - o ranking passou a conviver com fallback frontend para versões parciais

### 9.3. Banco de dados

- migrations envolvidas:
  - `back/alembic/versions/20260520_0011_add_shared_deck_snapshots.py`
  - `back/alembic/versions/20260525_0012_add_document_page_selection.py`
  - `back/alembic/versions/20260530_0014_add_feedback_reward_fields_to_user.py`
- impacto esperado:
  - persistência de snapshots compartilhadas
  - persistência do filtro bruto de páginas em `Document`
  - persistência do estado de recompensa única de feedback

### 9.4. Dependências, assets e contratos

- contratos frontend/backend ampliados para progresso e ranking
- integração de assets do mascote em `front/public/flashinho_relat/`
- integração de assets de som em `front/public/sounds/`
- reaproveitamento de `react-confetti` em relatórios e recompensa

## 10. QA e validação

### 10.1. Cenários obrigatórios

- [x] validar fluxo principal no desktop
- [x] validar fluxo principal no mobile
- [x] validar estados vazios e estados de erro relevantes
- [x] validar regressão nas áreas adjacentes por tipagem e integração local

### 10.2. Casos específicos desta release

- [x] compartilhar um deck com flashcards, quiz e estudo guiado já materializado
- [x] abrir o link compartilhado e retornar corretamente após login
- [x] navegar pelos fluxos compartilhados sem registrar progresso
- [x] importar o deck compartilhado para a biblioteca
- [x] validar upload de `PDF` com seleção simples e com intervalo
- [x] validar preview visual de páginas do `PDF`
- [x] validar que `DOCX`, `PPTX` e imagens mantêm o fluxo atual sem passo extra
- [x] validar que novos flashcards gerados estão mais curtos e objetivos
- [x] validar abertura do modal de feedback ao fim de `flashcards`, `quiz` e `guided`
- [x] validar que a recompensa de `+3 gerações` só é concedida após envio válido
- [x] validar exibição do modal de indicação pela sidebar
- [x] validar a nova tela de progresso nas abas `Visão Geral`, `Flashcards`, `Quizzes` e `Estudo Guiado`
- [x] validar gráfico semanal agregado na visão geral e gráfico específico nas abas individuais
- [x] validar ranking global no modo escuro
- [x] validar fallback quando o ranking completo demora demais para responder
- [x] validar busca e ordenação na biblioteca
- [x] validar paginação abaixo das duas seções da biblioteca
- [x] validar uso do Flashinho no feedback e nos relatórios
- [x] validar sons de acerto, erro, conclusão e recompensa com toggle ligado e desligado
- [x] validar `npx tsc --noEmit` após as mudanças mais recentes do frontend

## 11. Deploy

### 11.1. Pré-requisitos

- [x] migrations aplicadas
- [x] backend atualizado com novas rotas e agregações
- [x] frontend rebuildado com progresso, biblioteca, feedback, mascote e áudio
- [x] assets de mascote e sons presentes no ambiente

### 11.2. Passos de deploy

1. aplicar as migrations pendentes do backend
2. subir backend com rotas de share, feedback, geração parcial de `PDF` e progresso
3. rebuildar o frontend com as rotas compartilhadas, a tela de progresso, a biblioteca atualizada e o provider de áudio
4. validar um fluxo real de criação, estudo, feedback e progresso
5. validar o comportamento do ranking, da biblioteca e do toggle de sons em ambiente final

## 12. Rollback

- `Aplicação`: preferir rollback por frente de trabalho, revertendo separadamente compartilhamento, `PDF`, feedback, progresso ou áudio
- `Banco de dados`: reverter migrations apenas se o rollback realmente exigir desfazer persistência de snapshots, filtro de páginas ou campos de feedback
- `Risco do rollback`: médio, pois pode invalidar snapshots criadas, remover metadados de recorte de `PDF` ou afetar estado de recompensa já concedida

## 13. Riscos e pontos de atenção

- mudanças futuras no schema do deck exigirão cuidado com retrocompatibilidade das snapshots
- a rota de progresso depende de agregações que devem continuar estáveis conforme o volume de uso crescer
- o ranking global exige monitoramento de performance em produção
- assets do mascote e sons devem estar presentes em todos os ambientes para evitar regressões visuais ou de mídia
- o sistema de áudio deve continuar opcional e discreto para não degradar UX em contextos silenciosos

## 14. Critérios para fechamento da release

- [x] todas as funcionalidades previstas foram entregues
- [x] checklist principal de QA foi concluído
- [x] riscos bloqueantes foram resolvidos ou formalmente aceitos
- [x] documentação final foi atualizada
- [x] release está pronta para deploy

## 15. Evidências e referências

- template de release: [docs/releases/_template-release.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/docs/releases/_template-release.md:1)
- documentação funcional do progresso:
  - [docs/especificacao-tela-progresso-flashify.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/docs/especificacao-tela-progresso-flashify.md:1)
  - [docs/flashify-resumo-visual-e-tela-de-progresso.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/docs/flashify-resumo-visual-e-tela-de-progresso.md:1)
- arquivos backend principais:
  - [back/app/routers/documents.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/routers/documents.py:1)
  - [back/app/routers/progress.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/routers/progress.py:1)
  - [back/app/text_extractor.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/text_extractor.py:1)
  - [back/app/tasks.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/tasks.py:1)
- arquivos frontend principais:
  - [front/app/(app)/progress/page.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/progress/page.tsx:1)
  - [front/app/(app)/library/page.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/library/page.tsx:1)
  - [front/components/progress/progress-ranking-card.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/progress/progress-ranking-card.tsx:1)
  - [front/components/progress/progress-weekly-activity-card.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/progress/progress-weekly-activity-card.tsx:1)
  - [front/components/feedback/study-session-feedback-modal.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/feedback/study-session-feedback-modal.tsx:1)
  - [front/components/study/performance-report.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/study/performance-report.tsx:1)
  - [front/components/study/guided-study-report.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/study/guided-study-report.tsx:1)
  - [front/components/quiz/quiz-performance-report.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/quiz/quiz-performance-report.tsx:1)
  - [front/components/ui/flashinho-expression.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/ui/flashinho-expression.tsx:1)
  - [front/lib/flashinho-expression.ts](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/lib/flashinho-expression.ts:1)
  - [front/contexts/sound-context.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/contexts/sound-context.tsx:1)
  - [front/lib/sound-effects.ts](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/lib/sound-effects.ts:1)

## 16. Histórico de atualização

### 2026-05-20

- abertura da release em construção para compartilhamento de decks por snapshot
- consolidação do escopo inicial de backend, frontend, importação e autenticação

### 2026-05-25

- inclusão da frente de filtros avançados de `PDF` e seleção de páginas no escopo da release

### 2026-06-01

- inclusão da frente de feedback pós-sessão com recompensa única e indicação do Flashify

### 2026-06-21

- inclusão da nova tela de progresso integrada ao backend, com ranking, recomendações e visão por modo
- inclusão da reorganização da biblioteca com busca, ordenação, seções por revisão pendente e paginação revisada
- substituição de emojis por expressões do Flashinho em feedback e relatórios
- inclusão do sistema global de efeitos sonoros com toggle em configurações
- fechamento formal da release com documentação consolidada
