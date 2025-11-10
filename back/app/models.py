# app/models.py
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum # Importe Enum
from sqlalchemy import Column, Text, JSON,func, DateTime, Integer
from sqlalchemy.dialects.postgresql import ARRAY
from typing import Annotated
from datetime import datetime, timezone

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

    # 🔹 novo campo: lista de flashcards já estudados
    studied_flashcard_ids: list[int] = Field(
        sa_column=Column(
            ARRAY(Integer), server_default="{}", nullable=False
        ),
        default_factory=list
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

# NOVO MODELO FLASHCARD
class Flashcard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    front: str
    back: str = Field(sa_column=Column(Text))  # Use Text para suportar conteúdo longo
    type: FlashcardType = Field(default=FlashcardType.CONCEPT)

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
    completed_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc)
    )

    quiz_id: int = Field(foreign_key="quiz.id")
    quiz: "Quiz" = Relationship(back_populates="attempts")

    user_id: int = Field(foreign_key="user.id")
    user: "User" = Relationship(back_populates="quiz_attempts")