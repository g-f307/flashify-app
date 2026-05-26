# Release em aberto: compartilhamento de decks por snapshot

## 1. Identificação

- `Título da release`: Compartilhamento de decks por snapshot
- `Slug`: `compartilhamento-decks-por-snapshot`
- `Status`: `Em construcao`
- `Data de abertura`: `2026-05-20`
- `Data prevista para fechamento`: `2026-05-21`
- `Responsável`: `Equipe Flashify`

## 2. Visão geral

Esta release em construção tem como frente principal o compartilhamento de decks por snapshot congelada, permitindo que um usuário publique o estado atual de um deck e compartilhe esse material com outras pessoas sem expor o deck vivo da própria biblioteca. O destinatário acessa uma experiência de leitura do deck compartilhado, pode explorar flashcards, quiz e estudo guiado em fluxos individuais e, se desejar, importar uma cópia independente para sua própria biblioteca.

Em paralelo, a release também passou a concentrar uma segunda frente independente, voltada ao fluxo de criação de decks e à qualidade do estudo, incluindo filtros avançados para `PDF`, refinamento da geração de flashcards e pequenos polimentos de UI. Essa frente não depende do compartilhamento por snapshot e não deve ser interpretada como subfuncionalidade dele.

## 3. Objetivo

### 3.1. Objetivo principal da release

- permitir compartilhamento seguro de decks sem acoplar o link ao deck vivo do remetente
- preservar o estado do deck no momento do clique em `Compartilhar`
- oferecer ao destinatário uma experiência de visualização consistente com a biblioteca
- permitir importação para a biblioteca do destinatário sem afetar o deck do remetente
- manter a feature preparada para crescimento futuro do deck, incluindo estudo guiado e outras expansões

### 3.2. Frente paralela também incluída nesta release

- permitir seleção de páginas de `PDF` antes da geração de conteúdo
- melhorar a qualidade dos flashcards para revisão rápida e memorização
- aplicar correções visuais pontuais em fluxos de criação e estudo

## 4. Escopo da release

### 4.1. Entradas confirmadas

#### 4.1.1. Frente principal: compartilhamento por snapshot

- backend para criação, leitura e importação de snapshots compartilhadas
- migration de banco para persistência de snapshots compartilhadas
- contratos públicos específicos para decks compartilhados
- página hub do deck compartilhado com CTA de importação
- experiências readonly dedicadas para `study`, `quiz` e `guided`
- ajustes de UX e responsividade na navegação do deck compartilhado
- fluxo de autenticação preservando `redirect` para links compartilhados
- modal de compartilhamento com ações de compartilhar e `Copiar link`
- documentação de planejamento funcional e técnico da feature

#### 4.1.2. Frente paralela: criação e qualidade de estudo

- filtros avançados para `PDF` no fluxo de criação de decks, com seleção de páginas antes da geração
- refinamento da geração de flashcards para respostas mais curtas e objetivas
- ajustes visuais pontuais no `/create` e no relatório final de estudo

### 4.2. Fora de escopo

- compartilhamento do deck vivo com atualização em tempo real
- revogação manual ou gestão de múltiplos links pelo remetente
- compartilhamento via Instagram
- coleta de estatísticas, feedback de respostas ou SRS dentro do modo compartilhado
- visualização pública sem autenticação
- filtros equivalentes para `DOCX`, `PPTX` ou imagens nesta release

## 5. Funcionalidades concluídas

### 5.1. Snapshot compartilhada no backend

- `Nome`: Persistência de deck compartilhado congelado
- `Status`: `Concluída`
- `Descrição`: Foi criado um modelo dedicado para snapshots compartilhadas, com token próprio e serialização do estado do deck no momento do compartilhamento.
- `Impacto no usuário`: O link representa uma cópia congelada do deck, sem ser alterado por edições futuras no deck do remetente.
- `Impacto técnico`: O backend agora persiste snapshots com `flashcards`, `quiz`, `guided_study` e estrutura pronta para features futuras.

