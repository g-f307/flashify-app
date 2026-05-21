# back/app/schemas.py

from sqlmodel import SQLModel
from .models import DocumentStatus, AuthProvider
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# --- Schemas de Usuário e Autenticação ---
class AcquisitionContext(SQLModel):
    visitor_id: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    first_touch_at: Optional[datetime] = None


class UserCreate(SQLModel):
    username: str
    email: str
    password: str
    acquisition_context: Optional[AcquisitionContext] = None

class UserRead(SQLModel):
    id: int
    username: str
    email: str
    is_active: bool
    profile_picture_url: Optional[str] = None
    provider: AuthProvider
    is_team: bool = False

class UserPasswordUpdate(SQLModel):
    current_password: str
    new_password: str

class Token(SQLModel):
    access_token: str
    token_type: str

# --- Schemas de Pasta (Folder) ---
class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)

class FolderCreate(FolderBase):
    pass

class FolderUpdate(FolderBase):
    pass

class FolderRead(FolderBase):
    id: int
    class Config:
        from_attributes = True

# --- SCHEMAS PARA QUIZZES (Definidos antes de serem usados) ---
class AnswerBase(BaseModel):
    text: str
    is_correct: bool
    explanation: Optional[str] = None

class AnswerCreate(AnswerBase):
    pass

class Answer(AnswerBase):
    id: int
    question_id: int
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    text: str

class QuestionCreate(QuestionBase):
    answers: List[AnswerCreate]

class Question(QuestionBase):
    id: int
    quiz_id: int
    answers: List[Answer] = []
    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str

class QuizCreate(QuizBase):
    questions: List[QuestionCreate]

class Quiz(QuizBase):
    id: int
    document_id: int
    questions: List[Question] = []
    class Config:
        from_attributes = True

# --- SCHEMAS DE DOCUMENTO (DECK) ---
class DocumentRead(SQLModel):
    id: int
    status: DocumentStatus

# --- CORREÇÃO AQUI: Simplificamos o DocumentDetail ---
class DocumentDetail(BaseModel):
    id: int
    status: DocumentStatus
    file_path: str
    title: Optional[str] = None
    extracted_text: Optional[str] = None
    quiz: Optional[Quiz] = None
    generates_flashcards: bool 
    generates_quizzes: bool
    total_flashcards: int
    has_quiz: bool
    current_step: Optional[str] = None  # ← ADICIONADO ESTE CAMPO
    srs_enabled: bool = True

    class Config:
        from_attributes = True

class DocumentCardData(SQLModel):
    id: int
    file_path: str
    title: Optional[str] = None
    status: DocumentStatus
    created_at: datetime
    total_flashcards: int
    studied_flashcards: int
    folder_id: Optional[int] = None
    has_quiz: bool = False
    srs_enabled: bool = True
    flashcards_pending: int = 0
    questions_pending: int = 0

class DocumentUpdateFolder(BaseModel):
    folder_id: Optional[int] = None

class FolderReadWithDocuments(FolderRead):
    documents: List[DocumentCardData] = []

# --- Schemas de Flashcard ---
class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None


class FlashcardBulkItem(BaseModel):
    id: Optional[int] = None
    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)
    type: Optional[str] = None
    is_deleted: bool = False


class FlashcardBulkUpdateRequest(BaseModel):
    flashcards: List[FlashcardBulkItem]


class AnswerBulkInput(BaseModel):
    id: Optional[int] = None
    text: str = Field(..., min_length=1)
    explanation: Optional[str] = None
    is_correct: bool = False


class QuestionBulkItem(BaseModel):
    id: Optional[int] = None
    text: str = Field(..., min_length=1)
    answers: List[AnswerBulkInput] = Field(default_factory=list, min_length=2)
    is_deleted: bool = False


class QuizBulkUpdateRequest(BaseModel):
    questions: List[QuestionBulkItem]


class GuidedStudyStep(BaseModel):
    id: str
    type: str
    order: int
    flashcard_id: Optional[int] = None
    question_id: Optional[int] = None
    front: Optional[str] = None
    back: Optional[str] = None
    prompt: Optional[str] = None
    answers: List[Answer] = []


class GuidedStudyTopic(BaseModel):
    id: str
    title: str
    order: int
    steps: List[GuidedStudyStep]


class GuidedStudySummary(BaseModel):
    topics_count: int
    steps_count: int
    flashcards_count: int
    questions_count: int
    is_fallback: bool = False


class GuidedStudyResponse(BaseModel):
    document_id: int
    title: str
    mode: str = "guided"
    topics: List[GuidedStudyTopic]
    summary: GuidedStudySummary


class SharedFlashcardRead(BaseModel):
    front: str
    back: str
    type: str


class SharedAnswerRead(BaseModel):
    text: str
    is_correct: bool
    explanation: Optional[str] = None


class SharedQuestionRead(BaseModel):
    text: str
    answers: List[SharedAnswerRead]


class SharedQuizRead(BaseModel):
    title: str
    questions: List[SharedQuestionRead]


class SharedGuidedStudyStepRead(BaseModel):
    id: str
    type: str
    order: int
    flashcard_id: Optional[int] = None
    question_id: Optional[int] = None
    front: Optional[str] = None
    back: Optional[str] = None
    prompt: Optional[str] = None
    answers: List[SharedAnswerRead] = []


class SharedGuidedStudyTopicRead(BaseModel):
    id: str
    title: str
    order: int
    steps: List[SharedGuidedStudyStepRead]


class SharedGuidedStudySummaryRead(BaseModel):
    topics_count: int
    steps_count: int
    flashcards_count: int
    questions_count: int
    is_fallback: bool = False


class SharedGuidedStudyRead(BaseModel):
    mode: str = "guided"
    topics: List[SharedGuidedStudyTopicRead]
    summary: SharedGuidedStudySummaryRead


class SharedDeckRead(BaseModel):
    title: str
    file_path: Optional[str] = None
    generates_flashcards: bool
    generates_quizzes: bool
    srs_enabled: bool
    feature_snapshot_version: int = 1
    flashcards: List[SharedFlashcardRead]
    quiz: Optional[SharedQuizRead] = None
    guided_study: Optional[SharedGuidedStudyRead] = None
    created_at: datetime


class ShareLinkResponse(BaseModel):
    share_url: str
    token: str


class GuidedStudyProgressRead(BaseModel):
    document_id: int
    completed_step_ids: List[str]
    total_steps: int
    started_at: datetime
    last_accessed_at: datetime
    completed_at: Optional[datetime] = None
    is_completed: bool

    class Config:
        from_attributes = True


class GuidedStudyProgressUpdate(BaseModel):
    completed_step_ids: List[str]
    is_completed: bool = False
