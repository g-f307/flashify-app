from sqlmodel import Session, select, func, distinct
from . import models, schemas, security
from typing import Optional 
from datetime import datetime, timedelta, timezone
from .models import Document, Flashcard, Folder, User, StudyLog, AuthProvider
from .schemas import UserCreate
from sqlalchemy.orm import aliased
from sqlalchemy import desc

def get_or_create_google_user(
    session: Session, 
    email: str, 
    username: str, 
    profile_picture_url: Optional[str] = None
) -> models.User:
    """
    Busca um usuário pelo e-mail. Se existir, atualiza a foto (se necessário).
    Se não existir, cria um novo usuário de login social.
    """
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

# 🔽 FUNÇÃO EM FALTA RESTAURADA AQUI 🔽
def get_user_by_username_or_email(session: Session, identifier: str) -> models.User | None:
    """Busca um utilizador pelo nome de utilizador ou pelo e-mail."""
    statement = select(models.User).where(
        (models.User.username == identifier) | (models.User.email == identifier)
    )
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

def get_documents_by_user(session: Session, user_id: int) -> list[models.Document]:
    stmt = select(models.Document)\
            .where(models.Document.user_id == user_id)\
            .order_by(models.Document.created_at.desc())
    return session.exec(stmt).all()

def get_flashcard(session: Session, flashcard_id: int, user_id: int) -> models.Flashcard | None:
    return session.query(models.Flashcard).join(models.Document).filter(
        models.Flashcard.id == flashcard_id,
        models.Document.user_id == user_id
    ).first()

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

def create_study_log(session: Session, user_id: int, flashcard_id: int, accuracy: float) -> models.StudyLog:
    db_study_log = models.StudyLog(
        user_id=user_id,
        flashcard_id=flashcard_id,
        accuracy=accuracy
    )
    session.add(db_study_log)
    session.commit()
    session.refresh(db_study_log)
    return db_study_log

def get_study_logs_for_user(session: Session, user_id: int) -> list[models.StudyLog]:
    return session.query(StudyLog).filter(StudyLog.user_id == user_id).all()

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

def get_average_accuracy_for_user(session: Session, user_id: int) -> float:
    average = session.query(func.avg(models.StudyLog.accuracy)).filter(models.StudyLog.user_id == user_id).scalar()
    return average or 0.0

def get_flashcards_for_review(session: Session, user_id: int) -> list[models.Flashcard]:
    latest_study_subquery = (
        select(
            models.StudyLog.flashcard_id,
            func.max(models.StudyLog.studied_at).label("latest_studied_at")
        )
        .where(models.StudyLog.user_id == user_id)
        .group_by(models.StudyLog.flashcard_id)
        .subquery()
    )

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

    flashcards_to_review = session.exec(
        select(models.Flashcard)
        .where(models.Flashcard.id.in_(select(flashcard_ids_to_review)))
    ).all()

    return flashcards_to_review

# ▼▼▼ ADICIONE ESTA FUNÇÃO NO FINAL DO FICHEIRO ▼▼▼
def update_flashcard(db: Session, flashcard_id: int, front: Optional[str] = None, back: Optional[str] = None) -> Optional[models.Flashcard]:
    """
    Atualiza o conteúdo de um flashcard específico.
    """
    db_flashcard = db.get(models.Flashcard, flashcard_id)
    if db_flashcard:
        if front is not None:
            db_flashcard.front = front
        if back is not None:
            db_flashcard.back = back
        db.add(db_flashcard)
        db.commit()
        db.refresh(db_flashcard)
    return db_flashcard

# ▼▼▼ ADICIONE ESTA FUNÇÃO TAMBÉM ▼▼▼
def delete_document_and_related_data(db: Session, document_id: int) -> bool:
    """
    Exclui um documento e todos os dados associados (flashcards, logs de estudo).
    Retorna True se a exclusão for bem-sucedida, False caso contrário.
    """
    db_document = db.get(models.Document, document_id)
    if not db_document:
        return False
    
    # 1. Buscar todos os flashcards associados ao documento
    flashcard_ids = [flashcard.id for flashcard in db_document.flashcards]

    if flashcard_ids:
        # 2. Excluir todos os StudyLogs que referenciam esses flashcards
        # Esta é a etapa que estava em falta e que resolve o erro
        study_logs_to_delete = db.exec(
            select(models.StudyLog).where(models.StudyLog.flashcard_id.in_(flashcard_ids))
        ).all()
        for log in study_logs_to_delete:
            db.delete(log)
        
        # Opcional, mas bom para consistência: excluir conversas do chat
        conversations_to_delete = db.exec(
            select(models.FlashcardConversation).where(models.FlashcardConversation.flashcard_id.in_(flashcard_ids))
        ).all()
        for conv in conversations_to_delete:
            db.delete(conv)

    # 3. Agora, excluir o documento. O SQLAlchemy/DB tratará de excluir os flashcards em cascata.
    db.delete(db_document)
    db.commit()
    return True