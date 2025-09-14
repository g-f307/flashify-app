# g-f307/flashify-app/flashify-app-feature-integra-app/back/app/routers/progress.py

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from typing_extensions import Annotated
from pydantic import BaseModel
from datetime import datetime, timedelta, date, timezone

from .. import crud, models, security
from ..database import get_session

router = APIRouter(prefix="/progress", tags=["Progress"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

class ProgressStats(BaseModel):
    cards_studied_week: int
    streak_days: int
    general_accuracy: float
    weekly_activity: list[int]

@router.get("/stats", response_model=ProgressStats)
def get_progress_stats(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    utc_offset_minutes: int = Query(0)
):
    """
    Retorna as estatísticas de progresso, ajustadas para o fuso horário do usuário.
    """
    study_logs = crud.get_study_logs_for_user(session, user_id=current_user.id)
    
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    user_now = datetime.now(timezone.utc) + user_timezone_delta
    local_study_log_times = [(log.studied_at + user_timezone_delta) for log in study_logs]

    # 1. CARDS ESTUDADOS NA SEMANA
    one_week_ago_local = user_now.date() - timedelta(days=7)
    cards_studied_week = sum(1 for log_time in local_study_log_times if log_time.date() > one_week_ago_local)

    # 2. ATIVIDADE SEMANAL (GRÁFICO)
    weekly_activity = [0] * 7
    start_of_week = user_now.date() - timedelta(days=6)
    for day_offset in range(7):
        current_day_local = start_of_week + timedelta(days=day_offset)
        day_index = (current_day_local.weekday() + 1) % 7
        count = sum(1 for log_time in local_study_log_times if log_time.date() == current_day_local)
        weekly_activity[day_index] = count

    # 3. CÁLCULO DE COBERTURA DE ESTUDO ("Precisão Geral")
    total_flashcards = crud.get_total_flashcards_count_for_user(session, user_id=current_user.id)
    unique_studied_count = crud.get_unique_studied_flashcards_count_for_user(session, user_id=current_user.id)

    if total_flashcards == 0:
        general_accuracy = 0.0
    else:
        general_accuracy = unique_studied_count / total_flashcards

    # 4. CÁLCULO DE SEQUÊNCIA (STREAK)
    streak_days = 0
    if local_study_log_times:
        study_dates = sorted(list(set(log_time.date() for log_time in local_study_log_times)), reverse=True)
        user_today_date = user_now.date()
        
        if study_dates[0] == user_today_date or study_dates[0] == user_today_date - timedelta(days=1):
            streak_days = 1
            for i in range(len(study_dates) - 1):
                if (study_dates[i] - study_dates[i+1]).days == 1:
                    streak_days += 1
                else:
                    break
        else:
            streak_days = 0

    return ProgressStats(
        cards_studied_week=cards_studied_week,
        streak_days=streak_days,
        general_accuracy=general_accuracy,
        weekly_activity=weekly_activity,
    )

# 🔽 ROTA EM FALTA ADICIONADA AQUI 🔽
@router.get("/review-flashcards", response_model=list[models.Flashcard])
def get_flashcards_for_review(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    """
    Retorna uma lista de flashcards que o utilizador marcou como "Errei" ou "Quase"
    e que precisam de ser revistos.
    """
    review_flashcards = crud.get_flashcards_for_review(session, user_id=current_user.id)
    return review_flashcards