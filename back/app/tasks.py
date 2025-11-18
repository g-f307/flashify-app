# back/app/tasks.py

import traceback
from pathlib import Path
from sqlmodel import Session, select  # ✅ ADICIONAR select aqui
from .worker import celery_app
from .database import engine
from . import crud, models, schemas
from .text_extractor import extract_text_from_pdf, extract_text_from_image
from .ai_generator import generate_flashcards_from_text, generate_quiz_from_text
from .email_service import email_service
from datetime import datetime, timedelta, timezone
import asyncio

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
    print(f"[TASK] Iniciando processamento para Doc ID: {document_id} com content_type: '{content_type}'")
    
    with Session(engine) as session:
        db_document = crud.get_document(session=session, document_id=document_id)
        if not db_document:
            print(f"[TASK] ERRO: Documento ID {document_id} não encontrado.")
            return

        if db_document.status == models.DocumentStatus.CANCELLED:
            print(f"[TASK] Processamento para o documento {document_id} foi cancelado.")
            return

        try:
            # --- PASSO 1: EXTRAÇÃO DE TEXTO ---
            db_document.current_step = "iniciando processamento"
            session.add(db_document)
            session.commit()
            print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")

            extracted_text = db_document.extracted_text

            if not extracted_text:
                db_document.current_step = "extraindo texto"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
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
                session.add(db_document)
                session.commit()

            # --- PASSO 2: GERAÇÃO DE CONTEÚDO COM IA ---
            flashcards_data = None
            quiz_data_dict = None

            if content_type in ["flashcards", "both"]:
                db_document.current_step = "gerando flashcards com ia"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
                flashcards_data = generate_flashcards_from_text(
                    text=extracted_text, num_flashcards=num_flashcards, difficulty=difficulty
                )
                
                db_document.current_step = "parsing flashcards"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
                db_document.current_step = "salvando flashcards"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
            if content_type in ["quiz", "both"]:
                db_document.current_step = "gerando quiz com ia"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
                quiz_data_dict = generate_quiz_from_text(
                    text=extracted_text, num_questions=num_questions, difficulty=difficulty
                )
                
                # 🆕 EMBARALHAR AS ALTERNATIVAS ANTES DE SALVAR
                if quiz_data_dict:
                    quiz_data_dict = crud.shuffle_quiz_answers(quiz_data_dict)
                
                db_document.current_step = "parsing quiz"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
                
                db_document.current_step = "salvando quiz"
                session.add(db_document)
                session.commit()
                print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")

            if not flashcards_data and not quiz_data_dict:
                raise ValueError("A IA não retornou nenhum conteúdo válido.")

            # --- PASSO 3: FINALIZAR ---
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
            db_document.current_step = "concluído"
            db_document.processing_progress = 100
            session.add(db_document)
            session.commit()
            
            # 🆕 INCREMENTAR CONTADOR APENAS QUANDO GERAÇÃO FOR BEM-SUCEDIDA
            crud.increment_user_generation_count(session, db_document.user_id)
            
            print(f"[TASK] Doc {document_id} - Passo: {db_document.current_step}")
            print(f"[TASK] Documento {document_id} processado com sucesso.")
            print(f"[TASK] ✅ Contador de gerações incrementado para usuário {db_document.user_id}")

        except Exception as e:
            session.rollback()
            error_message = f"Erro: {str(e)}"
            if self.request.retries >= self.max_retries:
                final_error = f"Falha final após {self.max_retries + 1} tentativas. {error_message}"
                db_document.status = models.DocumentStatus.FAILED
                db_document.current_step = final_error
                print(f"[TASK] Tarefa para doc {document_id} FALHOU PERMANENTEMENTE: {traceback.format_exc()}")
            else:
                retry_count = self.request.retries + 1
                db_document.current_step = f"Tentativa {retry_count}/{self.max_retries + 1} falhou. {error_message}"
                print(f"[TASK] Tarefa para doc {document_id} falhou. Tentando novamente... Erro: {str(e)}")
            session.add(db_document)
            session.commit()
            raise e
        
# 🆕 NOVA TASK: Enviar e-mails de inatividade
@celery_app.task(name="send_inactivity_emails")
def send_inactivity_emails():
    """
    Tarefa agendada: Envia e-mails para usuários inativos há mais de 2 dias
    Executa diariamente às 10h
    """
    print("🔍 Verificando usuários inativos...")
    
    with Session(engine) as session:
        # Data limite: 2 dias atrás
        two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
        
        # Buscar usuários inativos que ainda não receberam e-mail
        statement = select(models.User).where(
            models.User.last_login_at < two_days_ago,
            models.User.inactivity_email_sent == False,
            models.User.is_active == True
        )
        
        inactive_users = session.exec(statement).all()
        
        print(f"📧 Encontrados {len(inactive_users)} usuários inativos")
        
        for user in inactive_users:
            try:
                days_inactive = (datetime.now(timezone.utc) - user.last_login_at).days
                
                # Enviar e-mail (usando asyncio)
                asyncio.run(
                    email_service.send_inactivity_reminder(
                        email=user.email,
                        username=user.username,
                        days_inactive=days_inactive
                    )
                )
                
                # Marcar como enviado
                user.inactivity_email_sent = True
                session.add(user)
                session.commit()
                
            except Exception as e:
                print(f"❌ Erro ao processar usuário {user.email}: {e}")
                session.rollback()
                continue
        
        print(f"✅ Processo de e-mails de inatividade concluído")

# 🆕 NOVA TASK: Enviar e-mails de decks incompletos
@celery_app.task(name="send_incomplete_deck_emails")
def send_incomplete_deck_emails():
    """
    Tarefa agendada: Envia e-mails para decks em processamento há mais de 1 hora
    ou que falharam há menos de 24 horas
    Executa a cada 6 horas
    """
    print("🔍 Verificando decks incompletos...")
    
    with Session(engine) as session:
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        
        # Buscar documentos problemáticos que ainda não enviaram e-mail
        statement = (
            select(models.Document)
            .join(models.User)
            .where(
                (
                    (models.Document.status == models.DocumentStatus.PROCESSING) &
                    (models.Document.created_at < one_hour_ago)
                ) | (
                    (models.Document.status == models.DocumentStatus.FAILED) &
                    (models.Document.created_at > one_day_ago)
                )
            )
        )
        
        problematic_docs = session.exec(statement).all()
        
        print(f"📧 Encontrados {len(problematic_docs)} decks incompletos")
        
        # Rastrear e-mails já enviados nesta execução (para evitar spam)
        emails_sent = set()
        
        for doc in problematic_docs:
            try:
                user = doc.user
                
                # Evitar múltiplos e-mails para o mesmo usuário
                if user.email in emails_sent:
                    continue
                
                asyncio.run(
                    email_service.send_incomplete_deck_reminder(
                        email=user.email,
                        username=user.username,
                        document_title=doc.file_path,
                        document_id=doc.id
                    )
                )
                
                emails_sent.add(user.email)
                
            except Exception as e:
                print(f"❌ Erro ao processar documento {doc.id}: {e}")
                continue
        
        print(f"✅ Processo de e-mails de decks incompletos concluído")