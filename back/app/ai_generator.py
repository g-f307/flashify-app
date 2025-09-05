# app/ai_generator.py
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configura a API do Google
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

def chat_about_flashcard(
    message: str, 
    flashcard_front: str, 
    flashcard_back: str, 
    document_context: str,
    conversation_history: list[dict] = None
) -> str:
    """
    Permite conversa contextual sobre um flashcard específico usando o documento original.
    """
    if not message or message.isspace():
        return "Por favor, faça uma pergunta sobre este tópico."
    
    # Prepara o histórico da conversa
    history_text = ""
    if conversation_history:
        for entry in conversation_history[-5:]:  # Últimas 5 mensagens
            history_text += f"Usuário: {entry['user']}\nAssistente: {entry['assistant']}\n\n"
    
    # Contexto limitado do documento (primeiros 3000 chars)
    context_snippet = document_context[:3000] if document_context else ""
    
    prompt = f"""
    Você é um PROFESSOR UNIVERSITÁRIO ESPECIALISTA atuando como tutor personalizado.
    
    CONTEXTO DO FLASHCARD:
    Pergunta: {flashcard_front}
    Resposta: {flashcard_back}
    
    CONTEXTO DO DOCUMENTO (para referência):
    {context_snippet}
    
    HISTÓRICO DA CONVERSA:
    {history_text}
    
    INSTRUÇÕES COMO PROFESSOR:
    1. ATUE COMO UM PROFESSOR COMPLETO: forneça explicações abrangentes, recomendações bibliográficas, exemplos práticos, exercícios, e conexões com outros tópicos quando relevante
    2. EXPANDA O CONHECIMENTO: use o flashcard como ponto de partida, mas sinta-se livre para ensinar conceitos relacionados, dar contexto histórico, aplicações práticas
    3. RECOMENDE RECURSOS: quando perguntado sobre livros, artigos, ou recursos de estudo, forneça recomendações específicas e de qualidade
    4. SEJA PEDAGÓGICO: adapte explicações ao nível de conhecimento demonstrado pelo aluno, ofereça múltiplas perspectivas
    5. ESTIMULE O APRENDIZADO: faça conexões interdisciplinares, sugira tópicos de aprofundamento, proponha reflexões
    6. RESPONDA DE FORMA COMPLETA: não limite suas respostas por escopo - se o aluno quer aprender mais, ensine mais
    
    FORMATO DE RESPOSTA:
    - Use markdown para estruturar bem a resposta
    - Inclua exemplos práticos quando relevante
    - Para código: use blocos de código com syntax highlighting
    - Para listas de livros/recursos: use listas organizadas
    - Para conceitos complexos: use analogias e diagrams quando possível
    
    PERGUNTA DO USUÁRIO: {message}
    
    Responda como um professor dedicado que quer genuinamente ajudar o aluno a compreender e aprofundar o conhecimento:"""
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Desculpe, ocorreu um erro ao processar sua pergunta: {e}"

def generate_flashcards_from_text(text: str) -> list[dict]:
    """
    Usa o modelo Gemini do Google para gerar flashcards a partir de um texto.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    # Prompt melhorado para gerar flashcards mais abrangentes
    prompt = f"""
    Você é um assistente especialista em criar materiais de estudo abrangentes e práticos.
    
    Sua tarefa é ler o texto fornecido e gerar um conjunto de flashcards que vão ALÉM do conteúdo literal do documento.
    
    INSTRUÇÕES IMPORTANTES:
    1. Use o documento como BASE, mas expanda com seu conhecimento da IA
    2. Crie exemplos práticos, códigos, diagramas quando relevante
    3. Para conceitos técnicos: inclua exemplos de código
    4. Para processos/fluxos: inclua diagramas Mermaid
    5. Para conceitos abstratos: crie analogias e exemplos práticos
    6. Diversifique os tipos de pergunta: definições, aplicações, comparações, exemplos
    
    FORMATO DE RESPOSTA:
    Responda APENAS em formato JSON com uma lista de objetos. Cada flashcard deve ter:
    - "front": A pergunta
    - "back": A resposta completa (pode incluir código, diagramas Mermaid, exemplos)
    - "type": Tipo do flashcard ("concept", "code", "diagram", "example", "comparison")
    
    TIPOS DE FLASHCARD:
    - "concept": Definições e conceitos teóricos
    - "code": Inclui exemplos de código na resposta
    - "diagram": Inclui diagramas Mermaid na resposta
    - "example": Exemplos práticos e aplicações
    - "comparison": Comparações entre conceitos
    
    EXEMPLOS DE FORMATO:
    {{
      "flashcards": [
        {{
          "front": "Como implementar autenticação JWT em uma API REST?",
          "back": "```python\\nimport jwt\\nfrom datetime import datetime, timedelta\\n\\ndef create_token(user_id):\\n    payload = {{\\n        'user_id': user_id,\\n        'exp': datetime.utcnow() + timedelta(hours=24)\\n    }}\\n    return jwt.encode(payload, 'secret_key', algorithm='HS256')\\n```\\n\\nO token JWT é gerado com payload contendo ID do usuário e data de expiração.",
          "type": "code"
        }},
        {{
          "front": "Qual é o fluxo de autenticação OAuth 2.0?",
          "back": "```mermaid\\nsequenceDiagram\\n    participant U as Usuário\\n    participant C as Cliente\\n    participant A as Auth Server\\n    participant R as Resource Server\\n    \\n    U->>C: Iniciar login\\n    C->>A: Solicitar autorização\\n    A->>U: Exibir tela de login\\n    U->>A: Credenciais\\n    A->>C: Código de autorização\\n    C->>A: Trocar código por token\\n    A->>C: Access token\\n    C->>R: Fazer requisição com token\\n```",
          "type": "diagram"
        }}
      ]
    }}

    Gere entre 8-15 flashcards variados, priorizando a compreensão prática e aplicação real dos conceitos.

    Texto para análise:
    ---
    {text[:15000]}
    """

    try:
        print("Enviando texto para a API do Google Gemini...")
        model = genai.GenerativeModel('gemini-1.5-flash')
        # O Gemini pode retornar o JSON diretamente com essa configuração
        response = model.generate_content(prompt)

        # Limpa a resposta para extrair apenas o JSON
        json_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(json_text)

        print("Flashcards gerados com sucesso pelo Gemini.")
        return data.get("flashcards", [])

    except Exception as e:
        print(f"Ocorreu um erro ao chamar a API do Google Gemini: {e}")
        return []