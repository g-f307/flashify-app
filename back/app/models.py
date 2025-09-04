# app/models.py
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum # Importe Enum
from sqlalchemy import Column, Text

# Crie uma Enum para o status do documento
class DocumentStatus(str, Enum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)

    # Adicione esta relação para que um usuário possa ter muitas pastas
    folders: List["Folder"] = Relationship(back_populates="user")
    documents: List["Document"] = Relationship(back_populates="user")

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
    file_path: str # Caminho para o arquivo salvo (S3 ou local)
    status: DocumentStatus = Field(default=DocumentStatus.PROCESSING)
    extracted_text: Optional[str] = Field(default=None, sa_column=Column(Text))

    user_id: int = Field(foreign_key="user.id")
    user: User = Relationship(back_populates="documents")

    folder_id: Optional[int] = Field(default=None, foreign_key="folder.id")
    folder: Optional[Folder] = Relationship(back_populates="documents")

    flashcards: List["Flashcard"] = Relationship(back_populates="document")

# NOVO MODELO FLASHCARD
class Flashcard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    front: str
    back: str

    document_id: int = Field(foreign_key="document.id")
    document: Document = Relationship(back_populates="flashcards")