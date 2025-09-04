# app/ai_generator.py
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configura a API do Google
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

def generate_flashcards_from_text(text: str) -> list[dict]:
    """
    Usa o modelo Gemini do Google para gerar flashcards a partir de um texto.
    """
    if not text or text.isspace():
        print("Texto de entrada está vazio. Pulando a geração de flashcards.")
        return []

    # Prompt adaptado para o Gemini, pedindo JSON.
    prompt = f"""
    Você é um assistente especialista em criar materiais de estudo.
    Sua tarefa é ler o texto fornecido e gerar um conjunto de flashcards.
    Para cada flashcard, crie uma pergunta (frente) e uma resposta direta (verso).
    Responda APENAS em formato JSON, com uma lista de objetos, onde cada objeto
    tem as chaves "front" e "back".
    Exemplo de formato:
    {{
      "flashcards": [
        {{"front": "Qual é a capital do Brasil?", "back": "Brasília"}},
        {{"front": "Quem escreveu 'Dom Casmurro'?", "back": "Machado de Assis"}}
      ]
    }}

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