# Operações estruturadas de IA (#4)

As quatro funções públicas de `ai_generator.py` mantêm assinaturas, defaults e
formatos de retorno. Prompts são montados por funções puras; todas as chamadas
principais, complementares e de reparo usam `get_ai_provider().generate(AIRequest)`.
`output_schemas.py` define os contratos Pydantic e deriva o JSON Schema estrito.
Cada resposta estruturada é revalidada pelo domínio antes da normalização.

A seleção continua em `AI_PROVIDER`: Gemini é o default, OpenAI é selecionável e
não há fallback automático. Os `.env` locais, UI e schemas do banco não mudam.
A ativação de produção e os gates de qualidade/custo continuam na issue #5.

## Matriz operação × entrada × schema × parâmetros × retorno

| Operação | Entrada/contexto preservado | Contrato | Temperatura / tokens / timeout | Retorno público |
| --- | --- | --- | --- | --- |
| Flashcards | Tema curto ou fonte preparada até 15000 caracteres; dificuldade e idioma | `FlashcardsOutput`, com `front`/`back` não vazios e metadata `type` | 0,7 / 8192 / 60s | `List[Dict[str, Any]]`, quantidade exata |
| Complemento de flashcards | Mesma fonte e todas as frentes já geradas | Mesmo contrato | 0,7 / 8192 / 60s | Itens novos, deduplicados; um complemento máximo |
| Quiz | Tema curto ou fonte preparada até 15000 caracteres; dificuldade e idioma | `QuizOutput`: título/texto não vazios, cinco alternativas e uma correta | 0,8 / 8192 / 90s | `{"title": ..., "questions": [...]}`, quantidade exata |
| Complemento de quiz | Mesma fonte e perguntas/alternativas existentes | Mesmo contrato | 0,8 / 8192 / 90s | Perguntas inéditas; um complemento máximo |
| Reparo de quiz (somente Gemini) | JSON sintaticamente inválido, até 12000 caracteres | `QuizOutput`, operação `repair` | 0,2 / 8192 / 60s | Mesmo contrato, sem reparo recursivo |
| Estudo guiado | Contexto de 3200 caracteres, todos os IDs; snippets de frente/verso/pergunta nos limites anteriores | `GuidedStudyOutput`, herdando integralmente `schemas.GuidedStudyResponse` | 0,35 / 4096 / 90s | Grupos de IDs no formato anterior; servidor hidrata a resposta/cache completos |
| Chat | Frente/verso, contexto de 1800 caracteres, últimas três conversas (220/420 caracteres por mensagem) | Texto Markdown não vazio | 0,45 / 4096 / timeout configurado (90s default) | `str`; mesma mensagem para entrada vazia |

O provider OpenAI mantém a política de compatibilidade de parâmetros da #3:
`temperature` é enviada ao modelo padrão somente com reasoning `none`.
A validação de quiz rejeita booleanos em string, alternativas vazias, múltiplas
corretas ou quantidade diferente de cinco. Normalização/deduplicação e o ponto de
`crud.shuffle_quiz_answers` permanecem na persistência. `explanation=null` continua
como null, sem virar a string `"None"`.

## Prompts: diff explicado

- As atribuições de prompts/instruções/dificuldade para flashcards e quiz foram
  extraídas sem alterar seu AST. O prompt e a montagem do histórico do chat também
  mantêm o AST anterior. As quatro assinaturas completas foram comparadas por AST
  com a `main` sincronizada (`ac62e15`).
- Permanecem regras pedagógicas de dificuldade, idioma explícito/inferido/auto,
  relevância, concisão, código, HTML leve e LaTeX. Os prompts não citam fornecedores.
- Flashcards deixam de limitar a lista de frentes existentes aos primeiros 30;
  enviam todas para evitar repetição. Quiz passa a enviar explicitamente os itens
  existentes ao único complemento. Fonte, quantidade e contexto não são reduzidos.
- O estudo guiado troca exclusivamente a instrução do formato ID-only pela forma
  completa de `GuidedStudyResponse`, incluindo steps, answers e summary. Mantém as
  regras de coesão, equilíbrio, progressão pedagógica, títulos e uso dos IDs existentes.
- JSON inválido e falhas do provider não viram `None` nem uma nova tentativa
  compacta silenciosa. O estudo guiado usa o schema completo na chamada principal;
  a tentativa compacta textual anterior deixa de ser necessária. OpenAI não repara
  JSON. Gemini pode reparar uma falha sintática de quiz pela mesma abstração.

