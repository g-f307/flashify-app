# Provider OpenAI Responses API (#3)

O provider implementa `AIProvider.generate(AIRequest)` com o SDK oficial Python
`openai==2.8.1`. O pacote `jsonschema==4.23.0` valida o schema e a resposta localmente.
Import e cliente são lazy: a factory só importa o adapter selecionado; o cliente
é construído na primeira chamada, com `max_retries=0`. Nenhuma chamada real é
necessária para importar o domínio ou executar a suíte.

## Configuração

```env
AI_PROVIDER=gemini
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-6-luna
OPENAI_REASONING_EFFORT=none
AI_TIMEOUT_SECONDS=90
```

Gemini continua como padrão. A chave deve ser provisionada por variável/secrets;
os arquivos `.env` locais não são modificados nem versionados por esta mudança.
Selecionar `openai` não instancia Gemini e não habilita fallback automático.
Rollback usa `AI_PROVIDER=gemini` e reinício dos processos.

Esta issue entrega infraestrutura. A associação de schemas Pydantic às operações
e a migração dos fluxos do domínio pertencem à #4; não ativar OpenAI em produção
antes dos gates e rollout da #5. A infraestrutura exige schema para todo request
com `response_format="json"`, inclusive quando os consumidores ainda são legados.

Modelo vazio usa `gpt-6-luna`. Esforço de raciocínio é configurável; valores
reconhecidos são validados localmente e incompatibilidades específicas do modelo
são erros permanentes da API. Timeout precisa ser positivo/finito e pode ser
sobrescrito por request para preservar os limites das operações atuais.

## Payloads sanitizados exercitados nos testes

Texto (`chat`):

```json
{
  "model": "gpt-6-luna",
  "input": [{"role": "user", "content": "private-document\nprivate-chat"}],
  "max_output_tokens": 4096,
  "timeout": 90.0,
  "reasoning": {"effort": "none"},
  "temperature": 0.45,
  "store": false
}
```

Os textos acima são marcadores fictícios usados nos testes, não dados reais.
Prompts fornecidos como lista são unidos por quebras de linha, preservando a ordem.
`max_output_tokens` é enviado sem estimativa por caracteres. `store=false` evita
armazenamento de estado de conversa pelo mecanismo Responses.

Para `flashcards`, `quiz` e `guided_study`, os testes adicionam o seguinte campo
(variando o nome conforme a operação):

```json
{
  "text": {
    "format": {
      "type": "json_schema",
      "name": "flashify_quiz",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {"answer": {"type": "string"}},
        "required": ["answer"],
        "additionalProperties": false
      }
    }
  }
}
```

O schema mínimo testa o contrato do provider; os contratos pedagógicos completos
serão definidos na #4. Campos extras, tipos errados, JSON inválido, recusas,
respostas vazias e respostas incompletas são rejeitados. O provider não usa regex,
`literal_eval`, reparo nem chamada suplementar. Schemas usam referências locais.

`AIResponse` recebe texto consolidado pelo SDK, JSON validado em `parsed`, tokens
reais `input_tokens`/`output_tokens`/`total_tokens` e `_request_id` do SDK. Metadados
ausentes ficam como `None`, sem inventar uso ou confundir response ID com request ID.

## Parâmetros compatíveis

`gpt-6-luna` e `gpt-6-sol` recebem `temperature` apenas com effort `none`.
GPT-4o/GPT-4.1 recebem `temperature` sem `reasoning`. Para outros modelos, o adapter
omite `temperature` conservadoramente e envia o effort configurado; erros de
compatibilidade da API viram `AIConfigurationError`, sem retry ou troca de modelo.
Nenhum prompt pedagógico, limite de contexto, assinatura ou schema HTTP foi alterado.

