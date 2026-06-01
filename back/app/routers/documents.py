# back/app/routers/documents.py

import shutil
import os
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
import re
from typing import Optional, List, Sequence, TypeVar
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Response
from sqlmodel import Session, select
from typing_extensions import Annotated

from .. import crud, models, security, schemas
from ..analytics import mark_user_first_deck_created, track_product_event
from ..database import get_session
from ..pdf_page_selection import PageSelectionError, parse_page_selection
from ..security import get_current_user
from ..tasks import process_document 
from ..text_extractor import get_pdf_page_count, get_pdf_page_previews
from ..ai_generator import (
    generate_flashcards_from_text,
    generate_guided_study_topics,
    generate_quiz_from_text,
)
from ..study_ordering import order_for_start
from pydantic import BaseModel, Field


router = APIRouter(prefix="/documents", tags=["Documents"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

ALLOWED_UPLOAD_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/octet-stream",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".docx",
    ".pptx",
}

SUPPORTED_STUDY_LANGUAGES = {
    "pt-BR",
    "en",
    "es",
    "fr",
    "de",
    "it",
}

class AddFlashcardsRequest(BaseModel):
    num_flashcards: int = Field(ge=1, le=20)
    difficulty: str = "Médio"

class AddQuestionsRequest(BaseModel):
    num_questions: int = Field(ge=1, le=15)
    difficulty: str = "Médio"

class TextInput(BaseModel):
    text: str
    title: str
    study_language: Optional[str] = None
    folder_id: Optional[int] = None
    generate_flashcards: bool = True
    generate_quizzes: bool = False
    content_type: str = "flashcards"
    num_flashcards: int = Field(default=10, ge=1, le=50)
    difficulty: str = "Médio"
    num_questions: int = Field(default=5, ge=3, le=25)


T = TypeVar("T")

def sanitize_filename(name: str) -> str:
    """Cria um nome de arquivo seguro a partir de uma string."""
    name = name.lower().replace(' ', '_')
    name = re.sub(r'[^a-z0-9_.-]', '', name)
    return name[:100]


def build_storage_basename(title: str, original_filename: Optional[str] = None) -> str:
    safe_title = sanitize_filename(title)
    if safe_title:
        return safe_title

    original_stem = Path(original_filename or "").stem
    safe_original_stem = sanitize_filename(original_stem)
    if safe_original_stem:
        return safe_original_stem

    return "documento"


def _is_allowed_upload(file: UploadFile) -> bool:
    suffix = Path(file.filename or "").suffix.lower()
    content_type = (file.content_type or "").lower()
    if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        return False
    return not content_type or content_type in ALLOWED_UPLOAD_MIME_TYPES


def _validate_pdf_page_selection_for_file(
    file_path_on_disk: Path,
    page_selection_raw: Optional[str],
) -> Optional[str]:
    normalized_selection = (page_selection_raw or "").strip() or None
    if normalized_selection is None:
        return None

    total_pages = get_pdf_page_count(str(file_path_on_disk))
    parse_page_selection(normalized_selection, total_pages=total_pages)
    return normalized_selection


def _truncate_topic_title(text: str, fallback: str) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return fallback
    return cleaned if len(cleaned) <= 48 else f"{cleaned[:45].rstrip()}..."


def _normalize_study_language(study_language: Optional[str]) -> Optional[str]:
    normalized = (study_language or "").strip() or None
    if normalized is None or normalized.lower() == "auto":
        return None

    if normalized not in SUPPORTED_STUDY_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail="Idioma de estudo inválido.",
        )

    return normalized


def _enforce_generation_limit(
    session: Session,
    current_user: models.User,
    *,
    required_generations: int = 1,
) -> None:
    can_generate, _ = crud.can_user_generate_deck(
        session,
        current_user,
        required_generations=required_generations,
    )

    if can_generate:
        return

    generation_info = crud.get_user_generation_info(session, current_user)
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "message": "Limite diário de gerações atingido",
            "limit": generation_info["limit"],
            "used": generation_info["used"],
            "hours_until_reset": generation_info["hours_until_reset"],
        },
    )


