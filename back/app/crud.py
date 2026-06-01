# back/app/crud.py
from sqlmodel import Session, select, func, distinct
from sqlalchemy import or_
from . import models, schemas, security
from typing import Any, List, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import selectinload
import random

DAILY_GENERATION_LIMIT = 10
FEEDBACK_GENERATION_BONUS = 3
FEEDBACK_REWARD_CLAIM_WINDOW = timedelta(minutes=30)

FLASHCARD_TYPE_ALIASES = {
    "application": models.FlashcardType.EXAMPLE,
    "aplicacao": models.FlashcardType.EXAMPLE,
    "aplicação": models.FlashcardType.EXAMPLE,
}


def normalize_flashcard_type(raw_type: object) -> models.FlashcardType:
    if isinstance(raw_type, models.FlashcardType):
        return raw_type

    if isinstance(raw_type, str):
        normalized = raw_type.strip().lower()

        if normalized in FLASHCARD_TYPE_ALIASES:
            return FLASHCARD_TYPE_ALIASES[normalized]

        try:
            return models.FlashcardType(normalized)
        except ValueError:
            try:
                return models.FlashcardType[normalized.upper()]
            except KeyError:
                pass

    print(f"⚠️ Tipo de flashcard inválido recebido: {raw_type!r}. Usando 'concept' como fallback.")
    return models.FlashcardType.CONCEPT


def apply_acquisition_context(
    user: models.User,
    acquisition_context: schemas.AcquisitionContext | None,
) -> bool:
    if not acquisition_context:
        return False

    updated = False
    tracked_fields = (
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "referrer",
        "landing_page",
    )

    for field_name in tracked_fields:
        current_value = getattr(user, field_name, None)
        new_value = getattr(acquisition_context, field_name, None)
        if current_value or not new_value:
            continue
        setattr(user, field_name, new_value)
        updated = True

    if user.first_touch_at is None and acquisition_context.first_touch_at is not None:
        user.first_touch_at = acquisition_context.first_touch_at
        updated = True

    return updated

def get_or_create_google_user(
    session: Session,
    email: str,
    username: str,
    profile_picture_url: Optional[str] = None,
    acquisition_context: Optional[schemas.AcquisitionContext] = None,
) -> models.User:
    """
    Busca um usuário pelo e-mail. Se existir, atualiza a foto (se necessário).
    Se não existir, cria um novo usuário de login social.
    """
    user = get_user_by_email(session, email=email)
    if user:
        should_commit = False
        if not user.profile_picture_url and profile_picture_url:
            user.profile_picture_url = profile_picture_url
            should_commit = True
        if apply_acquisition_context(user, acquisition_context):
            should_commit = True
        if should_commit:
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
    apply_acquisition_context(new_user, acquisition_context)
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
    apply_acquisition_context(db_user, user_create.acquisition_context)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user

def get_document(session: Session, document_id: int) -> models.Document | None:
    return session.get(models.Document, document_id)