### 5.2. Endpoints de compartilhamento e importação

- `Nome`: API para compartilhar, visualizar e importar deck compartilhado
- `Status`: `Concluída`
- `Descrição`: Foram implementados os fluxos `POST /documents/{document_id}/share`, `GET /documents/shared/{token}` e `POST /documents/shared/{token}/import`.
- `Impacto no usuário`: O remetente consegue compartilhar o deck atual e o destinatário pode importar uma cópia própria para a biblioteca.
- `Impacto técnico`: O backend passou a trabalhar com schemas públicos específicos e lógica de clonagem isolada do documento original.

### 5.3. Suporte a estudo guiado no compartilhamento

- `Nome`: Snapshot compatível com estudo guiado
- `Status`: `Concluída`
- `Descrição`: O compartilhamento inclui `guided_study` quando o `guided_study_cache` já existir no deck no momento do share.
- `Impacto no usuário`: O destinatário consegue visualizar a trilha guiada do deck compartilhado quando ela já tiver sido materializada pelo remetente.
- `Impacto técnico`: A serialização e restauração do estudo guiado respeitam a snapshot sem copiar progresso, relatórios ou sessões do remetente.

### 5.4. Hub de deck compartilhado no frontend

- `Nome`: Página principal do deck compartilhado
- `Status`: `Concluída`
- `Descrição`: Foi criada a rota `shared/[token]` com apresentação do deck, badge de `somente leitura`, visão geral do snapshot e CTA de importação para a biblioteca.
- `Impacto no usuário`: O destinatário entende rapidamente que está vendo um deck compartilhado e pode decidir se quer manter uma cópia.
- `Impacto técnico`: O frontend passou a consumir contratos públicos do deck compartilhado e separar a feature em componentes específicos.

### 5.5. Experiências readonly por modo de estudo

- `Nome`: Rotas dedicadas para flashcards, quiz e estudo guiado compartilhados
- `Status`: `Concluída`
- `Descrição`: Foram criadas experiências individuais para `shared/[token]/study`, `shared/[token]/quiz` e `shared/[token]/guided`, replicando o fluxo normal de estudo em modo somente leitura.
- `Impacto no usuário`: O destinatário explora o conteúdo como faria na biblioteca, mas sem responder, registrar progresso, usar SRS ou gerar relatórios.
- `Impacto técnico`: A feature reutiliza estruturas visuais do produto, com adaptações de estado e hierarquia de cor por modo.

### 5.6. Ajustes de UX, responsividade e hierarquia visual

- `Nome`: Refinos visuais do deck compartilhado
- `Status`: `Concluída`
- `Descrição`: Foram feitos vários refinamentos de ordem, responsividade, centralização, altura de cards, hierarquia de cores, dark mode e posicionamento de elementos-chave no hub e nas páginas individuais de estudo.
- `Impacto no usuário`: A navegação ficou mais previsível em desktop e mobile, com melhor leitura e coerência visual com o restante do produto.
- `Impacto técnico`: Houve ajustes em layout, estilos globais, glow contextual e organização de componentes sem concentrar toda a lógica num único arquivo.

### 5.7. Fluxo de compartilhamento e autenticação

- `Nome`: Modal de compartilhamento e preservação de redirect
- `Status`: `Concluída`
- `Descrição`: O botão de compartilhar foi movido para junto do título do deck, o modal passou a abrir opções de compartilhamento diretamente e o login com Google passou a preservar corretamente o `redirect` para links compartilhados.
- `Impacto no usuário`: O fluxo de compartilhar e retornar ao deck compartilhado após cadastro/login ficou mais fluido e previsível.
- `Impacto técnico`: O frontend ajustou o `AuthContext`, formulários, páginas de auth e botão de login social para manter o destino original.

### 5.8. Frente paralela: filtros avançados de PDF no fluxo de criação

