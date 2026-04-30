# app/text_extractor.py
from pathlib import Path

import pdfplumber
from docx import Document as DocxDocument
from google.cloud import vision
from pptx import Presentation


def extract_text_from_pdf(file_path: str) -> str:
    """Extrai texto de um arquivo PDF."""
    extracted_pages: list[str] = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text)

    return "\n\n".join(extracted_pages)


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

    # O primeiro texto retornado e o texto completo detectado na imagem.
    return texts[0].description if texts else ""


def extract_text_from_docx(file_path: str) -> str:
    """Extrai texto de um arquivo DOCX preservando a ordem dos paragrafos."""
    document = DocxDocument(file_path)
    paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs)


def extract_text_from_pptx(file_path: str) -> str:
    """Extrai texto de um arquivo PPTX agrupando o conteudo por slide."""
    presentation = Presentation(file_path)
    slides_content: list[str] = []

    for slide_index, slide in enumerate(presentation.slides, start=1):
        slide_parts: list[str] = []
        for shape in slide.shapes:
            text = getattr(shape, "text", None)
            if text and text.strip():
                slide_parts.append(text.strip())

        if slide_parts:
            slides_content.append(f"Slide {slide_index}\n" + "\n".join(slide_parts))

    return "\n\n".join(slides_content)


def extract_text_from_file(file_path: str) -> str:
    """Despacha a extracao de texto com base na extensao do arquivo."""
    suffix = Path(file_path).suffix.lower()

    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    if suffix in {".png", ".jpg", ".jpeg"}:
        return extract_text_from_image(file_path)
    if suffix == ".docx":
        return extract_text_from_docx(file_path)
    if suffix == ".pptx":
        return extract_text_from_pptx(file_path)

    raise ValueError(f"Tipo de ficheiro nao suportado: {suffix}")
