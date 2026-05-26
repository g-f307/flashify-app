# Plano Tecnico - Fase 6: Filtros Avancados de PDF

## 1. Objetivo

Implementar filtros avancados para arquivos `PDF` no fluxo de criacao de decks, permitindo que o usuario escolha quais paginas devem ser consideradas na extracao de texto e na geracao de flashcards e quiz.

O escopo desta fase sera limitado a `PDF`. Arquivos `DOCX`, `PPTX` e imagens manterao o comportamento atual.

## 2. Resultado esperado

- usuario consegue enviar um PDF e escolher paginas especificas antes da criacao do deck
- sistema aceita selecoes como `1,2,5-8`
- backend valida a selecao e extrai texto apenas das paginas escolhidas
- filtro aplicado fica persistido no `Document`
- fluxo atual continua funcionando para outros tipos de arquivo

## 3. Premissas e decisoes

- a feature sera exclusiva para `PDF`
- a selecao de paginas sera 1-indexada na interface e no contrato de API
- a validacao real acontecera no backend, mesmo com validacoes no frontend
- o processamento assincrono com Celery sera mantido
- o preview de paginas sera um passo extra apenas para PDFs
- o filtro sera persistido no banco para rastreabilidade e possivel reprocessamento futuro

## 4. Fora de escopo

- filtros equivalentes para `DOCX`, `PPTX` ou imagens
- OCR de paginas escaneadas sem texto
- selecao visual por thumbnail renderizada de todas as paginas
- edicao posterior do filtro apos o deck ja ter sido criado
- reprocessamento automatico de decks antigos

## 5. Desenho funcional

## 5.1. Fluxo do usuario

1. usuario informa nome do deck
2. usuario escolhe `Upload de Arquivo`
3. se o arquivo nao for PDF, o fluxo segue como hoje
4. se o arquivo for PDF, o frontend chama um endpoint de inspecao
5. sistema retorna metadados do PDF, incluindo total de paginas
6. wizard exibe um passo extra para selecao de paginas
7. usuario informa um filtro como `1,2,5-8` ou escolhe usar todas as paginas
8. upload final do documento envia o filtro selecionado
9. task assincrona processa apenas as paginas escolhidas

## 5.2. Regras de negocio

- selecao vazia significa `todas as paginas`
- paginas repetidas devem ser deduplicadas
- intervalos devem ser expandidos e ordenados
- paginas fora do total do PDF devem gerar erro claro
- intervalos invertidos como `8-5` devem ser rejeitados
- se nenhuma pagina valida restar apos o parse, o request deve falhar
- se as paginas escolhidas nao produzirem texto extraivel, o documento deve falhar com mensagem orientativa

## 6. Desenho tecnico

## 6.1. Backend

### 6.1.1. Modelo de dados

Arquivo principal: `back/app/models.py`

Adicionar ao `Document` campos para persistir o filtro aplicado:

- `page_selection_raw: Optional[str]`
- `page_selection_pages: list[int] | JSON | equivalente compativel com o modelo atual`

Recomendacao:
- persistir `page_selection_raw` para auditoria e debug
- persistir tambem uma representacao normalizada para uso interno, se isso simplificar reprocessamento

Observacao:
- como o projeto usa `SQLModel` com PostgreSQL em outras partes, o formato final deve ser escolhido para reduzir complexidade de migration e leitura
- se houver duvida, comecar apenas com `page_selection_raw` e normalizar em tempo de processamento

### 6.1.2. Migration Alembic

Criar migration dedicada para os novos campos do `Document`.

Checklist:
- adicionar colunas sem quebrar dados existentes
- garantir `nullable=True`
- revisar comportamento de rollback

### 6.1.3. Parser de selecao de paginas

Criar helper isolado, por exemplo:

- `back/app/pdf_page_selection.py`

Responsabilidades:
- receber string como `1,2,5-8`
- validar formato
- expandir intervalos
- deduplicar paginas
- ordenar paginas
- retornar lista final de inteiros
- levantar erro de dominio com mensagem clara em caso invalido