- `Nome`: Seleção de páginas para extração parcial de PDF
- `Status`: `Concluída`
- `Descrição`: Em uma frente paralela ao compartilhamento, foi implementado um fluxo completo de inspeção de `PDF`, com endpoint dedicado, parser de seleção de páginas, persistência do filtro no `Document`, extração parcial no backend e passo condicional no wizard para escolha das páginas antes da geração.
- `Impacto no usuário`: O usuário pode limitar a geração de flashcards e quiz apenas às páginas relevantes do arquivo, evitando ruído e melhorando a qualidade do material gerado.
- `Impacto técnico`: O sistema agora suporta inspeção prévia de `PDF`, validação de intervalos como `1,2,5-8`, processamento assíncrono respeitando o recorte escolhido e contratos de API específicos para esse fluxo.

### 5.9. Frente paralela: pré-visualização visual de páginas de PDF

- `Nome`: Preview visual e seleção manual de páginas
- `Status`: `Concluída`
- `Descrição`: O wizard passou a exibir visualização das páginas do `PDF`, com seleção manual, expansão da página em modal e sincronização com o filtro textual.
- `Impacto no usuário`: A escolha das páginas deixou de depender apenas do número da página, aproximando a experiência de um preview de impressão e dando mais confiança antes da geração.
- `Impacto técnico`: O frontend ganhou um componente dedicado para visualização e seleção de páginas, com estados de carregamento, inspeção ampliada e comportamento responsivo para desktop e mobile.

### 5.10. Frente paralela: refino na concisão dos flashcards gerados

- `Nome`: Respostas mais curtas e cards mais objetivos
- `Status`: `Concluída`
- `Descrição`: As instruções da IA e a normalização backend foram ajustadas para privilegiar cards com um conceito por vez, respostas curtas e rejeição de flashcards longos demais ou com múltiplas perguntas no mesmo item.
- `Impacto no usuário`: Os flashcards ficaram mais alinhados com revisão rápida e memorização, reduzindo respostas excessivamente longas e complexas.
- `Impacto técnico`: O backend passou a aplicar limites de concisão por dificuldade e filtros adicionais de qualidade na etapa de normalização dos flashcards.

### 5.11. Frente paralela: ajustes visuais complementares no estudo e criação

- `Nome`: Polimentos de UI no relatório e no cabeçalho da criação
- `Status`: `Concluída`
- `Descrição`: Foram aplicados ajustes visuais no relatório final de estudo e no bloco de gerações da tela `/create`, incluindo a correção do tom do gráfico circular e a integração do status de gerações no cabeçalho da seção inicial do wizard.
- `Impacto no usuário`: A interface ficou mais coerente visualmente e com menor ruído, especialmente na etapa inicial de criação de decks.
- `Impacto técnico`: Houve refinamento pontual de componentes de UI sem alterar contratos de API nem comportamento de negócio.

## 6. Itens em andamento

### 6.1. Validação final da rota compartilhada

- `Nome`: QA ponta a ponta do fluxo de compartilhamento
- `Status`: `Em andamento`
- `Descrição atual`: A implementação está pronta, mas ainda depende de validação manual completa em ambiente rodando com backend e frontend integrados.
- `Dependências`: migration aplicada, build local funcional e cenário com decks reais contendo flashcards, quiz e estudo guiado
- `Risco atual`: comportamento residual de UX ou de contrato em estados de erro só aparecer durante teste ponta a ponta

## 7. Itens planejados

### 7.1. Fechamento da validação de erros e estados extremos

- `Nome`: Consolidação de estados de erro do deck compartilhado
- `Status`: `Planejado`
- `Descrição esperada`: Revisar o tratamento de `token` inválido, expirado ou ausente para garantir mensagens e navegação coerentes em todos os fluxos.
- `Criterio de entrada na release`: validação manual confirmar que não há lacunas relevantes de UX em estados de erro

## 8. Correções e ajustes incluídos

### 8.1. Frente principal: compartilhamento por snapshot

