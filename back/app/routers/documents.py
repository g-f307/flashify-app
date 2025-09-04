# app/routers/documents.py
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel

from .. import crud, models, security
from ..database import get_session
from ..tasks import process_document # Importe a tarefa do Celery
from ..ai_generator import generate_flashcards_from_text

router = APIRouter(prefix="/documents", tags=["Documents"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

# Diretório para salvar os uploads (em produção, use um serviço como o AWS S3)
UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

class TextInput(BaseModel):
    text: str
    title: Optional[str] = None

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

@router.get("/", response_model=list[models.Document])
def get_user_documents(
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Lista todos os documentos do usuário logado."""
    return crud.get_documents_by_user(session, user_id=current_user.id)

@router.get("/{document_id}", response_model=models.Document)
def get_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Obter um documento específico."""
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return db_document

@router.post("/text", response_model=models.Document, status_code=status.HTTP_201_CREATED)
def create_document_from_text(
    text_input: TextInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Cria flashcards a partir de texto livre."""
    if not text_input.text.strip():
        raise HTTPException(status_code=400, detail="Texto não pode estar vazio")
    
    # Cria documento no banco
    title = text_input.title or "Documento de Texto"
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=f"text_{current_user.id}_{title}",
        folder_id=None
    )
    
    # Atualiza o documento com o texto extraído
    crud.update_document_after_processing(
        session=session, 
        db_document=db_document, 
        text=text_input.text
    )
    
    # Gera flashcards diretamente (sem Celery para texto)
    try:
        flashcards_data = generate_flashcards_from_text(text_input.text)
        if flashcards_data:
            crud.create_flashcards_for_document(
                session=session,
                flashcards_data=flashcards_data,
                document_id=db_document.id,
            )
    except Exception as e:
        print(f"Erro ao gerar flashcards: {e}")
    
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

@router.post("/{document_id}/cancel")
def cancel_document_processing(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Cancela o processamento de um documento.
    """
    document = crud.get_document(session, document_id=document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != models.DocumentStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Document is not being processed")
    
    if not document.can_cancel:
        raise HTTPException(status_code=400, detail="Document processing cannot be cancelled")
    
    # Marcar como cancelado
    document.status = models.DocumentStatus.CANCELLED
    document.current_step = "Processamento cancelado pelo usuário"
    session.add(document)
    session.commit()
    
    return {"message": "Document processing cancelled successfully"}