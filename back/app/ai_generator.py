# back/app/ai_generator.py
import os
import json
from typing import List, Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Carregue a chave da API a partir das variáveis de ambiente
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Verifique se a chave da API foi configurada
if not GOOGLE_API_KEY:
    raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi configurada.")

genai.configure(api_key=GOOGLE_API_KEY)

# --- Função existente (permanece igual) ---
def chat_about_flashcard(
    message: str,
    flashcard_front: str,
    flashcard_back: str,
    document_context: str,
    conversation_history: list[dict] = None
) -> str:
    if not message or message.isspace():
        return "Por favor, faça uma pergunta sobre este tópico."

    history_text = ""
    if conversation_history:
        for entry in conversation_history[-5:]:
            history_text += f"Usuário: {entry['user']}\nAssistente: {entry['assistant']}\n\n"

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
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Desculpe, ocorreu um erro ao processar sua pergunta: {e}"

# --- Função nova e melhorada ---
def generate_flashcards_from_text(
    text: str, num_flashcards: int = 10, difficulty: str = "Médio"
) -> List[Dict[str, Any]]:
    """
    Gera flashcards a partir de um texto usando a API do Google Generative AI.

    NOVA FUNCIONALIDADE: Adiciona um timeout de 15 segundos à requisição e um prompt refinado.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    # Configurações do modelo de IA (movidas para dentro da função para serem mais específicas)
    generation_config = {
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 8192,
    }

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash-latest",
        generation_config=generation_config,
        safety_settings=safety_settings,
    )

    difficulty_map = {
        "Fácil": "conceitos fundamentais e perguntas diretas.",
        "Médio": "conceitos intermediários, com exemplos práticos e comparações.",
        "Difícil": "conceitos avançados, detalhes técnicos e cenários complexos que exigem raciocínio."
    }
    difficulty_instruction = difficulty_map.get(difficulty, difficulty_map["Médio"])


    prompt_parts = [
        f"Com base no texto fornecido, gere exatamente {num_flashcards} flashcards de dificuldade {difficulty}, focando em {difficulty_instruction}",
        "O texto é o seguinte:",
        text[:15000], # Limita o tamanho do texto para evitar sobrecarga
        "REGRAS IMPORTANTES:",
        "1. A saída DEVE ser um objeto JSON válido, contendo uma única chave chamada 'flashcards'.",
        "2. O valor de 'flashcards' deve ser um array de objetos.",
        "3. Cada objeto no array deve ter as chaves: 'front' (para a pergunta), 'back' (para a resposta) e 'type' (um dos seguintes: 'concept', 'code', 'diagram', 'example', 'comparison').",
        "4. A pergunta em 'front' deve ser clara e única. NÃO crie duas perguntas no mesmo campo.",
        "5. A resposta em 'back' deve ser concisa e direta, respondendo apenas à pergunta do 'front'. EVITE respostas muito longas.",
        "6. NÃO inclua markdown (como `json` ou ```) no início ou no fim da sua resposta, apenas o objeto JSON puro.",
        "Exemplo de saída esperada:",
        """
        {
          "flashcards": [
            {
              "front": "Qual é o conceito principal abordado no texto?",
              "back": "O conceito principal é a aplicação de inteligência artificial para otimizar processos.",
              "type": "concept"
            },
            {
              "front": "Cite uma vantagem mencionada.",
              "back": "Uma vantagem é a redução de custos operacionais.",
              "type": "example"
            }
          ]
        }
        """,
    ]

    try:
        print(f"Enviando texto para o Gemini. Qtd: {num_flashcards}, Dificuldade: {difficulty}")
        # 🔽 ALTERAÇÃO AQUI: Adicionamos 'request_options' com um timeout 🔽
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 15.0} # Timeout de 15 segundos
        )

        # Limpeza básica da resposta para garantir que seja um JSON válido
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(cleaned_response_text)

        # Validação extra para garantir que a estrutura está correta
        if "flashcards" in data and isinstance(data["flashcards"], list):
            print("Flashcards gerados com sucesso pelo Gemini.")
            return data["flashcards"]
        else:
            print("Erro: A resposta da IA não continha a estrutura esperada ('flashcards' list).")
            # Relança o erro para o Celery capturar
            raise ValueError("Resposta da IA malformada.")

    except Exception as e:
        # Se ocorrer um erro (como timeout ou resposta malformada), registramos e relançamos.
        # A tarefa Celery que chama esta função será responsável por tratar o erro.
        print(f"Erro ao gerar flashcards: {e}")
        # Relança a exceção para que o Celery possa capturá-la e tentar novamente.
        raise e