Casos que devem ser tratados:
- `None`
- string vazia
- espacos extras
- `1, 2, 3`
- `1-3,7,9-11`
- `0`
- `-1`
- `3-3`
- `8-5`
- `1,,2`
- `abc`

### 6.1.4. Inspecao de PDF

Arquivo principal: `back/app/routers/documents.py`

Adicionar endpoint dedicado, separado do upload final, por exemplo:

- `POST /documents/pdf/inspect`

Responsabilidades:
- validar que o arquivo e PDF
- abrir o PDF com `pdfplumber`
- retornar pelo menos:
  - nome do arquivo
  - total de paginas
  - opcionalmente, uma amostra curta de texto por pagina para apoiar UX futura

Recomendacao:
- nesta primeira entrega, retornar apenas metadados minimos
- manter o contrato simples para nao travar o frontend

### 6.1.5. Extracao parcial de PDF

Arquivo principal: `back/app/text_extractor.py`

Evoluir:

- `extract_text_from_pdf(file_path: str, pages: list[int] | None = None) -> str`

Boas praticas:
- manter comportamento atual quando `pages is None`
- ignorar logica de parse aqui; receber lista pronta do helper
- preservar ordem natural das paginas
- nao mascarar erro silenciosamente quando uma pagina solicitada nao existir

### 6.1.6. Atualizacao do upload final

Arquivo principal: `back/app/routers/documents.py`

Atualizar `POST /documents/upload` para aceitar:

- `page_selection: Optional[str] = Form(default=None)`

Responsabilidades no endpoint:
- aceitar o campo apenas como dado bruto
- se o arquivo nao for PDF, ignorar o campo ou rejeitar com mensagem clara
- persistir o filtro no `Document`
- nao fazer parse complexo no router; usar helper dedicado

### 6.1.7. Processamento assincrono

Arquivo principal: `back/app/tasks.py`

Atualizar `process_document` para:
- recuperar o `Document`
- verificar se ha `page_selection_raw`
- parsear a selecao antes da extracao
- chamar `extract_text_from_file` ou `extract_text_from_pdf` com o recorte correto

Recomendacao:
- nao espalhar regra de PDF dentro da task inteira
- introduzir um ponto unico de decisao para extracao por tipo de arquivo

Opcao de melhoria:
- evoluir `extract_text_from_file` para aceitar argumentos opcionais especificos, mantendo a interface centralizada

### 6.1.8. Contratos e schemas

Arquivo principal: `back/app/schemas.py`

Adicionar schemas para:
- resposta de inspecao de PDF
- possivel objeto de erro validavel, se o projeto ja seguir esse padrao em outros endpoints

## 6.2. Frontend

### 6.2.1. Cliente de API

Arquivo principal: `front/lib/api.ts`

Adicionar:
- tipo para resposta de inspecao de PDF
- metodo `inspectPdf(...)`
- suporte a `pageSelection` em `uploadDocument(...)`

### 6.2.2. Wizard de criacao

Arquivo principal: `front/components/creation-wizard.tsx`

Refatorar o wizard para suportar passo condicional:

- fluxo atual:
  - `Nome`
  - `Conteudo`
  - `Customizar`

- fluxo novo para PDF:
  - `Nome`
  - `Conteudo`
  - `Paginas do PDF`
  - `Customizar`

Recomendacao:
- parar de depender de lista fixa de passos
- gerar steps dinamicamente com base no estado do arquivo selecionado

### 6.2.3. Estado de formulario

Adicionar ao estado do wizard:
- flag `isPdfUpload`
- metadados do PDF inspecionado
- `pageSelection`
- estado de carregamento da inspecao
- erros de validacao do filtro

### 6.2.4. UX do passo de paginas

O passo deve exibir:
- total de paginas do PDF
- instrucao curta com exemplos validos
- campo de texto para filtro manual
- opcao explicita de usar todas as paginas

Exemplos de ajuda:
- `1,2,3`
- `1-5`
- `1,3,7-10`

