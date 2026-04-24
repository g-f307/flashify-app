# back/app/routers/progress.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing_extensions import Annotated
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from .. import crud, models, security
from ..database import get_session
from ..study_ordering import order_due_for_review

router = APIRouter(prefix="/progress", tags=["Progress"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

# ▼▼▼ MODELO DE ESTATÍSTICAS ATUALIZADO PARA INCLUIR QUIZZES ▼▼▼
class ProgressStats(BaseModel):
    cards_studied_week: int
    streak_days: int
    flashcard_accuracy: float
    flashcard_weekly_activity: List[int]
    quizzes_completed_week: int
    quiz_average_score: float

@router.get("/stats", response_model=ProgressStats)
def get_progress_stats(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    utc_offset_minutes: int = Query(0)
):
    """
    Retorna as estatísticas de progresso, incluindo dados de flashcards e quizzes.
    """
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    user_now = datetime.now(timezone.utc) + user_timezone_delta

    # --- ESTATÍSTICAS DE FLASHCARDS ---
    study_logs = crud.get_study_logs_for_user(session, user_id=current_user.id)
    local_study_log_times = [(log.studied_at + user_timezone_delta) for log in study_logs]

    one_week_ago_date = user_now.date() - timedelta(days=7)
    cards_studied_week = sum(1 for log_time in local_study_log_times if log_time.date() > one_week_ago_date)

    flashcard_weekly_activity = [0] * 7
    start_of_week = user_now.date() - timedelta(days=6)
    for day_offset in range(7):
        current_day_local = start_of_week + timedelta(days=day_offset)
        day_index = current_day_local.weekday()
        count = sum(1 for log_time in local_study_log_times if log_time.date() == current_day_local)
        flashcard_weekly_activity[day_index] = count

    flashcard_accuracy = 0.0
    if study_logs:
        total_accuracy_score = sum(log.accuracy for log in study_logs)
        average_accuracy_ratio = total_accuracy_score / len(study_logs)
        flashcard_accuracy = round(average_accuracy_ratio * 100, 1)

    streak_days = 0
    if local_study_log_times:
        study_dates = sorted(list(set(log_time.date() for log_time in local_study_log_times)), reverse=True)
        user_today_date = user_now.date()
        
        if study_dates[0] >= user_today_date - timedelta(days=1):
            streak_days = 1
            for i in range(len(study_dates) - 1):
                if (study_dates[i] - study_dates[i+1]).days == 1:
                    streak_days += 1
                else:
                    break
    
    # --- ESTATÍSTICAS DE QUIZZES (CORRIGIDO) ---
    quiz_attempts = crud.get_quiz_attempts_for_user(session, user_id=current_user.id)
    # ✅ USAR completed_at EM VEZ DE created_at
    local_quiz_attempt_times = [(qa.completed_at + user_timezone_delta) for qa in quiz_attempts]
    
    quizzes_completed_week = sum(1 for attempt_time in local_quiz_attempt_times if attempt_time.date() > one_week_ago_date)
    
    quiz_average_score = 0.0
    if quiz_attempts:
        total_score = sum(qa.score for qa in quiz_attempts)
        quiz_average_score = round(total_score / len(quiz_attempts), 1)

    return ProgressStats(
        cards_studied_week=cards_studied_week,
        streak_days=streak_days,
        flashcard_accuracy=flashcard_accuracy,
        flashcard_weekly_activity=flashcard_weekly_activity,
        quizzes_completed_week=quizzes_completed_week,
        quiz_average_score=quiz_average_score,
    )

@router.get("/review-flashcards/{document_id}", response_model=list[models.Flashcard])
def get_review_flashcards(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    from datetime import datetime, timezone
    from sqlmodel import select

    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    if not getattr(db_document, "srs_enabled", True):
        return []

    now = datetime.now(timezone.utc)
    statement = (
        select(models.Flashcard)
        .where(
            models.Flashcard.document_id == document_id,
            models.Flashcard.next_review != None,  # Excluir cards novos (NULL)
            models.Flashcard.next_review <= now
        )
        .order_by(models.Flashcard.repetitions.asc(), models.Flashcard.next_review.asc())
    )
    return order_due_for_review(session.exec(statement).all())

@router.get("/srs-stats/{document_id}")
def get_srs_stats_for_document(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Retorna as contagens de revisões atrasadas e próximas revisões no SRS para o documento."""

    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    if not getattr(db_document, "srs_enabled", True):
        return {
            "flashcards_pending": 0, 
            "questions_pending": 0, 
            "srs_enabled": False,
            "next_review_time": None,
            "pending_priorities": {"high": 0, "medium": 0, "low": 0}
        }

    now = datetime.now(timezone.utc)
    
    def get_priority_bucket(repetitions: int, interval_days: int) -> str:
        if repetitions == 0:
            return "high"
        if repetitions <= 2 or interval_days <= 2:
            return "medium"
        return "low"

    # Buscar flashcards pendentes de REVISÃO (exclui novos com next_review=NULL)
    fc_stmt = select(models.Flashcard).where(
        models.Flashcard.document_id == document_id,
        models.Flashcard.next_review != None,
        models.Flashcard.next_review <= now
    )
    fc_pending = session.exec(fc_stmt).all()
    fc_count = len(fc_pending)

    high, medium, low = 0, 0, 0
    for fc in fc_pending:
        bucket = get_priority_bucket(fc.repetitions, fc.interval_days)
        if bucket == "high":
            high += 1
        elif bucket == "medium":
            medium += 1
        else:
            low += 1

    # Contar questões pendentes (exclui novas com next_review=NULL)
    q_stmt = (
        select(models.Question)
        .join(models.Quiz)
        .where(
            models.Quiz.document_id == document_id,
            models.Question.next_review != None,
            models.Question.next_review <= now
        )
    )
    q_pending = session.exec(q_stmt).all()
    q_count = len(q_pending)

    for question in q_pending:
        bucket = get_priority_bucket(question.repetitions, question.interval_days)
        if bucket == "high":
            high += 1
        elif bucket == "medium":
            medium += 1
        else:
            low += 1

    # Buscar tempo da PRÓXIMA revisão (aquela que ainda não está atrasada)
    future_fc_stmt = select(func.min(models.Flashcard.next_review)).where(
        models.Flashcard.document_id == document_id,
        models.Flashcard.next_review > now
    )
    future_q_stmt = (
        select(func.min(models.Question.next_review))
        .join(models.Quiz)
        .where(
            models.Quiz.document_id == document_id,
            models.Question.next_review > now
        )
    )
    
    next_fc = session.exec(future_fc_stmt).one_or_none()
    next_q = session.exec(future_q_stmt).one_or_none()
    
    future_dates = [d for d in (next_fc, next_q) if d is not None]
    next_review_time = min(future_dates) if future_dates else None

    return {
        "flashcards_pending": fc_count,
        "questions_pending": q_count,
        "srs_enabled": getattr(db_document, "srs_enabled", True),
        "next_review_time": next_review_time.isoformat() if next_review_time else None,
        "pending_priorities": {
            "high": high,
            "medium": medium,
            "low": low
        }
    }


@router.get("/srs-groups/{document_id}")
def get_srs_groups(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Retorna flashcards agrupados por nível de aprendizado (repetitions + interval)."""
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    all_fc = session.exec(
        select(models.Flashcard).where(models.Flashcard.document_id == document_id)
    ).all()

    new_cards = 0
    needs_review = 0
    learning = 0
    almost_mastered = 0

    for fc in all_fc:
        if fc.next_review is None:
            # Nunca estudado
            new_cards += 1
        elif fc.repetitions == 0:
            # Errou → SM2 resetou repetitions para 0
            needs_review += 1
        elif fc.interval_days <= 2:
            # Acertou parcialmente ou está nos primeiros ciclos (intervalo curto)
            learning += 1
        else:
            # Acertou bem → intervalo longo (3+ dias)
            almost_mastered += 1

    return {
        "new_cards": new_cards,
        "needs_review": needs_review,
        "learning": learning,
        "almost_mastered": almost_mastered,
        "total": len(all_fc)
    }


@router.get("/srs-group-cards/{document_id}", response_model=list[models.Flashcard])
def get_srs_group_cards(
    document_id: int,
    group: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Retorna os flashcards de uma categoria de aprendizado específica."""
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    all_fc = session.exec(
        select(models.Flashcard).where(models.Flashcard.document_id == document_id)
    ).all()

    filtered = []
    for fc in all_fc:
        if group == "new" and fc.next_review is None:
            filtered.append(fc)
        elif group == "needs_review" and fc.next_review is not None and fc.repetitions == 0:
            filtered.append(fc)
        elif group == "learning" and fc.next_review is not None and fc.repetitions > 0 and fc.interval_days <= 2:
            filtered.append(fc)
        elif group == "almost_mastered" and fc.next_review is not None and fc.repetitions > 0 and fc.interval_days > 2:
            filtered.append(fc)

    return filtered


@router.get("/quiz-srs-groups/{document_id}")
def get_quiz_srs_groups(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Retorna questões do quiz agrupadas por nível de aprendizado (2 categorias: errou/acertou)."""
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    # Buscar todas as questões do quiz deste documento
    quiz_stmt = select(models.Quiz).where(models.Quiz.document_id == document_id)
    quiz = session.exec(quiz_stmt).first()
    
    if not quiz:
        return {"new_questions": 0, "wrong": 0, "correct": 0, "total": 0}

    all_questions = quiz.questions

    new_questions = 0
    wrong = 0
    correct = 0

    for q in all_questions:
        if q.next_review is None:
            # Nunca respondida
            new_questions += 1
        elif q.repetitions == 0:
            # Respondeu errado (SM2 resetou)
            wrong += 1
        else:
            # Respondeu certo
            correct += 1

    return {
        "new_questions": new_questions,
        "wrong": wrong,
        "correct": correct,
        "total": len(all_questions)
    }

@router.get("/quiz-srs-group-questions/{document_id}")
def get_quiz_srs_group_questions(
    document_id: int,
    group: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """Retorna um objeto Quiz contendo apenas as questões da categoria SRS selecionada (new, wrong, correct)."""
    db_document = crud.get_document(session, document_id)
    if not db_document or db_document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    quiz_stmt = select(models.Quiz).where(models.Quiz.document_id == document_id)
    quiz = session.exec(quiz_stmt).first()
    
    if not quiz:
        return {"id": "grouped", "title": "Grupo Vazio", "document_id": document_id, "questions": []}

    filtered = []
    for q in quiz.questions:
        if group == "new" and q.next_review is None:
            filtered.append(q)
        elif group == "wrong" and q.next_review is not None and q.repetitions == 0:
            filtered.append(q)
        elif group == "correct" and q.next_review is not None and q.repetitions > 0:
            filtered.append(q)

    # Ordenar by next_review se não for new (os novos ficam na ordem criada ou random no front)
    if group != "new":
        filtered.sort(key=lambda x: x.next_review.timestamp() if x.next_review else 0)

    # Define nome do grupo
    titles_map = {"new": "Novas Questões", "wrong": "Precisa Revisar", "correct": "Questões Dominadas"}
    title = titles_map.get(group, "Revisão")

    return {
        "id": quiz.id,
        "title": f"{title} ({len(filtered)})",
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
            } for q in filtered
        ]
    }
