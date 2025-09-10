# back/app/routers/documents.py
import shutil
from pathlib import Path
import re
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel, Field

from .. import crud, models, security
from ..database import get_session
from ..tasks import process_document 
from ..ai_generator import generate_flashcards_from_text

router = APIRouter(prefix="/documents", tags=["Documents"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

class TextInput(BaseModel):
    text: str
    title: str
    num_flashcards: int = Field(default=10, ge=1, le=20)
    difficulty: str = "Médio"

def sanitize_filename(name: str) -> str:
    """Cria um nome de arquivo seguro a partir de uma string."""
    name = name.lower().replace(' ', '_')
    name = re.sub(r'[^a-z0-9_.-]', '', name)
    return name[:100]

@router.post("/upload", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    title: str = Form(...),
    num_flashcards: int = Form(10),
    difficulty: str = Form("Médio"),
    session: Session = Depends(get_session),
):
    if not file.content_type in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Tipo de arquivo inválido.")

    original_suffix = Path(file.filename).suffix
    safe_basename = sanitize_filename(title)
    # Garante um nome de arquivo único para evitar sobrescrever arquivos de usuários diferentes
    final_filename = f"{current_user.id}_{safe_basename}{original_suffix}"
    
    file_path_on_disk = UPLOAD_DIRECTORY / final_filename
    
    with file_path_on_disk.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # CORREÇÃO: Cria o registro no banco com o caminho REAL do arquivo para o Celery usar.
    # O `title` será usado pelo frontend para exibição, mas o `file_path` agora é confiável.
    # Para manter a consistência, poderíamos adicionar um campo 'title' no modelo Document,
    # mas por enquanto o frontend pode usar o `file_path` que ele já tem (o título).
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=str(file_path_on_disk),
    )
    
    # Opcional, mas bom para o frontend: retorna o título no campo file_path da resposta
    response_doc = db_document.model_copy()
    response_doc.file_path = title

    process_document.delay(db_document.id, num_flashcards, difficulty)

    return response_doc

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
    """Cria flashcards a partir de texto livre com opções customizadas."""
    if not text_input.text.strip():
        raise HTTPException(status_code=400, detail="Texto não pode estar vazio")
    
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=text_input.title,
    )
    
    db_document.extracted_text = text_input.text
    db_document.status = models.DocumentStatus.PROCESSING
    db_document.current_step = "Enviado para geração de flashcards..."
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    
    try:
        flashcards_data = generate_flashcards_from_text(
            text=text_input.text,
            num_flashcards=text_input.num_flashcards,
            difficulty=text_input.difficulty
        )
        
        if flashcards_data:
            crud.create_flashcards_for_document(
                session=session,
                flashcards_data=flashcards_data,
                document_id=db_document.id,
            )
            db_document.current_step = f"{len(flashcards_data)} flashcards criados."
        else:
            db_document.current_step = "A IA não gerou flashcards."

        db_document.status = models.DocumentStatus.COMPLETED
        session.add(db_document)
        session.commit()
        session.refresh(db_document)

    except Exception as e:
        print(f"Erro ao gerar flashcards para doc {db_document.id}: {e}")
        db_document.status = models.DocumentStatus.FAILED
        db_document.current_step = f"Erro na geração: {str(e)[:100]}"
        session.add(db_document)
        session.commit()
        session.refresh(db_document)
    
    return db_document

@router.get("/{document_id}/flashcards", response_model=list[models.Flashcard])
def get_document_flashcards(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    return crud.get_flashcards_by_document(session, document_id=document_id)

@router.post("/{document_id}/cancel")
def cancel_document_processing(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    document = crud.get_document(session, document_id=document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != models.DocumentStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Document is not being processed")
    
    if not document.can_cancel:
        raise HTTPException(status_code=400, detail="Document processing cannot be cancelled")
    
    document.status = models.DocumentStatus.CANCELLED
    document.current_step = "Processamento cancelado pelo usuário"
    session.add(document)
    session.commit()
    
    return {"message": "Document processing cancelled successfully"}