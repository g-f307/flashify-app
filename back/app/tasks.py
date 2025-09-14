# app/tasks.py
import traceback
from pathlib import Path
from sqlmodel import Session
from .worker import celery_app
from .database import engine
from . import crud, models
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text

@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    max_retries=3,
    default_retry_delay=60  # Espera 60 segundos entre tentativas
)
def process_document(self, document_id: int, num_flashcards: int, difficulty: str):
    """
    Tarefa Celery robusta para processar um documento, com tentativas automáticas e
    tratamento de erros detalhado.
    """
    print(f"Iniciando processamento para Doc ID: {document_id}")
    
    # Usar 'with Session(engine)' garante que a sessão é sempre fechada corretamente.
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"ERRO: Documento ID {document_id} não encontrado.")
            return

        # Verifica se o processo foi cancelado antes de começar
        if db_document.status == models.DocumentStatus.CANCELLED:
            print(f"Processamento para o documento {document_id} foi cancelado pelo usuário.")
            return

        try:
            # --- PASSO 1: EXTRAÇÃO DE TEXTO ---
            db_document.current_step = "Passo 1/2: Extraindo texto do ficheiro..."
            session.commit()

            file_path = Path(db_document.file_path)
            extracted_text = ""
            
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

            # --- PASSO 2: GERAÇÃO DE FLASHCARDS COM IA ---
            db_document.current_step = "Passo 2/2: Gerando flashcards com IA..."
            session.commit()

            flashcards_data = generate_flashcards_from_text(
                text=extracted_text,
                num_flashcards=num_flashcards,
                difficulty=difficulty
            )

            if not flashcards_data:
                raise ValueError("A IA não retornou flashcards válidos.")

            # --- PASSO 3: SALVAR FLASHCARDS E FINALIZAR ---
            crud.create_flashcards_for_document(
                session=session,
                flashcards_data=flashcards_data,
                document_id=db_document.id
            )

            db_document.status = models.DocumentStatus.COMPLETED
            db_document.current_step = f"Sucesso! {len(flashcards_data)} flashcards foram criados."
            db_document.processing_progress = 100
            session.commit()
            print(f"Documento {document_id} processado com sucesso.")

        except Exception as e:
            session.rollback() # Garante que nenhuma alteração incompleta seja salva
            
            error_message = f"Erro: {str(e)}"
            
            # Verifica se esta é a última tentativa
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
            
            # Relança a exceção para que o Celery saiba que deve tentar novamente
            raise e