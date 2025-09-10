# app/tasks.py
from pathlib import Path
from .worker import celery_app
from .database import engine
from . import crud, models
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text
from sqlmodel import Session

def update_document_progress(session: Session, document_id: int, progress: int, step: str):
    """Função auxiliar para atualizar o progresso do documento no banco de dados."""
    document = crud.get_document(session=session, document_id=document_id)
    if document:
        document.processing_progress = progress
        document.current_step = step
        session.add(document)
        session.commit()
        print(f"Documento {document_id}: {progress}% - {step}")

@celery_app.task(bind=True)
def process_document(self, document_id: int, num_flashcards: int = 10, difficulty: str = "Médio"):
    """
    Tarefa assíncrona do Celery para processar um arquivo enviado (PDF ou imagem).
    Esta tarefa extrai o texto, chama a IA para gerar flashcards e salva no banco.
    """
    print(f"Iniciando processamento para Doc ID: {document_id} com {num_flashcards} flashcards no nível {difficulty}")
    
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"ERRO: Documento ID {document_id} não encontrado.")
            return

        if db_document.status == models.DocumentStatus.CANCELLED:
            print(f"Documento {document_id} foi cancelado.")
            return {"document_id": document_id, "status": "CANCELLED"}

        # CORREÇÃO: Usa o file_path diretamente, que agora é o caminho completo e correto do arquivo.
        file_path_on_disk = Path(db_document.file_path)
        extracted_text = ""
        
        try:
            # 1. EXTRAÇÃO DE TEXTO (10-60%)
            update_document_progress(session, document_id, 10, "Extraindo texto do documento...")
            
            if file_path_on_disk.suffix.lower() == ".pdf":
                extracted_text = extract_text_from_pdf(str(file_path_on_disk))
            elif file_path_on_disk.suffix.lower() in [".png", ".jpg", ".jpeg"]:
                extracted_text = extract_text_from_image(str(file_path_on_disk))
            else:
                raise ValueError(f"Tipo de arquivo não suportado: {file_path_on_disk.suffix}")
            
            update_document_progress(session, document_id, 60, "Texto extraído com sucesso")
            
            # 2. SALVAR TEXTO EXTRAÍDO (60-70%)
            update_document_progress(session, document_id, 70, "Salvando texto extraído...")
            crud.update_document_after_processing(
                session=session, db_document=db_document, text=extracted_text
            )
            
            # 3. GERAR FLASHCARDS COM IA (70-95%)
            update_document_progress(session, document_id, 80, "Gerando flashcards com IA...")
            flashcards_data = generate_flashcards_from_text(
                extracted_text,
                num_flashcards=num_flashcards,
                difficulty=difficulty
            )

            # 4. SALVAR FLASHCARDS NO BANCO E FINALIZAR (95-100%)
            update_document_progress(session, document_id, 95, "Salvando flashcards...")
            if flashcards_data:
                crud.create_flashcards_for_document(
                    session=session,
                    flashcards_data=flashcards_data,
                    document_id=db_document.id,
                )
                print(f"{len(flashcards_data)} flashcards salvos para o Documento ID: {document_id}.")
                db_document.status = models.DocumentStatus.COMPLETED
                db_document.current_step = "Processamento concluído com sucesso."
            else:
                db_document.status = models.DocumentStatus.FAILED
                db_document.current_step = "A IA não conseguiu gerar flashcards a partir do documento."

            db_document.processing_progress = 100
            session.add(db_document)
            session.commit()
        
        except Exception as e:
            print(f"ERRO no pipeline de processamento do Documento ID {document_id}: {e}")
            db_document.status = models.DocumentStatus.FAILED
            db_document.current_step = f"Erro: {str(e)[:100]}"
            session.add(db_document)
            session.commit()
    
    return {"document_id": document_id, "status": "PIPELINE_COMPLETED"}