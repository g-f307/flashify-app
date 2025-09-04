# app/security.py
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Union

from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session
from jose import JWTError, jwt

from . import crud, models
from .database import get_session

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# NOVA FUNÇÃO PARA CRIAR O TOKEN
def create_access_token(subject: Union[str, Any], expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# NOVA FUNÇÃO PARA OBTER O USUÁRIO ATUAL
def get_current_user(
    session: Session = Depends(get_session), token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodifica o token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Pega o email (que definimos como "subject" ou "sub") do payload
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Busca o usuário no banco de dados
    user = crud.get_user_by_email(session=session, email=email)
    if user is None:
        raise credentials_exception
    return user