- migração do botão `Compartilhar` para junto do título do deck
- simplificação do modal de compartilhamento, removendo foco em `gerar link` e mantendo ações de share + `Copiar link`
- inclusão de ícones oficiais de `WhatsApp`, `Facebook` e `X` no modal
- remoção de blocos redundantes de explicação no modal e no hub do deck compartilhado
- ajuste da ordem mobile para colocar `Visão Geral` antes dos cards individuais de estudo
- centralização, reposicionamento e redimensionamento de cards compartilhados para caber melhor em viewport desktop e mobile
- correção do glow amarelo no estudo guiado readonly, substituído por hover verde
- remoção de barras de ação duplicadas no estudo guiado com flashcards
- padronização de botões azuis no quiz e verdes no estudo guiado
- correção do fluxo de login com Google, preservando `redirect` para o link compartilhado

### 8.2. Frente paralela: criação e qualidade de estudo

- definição e implementação do escopo da seleção de páginas limitada a `PDF`, evitando ampliar a complexidade para `DOCX` e `PPTX`
- criação de endpoint de inspeção de `PDF` com metadados e previews de páginas
- inclusão de etapa condicional no wizard para seleção manual e textual de páginas do `PDF`
- adição de preview visual de páginas com expansão em modal e refinamentos responsivos para mobile
- persistência do filtro bruto de páginas no `Document` para rastreabilidade do processamento
- refinamento da geração de flashcards para respostas mais curtas, mais objetivas e com foco em memorização rápida
- correção do tom do anel de progresso no relatório de estudo, substituindo o azul residual por amarelo suave

## 9. Impacto técnico

### 9.1. Frontend

- componentes afetados na frente principal: página do deck individual, layout autenticado, auth forms, contexto de autenticação, cliente de API, estilos globais, modal de share e nova árvore de rotas `shared/[token]`
- componentes novos: `share-deck-modal`, `import-shared-deck-button`, páginas `shared/[token]`, `shared/[token]/study`, `shared/[token]/quiz` e `shared/[token]/guided`
- componentes afetados na frente paralela: `creation-wizard`, indicador de gerações, relatório final de estudo e componente de seleção visual de páginas de `PDF`
- componentes novos adicionais: `pdf-page-picker`
- riscos principais: regressão visual em breakpoints menores, inconsistência entre modos de estudo, UX incompleta em estados de erro e comportamento visual do picker de `PDF` em diferentes viewports
- cuidados de responsividade: manter visão geral acima dos cards no mobile, preservar legibilidade, evitar controles fora da viewport e respeitar claro/escuro
- impacto implementado adicional: `creation-wizard` passou a ter passo condicional para `PDF`, exigindo preservação do fluxo atual de `DOCX`, `PPTX` e imagens

### 9.2. Backend

- serviços ou rotas afetadas na frente principal: modelos de documentos, CRUD de compartilhamento, schemas públicos, router de documentos e analytics de compartilhamento
- serviços ou rotas afetadas na frente paralela: extração de texto, task assíncrona de processamento, parser de seleção de páginas de `PDF`, geração de flashcards e trechos adicionais do router de documentos
- impactos de compatibilidade: nenhuma rota legada foi removida; a feature entra como capacidade adicional
- observação funcional: a snapshot não copia progresso, sessões, relatórios ou estado SRS do remetente
- impacto implementado adicional: `documents.py`, `tasks.py` e `text_extractor.py` agora suportam inspeção e extração parcial de `PDF`

### 9.3. Banco de dados

- migrations envolvidas na frente principal: `back/alembic/versions/20260520_0011_add_shared_deck_snapshots.py`
- migrations envolvidas na frente paralela: `back/alembic/versions/20260525_0012_add_document_page_selection.py`
- impacto esperado: criação da persistência de snapshots compartilhadas com payload serializado do deck e, em frente independente, persistência do filtro bruto de páginas aplicado ao `PDF`
- cuidados de rollback: rollback deve considerar perda dos registros de snapshots compartilhadas criadas após o deploy

