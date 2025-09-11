# app/routers/flashcards.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel

from .. import crud, models, security
from ..database import get_session
from ..ai_generator import chat_about_flashcard

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    conversation_id: int

@router.post("/{flashcard_id}/chat", response_model=ChatResponse)
def chat_with_flashcard(
    flashcard_id: int,
    chat_message: ChatMessage,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Chat contextual sobre um flashcard específico.
    """
    # Buscar o flashcard e verificar se pertence ao usuário
    flashcard = crud.get_flashcard(session, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    
    # Verificar se o documento do flashcard pertence ao usuário
    document = flashcard.document
    if document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Buscar histórico de conversas
    previous_conversations = crud.get_flashcard_conversations(session, flashcard_id)
    
    # Preparar histórico para a IA
    conversation_history = []
    for conv in previous_conversations[-10:]:  # Últimas 10 mensagens
        conversation_history.append({
            "user": conv.user_message,
            "assistant": conv.assistant_response
        })
    
    # Gerar resposta da IA com contexto
    ai_response = chat_about_flashcard(
        message=chat_message.message,
        flashcard_front=flashcard.front,
        flashcard_back=flashcard.back,
        document_context=document.extracted_text or "",
        conversation_history=conversation_history
    )
    
    # Salvar a conversa
    conversation = crud.create_flashcard_conversation(
        session=session,
        flashcard_id=flashcard_id,
        user_message=chat_message.message,
        assistant_response=ai_response
    )
    
    return ChatResponse(
        response=ai_response,
        conversation_id=conversation.id
    )

@router.get("/{flashcard_id}/conversations", response_model=list[models.FlashcardConversation])
def get_flashcard_chat_history(
    flashcard_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Recupera o histórico de conversas de um flashcard.
    """
    # Verificar se o flashcard existe e pertence ao usuário
    flashcard = crud.get_flashcard(session, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    
    document = flashcard.document
    if document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return crud.get_flashcard_conversations(session, flashcard_id)

@router.get("/{flashcard_id}", response_model=models.Flashcard)
def get_flashcard_details(
    flashcard_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Obter detalhes de um flashcard específico.
    """
    flashcard = crud.get_flashcard(session, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    
    # Verificar se o documento do flashcard pertence ao usuário
    document = flashcard.document
    if document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return flashcard

@router.post("/{flashcard_id}/study", status_code=status.HTTP_204_NO_CONTENT)
def mark_flashcard_as_studied(
    flashcard_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Cria um registo de que o flashcard foi estudado pelo usuário."""
    flashcard = crud.get_flashcard(session, flashcard_id)
    
    # Validação para garantir que o flashcard pertence ao usuário
    if not flashcard or flashcard.document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")

    # --- LÓGICA ALTERADA ---
    # Em vez de modificar o documento, criamos uma entrada no StudyLog
    crud.create_study_log_entry(
        session=session,
        user_id=current_user.id,
        flashcard_id=flashcard_id
    )
    
    # A antiga lógica de `document.studied_flashcard_ids` foi removida.
    
    return