def _normalize_rich_text(text: str) -> str:
    return (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def _distribute_evenly(items: Sequence[T], bucket_count: int) -> list[list[T]]:
    if bucket_count <= 0:
        return []

    buckets: list[list[T]] = [[] for _ in range(bucket_count)]
    for index, item in enumerate(items):
        buckets[index % bucket_count].append(item)
    return buckets


def _build_guided_steps(
    flashcards: Sequence[models.Flashcard],
    questions: Sequence[models.Question],
) -> list[schemas.GuidedStudyStep]:
    steps: list[schemas.GuidedStudyStep] = []
    step_order = 1

    for flashcard in flashcards:
        steps.append(
            schemas.GuidedStudyStep(
                id=f"step-fc-{flashcard.id}",
                type="flashcard",
                order=step_order,
                flashcard_id=flashcard.id,
                front=flashcard.front,
                back=flashcard.back,
            )
        )
        step_order += 1

    for question in questions:
        steps.append(
            schemas.GuidedStudyStep(
                id=f"step-q-{question.id}",
                type="question",
                order=step_order,
                question_id=question.id,
                prompt=question.text,
                answers=[
                    schemas.Answer.model_validate(answer, from_attributes=True)
                    for answer in (question.answers or [])
                ],
            )
        )
        step_order += 1

    return steps


_PEDAGOGICAL_STAGE_NAMES = [
    "Fundamentos",
    "Conceitos centrais",
    "Desenvolvimento",
    "Aprofundamento",
    "Aplicações",
    "Consolidação",
]


def _pedagogical_title(topic_index: int, topic_count: int) -> str:
    if topic_count == 1:
        return "Conteúdo completo"
    if topic_count == 2:
        return ["Introdução", "Consolidação"][topic_index]
    if topic_count == 3:
        return ["Fundamentos", "Desenvolvimento", "Consolidação"][topic_index]
    if topic_index == 0:
        return "Fundamentos"
    if topic_index == topic_count - 1:
        return "Consolidação"
    mid_labels = _PEDAGOGICAL_STAGE_NAMES[1:-1]
    return mid_labels[(topic_index - 1) % len(mid_labels)]


def _build_guided_topics_from_even_distribution(
    ordered_flashcards: Sequence[models.Flashcard],
    ordered_questions: Sequence[models.Question],
) -> list[schemas.GuidedStudyTopic]:
    fc_count = len(ordered_flashcards)
    q_count = len(ordered_questions)

    # Target 2-3 flashcards per topic; number of topics bounded by available questions.
    FLASHCARDS_PER_TOPIC = 3
    ideal_by_flashcards = max(1, (fc_count + FLASHCARDS_PER_TOPIC - 1) // FLASHCARDS_PER_TOPIC)
    topic_count = max(1, min(ideal_by_flashcards, q_count))

    flashcard_buckets = _distribute_evenly(ordered_flashcards, topic_count)
    question_buckets = _distribute_evenly(ordered_questions, topic_count)

    topics: list[schemas.GuidedStudyTopic] = []

    for topic_index in range(topic_count):
        topic_flashcards = flashcard_buckets[topic_index]
        topic_questions = question_buckets[topic_index]
        steps = _build_guided_steps(topic_flashcards, topic_questions)

        topics.append(
            schemas.GuidedStudyTopic(
                id=f"topic-{topic_index + 1}",
                title=_pedagogical_title(topic_index, topic_count),
                order=topic_index + 1,
                steps=steps,
            )
        )

    return topics


def _clear_guided_study_cache(db_document: models.Document, session: Session) -> None:
    crud.reset_guided_study_state(session, db_document)


def _guided_study_requires_ai_generation(db_document: models.Document) -> bool:
    if not db_document.guided_study_cache:
        return True

    try:
        cached = schemas.GuidedStudyResponse.model_validate(db_document.guided_study_cache)
        if not cached.summary.is_fallback:
            return False

        raw_cache = db_document.guided_study_cache or {}
        retry_not_before = raw_cache.get("_fallback_retry_not_before")
        if isinstance(retry_not_before, str):
            try:
                retry_not_before_dt = datetime.fromisoformat(retry_not_before)
                if retry_not_before_dt.tzinfo is None:
                    retry_not_before_dt = retry_not_before_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) < retry_not_before_dt:
                    return False
            except ValueError:
                pass

        return True
    except Exception:
        return True


def _build_guided_study_response(
    db_document: models.Document,
    session: Session,
) -> schemas.GuidedStudyResponse:
    if db_document.guided_study_cache:
        try:
            cached = schemas.GuidedStudyResponse.model_validate(db_document.guided_study_cache)
            if not cached.summary.is_fallback:
                print(f"[guided-study] doc={db_document.id} cache HIT (ai) → returning cached")
                return cached

            raw_cache = db_document.guided_study_cache or {}
            retry_not_before = raw_cache.get("_fallback_retry_not_before")
            if isinstance(retry_not_before, str):
                try:
                    retry_not_before_dt = datetime.fromisoformat(retry_not_before)
                    if retry_not_before_dt.tzinfo is None:
                        retry_not_before_dt = retry_not_before_dt.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) < retry_not_before_dt:
                        print(f"[guided-study] doc={db_document.id} cache HIT (fallback, cooldown) → returning cached")
                        return cached
                except ValueError:
                    pass

            print(f"[guided-study] doc={db_document.id} cache HIT (fallback) → retrying AI generation")
        except Exception:
            pass

    ordered_flashcards = order_for_start(list(db_document.flashcards or []))
    ordered_questions = order_for_start(list(db_document.quiz.questions or [])) if db_document.quiz else []

    if not ordered_flashcards or not ordered_questions:
        raise HTTPException(
            status_code=400,
            detail="O estudo guiado precisa de flashcards e quiz gerados neste deck."
        )

    flashcards_by_id = {flashcard.id: flashcard for flashcard in ordered_flashcards}
    questions_by_id = {question.id: question for question in ordered_questions}

    guided_topics_data = generate_guided_study_topics(
        text=db_document.extracted_text or db_document.file_path,
        flashcards=[
            {"id": flashcard.id, "front": flashcard.front, "back": flashcard.back}
            for flashcard in ordered_flashcards
        ],
        questions=[
            {"id": question.id, "text": question.text}
            for question in ordered_questions
        ],
    )

    topics: list[schemas.GuidedStudyTopic] = []

    if guided_topics_data:
        used_flashcard_ids: set[int] = set()
        used_question_ids: set[int] = set()

        for topic_index, raw_topic in enumerate(guided_topics_data.get("topics", []), start=1):
            raw_flashcard_ids = raw_topic.get("flashcard_ids", [])
            raw_question_ids = raw_topic.get("question_ids", [])

            topic_flashcards = []
            for flashcard_id in raw_flashcard_ids:
                if (
                    isinstance(flashcard_id, int)
                    and flashcard_id in flashcards_by_id
                    and flashcard_id not in used_flashcard_ids
                ):
                    topic_flashcards.append(flashcards_by_id[flashcard_id])
                    used_flashcard_ids.add(flashcard_id)

            topic_questions = []
            for question_id in raw_question_ids:
                if (
                    isinstance(question_id, int)
                    and question_id in questions_by_id
                    and question_id not in used_question_ids
                ):
                    topic_questions.append(questions_by_id[question_id])
                    used_question_ids.add(question_id)

            if not topic_flashcards and not topic_questions:
                continue

            # Dissolve unbalanced topics back into orphans so the fallback
            # can pair them properly. Both directions must have content.
            if topic_flashcards and not topic_questions:
                for fc in topic_flashcards:
                    used_flashcard_ids.discard(fc.id)
                continue

            if not topic_flashcards and topic_questions:
                for q in topic_questions:
                    used_question_ids.discard(q.id)
                continue

            topic_title = _truncate_topic_title(
                raw_topic.get("title", ""),
                f"Tópico {topic_index}",
            )

            topics.append(
                schemas.GuidedStudyTopic(
                    id=f"topic-{len(topics) + 1}",
                    title=topic_title,
                    order=len(topics) + 1,
                    steps=_build_guided_steps(topic_flashcards, topic_questions),
                )
            )

        remaining_flashcards = [
            flashcard for flashcard in ordered_flashcards if flashcard.id not in used_flashcard_ids
        ]
        remaining_questions = [
            question for question in ordered_questions if question.id not in used_question_ids
        ]

        if remaining_flashcards or remaining_questions:
            fallback_topics = _build_guided_topics_from_even_distribution(
                remaining_flashcards or [],
                remaining_questions or [],
            ) if remaining_flashcards and remaining_questions else []

            if fallback_topics:
                for fallback_topic in fallback_topics:
                    topics.append(
                        schemas.GuidedStudyTopic(
                            id=f"topic-{len(topics) + 1}",
                            title=_truncate_topic_title(fallback_topic.title, f"Tópico {len(topics) + 1}"),
                            order=len(topics) + 1,
                            steps=fallback_topic.steps,
                        )
                    )
            elif topics:
                extra_steps = _build_guided_steps(remaining_flashcards, remaining_questions)
                if extra_steps:
                    last_topic = topics[-1]
                    merged_steps = []
                    for index, step in enumerate(last_topic.steps + extra_steps, start=1):
                        merged_steps.append(step.model_copy(update={"order": index}))
                    topics[-1] = last_topic.model_copy(update={"steps": merged_steps})

    is_fallback = not topics
    if is_fallback:
        print(f"[guided-study] doc={db_document.id} AI returned no valid topics → using deterministic fallback (is_fallback=True)")
        topics = _build_guided_topics_from_even_distribution(ordered_flashcards, ordered_questions)
    else:
        print(f"[guided-study] doc={db_document.id} AI topics accepted → caching with is_fallback=False")

    total_steps = sum(len(topic.steps) for topic in topics)

    response = schemas.GuidedStudyResponse(
        document_id=db_document.id,
        title=db_document.title or db_document.file_path,
        topics=topics,
        summary=schemas.GuidedStudySummary(
            topics_count=len(topics),
            steps_count=total_steps,
            flashcards_count=len(ordered_flashcards),
            questions_count=len(ordered_questions),
            is_fallback=is_fallback,
        ),
    )

    cache_payload = response.model_dump()
    if is_fallback:
        cache_payload["_fallback_retry_not_before"] = (
            datetime.now(timezone.utc) + timedelta(seconds=20)
        ).isoformat()
    db_document.guided_study_cache = cache_payload
    session.add(db_document)
    session.commit()

    return response


