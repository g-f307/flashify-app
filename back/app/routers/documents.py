# app/routers/documents.py
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, security
from ..database import get_session
from ..tasks import process_document # Importe a tarefa do Celery

router = APIRouter(prefix="/documents", tags=["Documents"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

# Diretório para salvar os uploads (em produção, use um serviço como o AWS S3)
UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

@router.post("/upload", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    current_user: CurrentUser,
    folder_id: Optional[int] = None, # Opcional, para associar a uma pasta
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if not file.content_type in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Tipo de arquivo inválido.")

    # Salva o arquivo localmente
    file_path = UPLOAD_DIRECTORY / file.filename
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Cria a entrada no banco de dados
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=str(file_path),
        folder_id=folder_id
    )

    # Dispara a tarefa em background
    process_document.delay(db_document.id)

    return db_document

@router.get("/{document_id}/flashcards", response_model=list[models.Flashcard])
def get_document_flashcards(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Lista todos os flashcards de um documento específico.
    """
    # Primeiro, garanta que o documento pertence ao usuário logado (questão de segurança)
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    # Você precisará adicionar a função get_flashcards_by_document ao seu crud.py
    return crud.get_flashcards_by_document(session, document_id=document_id)