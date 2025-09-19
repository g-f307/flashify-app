# app/schemas.py
from sqlmodel import SQLModel
from .models import DocumentStatus, AuthProvider
from typing import Optional 
from datetime import datetime
from pydantic import BaseModel 


# NOVOS SCHEMAS PARA DOCUMENT
class DocumentRead(SQLModel):
    id: int
    status: DocumentStatus

class DocumentDetail(DocumentRead):
    file_path: str
    extracted_text: Optional[str] = None

# Schema para criar um novo usuário
class UserCreate(SQLModel):
    username: str
    email: str
    password: str

# Schema para ler/retornar dados de um usuário (sem a senha!)
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

class FolderBase(SQLModel):
    name: str

class FolderCreate(FolderBase):
    pass

class FolderRead(FolderBase):
    id: int

class DocumentCardData(SQLModel):
    id: int
    file_path: str
    status: DocumentStatus
    created_at: datetime
    total_flashcards: int
    studied_flashcards: int

# ▼▼▼ ADICIONE ESTE NOVO SCHEMA NO FINAL DO FICHEIRO ▼▼▼
class FlashcardUpdate(BaseModel):
    """
    Schema para a atualização de um flashcard.
    Ambos os campos são opcionais, permitindo atualizações parciais.
    """
    front: Optional[str] = None
    back: Optional[str] = None