### 9.4. Dependências

- novas dependências: visualização de `PDF` no frontend exigiu integração adicional para renderização de páginas no wizard
- dependências alteradas: frontend passou a incluir suporte ao fluxo de preview visual de `PDF`; validar consistência entre `npm` e `pnpm` no ambiente de build

## 10. QA e validação

### 10.1. Cenários obrigatórios

- [ ] validar fluxo principal no desktop
- [ ] validar fluxo principal no mobile
- [ ] validar estados vazios e estados de erro
- [ ] validar regressão nas áreas adjacentes

### 10.2. Casos específicos desta release

- [ ] compartilhar um deck com flashcards, quiz e estudo guiado já materializado
- [ ] abrir o link compartilhado, autenticar com login comum e retornar corretamente ao deck
- [ ] abrir o link compartilhado, autenticar com Google e retornar corretamente ao deck
- [ ] navegar pelos flashcards compartilhados sem registrar progresso ou feedback
- [ ] navegar pelo quiz compartilhado sem responder nem revelar correção
- [ ] navegar pelo estudo guiado compartilhado com flashcards e perguntas em modo readonly
- [ ] importar o deck compartilhado para a biblioteca e confirmar criação de cópia independente
- [ ] validar que alterações na cópia importada não afetam o deck original do remetente
- [ ] validar visual do modal de compartilhar em desktop e mobile
- [ ] validar a ordem mobile do hub compartilhado e o comportamento em modo escuro
- [ ] validar token inválido, deck sem quiz, deck sem guided study e deck sem flashcards
- [ ] validar upload de `PDF` com seleção simples de páginas, como `1,2,3`
- [ ] validar upload de `PDF` com intervalo de páginas, como `1-5`
- [ ] validar rejeição de filtro inválido ou página fora do total do documento
- [ ] validar preview visual de páginas do `PDF`, incluindo seleção manual e modal expandido
- [ ] validar comportamento do picker de `PDF` no mobile, incluindo centralização e densidade da UI
- [ ] validar que `DOCX`, `PPTX` e imagens mantêm o fluxo atual sem passo extra
- [ ] validar que a linha de gerações na etapa inicial de criação não quebra em mais de uma linha no desktop
- [ ] validar que novos flashcards gerados estão mais curtos e objetivos do que a versão anterior

## 11. Deploy

### 11.1. Pré-requisitos

- [ ] migrations aplicadas
- [ ] backend reiniciado com novas rotas
- [ ] frontend rebuildado com as rotas compartilhadas e o picker visual de `PDF`
- [ ] ambiente revisado com dados de teste para share/import e upload de `PDF`

### 11.2. Passos de deploy

#### 11.2.1. Frente principal: compartilhamento por snapshot

1. aplicar a migration de snapshots compartilhadas no banco
2. subir o backend com os novos endpoints de share, leitura e importação
3. rebuildar o frontend com o modal de share e as novas rotas `shared/[token]`
4. criar um deck real, compartilhar, abrir o link e testar importação para a biblioteca
5. validar os modos `study`, `quiz` e `guided` do deck compartilhado em desktop e mobile

#### 11.2.2. Frente paralela: criação e qualidade de estudo

1. aplicar a migration de persistência de filtro de páginas em `Document`
2. subir o backend com o endpoint de inspeção de `PDF` e o processamento parcial por páginas
3. rebuildar o frontend com o picker visual de `PDF` e os ajustes do wizard
4. validar upload de `PDF` com seleção de páginas, preview visual e geração parcial de conteúdo
5. validar a nova qualidade dos flashcards gerados e os polimentos visuais associados

## 12. Rollback

- `Aplicação`: preferir rollback por frente de trabalho, revertendo separadamente os commits de compartilhamento por snapshot ou os commits da frente de criação e `PDF`
- `Banco de dados`: reverter a migration de snapshots compartilhadas e a migration de filtro de páginas apenas se o rollback realmente precisar desfazer essas frentes
- `Risco do rollback`: médio, porque qualquer rollback de banco pode invalidar snapshots geradas ou remover persistência de filtros aplicados a `PDF`