def _ensure_exact_flashcard_count(flashcards_data: Sequence[dict], expected_count: int) -> None:
    actual_count = len(flashcards_data or [])
    if actual_count != expected_count:
        raise HTTPException(
            status_code=500,
            detail=f"A IA retornou {actual_count} flashcards, mas eram esperados {expected_count}.",
        )


def _ensure_exact_quiz_question_count(quiz_data: Optional[dict], expected_count: int) -> None:
    actual_count = len((quiz_data or {}).get("questions", []))
    if actual_count != expected_count:
        raise HTTPException(
            status_code=500,
            detail=f"A IA retornou {actual_count} perguntas, mas eram esperadas {expected_count}.",
        )


def _build_document_detail_response(db_document: models.Document) -> schemas.DocumentDetail:
    if getattr(db_document, "quiz", None) and getattr(db_document.quiz, "questions", None):
        db_document.quiz.questions = order_for_start(db_document.quiz.questions)

    return schemas.DocumentDetail(
        id=db_document.id,
        status=db_document.status,
        file_path=db_document.file_path,
        title=db_document.title,
        study_language=db_document.study_language,
        page_selection_raw=db_document.page_selection_raw,
        extracted_text=db_document.extracted_text,
        quiz=db_document.quiz,
        total_flashcards=len(db_document.flashcards or []),
        has_quiz=(db_document.quiz is not None),
        generates_flashcards=db_document.generates_flashcards,
        generates_quizzes=db_document.generates_quizzes,
        current_step=db_document.current_step,
        srs_enabled=getattr(db_document, "srs_enabled", True),
    )


def _build_shared_deck_response(shared_deck: models.SharedDeck) -> schemas.SharedDeckRead:
    guided_study_payload = shared_deck.guided_study_snapshot or None
    shared_guided_study = None
    if guided_study_payload:
        shared_guided_study = schemas.SharedGuidedStudyRead.model_validate(
            {
                "mode": guided_study_payload.get("mode", "guided"),
                "topics": guided_study_payload.get("topics", []),
                "summary": guided_study_payload.get("summary", {}),
            }
        )

    return schemas.SharedDeckRead(
        title=shared_deck.title,
        file_path=shared_deck.file_path,
        study_language=shared_deck.study_language,
        generates_flashcards=shared_deck.generates_flashcards,
        generates_quizzes=shared_deck.generates_quizzes,
        srs_enabled=shared_deck.srs_enabled,
        feature_snapshot_version=shared_deck.feature_snapshot_version,
        flashcards=[
            schemas.SharedFlashcardRead.model_validate(flashcard)
            for flashcard in (shared_deck.flashcards_snapshot or [])
        ],
        quiz=schemas.SharedQuizRead.model_validate(shared_deck.quiz_snapshot)
        if shared_deck.quiz_snapshot
        else None,
        guided_study=shared_guided_study,
        created_at=shared_deck.created_at,
    )

