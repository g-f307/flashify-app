# back/app/routers/progress.py

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from typing_extensions import Annotated
from pydantic import BaseModel
import calendar
from typing import Any, Literal, List, Optional
import math
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


WEEKDAY_LABELS_SUNDAY_FIRST = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]


class ProgressTrend(BaseModel):
    direction: Literal["up", "down", "stable", "new"]
    value: Optional[float] = None
    unit: Optional[Literal["percent", "percentage_points"]] = None
    label: str


class ProgressMetric(BaseModel):
    value: Optional[float] = None
    trend: ProgressTrend
    series: List[Optional[float]]


class GuidedProgressMetric(ProgressMetric):
    active_path_id: Optional[str] = None
    active_path_name: Optional[str] = None
    active_path_document_id: Optional[int] = None


class ProgressPeriod(BaseModel):
    start: str
    end: str
    timezone: str


class MotivationCard(BaseModel):
    type: str
    title: str
    message: str
    illustration: str


class ProgressSummaryResponse(BaseModel):
    flashcards: ProgressMetric
    quizzes: ProgressMetric
    guided: GuidedProgressMetric
    performance: ProgressMetric


class ProgressDailyActivity(BaseModel):
    date: str
    label: str
    flashcards: int
    quizInteractions: int
    guidedSteps: int
    total: int


class ProgressInsight(BaseModel):
    type: str
    text: str


class RankingEntry(BaseModel):
    rank: int
    display_name: str
    avatar_url: Optional[str] = None
    points: int
    is_current_user: bool


class RankingResponse(BaseModel):
    entries: List[RankingEntry]
    current_user_rank: Optional[int] = None
    updated_at: str
    total_participants: int = 0


class GuidedPathRecommendation(BaseModel):
    document_id: int
    title: str
    progress: int
    progress_label: str
    action_url: str
    action_label: str
    step_label: str


class QuizRecommendation(BaseModel):
    document_id: int
    title: str
    question_count: int
    difficulty_label: str
    reason: str
    action_url: str
    action_label: str


class ReviewRecommendation(BaseModel):
    document_id: Optional[int] = None
    title: str
    due_count: int
    subtitle: str
    action_url: Optional[str] = None
    action_label: str


class ProgressRecommendations(BaseModel):
    guided_path: Optional[GuidedPathRecommendation] = None
    quiz: Optional[QuizRecommendation] = None
    review: ReviewRecommendation


class ProgressOverviewResponse(BaseModel):
    period: ProgressPeriod
    motivation: MotivationCard
    summary: ProgressSummaryResponse
    activity: List[ProgressDailyActivity]
    insight: ProgressInsight
    ranking: RankingResponse
    recommendations: ProgressRecommendations


