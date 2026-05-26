# app/models.py
from typing import Optional, List, Any
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum # Importe Enum
from sqlalchemy import Column, Text, JSON,func, DateTime, Integer
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY
from typing import Annotated
from datetime import datetime, timezone
import secrets

# Crie uma Enum para o status do documento
class DocumentStatus(str, Enum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

# Enum para o tipo do flashcard
class FlashcardType(str, Enum):
    CONCEPT = "concept"
    CODE = "code"
    DIAGRAM = "diagram"
    EXAMPLE = "example"
    COMPARISON = "comparison"


class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)
    provider: AuthProvider = Field(default=AuthProvider.LOCAL)
    profile_picture_url: Optional[str] = Field(default=None)
    utm_source: Optional[str] = Field(default=None)
    utm_medium: Optional[str] = Field(default=None)
    utm_campaign: Optional[str] = Field(default=None)
    utm_content: Optional[str] = Field(default=None)
    utm_term: Optional[str] = Field(default=None)
    referrer: Optional[str] = Field(default=None)
    landing_page: Optional[str] = Field(default=None)
    first_touch_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    first_login_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    first_deck_created_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    first_study_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    first_quiz_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    activated_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    is_team: bool = Field(default=False)
    is_test_user: bool = Field(default=False)
    is_blocked: bool = Field(default=False)
    lifecycle_stage: Optional[str] = Field(default=None)
    
    # 🆕 CAMPOS PARA TRACKING DE E-MAILS (já existentes)
    last_login_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    inactivity_email_sent: bool = Field(default=False)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # 🆕 NOVOS CAMPOS PARA LIMITE DE GERAÇÕES
    daily_generation_count: int = Field(
        sa_column=Column(Integer, server_default="0", nullable=False),
        default=0
    )
    last_generation_reset: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )

    # Relações existentes
    folders: List["Folder"] = Relationship(back_populates="user")
    documents: List["Document"] = Relationship(back_populates="user")
    quiz_attempts: List["QuizAttempt"] = Relationship(back_populates="user")
    product_events: List["ProductEvent"] = Relationship(back_populates="user")
    admin_notes: List["UserAdminNote"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[UserAdminNote.user_id]"}
    )
    authored_admin_notes: List["UserAdminNote"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[UserAdminNote.author_user_id]"}
    )

# NOVO MODELO FOLDER
class Folder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)

    # Chave estrangeira para conectar a pasta a um usuário
    user_id: int = Field(foreign_key="user.id")

    # Relação de volta para o usuário
    user: User = Relationship(back_populates="folders")
    documents: List["Document"] = Relationship(back_populates="folder")

class Document(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_path: str
    title: Optional[str] = Field(default=None)
    page_selection_raw: Optional[str] = Field(default=None)
    status: DocumentStatus = Field(default=DocumentStatus.PROCESSING)
    generates_flashcards: bool = Field(default=True)
    generates_quizzes: bool = Field(default=False)
    extracted_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    processing_progress: int = Field(default=0)
    current_step: Optional[str] = Field(default=None)
    can_cancel: bool = Field(default=True)

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),        # <- CORREÇÃO: usar DateTime, não datetime
            server_default=func.now(),
            nullable=False
        ),
        default_factory=lambda: datetime.now(timezone.utc)  # timezone-aware local default
    )

    processing_progress: float = 0.0
    srs_enabled: bool = Field(default=True)

    # 🔹 novo campo: lista de flashcards já estudados
    studied_flashcard_ids: list[int] = Field(
        sa_column=Column(
            ARRAY(Integer), server_default="{}", nullable=False
        ),
        default_factory=list
    )

    guided_study_cache: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True)
    )

    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="documents")

    folder_id: Optional[int] = Field(default=None, foreign_key="folder.id")
    folder: Optional[Folder] = Relationship(back_populates="documents")
    flashcards: List["Flashcard"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
    quiz: Optional["Quiz"] = Relationship(back_populates="document", sa_relationship_kwargs={"cascade": "all, delete"})


class SharedDeck(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(
        default_factory=lambda: secrets.token_urlsafe(12),
        unique=True,
        index=True,
    )
    source_document_id: Optional[int] = Field(default=None, index=True)
    owner_user_id: int = Field(foreign_key="user.id", index=True)
    title: str
    file_path: Optional[str] = Field(default=None)
    extracted_text: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    generates_flashcards: bool = Field(default=True)
    generates_quizzes: bool = Field(default=False)
    srs_enabled: bool = Field(default=True)
    feature_snapshot_version: int = Field(default=1)
    flashcards_snapshot: list[dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=False),
        default_factory=list,
    )
    quiz_snapshot: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    guided_study_snapshot: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    extra_features_snapshot: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )

