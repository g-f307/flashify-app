# app/routers/flashcards.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel, Field

from .. import crud, models, security
from ..database import get_session
from ..ai_generator import chat_about_flashcard

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

# --- Modelos Pydantic para a rota ---

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    conversation_id: int
    
# 🔽 NOVO MODELO Pydantic PARA O INPUT DE ESTUDO 🔽
class StudyLogInput(BaseModel):
    # O valor que virá do frontend (0.0 para Errei, 0.5 para Quase, 1.0 para Acertei)
    accuracy: float = Field(ge=0.0, le=1.0)

# --- Rotas existentes (mantidas) ---

@router.post("/{flashcard_id}/chat", response_model=ChatResponse)
def chat_with_flashcard(
    flashcard_id: int,
    chat_message: ChatMessage,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Chat contextual sobre um flashcard específico."""
    # 🔽 ALTERAÇÃO: Usar a nova função `get_flashcard` que já valida o dono 🔽
    flashcard = crud.get_flashcard(session, flashcard_id, user_id=current_user.id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado ou acesso negado")

    previous_conversations = crud.get_flashcard_conversations(session, flashcard_id)
    conversation_history = [
        {"user": conv.user_message, "assistant": conv.assistant_response}
        for conv in previous_conversations[-10:]
    ]
    
    ai_response = chat_about_flashcard(
        message=chat_message.message,
        flashcard_front=flashcard.front,
        flashcard_back=flashcard.back,
        document_context=flashcard.document.extracted_text or "",
        conversation_history=conversation_history
    )
    
    conversation = crud.create_flashcard_conversation(
        session=session,
        flashcard_id=flashcard_id,
        user_message=chat_message.message,
        assistant_response=ai_response
    )
    
    return ChatResponse(response=ai_response, conversation_id=conversation.id)


@router.get("/{flashcard_id}/conversations", response_model=list[models.FlashcardConversation])
def get_flashcard_chat_history(
    flashcard_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Recupera o histórico de conversas de um flashcard."""
    flashcard = crud.get_flashcard(session, flashcard_id, user_id=current_user.id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado ou acesso negado")
    
    return crud.get_flashcard_conversations(session, flashcard_id)


@router.get("/{flashcard_id}", response_model=models.Flashcard)
def get_flashcard_details(
    flashcard_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Obter detalhes de um flashcard específico."""
    flashcard = crud.get_flashcard(session, flashcard_id, user_id=current_user.id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado ou acesso negado")
    
    return flashcard


# 🔽 NOVA ROTA PARA REGISTAR O FEEDBACK DE ESTUDO (SUBSTITUI A ANTIGA /study) 🔽
@router.post("/{flashcard_id}/log_study", response_model=models.StudyLog, status_code=201)
def log_study_session(
    flashcard_id: int,
    study_input: StudyLogInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Regista um evento de estudo para um flashcard específico, incluindo o feedback.
    """
    # Valida se o flashcard pertence ao usuário antes de registar o log
    db_flashcard = crud.get_flashcard(session, flashcard_id, user_id=current_user.id)
    if not db_flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado ou acesso negado")

    # Cria o registo de estudo no banco de dados com o feedback (accuracy)
    study_log = crud.create_study_log(
        session=session,
        user_id=current_user.id,
        flashcard_id=flashcard_id,
        accuracy=study_input.accuracy
    )
    return study_log