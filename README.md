# Flashify App

Flashify é uma plataforma que transforma textos, PDFs e imagens em flashcards inteligentes para acelerar o aprendizado. O projeto é composto por um backend em FastAPI (Python) e um frontend em Next.js (React).

## Funcionalidades

- Upload de PDFs e imagens para extração de texto
- Geração automática de flashcards usando IA (Gemini/Google)
- Autenticação de usuários (JWT)
- Organização de conjuntos de estudo em pastas
- Interface moderna e responsiva
- Modo de estudo com acompanhamento de progresso

## Estrutura do Projeto

```
flashify-app/
├── back/        # Backend FastAPI
│   ├── app/     # Código principal da API
│   └── docker-compose.yml
├── front/       # Frontend Next.js
│   ├── app/     # Páginas e componentes
│   └── public/  # Assets
└── uploads/     # Arquivos enviados
```

## Backend (FastAPI)

- Python 3.11+
- FastAPI, SQLModel, Google Generative AI, dotenv
- Endpoints para autenticação, upload, geração de flashcards
- Banco de dados SQLite

### Como rodar localmente

```bash
cd back
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Frontend (Next.js)

- React, Next.js, pnpm
- Interface para upload, geração e estudo de flashcards

### Como rodar localmente

```bash
cd front
pnpm install
pnpm dev
```

## Dockerização

A aplicação pode ser executada via Docker Compose, incluindo backend, frontend e banco de dados.

### Build & Run

```bash
cd back
cp .env.example .env # Configure suas variáveis
cd ..
docker-compose up --build
```

Acesse o frontend em `http://localhost:3000` e a API em `http://localhost:8000`.

## Variáveis de Ambiente

- `GOOGLE_API_KEY`: Chave da API Gemini
- `DATABASE_URL`: URL do banco de dados (SQLite por padrão)

## Licença

MIT

## Contato

- Autor: Seu Nome
- Email: seu@email.com
- Github: https://github.com/g-f307/flashify-app
