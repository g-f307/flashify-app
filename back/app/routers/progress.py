# back/app/routers/progress.py

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from typing import List

from .. import crud, models, security
from ..database import get_session

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