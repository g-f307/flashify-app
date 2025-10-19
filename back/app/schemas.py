# back/app/schemas.py

from sqlmodel import SQLModel
from .models import DocumentStatus, AuthProvider
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# --- Schemas de Usuário e Autenticação ---
class UserCreate(SQLModel):
    username: str
    email: str
    password: str

class UserRead(SQLModel):
    id: int
    username: str
    email: str
    is_active: bool
    profile_picture_url: Optional[str] = None
    provider: AuthProvider

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
    extracted_text: Optional[str] = None
    quiz: Optional[Quiz] = None
    generates_flashcards: bool 
    generates_quizzes: bool
    total_flashcards: int
    has_quiz: bool
    current_step: Optional[str] = None  # ← ADICIONADO ESTE CAMPO

    class Config:
        from_attributes = True

class DocumentCardData(SQLModel):
    id: int
    file_path: str
    status: DocumentStatus
    created_at: datetime
    total_flashcards: int
    studied_flashcards: int
    folder_id: Optional[int] = None
    has_quiz: bool = False

class DocumentUpdateFolder(BaseModel):
    folder_id: Optional[int] = None

class FolderReadWithDocuments(FolderRead):
    documents: List[DocumentCardData] = []

# --- Schemas de Flashcard ---
class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None