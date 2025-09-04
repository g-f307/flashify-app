# app/routers/folders.py
from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, schemas, security
from ..database import get_session

router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)

# Definimos um tipo anotado para não repetir o 'Depends' toda hora
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

@router.post("/", response_model=schemas.FolderRead, status_code=201)
def create_folder(
    folder: schemas.FolderCreate,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Cria uma nova pasta para o usuário atualmente logado.
    """
    return crud.create_folder_for_user(
        session=session, folder_create=folder, user_id=current_user.id
    )

@router.get("/", response_model=List[schemas.FolderRead])
def read_folders(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Lista todas as pastas do usuário atualmente logado.
    """
    return crud.get_folders_by_user(session=session, user_id=current_user.id)