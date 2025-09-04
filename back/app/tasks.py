# app/tasks.py
from pathlib import Path
from .worker import celery_app
from .database import engine
from . import crud, models # Adicione models
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text # <-- IMPORTAÇÃO NOVA
from sqlmodel import Session

def update_document_progress(session: Session, document_id: int, progress: int, step: str):
    """Helper function to update document progress"""
    document = crud.get_document(session=session, document_id=document_id)
    if document:
        document.processing_progress = progress
        document.current_step = step
        session.add(document)
        session.commit()
        print(f"Documento {document_id}: {progress}% - {step}")

@celery_app.task(bind=True)
def process_document(self, document_id: int):
    print(f"Iniciando o processamento para o Documento ID: {document_id}")
    
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"ERRO: Documento ID {document_id} não encontrado.")
            return

        # Verificar se foi cancelado
        if db_document.status == models.DocumentStatus.CANCELLED:
            print(f"Documento {document_id} foi cancelado.")
            return {"document_id": document_id, "status": "CANCELLED"}

        file_path = Path(db_document.file_path)
        extracted_text = ""
        
        try:
            # 1. EXTRAÇÃO DE TEXTO (10-60%)
            update_document_progress(session, document_id, 10, "Extraindo texto do documento...")
            
            if file_path.suffix.lower() == ".pdf":
                extracted_text = extract_text_from_pdf(str(file_path))
            elif file_path.suffix.lower() in [".png", ".jpg", ".jpeg"]:
                extracted_text = extract_text_from_image(str(file_path))
            
            update_document_progress(session, document_id, 60, "Texto extraído com sucesso")
            
            # Verificar cancelamento
            session.refresh(db_document)
            if db_document.status == models.DocumentStatus.CANCELLED:
                return {"document_id": document_id, "status": "CANCELLED"}
            
            # 2. SALVAR TEXTO (60-70%)
            update_document_progress(session, document_id, 70, "Salvando texto extraído...")
            crud.update_document_after_processing(
                session=session, db_document=db_document, text=extracted_text
            )
            
            # Verificar cancelamento
            session.refresh(db_document)
            if db_document.status == models.DocumentStatus.CANCELLED:
                return {"document_id": document_id, "status": "CANCELLED"}

            # 3. GERAR FLASHCARDS COM IA (70-90%)
            update_document_progress(session, document_id, 80, "Gerando flashcards com IA...")
            flashcards_data = generate_flashcards_from_text(extracted_text)
            
            # Verificar cancelamento
            session.refresh(db_document)
            if db_document.status == models.DocumentStatus.CANCELLED:
                return {"document_id": document_id, "status": "CANCELLED"}

            # 4. SALVAR FLASHCARDS NO BANCO (90-100%)
            update_document_progress(session, document_id, 95, "Salvando flashcards...")
            if flashcards_data:
                crud.create_flashcards_for_document(
                    session=session,
                    flashcards_data=flashcards_data,
                    document_id=db_document.id,
                )
                print(f"{len(flashcards_data)} flashcards salvos para o Documento ID: {document_id}.")
            
            # Finalizar (100%)
            update_document_progress(session, document_id, 100, "Processamento concluído")
        
        except Exception as e:
            print(f"ERRO no pipeline de processamento do Documento ID {document_id}: {e}")
            # Marcar como falha
            db_document.status = models.DocumentStatus.FAILED
            db_document.current_step = f"Erro: {str(e)}"
            session.add(db_document)
            session.commit()
    
    return {"document_id": document_id, "status": "PIPELINE_COMPLETED"}