# back/app/ai_generator.py
import os
import ast
import json
import time
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GOOGLE_API_KEY:
    raise ValueError("A variável de ambiente GOOGLE_API_KEY não foi configurada.")

genai.configure(api_key=GOOGLE_API_KEY)

DEFAULT_SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

_MODEL_CACHE: dict[tuple[str, str], genai.GenerativeModel] = {}


def _get_model(
    *,
    temperature: float,
    max_output_tokens: int = 8192,
    response_mime_type: Optional[str] = None,
) -> genai.GenerativeModel:
    cache_key = (f"{temperature}:{max_output_tokens}", response_mime_type or "")
    cached_model = _MODEL_CACHE.get(cache_key)
    if cached_model is not None:
        return cached_model

    generation_config: dict[str, Any] = {
        "temperature": temperature,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": max_output_tokens,
    }
    if response_mime_type:
        generation_config["response_mime_type"] = response_mime_type

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        generation_config=generation_config,
        safety_settings=DEFAULT_SAFETY_SETTINGS,
    )
    _MODEL_CACHE[cache_key] = model
    return model


def _normalize_text_snippet(text: str, max_chars: int) -> str:
    return " ".join((text or "").split())[:max_chars]


def _normalize_rich_text(text: Any) -> str:
    normalized = str(text or "").replace("\r\n", "\n").replace("\r", "\n")
    return normalized.strip()


def _count_words(text: str) -> int:
    return len([token for token in (text or "").replace("\n", " ").split(" ") if token.strip()])


def _get_flashcard_length_limits(difficulty: str) -> tuple[int, int]:
    if difficulty == "Fácil":
        return 20, 32
    if difficulty == "Difícil":
        return 28, 55
    return 24, 42


def _is_flashcard_concise(
    front: str,
    back: str,
    difficulty: str,
    *,
    relaxed: bool = False,
) -> bool:
    max_front_words, max_back_words = _get_flashcard_length_limits(difficulty)
    if relaxed:
        max_front_words += 8
        max_back_words += 20

    front_words = _count_words(front)
    back_words = _count_words(back)

    if front_words > max_front_words or back_words > max_back_words:
        return False

    if front.count("?") > 1:
        return False

    # Evita cards que parecem uma mini-aula com listas longas demais.
    if back.count("<li>") > (5 if relaxed else 4):
        return False

    return True


def _compact_flashcard_payload(flashcards: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "front": _normalize_text_snippet(item.get("front", ""), 140),
            "back": _normalize_text_snippet(item.get("back", ""), 220),
        }
        for item in flashcards[:limit]
    ]