@router.post("/upload", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    file: UploadFile = File(...),
    title: str = Form(...),
    study_language: Optional[str] = Form(default=None),
    folder_id: Optional[int] = Form(default=None),
    generates_flashcards: bool = Form(True),
    generates_quizzes: bool = Form(False),
    content_type: str = Form("flashcards"),
    num_flashcards: int = Form(10),
    difficulty: str = Form("Médio"),
    num_questions: int = Form(5),
    page_selection: Optional[str] = Form(default=None),
):
    required_generations = 2 if content_type == "both" else 1

    _enforce_generation_limit(
        session,
        current_user,
        required_generations=required_generations,
    )
    
    if not _is_allowed_upload(file):
        raise HTTPException(
            status_code=400,
            detail="Tipo de arquivo invalido. Formatos aceitos: PDF, JPG, PNG, DOCX e PPTX."
        )

    original_suffix = Path(file.filename or "").suffix.lower()
    safe_basename = build_storage_basename(title, file.filename)
    final_filename = f"{current_user.id}_{safe_basename}{original_suffix}"
    
    file_path_on_disk = UPLOAD_DIRECTORY / final_filename
    
    with file_path_on_disk.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    normalized_page_selection = None
    normalized_study_language = _normalize_study_language(study_language)
    try:
        if original_suffix == ".pdf":
            normalized_page_selection = _validate_pdf_page_selection_for_file(
                file_path_on_disk,
                page_selection,
            )
        elif page_selection and page_selection.strip():
            raise HTTPException(
                status_code=400,
                detail="O filtro de paginas esta disponivel apenas para arquivos PDF.",
            )
    except PageSelectionError as exc:
        if file_path_on_disk.exists():
            file_path_on_disk.unlink()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=str(file_path_on_disk),
        title=title,
        study_language=normalized_study_language,
        folder_id=folder_id,
        generates_flashcards=generates_flashcards,
        generates_quizzes=generates_quizzes,
        page_selection_raw=normalized_page_selection,
    )
    mark_user_first_deck_created(session, current_user, occurred_at=db_document.created_at)
    track_product_event(
        session,
        "deck_created",
        user_id=current_user.id,
        document_id=db_document.id,
        properties={
            "source": "upload",
            "content_type": content_type,
            "folder_id": folder_id,
            "generates_flashcards": generates_flashcards,
            "generates_quizzes": generates_quizzes,
        },
    )
    
    process_document.delay(
        document_id=db_document.id,
        content_type=content_type,
        num_flashcards=num_flashcards,
        difficulty=difficulty,
        num_questions=num_questions
    )

    return db_document


@router.post("/pdf/inspect", response_model=schemas.PdfInspectResponse)
def inspect_pdf(
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    if not _is_allowed_upload(file) or Path(file.filename or "").suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="A inspecao de paginas esta disponivel apenas para arquivos PDF.",
        )

    temp_path: Optional[Path] = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf",
            dir=UPLOAD_DIRECTORY,
        ) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        total_pages = get_pdf_page_count(str(temp_path))
        return schemas.PdfInspectResponse(
            file_name=file.filename or "documento.pdf",
            total_pages=total_pages,
            pages=[
                schemas.PdfPagePreview.model_validate(page_preview)
                for page_preview in get_pdf_page_previews(str(temp_path))
            ],
        )
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()