Fontes consultadas: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create),
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses),
[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) e
[compatibilidade dos parâmetros](https://developers.openai.com/api/docs/guides/deployment-checklist).

## Matriz erro → teste

| Origem | Erro interno | Teste |
| --- | --- | --- |
| Chave ausente | `AIConfigurationError` | `test_missing_key` |
| Timeout/effort inválido | `AIConfigurationError` | `test_invalid_configuration` |
| Configuração do cliente | `AIConfigurationError` | `test_client_configuration_error_is_sanitized` |
| Parâmetros/schema ausentes ou inválidos | `AIConfigurationError` | `test_invalid_parameters_fail_without_call`, `test_invalid_or_non_strict_or_remote_schema_fails_without_call` |
| HTTP 400/404/422 | `AIConfigurationError` | `test_http_errors_and_rate_limit_retry_after` |
| HTTP 401/403 | `AIAuthenticationError` | `test_http_errors_and_rate_limit_retry_after` |
| HTTP 429 | `AIRateLimitError` | `test_http_errors_and_rate_limit_retry_after`, `test_rate_limit_headers_support_ms_dates_and_invalid_values` |
| HTTP 408/timeout SDK | `AITimeoutError` | `test_http_errors_and_rate_limit_retry_after`, `test_transport_errors` |
| HTTP 5xx/conexão | `AIProviderUnavailableError` | `test_http_errors_and_rate_limit_retry_after`, `test_transport_errors` |
| JSON inválido ou fora do schema | `AIInvalidResponseError` | `test_invalid_json_and_schema_mismatch_never_repaired` |
| Vazio, recusa, incompleto | `AIInvalidResponseError` | `test_empty_refused_and_incomplete_responses_are_invalid` |
| Resposta incompatível com o SDK | `AIInvalidResponseError` | `test_transport_errors` |

`retry_after` preserva segundos, milissegundos e HTTP-date quando disponíveis.
Erros externos são convertidos em mensagens genéricas sem conteúdo da exceção.

O Celery repete somente `AIRateLimitError`, `AITimeoutError` e
`AIProviderUnavailableError`: máximo de três retries, com o intervalo atual de
60s. Autenticação, configuração, resposta inválida e outros erros permanentes
marcam o documento como falho sem retry. A condição de status usa a mesma lista
da configuração do autoretry. Erros normalizados de quiz, reparo e estudo guiado
são propagados para que não sejam perdidos pelos catches legados. A suíte cobre
os três tipos de conteúdo e comprova quatro chamadas no máximo usando o wrapper
real do Celery. O backoff com jitter e os demais gates operacionais ficam na #5.

## Logs

Um evento JSON `ai_call` por chamada registra operação (enum permitido), provider,
modelo, duração em ms, tokens, sucesso, categoria de erro e request ID. Não registra
chave, prompt, documento, chat, resposta ou texto de exceção do SDK. Os testes
capturam os logs em sucesso e falha. Logs legados fora do adapter serão tratados
pela etapa de privacidade da #5.

## Validação reproduzível

```sh
docker build -t flashify-openai-provider-validation ./back
docker run --rm --network none --entrypoint python \
  -v "$PWD:/workspace:ro" -w /workspace/back \
  -e PYTHONPATH=/workspace/back -e PYTHONDONTWRITEBYTECODE=1 \
  -e DATABASE_URL=postgresql://test:test@localhost/test \
  -e SECRET_KEY=test-only-key -e ALGORITHM=HS256 \
  flashify-openai-provider-validation -m unittest discover -s tests -v
rg -n 'import openai|from openai' back/app --glob '*.py'
git diff --check
```

Mocks e `httpx.MockTransport` exercitam o SDK instalado, payloads, consolidação de
múltiplas partes e ausência de retries para 429/500 sem rede, créditos ou chaves reais.

Resultado final: build Docker concluído; `Ran 69 tests in 1.323s — OK`, sem
skips. São 27 testes novos e 42 existentes. A comparação AST confirmou os 15
blocos de prompts/instruções/dificuldade intactos em relação à `main` sincronizada.
Imports dos SDKs aparecem somente nos respectivos adapters; `git diff --check`
passou. Não foram feitas chamadas reais nem ativação do provider em produção.
