# back/app/ai_generator.py
import os
import json
import time
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

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
    Gera flashcards otimizados: perguntas diretas e respostas concisas.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    generation_config = {
        "temperature": 0.7, "top_p": 1, "top_k": 1, "max_output_tokens": 8192,
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
        "Fácil": {
            "foco": "conceitos fundamentais e definições básicas",
            "pergunta": "diretas, objetivas, testam reconhecimento e memorização",
            "resposta": "definições claras, fatos diretos, exemplos simples",
            "exemplo": "O que é X? / Defina Y / Qual é a fórmula de Z?"
        },
        "Médio": {
            "foco": "aplicação prática e compreensão de conceitos",
            "pergunta": "exigem interpretação, comparação ou aplicação de conhecimento",
            "resposta": "explicações com contexto, relações entre conceitos, cálculos intermediários",
            "exemplo": "Como X se relaciona com Y? / Por que Z ocorre? / Calcule usando a fórmula..."
        },
        "Difícil": {
            "foco": "análise crítica, síntese e resolução de problemas complexos",
            "pergunta": "cenários multi-etapas, análise profunda, pensamento crítico",
            "resposta": "análises detalhadas, múltiplas variáveis, raciocínio avançado",
            "exemplo": "Analise o impacto de X em Y / Compare e contraste múltiplos cenários / Resolva problema complexo"
        }
    }
    difficulty_config = difficulty_map.get(difficulty, difficulty_map["Médio"])
    difficulty_instruction = f"{difficulty_config['foco']} - {difficulty_config['pergunta']}"

    # Prompt dinâmico otimizado
    if len(text.strip()) < 200:
        instruction = f"""Você é um especialista em criar flashcards educacionais EFICIENTES sobre '{text}'.
Crie {num_flashcards} flashcards de dificuldade {difficulty}, focando em {difficulty_instruction}."""
        
        prompt_parts = [
            instruction,
            "",
            "REGRAS CRÍTICAS PARA FLASHCARDS EFICIENTES:",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Respostas: {difficulty_config['resposta']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS (front):",
            "✓ UMA pergunta específica por flashcard (NUNCA duas ou mais perguntas juntas)",
            "✓ Perguntas claras, diretas e COMPLETAMENTE RESPONDÍVEIS com a resposta fornecida",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Se perguntar 'Compare A e B', a resposta DEVE mencionar AMBOS explicitamente",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Defina', 'Identifique', 'Analise'",
            "✓ Para comparações: use 'Qual a diferença entre...' EM VEZ DE 'Compare'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CONCISAS e OBJETIVAS (máximo 3-4 linhas)",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ A resposta deve RESPONDER COMPLETAMENTE a pergunta feita",
            "✓ Se a pergunta menciona dois conceitos, a resposta DEVE abordar AMBOS",
            "✓ Para cálculos: mostre o resultado e uma explicação breve (1-2 linhas)",
            "✓ Para comparações: mencione EXPLICITAMENTE as diferenças ou semelhanças",
            "✓ Use bullet points quando listar itens múltiplos",
            "✓ Evite parágrafos longos - quebre em frases curtas",
            "",
            "📌 QUALIDADE DO CONTEÚDO:",
            "✓ Perguntas que façam o usuário PENSAR (não decorar)",
            "✓ Balanceie teoria e aplicação prática",
            "✓ Inclua exemplos numéricos quando relevante",
            "✓ Varie os tipos de perguntas (conceito, cálculo, comparação, exemplo)",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ Estrutura: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\", \"type\": \"...\"}]}",
            "✓ Types válidos: 'concept', 'code', 'diagram', 'example', 'comparison'",
            "",
            "EXEMPLO DE BOA PRÁTICA:",
            """
{
  "flashcards": [
    {
      "front": "Qual a diferença entre conexões HTTP persistentes e não persistentes?",
      "back": "Persistentes: reutilizam mesma conexão TCP. Não persistentes: nova conexão para cada requisição.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "flashcards": [
    {
      "front": "Qual a principal vantagem das conexões HTTP persistentes sobre as não persistentes?",
      "back": "Reduzem latência ao reutilizar a mesma conexão TCP, evitando sobrecarga de estabelecer novas conexões.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "flashcards": [
    {
      "front": "Analise: Site recebe 1000 req/s. Migrar de HTTP não persistente para persistente reduz latência em quanto?",
      "back": "~60-70%. Elimina 3-way handshake TCP repetido. De ~150ms para ~50ms por requisição.",
      "type": "example"
    }
  ]
}
            """,
            "",
            "⚠️ EVITE:",
            "✗ Respostas com mais de 5 linhas",
            "✗ Múltiplas perguntas no mesmo 'front'",
            "✗ Perguntas genéricas como 'O que você sabe sobre X?'",
            "✗ Perguntas que mencionam conceito A e B, mas resposta só fala de A",
            "✗ Perguntas de comparação sem mencionar ambos os lados na resposta",
            "✗ Respostas que começam com 'Bem...', 'Basicamente...', 'É importante notar que...'",
            "✗ Respostas incompletas que não respondem totalmente a pergunta",
        ]
    else:
        instruction = f"""Com base no texto fornecido, gere {num_flashcards} flashcards EFICIENTES de dificuldade {difficulty}.
Foque em {difficulty_instruction}."""
        
        prompt_parts = [
            instruction,
            "",
            "TEXTO PARA ANÁLISE:",
            text[:15000],
            "",
            "REGRAS CRÍTICAS PARA FLASHCARDS EFICIENTES:",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Respostas: {difficulty_config['resposta']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS (front):",
            "✓ UMA pergunta específica por flashcard (NUNCA duas ou mais perguntas juntas)",
            "✓ Perguntas claras, diretas e COMPLETAMENTE RESPONDÍVEIS com a resposta fornecida",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Se perguntar 'Compare A e B', a resposta DEVE mencionar AMBOS explicitamente",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Defina', 'Identifique', 'Analise'",
            "✓ Para comparações: use 'Qual a diferença entre...' EM VEZ DE 'Compare'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CONCISAS e OBJETIVAS (máximo 3-4 linhas)",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ A resposta deve RESPONDER COMPLETAMENTE a pergunta feita",
            "✓ Se a pergunta menciona dois conceitos, a resposta DEVE abordar AMBOS",
            "✓ Para cálculos: mostre o resultado e uma explicação breve (1-2 linhas)",
            "✓ Para comparações: mencione EXPLICITAMENTE as diferenças ou semelhanças",
            "✓ Use bullet points quando listar itens múltiplos",
            "✓ Evite parágrafos longos - quebre em frases curtas",
            "",
            "📌 QUALIDADE DO CONTEÚDO:",
            "✓ Extraia os conceitos MAIS IMPORTANTES do texto",
            "✓ Perguntas que façam o usuário PENSAR (não decorar)",
            "✓ Balanceie teoria e aplicação prática",
            "✓ Inclua cálculos específicos quando o texto tiver dados numéricos",
            "✓ Varie os tipos de perguntas (conceito, cálculo, comparação, exemplo)",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ Estrutura: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\", \"type\": \"...\"}]}",
            "✓ Types válidos: 'concept', 'code', 'diagram', 'example', 'comparison'",
            "",
            "EXEMPLO DE BOA PRÁTICA:",
            """
{
  "flashcards": [
    {
      "front": "Qual a diferença entre fotossíntese C3 e C4?",
      "back": "C3: fixa CO₂ diretamente. C4: fixa CO₂ em duas etapas, mais eficiente em climas quentes.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "flashcards": [
    {
      "front": "Por que plantas C4 são mais eficientes que C3 em altas temperaturas?",
      "back": "C4 concentra CO₂ internamente, reduzindo fotorrespiração que aumenta com calor em C3.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "flashcards": [
    {
      "front": "Analise: Se temperatura subir de 25°C para 40°C, qual impacto em rendimento C3 vs C4?",
      "back": "C3: queda ~40% (fotorrespiração). C4: queda ~10% (mecanismo concentrador protege).",
      "type": "example"
    }
  ]
}
            """,
            "",
            "⚠️ EVITE:",
            "✗ Respostas com mais de 5 linhas",
            "✗ Múltiplas perguntas no mesmo 'front'",
            "✗ Perguntas genéricas como 'O que o texto fala sobre X?'",
            "✗ Perguntas que mencionam conceito A e B, mas resposta só fala de A",
            "✗ Perguntas de comparação sem mencionar ambos os lados na resposta",
            "✗ Respostas que começam com 'Bem...', 'Basicamente...', 'O texto menciona que...'",
            "✗ Copiar parágrafos inteiros do texto como resposta",
            "✗ Respostas incompletas que não respondem totalmente a pergunta",
        ]

    try:
        print(f"Enviando texto para o Gemini. Qtd: {num_flashcards}, Dificuldade: {difficulty}")
        start = time.time()
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 60.0}
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
    Gera quizzes otimizados com alternativas equilibradas e não previsíveis.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de quiz.")
        return None
        
    generation_config = {
        "temperature": 0.8, "top_p": 1, "top_k": 1, "max_output_tokens": 8192,
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
        "Fácil": {
            "foco": "conceitos fundamentais que podem ser respondidos com conhecimento básico",
            "pergunta": "diretas sobre fatos, definições e informações explícitas",
            "alternativa": "diferenças óbvias, erros claros e fáceis de identificar",
            "exemplo": "Qual é a capital? / Quem descobriu? / Em que ano ocorreu?"
        },
        "Médio": {
            "foco": "compreensão e aplicação de conceitos intermediários",
            "pergunta": "exigem interpretação, conexões lógicas e raciocínio",
            "alternativa": "distratores plausíveis que testam compreensão real",
            "exemplo": "Por que X causou Y? / Como funciona Z? / Qual é a relação entre...?"
        },
        "Difícil": {
            "foco": "análise crítica e conhecimento profundo",
            "pergunta": "cenários complexos, síntese de múltiplos conceitos, pensamento crítico",
            "alternativa": "distratores sofisticados que exigem análise cuidadosa",
            "exemplo": "Analise as implicações de... / Compare vantagens e desvantagens / Qual seria o resultado se...?"
        }
    }
    difficulty_config = difficulty_map.get(difficulty, difficulty_map["Médio"])
    difficulty_instruction = f"{difficulty_config['foco']} - {difficulty_config['pergunta']}"

    # Prompt dinâmico otimizado
    if len(text.strip()) < 200:
        instruction = f"""Você é um especialista em criar quizzes educacionais EFICIENTES sobre '{text}'.
Crie um quiz com {num_questions} perguntas de dificuldade {difficulty}, focando em {difficulty_instruction}."""
        
        prompt_parts = [
            instruction,
            "",
            "REGRAS CRÍTICAS PARA QUIZZES EFICIENTES E NÃO PREVISÍVEIS:",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Alternativas: {difficulty_config['alternativa']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS:",
            "✓ Perguntas CLARAS e RESPONDÍVEIS (não impossíveis ou ambíguas)",
            "✓ Máximo de 20-25 palavras por pergunta",
            "✓ Baseadas em conhecimento verificável, não opiniões",
            "✓ Desafiadoras mas justas - devem ter uma resposta definitivamente correta",
            "✓ Para cálculos: forneça todos os dados necessários",
            "",
            "📌 ALTERNATIVAS (ANTI-PADRÃO):",
            "✓ TODAS as 5 alternativas devem ter comprimento SIMILAR (10-15 palavras cada)",
            "✓ A resposta correta NÃO deve ser a mais longa ou detalhada",
            "✓ Alternativas incorretas também devem ser completas e bem escritas",
            "✓ Varie o TAMANHO: às vezes a correta é curta, às vezes é média",
            "✓ 1 resposta correta + 4 incorretas IGUALMENTE PLAUSÍVEIS",
            "✓ Incorretas devem ser verossímeis mas factualmente erradas",
            "✓ Evite alternativas tipo 'Todas as anteriores' ou 'Nenhuma das anteriores'",
            "✓ NUNCA use padrões: varie a posição da resposta correta (A, B, C, D ou E)",
            "",
            "📌 EXPLICAÇÕES:",
            "✓ Explicações BREVES (máximo 2-3 linhas)",
            "✓ Justifique POR QUE a resposta está correta",
            "✓ Para incorretas: explique o erro de forma concisa",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ EXATAMENTE 1 resposta com 'is_correct': true por pergunta",
            "✓ Estrutura: {\"title\": \"...\", \"questions\": [{\"text\": \"...\", \"answers\": [...]}]}",
            "",
            "EXEMPLO DE BOA PRÁTICA (ALTERNATIVAS EQUILIBRADAS):",
            """
{
  "title": "Quiz sobre Capitais",
  "questions": [
    {
      "text": "Qual é a capital do Brasil?",
      "answers": [
        {"text": "São Paulo, centro econômico do país", "is_correct": false, "explanation": "São Paulo é a maior cidade, mas não a capital."},
        {"text": "Rio de Janeiro, antiga capital", "is_correct": false, "explanation": "Foi capital até 1960, quando Brasília foi inaugurada."},
        {"text": "Brasília", "is_correct": true, "explanation": "Brasília é a capital federal desde 1960."},
        {"text": "Salvador, primeira capital brasileira", "is_correct": false, "explanation": "Salvador foi a primeira capital do Brasil colonial."},
        {"text": "Belo Horizonte, capital de Minas", "is_correct": false, "explanation": "Belo Horizonte é capital de Minas Gerais, não do Brasil."}
      ]
    }
  ]
}
            """,
            "",
            "EXEMPLO RUIM (NÃO FAÇA ISSO):",
            """
{
  "questions": [
    {
      "text": "Qual é a capital do Brasil?",
      "answers": [
        {"text": "São Paulo", "is_correct": false},
        {"text": "Rio", "is_correct": false},
        {"text": "Brasília, inaugurada em 21 de abril de 1960 como a nova capital federal do Brasil, projetada por Oscar Niemeyer e Lúcio Costa", "is_correct": true},
        {"text": "Salvador", "is_correct": false},
        {"text": "BH", "is_correct": false}
      ]
    }
  ]
}
            """,
            "❌ PROBLEMAS: Resposta correta é 3x maior que as outras, fácil de adivinhar!",
            "",
            "⚠️ EVITE:",
            "✗ Resposta correta sendo a mais longa ou detalhada",
            "✗ Alternativas incorretas muito curtas ou incompletas",
            "✗ Padrões previsíveis (sempre B ou C corretas)",
            "✗ Alternativas com comprimentos muito diferentes",
            "✗ Perguntas impossíveis de responder sem consulta",
            "✗ Alternativas obviamente absurdas",
            "✗ Perguntas ambíguas com múltiplas interpretações",
            "✗ Explicações longas e prolixas",
        ]
    else:
        instruction = f"""Com base no texto fornecido, gere um quiz EFICIENTE com {num_questions} perguntas de dificuldade {difficulty}.
Foque em {difficulty_instruction}."""
        
        prompt_parts = [
            instruction,
            "",
            "TEXTO PARA ANÁLISE:",
            text[:15000],
            "",
            "REGRAS CRÍTICAS PARA QUIZZES EFICIENTES E NÃO PREVISÍVEIS:",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Alternativas: {difficulty_config['alternativa']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS:",
            "✓ Perguntas CLARAS e RESPONDÍVEIS baseadas NO TEXTO",
            "✓ Máximo de 20-25 palavras por pergunta",
            "✓ Baseadas em informações EXPLÍCITAS no texto",
            "✓ Desafiadoras mas justas - devem ter uma resposta definitivamente correta",
            "✓ Para cálculos: use dados do texto e forneça contexto completo",
            "",
            "📌 ALTERNATIVAS (ANTI-PADRÃO):",
            "✓ TODAS as 5 alternativas devem ter comprimento SIMILAR (10-15 palavras cada)",
            "✓ A resposta correta NÃO deve ser a mais longa ou detalhada",
            "✓ Alternativas incorretas também devem ser completas e bem escritas",
            "✓ Varie o TAMANHO: às vezes a correta é curta, às vezes é média",
            "✓ 1 resposta correta (baseada no texto) + 4 incorretas IGUALMENTE PLAUSÍVEIS",
            "✓ Incorretas devem parecer razoáveis mas serem factualmente erradas",
            "✓ Use informações próximas do texto para criar distratores críveis",
            "✓ NUNCA use padrões: varie a posição da resposta correta (A, B, C, D ou E)",
            "",
            "📌 EXPLICAÇÕES:",
            "✓ Explicações BREVES (máximo 2-3 linhas)",
            "✓ Referencie o texto quando possível: 'Segundo o texto...'",
            "✓ Para incorretas: explique o erro de forma concisa",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ EXATAMENTE 1 resposta com 'is_correct': true por pergunta",
            "✓ Estrutura: {\"title\": \"...\", \"questions\": [{\"text\": \"...\", \"answers\": [...]}]}",
            "",
            "EXEMPLO DE BOA PRÁTICA (ALTERNATIVAS EQUILIBRADAS):",
            """
{
  "title": "Quiz sobre o Texto",
  "questions": [
    {
      "text": "Segundo o texto, qual é a função principal do coração?",
      "answers": [
        {"text": "Filtrar impurezas do sangue", "is_correct": false, "explanation": "Essa é função dos rins."},
        {"text": "Produzir células vermelhas", "is_correct": false, "explanation": "Produção ocorre na medula óssea."},
        {"text": "Bombear sangue pelo corpo", "is_correct": true, "explanation": "O texto afirma que o coração bombeia sangue continuamente."},
        {"text": "Armazenar oxigênio para uso", "is_correct": false, "explanation": "Oxigênio é transportado, não armazenado."},
        {"text": "Regular temperatura corporal", "is_correct": false, "explanation": "Regulação térmica não é função cardíaca primária."}
      ]
    }
  ]
}
            """,
            "",
            "EXEMPLO RUIM (NÃO FAÇA ISSO):",
            """
{
  "questions": [
    {
      "text": "Qual a função do coração?",
      "answers": [
        {"text": "Filtrar", "is_correct": false},
        {"text": "Produzir", "is_correct": false},
        {"text": "Bombear sangue por todo o corpo humano através de contrações rítmicas e coordenadas que distribuem oxigênio e nutrientes", "is_correct": true},
        {"text": "Armazenar", "is_correct": false},
        {"text": "Regular", "is_correct": false}
      ]
    }
  ]
}
            """,
            "❌ PROBLEMAS: Resposta correta é 4x maior, outras são palavras únicas!",
            "",
            "⚠️ EVITE:",
            "✗ Resposta correta sendo a mais longa ou detalhada",
            "✗ Alternativas incorretas muito curtas ou incompletas",
            "✗ Padrões previsíveis (sempre B ou C corretas)",
            "✗ Alternativas com comprimentos muito diferentes",
            "✗ Perguntas sobre detalhes não mencionados no texto",
            "✗ Alternativas obviamente absurdas ou fora do contexto",
            "✗ Perguntas que exigem conhecimento externo ao texto",
            "✗ Explicações que simplesmente repetem a alternativa",
        ]

    try:
        print(f"Enviando texto para o Gemini para gerar Quiz. Qtd: {num_questions}, Dificuldade: {difficulty}")
        start = time.time()
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 90.0}
        )
        elapsed = time.time() - start
        print(f"⏱️ Tempo de resposta Gemini (Quiz): {elapsed:.2f}s")
        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "")
        data = json.loads(cleaned_response_text)
        if "title" in data and "questions" in data and isinstance(data["questions"], list):
            print("✅ Quiz gerado com sucesso pelo Gemini.")
            return data
        else:
            print("❌ Erro: resposta da IA não continha a estrutura esperada ('title', 'questions').")
            raise ValueError("Resposta da IA malformada.")
    except Exception as e:
        print(f"🚨 Erro ao gerar quiz: {type(e).__name__} - {e}")
        return None