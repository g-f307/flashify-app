# back/app/routers/progress.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing_extensions import Annotated
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import calendar
from typing import List, Optional
from sqlalchemy.orm import selectinload

from .. import crud, models, security
from ..database import get_session
from ..study_ordering import order_due_for_review

router = APIRouter(prefix="/progress", tags=["Progress"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]


def _flashcard_last_accuracy_map(
    session: Session,
    document_id: int,
) -> dict[int, float]:
    logs = session.exec(
        select(models.StudyLog)
        .join(models.Flashcard, models.Flashcard.id == models.StudyLog.flashcard_id)
        .where(models.Flashcard.document_id == document_id)
        .order_by(models.StudyLog.flashcard_id.asc(), models.StudyLog.studied_at.desc())
    ).all()

    last_accuracy_by_flashcard: dict[int, float] = {}
    for log in logs:
        if log.flashcard_id not in last_accuracy_by_flashcard:
            last_accuracy_by_flashcard[log.flashcard_id] = log.accuracy

    return last_accuracy_by_flashcard


def _question_last_result_map(
    session: Session,
    document_id: int,
) -> dict[int, bool]:
    quiz = session.exec(
        select(models.Quiz)
        .where(models.Quiz.document_id == document_id)
        .options(selectinload(models.Quiz.attempts))
    ).first()
    if not quiz or not quiz.attempts:
        return {}

    latest_attempt = max(quiz.attempts, key=lambda attempt: attempt.completed_at)
    # Fallback conservador: se a versão antiga da tentativa não armazenar granularidade por questão,
    # mantemos a classificação estrutural atual.
    question_results = getattr(latest_attempt, "question_results", None)
    if not isinstance(question_results, dict):
        return {}

    parsed_results: dict[int, bool] = {}
    for question_id, is_correct in question_results.items():
        try:
            parsed_results[int(question_id)] = bool(is_correct)
        except (TypeError, ValueError):
            continue

    return parsed_results

# ▼▼▼ MODELO DE ESTATÍSTICAS ATUALIZADO PARA INCLUIR QUIZZES ▼▼▼
class ProgressStats(BaseModel):
    cards_studied_week: int
    streak_days: int
    flashcard_accuracy: float
    flashcard_weekly_activity: List[int]
    quizzes_completed_week: int
    quiz_average_score: float


class DashboardSummary(BaseModel):
    reviewed_decks_today: int
    flashcards_reviewed_today: int
    quizzes_completed_today: int
    last_active_document_id: Optional[int] = None
    last_activity_at: Optional[datetime] = None


class StreakCalendarDay(BaseModel):
    date: str
    day: int
    weekday: int
    status: str
    has_activity: bool


class StreakCalendarSummary(BaseModel):
    month: int
    year: int
    today: str
    current_streak: int
    active_days: int
    days: List[StreakCalendarDay]


class StreakCalendarRangeSummary(BaseModel):
    start_date: str
    end_date: str
    today: str
    current_streak: int
    days: List[StreakCalendarDay]


def _get_local_activity_dates(
    current_user: CurrentUser,
    session: Session,
    user_timezone_delta: timedelta,
):
    study_times = session.exec(
        select(models.StudyLog.studied_at)
        .where(models.StudyLog.user_id == current_user.id)
    ).all()

    quiz_times = session.exec(
        select(models.QuizAttempt.completed_at)
        .where(models.QuizAttempt.user_id == current_user.id)
    ).all()

    activity_dates = {
        (studied_at + user_timezone_delta).date()
        for studied_at in study_times
    }
    activity_dates.update(
        (completed_at + user_timezone_delta).date()
        for completed_at in quiz_times
    )

    return activity_dates


def _calculate_current_streak(activity_dates: set, today_date):
    if not activity_dates:
        return 0

    anchor_date = today_date if today_date in activity_dates else today_date - timedelta(days=1)
    if anchor_date not in activity_dates:
        return 0

    streak = 0
    cursor = anchor_date
    while cursor in activity_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


def _resolve_day_status(current_date, today_date, account_start_date, activity_dates: set):
    if current_date < account_start_date:
        return "before"
    if current_date in activity_dates:
        return "active"
    if current_date == today_date:
        return "today"
    if current_date > today_date:
        return "upcoming"
    return "missed"

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


@router.get("/dashboard-summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    utc_offset_minutes: int = Query(0)
):
    """
    Retorna um resumo diário enxuto para o banner da dashboard.
    """
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    user_today_date = (datetime.now(timezone.utc) + user_timezone_delta).date()

    study_rows = session.exec(
        select(models.StudyLog.studied_at, models.Flashcard.document_id)
        .join(models.Flashcard, models.Flashcard.id == models.StudyLog.flashcard_id)
        .where(models.StudyLog.user_id == current_user.id)
    ).all()

    reviewed_deck_ids: set[int] = set()
    flashcards_reviewed_today = 0
    last_activity_at: Optional[datetime] = None
    last_active_document_id: Optional[int] = None
    for studied_at, document_id in study_rows:
        if (studied_at + user_timezone_delta).date() == user_today_date:
            flashcards_reviewed_today += 1
            reviewed_deck_ids.add(document_id)
        if last_activity_at is None or studied_at > last_activity_at:
            last_activity_at = studied_at
            last_active_document_id = document_id

    quiz_rows = session.exec(
        select(models.QuizAttempt.completed_at, models.Quiz.document_id)
        .join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .join(models.Document, models.Document.id == models.Quiz.document_id)
        .where(
            models.Document.user_id == current_user.id,
            models.QuizAttempt.user_id == current_user.id
        )
    ).all()

    quizzes_completed_today = 0
    for completed_at, document_id in quiz_rows:
        if (completed_at + user_timezone_delta).date() == user_today_date:
            quizzes_completed_today += 1
            reviewed_deck_ids.add(document_id)
        if last_activity_at is None or completed_at > last_activity_at:
            last_activity_at = completed_at
            last_active_document_id = document_id

    return DashboardSummary(
        reviewed_decks_today=len(reviewed_deck_ids),
        flashcards_reviewed_today=flashcards_reviewed_today,
        quizzes_completed_today=quizzes_completed_today,
        last_active_document_id=last_active_document_id,
        last_activity_at=last_activity_at,
    )


@router.get("/streak-calendar", response_model=StreakCalendarSummary)
def get_streak_calendar(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    utc_offset_minutes: int = Query(0),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
):
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    local_now = datetime.now(timezone.utc) + user_timezone_delta
    today_date = local_now.date()

    target_month = month or local_now.month
    target_year = year or local_now.year

    first_day = datetime(target_year, target_month, 1).date()
    last_day_number = calendar.monthrange(target_year, target_month)[1]
    last_day = datetime(target_year, target_month, last_day_number).date()

    account_start_date = (current_user.created_at + user_timezone_delta).date()
    activity_dates = _get_local_activity_dates(current_user, session, user_timezone_delta)
    current_streak = _calculate_current_streak(activity_dates, today_date)

    days: List[StreakCalendarDay] = []
    for day_number in range(1, last_day_number + 1):
        current_date = datetime(target_year, target_month, day_number).date()
        status = _resolve_day_status(current_date, today_date, account_start_date, activity_dates)

        days.append(
            StreakCalendarDay(
                date=current_date.isoformat(),
                day=day_number,
                weekday=(current_date.weekday() + 1) % 7,
                status=status,
                has_activity=current_date in activity_dates,
            )
        )

    active_days = sum(1 for day in days if day.status == "active")

    return StreakCalendarSummary(
        month=target_month,
        year=target_year,
        today=today_date.isoformat(),
        current_streak=current_streak,
        active_days=active_days,
        days=days,
    )


@router.get("/streak-calendar-range", response_model=StreakCalendarRangeSummary)
def get_streak_calendar_range(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    utc_offset_minutes: int = Query(0),
    start_date: str = Query(...),
    days: int = Query(7, ge=7, le=42),
):
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    local_now = datetime.now(timezone.utc) + user_timezone_delta
    today_date = local_now.date()

    try:
      range_start = datetime.strptime(start_date, "%Y-%m-%d").date()
    except ValueError:
      raise HTTPException(status_code=400, detail="start_date deve estar no formato YYYY-MM-DD.")

    account_start_date = (current_user.created_at + user_timezone_delta).date()
    activity_dates = _get_local_activity_dates(current_user, session, user_timezone_delta)
    current_streak = _calculate_current_streak(activity_dates, today_date)
    range_end = range_start + timedelta(days=days - 1)

    range_days: List[StreakCalendarDay] = []
    for offset in range(days):
        current_date = range_start + timedelta(days=offset)
        status = _resolve_day_status(current_date, today_date, account_start_date, activity_dates)
        range_days.append(
            StreakCalendarDay(
                date=current_date.isoformat(),
                day=current_date.day,
                weekday=(current_date.weekday() + 1) % 7,
                status=status,
                has_activity=current_date in activity_dates,
            )
        )

    return StreakCalendarRangeSummary(
        start_date=range_start.isoformat(),
        end_date=range_end.isoformat(),
        today=today_date.isoformat(),
        current_streak=current_streak,
        days=range_days,
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

    flashcard_last_accuracy = _flashcard_last_accuracy_map(session, document_id)
    question_last_results = _question_last_result_map(session, document_id)

    # Buscar flashcards pendentes de revisão (exclui novos com next_review=NULL)
    fc_stmt = select(models.Flashcard).where(
        models.Flashcard.document_id == document_id,
        models.Flashcard.next_review != None,
        models.Flashcard.next_review <= now
    )
    fc_pending = session.exec(fc_stmt).all()
    fc_count = len(fc_pending)

    high, medium, low = 0, 0, 0
    for fc in fc_pending:
        last_accuracy = flashcard_last_accuracy.get(fc.id)
        if last_accuracy is not None:
            if last_accuracy == 0.0:
                bucket = "high"
            elif last_accuracy == 0.5:
                bucket = "medium"
            else:
                bucket = "low"
        else:
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
        last_result = question_last_results.get(question.id)
        if last_result is False:
            bucket = "high"
        elif last_result is True:
            bucket = "low"
        else:
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
    last_accuracy_by_flashcard = _flashcard_last_accuracy_map(session, document_id)

    new_cards = 0
    needs_review = 0
    learning = 0
    almost_mastered = 0

    for fc in all_fc:
        last_accuracy = last_accuracy_by_flashcard.get(fc.id)

        if last_accuracy is None and fc.next_review is None:
            # Nunca estudado
            new_cards += 1
        elif last_accuracy == 0.0 or fc.repetitions == 0:
            # Errou
            needs_review += 1
        elif last_accuracy == 0.5:
            # Quase acertou
            learning += 1
        else:
            # Acertou
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
    last_accuracy_by_flashcard = _flashcard_last_accuracy_map(session, document_id)

    filtered = []
    for fc in all_fc:
        last_accuracy = last_accuracy_by_flashcard.get(fc.id)

        if group == "new" and last_accuracy is None and fc.next_review is None:
            filtered.append(fc)
        elif group == "needs_review" and (last_accuracy == 0.0 or (fc.next_review is not None and fc.repetitions == 0)):
            filtered.append(fc)
        elif group == "learning" and last_accuracy == 0.5:
            filtered.append(fc)
        elif group == "almost_mastered" and last_accuracy == 1.0:
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
    last_results_by_question = _question_last_result_map(session, document_id)

    new_questions = 0
    wrong = 0
    correct = 0

    for q in all_questions:
        last_result = last_results_by_question.get(q.id)

        if last_result is None and q.next_review is None:
            # Nunca respondida
            new_questions += 1
        elif last_result is False or q.repetitions == 0:
            # Respondeu errado
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

    last_results_by_question = _question_last_result_map(session, document_id)
    filtered = []
    for q in quiz.questions:
        last_result = last_results_by_question.get(q.id)

        if group == "new" and last_result is None and q.next_review is None:
            filtered.append(q)
        elif group == "wrong" and (last_result is False or (q.next_review is not None and q.repetitions == 0)):
            filtered.append(q)
        elif group == "correct" and (last_result is True or (last_result is None and q.next_review is not None and q.repetitions > 0)):
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
