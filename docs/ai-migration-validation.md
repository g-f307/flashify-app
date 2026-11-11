# Validação e rollout da migração de IA

Este documento é o registro operacional da issue #5. Ele separa controles já
verificados no repositório de evidências que só existem após chamadas reais em
staging e implantação acompanhada. Nenhum gate pendente deve ser marcado como
aprovado por inferência, mock ou execução local sem credencial real.

## Estado atual

- [x] Dataset sanitizado com 12 casos em `back/tests/ai/migration_dataset.json`.
- [x] Rubrica e gates executáveis em `app.ai.rollout_validation`.
- [x] Runner real com artefatos locais ignorados pelo Git.
- [x] Tokens, chamadas, suplementações, custo e latências agregados por operação.
- [x] Zero retry no SDK e somente uma suplementação por flashcards/quiz.
- [x] Celery: três retries transitórios, backoff exponencial desde ~60s, jitter e teto de 600s.
- [x] Logs do adapter sem chave, prompt, documento, chat ou resposta.
- [x] Gemini continua selecionável explicitamente e Google Vision permanece instalado.
- [ ] Execução real OpenAI em staging.
- [ ] Comparação Gemini no mesmo ciclo, ou indisponibilidade registrada.
- [ ] Avaliação humana e aprovação de todos os gates.
- [ ] Smoke real das quatro superfícies em staging.
- [ ] Ativação acompanhada em produção e monitoramento de 60 minutos.

## Dataset e execução

O dataset cobre humanidades, exatas e programação; textos curtos e longos;
inglês→inglês, inglês→português; LaTeX; código/HTML permitido; e documento
ruidoso. Cada caso gera 10 flashcards, 5 perguntas, estudo guiado e três turnos
de chat com histórico.

Antes de cada execução, confirme a tabela vigente na página oficial do modelo.
Em 11/11/2026, a documentação oficial do GPT-6 Luna informava US$ 0,10 por 1M
tokens de entrada e US$ 0,50 por 1M tokens de saída. Fonte:
https://developers.openai.com/api/docs/models/gpt-6-luna

Execute fora de produção, com a chave provisionada pelo gerenciador de secrets:

```bash
cd back
mkdir -p ../validation-artifacts/cycle-YYYYMMDD
AI_PROVIDER=openai \
python scripts/run_ai_migration_validation.py \
  --provider openai \
  --artifacts ../validation-artifacts/cycle-YYYYMMDD \
  --input-price 0.10 \
  --output-price 0.50 \
  --confirm-real-cost
```

O arquivo `openai-outputs.json` contém conteúdo gerado para avaliação humana e
é local, sensível e ignorado pelo Git. O arquivo `openai-aggregate.json` não
contém prompts nem respostas e pode fornecer os números para este registro.

Se Gemini estiver disponível, execute sem alterar prompts ou dataset:

```bash
AI_PROVIDER=gemini \
python scripts/run_ai_migration_validation.py \
  --provider gemini \
  --artifacts ../validation-artifacts/cycle-YYYYMMDD \
  --confirm-real-cost
```

O custo Gemini deve ser calculado com a tabela própria; não reutilize os preços
default do runner. Se o provider estiver indisponível, registre data, erro
sanitizado e baseline aprovado usado na comparação.

## Rubrica humana

Para cada caso, pontue de 0 a 2, usando estas oito chaves exatas:

- `fidelity`: aderência ao conteúdo fornecido;
- `factual_correctness`: ausência de erro factual;
- `difficulty`: compatibilidade com o nível solicitado;
- `clarity`: clareza e concisão;
- `no_duplicates`: ausência de repetição/paráfrase;
- `language`: idioma solicitado;
- `formats`: preservação de LaTeX, código e HTML permitido;
- `structure`: contrato estrutural completo.

Registre também `exact_delivery`, `quiz_valid` e `schema_valid`. O arquivo de
avaliação é uma lista JSON com esta forma por caso:

```json
{
  "case_id": "short-humanities-pt",
  "scores": {
    "fidelity": 2,
    "factual_correctness": 2,
    "difficulty": 2,
    "clarity": 2,
    "no_duplicates": 2,
    "language": 2,
    "formats": 2,
    "structure": 2
  },
  "exact_delivery": true,
  "quiz_valid": true,
  "schema_valid": true
}
```

Reexecute o runner com `--evaluations caminho.json`. Aprovação exige:

- nenhum zero em correção factual ou estrutura;
- média global ≥ 1,7/2;
- entrega exata ≥ 95%;
- 100% dos quizzes com cinco alternativas e uma correta;
- 100% do conteúdo persistido validando nos schemas.

## Smoke e rollout

1. Faça build do backend e worker a partir do mesmo commit avaliado.
2. Implante em staging mantendo `AI_PROVIDER=gemini` e execute smoke fake.
3. Provisione `OPENAI_API_KEY` no gerenciador de secrets, nunca em `.env` versionado.
4. Configure staging com `AI_PROVIDER=openai`, `OPENAI_MODEL=gpt-6-luna`,
   `OPENAI_REASONING_EFFORT=none` e `AI_TIMEOUT_SECONDS=90`.
5. Execute dataset, avaliação humana e smoke real de flashcards, quiz, estudo
   guiado e chat. Bloqueie o rollout se qualquer gate falhar.
6. Em janela acompanhada, aplique as mesmas variáveis em produção e reinicie
   backend e workers.
7. Execute um smoke sanitizado nas quatro superfícies.
8. Monitore por 60 minutos: taxa de falha, p50/p95/máxima, tokens, custo,
   suplementações, retries Celery e incremento de cota.

## Rollback objetivo

Restaure Gemini imediatamente se ocorrer qualquer condição:

- erro de autenticação ou configuração;
- duas falhas consecutivas no smoke;
- falha acima de 5% após no mínimo 20 gerações;
- p95 acima de 90 segundos;
- persistência fora dos schemas;
- chave, prompt, documento, chat ou resposta em log;
- mais de uma suplementação, mais de três retries ou cobrança duplicada.

Procedimento:

```env
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
AI_TIMEOUT_SECONDS=90
```

Reinicie backend e workers, repita o smoke sanitizado e registre horário,
motivo, métricas antes/depois e responsável. Não existe fallback automático.

## Registro do ciclo real

Preencher após staging, sem copiar conteúdo gerado:

| Campo | Resultado |
| --- | --- |
| Commit/imagem | PENDENTE |
| Data e ambiente | PENDENTE |
| Provider/modelo | PENDENTE |
| Casos avaliados | PENDENTE |
| Média da rubrica | PENDENTE |
| Entrega exata | PENDENTE |
| Quizzes válidos | PENDENTE |
| Schemas válidos | PENDENTE |
| Tokens entrada/saída | PENDENTE |
| Custo total | PENDENTE |
| Latência p50/p95/máxima | PENDENTE |
| Suplementações/retries | PENDENTE |
| Smoke staging | PENDENTE |
| Smoke produção | PENDENTE |
| Monitoramento 60 min | PENDENTE |
| Decisão | BLOQUEADA ATÉ CONCLUSÃO DOS GATES |
