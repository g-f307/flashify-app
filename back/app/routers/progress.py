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
    
    # O JavaScript envia o offset invertido (ex: UTC-4 é +240), então subtraímos para corrigir
    user_timezone_delta = timedelta(minutes=-utc_offset_minutes)
    user_now = datetime.now(timezone.utc) + user_timezone_delta

    # Converte todos os tempos de estudo para o horário local do usuário para consistência
    local_study_log_times = [(log.studied_at + user_timezone_delta) for log in study_logs]

    # 1. CARDS ESTUDADOS NA SEMANA (baseado no horário local)
    one_week_ago_local = user_now.date() - timedelta(days=7)
    cards_studied_week = sum(1 for log_time in local_study_log_times if log_time.date() > one_week_ago_local)

    # 2. ATIVIDADE SEMANAL (GRÁFICO) (baseado no horário local)
    weekly_activity = [0] * 7
    # Começa a contar a partir de 6 dias atrás para ter uma janela de 7 dias
    start_of_week = user_now.date() - timedelta(days=6)
    for day_offset in range(7):
        current_day_local = start_of_week + timedelta(days=day_offset)
        # Ajusta o índice para que Domingo seja 0, Segunda 1, etc.
        day_index = (current_day_local.weekday() + 1) % 7
        count = sum(1 for log_time in local_study_log_times if log_time.date() == current_day_local)
        weekly_activity[day_index] = count

    # 3. CÁLCULO DE COBERTURA DE ESTUDO ("Precisão Geral")
    total_flashcards = crud.get_total_flashcards_count_for_user(session, user_id=current_user.id)
    unique_studied_count = crud.get_unique_studied_flashcards_count_for_user(session, user_id=current_user.id)

    if total_flashcards == 0:
        general_accuracy = 0.0
    else:
        # A métrica é a percentagem de flashcards únicos estudados do total
        general_accuracy = unique_studied_count / total_flashcards

    # 4. CÁLCULO DE SEQUÊNCIA (STREAK) (baseado no horário local)
    streak_days = 0
    if local_study_log_times:
        # Pega todas as datas únicas de estudo no horário local e ordena da mais recente para a mais antiga
        study_dates = sorted(list(set(log_time.date() for log_time in local_study_log_times)), reverse=True)
        user_today_date = user_now.date()
        
        # A sequência só conta se o último estudo foi hoje ou ontem
        if study_dates[0] == user_today_date or study_dates[0] == user_today_date - timedelta(days=1):
            streak_days = 1
            # Verifica os dias consecutivos
            for i in range(len(study_dates) - 1):
                if (study_dates[i] - study_dates[i+1]).days == 1:
                    streak_days += 1
                else:
                    # Se a diferença for maior que 1, a sequência quebrou
                    break
        else:
            streak_days = 0

    return ProgressStats(
        cards_studied_week=cards_studied_week,
        streak_days=streak_days,
        general_accuracy=general_accuracy,
        weekly_activity=weekly_activity,
    )