Regras de UX:
- nao tentar validar tudo apenas no submit final
- validar formato basico no frontend para feedback rapido
- manter backend como fonte da verdade

### 6.2.5. Comportamento para outros formatos

- se o arquivo nao for PDF, o passo extra nao aparece
- `DOCX`, `PPTX`, `PNG` e `JPG` continuam no fluxo atual
- `pageSelection` nao deve ser enviado para formatos nao PDF

## 6.3. Testes

### 6.3.1. Backend

Prioridade alta:
- testes unitarios do parser de paginas
- testes de extracao parcial de PDF
- testes do endpoint de inspecao
- testes do upload com `page_selection`
- teste de falha para pagina fora do intervalo
- teste de falha para filtro malformado

### 6.3.2. Frontend

Prioridade alta:
- teste do fluxo com PDF exibindo passo extra
- teste do fluxo sem PDF mantendo 3 passos
- teste do envio de `pageSelection` no upload
- teste de bloqueio do avancar quando filtro estiver invalido, se essa regra for implementada

### 6.3.3. Validacao manual

- PDF pequeno com selecao `1`
- PDF pequeno com selecao `1-3`
- PDF pequeno com selecao `2,4,6`
- PDF com filtro invalido
- PDF com paginas sem texto util
- arquivo `DOCX` confirmando ausencia do passo extra
- arquivo `PPTX` confirmando ausencia do passo extra

## 7. Ordem recomendada de implementacao

### Etapa 1 - Base de backend

1. criar helper de parse de paginas
2. evoluir extrator de PDF para aceitar lista de paginas
3. criar schemas da inspecao
4. criar endpoint `POST /documents/pdf/inspect`

### Etapa 2 - Persistencia e processamento

1. adicionar campos no `Document`
2. criar migration Alembic
3. atualizar `POST /documents/upload`
4. atualizar `process_document` para respeitar o filtro

### Etapa 3 - Frontend

1. adicionar `inspectPdf` no cliente de API
2. refatorar steps do wizard para formato dinamico
3. criar passo de paginas do PDF
4. enviar `pageSelection` no upload final

### Etapa 4 - QA

1. cobrir parser com testes
2. validar extracao parcial no backend
3. validar fluxo de criacao no frontend
4. executar smoke test manual com PDF e formatos nao PDF

## 8. Riscos e mitigacoes

### 8.1. Risco: acoplamento excessivo no router

Mitigacao:
- concentrar parse e validacao em helper dedicado

### 8.2. Risco: wizard ficar fragil com passo condicional

Mitigacao:
- refatorar a estrutura de passos antes de adicionar UI nova

### 8.3. Risco: inconsistencias entre frontend e backend na validacao

Mitigacao:
- frontend faz validacao leve
- backend faz validacao definitiva e retorna mensagem clara

### 8.4. Risco: PDF sem texto util nas paginas escolhidas

Mitigacao:
- falhar com mensagem orientativa explicando que as paginas selecionadas nao produziram texto extraivel

## 9. Criterios de aceite

- usuario consegue informar filtro de paginas ao enviar um PDF
- filtro `1,2,5-8` e interpretado corretamente
- deck gerado usa apenas as paginas escolhidas
- documentos nao PDF nao mudam de comportamento
- invalidacoes retornam mensagens claras
- campos novos nao quebram documentos antigos
- fluxo continua funcionando com Celery e monitoramento de processamento

## 10. Arquivos com maior probabilidade de alteracao

- `back/app/models.py`
- `back/app/schemas.py`
- `back/app/text_extractor.py`
- `back/app/tasks.py`
- `back/app/routers/documents.py`
- `back/alembic/versions/<nova_migration>.py`
- `front/lib/api.ts`
- `front/components/creation-wizard.tsx`

## 11. Observacao final

Esta fase deve nascer pequena e confiavel. O foco nao e construir um editor visual sofisticado de paginas, e sim entregar um recorte util e seguro para PDFs, sem criar regressao no fluxo atual de criacao de decks.
