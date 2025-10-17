# back/app/tasks.py

import traceback
from pathlib import Path
from sqlmodel import Session
from .worker import celery_app
from .database import engine
from . import crud, models, schemas
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text, generate_quiz_from_text

@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60
)
def process_document(
    self,
    document_id: int,
    content_type: str,
    num_flashcards: int,
    difficulty: str,
    num_questions: int
):
    print(f"Iniciando processamento para Doc ID: {document_id} com content_type: '{content_type}'")
    
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"ERRO: Documento ID {document_id} não encontrado.")
            return

        if db_document.status == models.DocumentStatus.CANCELLED:
            print(f"Processamento para o documento {document_id} foi cancelado.")
            return

        try:
            # --- PASSO 1: EXTRAÇÃO DE TEXTO (AGORA CONDICIONAL) ---
            db_document.current_step = "Passo 1/3: Preparando conteúdo..."
            session.commit()

            extracted_text = db_document.extracted_text

            # Só extrai de um ficheiro se o texto ainda não existir no documento
            if not extracted_text:
                db_document.current_step = "Passo 1/3: Extraindo texto do ficheiro..."
                session.commit()
                file_path = Path(db_document.file_path)
                
                if file_path.suffix.lower() == ".pdf":
                    extracted_text = extract_text_from_pdf(str(file_path))
                elif file_path.suffix.lower() in [".png", ".jpg", ".jpeg"]:
                    extracted_text = extract_text_from_image(str(file_path))
                else:
                    raise ValueError(f"Tipo de ficheiro não suportado: {file_path.suffix}")

                if not extracted_text or not extracted_text.strip():
                    raise ValueError("Nenhum texto pôde ser extraído do ficheiro.")
                
                db_document.extracted_text = extracted_text
                session.commit()

            # --- PASSO 2: GERAÇÃO DE CONTEÚDO COM IA ---
            db_document.current_step = "Passo 2/3: Gerando conteúdo com IA..."
            session.commit()

            flashcards_data = None
            quiz_data_dict = None

            if content_type in ["flashcards", "both"]:
                flashcards_data = generate_flashcards_from_text(
                    text=extracted_text, num_flashcards=num_flashcards, difficulty=difficulty
                )

            if content_type in ["quiz", "both"]:
                quiz_data_dict = generate_quiz_from_text(
                    text=extracted_text, num_questions=num_questions, difficulty=difficulty
                )

            if not flashcards_data and not quiz_data_dict:
                raise ValueError("A IA não retornou nenhum conteúdo válido.")

            # --- PASSO 3: SALVAR CONTEÚDO E FINALIZAR ---
            db_document.current_step = "Passo 3/3: Guardando na base de dados..."
            session.commit()
            
            success_parts = []
            if flashcards_data:
                crud.create_flashcards_for_document(
                    session=session, flashcards_data=flashcards_data, document_id=db_document.id
                )
                success_parts.append(f"{len(flashcards_data)} flashcards")

            if quiz_data_dict:
                quiz_schema = schemas.QuizCreate(**quiz_data_dict)
                crud.create_quiz_for_document(
                    db=session, quiz_data=quiz_schema, document_id=db_document.id
                )
                success_parts.append("1 quiz")

            db_document.status = models.DocumentStatus.COMPLETED
            success_message = f"Sucesso! { ' e '.join(success_parts) } foram criados."
            db_document.current_step = success_message
            db_document.processing_progress = 100
            session.commit()
            print(f"Documento {document_id} processado com sucesso.")

        except Exception as e:
            session.rollback()
            error_message = f"Erro: {str(e)}"
            if self.request.retries >= self.max_retries:
                final_error = f"Falha final após {self.max_retries + 1} tentativas. {error_message}"
                db_document.status = models.DocumentStatus.FAILED
                db_document.current_step = final_error
                print(f"Tarefa para doc {document_id} FALHOU PERMANENTEMENTE: {traceback.format_exc()}")
            else:
                retry_count = self.request.retries + 1
                db_document.current_step = f"Tentativa {retry_count}/{self.max_retries + 1} falhou. {error_message}"
                print(f"Tarefa para doc {document_id} falhou. Tentando novamente... Erro: {str(e)}")
            session.commit()
            raise e