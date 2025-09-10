# back/app/ai_generator.py
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

def chat_about_flashcard(
    message: str, 
    flashcard_front: str, 
    flashcard_back: str, 
    document_context: str,
    conversation_history: list[dict] = None
) -> str:
    # ... (esta função permanece a mesma) ...
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
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Desculpe, ocorreu um erro ao processar sua pergunta: {e}"

def generate_flashcards_from_text(text: str, num_flashcards: int = 10, difficulty: str = "Médio") -> list[dict]:
    """
    Usa o modelo Gemini do Google para gerar flashcards a partir de um texto,
    com controle de quantidade e dificuldade.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    difficulty_map = {
        "Fácil": "conceitos fundamentais e perguntas diretas.",
        "Médio": "conceitos intermediários, com exemplos práticos e comparações.",
        "Difícil": "conceitos avançados, detalhes técnicos, cenários complexos e perguntas que exigem raciocínio."
    }
    difficulty_instruction = difficulty_map.get(difficulty, difficulty_map["Médio"])

    prompt = f"""
    Você é um assistente especialista em criar materiais de estudo.
    Sua tarefa é ler o texto fornecido e gerar um conjunto de flashcards.
    INSTRUÇÕES IMPORTANTES:
    1. GERE EXATAMENTE {num_flashcards} flashcards.
    2. NÍVEL DE DIFICULDADE: {difficulty}. Foque em {difficulty_instruction}
    3. Use o documento como BASE, mas expanda com seu conhecimento.
    4. Crie exemplos práticos, códigos, ou diagramas quando relevante.
    5. Diversifique os tipos de pergunta: definições, aplicações, comparações, exemplos.
    FORMATO DE RESPOSTA:
    Responda APENAS em formato JSON com uma lista de objetos. Cada flashcard deve ter:
    - "front": A pergunta
    - "back": A resposta completa
    - "type": Tipo do flashcard ("concept", "code", "diagram", "example", "comparison")
    Texto para análise:
    ---
    {text[:15000]}
    """

    try:
        print(f"Enviando texto para o Gemini. Qtd: {num_flashcards}, Dificuldade: {difficulty}")
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)

        json_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(json_text)

        # --- A CORREÇÃO ESTÁ AQUI ---
        # Verifica se 'data' é um dicionário e contém a chave 'flashcards'
        if isinstance(data, dict) and 'flashcards' in data:
            flashcards = data.get('flashcards', [])
        # Se 'data' já for uma lista, usa diretamente
        elif isinstance(data, list):
            flashcards = data
        else:
            flashcards = []
        
        print("Flashcards gerados com sucesso pelo Gemini.")
        return flashcards

    except Exception as e:
        print(f"Ocorreu um erro ao chamar a API do Google Gemini: {e}")
        return []