def _compact_question_payload(questions: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    return [
        {
            "id": item["id"],
            "text": _normalize_text_snippet(item.get("text", ""), 180),
        }
        for item in questions[:limit]
    ]


def _build_guided_study_prompt_parts(
    *,
    context_snippet: str,
    flashcards_payload: List[Dict[str, Any]],
    questions_payload: List[Dict[str, Any]],
    compact: bool,
) -> List[str]:
    prompt_parts = [
        "Você é um especialista em design instrucional universitário.",
        "Organize APENAS os IDs já existentes em tópicos pedagógicos.",
        "Retorne somente JSON válido.",
        "",
        "REGRAS OBRIGATÓRIAS:",
        "- Use somente os IDs fornecidos.",
        "- Não invente IDs, títulos extras ou campos extras.",
        "- Cada tópico deve ter pelo menos 1 flashcard_id e 1 question_id.",
        "- Cada ID pode aparecer no máximo uma vez.",
        "- Prefira menos tópicos, mais coesos.",
        '- Responda exatamente no formato: {"topics":[{"title":"...", "flashcard_ids":[1,2], "question_ids":[10]}]}',
        "",
        "TÍTULOS:",
        "- 2 a 4 palavras.",
        "- Específicos ao conteúdo.",
        "- Sem perguntas e sem 'Tópico X'.",
        "",
    ]

    if context_snippet:
        prompt_parts.extend([
            "CONTEXTO:",
            context_snippet,
            "",
        ])

    prompt_parts.extend([
        "FLASHCARDS:",
        json.dumps(flashcards_payload, ensure_ascii=False),
        "",
        "PERGUNTAS:",
        json.dumps(questions_payload, ensure_ascii=False),
    ])

    if compact:
        prompt_parts.extend([
            "",
            "IMPORTANTE:",
            "- Se estiver em dúvida, agrupe por afinidade semântica básica.",
            "- JSON puro, sem markdown.",
        ])
    else:
        prompt_parts.extend([
            "",
            "OBJETIVO PEDAGÓGICO:",
            "- Começar do básico e avançar para aplicação.",
            "- Manter equilíbrio entre introdução e validação.",
            "",
            "EQUILÍBRIO:",
            "- Cada tópico deve ter entre 2 e 5 flashcard_ids.",
            "- Cada tópico deve ter entre 1 e 3 question_ids.",
            "- Prefira 2 a 4 tópicos; no máximo 6.",
            "- Distribua os itens proporcionalmente.",
            "",
            "IMPORTANTE:",
            "- Cubra os IDs mais relacionados entre si.",
            "- JSON puro, sem markdown.",
        ])

    return prompt_parts


def _extract_json_object(text: str) -> str:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        return text
    return text[start:end + 1]


def _parse_jsonish_object(raw_text: str) -> Dict[str, Any]:
    cleaned_text = (raw_text or "").strip().replace("```json", "").replace("```", "")
    candidates = [cleaned_text, _extract_json_object(cleaned_text)]

    for candidate in candidates:
        candidate = candidate.strip()
        if not candidate:
            continue

        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

        try:
            data = ast.literal_eval(candidate)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    raise json.JSONDecodeError("Não foi possível interpretar o JSON retornado pela IA.", cleaned_text, 0)


def _extract_response_text(response: Any) -> str:
    direct_text = getattr(response, "text", None)
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text

    candidates = getattr(response, "candidates", None) or []
    text_parts: list[str] = []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                text_parts.append(part_text)

    return "\n".join(text_parts).strip()


def _normalize_flashcards(
    raw_flashcards: Any,
    requested_count: int,
    difficulty: str,
    *,
    relaxed: bool = False,
    existing_fronts: Optional[set[str]] = None,
) -> List[Dict[str, Any]]:
    if not isinstance(raw_flashcards, list):
        return []

    normalized: List[Dict[str, Any]] = []
    seen_fronts: set[str] = set(existing_fronts or set())

    for item in raw_flashcards:
        if not isinstance(item, dict):
            continue

        front = _normalize_rich_text(item.get("front", ""))
        back = _normalize_rich_text(item.get("back", ""))
        raw_type = str(item.get("type", "concept")).strip().lower() or "concept"

        if not front or not back:
            continue

        if not _is_flashcard_concise(front, back, difficulty, relaxed=relaxed):
            continue

        dedupe_key = front.casefold()
        if dedupe_key in seen_fronts:
            continue

        seen_fronts.add(dedupe_key)
        normalized.append(
            {
                "front": front,
                "back": back,
                "type": raw_type,
            }
        )

        if len(normalized) >= requested_count:
            break

    return normalized


def _merge_flashcard_batches(
    base_flashcards: List[Dict[str, Any]],
    incoming_flashcards: List[Dict[str, Any]],
    requested_count: int,
    difficulty: str,
    *,
    relaxed: bool = False,
) -> List[Dict[str, Any]]:
    return _normalize_flashcards(
        base_flashcards + incoming_flashcards,
        requested_count,
        difficulty,
        relaxed=relaxed,
    )


def _normalize_quiz_questions(raw_questions: Any, requested_count: int) -> List[Dict[str, Any]]:
    if not isinstance(raw_questions, list):
        return []

    normalized: List[Dict[str, Any]] = []
    seen_prompts: set[str] = set()

    for item in raw_questions:
        if not isinstance(item, dict):
            continue

        question_text = " ".join(str(item.get("text", "")).split()).strip()
        if not question_text:
            continue

        dedupe_key = question_text.casefold()
        if dedupe_key in seen_prompts:
            continue

        raw_answers = item.get("answers", [])
        if not isinstance(raw_answers, list):
            continue

        normalized_answers: List[Dict[str, Any]] = []
        correct_count = 0

        for answer in raw_answers:
            if not isinstance(answer, dict):
                continue

            answer_text = " ".join(str(answer.get("text", "")).split()).strip()
            if not answer_text:
                continue

            is_correct = bool(answer.get("is_correct", False))
            if is_correct:
                correct_count += 1

            normalized_answers.append(
                {
                    "text": answer_text,
                    "is_correct": is_correct,
                    "explanation": " ".join(str(answer.get("explanation", "")).split()).strip() or None,
                }
            )

        if len(normalized_answers) != 5 or correct_count != 1:
            continue

        seen_prompts.add(dedupe_key)
        normalized.append(
            {
                "text": question_text,
                "answers": normalized_answers,
            }
        )

        if len(normalized) >= requested_count:
            break

    return normalized

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
        for entry in conversation_history[-3:]:
            user_text = _normalize_text_snippet(entry.get("user", ""), 220)
            assistant_text = _normalize_text_snippet(entry.get("assistant", ""), 420)
            history_text += f"Usuário: {user_text}\nAssistente: {assistant_text}\n\n"

    context_snippet = _normalize_text_snippet(document_context, 1800) if document_context else ""

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
        model = _get_model(temperature=0.45, max_output_tokens=4096)
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        return f"Desculpe, ocorreu um erro ao processar sua pergunta: {e}"

# --- Função nova e melhorada ---
def generate_flashcards_from_text(
    text: str,
    num_flashcards: int = 10,
    difficulty: str = "Médio",
    _attempt: int = 0,
    _allow_completion: bool = True,
    _existing_fronts: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Gera flashcards com formatação rica, foco pedagógico e compatibilidade com conteúdo técnico.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    model = _get_model(temperature=0.7, max_output_tokens=8192)
    
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
    existing_fronts = [front.strip() for front in (_existing_fronts or []) if front and front.strip()]
    relaxed_mode = _attempt > 0

    # Prompt dinâmico otimizado
    if len(text.strip()) < 200:
        instruction = f"""Você é um especialista em criar flashcards educacionais EFICIENTES sobre '{text}'.
Crie {num_flashcards} flashcards de dificuldade {difficulty}, focando em {difficulty_instruction}."""
        
        prompt_parts = [
            instruction,
            "",
            "REGRAS CRÍTICAS PARA FLASHCARDS EFICIENTES:",
            "",
            f"📦 META DE ENTREGA: produza exatamente {num_flashcards} flashcards VÁLIDOS, distintos e utilizáveis.",
            "✓ Sua prioridade operacional é atingir a quantidade pedida sem repetir ideias.",
            "✓ Se houver tensão entre elegância e cobertura, priorize cobertura correta e objetiva.",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Respostas: {difficulty_config['resposta']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS (front):",
            "✓ Pense em flashcards como ferramenta de MEMORIZAÇÃO RÁPIDA, não como mini-capítulos",
            "✓ UM conceito, fato, relação ou cálculo por card",
            "✓ UMA pergunta específica por flashcard (NUNCA duas ou mais perguntas juntas)",
            "✓ Perguntas claras, diretas e COMPLETAMENTE RESPONDÍVEIS com a resposta fornecida",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Se perguntar 'Compare A e B', a resposta DEVE mencionar AMBOS explicitamente",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Defina', 'Identifique', 'Analise'",
            "✓ Para comparações: use 'Qual a diferença entre...' EM VEZ DE 'Compare'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "✓ Pode usar HTML semântico leve para formatação: <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <p>",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CURTAS para revisão rápida",
            "✓ Regra principal: a resposta deve caber em leitura de poucos segundos",
            "✓ Prefira 1 frase curta ou no máximo 2 bullet points curtos",
            "✓ Máximo ideal de 35 palavras na resposta; só passe disso se for estritamente necessário",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ A resposta deve RESPONDER COMPLETAMENTE a pergunta feita",
            "✓ Se a pergunta menciona dois conceitos, a resposta DEVE abordar AMBOS",
            "✓ Para cálculos: mostre o resultado e uma explicação MUITO breve (1 linha ou 2 passos curtos)",
            "✓ Para comparações: mencione EXPLICITAMENTE as diferenças ou semelhanças",
            "✓ Use bullet points apenas quando realmente precisar listar itens múltiplos",
            "✓ Prefira HTML semântico leve para formatação: <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <p>",
            "✓ Para fórmulas inline use \\(...\\) e para fórmulas em bloco use $$...$$",
            "✓ Preserve quebras de linha entre passos de resolução, listas e observações",
            "✓ Evite parágrafos longos e explicações em tom de aula",
            "",
            "📌 QUALIDADE DO CONTEÚDO:",
            "✓ Perguntas que façam o usuário PENSAR (não decorar)",
            "✓ Balanceie teoria e aplicação prática",
            "✓ Inclua exemplos numéricos quando relevante",
            "✓ Para áreas como matemática, física, química e engenharia, escreva a notação técnica correta",
            "✓ Varie os tipos de perguntas (conceito, cálculo, comparação, exemplo)",
            "✓ Cada flashcard deve cobrir um ponto DIFERENTE do conteúdo",
            "✓ Não repita o mesmo conceito com outra redação",
            "✓ Se o conteúdo parecer homogêneo, explore definições, aplicações, comparações, exemplos, erros comuns e interpretações",
            "✓ Se uma ideia exigir resposta longa, DIVIDA em 2 ou mais flashcards menores",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ Estrutura: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\", \"type\": \"...\"}]}",
            "✓ Types válidos: 'concept', 'code', 'diagram', 'example', 'comparison'",
            "✓ Dentro de front/back preserve HTML semântico leve e delimitadores LaTeX como texto normal escapado em JSON",
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
            "✗ HTML complexo, estilos inline ou scripts",
            "✗ Múltiplas perguntas no mesmo 'front'",
            "✗ Perguntas genéricas como 'O que você sabe sobre X?'",
            "✗ Flashcards que funcionam como resumo de parágrafo",
            "✗ Respostas com mais de 3 frases",
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
            f"📦 META DE ENTREGA: produza exatamente {num_flashcards} flashcards VÁLIDOS, distintos e utilizáveis.",
            "✓ Sua prioridade operacional é atingir a quantidade pedida sem repetir ideias.",
            "✓ Se houver tensão entre elegância e cobertura, priorize cobertura correta e objetiva.",
            "",
            f"🎯 NÍVEL DE DIFICULDADE: {difficulty.upper()}",
            f"   Foco: {difficulty_config['foco']}",
            f"   Perguntas: {difficulty_config['pergunta']}",
            f"   Respostas: {difficulty_config['resposta']}",
            f"   Exemplo: {difficulty_config['exemplo']}",
            "",
            "📌 PERGUNTAS (front):",
            "✓ Pense em flashcards como ferramenta de MEMORIZAÇÃO RÁPIDA, não como mini-capítulos",
            "✓ UM conceito, fato, relação ou cálculo por card",
            "✓ UMA pergunta específica por flashcard (NUNCA duas ou mais perguntas juntas)",
            "✓ Perguntas claras, diretas e COMPLETAMENTE RESPONDÍVEIS com a resposta fornecida",
            "✓ Máximo de 15-20 palavras por pergunta",
            "✓ Se perguntar 'Compare A e B', a resposta DEVE mencionar AMBOS explicitamente",
            "✓ Use verbos de ação: 'Explique', 'Calcule', 'Defina', 'Identifique', 'Analise'",
            "✓ Para comparações: use 'Qual a diferença entre...' EM VEZ DE 'Compare'",
            "✓ Para cálculos: forneça valores específicos e peça o resultado",
            "✓ Pode usar HTML semântico leve com moderação para termos-chave e estrutura",
            "",
            "📌 RESPOSTAS (back):",
            "✓ Respostas CURTAS para revisão rápida",
            "✓ Regra principal: a resposta deve caber em leitura de poucos segundos",
            "✓ Prefira 1 frase curta ou no máximo 2 bullet points curtos",
            "✓ Máximo ideal de 35 palavras na resposta; só passe disso se for estritamente necessário",
            "✓ Vá direto ao ponto - sem introduções desnecessárias",
            "✓ A resposta deve RESPONDER COMPLETAMENTE a pergunta feita",
            "✓ Se a pergunta menciona dois conceitos, a resposta DEVE abordar AMBOS",
            "✓ Para cálculos: mostre o resultado e uma explicação MUITO breve (1 linha ou 2 passos curtos)",
            "✓ Para comparações: mencione EXPLICITAMENTE as diferenças ou semelhanças",
            "✓ Use bullet points apenas quando realmente precisar listar itens múltiplos",
            "✓ Prefira HTML semântico leve para formatação: <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <code>, <pre>, <p>",
            "✓ Para fórmulas inline use \\(...\\) e para fórmulas em bloco use $$...$$",
            "✓ Preserve quebras de linha entre passos de derivação, resolução e observações",
            "✓ Evite parágrafos longos e explicações em tom de aula",
            "",
            "📌 QUALIDADE DO CONTEÚDO:",
            "✓ Extraia os conceitos MAIS IMPORTANTES do texto",
            "✓ Perguntas que façam o usuário PENSAR (não decorar)",
            "✓ Balanceie teoria e aplicação prática",
            "✓ Inclua cálculos específicos quando o texto tiver dados numéricos",
            "✓ Para disciplinas técnicas, mantenha símbolos, subscritos/sobrescritos em notação LaTeX",
            "✓ Varie os tipos de perguntas (conceito, cálculo, comparação, exemplo)",
            "✓ Cada flashcard deve cobrir um ponto DIFERENTE do texto",
            "✓ Não repita o mesmo conceito com outra redação",
            "✓ Se um trecho for muito parecido com outro, avance para aplicações, consequências, comparações, exemplos ou erros comuns",
            "✓ Se uma ideia exigir resposta longa, DIVIDA em 2 ou mais flashcards menores",
            "",
            "📌 FORMATO JSON:",
            "✓ Saída APENAS em JSON puro (sem markdown ```json)",
            "✓ Estrutura: {\"flashcards\": [{\"front\": \"...\", \"back\": \"...\", \"type\": \"...\"}]}",
            "✓ Types válidos: 'concept', 'code', 'diagram', 'example', 'comparison'",
            "✓ Dentro de front/back preserve HTML semântico leve e delimitadores LaTeX como texto normal escapado em JSON",
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
            "✗ HTML complexo, estilos inline ou scripts",
            "✗ Múltiplas perguntas no mesmo 'front'",
            "✗ Perguntas genéricas como 'O que o texto fala sobre X?'",
            "✗ Flashcards que funcionam como resumo de parágrafo",
            "✗ Respostas com mais de 3 frases",
            "✗ Perguntas que mencionam conceito A e B, mas resposta só fala de A",
            "✗ Perguntas de comparação sem mencionar ambos os lados na resposta",
            "✗ Respostas que começam com 'Bem...', 'Basicamente...', 'O texto menciona que...'",
            "✗ Copiar parágrafos inteiros do texto como resposta",
            "✗ Respostas incompletas que não respondem totalmente a pergunta",
        ]

    try:
        if existing_fronts:
            prompt_parts.extend([
                "",
                "FLASHCARDS JÁ GERADOS (NÃO REPETIR NEM PARAFRASEAR):",
                json.dumps(existing_fronts[:30], ensure_ascii=False),
                "",
                "Gere SOMENTE flashcards novos que complementem os já listados acima.",
                "Entregue exatamente a quantidade restante pedida nesta chamada.",
                "Se o conteúdo principal já foi coberto, avance para exemplos, aplicações, comparações, interpretações e erros comuns.",
            ])

        if relaxed_mode:
            prompt_parts.extend([
                "",
                "AJUSTE DE COMPLEMENTO:",
                "- Você está gerando apenas os cards restantes de um conjunto maior.",
                "- Priorize cobrir lacunas do conteúdo ainda não exploradas.",
                "- Mantenha objetividade, mas aceite respostas levemente mais completas se isso evitar descarte por insuficiência.",
                "- Não devolva menos itens por excesso de perfeccionismo: complete a cobertura com precisão prática.",
            ])

        print(f"Enviando texto para o Gemini. Qtd: {num_flashcards}, Dificuldade: {difficulty}")
        start = time.time()
        response = model.generate_content(
            prompt_parts,
            request_options={"timeout": 60.0}
        )
        elapsed = time.time() - start
        print(f"⏱️ Tempo de resposta Gemini: {elapsed:.2f}s")
        data = _parse_jsonish_object(response.text)
        if "flashcards" in data and isinstance(data["flashcards"], list):
            normalized_flashcards = _normalize_flashcards(
                data["flashcards"],
                num_flashcards,
                difficulty,
                relaxed=relaxed_mode,
                existing_fronts=set(front.casefold() for front in existing_fronts),
            )
            if len(normalized_flashcards) < num_flashcards and _allow_completion:
                max_completion_attempts = 3
                completion_attempt = 0

                while len(normalized_flashcards) < num_flashcards and completion_attempt < max_completion_attempts:
                    missing_count = num_flashcards - len(normalized_flashcards)
                    print(
                        f"⚠️ Gemini retornou {len(normalized_flashcards)}/{num_flashcards} flashcards válidos. "
                        f"Tentando completar {missing_count}. (passo complementar {completion_attempt + 1}/{max_completion_attempts})"
                    )
                    supplemental_flashcards = generate_flashcards_from_text(
                        text=text,
                        num_flashcards=missing_count,
                        difficulty=difficulty,
                        _attempt=_attempt + completion_attempt + 1,
                        _allow_completion=False,
                        _existing_fronts=[card["front"] for card in normalized_flashcards],
                    )
                    normalized_flashcards = _merge_flashcard_batches(
                        normalized_flashcards,
                        supplemental_flashcards,
                        num_flashcards,
                        difficulty,
                        relaxed=True,
                    )
                    completion_attempt += 1

            if len(normalized_flashcards) == num_flashcards:
                print(f"✅ Flashcards gerados com sucesso pelo Gemini ({len(normalized_flashcards)}/{num_flashcards}).")
            else:
                print(f"⚠️ Geração parcial de flashcards ({len(normalized_flashcards)}/{num_flashcards}).")
            return normalized_flashcards
        else:
            print("❌ Erro: resposta da IA não continha a estrutura esperada ('flashcards').")
            raise ValueError("Resposta da IA malformada.")
    except Exception as e:
        print(f"🚨 Erro ao gerar flashcards: {type(e).__name__} - {e}")
        raise e

def generate_quiz_from_text(
    text: str,
    num_questions: int = 5,
    difficulty: str = "Médio",
    _attempt: int = 0,
) -> Optional[Dict[str, Any]]:
    """
    Gera quizzes otimizados com alternativas equilibradas e não previsíveis.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de quiz.")
        return None
        
    model = _get_model(temperature=0.8, max_output_tokens=8192)
    
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
        data = _parse_jsonish_object(response.text)
        if "title" in data and "questions" in data and isinstance(data["questions"], list):
            normalized_questions = _normalize_quiz_questions(data["questions"], num_questions)
            if len(normalized_questions) < num_questions and _attempt < 1:
                missing_count = num_questions - len(normalized_questions)
                print(f"⚠️ Gemini retornou {len(normalized_questions)}/{num_questions} perguntas válidas. Tentando completar {missing_count}.")
                supplemental_quiz = generate_quiz_from_text(
                    text=text,
                    num_questions=missing_count,
                    difficulty=difficulty,
                    _attempt=_attempt + 1,
                )
                supplemental_questions = supplemental_quiz.get("questions", []) if supplemental_quiz else []
                normalized_questions = _normalize_quiz_questions(
                    normalized_questions + supplemental_questions,
                    num_questions,
                )

            print(f"✅ Quiz gerado com sucesso pelo Gemini ({len(normalized_questions)}/{num_questions}).")
            return {
                "title": " ".join(str(data.get("title", "Quiz sobre o Texto")).split()).strip() or "Quiz sobre o Texto",
                "questions": normalized_questions,
            }
        else:
            print("❌ Erro: resposta da IA não continha a estrutura esperada ('title', 'questions').")
            raise ValueError("Resposta da IA malformada.")
    except Exception as e:
        print(f"🚨 Erro ao gerar quiz: {type(e).__name__} - {e}")
        return None


def generate_guided_study_topics(
    text: str,
    flashcards: List[Dict[str, Any]],
    questions: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Organiza flashcards e perguntas já existentes em tópicos pedagógicos
    para o modo de estudo guiado.
    """
    if not flashcards or not questions:
        print("Flashcards ou perguntas ausentes. Pulando estruturação guiada com IA.")
        return None

    context_snippet = _normalize_text_snippet(text, 3200)
    flashcards_payload = _compact_flashcard_payload(flashcards, len(flashcards))
    questions_payload = _compact_question_payload(questions, len(questions))
    attempts = [
        {
            "label": "full-json",
            "model": _get_model(
                temperature=0.35,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
            "prompt_parts": _build_guided_study_prompt_parts(
                context_snippet=context_snippet or "",
                flashcards_payload=flashcards_payload,
                questions_payload=questions_payload,
                compact=False,
            ),
        },
        {
            "label": "compact-json",
            "model": _get_model(
                temperature=0.2,
                max_output_tokens=3072,
                response_mime_type=None,
            ),
            "prompt_parts": _build_guided_study_prompt_parts(
                context_snippet="",
                flashcards_payload=flashcards_payload,
                questions_payload=questions_payload,
                compact=True,
            ),
        },
    ]

    for attempt_index, attempt in enumerate(attempts, start=1):
        try:
            print(f"Enviando conteúdo para o Gemini estruturar o estudo guiado. tentativa={attempt_index} modo={attempt['label']}")
            start = time.time()
            response = attempt["model"].generate_content(
                attempt["prompt_parts"],
                request_options={"timeout": 90.0},
            )
            elapsed = time.time() - start
            print(f"⏱️ Tempo de resposta Gemini (Estudo guiado, tentativa {attempt_index}): {elapsed:.2f}s")

            response_text = _extract_response_text(response)
            if not response_text:
                print(f"⚠️ Gemini retornou resposta vazia no estudo guiado. tentativa={attempt_index}")
                continue

            data = _parse_jsonish_object(response_text)
            if "topics" in data and isinstance(data["topics"], list):
                print(f"✅ Estrutura guiada gerada com sucesso pelo Gemini na tentativa {attempt_index}.")
                return data

            print(f"❌ Estudo guiado: resposta sem 'topics' válida na tentativa {attempt_index}.")
        except Exception as e:
            print(f"🚨 Erro ao estruturar estudo guiado (tentativa {attempt_index}): {type(e).__name__} - {e}")

    return None
