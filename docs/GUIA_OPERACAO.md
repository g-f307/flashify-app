# Guia de operação do Flashify

## Serviços

Em desenvolvimento, `docker compose up --build` inicia PostgreSQL (`db`), Redis, API (`backend`), worker Celery, Celery Beat e frontend. A API fica em `9000`; o frontend é publicado em `4000` pelo Compose.

## Smoke test pós-subida

1. abrir o frontend e autenticar;
2. criar um deck pequeno a partir de texto;
3. confirmar que worker e beat processam a tarefa;
4. iniciar flashcards, quiz e estudo guiado;
5. verificar progresso e histórico;
6. testar snapshot em modo leitura e sua importação;
7. confirmar que `/admin` só aparece para usuários autorizados.

## Diagnóstico rápido

- geração parada: verificar `celery-worker`, Redis e `GOOGLE_API_KEY`;
- erro de conexão: validar `DATABASE_URL` e o healthcheck do PostgreSQL;
- frontend sem API: conferir `NEXT_PUBLIC_API_BASE_URL` e CORS;
- login Google falhando: conferir cliente, segredo e `REDIRECT_URI`;
- e-mails não enviados: conferir `ENABLE_EMAILS` e `RESEND_API_KEY`;
- links com domínio incorreto: conferir `FRONTEND_URL`.

## Deploy

Antes do deploy, revisar segredos, aplicar migrations, confirmar backup, validar o build e executar o smoke test. Em produção, o fluxo existente é:

```bash
./deploy.sh
```

O script recria os serviços definidos em `docker-compose.prod.yml`. Preserve o volume do PostgreSQL; não reverta migrations sem avaliar os dados persistidos.
