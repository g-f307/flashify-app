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
            "✓ Perguntas claras, diretas e desafiadoras (evite perguntas óbvias)",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Compare', 'Identifique', 'Analise'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CONCISAS e OBJETIVAS (máximo 3-4 linhas)",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ Para cálculos: mostre o resultado e uma explicação breve (1-2 linhas)",
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
      "front": "Qual estrutura de dados usa LIFO (Last In, First Out)?",
      "back": "Stack (Pilha). O último elemento inserido é o primeiro a ser removido.",
      "type": "concept"
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "flashcards": [
    {
      "front": "Por que usar uma Stack em vez de uma Queue para validar parênteses balanceados?",
      "back": "Stack processa do fim para o início (LIFO), permitindo verificar pares mais recentes primeiro.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "flashcards": [
    {
      "front": "Analise: Sistema com 1000 req/s. Stack overflow em 500ms. Qual a profundidade máxima de recursão?",
      "back": "~500 chamadas. Cálculo: 1000 req/s ÷ 2 (500ms) = 500 operações antes do overflow.",
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
            "✗ Respostas que começam com 'Bem...', 'Basicamente...', 'É importante notar que...'",
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
            "✓ Perguntas claras, diretas e desafiadoras (evite perguntas óbvias)",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Compare', 'Identifique', 'Analise'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CONCISAS e OBJETIVAS (máximo 3-4 linhas)",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ Para cálculos: mostre o resultado e uma explicação breve (1-2 linhas)",
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
      "front": "Segundo o texto, o que é fotossíntese?",
      "back": "Processo que converte luz solar em energia química nas plantas.",
      "type": "concept"
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "flashcards": [
    {
      "front": "Como a temperatura afeta a taxa de fotossíntese mencionada no texto?",
      "back": "Aumenta até 30-35°C (ponto ótimo), depois diminui devido à desnaturação enzimática.",
      "type": "comparison"
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "flashcards": [
    {
      "front": "Analise: Se CO₂ aumentar 20% e luz cair 30%, qual impacto na fotossíntese segundo o texto?",
      "back": "Redução líquida ~15%. Luz é fator limitante mais crítico que CO₂ em condições normais.",
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
            "✗ Respostas que começam com 'Bem...', 'Basicamente...', 'O texto menciona que...'",
            "✗ Copiar parágrafos inteiros do texto como resposta",
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
    Gera quizzes otimizados: perguntas plausíveis e alternativas concisas.
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
            "REGRAS CRÍTICAS PARA QUIZZES EFICIENTES:",
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
            "📌 ALTERNATIVAS:",
            "✓ Cada alternativa com MÁXIMO de 15-20 palavras",
            "✓ Alternativas CONCISAS e diretas ao ponto",
            "✓ 1 resposta correta + 4 incorretas PLAUSÍVEIS (não absurdas)",
            "✓ Incorretas devem ser verossímeis mas factualmente erradas",
            "✓ Evite alternativas tipo 'Todas as anteriores' ou 'Nenhuma das anteriores'",
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
            "EXEMPLO DE BOA PRÁTICA:",
            """
{
  "title": "Quiz sobre Capitais",
  "questions": [
    {
      "text": "Qual é a capital do Brasil?",
      "answers": [
        {"text": "São Paulo", "is_correct": false, "explanation": "São Paulo é a maior cidade, mas não a capital."},
        {"text": "Rio de Janeiro", "is_correct": false, "explanation": "Foi capital até 1960, quando Brasília foi inaugurada."},
        {"text": "Brasília", "is_correct": true, "explanation": "Brasília é a capital federal desde 1960."},
        {"text": "Salvador", "is_correct": false, "explanation": "Salvador foi a primeira capital do Brasil colonial."},
        {"text": "Belo Horizonte", "is_correct": false, "explanation": "Belo Horizonte é capital de Minas Gerais, não do Brasil."}
      ]
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "title": "Quiz sobre Geografia Política",
  "questions": [
    {
      "text": "Por que Brasília foi construída no Planalto Central?",
      "answers": [
        {"text": "Clima favorável", "is_correct": false, "explanation": "Clima não foi o fator determinante da localização."},
        {"text": "Integração nacional e desenvolvimento do interior", "is_correct": true, "explanation": "Objetivo era descentralizar o poder e integrar regiões."},
        {"text": "Proximidade com grandes centros", "is_correct": false, "explanation": "Na verdade, foi afastada dos grandes centros propositalmente."},
        {"text": "Recursos naturais abundantes", "is_correct": false, "explanation": "Recursos não foram critério principal."},
        {"text": "Pressão de movimentos sociais", "is_correct": false, "explanation": "Foi decisão governamental de planejamento estratégico."}
      ]
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "title": "Quiz sobre Planejamento Urbano",
  "questions": [
    {
      "text": "Analise o impacto do plano piloto de Brasília na segregação socioespacial atual.",
      "answers": [
        {"text": "Eliminou desigualdades urbanas", "is_correct": false, "explanation": "Segregação persiste nas cidades satélites."},
        {"text": "Criou modelo replicável nacionalmente", "is_correct": false, "explanation": "Modelo mostrou-se pouco adaptável a outras realidades."},
        {"text": "Concentrou elite no Plano Piloto, periferizando classes baixas", "is_correct": true, "explanation": "Design modernista acabou reforçando segregação espacial."},
        {"text": "Não afetou estrutura social", "is_correct": false, "explanation": "Planejamento urbano tem impacto direto na organização social."},
        {"text": "Resolveu problemas de moradia", "is_correct": false, "explanation": "Déficit habitacional persiste nas áreas periféricas."}
      ]
    }
  ]
}
            """,
            "",
            "⚠️ EVITE:",
            "✗ Perguntas impossíveis de responder sem consulta",
            "✗ Alternativas com mais de 2 linhas",
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
            "REGRAS CRÍTICAS PARA QUIZZES EFICIENTES:",
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
            "📌 ALTERNATIVAS:",
            "✓ Cada alternativa com MÁXIMO de 15-20 palavras",
            "✓ Alternativas CONCISAS e diretas ao ponto",
            "✓ 1 resposta correta (baseada no texto) + 4 incorretas PLAUSÍVEIS",
            "✓ Incorretas devem parecer razoáveis mas serem factualmente erradas",
            "✓ Use informações próximas do texto para criar distratores críveis",
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
            "EXEMPLO DE BOA PRÁTICA:",
            """
{
  "title": "Quiz sobre o Texto",
  "questions": [
    {
      "text": "Segundo o texto, qual é a função principal do coração?",
      "answers": [
        {"text": "Filtrar o sangue", "is_correct": false, "explanation": "Essa é função dos rins."},
        {"text": "Produzir hemácias", "is_correct": false, "explanation": "Produção ocorre na medula óssea."},
        {"text": "Bombear sangue para o corpo", "is_correct": true, "explanation": "O texto afirma que o coração bombeia sangue continuamente."},
        {"text": "Armazenar oxigênio", "is_correct": false, "explanation": "Oxigênio é transportado, não armazenado."},
        {"text": "Regular temperatura corporal", "is_correct": false, "explanation": "Regulação térmica não é função cardíaca primária."}
      ]
    }
  ]
}
            """ if difficulty == "Fácil" else """
{
  "title": "Quiz sobre o Texto",
  "questions": [
    {
      "text": "Como o texto explica a relação entre frequência cardíaca e exercício físico?",
      "answers": [
        {"text": "Exercício não altera frequência", "is_correct": false, "explanation": "O texto menciona aumento durante atividade física."},
        {"text": "Aumenta proporcionalmente à demanda de oxigênio", "is_correct": true, "explanation": "Texto explica que coração acelera para suprir necessidade muscular."},
        {"text": "Diminui para economizar energia", "is_correct": false, "explanation": "Oposto do que ocorre durante exercício."},
        {"text": "Mantém-se constante", "is_correct": false, "explanation": "Contradiz informação do texto sobre adaptação cardíaca."},
        {"text": "Depende apenas da temperatura", "is_correct": false, "explanation": "Texto não atribui mudança somente à temperatura."}
      ]
    }
  ]
}
            """ if difficulty == "Médio" else """
{
  "title": "Quiz sobre o Texto",
  "questions": [
    {
      "text": "Analise: Se o texto indica FC máxima = 220-idade, qual impacto em treino de atleta de 40 anos?",
      "answers": [
        {"text": "Deve treinar sempre em FC máxima", "is_correct": false, "explanation": "Treino em máxima não é sustentável nem recomendado."},
        {"text": "FC máxima de 180bpm define zonas de treino", "is_correct": true, "explanation": "Cálculo: 220-40=180. Zonas são % dessa máxima."},
        {"text": "Idade não importa para atletas", "is_correct": false, "explanation": "Contradiz fórmula apresentada no texto."},
        {"text": "Deve evitar qualquer exercício", "is_correct": false, "explanation": "Texto não sugere restrição, apenas cálculo de limites."},
        {"text": "Pode exceder 220bpm regularmente", "is_correct": false, "explanation": "Fórmula indica limite teórico máximo seguro."}
      ]
    }
  ]
}
            """,
            "",
            "⚠️ EVITE:",
            "✗ Perguntas sobre detalhes não mencionados no texto",
            "✗ Alternativas com mais de 2 linhas",
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