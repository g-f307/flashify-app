# app/routers/auth.py
import httpx
import os # Importe o 'os'
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, SQLModel 
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_session

router = APIRouter(tags=["Authentication"]) # Mudei a tag para agrupar

# Endpoint de Criação de Usuário (já existente)
@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(user: schemas.UserCreate, session: Session = Depends(get_session)):
    # Check if email already exists
    db_user_email = crud.get_user_by_email(session=session, email=user.email)
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado."
        )
    
    # Check if username already exists
    db_user_username = crud.get_user_by_username(session=session, username=user.username)
    if db_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já registrado."
        )
    
    return crud.create_user(session=session, user_create=user)


# NOVO ENDPOINT DE LOGIN
@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    # 1. Busca o usuário pelo nome de usuário ou email
    user = crud.get_user_by_username_or_email(session=session, identifier=form_data.username)
    
    # 2. Verifica se o usuário existe e se a senha está correta
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário/email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Cria o token de acesso (usando email como subject)
    access_token = security.create_access_token(subject=user.email)
    
    # 4. Retorna o token
    return {"access_token": access_token, "token_type": "bearer"}

# Crie um novo schema para receber o código do frontend
class GoogleAuthCode(SQLModel):
    code: str

@router.post("/google", response_model=schemas.Token)
async def auth_google(
    auth_code: GoogleAuthCode, 
    session: Session = Depends(get_session)
):
    """
    Recebe um código de autorização do Google, valida, cria/atualiza o usuário,
    e retorna um token JWT da nossa aplicação.
    """
    token_url = "https://oauth2.googleapis.com/token"
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("REDIRECT_URI")

    # 1. Troca o código pelo token de acesso do Google
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            token_url,
            data={
                "code": auth_code.code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Falha ao trocar código com o Google")
    
    access_token = token_response.json().get("access_token")

    # 2. Obtém as informações do usuário do Google
    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
    async with httpx.AsyncClient() as client:
        user_info_response = await client.get(
            user_info_url, headers={"Authorization": f"Bearer {access_token}"}
        )
    if user_info_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Falha ao obter informações do usuário do Google")

    user_info = user_info_response.json()
    user_email = user_info.get("email")
    if not user_email:
        raise HTTPException(status_code=400, detail="Email do Google não encontrado")

    # 3. Lógica "Get or Create" no nosso banco de dados
    db_user = crud.get_user_by_email(session=session, email=user_email)
    
    if not db_user:
        db_user = crud.create_social_user(
            session=session, 
            email=user_email, 
            username=user_info.get("name", user_email.split('@')[0])
        )
    
    # 4. Gera e retorna o nosso token JWT
    jwt_token = security.create_access_token(subject=db_user.email)
    return {"access_token": jwt_token, "token_type": "bearer"}

@router.get("/users/me", response_model=schemas.UserRead)
def read_users_me(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    """
    Retorna os dados do usuário atualmente autenticado.
    """
    return current_user