## 13. Riscos e pontos de atenção

- a detecção de erro para `token` inválido no frontend ainda merece validação manual para garantir UX consistente
- a feature depende de dados serializados; futuras mudanças de schema do deck exigirão cuidado com retrocompatibilidade de snapshots
- a decisão de exigir autenticação para visualizar o link aumenta a sensibilidade do fluxo de `redirect`
- decks compartilhados sem `guided_study_cache` não exibem estudo guiado até que o destinatário importe e gere a própria cópia
- o fluxo visual de seleção de páginas de `PDF` depende de validação manual cuidadosa em mobile e desktop para evitar desalinhamentos sutis
- a integração de preview de `PDF` no frontend merece atenção em ambiente de build para garantir consistência entre gerenciadores de pacote e estratégia de carregamento do visualizador

## 14. Critérios para fechamento da release

- [ ] todas as funcionalidades previstas foram entregues
- [ ] checklist de QA foi concluído
- [ ] riscos bloqueantes foram resolvidos
- [ ] documentação final foi atualizada
- [ ] release está pronta para deploy

## 15. Evidências e referências

- documento funcional: [plano_implementacao_flashify.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/plano_implementacao_flashify.md:1)
- plano técnico da fase 6: [docs/plano_fase_6_filtros_avancados_pdf.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/docs/plano_fase_6_filtros_avancados_pdf.md:1)
- template de release: [docs/releases/_template-release.md](/home/gf307/Documentos/ifam/dra_gps/flashify-app/docs/releases/_template-release.md:1)
- arquivos principais do backend:
  - [models.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/models.py:1)
  - [crud.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/crud.py:1)
  - [schemas.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/schemas.py:1)
  - [documents.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/routers/documents.py:1)
  - [20260520_0011_add_shared_deck_snapshots.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/alembic/versions/20260520_0011_add_shared_deck_snapshots.py:1)
  - [20260525_0012_add_document_page_selection.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/alembic/versions/20260525_0012_add_document_page_selection.py:1)
  - [text_extractor.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/text_extractor.py:1)
  - [tasks.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/tasks.py:1)
  - [pdf_page_selection.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/pdf_page_selection.py:1)
  - [ai_generator.py](/home/gf307/Documentos/ifam/dra_gps/flashify-app/back/app/ai_generator.py:1)
- arquivos principais do frontend:
  - [deck page](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/deck/[id]/page.tsx:1)
  - [shared hub](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/shared/[token]/page.tsx:1)
  - [shared study](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/shared/[token]/study/page.tsx:1)
  - [shared quiz](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/shared/[token]/quiz/page.tsx:1)
  - [shared guided](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/app/(app)/shared/[token]/guided/page.tsx:1)
  - [share-deck-modal.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/deck/share-deck-modal.tsx:1)
  - [google-login-button.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/auth/google-login-button.tsx:1)
  - [creation-wizard.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/creation-wizard.tsx:1)
  - [pdf-page-picker.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/upload/pdf-page-picker.tsx:1)
  - [generation-limit-alert.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/generation-limit-alert.tsx:1)
  - [performance-report.tsx](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/components/study/performance-report.tsx:1)
  - [api.ts](/home/gf307/Documentos/ifam/dra_gps/flashify-app/front/lib/api.ts:1)

## 16. Histórico de atualização

### 2026-05-20

- abertura da release em construção para compartilhamento de decks por snapshot
- consolidação do escopo de backend, frontend, UX, importação e autenticação
- registro dos itens já entregues e do checklist pendente para fechamento

### 2026-05-25

- adição do planejamento da fase 6 de filtros avançados de `PDF` ao escopo da release em aberto
- inclusão de referência ao plano técnico detalhado da funcionalidade