class ProgressRankingPageResponse(BaseModel):
    entries: List[RankingEntry]
    current_user_rank: Optional[int] = None
    updated_at: str
    total_participants: int
    limit: int
    offset: int


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

    guided_times = session.exec(
        select(models.GuidedStudySession.last_accessed_at)
        .where(models.GuidedStudySession.user_id == current_user.id)
    ).all()

    activity_dates = {
        (studied_at + user_timezone_delta).date()
        for studied_at in study_times
    }
    activity_dates.update(
        (completed_at + user_timezone_delta).date()
        for completed_at in quiz_times
    )
    activity_dates.update(
        (last_accessed_at + user_timezone_delta).date()
        for last_accessed_at in guided_times
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


def _resolve_timezone(timezone_name: Optional[str]) -> ZoneInfo:
    if not timezone_name:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(timezone_name)
    except Exception:
        return ZoneInfo("UTC")


def _to_local(dt: datetime, client_tz: ZoneInfo) -> datetime:
    aware = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return aware.astimezone(client_tz)


def _start_of_week_sunday(local_now: datetime) -> datetime:
    day_shift = (local_now.weekday() + 1) % 7
    start = local_now - timedelta(days=day_shift)
    return start.replace(hour=0, minute=0, second=0, microsecond=0)


def _date_iter(start_date: date, total_days: int) -> list[date]:
    return [start_date + timedelta(days=offset) for offset in range(total_days)]


def _round_or_none(value: Optional[float], digits: int = 1) -> Optional[float]:
    if value is None:
        return None
    return round(value, digits)


def _safe_percent(numerator: float, denominator: float) -> Optional[float]:
    if denominator <= 0:
        return None
    return (numerator / denominator) * 100.0


def _build_volume_trend(current: int, previous: int) -> ProgressTrend:
    if current <= 0 and previous <= 0:
        return ProgressTrend(direction="stable", value=None, unit=None, label="Sem atividade")
    if previous <= 0 < current:
        return ProgressTrend(direction="new", value=None, unit=None, label="Novo nesta semana")

    delta_percent = ((current - previous) / previous) * 100 if previous else 0.0
    rounded = round(abs(delta_percent))

    if rounded == 0:
        return ProgressTrend(direction="stable", value=0, unit="percent", label="0% vs semana passada")

    direction: Literal["up", "down", "stable", "new"] = "up" if delta_percent > 0 else "down"
    sign = "+" if delta_percent > 0 else "-"
    return ProgressTrend(
        direction=direction,
        value=round(delta_percent, 1),
        unit="percent",
        label=f"{sign}{rounded}% vs semana passada",
    )


def _build_delta_trend(delta: Optional[float], label_suffix: str) -> ProgressTrend:
    if delta is None:
        return ProgressTrend(direction="stable", value=None, unit=None, label="Sem base comparativa")

    rounded = round(delta, 1)
    abs_value = abs(rounded)
    if abs_value < 0.1:
        return ProgressTrend(direction="stable", value=0, unit="percentage_points", label=f"0 p.p. {label_suffix}")

    direction: Literal["up", "down", "stable", "new"] = "up" if rounded > 0 else "down"
    sign = "+" if rounded > 0 else "-"
    label_value = int(round(abs_value)) if abs(abs_value - round(abs_value)) < 0.05 else abs_value
    return ProgressTrend(
        direction=direction,
        value=rounded,
        unit="percentage_points",
        label=f"{sign}{label_value} p.p. {label_suffix}",
    )


def _abbreviate_display_name(name: str) -> str:
    parts = [part for part in name.split() if part]
    if not parts:
        return "Usuario"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


def _guided_total_steps_from_document(document: Optional[models.Document]) -> int:
    if not document or not document.guided_study_cache:
        return 0
    summary = (document.guided_study_cache or {}).get("summary") or {}
    try:
        return int(summary.get("steps_count") or 0)
    except Exception:
        return 0


def _document_display_title(document: models.Document) -> str:
    return document.title or document.file_path


def _difficulty_label_from_score(score: Optional[float]) -> str:
    if score is None:
        return "Nível Intermediário"
    if score < 50:
        return "Nível Essencial"
    if score < 80:
        return "Nível Intermediário"
    return "Nível Avançado"


def _build_weekly_ranking(
    session: Session,
    period_start_local: datetime,
    period_end_local: datetime,
    client_tz: ZoneInfo,
    current_user_id: int,
    limit: Optional[int] = None,
    offset: int = 0,
) -> ProgressRankingPageResponse:
    period_start_utc = period_start_local.astimezone(timezone.utc)
    period_end_utc = (period_end_local + timedelta(days=1)).astimezone(timezone.utc)

    participant_rows = session.exec(
        select(models.User.id, models.User.username, models.User.profile_picture_url, models.User.created_at).where(
            models.User.is_active == True,  # noqa: E712
            models.User.is_team == False,  # noqa: E712
            models.User.is_test_user == False,  # noqa: E712
            models.User.is_blocked == False,  # noqa: E712
        )
    ).all()

    participants: dict[int, dict[str, Any]] = {
        user_id: {
            "username": username,
            "avatar_url": avatar_url,
            "created_at": created_at,
        }
        for user_id, username, avatar_url, created_at in participant_rows
    }

    if current_user_id not in participants:
        current_user = session.get(models.User, current_user_id)
        if current_user:
            participants[current_user.id] = {
                "username": current_user.username,
                "avatar_url": current_user.profile_picture_url,
                "created_at": current_user.created_at,
            }

    if not participants:
        return ProgressRankingPageResponse(
            entries=[],
            current_user_rank=None,
            updated_at=datetime.now(timezone.utc).isoformat(),
            total_participants=0,
            limit=limit or 0,
            offset=offset,
        )

    participant_ids = tuple(participants.keys())
    score_board: dict[int, dict[str, Any]] = {
        user_id: {
            "active_days": 0,
            "flashcard_reviews": 0,
            "quiz_answers": 0,
            "guided_steps": 0,
            "guided_progress_ratio": 0.0,
            "guided_completions": 0,
            "graded_correct": 0.0,
            "graded_total": 0.0,
        }
        for user_id in participant_ids
    }

    active_rows = session.exec(
        select(models.UserActivityDay).where(
            models.UserActivityDay.user_id.in_(participant_ids),
            models.UserActivityDay.activity_date >= period_start_local.date(),
            models.UserActivityDay.activity_date <= period_end_local.date(),
        )
    ).all()
    for row in active_rows:
        active = (
            (row.study_count + row.quiz_count + row.guided_study_count) >= 5
            or row.estimated_study_minutes >= 5
            or row.quiz_count > 0
            or row.guided_study_count > 0
        )
        if active:
            score_board[row.user_id]["active_days"] += 1
        score_board[row.user_id]["flashcard_reviews"] += int(row.study_count or 0)

    study_rows = session.exec(
        select(models.StudyLog.user_id, models.StudyLog.accuracy).where(
            models.StudyLog.user_id.in_(participant_ids),
            models.StudyLog.studied_at >= period_start_utc,
            models.StudyLog.studied_at < period_end_utc,
        )
    ).all()
    for user_id, accuracy in study_rows:
        score_board[user_id]["graded_total"] += 1
        score_board[user_id]["graded_correct"] += float(accuracy or 0.0)

    quiz_rows = session.exec(
        select(
            models.QuizAttempt.user_id,
            models.QuizAttempt.correct_answers,
            models.QuizAttempt.total_questions,
        ).where(
            models.QuizAttempt.user_id.in_(participant_ids),
            models.QuizAttempt.completed_at >= period_start_utc,
            models.QuizAttempt.completed_at < period_end_utc,
        )
    ).all()
    for user_id, correct_answers, total_questions in quiz_rows:
        score_board[user_id]["quiz_answers"] += int(total_questions or 0)
        score_board[user_id]["graded_total"] += float(total_questions or 0)
        score_board[user_id]["graded_correct"] += float(correct_answers or 0)

    guided_completion_rows = session.exec(
        select(models.GuidedStudySession.user_id, func.count()).where(
            models.GuidedStudySession.user_id.in_(participant_ids),
            models.GuidedStudySession.completed_at.is_not(None),
            models.GuidedStudySession.completed_at >= period_start_utc,
            models.GuidedStudySession.completed_at < period_end_utc,
        ).group_by(models.GuidedStudySession.user_id)
    ).all()
    for user_id, completed_count in guided_completion_rows:
        score_board[user_id]["guided_completions"] = int(completed_count or 0)

    guided_event_rows = session.exec(
        select(
            models.ProductEvent.user_id,
            models.ProductEvent.document_id,
            func.count(),
        ).where(
            models.ProductEvent.user_id.in_(participant_ids),
            models.ProductEvent.event_name == "guided_step_completed",
            models.ProductEvent.document_id.is_not(None),
            models.ProductEvent.occurred_at >= period_start_utc,
            models.ProductEvent.occurred_at < period_end_utc,
        ).group_by(models.ProductEvent.user_id, models.ProductEvent.document_id)
    ).all()

    guided_document_ids = {document_id for _, document_id, _ in guided_event_rows if document_id}
    guided_documents = (
        session.exec(
            select(models.Document).where(models.Document.id.in_(tuple(guided_document_ids)))
        ).all()
        if guided_document_ids
        else []
    )
    guided_totals = {
        document.id: _guided_total_steps_from_document(document)
        for document in guided_documents
        if document.id is not None
    }

    for user_id, document_id, event_count in guided_event_rows:
        count = int(event_count or 0)
        score_board[user_id]["guided_steps"] += count
        total_steps = guided_totals.get(int(document_id or 0)) or 0
        if total_steps > 0:
            score_board[user_id]["guided_progress_ratio"] += min(count / total_steps, 1.0)

    ranked_rows: list[tuple[int, int, float, float, float, datetime]] = []
    for user_id, stats in score_board.items():
        active_days = int(stats["active_days"])
        graded_total = float(stats["graded_total"])
        graded_correct = float(stats["graded_correct"])
        flashcard_reviews = int(stats["flashcard_reviews"])
        quiz_answers = int(stats["quiz_answers"])
        guided_steps = int(stats["guided_steps"])
        guided_progress_ratio = min(float(stats["guided_progress_ratio"]), 1.0)
        guided_completions = int(stats["guided_completions"])

        consistency_score = (active_days / 7.0) * 700.0

        accuracy = _safe_percent(graded_correct, graded_total) or 0.0
        confidence = min(graded_total / 20.0, 1.0) if graded_total > 0 else 0.0
        performance_score = (accuracy / 100.0) * 800.0 * confidence

        activity_points = flashcard_reviews + quiz_answers + guided_steps
        engagement_score = min(activity_points / 300.0, 1.0) * 600.0

        guided_progress_score = guided_progress_ratio * 200.0
        guided_completion_score = min(guided_completions / 2.0, 1.0) * 200.0
        guided_score = guided_progress_score + guided_completion_score

        weekly_score = int(round(consistency_score + performance_score + engagement_score + guided_score))
        created_at = participants[user_id]["created_at"] or datetime.now(timezone.utc)
        ranked_rows.append(
            (
                user_id,
                weekly_score,
                round(consistency_score, 4),
                round(performance_score, 4),
                round(guided_score, 4),
                created_at,
            )
        )

    ranked_rows.sort(
        key=lambda item: (
            -item[1],
            -item[2],
            -item[3],
            -item[4],
            item[5],
            item[0],
        )
    )

    current_user_rank: Optional[int] = None
    ranking_entries: list[RankingEntry] = []
    for index, (user_id, points, _, _, _, _) in enumerate(ranked_rows, start=1):
        if user_id == current_user_id:
            current_user_rank = index

        ranking_entries.append(
            RankingEntry(
                rank=index,
                display_name=_abbreviate_display_name(str(participants[user_id]["username"])),
                avatar_url=participants[user_id]["avatar_url"],
                points=points,
                is_current_user=user_id == current_user_id,
            )
        )

    paged_entries = ranking_entries[offset : offset + limit] if limit is not None else ranking_entries[offset:]

    return ProgressRankingPageResponse(
        entries=paged_entries,
        current_user_rank=current_user_rank,
        updated_at=datetime.now(timezone.utc).isoformat(),
        total_participants=len(ranking_entries),
        limit=limit or len(paged_entries),
        offset=offset,
    )


def _longest_streak(activity_dates: set[date]) -> int:
    if not activity_dates:
        return 0

    longest = 0
    current = 0
    previous_day: Optional[date] = None
    for activity_day in sorted(activity_dates):
        if previous_day and (activity_day - previous_day).days == 1:
            current += 1
        else:
            current = 1
        longest = max(longest, current)
        previous_day = activity_day
    return longest


def _preview_ranking(ranking_page: ProgressRankingPageResponse) -> RankingResponse:
    entries = ranking_page.entries
    current_rank = ranking_page.current_user_rank
    if current_rank and current_rank > 5:
        current_entry = next((entry for entry in entries if entry.is_current_user), None)
        top_four = entries[:4]
        entries = top_four + ([current_entry] if current_entry else [])
    else:
        entries = entries[:5]

    return RankingResponse(
        entries=entries,
        current_user_rank=current_rank,
        updated_at=ranking_page.updated_at,
        total_participants=ranking_page.total_participants,
    )


def _build_progress_overview(
    session: Session,
    current_user: CurrentUser,
    client_tz: ZoneInfo,
) -> ProgressOverviewResponse:
    local_now = datetime.now(timezone.utc).astimezone(client_tz)
    today_local = local_now.date()
    current_week_start = _start_of_week_sunday(local_now)
    previous_week_start = current_week_start - timedelta(days=7)
    next_week_start = current_week_start + timedelta(days=7)
    all_dates = _date_iter(previous_week_start.date(), 14)
    daily: dict[date, dict[str, float]] = {
        day: {
            "flashcards": 0,
            "quiz_completions": 0,
            "quiz_interactions": 0,
            "guided_steps": 0,
            "guided_sessions": 0,
            "graded_correct": 0.0,
            "graded_total": 0.0,
        }
        for day in all_dates
    }

    window_start_utc = previous_week_start.astimezone(timezone.utc)
    window_end_utc = next_week_start.astimezone(timezone.utc)

    documents = crud.get_documents_by_user(session, current_user.id)
    documents_by_id = {document.id: document for document in documents if document.id is not None}
    eligible_guided_documents = [
        document
        for document in documents
        if document.status == models.DocumentStatus.COMPLETED
        and bool(document.flashcards)
        and bool(document.quiz and document.quiz.questions)
    ]

    study_rows = session.exec(
        select(models.StudyLog.studied_at, models.StudyLog.accuracy, models.Flashcard.document_id)
        .join(models.Flashcard, models.Flashcard.id == models.StudyLog.flashcard_id)
        .where(
            models.StudyLog.user_id == current_user.id,
            models.StudyLog.studied_at >= window_start_utc,
            models.StudyLog.studied_at < window_end_utc,
        )
    ).all()
    recent_flashcard_counts_by_doc: dict[int, int] = defaultdict(int)
    for studied_at, accuracy, document_id in study_rows:
        local_date = _to_local(studied_at, client_tz).date()
        if local_date not in daily:
            continue
        daily[local_date]["flashcards"] += 1
        daily[local_date]["graded_total"] += 1
        daily[local_date]["graded_correct"] += float(accuracy or 0.0)
        if local_date >= current_week_start.date():
            recent_flashcard_counts_by_doc[int(document_id)] += 1

    quiz_rows = session.exec(
        select(
            models.QuizAttempt.completed_at,
            models.QuizAttempt.correct_answers,
            models.QuizAttempt.total_questions,
            models.QuizAttempt.score,
            models.Quiz.document_id,
        )
        .join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
        .where(
            models.QuizAttempt.user_id == current_user.id,
            models.QuizAttempt.completed_at >= window_start_utc,
            models.QuizAttempt.completed_at < window_end_utc,
        )
    ).all()
    latest_quiz_attempt_by_doc: dict[int, dict[str, Any]] = {}
    for completed_at, correct_answers, total_questions, score, document_id in quiz_rows:
        local_date = _to_local(completed_at, client_tz).date()
        if local_date in daily:
            daily[local_date]["quiz_completions"] += 1
            daily[local_date]["quiz_interactions"] += int(total_questions or 0)
            daily[local_date]["graded_total"] += float(total_questions or 0)
            daily[local_date]["graded_correct"] += float(correct_answers or 0)

        doc_id = int(document_id)
        stored = latest_quiz_attempt_by_doc.get(doc_id)
        if stored is None or completed_at > stored["completed_at"]:
            latest_quiz_attempt_by_doc[doc_id] = {
                "completed_at": completed_at,
                "score": float(score or 0.0),
                "total_questions": int(total_questions or 0),
            }

    guided_sessions = session.exec(
        select(models.GuidedStudySession)
        .where(models.GuidedStudySession.user_id == current_user.id)
        .order_by(models.GuidedStudySession.last_accessed_at.desc())
    ).all()
    for guided_session in guided_sessions:
        local_date = _to_local(guided_session.started_at, client_tz).date()
        if local_date in daily:
            daily[local_date]["guided_sessions"] += 1

    guided_step_events = session.exec(
        select(models.ProductEvent.occurred_at, models.ProductEvent.document_id)
        .where(
            models.ProductEvent.user_id == current_user.id,
            models.ProductEvent.event_name == "guided_step_completed",
            models.ProductEvent.document_id.is_not(None),
            models.ProductEvent.occurred_at >= window_start_utc,
            models.ProductEvent.occurred_at < window_end_utc,
        )
    ).all()
    guided_steps_by_doc_week: dict[int, int] = defaultdict(int)
    for occurred_at, document_id in guided_step_events:
        local_date = _to_local(occurred_at, client_tz).date()
        if local_date not in daily:
            continue
        daily[local_date]["guided_steps"] += 1
        if local_date >= current_week_start.date():
            guided_steps_by_doc_week[int(document_id)] += 1

    has_guided_step_data = any(day["guided_steps"] > 0 for day in daily.values())

    current_week_dates = _date_iter(current_week_start.date(), 7)
    previous_week_dates = _date_iter(previous_week_start.date(), 7)

    def sum_metric(day_list: list[date], key: str) -> int:
        return int(sum(daily[day][key] for day in day_list))

    current_flashcards = sum_metric(current_week_dates, "flashcards")
    previous_flashcards = sum_metric(previous_week_dates, "flashcards")
    current_quiz_completions = sum_metric(current_week_dates, "quiz_completions")
    previous_quiz_completions = sum_metric(previous_week_dates, "quiz_completions")

    def aggregate_accuracy(day_list: list[date]) -> tuple[Optional[float], float]:
        graded_total = sum(daily[day]["graded_total"] for day in day_list)
        graded_correct = sum(daily[day]["graded_correct"] for day in day_list)
        if graded_total < 5:
            return None, graded_total
        return _round_or_none(_safe_percent(graded_correct, graded_total), 1), graded_total

    current_accuracy, current_graded_total = aggregate_accuracy(current_week_dates)
    previous_accuracy, previous_graded_total = aggregate_accuracy(previous_week_dates)
    accuracy_delta = (
        (current_accuracy - previous_accuracy)
        if current_accuracy is not None and previous_accuracy is not None
        else None
    )

    performance_series = [
        _round_or_none(_safe_percent(daily[day]["graded_correct"], daily[day]["graded_total"]), 1)
        if daily[day]["graded_total"] > 0
        else None
        for day in current_week_dates
    ]

    active_guided_session = guided_sessions[0] if guided_sessions else None
    active_guided_document = (
        documents_by_id.get(active_guided_session.document_id) if active_guided_session else None
    )
    if active_guided_document is None and eligible_guided_documents:
        active_guided_document = eligible_guided_documents[0]

    active_guided_total_steps = _guided_total_steps_from_document(active_guided_document)
    active_guided_completed_steps = (
        len(active_guided_session.completed_step_ids or []) if active_guided_session else 0
    )
    active_guided_progress = (
        int(round((active_guided_completed_steps / active_guided_total_steps) * 100))
        if active_guided_total_steps > 0
        else 0
    )
    guided_delta_pp = (
        round((guided_steps_by_doc_week.get(active_guided_document.id or 0, 0) / active_guided_total_steps) * 100, 1)
        if active_guided_document and active_guided_total_steps > 0
        else None
    )

    activity_rows: list[ProgressDailyActivity] = []
    for local_date in current_week_dates:
        guided_value = int(daily[local_date]["guided_steps"] if has_guided_step_data else daily[local_date]["guided_sessions"])
        flashcards_value = int(daily[local_date]["flashcards"])
        quiz_interactions_value = int(daily[local_date]["quiz_interactions"])
        total_value = flashcards_value + quiz_interactions_value + guided_value
        activity_rows.append(
            ProgressDailyActivity(
                date=local_date.isoformat(),
                label=WEEKDAY_LABELS_SUNDAY_FIRST[(local_date.weekday() + 1) % 7],
                flashcards=flashcards_value,
                quizInteractions=quiz_interactions_value,
                guidedSteps=guided_value,
                total=total_value,
            )
        )

    ranking_page = _build_weekly_ranking(
        session=session,
        period_start_local=current_week_start,
        period_end_local=current_week_start + timedelta(days=6, hours=23, minutes=59, seconds=59),
        client_tz=client_tz,
        current_user_id=current_user.id,
        limit=None,
        offset=0,
    )
    ranking_preview = _preview_ranking(ranking_page)

    activity_dates = {
        _to_local(studied_at, client_tz).date()
        for studied_at, _, _ in session.exec(
            select(models.StudyLog.studied_at, models.StudyLog.accuracy, models.Flashcard.document_id)
            .join(models.Flashcard, models.Flashcard.id == models.StudyLog.flashcard_id)
            .where(models.StudyLog.user_id == current_user.id)
        ).all()
    }
    activity_dates.update(
        _to_local(completed_at, client_tz).date()
        for completed_at in session.exec(
            select(models.QuizAttempt.completed_at).where(models.QuizAttempt.user_id == current_user.id)
        ).all()
    )
    activity_dates.update(
        _to_local(last_accessed_at, client_tz).date()
        for last_accessed_at in session.exec(
            select(models.GuidedStudySession.last_accessed_at).where(
                models.GuidedStudySession.user_id == current_user.id
            )
        ).all()
    )
    current_streak = _calculate_current_streak(activity_dates, today_local)
    longest_streak = _longest_streak(activity_dates)

    recent_activity_rows = session.exec(
        select(models.UserActivityDay).where(
            models.UserActivityDay.user_id == current_user.id,
            models.UserActivityDay.activity_date >= (current_week_start.date() - timedelta(days=28)),
            models.UserActivityDay.activity_date <= current_week_start.date() + timedelta(days=6),
        )
    ).all()
    weekly_interactions_map: dict[date, int] = defaultdict(int)
    for row in recent_activity_rows:
        week_start = row.activity_date - timedelta(days=(row.activity_date.weekday() + 1) % 7)
        weekly_interactions_map[week_start] += int(row.study_count or 0) + int(row.quiz_count or 0) + int(row.guided_study_count or 0)

    current_week_total_interactions = sum(day.total for day in activity_rows)
    previous_four_weeks = [
        weekly_interactions_map.get((current_week_start.date() - timedelta(days=7 * index)), 0)
        for index in range(1, 5)
    ]
    four_week_average = (
        sum(previous_four_weeks) / len(previous_four_weeks)
        if any(previous_four_weeks)
        else 0
    )

    today_row = next((row for row in activity_rows if row.date == today_local.isoformat()), None)
    today_has_activity = bool(today_row and today_row.total > 0)

    if current_week_total_interactions == 0:
        motivation = MotivationCard(
            type="start_journey",
            title="Comece sua jornada",
            message="Sua evolução aparecerá aqui conforme você estudar.",
            illustration="flashinho_progresso",
        )
    elif current_streak > 0 and not today_has_activity:
        motivation = MotivationCard(
            type="protect_streak",
            title="Não perca sua sequência",
            message="Faça uma atividade hoje para manter seus dias consecutivos.",
            illustration="flashinho_progresso",
        )
    elif (
        active_guided_session
        and active_guided_session.completed_at is None
        and (_to_local(active_guided_session.last_accessed_at, client_tz).date() <= today_local - timedelta(days=3))
    ):
        motivation = MotivationCard(
            type="resume_guided_path",
            title="Retome sua trilha",
            message="Falta pouco para avançar no estudo guiado.",
            illustration="flashinho_progresso",
        )
    elif current_accuracy is not None and previous_accuracy is not None and current_accuracy <= previous_accuracy - 5:
        motivation = MotivationCard(
            type="performance_drop",
            title="Ajuste fino no ritmo",
            message="Seu desempenho caiu nesta semana. Uma revisão curta pode recolocar tudo no eixo.",
            illustration="flashinho_progresso",
        )
    elif current_streak >= 3 and current_streak >= longest_streak:
        motivation = MotivationCard(
            type="new_streak_record",
            title="Novo recorde!",
            message="Esta é sua maior sequência de estudos até agora.",
            illustration="flashinho_progresso",
        )
    elif four_week_average > 0 and current_week_total_interactions >= four_week_average * 1.05:
        motivation = MotivationCard(
            type="above_four_week_average",
            title="Continue assim!",
            message="Você está acima da sua média das últimas 4 semanas.",
            illustration="flashinho_progresso",
        )
    elif sum(1 for row in activity_rows if row.total > 0) >= 4:
        motivation = MotivationCard(
            type="good_consistency",
            title="Boa consistência!",
            message="Seu ritmo de estudo nesta semana está bem distribuído.",
            illustration="flashinho_progresso",
        )
    else:
        motivation = MotivationCard(
            type="keep_going",
            title="Cada sessão conta",
            message="Seu progresso cresce melhor quando você mantém uma rotina leve e constante.",
            illustration="flashinho_progresso",
        )

    total_activity = sum(row.total for row in activity_rows)
    best_day = max(activity_rows, key=lambda item: item.total) if activity_rows else None
    average_day = total_activity / len(activity_rows) if activity_rows else 0
    guided_weekly_total = sum(row.guidedSteps for row in activity_rows)
    flashcards_weekly_total = sum(row.flashcards for row in activity_rows)
    quiz_weekly_total = sum(row.quizInteractions for row in activity_rows)

    if total_activity == 0:
        insight = ProgressInsight(
            type="no_activity",
            text="Comece com uma pequena sessão para criar ritmo nesta semana.",
        )
    elif best_day and average_day > 0 and best_day.total >= average_day * 1.4:
        insight = ProgressInsight(
            type="best_day",
            text=f"Você foi mais consistente na {best_day.label.lower()}! Que tal repetir essa energia amanhã?",
        )
    elif guided_delta_pp is not None and guided_delta_pp >= 20:
        insight = ProgressInsight(
            type="guided_progress",
            text="Seu maior avanço veio do estudo guiado. Continue a trilha enquanto o conteúdo ainda está fresco.",
        )
    elif current_accuracy is not None and current_accuracy >= 85 and current_graded_total >= 20:
        insight = ProgressInsight(
            type="high_accuracy",
            text="Seu desempenho está excelente. Um novo quiz pode ajudar a validar o que você aprendeu.",
        )
    elif flashcards_weekly_total >= quiz_weekly_total and flashcards_weekly_total >= guided_weekly_total:
        insight = ProgressInsight(
            type="flashcards_focus",
            text="Flashcards lideraram sua semana. Aproveite o embalo e feche o ciclo com um quiz curto.",
        )
    elif quiz_weekly_total >= guided_weekly_total:
        insight = ProgressInsight(
            type="quiz_focus",
            text="Você testou bastante seu conhecimento. Uma revisão inteligente pode reforçar os pontos mais sensíveis.",
        )
    else:
        insight = ProgressInsight(
            type="guided_focus",
            text="Seu estudo guiado puxou a semana para frente. Mantenha a trilha ativa para consolidar o conteúdo.",
        )

    guided_recommendation: Optional[GuidedPathRecommendation] = None
    if active_guided_document:
        guided_recommendation = GuidedPathRecommendation(
            document_id=int(active_guided_document.id),
            title=_document_display_title(active_guided_document),
            progress=active_guided_progress,
            progress_label=f"{active_guided_progress}% concluído" if active_guided_total_steps > 0 else "Pronto para iniciar",
            action_url=f"/guided/{active_guided_document.id}",
            action_label="Continuar" if active_guided_progress > 0 else "Iniciar",
            step_label="Sua trilha em andamento" if active_guided_progress > 0 else "Comece sua trilha guiada",
        )

    quiz_recommendation: Optional[QuizRecommendation] = None
    best_quiz_candidate: Optional[tuple[float, models.Document, str, Optional[float]]] = None
    for document in documents:
        if document.status != models.DocumentStatus.COMPLETED or not document.quiz or not document.quiz.questions:
            continue

        latest_attempt = latest_quiz_attempt_by_doc.get(int(document.id))
        recent_flashcard_weight = min(recent_flashcard_counts_by_doc.get(int(document.id), 0) / 20.0, 1.0)
        no_recent_attempt_weight = 1.0
        low_mastery_weight = 0.5
        difficulty_fit_weight = 0.6
        reason = "Bom momento para validar o que você revisou."

        if latest_attempt:
            days_since_attempt = (_to_local(latest_attempt["completed_at"], client_tz).date() - today_local).days
            days_since_attempt = abs(days_since_attempt)
            no_recent_attempt_weight = 1.0 if days_since_attempt >= 3 else 0.2
            score = latest_attempt["score"]
            if score < 60:
                low_mastery_weight = 1.0
                reason = "Este quiz cobre um tópico que ainda precisa de reforço."
            elif score < 80:
                low_mastery_weight = 0.7
                reason = "Você está perto de consolidar este conteúdo."
            else:
                low_mastery_weight = 0.35
                reason = "Uma nova tentativa pode manter seu domínio afiado."
            difficulty_fit_weight = 0.85 if 50 <= score <= 85 else 0.55
        else:
            reason = "Você ainda não concluiu este quiz recentemente."

        relevance = (
            low_mastery_weight * 0.40
            + recent_flashcard_weight * 0.25
            + no_recent_attempt_weight * 0.20
            + difficulty_fit_weight * 0.15
        )
        latest_score = latest_attempt["score"] if latest_attempt else None
        if best_quiz_candidate is None or relevance > best_quiz_candidate[0]:
            best_quiz_candidate = (relevance, document, reason, latest_score)

    if best_quiz_candidate is not None:
        _, quiz_document, quiz_reason, latest_score = best_quiz_candidate
        quiz_recommendation = QuizRecommendation(
            document_id=int(quiz_document.id),
            title=f"{_document_display_title(quiz_document)} - Questões",
            question_count=len(quiz_document.quiz.questions) if quiz_document.quiz else 0,
            difficulty_label=_difficulty_label_from_score(latest_score),
            reason=quiz_reason,
            action_url=f"/quiz/{quiz_document.id}",
            action_label="Iniciar",
        )

    due_review_rows = session.exec(
        select(models.Flashcard.document_id, func.count())
        .join(models.Document, models.Document.id == models.Flashcard.document_id)
        .where(
            models.Document.user_id == current_user.id,
            models.Document.srs_enabled == True,  # noqa: E712
            models.Flashcard.next_review.is_not(None),
            models.Flashcard.next_review <= datetime.now(timezone.utc),
        )
        .group_by(models.Flashcard.document_id)
        .order_by(func.count().desc())
    ).all()
    review_recommendation: ReviewRecommendation
    if due_review_rows:
        review_document_id, review_due_count = due_review_rows[0]
        review_recommendation = ReviewRecommendation(
            document_id=int(review_document_id),
            title=f"{int(review_due_count)} cards para revisar hoje",
            due_count=int(review_due_count),
            subtitle="Reforce o que mais importa",
            action_url=f"/study/{int(review_document_id)}?mode=review",
            action_label="Revisar agora",
        )
    else:
        review_recommendation = ReviewRecommendation(
            document_id=None,
            title="Revisão em dia",
            due_count=0,
            subtitle="Você pode explorar novos decks ou praticar um quiz agora.",
            action_url="/library",
            action_label="Abrir biblioteca",
        )

    guided_series = [
        float(daily[day]["guided_steps"] if has_guided_step_data else daily[day]["guided_sessions"])
        for day in current_week_dates
    ]

    return ProgressOverviewResponse(
        period=ProgressPeriod(
            start=current_week_start.isoformat(),
            end=(current_week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)).isoformat(),
            timezone=str(client_tz.key),
        ),
        motivation=motivation,
        summary=ProgressSummaryResponse(
            flashcards=ProgressMetric(
                value=float(current_flashcards),
                trend=_build_volume_trend(current_flashcards, previous_flashcards),
                series=[float(daily[day]["flashcards"]) for day in current_week_dates],
            ),
            quizzes=ProgressMetric(
                value=float(current_quiz_completions),
                trend=_build_volume_trend(current_quiz_completions, previous_quiz_completions),
                series=[float(daily[day]["quiz_completions"]) for day in current_week_dates],
            ),
            guided=GuidedProgressMetric(
                value=float(active_guided_progress),
                trend=_build_delta_trend(guided_delta_pp, "nesta semana"),
                series=guided_series,
                active_path_id=str(active_guided_document.id) if active_guided_document else None,
                active_path_name=_document_display_title(active_guided_document) if active_guided_document else None,
                active_path_document_id=int(active_guided_document.id) if active_guided_document else None,
            ),
            performance=ProgressMetric(
                value=current_accuracy,
                trend=_build_delta_trend(accuracy_delta, "vs semana passada"),
                series=performance_series,
            ),
        ),
        activity=activity_rows,
        insight=insight,
        ranking=ranking_preview,
        recommendations=ProgressRecommendations(
            guided_path=guided_recommendation,
            quiz=quiz_recommendation,
            review=review_recommendation,
        ),
    )


@router.get("/overview", response_model=ProgressOverviewResponse)
def get_progress_overview(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    timezone_name: str = Query("UTC"),
):
    client_tz = _resolve_timezone(timezone_name)
    return _build_progress_overview(session=session, current_user=current_user, client_tz=client_tz)


@router.get("/ranking", response_model=ProgressRankingPageResponse)
def get_progress_ranking(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
    timezone_name: str = Query("UTC"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    client_tz = _resolve_timezone(timezone_name)
    local_now = datetime.now(timezone.utc).astimezone(client_tz)
    current_week_start = _start_of_week_sunday(local_now)
    ranking_page = _build_weekly_ranking(
        session=session,
        period_start_local=current_week_start,
        period_end_local=current_week_start + timedelta(days=6, hours=23, minutes=59, seconds=59),
        client_tz=client_tz,
        current_user_id=current_user.id,
        limit=limit,
        offset=offset,
    )
    return ranking_page

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
