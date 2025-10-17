# back/app/ai_generator.py
import os
import json
import time
from typing import List, Dict, Any, Optional
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
        model = genai.GenerativeModel('gemini-2.0-flash')
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
        model_name="gemini-2.0-flash",
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
        start = time.time()
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 60.0}  # Timeout de 60s
        )
        elapsed = time.time() - start
        print(f"⏱️ Tempo de resposta Gemini: {elapsed:.2f}s")

        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(cleaned_response_text)

        if "flashcards" in data and isinstance(data["flashcards"], list):
            print("✅ Flashcards gerados com sucesso pelo Gemini.")
            return data["flashcards"]
        else:
            print("❌ Erro: resposta da IA não continha a estrutura esperada ('flashcards').")
            raise ValueError("Resposta da IA malformada.")

    except Exception as e:
        print(f"🚨 Erro ao gerar flashcards: {type(e).__name__} - {e}")
        raise e
    
def generate_quiz_from_text(
    text: str, num_questions: int = 5, difficulty: str = "Médio"
) -> Optional[Dict[str, Any]]:
    """
    Gera um quiz de múltipla escolha a partir de um texto, seguindo o padrão da aplicação.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de quiz.")
        return None
        
    generation_config = {
        "temperature": 0.8, # Um pouco mais de criatividade para as alternativas
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
        model_name="gemini-2.0-flash", # Usando o mesmo modelo para consistência
        generation_config=generation_config,
        safety_settings=safety_settings,
    )
    
    difficulty_map = {
        "Fácil": "conceitos fundamentais e perguntas diretas.",
        "Médio": "conceitos intermediários que requerem aplicação de conhecimento.",
        "Difícil": "cenários complexos que exigem análise e raciocínio crítico."
    }
    difficulty_instruction = difficulty_map.get(difficulty, difficulty_map["Médio"])

    prompt_parts = [
        f"Você é um especialista em criar quizzes educacionais. Com base no texto fornecido, gere um quiz com exatamente {num_questions} perguntas de dificuldade {difficulty}, focando em {difficulty_instruction}",
        "O texto para análise é o seguinte:",
        text[:15000],
        "REGRAS ESTRITAS:",
        "1. A saída DEVE ser um único objeto JSON válido, contendo as chaves 'title' e 'questions'.",
        "2. 'questions' deve ser um array de objetos.",
        "3. Cada objeto de pergunta deve ter: 'text' (a pergunta) e 'answers' (um array de 5 objetos de resposta).",
        "4. Cada objeto de resposta deve ter: 'text' (a alternativa), 'is_correct' (booleano) e 'explanation' (uma breve explicação).",
        "5. EXATAMENTE UMA resposta em cada pergunta deve ter 'is_correct' como `true`.",
        "6. As alternativas incorretas devem ser plausíveis mas factualmente erradas com base no texto.",
        "7. NÃO inclua markdown (como `json` ou ```) na sua resposta. Apenas o JSON puro.",
        "Exemplo de saída esperada:",
        """
        {
          "title": "Quiz sobre o Texto",
          "questions": [
            {
              "text": "Qual é a capital de Portugal?",
              "answers": [
                {"text": "Porto", "is_correct": false, "explanation": "O Porto é a segunda maior cidade, mas não a capital."},
                {"text": "Lisboa", "is_correct": true, "explanation": "Correto, Lisboa é a capital de Portugal."},
                {"text": "Faro", "is_correct": false, "explanation": "Faro é a capital da região do Algarve, no sul."},
                {"text": "Coimbra", "is_correct": false, "explanation": "Coimbra é famosa pela sua universidade, mas não é a capital."},
                {"text": "Braga", "is_correct": false, "explanation": "Braga é um importante centro religioso, mas não a capital."}
              ]
            }
          ]
        }
        """,
    ]
    
    try:
        print(f"Enviando texto para o Gemini para gerar Quiz. Qtd: {num_questions}, Dificuldade: {difficulty}")
        start = time.time()
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 90.0} # Um pouco mais de tempo para a tarefa mais complexa
        )
        elapsed = time.time() - start
        print(f"⏱️ Tempo de resposta Gemini (Quiz): {elapsed:.2f}s")

        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(cleaned_response_text)

        # Validação básica da estrutura
        if "title" in data and "questions" in data and isinstance(data["questions"], list):
            print("✅ Quiz gerado com sucesso pelo Gemini.")
            return data
        else:
            print("❌ Erro: resposta da IA não continha a estrutura esperada ('title', 'questions').")
            raise ValueError("Resposta da IA malformada.")

    except Exception as e:
        print(f"🚨 Erro ao gerar quiz: {type(e).__name__} - {e}")
        # Em caso de erro, não paramos o processo, apenas não teremos um quiz.
        return None