Referência: [Structured Outputs da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Contrato do estudo guiado e cache

`GuidedStudyOutput` herda `schemas.GuidedStudyResponse` sem redefinir campos ou
modelos aninhados. O schema de transporte exige todos os campos e proíbe extras;
os tipos nullable são preservados. O domínio revalida com Pydantic e verifica tipos
de etapa, IDs existentes, ausência de duplicatas e pelo menos um flashcard e uma
pergunta por tópico.

Como a função pública não recebe ID/título reais do documento nem as alternativas
persistidas, o prompt usa metadados provisórios e etapas que referenciam os IDs.
O retorno público continua sendo `topics/title/flashcard_ids/question_ids`.
Os dois builders existentes (compartilhado e legado da rota) reconstroem etapas,
conteúdo, alternativas, metadados e contagens a partir dos dados canônicos do banco.
Texto, respostas ou contagens gerados pelo modelo não substituem esses dados.
Cache existente, trilha e snapshots compartilhados mantêm seus contratos HTTP.

O SDK Gemini fixado em 0.7.1 não recebe o JSON Schema completo no argumento
`response_schema`: seu conversor legado não representa todos os recursos usados
pelos modelos compartilhados (`$defs`, unions nullable e `additionalProperties`).
Ele usa MIME JSON e a mesma validação Pydantic no domínio, sem manter um segundo
contrato divergente. OpenAI recebe o JSON Schema estrito completo.

## Falhas, transação e cota

Flashcards/quiz retornam quantidade exata ou `AIInvalidResponseError`. Uma resposta
válida com menos itens pode receber um único complemento (`_attempt < 1`); estrutura
ou semântica inválida falha diretamente. Entradas vazias mantêm os retornos vazios
anteriores. Erros transitórios/permanentes seguem a taxonomia e retries da #3.

A task passa a persistir conteúdo, cache guiado, estado final, evento de conclusão
e incremento da cota na mesma transação. CRUD/cache aceitam `commit=False` para
esse fluxo; o default dos demais consumidores permanece `True`. Uma falha no
estudo guiado ou no registro de conclusão reverte os itens e a cota. Entrega repetida
de uma task já concluída não gera novamente nem cobra de novo. A contagem preserva
uma unidade por superfície, inclusive duas unidades para `both`, em uma só chamada.
O progresso de geração guiada é publicado antes de abrir a transação dos itens.

Erros de IA nas rotas mantêm HTTP 500 com `detail` genérico; o chat mantém sua
resposta textual genérica e registra apenas a classe do erro. Nenhum `str(exception)`
é devolvido no chat. O domínio deixa de registrar respostas brutas.

Os testes HTTP detectaram duas lacunas já existentes e necessárias para executar
os fluxos completos: as funções CRUD de histórico do chat estavam ausentes e os
flashcards expiravam no commit da invalidação do cache antes da serialização. Foram
adicionados os helpers esperados pelas rotas e um refresh dos flashcards retornados,
preservando os campos e formatos declarados dos endpoints.

## Validação

```sh
docker build -t flashify-structured-ai-validation ./back
docker run --rm --network none --entrypoint python \
  -v "$PWD:/workspace:ro" -w /tmp \
  -e PYTHONPATH=/workspace/back -e PYTHONDONTWRITEBYTECODE=1 \
  -e DATABASE_URL=postgresql://test:test@localhost/test \
  -e SECRET_KEY=test-only-key -e ALGORITHM=HS256 \
  flashify-structured-ai-validation \
  -m unittest discover -s /workspace/back/tests -v
rg -n 'import openai|from openai|google\.generativeai' back/app --glob '*.py'
git diff --check
```

O diretório de trabalho `/tmp` acomoda a pasta de uploads criada no import da
aplicação; o código permanece montado como somente leitura. Providers fake e
MockTransport não consomem rede, créditos ou credenciais reais. Integrações usam
SQLModel/SQLite em memória: apenas o metadata de teste adapta ARRAY para JSON e o
retorno de timezone do SQLite. Nenhum banco existente é usado ou alterado.

Cobertura:

- Fake OpenAI e Gemini; três dificuldades × `pt-BR`/`en`/`auto`; HTML e LaTeX.
- Quantidade exata, deduplicação, limite de um complemento e contexto existente.
- Rejeição semântica do quiz e ausência de reparo em OpenAI.
- Pydantic revalida `parsed`, mesmo quando o texto aparenta ser válido.
- Chat Markdown, histórico limitado, mensagem vazia e erros sem conteúdo sensível.
- Três tipos de task, status, retries, rollback e cota única, inclusive replay.
- Falha no estudo guiado e no evento final não deixa conteúdo/cota parciais.
- Geração e complemento HTTP 201; chat/histórico e estudo guiado HTTP 200;
  cache HIT, reestruturação, caminho legado com cache vazio e snapshots.
- SDKs restritos aos respectivos providers; imports lazy; prompts puros e assinaturas.

Resultado da suíte: `Ran 91 tests in 3.326s — OK`, sem skips (22 testes novos e
69 existentes, com expectativas atualizadas para os novos limites e contratos).
`git diff --check` e a busca estática de SDKs passaram. A comparação AST confirmou
as quatro assinaturas completas e os prompts pedagógicos extraídos.

Build final de backend/worker concluído. A suíte também foi executada com
`PYTHONPATH=/app`, usando o código empacotado na imagem em vez do código montado:
`Ran 91 tests in 3.328s — OK`, sem skips e sem rede.
