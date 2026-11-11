# Camada de provedores de IA (#2)

`ai_generator.py` mantém os prompts, parsing tolerante, normalização, deduplicação,
complementação e assinaturas públicas. As únicas chamadas externas são
`get_ai_provider().generate(AIRequest(...))`. Respostas e uso de tokens são valores
independentes de SDK. `providers/gemini.py` contém configuração, safety settings,
cache de modelos, chamadas do SDK e extração de texto/metadados.

## Configuração e ciclo de vida

- `AI_PROVIDER` ausente seleciona `gemini`; espaços e capitalização são normalizados.
- Outros valores (inclusive vazio explícito) geram `AIConfigurationError`.
- Credenciais e timeout são validados na primeira seleção, não no import do domínio.
- `GEMINI_MODEL` assume `gemini-2.5-flash` quando ausente ou vazio.
- `AI_TIMEOUT_SECONDS` assume 90; valores não positivos/não finitos são rejeitados.
- Requests podem preservar o timeout específico da operação. Chat passa a usar
  o timeout configurado (antes delegava ao default implícito do SDK).
- Reiniciar backend/workers após alterar configuração. `clear_provider_cache()`
  permite limpar explicitamente a instância em testes ou no ciclo de vida da aplicação.

## Parâmetros antes/depois

Todos os modelos mantêm `top_p=1`, `top_k=1` e os quatro safety settings existentes.
Os 15 blocos de atribuição de prompts/instruções/dificuldade e as quatro assinaturas
(com defaults e anotações) foram comparados por AST com o commit base `0664065`:
nenhuma alteração.

| Operação | Temperatura antes → depois | Limite antes → depois | Timeout antes → depois | Formato SDK antes → depois |
| --- | --- | --- | --- | --- |
| Flashcards | 0,7 → 0,7 | 8192 → 8192 | 60s → 60s | texto → texto |
| Complemento de flashcards | 0,7 → 0,7 | 8192 → 8192 | 60s → 60s | texto → texto |
| Quiz | 0,8 → 0,8 | 8192 → 8192 | 90s → 90s | texto → texto |
| Complemento de quiz | 0,8 → 0,8 | 8192 → 8192 | 90s → 90s | texto → texto |
| Reparo de quiz | 0,2 → 0,2 | 8192 → 8192 | 60s → 60s | JSON → JSON |
| Estudo guiado principal | 0,35 → 0,35 | 4096 → 4096 | 90s → 90s | JSON → JSON |
| Estudo guiado compacto | 0,2 → 0,2 | 3072 → 3072 | 90s → 90s | texto → texto |
| Chat | 0,45 → 0,45 | 4096 → 4096 | default SDK → configuração (90s) | texto → texto |

A complementação atual de flashcards mantém até três chamadas adicionais; quiz
mantém um complemento e seus reparos atuais. A redução desses limites e a política
Celery serão tratadas nas issues seguintes. Nenhum endpoint, cota, persistência,
schema HTTP, frontend ou fluxo Celery foi modificado.

## Erros

| Origem | Erro normalizado | Retentável no contrato |
| --- | --- | --- |
| Chave ausente, timeout inválido, argumentos/modelo rejeitados | `AIConfigurationError` | não |
| 401/403 | `AIAuthenticationError` | não |
| Resposta vazia/bloqueada, falha não reconhecida | `AIInvalidResponseError` | não |
| 429 | `AIRateLimitError` | sim |
| Deadline/timeout | `AITimeoutError` | sim |
| Erro de servidor, conexão, retry SDK esgotado | `AIProviderUnavailableError` | sim |

As mensagens originais do SDK são descartadas e exceções são lançadas com
`from None`. A camada de domínio preserva o tratamento de falhas público existente;
a marcação `retryable` ainda não altera a política de tasks nesta issue.
O parsing tolerante e reparos ficam no domínio, inclusive para JSON não estrito.

## Validação reproduzível

```sh
docker build -t flashify-ai-provider-validation ./back
docker run --rm --network none --entrypoint python \
  -v "$PWD:/workspace:ro" -w /workspace/back \
  -e PYTHONPATH=/workspace/back -e PYTHONDONTWRITEBYTECODE=1 \
  -e DATABASE_URL=postgresql://test:test@localhost/test \
  -e SECRET_KEY=test-only-key -e ALGORITHM=HS256 \
  flashify-ai-provider-validation -m unittest discover -s tests -v
rg -n 'google\.generativeai' back/app --glob '*.py'
git diff --check
```

A busca pelo SDK deve encontrar somente `back/app/ai/providers/gemini.py`.
Os testes usam mocks/fakes, não consomem créditos nem acessam a rede.

Resultado desta implementação: build Docker concluído; `Ran 42 tests ... OK`
(21 novos testes de IA e 21 testes existentes, sem skips). A imagem antiga não tinha
`resend`; a suíte final foi executada na imagem reconstruída com `requirements.txt`.
`git diff --check` passou e a busca de imports encontrou apenas o adapter Gemini.