@router.post("/text", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def create_document_from_text(
    text_input: TextInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    required_generations = 2 if text_input.content_type == "both" else 1

    _enforce_generation_limit(
        session,
        current_user,
        required_generations=required_generations,
    )
    
    if not text_input.text.strip():
        raise HTTPException(status_code=400, detail="Texto não pode estar vazio")

    normalized_study_language = _normalize_study_language(text_input.study_language)
    
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=text_input.title,
        title=text_input.title,
        study_language=normalized_study_language,
        folder_id=text_input.folder_id,
        generates_flashcards=text_input.generate_flashcards,
        generates_quizzes=text_input.generate_quizzes
    )
    mark_user_first_deck_created(session, current_user, occurred_at=db_document.created_at)
    track_product_event(
        session,
        "deck_created",
        user_id=current_user.id,
        document_id=db_document.id,
        properties={
            "source": "text",
            "content_type": text_input.content_type,
            "folder_id": text_input.folder_id,
            "generates_flashcards": text_input.generate_flashcards,
            "generates_quizzes": text_input.generate_quizzes,
        },
    )

    db_document.extracted_text = text_input.text
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    
    process_document.delay(
        document_id=db_document.id,
        content_type=text_input.content_type,
        num_flashcards=text_input.num_flashcards,
        difficulty=text_input.difficulty,
        num_questions=text_input.num_questions
    )
    
    return db_document

# 🆕 NOVO ENDPOINT PARA VERIFICAR STATUS DO LIMITE
@router.get("/generation-limit", response_model=schemas.GenerationLimitInfo)
def get_generation_limit_status(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Retorna informações sobre o limite de gerações do usuário.
    """
    return crud.get_user_generation_info(session, current_user)

@router.get("/", response_model=list[schemas.DocumentCardData])
def get_user_documents(
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    db_documents = crud.get_documents_by_user(session, user_id=current_user.id)
    
    docs_with_progress = []
    for doc in db_documents:
        total_flashcards = len(doc.flashcards)
        studied_flashcards = crud.get_studied_flashcards_count(session, document_id=doc.id)
        
        # Otimização: calcular as pendências de SRS para cada deck diretamente na listagem
        from datetime import datetime, timezone
        from sqlmodel import select, func
        now = datetime.now(timezone.utc)
        
        fc_pending = 0
        q_pending = 0
        srs_on = getattr(doc, "srs_enabled", True)
        
        if srs_on and doc.status == models.DocumentStatus.COMPLETED:
            fc_stmt = select(func.count(models.Flashcard.id)).where(
                models.Flashcard.document_id == doc.id,
                models.Flashcard.next_review != None,
                models.Flashcard.next_review <= now
            )
            fc_pending = session.exec(fc_stmt).one_or_none() or 0

            q_stmt = select(func.count(models.Question.id)).join(models.Quiz).where(
                models.Quiz.document_id == doc.id,
                models.Question.next_review != None,
                models.Question.next_review <= now
            )
            q_pending = session.exec(q_stmt).one_or_none() or 0

        doc_data = schemas.DocumentCardData(
            id=doc.id,
            file_path=doc.file_path,
            title=doc.title,
            study_language=doc.study_language,
            status=doc.status,
            created_at=doc.created_at,
            total_flashcards=total_flashcards,
            studied_flashcards=studied_flashcards,
            folder_id=doc.folder_id,
            has_quiz=(doc.quiz is not None),
            srs_enabled=srs_on,
            flashcards_pending=fc_pending,
            questions_pending=q_pending
        )
        docs_with_progress.append(doc_data)
            
    return docs_with_progress


@router.get("/shared/{token}", response_model=schemas.SharedDeckRead)
def get_shared_deck(
    token: str,
    session: Session = Depends(get_session),
):
    shared_deck = crud.get_shared_deck_by_token(session, token)
    if not shared_deck:
        raise HTTPException(status_code=404, detail="Link inválido")

    return _build_shared_deck_response(shared_deck)


@router.post("/shared/{token}/import", response_model=schemas.DocumentDetail, status_code=status.HTTP_201_CREATED)
def import_shared_deck(
    token: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    shared_deck = crud.get_shared_deck_by_token(session, token)
    if not shared_deck:
        raise HTTPException(status_code=404, detail="Link inválido")

    imported_document = crud.clone_shared_deck_to_user_library(
        session=session,
        shared_deck=shared_deck,
        user_id=current_user.id,
    )
    mark_user_first_deck_created(session, current_user, occurred_at=imported_document.created_at)
    track_product_event(
        session,
        "deck_shared_snapshot_imported",
        user_id=current_user.id,
        document_id=imported_document.id,
        properties={
            "shared_deck_id": shared_deck.id,
            "shared_token": shared_deck.token,
            "owner_user_id": shared_deck.owner_user_id,
            "source_document_id": shared_deck.source_document_id,
        },
    )
    return _build_document_detail_response(imported_document)


@router.post("/{document_id}/share", response_model=schemas.ShareLinkResponse)
def create_share_link(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document_with_details(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    if db_document.status != models.DocumentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="O deck ainda não está pronto para compartilhamento.")

    shared_deck = crud.create_shared_deck_snapshot(
        session=session,
        document=db_document,
        owner_user_id=current_user.id,
    )

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4000").rstrip("/")
    track_product_event(
        session,
        "deck_shared_snapshot_created",
        user_id=current_user.id,
        document_id=db_document.id,
        properties={
            "shared_deck_id": shared_deck.id,
            "shared_token": shared_deck.token,
            "has_quiz": db_document.quiz is not None,
            "has_guided_study": shared_deck.guided_study_snapshot is not None,
        },
    )
    return schemas.ShareLinkResponse(
        share_url=f"{frontend_url}/shared/{shared_deck.token}",
        token=shared_deck.token,
    )

@router.get("/{document_id}", response_model=schemas.DocumentDetail)
def get_document_details(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Obtém os detalhes completos de um documento, incluindo o quiz.
    ATUALIZADO: Agora força a leitura dos dados mais recentes do banco.
    """
    # CORREÇÃO CRÍTICA: Expira todos os objetos em cache da sessão
    # Isso garante que vamos buscar dados frescos do banco, mesmo que
    # tenham sido atualizados pelo worker do Celery (outro processo)
    session.expire_all()
    
    # Busca o objeto completo da base de dados
    db_document = crud.get_document_with_details(session, document_id)
    
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Debug: descomentar para verificar o que está sendo recebido
    print(f"[ENDPOINT] Doc {document_id} - current_step: {db_document.current_step}, status: {db_document.status}")

    return _build_document_detail_response(db_document)

@router.get("/{document_id}/flashcards", response_model=list[models.Flashcard])
def get_document_flashcards(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    return order_for_start(crud.get_flashcards_by_document(session, document_id=document_id))


@router.put("/{document_id}/flashcards/bulk", response_model=list[models.Flashcard])
def bulk_update_document_flashcards(
    document_id: int,
    body: schemas.FlashcardBulkUpdateRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document_with_details(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    existing_flashcards = {flashcard.id: flashcard for flashcard in db_document.flashcards}
    touched = False

    for item in body.flashcards:
        front = _normalize_rich_text(item.front)
        back = _normalize_rich_text(item.back)

        if item.id is not None:
            db_flashcard = existing_flashcards.get(item.id)
            if not db_flashcard:
                raise HTTPException(status_code=404, detail="Flashcard não encontrado neste deck")

            if item.is_deleted:
                crud.delete_flashcard_and_related_data(session, db_flashcard)
                touched = True
                continue

            if not front or not back:
                raise HTTPException(status_code=400, detail="Frente e verso do flashcard são obrigatórios")

            if db_flashcard.front != front or db_flashcard.back != back:
                db_flashcard.front = front
                db_flashcard.back = back
                session.add(db_flashcard)
                touched = True
            continue

        if item.is_deleted:
            continue

        if not front or not back:
            raise HTTPException(status_code=400, detail="Frente e verso do flashcard são obrigatórios")

        session.add(
            models.Flashcard(
                front=front,
                back=back,
                type=crud.normalize_flashcard_type(item.type),
                document_id=document_id,
            )
        )
        touched = True

    session.commit()

    if touched:
        crud.reset_guided_study_state(session, db_document)

    return crud.get_flashcards_by_document(session, document_id=document_id)


@router.put("/{document_id}/quiz/bulk", response_model=schemas.Quiz)
def bulk_update_document_quiz(
    document_id: int,
    body: schemas.QuizBulkUpdateRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document_with_details(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    if not db_document.quiz:
        raise HTTPException(status_code=400, detail="Este deck ainda não possui quiz.")

    existing_questions = {question.id: question for question in db_document.quiz.questions}
    touched = False

    for item in body.questions:
        active_answers = [answer for answer in item.answers if answer.text.strip()]
        correct_answers = [answer for answer in active_answers if answer.is_correct]

        if not item.is_deleted:
            if not item.text.strip():
                raise HTTPException(status_code=400, detail="Toda pergunta precisa de um enunciado.")
            if len(active_answers) < 2:
                raise HTTPException(status_code=400, detail="Cada pergunta precisa de ao menos 2 alternativas.")
            if len(correct_answers) != 1:
                raise HTTPException(status_code=400, detail="Cada pergunta precisa ter exatamente 1 alternativa correta.")

        if item.id is not None:
            db_question = existing_questions.get(item.id)
            if not db_question:
                raise HTTPException(status_code=404, detail="Pergunta não encontrada neste quiz")

            if item.is_deleted:
                session.delete(db_question)
                touched = True
                continue

            question_text = item.text.strip()
            if db_question.text != question_text:
                db_question.text = question_text
                session.add(db_question)
                touched = True

            existing_answers = {answer.id: answer for answer in db_question.answers}
            kept_answer_ids: set[int] = set()

            for answer_item in active_answers:
                answer_text = answer_item.text.strip()
                explanation = (answer_item.explanation or "").strip() or None

                if answer_item.id is not None:
                    db_answer = existing_answers.get(answer_item.id)
                    if not db_answer:
                        raise HTTPException(status_code=404, detail="Alternativa não encontrada nesta pergunta")

                    if (
                        db_answer.text != answer_text
                        or db_answer.explanation != explanation
                        or db_answer.is_correct != answer_item.is_correct
                    ):
                        db_answer.text = answer_text
                        db_answer.explanation = explanation
                        db_answer.is_correct = answer_item.is_correct
                        session.add(db_answer)
                        touched = True

                    kept_answer_ids.add(db_answer.id)
                    continue

                session.add(
                    models.Answer(
                        text=answer_text,
                        explanation=explanation,
                        is_correct=answer_item.is_correct,
                        question_id=db_question.id,
                    )
                )
                touched = True

            for answer in db_question.answers:
                if answer.id not in kept_answer_ids:
                    session.delete(answer)
                    touched = True

            continue

        if item.is_deleted:
            continue

        answers = [
            models.Answer(
                text=answer.text.strip(),
                explanation=(answer.explanation or "").strip() or None,
                is_correct=answer.is_correct,
            )
            for answer in active_answers
        ]
        session.add(
            models.Question(
                text=item.text.strip(),
                quiz_id=db_document.quiz.id,
                answers=answers,
            )
        )
        touched = True

    session.commit()

    if touched:
        crud.reset_guided_study_state(session, db_document)

    updated_document = crud.get_document_with_details(session, document_id)
    if not updated_document or not updated_document.quiz:
        raise HTTPException(status_code=404, detail="Quiz não encontrado após atualização.")

    return updated_document.quiz


@router.get("/{document_id}/guided-study", response_model=schemas.GuidedStudyResponse)
def get_document_guided_study(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document_with_details_for_update(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    if db_document.status != models.DocumentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="O deck ainda não está pronto para iniciar o estudo guiado.")

    requires_generation = _guided_study_requires_ai_generation(db_document)

    if requires_generation:
        can_generate, remaining = crud.can_user_generate_deck(session, current_user)

        if not can_generate:
            generation_info = crud.get_user_generation_info(session, current_user)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Limite diário de gerações atingido",
                    "limit": generation_info["limit"],
                    "used": generation_info["used"],
                    "hours_until_reset": generation_info["hours_until_reset"]
                }
            )

    response = _build_guided_study_response(db_document, session)

    if requires_generation and not response.summary.is_fallback:
        crud.increment_user_generation_count(session, current_user.id)

    return response


@router.get("/{document_id}/guided-study/progress", response_model=schemas.GuidedStudyProgressRead)
def get_guided_study_progress(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    statement = select(models.GuidedStudySession).where(
        models.GuidedStudySession.user_id == current_user.id,
        models.GuidedStudySession.document_id == document_id,
    )
    db_session = session.exec(statement).first()
    cached = db_document.guided_study_cache
    total_steps = cached["summary"]["steps_count"] if cached else 0
    now = datetime.now(timezone.utc)

    if not db_session:
        return schemas.GuidedStudyProgressRead(
            document_id=document_id,
            completed_step_ids=[],
            total_steps=total_steps,
            started_at=now,
            last_accessed_at=now,
            completed_at=None,
            is_completed=False,
        )

    return schemas.GuidedStudyProgressRead(
        document_id=document_id,
        completed_step_ids=db_session.completed_step_ids or [],
        total_steps=total_steps,
        started_at=db_session.started_at,
        last_accessed_at=db_session.last_accessed_at,
        completed_at=db_session.completed_at,
        is_completed=db_session.completed_at is not None,
    )


@router.post("/{document_id}/guided-study/restructure", status_code=200)
def restructure_guided_study(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """Limpa o cache da trilha guiada e reseta a sessão do usuário.
    A próxima abertura do estudo guiado gerará uma nova estrutura via IA."""
    db_document = crud.get_document_with_details_for_update(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    can_generate, remaining = crud.can_user_generate_deck(session, current_user)

    if not can_generate:
        generation_info = crud.get_user_generation_info(session, current_user)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Limite diário de gerações atingido",
                "limit": generation_info["limit"],
                "used": generation_info["used"],
                "hours_until_reset": generation_info["hours_until_reset"]
            }
        )

    _clear_guided_study_cache(db_document, session)
    db_document = crud.get_document_with_details_for_update(session, document_id)
    response = _build_guided_study_response(db_document, session)
    if not response.summary.is_fallback:
        crud.increment_user_generation_count(session, current_user.id)
    return {"message": "Trilha reestruturada com sucesso."}


@router.post("/{document_id}/guided-study/progress", response_model=schemas.GuidedStudyProgressRead)
def save_guided_study_progress(
    document_id: int,
    body: schemas.GuidedStudyProgressUpdate,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    statement = select(models.GuidedStudySession).where(
        models.GuidedStudySession.user_id == current_user.id,
        models.GuidedStudySession.document_id == document_id,
    )
    db_session = session.exec(statement).first()

    now = datetime.now(timezone.utc)

    if db_session:
        db_session.completed_step_ids = body.completed_step_ids
        db_session.last_accessed_at = now
        if body.is_completed:
            db_session.completed_at = now
        else:
            db_session.completed_at = None
    else:
        db_session = models.GuidedStudySession(
            user_id=current_user.id,
            document_id=document_id,
            completed_step_ids=body.completed_step_ids,
            started_at=now,
            last_accessed_at=now,
            completed_at=now if body.is_completed else None,
        )

    session.add(db_session)
    session.commit()
    session.refresh(db_session)

    cached = db_document.guided_study_cache
    total_steps = cached["summary"]["steps_count"] if cached else 0

    return schemas.GuidedStudyProgressRead(
        document_id=document_id,
        completed_step_ids=db_session.completed_step_ids or [],
        total_steps=total_steps,
        started_at=db_session.started_at,
        last_accessed_at=db_session.last_accessed_at,
        completed_at=db_session.completed_at,
        is_completed=db_session.completed_at is not None,
    )

@router.post("/{document_id}/cancel")
def cancel_document_processing(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    document = crud.get_document(session, document_id=document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != models.DocumentStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Document is not being processed")
    
    document.status = models.DocumentStatus.CANCELLED
    document.current_step = "Processamento cancelado pelo usuário"
    session.add(document)
    session.commit()
    
    return {"message": "Document processing cancelled successfully"}

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(security.get_current_user),
):
    db_document = crud.get_document(db, document_id=document_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if db_document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    success = crud.delete_document_and_related_data(db=db, document_id=document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found during deletion")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

class SRSToggleRequest(BaseModel):
    srs_enabled: bool

@router.patch("/{document_id}/srs")
def toggle_document_srs(
    document_id: int,
    data: SRSToggleRequest,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    """Ativa ou desativa as revisões diárias (SRS) para este documento."""
    db_document = crud.get_document(db, document_id=document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    db_document.srs_enabled = data.srs_enabled
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    return {"message": "Configuração atualizada com sucesso", "srs_enabled": db_document.srs_enabled}

@router.patch("/{document_id}/move", response_model=schemas.DocumentRead)
def move_document_to_folder(
    document_id: int,
    data: schemas.DocumentUpdateFolder,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    db_document = crud.update_document_folder(
        db=db, document_id=document_id, folder_id=data.folder_id, user_id=current_user.id
    )
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document or destination Folder not found")
    return db_document

@router.post("/{document_id}/generate-quiz", response_model=schemas.Quiz, status_code=status.HTTP_201_CREATED)
def generate_quiz_for_existing_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Gera um quiz para um documento existente, com alternativas embaralhadas.
    """
    _enforce_generation_limit(session, current_user)
    
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar quiz.")
        
    if db_document.quiz:
        raise HTTPException(status_code=400, detail="Este documento já possui um quiz.")

    num_questions = 10
    difficulty = "Médio"

    quiz_data_dict = generate_quiz_from_text(
        text=db_document.extracted_text,
        num_questions=num_questions,
        difficulty=difficulty,
        study_language=db_document.study_language,
    )

    if not quiz_data_dict:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar o quiz.")
    _ensure_exact_quiz_question_count(quiz_data_dict, num_questions)

    # 🆕 EMBARALHAR AS ALTERNATIVAS ANTES DE CRIAR O QUIZ
    quiz_data_dict = crud.shuffle_quiz_answers(quiz_data_dict)

    quiz_schema = schemas.QuizCreate(**quiz_data_dict)
    db_quiz = crud.create_quiz_for_document(
        db=session, quiz_data=quiz_schema, document_id=document_id
    )

    crud.increment_user_generation_count(session, current_user.id)
    _clear_guided_study_cache(db_document, session)

    return db_quiz

@router.post("/{document_id}/generate-flashcards", response_model=List[models.Flashcard], status_code=status.HTTP_201_CREATED)
def generate_flashcards_for_existing_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    _enforce_generation_limit(session, current_user)
    
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar flashcards.")
        
    if db_document.flashcards:
        raise HTTPException(status_code=400, detail="Este documento já possui flashcards.")

    num_flashcards = 10
    difficulty = "Médio"

    flashcards_data = generate_flashcards_from_text(
        text=db_document.extracted_text,
        num_flashcards=num_flashcards,
        difficulty=difficulty,
        study_language=db_document.study_language,
    )

    if not flashcards_data:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar os flashcards.")
    _ensure_exact_flashcard_count(flashcards_data, num_flashcards)

    db_flashcards = crud.create_flashcards_for_document(
        session=session,
        flashcards_data=flashcards_data,
        document_id=document_id
    )

    crud.increment_user_generation_count(session, current_user.id)
    _clear_guided_study_cache(db_document, session)

    return db_flashcards

@router.post("/{document_id}/add-flashcards", response_model=List[models.Flashcard], status_code=status.HTTP_201_CREATED)
def add_more_flashcards(
    document_id: int,
    request: AddFlashcardsRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    _enforce_generation_limit(session, current_user)
    
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar flashcards.")
    
    # Resto do código permanece igual...
    current_count = len(db_document.flashcards)
    max_flashcards = 20
    
    if current_count >= max_flashcards:
        raise HTTPException(
            status_code=400, 
            detail=f"Este deck já atingiu o limite máximo de {max_flashcards} flashcards."
        )
    
    requested_count = request.num_flashcards
    available_slots = max_flashcards - current_count
    
    if requested_count > available_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Você pode adicionar no máximo {available_slots} flashcards. Atualmente existem {current_count} de {max_flashcards}."
        )

    existing_flashcards_text = [
        f"Pergunta: {fc.front}\nResposta: {fc.back}" 
        for fc in db_document.flashcards
    ]
    existing_content = "\n\n---\n\n".join(existing_flashcards_text)

    enhanced_text = f"""
IMPORTANTE: Você já gerou os seguintes flashcards para este conteúdo. NÃO REPITA NENHUM DELES:

{existing_content}

---

Agora, com base no MESMO CONTEÚDO ORIGINAL abaixo, gere {requested_count} NOVOS flashcards INÉDITOS que NÃO tenham sido abordados nos flashcards acima:

{db_document.extracted_text}
"""

    try:
        new_flashcards_data = generate_flashcards_from_text(
            text=enhanced_text,
            num_flashcards=requested_count,
            difficulty=request.difficulty,
            study_language=db_document.study_language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar novos flashcards: {str(e)}")

    if not new_flashcards_data:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar novos flashcards.")
    _ensure_exact_flashcard_count(new_flashcards_data, requested_count)

    db_flashcards = crud.create_flashcards_for_document(
        session=session,
        flashcards_data=new_flashcards_data,
        document_id=document_id
    )

    crud.increment_user_generation_count(session, current_user.id)
    _clear_guided_study_cache(db_document, session)

    return db_flashcards


@router.post("/{document_id}/add-questions", response_model=schemas.Quiz, status_code=status.HTTP_201_CREATED)
def add_more_questions(
    document_id: int,
    request: AddQuestionsRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Adiciona mais perguntas a um quiz existente, com alternativas embaralhadas.
    """
    _enforce_generation_limit(session, current_user)
    
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar quiz.")
    
    if not db_document.quiz:
        raise HTTPException(status_code=400, detail="Este documento não possui um quiz. Crie um primeiro.")
    
    current_count = len(db_document.quiz.questions)
    max_questions = 15
    
    if current_count >= max_questions:
        raise HTTPException(
            status_code=400, 
            detail=f"Este quiz já atingiu o limite máximo de {max_questions} perguntas."
        )
    
    requested_count = request.num_questions
    available_slots = max_questions - current_count
    
    if requested_count > available_slots:
        raise HTTPException(
            status_code=400,
            detail=f"Você pode adicionar no máximo {available_slots} perguntas. Atualmente existem {current_count} de {max_questions}."
        )

    # Monta contexto com perguntas existentes
    existing_questions_text = []
    for question in db_document.quiz.questions:
        answers_text = "\n".join([f"  - {ans.text}" for ans in question.answers])
        existing_questions_text.append(
            f"Pergunta: {question.text}\nAlternativas:\n{answers_text}"
        )
    
    existing_content = "\n\n---\n\n".join(existing_questions_text)

    enhanced_text = f"""
IMPORTANTE: Você já gerou as seguintes perguntas para este conteúdo. NÃO REPITA NENHUMA DELAS:

{existing_content}

---

Agora, com base no MESMO CONTEÚDO ORIGINAL abaixo, gere {requested_count} NOVAS perguntas INÉDITAS que NÃO tenham sido abordadas no quiz acima:

{db_document.extracted_text}
"""

    try:
        new_quiz_data = generate_quiz_from_text(
            text=enhanced_text,
            num_questions=requested_count,
            difficulty=request.difficulty,
            study_language=db_document.study_language,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar novas perguntas: {str(e)}")

    if not new_quiz_data or 'questions' not in new_quiz_data:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar novas perguntas.")
    _ensure_exact_quiz_question_count(new_quiz_data, requested_count)

    # 🆕 EMBARALHAR AS ALTERNATIVAS DAS NOVAS PERGUNTAS
    new_quiz_data = crud.shuffle_quiz_answers(new_quiz_data)

    for question_data in new_quiz_data['questions']:
        answers_to_create = [
            models.Answer(**ans) for ans in question_data['answers']
        ]
        question_obj = models.Question(
            text=question_data['text'],
            answers=answers_to_create,
            quiz_id=db_document.quiz.id
        )
        session.add(question_obj)
    
    session.commit()
    session.refresh(db_document.quiz)

    crud.increment_user_generation_count(session, current_user.id)
    _clear_guided_study_cache(db_document, session)

    return db_document.quiz
