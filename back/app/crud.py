from sqlmodel import Session, select
from . import models, schemas, security
from typing import Optional 

def get_user_by_email(session: Session, email: str) -> models.User | None:
    statement = select(models.User).where(models.User.email == email)
    return session.exec(statement).first()

def get_user_by_username(session: Session, username: str) -> models.User | None:
    statement = select(models.User).where(models.User.username == username)
    return session.exec(statement).first()

def get_user_by_username_or_email(session: Session, identifier: str) -> models.User | None:
    """Get user by username or email"""
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
    """Busca um documento pelo seu ID."""
    return session.get(models.Document, document_id)

def update_document_after_processing(
    session: Session, db_document: models.Document, text: str
) -> models.Document:
    """Atualiza o texto extraído e o status do documento."""
    db_document.extracted_text = text
    db_document.status = models.DocumentStatus.COMPLETED
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document

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
        if "front" in fc_data and "back" in fc_data: # Validação mínima
            # Determina o tipo do flashcard baseado no conteúdo
            flashcard_type = fc_data.get("type", "concept")
            # Converter para uppercase para corresponder ao enum
            type_mapping = {
                "concept": models.FlashcardType.CONCEPT,
                "code": models.FlashcardType.CODE,
                "diagram": models.FlashcardType.DIAGRAM,
                "example": models.FlashcardType.EXAMPLE,
                "comparison": models.FlashcardType.COMPARISON
            }
            enum_type = type_mapping.get(flashcard_type.lower(), models.FlashcardType.CONCEPT)
            
            db_flashcard = models.Flashcard(
                front=fc_data["front"],
                back=fc_data["back"],
                type=enum_type,
                document_id=document_id
            )
            db_flashcards.append(db_flashcard)

    if db_flashcards:
        session.add_all(db_flashcards)
        session.commit()
        # Refresca cada objeto para obter o ID gerado pelo banco
        for db_fc in db_flashcards:
            session.refresh(db_fc)
            
    return db_flashcards

def get_flashcards_by_document(session: Session, document_id: int) -> list[models.Flashcard]:
    return session.exec(select(models.Flashcard).where(models.Flashcard.document_id == document_id)).all()

def get_documents_by_user(session: Session, user_id: int) -> list[models.Document]:
    statement = select(models.Document).where(models.Document.user_id == user_id)
    return session.exec(statement).all()

# CRUD para flashcard conversations
def get_flashcard(session: Session, flashcard_id: int) -> models.Flashcard | None:
    """Busca um flashcard pelo ID."""
    return session.get(models.Flashcard, flashcard_id)

def create_flashcard_conversation(
    session: Session, 
    flashcard_id: int, 
    user_message: str, 
    assistant_response: str
) -> models.FlashcardConversation:
    """Cria uma nova conversa sobre um flashcard."""
    from datetime import datetime
    
    db_conversation = models.FlashcardConversation(
        flashcard_id=flashcard_id,
        user_message=user_message,
        assistant_response=assistant_response,
        created_at=datetime.now().isoformat()
    )
    session.add(db_conversation)
    session.commit()
    session.refresh(db_conversation)
    return db_conversation

def get_flashcard_conversations(session: Session, flashcard_id: int) -> list[models.FlashcardConversation]:
    """Recupera todas as conversas de um flashcard."""
    statement = select(models.FlashcardConversation).where(
        models.FlashcardConversation.flashcard_id == flashcard_id
    ).order_by(models.FlashcardConversation.created_at)
    return session.exec(statement).all()