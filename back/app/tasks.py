# app/tasks.py
from pathlib import Path
from .worker import celery_app
from .database import engine
from . import crud, models # Adicione models
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text # <-- IMPORTAÇÃO NOVA
from sqlmodel import Session

@celery_app.task
def process_document(document_id: int):
    print(f"Iniciando o processamento para o Documento ID: {document_id}")
    
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"ERRO: Documento ID {document_id} não encontrado.")
            return

        file_path = Path(db_document.file_path)
        extracted_text = ""
        try:
            # 1. EXTRAÇÃO DE TEXTO (já implementada)
            if file_path.suffix.lower() == ".pdf":
                extracted_text = extract_text_from_pdf(str(file_path))
            elif file_path.suffix.lower() in [".png", ".jpg", ".jpeg"]:
                extracted_text = extract_text_from_image(str(file_path))
            
            # 2. SALVAR TEXTO E ATUALIZAR STATUS (já implementado)
            crud.update_document_after_processing(
                session=session, db_document=db_document, text=extracted_text
            )
            print(f"Extração de texto para o Documento ID: {document_id} CONCLUÍDA.")

            # 3. GERAR FLASHCARDS COM IA (NOVA ETAPA)
            flashcards_data = generate_flashcards_from_text(extracted_text)

            # 4. SALVAR FLASHCARDS NO BANCO (NOVA ETAPA)
            if flashcards_data:
                crud.create_flashcards_for_document(
                    session=session,
                    flashcards_data=flashcards_data,
                    document_id=db_document.id,
                )
                print(f"{len(flashcards_data)} flashcards salvos para o Documento ID: {document_id}.")
        
        except Exception as e:
            print(f"ERRO no pipeline de processamento do Documento ID {document_id}: {e}")
    
    return {"document_id": document_id, "status": "PIPELINE_COMPLETED"}