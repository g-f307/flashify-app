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

# --- Schemas de Documento (Deck) ---
class DocumentRead(SQLModel):
    id: int
    status: DocumentStatus

class DocumentDetail(DocumentRead):
    file_path: str
    extracted_text: Optional[str] = None

class DocumentCardData(SQLModel):
    id: int
    file_path: str
    status: DocumentStatus
    created_at: datetime
    total_flashcards: int
    studied_flashcards: int
    folder_id: Optional[int] = None

class DocumentUpdateFolder(BaseModel):
    folder_id: Optional[int] = None

# --- Schemas de Flashcard ---
class FlashcardUpdate(BaseModel):
    front: Optional[str] = None
    back: Optional[str] = None

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

# ▼▼▼ ESTA É A VERSÃO CORRIGIDA E FINAL ▼▼▼
# Garante que os decks dentro das pastas usam o schema completo DocumentCardData.
class FolderReadWithDocuments(FolderRead):
    documents: List[DocumentCardData] = []