import httpx
import os
from typing import Annotated
from ..models import AuthProvider
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, SQLModel
from datetime import datetime, timezone
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .. import crud, models, schemas, security
from ..database import get_session
from ..email_service import email_service  # 🆕 IMPORTAR

router = APIRouter(tags=["Authentication"])

@router.post("/users", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def create_new_user(user: schemas.UserCreate, session: Session = Depends(get_session)):
    db_user_email = crud.get_user_by_email(session=session, email=user.email)
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado."
        )
    
    db_user_username = crud.get_user_by_username(session=session, username=user.username)
    if db_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já registrado."
        )
    
    created_user = crud.create_user(session=session, user_create=user)
    
    # 🆕 ENVIAR E-MAIL DE BOAS-VINDAS (assíncrono, não bloqueia)
    try:
        await email_service.send_welcome_email(
            email=created_user.email,
            username=created_user.username
        )
    except Exception as e:
        # Log do erro, mas não falha o registro
        print(f"⚠️ Falha ao enviar e-mail de boas-vindas: {e}")
    
    return created_user

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    user = crud.get_user_by_username_or_email(session=session, identifier=form_data.username)
    
    if not user or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário/email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 🆕 ATUALIZAR ÚLTIMO LOGIN E RESETAR FLAG DE INATIVIDADE
    user.last_login_at = datetime.now(timezone.utc)
    user.inactivity_email_sent = False
    session.add(user)
    session.commit()
    
    access_token = security.create_access_token(subject=user.email)
    
    return {"access_token": access_token, "token_type": "bearer"}

# 🆕 ATUALIZAR TAMBÉM O LOGIN DO GOOGLE
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
    
    token_json = token_response.json()
    access_token = token_json.get("access_token")

    user_info_url = "https://www.googleapis.com/oauth2/v1/userinfo"
    async with httpx.AsyncClient() as client:
        user_info_response = await client.get(
            user_info_url, headers={"Authorization": f"Bearer {access_token}"}
        )
    if user_info_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Falha ao obter informações do usuário do Google")

    user_info = user_info_response.json()
    email = user_info.get("email")
    username = user_info.get("name", email.split('@')[0] if email else "user")
    profile_picture_url = user_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Email do Google não encontrado")

    db_user = crud.get_or_create_google_user(
        session=session, 
        email=email,
        username=username,
        profile_picture_url=profile_picture_url
    )
    
    # 🆕 ATUALIZAR ÚLTIMO LOGIN
    db_user.last_login_at = datetime.now(timezone.utc)
    db_user.inactivity_email_sent = False
    session.add(db_user)
    session.commit()
    
    # 🆕 SE FOR NOVO USUÁRIO (acabou de ser criado), ENVIAR E-MAIL DE BOAS-VINDAS
    if not db_user.last_login_at or (datetime.now(timezone.utc) - db_user.created_at).seconds < 60:
        try:
            await email_service.send_welcome_email(
                email=db_user.email,
                username=db_user.username
            )
        except Exception as e:
            print(f"⚠️ Falha ao enviar e-mail de boas-vindas: {e}")
    
    jwt_token = security.create_access_token(subject=db_user.email)
    return {"access_token": jwt_token, "token_type": "bearer"}

class GoogleIdTokenRequest(SQLModel):
    """Requisição para login via ID Token (mobile)"""
    id_token: str

@router.post("/google/mobile", response_model=schemas.Token)
async def auth_google_mobile(
    token_request: GoogleIdTokenRequest,
    session: Session = Depends(get_session)
):
    """
    Endpoint para autenticação Google via ID Token (app mobile).
    O app Android envia o ID Token diretamente, validado pelo SHA-1.
    Não requer Client Secret porque a segurança vem do certificado SHA-1.
    """
    try:
        # 1. Obter Client ID das variáveis de ambiente
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            raise HTTPException(
                status_code=500, 
                detail="GOOGLE_CLIENT_ID não configurado no servidor"
            )
        
        print(f"🔐 Validando ID Token com Client ID: {google_client_id[:20]}...")
        
        # 2. Validar o ID Token com o Google
        # A biblioteca google-auth valida automaticamente:
        # - Assinatura do token
        # - Expiração
        # - Emissor (Google)
        # - Audience (seu Client ID)
        idinfo = id_token.verify_oauth2_token(
            token_request.id_token,
            google_requests.Request(),
            google_client_id
        )
        
        # 3. Verificar emissor do token (segurança extra)
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            print(f"❌ Emissor inválido: {idinfo['iss']}")
            raise HTTPException(status_code=400, detail="Token de origem inválida")
        
        # 4. Extrair informações do usuário
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email não encontrado no token")
        
        # Se não tiver nome, usa a parte antes do @ do email
        if not name:
            name = email.split('@')[0]
        
        print(f"✅ Usuário autenticado: {email} (Nome: {name})")
        
        # 5. Criar ou atualizar usuário no banco
        db_user = crud.get_or_create_google_user(
            session=session,
            email=email,
            username=name,
            profile_picture_url=picture
        )
        
        # 6. Gerar JWT token da nossa aplicação
        jwt_token = security.create_access_token(subject=db_user.email)
        
        print(f"🎫 Token JWT gerado para: {db_user.email}")
        
        return {"access_token": jwt_token, "token_type": "bearer"}
        
    except ValueError as e:
        # Token inválido, expirado ou com audience incorreta
        print(f"❌ Erro de validação: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail=f"Token inválido ou expirado: {str(e)}"
        )
    except HTTPException:
        # Re-lançar HTTPExceptions que já criamos
        raise
    except Exception as e:
        # Qualquer outro erro inesperado
        print(f"❌ Erro inesperado na autenticação: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao processar autenticação"
        )

@router.post("/users/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_current_user_password(
    password_update: schemas.UserPasswordUpdate,
    current_user: Annotated[models.User, Depends(security.get_current_user)],
    session: Session = Depends(get_session),
):
    """
    Permite que o usuário autenticado altere sua própria senha.
    """
    # 1. Verifica se o usuário é um usuário "local"
    if current_user.provider != AuthProvider.LOCAL or not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar a senha para contas de login social.",
        )

    # 2. Verifica se a senha atual fornecida está correta
    if not security.verify_password(password_update.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A senha atual está incorreta."
        )

    # 3. Criptografa a nova senha
    new_hashed_password = security.get_password_hash(password_update.new_password)
    
    # 4. Atualiza a senha no banco de dados
    current_user.hashed_password = new_hashed_password
    session.add(current_user)
    session.commit()

    return None

@router.get("/users/me", response_model=schemas.UserRead)
def read_users_me(current_user: Annotated[models.User, Depends(security.get_current_user)]):
    """
    Retorna os dados do usuário atualmente autenticado.
    """
    return current_user

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_session),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Endpoint para excluir um documento (deck) e todos os seus dados associados.
    """
    db_document = crud.get_document(db, document_id=document_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verifica se o documento pertence ao utilizador atual
    if db_document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    success = crud.delete_document_and_related_data(db=db, document_id=document_id)
    if not success:
        # Este caso é uma salvaguarda, a verificação anterior já deve ter coberto
        raise HTTPException(status_code=404, detail="Document not found during deletion")
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)