# NOVO MODELO FLASHCARD
class Flashcard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    front: str = Field(sa_column=Column(Text))
    back: str = Field(sa_column=Column(Text))  # Use Text para suportar conteúdo longo
    type: FlashcardType = Field(default=FlashcardType.CONCEPT)

    # Campos SRS
    ease_factor: float = Field(default=2.5)
    interval_days: int = Field(default=1)
    repetitions: int = Field(default=0)
    next_review: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )

    document_id: int = Field(foreign_key="document.id")
    document: Document = Relationship(back_populates="flashcards")
    
    # Relacionamento para conversas sobre o flashcard
    conversations: List["FlashcardConversation"] = Relationship(back_populates="flashcard")

# Modelo para armazenar conversas sobre flashcards
class FlashcardConversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_message: str = Field(sa_column=Column(Text))
    assistant_response: str = Field(sa_column=Column(Text))
    created_at: Optional[str] = Field(default=None)  # Timestamp da mensagem
    
    flashcard_id: int = Field(foreign_key="flashcard.id")
    flashcard: Flashcard = Relationship(back_populates="conversations")

# NOVO MODELO PARA REGISTRO DE ESTUDO
class StudyLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    studied_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    # Precisão/acerto (pode ser expandido no futuro)
    accuracy: float = Field(default=1.0) # 1.0 = 100% (correto), 0.0 = 0% (incorreto)

    # Chaves estrangeiras
    user_id: int = Field(foreign_key="user.id")
    flashcard_id: int = Field(foreign_key="flashcard.id")

class Quiz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    
    document_id: int = Field(foreign_key="document.id")
    document: "Document" = Relationship(back_populates="quiz")
    
    questions: List["Question"] = Relationship(back_populates="quiz", sa_relationship_kwargs={"cascade": "all, delete"})
    attempts: List["QuizAttempt"] = Relationship(back_populates="quiz")

class Question(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    
    # Campos SRS
    ease_factor: float = Field(default=2.5)
    interval_days: int = Field(default=1)
    repetitions: int = Field(default=0)
    next_review: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )
    
    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: Quiz = Relationship(back_populates="questions")
    
    answers: List["Answer"] = Relationship(back_populates="question", sa_relationship_kwargs={"cascade": "all, delete"})

class Answer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    is_correct: bool = False
    explanation: Optional[str] = Field(default=None) # Explicação para a IA fornecer em caso de erro
    
    question_id: int = Field(foreign_key="question.id")
    question: Question = Relationship(back_populates="answers")

class QuizAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    score: float
    correct_answers: int
    total_questions: int
    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    completed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )

    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: "Quiz" = Relationship(back_populates="attempts")

    user_id: int = Field(foreign_key="user.id")
    user: "User" = Relationship(back_populates="quiz_attempts")


class GuidedStudySession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    document_id: int = Field(foreign_key="document.id", index=True)
    completed_step_ids: list[str] = Field(
        sa_column=Column(JSON, nullable=False, server_default="[]"),
        default_factory=list
    )
    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    last_accessed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    completed_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None
    )


class ProductEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_name: str = Field(index=True)
    occurred_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )
    properties: Optional[dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True)
    )

    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    document_id: Optional[int] = Field(default=None, foreign_key="document.id", index=True)
    quiz_id: Optional[int] = Field(default=None, foreign_key="quiz.id", index=True)

    user: Optional[User] = Relationship(back_populates="product_events")


class UserAdminNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    note: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )

    user_id: int = Field(foreign_key="user.id", index=True)
    author_user_id: int = Field(foreign_key="user.id", index=True)


class UserActivityDay(SQLModel, table=True):
    """Materialized cache: one row per user per active day in app local time."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    activity_date: datetime = Field(
        sa_column=Column(
            sa.Date(),
            nullable=False,
            index=True,
        )
    )

    login_count: int = Field(default=0)
    study_count: int = Field(default=0)
    quiz_count: int = Field(default=0)
    event_count: int = Field(default=0)
    guided_study_count: int = Field(default=0)
    flashcard_study_minutes: int = Field(default=0)
    quiz_study_minutes: int = Field(default=0)
    guided_study_minutes: int = Field(default=0)
    estimated_study_minutes: int = Field(default=0)
