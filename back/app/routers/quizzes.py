# back/app/routers/quizzes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, security, schemas
from ..database import get_session
from ..study_ordering import order_due_for_review

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
    # 🔍 LOG DE DEBUGGING
    print(f"📥 Recebido: question_id={request.question_id}, answer_id={request.answer_id}")
    
    selected_answer = session.get(models.Answer, request.answer_id)

    if not selected_answer:
        print(f"❌ Resposta {request.answer_id} não encontrada no banco")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resposta não encontrada.")

    # 🔍 LOG DE DEBUGGING
    print(f"✅ Resposta encontrada: id={selected_answer.id}, text={selected_answer.text}, is_correct={selected_answer.is_correct}")

    question = crud.get_question_if_owned_by_user(
        session=session,
        question_id=request.question_id,
        user_id=current_user.id
    )
    if not question or selected_answer.question_id != question.id:
        print(f"❌ Pergunta não encontrada ou resposta não pertence à pergunta")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso não autorizado a esta pergunta.")

    # 🔍 LOG DE DEBUGGING - Mostra todas as respostas da pergunta
    print(f"📋 Respostas da pergunta {question.id}:")
    for ans in question.answers:
        print(f"  - id={ans.id}, text={ans.text}, is_correct={ans.is_correct}")

    correct_answer = next((ans for ans in question.answers if ans.is_correct), None)
    if not correct_answer:
        print(f"❌ Nenhuma resposta correta configurada para a pergunta {question.id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Pergunta sem resposta correta configurada.")

    # 🔍 LOG DE DEBUGGING
    print(f"✅ Resposta correta: id={correct_answer.id}, text={correct_answer.text}")
    print(f"🎯 Resultado: is_correct={selected_answer.is_correct}")

    return CheckAnswerResponse(
        is_correct=selected_answer.is_correct,
        correct_answer_id=correct_answer.id,
        explanation=correct_answer.explanation or "Não foi fornecida uma explicação para a resposta correta."
    )

class SubmitQuizRequest(models.SQLModel):
    score: float
    correct_answers: int
    total_questions: int
    # 🆕 Para o SRS: mapeamento de question_id -> acertou (True) / errou (False)
    question_results: dict[int, bool] = {}

@router.post("/{quiz_id}/submit", status_code=status.HTTP_201_CREATED)
def submit_quiz_attempt(
    quiz_id: int,
    request: SubmitQuizRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Regista uma tentativa de quiz (resultado) para o utilizador atual.
    """
    quiz = session.get(models.Quiz, quiz_id)
    if not quiz or quiz.document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz não encontrado.")
    
    quiz_attempt = models.QuizAttempt(
        score=request.score,
        correct_answers=request.correct_answers,
        total_questions=request.total_questions,
        quiz_id=quiz_id,
        user_id=current_user.id
    )
    
    # 🆕 Atualizar SRS para cada questão enviada no submit
    from ..srs import update_question_srs
    if request.question_results:
        for q_id_str, is_correct in request.question_results.items():
            db_question = session.get(models.Question, int(q_id_str))
            if db_question and db_question.quiz_id == quiz_id:
                update_question_srs(session, db_question, is_correct)
    
    session.add(quiz_attempt)
    session.commit()
    session.refresh(quiz_attempt)
    
    return {"message": "Resultado do quiz guardado com sucesso."}


@router.get("/review/{document_id}")
def get_review_quiz(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Retorna apenas as perguntas pendentes de revisão do documento.
    Poderá ser renderizado no Frontend na mesma engine de Quiz.
    """
    from datetime import datetime, timezone
    from sqlmodel import select

    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    if not getattr(db_document, "srs_enabled", True): # Usando getattr como safe-guard caso não tenha migrado
        return {"id": -1, "title": "Revisões Desativadas", "questions": []}

    now = datetime.now(timezone.utc)
    statement = (
        select(models.Question)
        .join(models.Quiz)
        .where(
            models.Quiz.document_id == document_id,
            models.Question.next_review <= now
        )
        .order_by(models.Question.repetitions.asc(), models.Question.next_review.asc())
    )
    due_questions = order_due_for_review(session.exec(statement).all())

    return {
        "id": db_document.quiz.id if getattr(db_document, "quiz", None) else "review",
        "title": f"Revisão Focada ({len(due_questions)})",
        "document_id": document_id,
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "quiz_id": q.quiz_id,
                "answers": [
                    {
                        "id": a.id,
                        "text": a.text,
                        "is_correct": a.is_correct,
                        "explanation": a.explanation
                    } for a in q.answers
                ]
            } for q in due_questions
        ]
    }
