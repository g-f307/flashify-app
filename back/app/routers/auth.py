# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from typing import Annotated

from .. import crud, schemas, security
from ..database import get_session

router = APIRouter(tags=["Authentication"]) # Mudei a tag para agrupar

# Endpoint de Criação de Usuário (já existente)
@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(user: schemas.UserCreate, session: Session = Depends(get_session)):
    db_user = crud.get_user_by_email(session=session, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado."
        )
    return crud.create_user(session=session, user_create=user)


# NOVO ENDPOINT DE LOGIN
@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    # 1. Busca o usuário pelo email (no formulário, o campo é 'username')
    user = crud.get_user_by_email(session=session, email=form_data.username)
    
    # 2. Verifica se o usuário existe e se a senha está correta
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Cria o token de acesso
    access_token = security.create_access_token(subject=user.email)
    
    # 4. Retorna o token
    return {"access_token": access_token, "token_type": "bearer"}