# Flashify API

Bem-vindo à documentação do backend da aplicação Flashify. Esta API é responsável por todo o gerenciamento de usuários, pastas, processamento de documentos e geração de flashcards com Inteligência Artificial.

## ✨ Funcionalidades Principais

-   **Autenticação de Usuários:** Sistema seguro de registro e login baseado em tokens JWT.
-   **Organização de Pastas:** Crie e gerencie pastas para organizar seus materiais de estudo.
-   **Upload de Documentos:** Suporte para upload de imagens (`.png`, `.jpg`) e PDFs.
-   **Processamento Assíncrono:** As tarefas pesadas (OCR e IA) são executadas em background com Celery e Redis, garantindo que a API permaneça rápida e responsiva.
-   **Extração de Texto:** Usa a API Google Cloud Vision para OCR de alta precisão em imagens e `pdfplumber` para extrair texto de PDFs.
-   **Geração de Flashcards com IA:** Utiliza a API do Google Gemini para criar flashcards de pergunta e resposta automaticamente a partir do texto extraído.

## 🛠️ Tecnologias Utilizadas

-   **Framework:** **FastAPI**
-   **Banco de Dados:** **PostgreSQL**
-   **ORM:** **SQLModel** (combina SQLAlchemy e Pydantic)
-   **Tarefas Assíncronas:** **Celery**
-   **Message Broker:** **Redis**
-   **Containerização:** **Docker** e **Docker Compose**
-   **Autenticação:** **JWT** (JSON Web Tokens)
-   **IA / NLP:** **Google Gemini API**

## 🚀 Rodando o Projeto Localmente

Siga os passos abaixo para configurar e rodar o ambiente de desenvolvimento em uma nova máquina.

### Pré-requisitos

Antes de começar, garanta que você tenha os seguintes softwares instalados:
-   [Git](https://git-scm.com/)
-   [Docker](https://www.docker.com/products/docker-desktop/) e Docker Compose
-   [Python 3.10+](https://www.python.org/)
-   Uma **Chave de API do Google Gemini**, que pode ser obtida no [Google AI Studio](https://aistudio.google.com/).

### 1. Clonar o Repositório

```bash
git clone [https://github.com/g-f307/flashify.git](https://github.com/g-f307/flashify.git)
cd flashify-app/back