def create_document_for_user(
    session: Session,
    user_id: int,
    file_path: str,
    title: Optional[str] = None,
    study_language: Optional[str] = None,
    folder_id: Optional[int] = None,
    generates_flashcards: bool = True,
    generates_quizzes: bool = False,
    page_selection_raw: Optional[str] = None,
) -> models.Document:
    db_document = models.Document(
        user_id=user_id, 
        file_path=file_path,
        title=title,
        study_language=study_language,
        folder_id=folder_id,
        generates_flashcards=generates_flashcards,
        generates_quizzes=generates_quizzes,
        page_selection_raw=page_selection_raw,
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
            sanitized_data = {
                **fc_data,
                "type": normalize_flashcard_type(fc_data.get("type")),
            }
            db_flashcard = models.Flashcard(**sanitized_data, document_id=document_id)
            # next_review fica NULL — card é "Novo" até o primeiro estudo
            db_flashcards.append(db_flashcard)
    if db_flashcards:
        session.add_all(db_flashcards)
        session.commit()
        for db_fc in db_flashcards:
            session.refresh(db_fc)
    return db_flashcards

def get_flashcards_by_document(session: Session, document_id: int) -> list[models.Flashcard]:
    statement = (
        select(models.Flashcard)
        .where(models.Flashcard.document_id == document_id)
        .order_by(models.Flashcard.id.asc())
    )
    return session.exec(statement).all()

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
    """
    stmt = (
        select(models.Document)
        .where(models.Document.id == document_id)
        .options(
            selectinload(models.Document.flashcards),
            selectinload(models.Document.quiz).selectinload(models.Quiz.questions).selectinload(models.Question.answers)
        )
    )
    db_document = session.exec(stmt).first()
    
    if db_document:
        if getattr(db_document, "quiz", None) and getattr(db_document.quiz, "questions", None):
            db_document.quiz.questions = sorted(
                db_document.quiz.questions,
                key=lambda question: question.id or 0,
            )
                
    return db_document


def serialize_flashcards_snapshot(document: models.Document) -> list[dict[str, Any]]:
    return [
        {
            "front": flashcard.front,
            "back": flashcard.back,
            "type": flashcard.type.value if isinstance(flashcard.type, models.FlashcardType) else str(flashcard.type),
        }
        for flashcard in (document.flashcards or [])
    ]


def serialize_quiz_snapshot(quiz: Optional[models.Quiz]) -> Optional[dict[str, Any]]:
    if not quiz:
        return None

    questions = sorted(list(quiz.questions or []), key=lambda question: question.id or 0)
    return {
        "title": quiz.title,
        "questions": [
            {
                "text": question.text,
                "answers": [
                    {
                        "text": answer.text,
                        "is_correct": answer.is_correct,
                        "explanation": answer.explanation,
                    }
                    for answer in (question.answers or [])
                ],
            }
            for question in questions
        ],
    }


def serialize_guided_study_snapshot(document: models.Document) -> Optional[dict[str, Any]]:
    if not document.guided_study_cache:
        return None

    try:
        return schemas.GuidedStudyResponse.model_validate(document.guided_study_cache).model_dump()
    except Exception:
        return None


def create_shared_deck_snapshot(
    session: Session,
    document: models.Document,
    owner_user_id: int,
) -> models.SharedDeck:
    flashcards_snapshot = serialize_flashcards_snapshot(document)
    quiz_snapshot = serialize_quiz_snapshot(document.quiz)
    guided_study_snapshot = serialize_guided_study_snapshot(document)

    shared_deck = models.SharedDeck(
        source_document_id=document.id,
        owner_user_id=owner_user_id,
        title=document.title or document.file_path,
        file_path=document.file_path,
        study_language=document.study_language,
        extracted_text=document.extracted_text,
        generates_flashcards=bool(flashcards_snapshot) or document.generates_flashcards,
        generates_quizzes=bool(quiz_snapshot and quiz_snapshot.get("questions")) or document.generates_quizzes,
        srs_enabled=getattr(document, "srs_enabled", True),
        flashcards_snapshot=flashcards_snapshot,
        quiz_snapshot=quiz_snapshot,
        guided_study_snapshot=guided_study_snapshot,
        extra_features_snapshot={},
    )
    session.add(shared_deck)
    session.commit()
    session.refresh(shared_deck)
    return shared_deck


def get_shared_deck_by_token(session: Session, token: str) -> Optional[models.SharedDeck]:
    statement = select(models.SharedDeck).where(models.SharedDeck.token == token)
    return session.exec(statement).first()


def clone_shared_deck_to_user_library(
    session: Session,
    shared_deck: models.SharedDeck,
    user_id: int,
) -> models.Document:
    now = datetime.now(timezone.utc)
    imported_document = models.Document(
        user_id=user_id,
        file_path=shared_deck.file_path or shared_deck.title,
        title=shared_deck.title,
        study_language=shared_deck.study_language,
        status=models.DocumentStatus.COMPLETED,
        generates_flashcards=shared_deck.generates_flashcards,
        generates_quizzes=shared_deck.generates_quizzes,
        extracted_text=shared_deck.extracted_text,
        current_step=None,
        can_cancel=False,
        processing_progress=100.0,
        srs_enabled=shared_deck.srs_enabled,
        studied_flashcard_ids=[],
        created_at=now,
    )
    session.add(imported_document)
    session.flush()

    for flashcard_data in shared_deck.flashcards_snapshot or []:
        session.add(
            models.Flashcard(
                front=str(flashcard_data.get("front", "")).strip(),
                back=str(flashcard_data.get("back", "")).strip(),
                type=normalize_flashcard_type(flashcard_data.get("type")),
                document_id=imported_document.id,
                ease_factor=2.5,
                interval_days=1,
                repetitions=0,
                next_review=None,
            )
        )

    quiz_snapshot = shared_deck.quiz_snapshot or None
    if quiz_snapshot:
        quiz = models.Quiz(
            title=str(quiz_snapshot.get("title", "Quiz")),
            document_id=imported_document.id,
        )
        session.add(quiz)
        session.flush()

        for question_data in quiz_snapshot.get("questions", []):
            question = models.Question(
                text=str(question_data.get("text", "")).strip(),
                quiz_id=quiz.id,
                ease_factor=2.5,
                interval_days=1,
                repetitions=0,
                next_review=None,
            )
            session.add(question)
            session.flush()

            for answer_data in question_data.get("answers", []):
                session.add(
                    models.Answer(
                        text=str(answer_data.get("text", "")).strip(),
                        is_correct=bool(answer_data.get("is_correct", False)),
                        explanation=answer_data.get("explanation"),
                        question_id=question.id,
                    )
                )

    guided_study_snapshot = shared_deck.guided_study_snapshot or None
    if guided_study_snapshot:
        guided_study_cache = dict(guided_study_snapshot)
        guided_study_cache["document_id"] = imported_document.id
        guided_study_cache["title"] = imported_document.title or imported_document.file_path
        imported_document.guided_study_cache = guided_study_cache

    session.add(imported_document)
    session.commit()
    session.refresh(imported_document)
    return get_document_with_details(session, imported_document.id) or imported_document


def get_document_with_details_for_update(session: Session, document_id: int) -> Optional[models.Document]:
    """
    Busca um documento com relações carregadas e trava a linha do documento
    para evitar gerações concorrentes do mesmo estudo guiado.
    """
    stmt = (
        select(models.Document)
        .where(models.Document.id == document_id)
        .with_for_update()
        .options(
            selectinload(models.Document.flashcards),
            selectinload(models.Document.quiz).selectinload(models.Quiz.questions).selectinload(models.Question.answers)
        )
    )
    db_document = session.exec(stmt).first()

    if db_document:
        if getattr(db_document, "quiz", None) and getattr(db_document.quiz, "questions", None):
            db_document.quiz.questions = sorted(
                db_document.quiz.questions,
                key=lambda question: question.id or 0,
            )

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

def create_study_log(
    session: Session,
    user_id: int,
    flashcard_id: int,
    accuracy: float,
    *,
    started_at: datetime | None = None,
    studied_at: datetime | None = None,
) -> models.StudyLog:
    studied_at = studied_at or datetime.now(timezone.utc)
    if started_at is None or started_at > studied_at:
        started_at = studied_at

    db_study_log = models.StudyLog(
        user_id=user_id,
        flashcard_id=flashcard_id,
        accuracy=accuracy,
        started_at=started_at,
        studied_at=studied_at,
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

def update_flashcard(db: Session, flashcard_id: int, front: str | None = None, back: str | None = None) -> models.Flashcard | None:
    """
    Atualiza o conteúdo de um flashcard (frente e/ou verso).
    """
    db_flashcard = db.get(models.Flashcard, flashcard_id)
    
    if not db_flashcard:
        return None

    # Atualiza apenas se os valores foram passados
    if front is not None:
        db_flashcard.front = front
    if back is not None:
        db_flashcard.back = back

    db.add(db_flashcard)
    db.commit()
    db.refresh(db_flashcard)
    
    return db_flashcard


def delete_flashcard_and_related_data(db: Session, flashcard: models.Flashcard) -> None:
    study_logs = db.exec(
        select(models.StudyLog).where(models.StudyLog.flashcard_id == flashcard.id)
    ).all()
    for log in study_logs:
        db.delete(log)

    conversations = db.exec(
        select(models.FlashcardConversation).where(
            models.FlashcardConversation.flashcard_id == flashcard.id
        )
    ).all()
    for conversation in conversations:
        db.delete(conversation)

    db.delete(flashcard)


def reset_guided_study_state(session: Session, db_document: models.Document) -> None:
    db_document.guided_study_cache = None
    session.add(db_document)

    stmt = select(models.GuidedStudySession).where(
        models.GuidedStudySession.document_id == db_document.id
    )
    for stale in session.exec(stmt).all():
        stale.completed_step_ids = []
        stale.completed_at = None
        session.add(stale)

    session.commit()

def delete_document_and_related_data(db: Session, document_id: int) -> bool:
    """
    Exclui um documento e todos os dados associados (flashcards, logs de estudo).
    """
    db_document = db.get(models.Document, document_id)
    if not db_document:
        return False

    quiz_id = db_document.quiz.id if db_document.quiz else None
    flashcard_ids = [flashcard.id for flashcard in db_document.flashcards]

    if flashcard_ids:
        study_logs_to_delete = db.exec(
            select(models.StudyLog).where(models.StudyLog.flashcard_id.in_(flashcard_ids))
        ).all()
        for log in study_logs_to_delete:
            db.delete(log)

        conversations_to_delete = db.exec(
            select(models.FlashcardConversation).where(
                models.FlashcardConversation.flashcard_id.in_(flashcard_ids)
            )
        ).all()
        for conversation in conversations_to_delete:
            db.delete(conversation)

    guided_sessions_to_delete = db.exec(
        select(models.GuidedStudySession).where(
            models.GuidedStudySession.document_id == document_id
        )
    ).all()
    for guided_session in guided_sessions_to_delete:
        db.delete(guided_session)

    if quiz_id is not None:
        quiz_attempts_to_delete = db.exec(
            select(models.QuizAttempt).where(models.QuizAttempt.quiz_id == quiz_id)
        ).all()
        for quiz_attempt in quiz_attempts_to_delete:
            db.delete(quiz_attempt)

        product_events_to_detach = db.exec(
            select(models.ProductEvent).where(
                or_(
                    models.ProductEvent.document_id == document_id,
                    models.ProductEvent.quiz_id == quiz_id,
                )
            )
        ).all()
    else:
        product_events_to_detach = db.exec(
            select(models.ProductEvent).where(models.ProductEvent.document_id == document_id)
        ).all()

    for product_event in product_events_to_detach:
        if product_event.document_id == document_id:
            product_event.document_id = None
        if quiz_id is not None and product_event.quiz_id == quiz_id:
            product_event.quiz_id = None
        db.add(product_event)

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


def get_effective_generation_limit(user: models.User) -> int:
    return DAILY_GENERATION_LIMIT + max(0, user.daily_bonus_generation_count)


def is_feedback_reward_available(user: models.User) -> bool:
    return user.feedback_reward_offer_shown_at is None and user.feedback_reward_granted_at is None


def can_claim_feedback_reward(user: models.User) -> bool:
    if user.feedback_reward_granted_at is not None:
        return False

    if user.feedback_reward_offer_shown_at is None:
        return True

    return (datetime.now(timezone.utc) - user.feedback_reward_offer_shown_at) <= FEEDBACK_REWARD_CLAIM_WINDOW

def check_and_reset_daily_limit(session: Session, user: models.User) -> None:
    """
    Verifica se precisa resetar o contador diário do usuário.
    Reseta se passou mais de 24h desde o último reset.
    """
    now = datetime.now(timezone.utc)
    
    # Se nunca foi resetado, inicializa
    if user.last_generation_reset is None:
        user.last_generation_reset = now
        user.daily_generation_count = 0
        user.daily_bonus_generation_count = 0
        session.add(user)
        session.commit()
        return
    
    # Verifica se passou 24h
    time_since_reset = now - user.last_generation_reset
    if time_since_reset >= timedelta(hours=24):
        user.last_generation_reset = now
        user.daily_generation_count = 0
        user.daily_bonus_generation_count = 0
        session.add(user)
        session.commit()
        return

    effective_limit = get_effective_generation_limit(user)
    if user.daily_generation_count > effective_limit:
        user.daily_generation_count = effective_limit
        session.add(user)
        session.commit()

def can_user_generate_deck(
    session: Session,
    user: models.User,
    required_generations: int = 1,
) -> tuple[bool, int]:
    """
    Verifica se o usuário pode gerar um novo deck.
    Retorna (pode_gerar, gerações_restantes)
    """
    # Primeiro, verifica e reseta se necessário
    check_and_reset_daily_limit(session, user)
    
    # Atualiza o usuário após possível reset
    session.refresh(user)

    effective_limit = get_effective_generation_limit(user)
    can_generate = (user.daily_generation_count + required_generations) <= effective_limit
    remaining = max(0, effective_limit - user.daily_generation_count)
    
    return can_generate, remaining

def increment_user_generation_count(session: Session, user_id: int, amount: int = 1) -> None:
    """
    Incrementa o contador de gerações do usuário.
    Deve ser chamado APENAS quando a geração for bem-sucedida.
    """
    user = session.get(models.User, user_id)
    if user and amount > 0:
        check_and_reset_daily_limit(session, user)
        session.refresh(user)
        effective_limit = get_effective_generation_limit(user)
        user.daily_generation_count = min(
            effective_limit,
            user.daily_generation_count + amount,
        )
        session.add(user)
        session.commit()


def mark_feedback_reward_offer_shown(session: Session, user: models.User) -> bool:
    check_and_reset_daily_limit(session, user)
    session.refresh(user)
    if not is_feedback_reward_available(user):
        return False

    user.feedback_reward_offer_shown_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    session.refresh(user)
    return True


def grant_feedback_generation_bonus(
    session: Session,
    user: models.User,
    amount: int = FEEDBACK_GENERATION_BONUS,
) -> bool:
    check_and_reset_daily_limit(session, user)
    session.refresh(user)
    if amount <= 0 or not can_claim_feedback_reward(user):
        return False

    now = datetime.now(timezone.utc)
    user.feedback_reward_offer_shown_at = user.feedback_reward_offer_shown_at or now
    user.feedback_reward_granted_at = now
    user.daily_bonus_generation_count = max(0, user.daily_bonus_generation_count) + amount
    session.add(user)
    session.commit()
    session.refresh(user)
    return True

def get_user_generation_info(session: Session, user: models.User) -> dict:
    """
    Retorna informações sobre o limite de gerações do usuário.
    """
    check_and_reset_daily_limit(session, user)
    session.refresh(user)

    effective_limit = get_effective_generation_limit(user)
    remaining = max(0, effective_limit - user.daily_generation_count)
    
    # Calcula quanto tempo falta para o reset
    if user.last_generation_reset:
        next_reset = user.last_generation_reset + timedelta(hours=24)
        time_until_reset = next_reset - datetime.now(timezone.utc)
        hours_until_reset = int(time_until_reset.total_seconds() / 3600)
    else:
        hours_until_reset = 24
    
    return {
        "used": user.daily_generation_count,
        "remaining": remaining,
        "limit": effective_limit,
        "hours_until_reset": hours_until_reset,
        "bonus_generations": max(0, user.daily_bonus_generation_count),
        "feedback_reward_available": is_feedback_reward_available(user),
        "feedback_reward_claimed": user.feedback_reward_granted_at is not None,
    }

def shuffle_quiz_answers(quiz_data: dict) -> dict:
    """
    Embaralha as alternativas de cada pergunta do quiz para evitar padrões previsíveis.
    Mantém a estrutura do quiz intacta.
    """
    shuffled_quiz = quiz_data.copy()
    
    for question in shuffled_quiz.get("questions", []):
        if "answers" in question and isinstance(question["answers"], list):
            # Embaralha as alternativas
            random.shuffle(question["answers"])
    
    return shuffled_quiz

def create_quiz_for_document(db: Session, quiz_data: schemas.QuizCreate, document_id: int) -> models.Quiz:
    """
    Cria um novo quiz completo, com todas as suas perguntas e respostas,
    e associa-o a um documento existente.
    
    🆕 AGORA COM EMBARALHAMENTO DE ALTERNATIVAS
    """
    questions_to_create = []
    for question_schema in quiz_data.questions:
        # 🆕 Embaralha as alternativas antes de criar
        shuffled_answers = question_schema.answers.copy()
        random.shuffle(shuffled_answers)
        
        answers_to_create = [
            models.Answer(**ans.dict()) for ans in shuffled_answers
        ]
        question_obj = models.Question(
            text=question_schema.text, answers=answers_to_create
        )
        # next_review fica NULL — questão é "Nova" até a primeira tentativa
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
