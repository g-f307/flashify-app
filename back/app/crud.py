# app/crud.py
from sqlmodel import Session, select, func, distinct
from . import models, schemas, security
from typing import Optional 
from datetime import datetime, timedelta, timezone
from .models import Document, Flashcard, Folder, User, StudyLog, AuthProvider
from .schemas import UserCreate
from sqlalchemy.orm import aliased
from sqlalchemy import desc


# --- Funções CRUD de Usuário e Pasta (sem alterações) ---

def get_or_create_google_user(
    session: Session, 
    email: str, 
    username: str, 
    profile_picture_url: Optional[str] = None
) -> models.User:
    user = get_user_by_email(session, email=email)
    if user:
        if not user.profile_picture_url and profile_picture_url:
            user.profile_picture_url = profile_picture_url
            session.add(user)
            session.commit()
            session.refresh(user)
        return user
    
    new_user = models.User(
        username=username,
        email=email,
        provider=AuthProvider.GOOGLE,
        is_active=True,
        profile_picture_url=profile_picture_url
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

def get_user_by_email(session: Session, email: str) -> models.User | None:
    statement = select(models.User).where(models.User.email == email)
    return session.exec(statement).first()

def get_user_by_username(session: Session, username: str) -> models.User | None:
    statement = select(models.User).where(models.User.username == username)
    return session.exec(statement).first()

def create_user(session: Session, user_create: schemas.UserCreate) -> models.User:
    hashed_password = security.get_password_hash(user_create.password)
    db_user = models.User(
        username=user_create.username,
        email=user_create.email,
        hashed_password=hashed_password
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

def create_folder_for_user(
    session: Session, folder_create: schemas.FolderCreate, user_id: int
) -> models.Folder:
    db_folder = models.Folder(**folder_create.model_dump(), user_id=user_id)
    session.add(db_folder)
    session.commit()
    session.refresh(db_folder)
    return db_folder

def get_folders_by_user(session: Session, user_id: int) -> list[models.Folder]:
    statement = select(models.Folder).where(models.Folder.user_id == user_id)
    return session.exec(statement).all()

# --- Funções CRUD de Documento (sem alterações) ---

def get_document(session: Session, document_id: int) -> models.Document | None:
    return session.get(models.Document, document_id)

def create_document_for_user(
    session: Session, user_id: int, file_path: str, folder_id: Optional[int] = None
) -> models.Document:
    db_document = models.Document(
        user_id=user_id, file_path=file_path, folder_id=folder_id
    )
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

def get_documents_by_user(session: Session, user_id: int) -> list[models.Document]:
    stmt = select(models.Document)\
            .where(models.Document.user_id == user_id)\
            .order_by(models.Document.created_at.desc())
    return session.exec(stmt).all()


# --- Funções CRUD de Flashcard (COM ALTERAÇÕES) ---

def create_flashcards_for_document(
    session: Session, flashcards_data: list[dict], document_id: int
) -> list[models.Flashcard]:
    db_flashcards = []
    for fc_data in flashcards_data:
        if "front" in fc_data and "back" in fc_data:
            type_mapping = {
                "concept": models.FlashcardType.CONCEPT, "code": models.FlashcardType.CODE,
                "diagram": models.FlashcardType.DIAGRAM, "example": models.FlashcardType.EXAMPLE,
                "comparison": models.FlashcardType.COMPARISON
            }
            enum_type = type_mapping.get(fc_data.get("type", "concept").lower(), models.FlashcardType.CONCEPT)
            
            db_flashcard = models.Flashcard(
                front=fc_data["front"], back=fc_data["back"],
                type=enum_type, document_id=document_id
            )
            db_flashcards.append(db_flashcard)

    if db_flashcards:
        session.add_all(db_flashcards)
        session.commit()
        for db_fc in db_flashcards:
            session.refresh(db_fc)
    return db_flashcards

def get_flashcards_by_document(session: Session, document_id: int) -> list[models.Flashcard]:
    return session.exec(select(models.Flashcard).where(models.Flashcard.document_id == document_id)).all()

# 🔽 FUNÇÃO ALTERADA: Agora valida se o flashcard pertence ao usuário 🔽
def get_flashcard(session: Session, flashcard_id: int, user_id: int) -> models.Flashcard | None:
    """
    Busca um flashcard pelo ID, garantindo que ele pertença ao usuário especificado.
    """
    return session.query(models.Flashcard).join(models.Document).filter(
        models.Flashcard.id == flashcard_id,
        models.Document.user_id == user_id
    ).first()

# --- Funções CRUD de Conversas de Flashcard (sem alterações) ---

def create_flashcard_conversation(
    session: Session, 
    flashcard_id: int, 
    user_message: str, 
    assistant_response: str
) -> models.FlashcardConversation:
    db_conversation = models.FlashcardConversation(
        flashcard_id=flashcard_id, user_message=user_message,
        assistant_response=assistant_response, created_at=datetime.now().isoformat()
    )
    session.add(db_conversation)
    session.commit()
    session.refresh(db_conversation)
    return db_conversation

def get_flashcard_conversations(session: Session, flashcard_id: int) -> list[models.FlashcardConversation]:
    statement = select(models.FlashcardConversation).where(
        models.FlashcardConversation.flashcard_id == flashcard_id
    ).order_by(models.FlashcardConversation.created_at)
    return session.exec(statement).all()

# --- Funções CRUD de Logs de Estudo (COM ALTERAÇÕES) ---

# 🔽 NOVA FUNÇÃO: Cria um registo de estudo com o feedback (accuracy) 🔽
def create_study_log(session: Session, user_id: int, flashcard_id: int, accuracy: float) -> models.StudyLog:
    """
    Cria e salva um novo registo de estudo no banco de dados.
    """
    db_study_log = models.StudyLog(
        user_id=user_id,
        flashcard_id=flashcard_id,
        accuracy=accuracy
    )
    session.add(db_study_log)
    session.commit()
    session.refresh(db_study_log)
    return db_study_log

def get_study_logs_for_user(session: Session, user_id: int) -> list[StudyLog]:
    return session.query(StudyLog).filter(StudyLog.user_id == user_id).all()

# --- Funções de Contagem e Estatísticas (sem alterações) ---

def get_studied_flashcards_count(session: Session, document_id: int) -> int:
    count = (
        session.query(func.count(distinct(StudyLog.flashcard_id)))
        .join(Flashcard)
        .filter(Flashcard.document_id == document_id)
        .scalar()
    )
    return count or 0

def get_total_flashcards_count_for_user(session: Session, user_id: int) -> int:
    count = (
        session.query(func.count(Flashcard.id))
        .join(Document)
        .filter(Document.user_id == user_id, Document.status == 'COMPLETED')
        .scalar()
    )
    return count or 0

def get_unique_studied_flashcards_count_for_user(session: Session, user_id: int) -> int:
    count = (
        session.query(func.count(distinct(StudyLog.flashcard_id)))
        .filter(StudyLog.user_id == user_id)
        .scalar()
    )
    return count or 0

# 🔽 FUNÇÃO CORRIGIDA E SIMPLIFICADA 🔽
def get_flashcards_for_review(session: Session, user_id: int) -> list[models.Flashcard]:
    """
    Seleciona flashcards para revisão de forma mais simples e eficiente.
    1. Encontra todos os flashcards que o utilizador já estudou (logs existentes).
    2. Para cada um desses flashcards, busca o log de estudo MAIS RECENTE.
    3. Se o log mais recente tiver uma precisão (accuracy) < 1.0, o flashcard é incluído na revisão.
    """
    # Subconsulta para obter o timestamp do último estudo de cada flashcard pelo utilizador
    latest_study_subquery = (
        select(
            models.StudyLog.flashcard_id,
            func.max(models.StudyLog.studied_at).label("latest_studied_at")
        )
        .where(models.StudyLog.user_id == user_id)
        .group_by(models.StudyLog.flashcard_id)
        .subquery()
    )

    # Consulta principal que junta os logs com a subconsulta para filtrar apenas os mais recentes
    # e depois filtra aqueles cuja precisão é menor que 1.0 (ou seja, "Errei" ou "Quase")
    flashcard_ids_to_review = (
        select(models.StudyLog.flashcard_id)
        .join(
            latest_study_subquery,
            (models.StudyLog.flashcard_id == latest_study_subquery.c.flashcard_id) &
            (models.StudyLog.studied_at == latest_study_subquery.c.latest_studied_at)
        )
        .where(
            models.StudyLog.user_id == user_id,
            models.StudyLog.accuracy < 1.0
        )
    ).subquery()

    # Finalmente, busca os objetos Flashcard completos cujos IDs estão na lista de revisão
    flashcards_to_review = session.exec(
        select(models.Flashcard)
        .where(models.Flashcard.id.in_(select(flashcard_ids_to_review)))
    ).all()

    return flashcards_to_review