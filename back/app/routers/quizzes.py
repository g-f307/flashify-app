# back/app/routers/quizzes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, security, schemas
from ..database import get_session

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

class CheckAnswerRequest(models.SQLModel):
    """Schema para o pedido de verificação de uma resposta."""
    question_id: int
    answer_id: int

class CheckAnswerResponse(models.SQLModel):
    """Schema para a resposta da verificação."""
    is_correct: bool
    correct_answer_id: int
    explanation: str

@router.post("/check-answer", response_model=CheckAnswerResponse)
def check_quiz_answer(
    request: CheckAnswerRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Verifica se a resposta de um quiz selecionada pelo utilizador está correta.
    """
    # Busca a resposta selecionada pelo utilizador
    selected_answer = session.get(models.Answer, request.answer_id)

    if not selected_answer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta não encontrada.")

    # Validação de segurança: Garante que a pergunta pertence ao utilizador atual
    question = crud.get_question_if_owned_by_user(
        session=session,
        question_id=request.question_id,
        user_id=current_user.id
    )
    if not question or selected_answer.question_id != question.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado a esta pergunta.")

    # Encontra a resposta correta para esta pergunta
    correct_answer = next((ans for ans in question.answers if ans.is_correct), None)
    if not correct_answer:
        # Isto seria um erro de dados, mas é bom tratar
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Pergunta sem resposta correta configurada.")

    return CheckAnswerResponse(
        is_correct=selected_answer.is_correct,
        correct_answer_id=correct_answer.id,
        explanation=selected_answer.explanation or "Não foi fornecida uma explicação."
    )