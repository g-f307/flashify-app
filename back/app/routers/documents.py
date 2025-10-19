# back/app/routers/documents.py

import shutil
from pathlib import Path
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Response
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, security, schemas
from ..database import get_session
from ..security import get_current_user
from ..tasks import process_document 
from ..ai_generator import generate_flashcards_from_text, generate_quiz_from_text
from pydantic import BaseModel, Field

router = APIRouter(prefix="/documents", tags=["Documents"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

UPLOAD_DIRECTORY = Path("uploads")
UPLOAD_DIRECTORY.mkdir(exist_ok=True)

class TextInput(BaseModel):
    text: str
    title: str
    folder_id: Optional[int] = None
    generate_flashcards: bool = True
    generate_quizzes: bool = False
    content_type: str = "flashcards"
    num_flashcards: int = Field(default=10, ge=1, le=50)
    difficulty: str = "Médio"
    num_questions: int = Field(default=5, ge=3, le=25)

def sanitize_filename(name: str) -> str:
    """Cria um nome de arquivo seguro a partir de uma string."""
    name = name.lower().replace(' ', '_')
    name = re.sub(r'[^a-z0-9_.-]', '', name)
    return name[:100]

@router.post("/upload", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    file: UploadFile = File(...),
    title: str = Form(...),
    folder_id: Optional[int] = Form(default=None),
    generates_flashcards: bool = Form(True),
    generates_quizzes: bool = Form(False),
    content_type: str = Form("flashcards"),
    num_flashcards: int = Form(10),
    difficulty: str = Form("Médio"),
    num_questions: int = Form(5),
):
    if not file.content_type in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Tipo de arquivo inválido.")

    original_suffix = Path(file.filename).suffix
    safe_basename = sanitize_filename(title)
    final_filename = f"{current_user.id}_{safe_basename}{original_suffix}"
    
    file_path_on_disk = UPLOAD_DIRECTORY / final_filename
    
    with file_path_on_disk.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=str(file_path_on_disk),
        folder_id=folder_id,
        generates_flashcards=generates_flashcards,
        generates_quizzes=generates_quizzes
    )
    
    process_document.delay(
        document_id=db_document.id,
        content_type=content_type,
        num_flashcards=num_flashcards,
        difficulty=difficulty,
        num_questions=num_questions
    )

    return db_document

@router.post("/text", response_model=models.Document, status_code=status.HTTP_202_ACCEPTED)
def create_document_from_text(
    text_input: TextInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    if not text_input.text.strip():
        raise HTTPException(status_code=400, detail="Texto não pode estar vazio")
    
    db_document = crud.create_document_for_user(
        session,
        user_id=current_user.id,
        file_path=text_input.title,
        folder_id=text_input.folder_id,
        generates_flashcards=text_input.generate_flashcards,
        generates_quizzes=text_input.generate_quizzes
    )

    db_document.extracted_text = text_input.text
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    
    process_document.delay(
        document_id=db_document.id,
        content_type=text_input.content_type,
        num_flashcards=text_input.num_flashcards,
        difficulty=text_input.difficulty,
        num_questions=text_input.num_questions
    )
    
    return db_document

@router.get("/", response_model=list[schemas.DocumentCardData])
def get_user_documents(
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    db_documents = crud.get_documents_by_user(session, user_id=current_user.id)
    
    docs_with_progress = []
    for doc in db_documents:
        total_flashcards = len(doc.flashcards)
        studied_flashcards = crud.get_studied_flashcards_count(session, document_id=doc.id)
        
        doc_data = schemas.DocumentCardData(
            id=doc.id,
            file_path=doc.file_path,
            status=doc.status,
            created_at=doc.created_at,
            total_flashcards=total_flashcards,
            studied_flashcards=studied_flashcards,
            folder_id=doc.folder_id,
            has_quiz=(doc.quiz is not None)
        )
        docs_with_progress.append(doc_data)
            
    return docs_with_progress

@router.get("/{document_id}", response_model=schemas.DocumentDetail)
def get_document_details(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Obtém os detalhes completos de um documento, incluindo o quiz.
    ATUALIZADO: Agora força a leitura dos dados mais recentes do banco.
    """
    # CORREÇÃO CRÍTICA: Expira todos os objetos em cache da sessão
    # Isso garante que vamos buscar dados frescos do banco, mesmo que
    # tenham sido atualizados pelo worker do Celery (outro processo)
    session.expire_all()
    
    # Busca o objeto completo da base de dados
    db_document = crud.get_document_with_details(session, document_id)
    
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")

    # Debug: descomentar para verificar o que está sendo recebido
    print(f"[ENDPOINT] Doc {document_id} - current_step: {db_document.current_step}, status: {db_document.status}")

    # Constrói o objeto de resposta (schema) manualmente
    return schemas.DocumentDetail(
        id=db_document.id,
        status=db_document.status,
        file_path=db_document.file_path,
        extracted_text=db_document.extracted_text,
        quiz=db_document.quiz,
        total_flashcards=len(db_document.flashcards),
        has_quiz=(db_document.quiz is not None),
        generates_flashcards=db_document.generates_flashcards,
        generates_quizzes=db_document.generates_quizzes,
        current_step=db_document.current_step
    )

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
    
    document.status = models.DocumentStatus.CANCELLED
    document.current_step = "Processamento cancelado pelo usuário"
    session.add(document)
    session.commit()
    
    return {"message": "Document processing cancelled successfully"}

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(security.get_current_user),
):
    db_document = crud.get_document(db, document_id=document_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    if db_document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    success = crud.delete_document_and_related_data(db=db, document_id=document_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found during deletion")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.patch("/{document_id}/move", response_model=schemas.DocumentRead)
def move_document_to_folder(
    document_id: int,
    data: schemas.DocumentUpdateFolder,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    db_document = crud.update_document_folder(
        db=db, document_id=document_id, folder_id=data.folder_id, user_id=current_user.id
    )
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document or destination Folder not found")
    return db_document

@router.post("/{document_id}/generate-quiz", response_model=schemas.Quiz, status_code=status.HTTP_201_CREATED)
def generate_quiz_for_existing_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar quiz.")
        
    if db_document.quiz:
        raise HTTPException(status_code=400, detail="Este documento já possui um quiz.")

    num_questions = 10
    difficulty = "Médio"

    quiz_data_dict = generate_quiz_from_text(
        text=db_document.extracted_text,
        num_questions=num_questions,
        difficulty=difficulty
    )

    if not quiz_data_dict:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar o quiz.")

    quiz_schema = schemas.QuizCreate(**quiz_data_dict)
    db_quiz = crud.create_quiz_for_document(
        db=session, quiz_data=quiz_schema, document_id=document_id
    )
    return db_quiz

@router.post("/{document_id}/generate-flashcards", response_model=List[models.Flashcard], status_code=status.HTTP_201_CREATED)
def generate_flashcards_for_existing_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
        
    if not db_document.extracted_text:
        raise HTTPException(status_code=400, detail="Documento não tem texto para gerar flashcards.")
        
    if db_document.flashcards:
        raise HTTPException(status_code=400, detail="Este documento já possui flashcards.")

    num_flashcards = 10
    difficulty = "Médio"

    flashcards_data = generate_flashcards_from_text(
        text=db_document.extracted_text,
        num_flashcards=num_flashcards,
        difficulty=difficulty
    )

    if not flashcards_data:
        raise HTTPException(status_code=500, detail="A IA não conseguiu gerar os flashcards.")

    db_flashcards = crud.create_flashcards_for_document(
        session=session,
        flashcards_data=flashcards_data,
        document_id=document_id
    )
    return db_flashcards