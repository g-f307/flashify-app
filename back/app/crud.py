# back/app/crud.py
from sqlmodel import Session, select, func, distinct
from . import models, schemas, security
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import selectinload

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
        provider=models.AuthProvider.GOOGLE,
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

def get_document(session: Session, document_id: int) -> models.Document | None:
    return session.get(models.Document, document_id)

def create_document_for_user(
    session: Session, user_id: int, file_path: str, folder_id: Optional[int] = None, generates_flashcards: bool = True, generates_quizzes: bool = False
) -> models.Document:
    db_document = models.Document(
        user_id=user_id, 
        file_path=file_path, 
        folder_id=folder_id, 
        generates_flashcards=generates_flashcards, 
        generates_quizzes=generates_quizzes,
        status=models.DocumentStatus.PROCESSING,
        current_step="iniciando processamento"
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
            db_flashcard = models.Flashcard(**fc_data, document_id=document_id)
            db_flashcards.append(db_flashcard)
    if db_flashcards:
        session.add_all(db_flashcards)
        session.commit()
        for db_fc in db_flashcards:
            session.refresh(db_fc)
    return db_flashcards

def get_flashcards_by_document(session: Session, document_id: int) -> list[models.Flashcard]:
    return session.exec(select(models.Flashcard).where(models.Flashcard.document_id == document_id)).all()

def get_documents_by_user(
    session: Session, user_id: int, in_folder: Optional[bool] = None
) -> list[models.Document]:
    """
    Busca documentos de um usuário.
    - Se in_folder for True, busca apenas docs que estão em alguma pasta.
    - Se in_folder for False, busca apenas docs que estão na raiz (sem pasta).
    - Se in_folder for None, busca todos os docs do usuário.
    """
    # ✅ ADICIONADO: selectinload para carregar as relações
    stmt = (
        select(models.Document)
        .where(models.Document.user_id == user_id)
        .options(
            selectinload(models.Document.flashcards),
            selectinload(models.Document.quiz).selectinload(models.Quiz.questions)
        )
    )
    
    if in_folder is True:
        stmt = stmt.where(models.Document.folder_id != None)
    elif in_folder is False:
        stmt = stmt.where(models.Document.folder_id == None)
    
    stmt = stmt.order_by(models.Document.created_at.desc())
    return session.exec(stmt).all()

def get_document_with_details(session: Session, document_id: int) -> Optional[models.Document]:
    """
    Busca um documento pelo seu ID e carrega de forma explícita (eager load)
    as suas relações de flashcards e quiz completo (com perguntas e respostas).
    ATUALIZADO: Agora força uma nova query do banco, ignorando qualquer cache de sessão.
    """
    # Usa uma query explícita com selectinload para carregar todas as relações
    stmt = (
        select(models.Document)
        .where(models.Document.id == document_id)
        .options(
            selectinload(models.Document.flashcards),
            selectinload(models.Document.quiz).selectinload(models.Quiz.questions).selectinload(models.Question.answers)
        )
    )
    db_document = session.exec(stmt).first()
    
    # Força o reload completo do objeto a partir do banco de dados
    if db_document:
        session.expire(db_document)
        session.refresh(db_document)
                
    return db_document

def get_flashcard(session: Session, flashcard_id: int, user_id: int) -> models.Flashcard | None:
    """Busca um flashcard pelo ID, garantindo que ele pertence ao utilizador."""
    statement = (
        select(models.Flashcard)
        .join(models.Document)
        .where(models.Flashcard.id == flashcard_id)
        .where(models.Document.user_id == user_id)
    )
    return session.exec(statement).first()

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
    """Busca todos os registos de estudo para um utilizador específico."""
    statement = select(models.StudyLog).where(models.StudyLog.user_id == user_id)
    return session.exec(statement).all()

def get_studied_flashcards_count(session: Session, document_id: int) -> int:
    """
    Conta o número de flashcards únicos estudados para um determinado documento.
    """
    statement = (
        select(func.count(distinct(models.StudyLog.flashcard_id)))
        .join(models.Flashcard)
        .where(models.Flashcard.document_id == document_id)
    )
    count = session.exec(statement).one_or_none()
    return count or 0

def delete_document_and_related_data(db: Session, document_id: int) -> bool:
    """
    Exclui um documento e todos os dados associados (flashcards, logs de estudo).
    """
    db_document = db.get(models.Document, document_id)
    if not db_document:
        return False
    
    flashcard_ids = [flashcard.id for flashcard in db_document.flashcards]
    if flashcard_ids:
        study_logs_to_delete = db.exec(
            select(models.StudyLog).where(models.StudyLog.flashcard_id.in_(flashcard_ids))
        ).all()
        for log in study_logs_to_delete:
            db.delete(log)
    
    db.delete(db_document)
    db.commit()
    return True

# --- FUNÇÕES DE PASTA (FOLDER) UNIFICADAS ---

def create_folder(db: Session, folder: schemas.FolderCreate, user_id: int) -> models.Folder:
    db_folder = models.Folder(name=folder.name, user_id=user_id)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

def get_folder(db: Session, folder_id: int, user_id: int) -> Optional[models.Folder]:
    return db.exec(select(models.Folder).where(models.Folder.id == folder_id, models.Folder.user_id == user_id)).first()

def get_folders_by_user(db: Session, user_id: int) -> List[models.Folder]:
    statement = (
        select(models.Folder)
        .where(models.Folder.user_id == user_id)
        .options(selectinload(models.Folder.documents))
        .order_by(models.Folder.name)
    )
    return db.exec(statement).all()

def update_folder(db: Session, folder_id: int, folder_update: schemas.FolderUpdate, user_id: int) -> Optional[models.Folder]:
    db_folder = get_folder(db, folder_id, user_id)
    if db_folder:
        if folder_update.name is not None:
            db_folder.name = folder_update.name
        db.add(db_folder)
        db.commit()
        db.refresh(db_folder)
    return db_folder

def delete_folder(db: Session, folder_id: int, user_id: int, delete_decks: bool = False) -> bool:
    """
    Exclui uma pasta e, opcionalmente, todos os decks dentro dela.

    :param delete_decks: Se True, exclui permanentemente todos os decks na pasta.
                         Se False, move os decks para a raiz da biblioteca.
    """
    db_folder = get_folder(db, folder_id, user_id)
    if not db_folder:
        return False
    
    if delete_decks:
        for doc in list(db_folder.documents):
            delete_document_and_related_data(db=db, document_id=doc.id)
    else:
        for doc in db_folder.documents:
            doc.folder_id = None
            db.add(doc)
    
    db.delete(db_folder)
    db.commit()
    return True

def update_document_folder(db: Session, document_id: int, folder_id: Optional[int], user_id: int) -> Optional[models.Document]:
    db_document = db.exec(select(models.Document).where(models.Document.id == document_id, models.Document.user_id == user_id)).first()
    if not db_document:
        return None

    if folder_id is not None:
        db_folder = get_folder(db, folder_id, user_id)
        if not db_folder:
            return None

    db_document.folder_id = folder_id
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

def create_quiz_for_document(db: Session, quiz_data: schemas.QuizCreate, document_id: int) -> models.Quiz:
    """
    Cria um novo quiz completo, com todas as suas perguntas e respostas,
    e associa-o a um documento existente.
    """
    questions_to_create = []
    for question_schema in quiz_data.questions:
        answers_to_create = [
            models.Answer(**ans.dict()) for ans in question_schema.answers
        ]
        question_obj = models.Question(
            text=question_schema.text, answers=answers_to_create
        )
        questions_to_create.append(question_obj)

    db_quiz = models.Quiz(
        title=quiz_data.title,
        document_id=document_id,
        questions=questions_to_create
    )
    
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    return db_quiz

def get_question_if_owned_by_user(session: Session, question_id: int, user_id: int) -> Optional[models.Question]:
    """
    Busca uma pergunta e verifica se ela pertence a um documento do utilizador especificado.
    Retorna o objeto da pergunta se a verificação for bem-sucedida, caso contrário, None.
    """
    result = session.exec(
        select(models.Question)
        .join(models.Quiz)
        .join(models.Document)
        .where(
            models.Question.id == question_id,
            models.Document.user_id == user_id
        )
    ).first()
    return result

def get_quiz_attempts_for_user(session: Session, user_id: int) -> list[models.QuizAttempt]:
    """Busca todas as tentativas de quiz para um utilizador específico."""
    statement = (
        select(models.QuizAttempt)
        .join(models.Quiz)
        .join(models.Document)
        .where(models.Document.user_id == user_id)
        .order_by(models.QuizAttempt.completed_at.desc())
    )
    return session.exec(statement).all()