# back/app/routers/folders.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session
from datetime import datetime, timezone
from sqlmodel import select, func

from app import crud, schemas, models
from app.database import get_session
from app.security import get_current_user

router = APIRouter(
    prefix="/folders",
    tags=["folders"],
)

class LibraryResponse(schemas.SQLModel):
    folders: List[schemas.FolderReadWithDocuments]
    root_documents: List[schemas.DocumentCardData]


def to_card_data(db: Session, doc: models.Document) -> schemas.DocumentCardData:
    total_flashcards = len(doc.flashcards)
    studied_flashcards = crud.get_studied_flashcards_count(session=db, document_id=doc.id)
    now = datetime.now(timezone.utc)

    fc_pending = 0
    q_pending = 0
    srs_on = getattr(doc, "srs_enabled", True)

    if srs_on and doc.status == models.DocumentStatus.COMPLETED:
        fc_stmt = select(func.count(models.Flashcard.id)).where(
            models.Flashcard.document_id == doc.id,
            models.Flashcard.next_review != None,
            models.Flashcard.next_review <= now
        )
        fc_pending = db.exec(fc_stmt).one_or_none() or 0

        q_stmt = select(func.count(models.Question.id)).join(models.Quiz).where(
            models.Quiz.document_id == doc.id,
            models.Question.next_review != None,
            models.Question.next_review <= now
        )
        q_pending = db.exec(q_stmt).one_or_none() or 0

    return schemas.DocumentCardData(
        id=doc.id,
        file_path=doc.file_path,
        status=doc.status,
        created_at=doc.created_at,
        total_flashcards=total_flashcards,
        studied_flashcards=studied_flashcards,
        folder_id=doc.folder_id,
        has_quiz=doc.quiz is not None,
        srs_enabled=srs_on,
        flashcards_pending=fc_pending,
        questions_pending=q_pending,
    )

@router.get("/library", response_model=LibraryResponse)
def get_library_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """
    Retorna toda a estrutura da biblioteca do usuário: pastas com seus decks
    e os decks que estão na raiz (sem pasta).
    """
    folders_from_db = crud.get_folders_by_user(db=db, user_id=current_user.id)
    root_docs_from_db = crud.get_documents_by_user(session=db, user_id=current_user.id, in_folder=False)

    root_documents_data = [to_card_data(db, doc) for doc in root_docs_from_db]

    folders_data = []
    for folder in folders_from_db:
        docs_in_folder_data = [to_card_data(db, doc) for doc in folder.documents]
        folder_data = schemas.FolderReadWithDocuments(
            id=folder.id,
            name=folder.name,
            documents=docs_in_folder_data
        )
        folders_data.append(folder_data)

    return LibraryResponse(folders=folders_data, root_documents=root_documents_data)


@router.get("/{folder_id}", response_model=schemas.FolderReadWithDocuments)
def get_folder_details(
    folder_id: int,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    """
    Retorna os detalhes de uma pasta específica, incluindo os documentos
    completos dentro dela.
    """
    folder = crud.get_folder(db, folder_id=folder_id, user_id=current_user.id)
    if not folder:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")

    docs_in_folder_data = [to_card_data(db, doc) for doc in folder.documents]

    return schemas.FolderReadWithDocuments(
        id=folder.id,
        name=folder.name,
        documents=docs_in_folder_data
    )

@router.post("/", response_model=schemas.FolderRead)
def create_folder(
    folder: schemas.FolderCreate,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    return crud.create_folder(db=db, folder=folder, user_id=current_user.id)

@router.put("/{folder_id}", response_model=schemas.FolderRead)
def update_folder(
    folder_id: int,
    folder_update: schemas.FolderUpdate,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
):
    db_folder = crud.update_folder(db=db, folder_id=folder_id, folder_update=folder_update, user_id=current_user.id)
    if db_folder is None:
        raise HTTPException(status_code=404, detail="Pasta não encontrada")
    return db_folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(get_current_user),
    delete_decks: bool = False, 
):
    success = crud.delete_folder(
        db=db, 
        folder_id=folder_id, 
        user_id=current_user.id,
        delete_decks=delete_decks
    )
    if not success:
        raise HTTPException(status_code=404, detail="Pasta não encontrada ou pertence a outro usuário")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
