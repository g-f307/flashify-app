# app/text_extractor.py
import pdfplumber
from google.cloud import vision

def extract_text_from_pdf(file_path: str) -> str:
    """Extrai texto de um arquivo PDF."""
    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text() + "\n"
    return full_text

def extract_text_from_image(file_path: str) -> str:
    """Usa o Google Cloud Vision para extrair texto de uma imagem."""
    client = vision.ImageAnnotatorClient()

    with open(file_path, "rb") as image_file:
        content = image_file.read()

    image = vision.Image(content=content)
    
    response = client.text_detection(image=image)
    texts = response.text_annotations

    if response.error.message:
        raise Exception(
            f"{response.error.message}\nPara mais detalhes, veja https://cloud.google.com/apis/design/errors"
        )

    # O primeiro texto retornado é o texto completo detectado na imagem.
    return texts[0].description if texts else ""