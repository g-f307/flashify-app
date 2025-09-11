# app/schemas.py
from sqlmodel import SQLModel
from .models import DocumentStatus
from typing import Optional 
from datetime import datetime

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