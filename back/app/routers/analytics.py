from datetime import date, datetime, timedelta, timezone
from statistics import median
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from .. import analytics as analytics_service, models, security
from ..database import get_session

router = APIRouter(prefix="/analytics", tags=["Analytics"])
CurrentTeamUser = Annotated[models.User, Depends(security.get_current_team_user)]


class AnalyticsOverview(BaseModel):
    total_users: int
    new_users_7d: int
    active_users_7d: int
    activated_users_7d: int
    users_with_decks: int
    users_who_studied: int
    users_who_completed_quiz: int
    decks_created_7d: int
    decks_completed_7d: int


class FunnelStep(BaseModel):
    key: str
    label: str
    users: int
    conversion_from_previous: float | None = None
    conversion_from_start: float | None = None


class AnalyticsFunnel(BaseModel):
    cohort_users: int
    steps: list[FunnelStep]


class AnalyticsRetention(BaseModel):
    active_users_1d: int
    active_users_7d: int
    active_users_30d: int
    returning_users_7d: int
    returning_users_30d: int
    activation_retention_7d: int
    activation_retention_30d: int


class AcquisitionBreakdownItem(BaseModel):
    source: str
    users: int


class AcquisitionSummary(BaseModel):
    unattributed_users: int
    top_sources: list[AcquisitionBreakdownItem]
    top_campaigns: list[AcquisitionBreakdownItem]


class AcquisitionPerformanceRow(BaseModel):
    dimension: str
    users: int
    activated_users: int
    studied_users: int
    quiz_users: int
    consistent_users: int
    activation_rate: float
    study_rate: float
    consistency_rate: float


class AcquisitionPerformance(BaseModel):
    attributed_users: int
    top_sources: list[AcquisitionPerformanceRow]
    top_campaigns: list[AcquisitionPerformanceRow]


class AnalyticsUserRow(BaseModel):
    id: int
    username: str
    email: str
    provider: str
    created_at: datetime
    last_login_at: Optional[datetime] = None
    first_login_at: Optional[datetime] = None
    first_deck_created_at: Optional[datetime] = None
    first_study_at: Optional[datetime] = None
    first_quiz_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None
    lifecycle_stage: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    total_decks: int
    flashcards_studied: int
    quizzes_completed: int


class AnalyticsUserDocumentRow(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime
    total_flashcards: int
    has_quiz: bool


class AnalyticsUserEventRow(BaseModel):
    event_name: str
    occurred_at: datetime
    document_id: Optional[int] = None
    quiz_id: Optional[int] = None


class AnalyticsAdminHistoryRow(BaseModel):
    event_name: str
    occurred_at: datetime
    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None
    summary: Optional[str] = None


class AnalyticsAdminNoteRow(BaseModel):
    id: int
    note: str
    created_at: datetime
    author_user_id: int
    author_email: Optional[str] = None
    author_username: Optional[str] = None


class AnalyticsUserDetail(AnalyticsUserRow):
    is_team: bool
    is_test_user: bool
    is_blocked: bool
    utm_medium: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    referrer: Optional[str] = None
    landing_page: Optional[str] = None
    first_touch_at: Optional[datetime] = None
    recent_documents: list[AnalyticsUserDocumentRow]
    recent_events: list[AnalyticsUserEventRow]
    admin_history: list[AnalyticsAdminHistoryRow]
    admin_notes: list[AnalyticsAdminNoteRow]


class AdminUserUpdateRequest(BaseModel):
    is_team: Optional[bool] = None
    is_test_user: Optional[bool] = None
    is_blocked: Optional[bool] = None


class AdminUserNoteCreateRequest(BaseModel):
    note: str


def _range_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _local_today() -> date:
    return analytics_service.local_today()


def _apply_user_filters(
    statement,
    *,
    provider: Optional[models.AuthProvider] = None,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    lifecycle_stage: Optional[str] = None,
    is_team: Optional[bool] = None,
    is_test_user: Optional[bool] = None,
    is_blocked: Optional[bool] = None,
    include_internal: bool = False,
):
    if not include_internal:
        statement = statement.where(models.User.is_team == False, models.User.is_test_user == False)
    if provider is not None:
        statement = statement.where(models.User.provider == provider)
    if utm_source:
        statement = statement.where(models.User.utm_source == utm_source)
    if utm_campaign:
        statement = statement.where(models.User.utm_campaign == utm_campaign)
    if lifecycle_stage:
        statement = statement.where(models.User.lifecycle_stage == lifecycle_stage)
    if is_team is not None:
        statement = statement.where(models.User.is_team == is_team)
    if is_test_user is not None:
        statement = statement.where(models.User.is_test_user == is_test_user)
    if is_blocked is not None:
        statement = statement.where(models.User.is_blocked == is_blocked)
    return statement


def _build_user_row(session: Session, user: models.User) -> AnalyticsUserRow:
    total_decks = session.exec(
        select(func.count(models.Document.id)).where(models.Document.user_id == user.id)
    ).one() or 0
    flashcards_studied = session.exec(
        select(func.count(models.StudyLog.id)).where(models.StudyLog.user_id == user.id)
    ).one() or 0
    quizzes_completed = session.exec(
        select(func.count(models.QuizAttempt.id)).where(models.QuizAttempt.user_id == user.id)
    ).one() or 0

    return AnalyticsUserRow(
        id=user.id or 0,
        username=user.username,
        email=user.email,
        provider=user.provider.value,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        first_login_at=user.first_login_at,
        first_deck_created_at=user.first_deck_created_at,
        first_study_at=user.first_study_at,
        first_quiz_at=user.first_quiz_at,
        activated_at=user.activated_at,
        lifecycle_stage=user.lifecycle_stage,
        utm_source=user.utm_source,
        utm_campaign=user.utm_campaign,
        total_decks=total_decks,
        flashcards_studied=flashcards_studied,
        quizzes_completed=quizzes_completed,
    )


def _build_acquisition_rows(
    users: list[models.User],
    *,
    field_name: str,
    limit: int,
) -> list[AcquisitionPerformanceRow]:
    grouped: dict[str, dict[str, int]] = {}
    recent_threshold = _range_start(7)

    for user in users:
        dimension_value = getattr(user, field_name, None)
        if not dimension_value:
            continue

        bucket = grouped.setdefault(
            dimension_value,
            {
                "users": 0,
                "activated_users": 0,
                "studied_users": 0,
                "quiz_users": 0,
                "consistent_users": 0,
            },
        )
        bucket["users"] += 1
        if user.activated_at is not None:
            bucket["activated_users"] += 1
        if user.first_study_at is not None:
            bucket["studied_users"] += 1
        if user.first_quiz_at is not None:
            bucket["quiz_users"] += 1
        if user.activated_at is not None and user.last_login_at is not None and user.last_login_at >= recent_threshold:
            bucket["consistent_users"] += 1

    rows: list[AcquisitionPerformanceRow] = []
    for dimension, counts in grouped.items():
        users_count = counts["users"]
        rows.append(
            AcquisitionPerformanceRow(
                dimension=dimension,
                users=users_count,
                activated_users=counts["activated_users"],
                studied_users=counts["studied_users"],
                quiz_users=counts["quiz_users"],
                consistent_users=counts["consistent_users"],
                activation_rate=round((counts["activated_users"] / users_count) * 100, 1) if users_count else 0.0,
                study_rate=round((counts["studied_users"] / users_count) * 100, 1) if users_count else 0.0,
                consistency_rate=round((counts["consistent_users"] / users_count) * 100, 1) if users_count else 0.0,
            )
        )

    rows.sort(
        key=lambda row: (
            row.activated_users,
            row.consistent_users,
            row.users,
            row.dimension.lower(),
        ),
        reverse=True,
    )
    return rows[:limit]


def _count_filtered_users(
    session: Session,
    *,
    provider: Optional[models.AuthProvider] = None,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    lifecycle_stage: Optional[str] = None,
    is_team: Optional[bool] = None,
    is_test_user: Optional[bool] = None,
    is_blocked: Optional[bool] = None,
    include_internal: bool = False,
    extra_where: tuple = (),
) -> int:
    statement = select(func.count(models.User.id))
    if extra_where:
        statement = statement.where(*extra_where)
    return session.exec(
        _apply_user_filters(
            statement,
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0


def _build_admin_history_row(event: models.ProductEvent) -> AnalyticsAdminHistoryRow:
    properties = event.properties or {}
    changed_fields = properties.get("changed_fields")
    note_preview = properties.get("note_preview")

    summary = None
    if isinstance(changed_fields, dict) and changed_fields:
        summary = ", ".join(f"{field}={value}" for field, value in changed_fields.items())
    elif note_preview:
        summary = str(note_preview)

    return AnalyticsAdminHistoryRow(
        event_name=event.event_name,
        occurred_at=event.occurred_at,
        actor_user_id=properties.get("actor_user_id"),
        actor_email=properties.get("actor_email"),
        summary=summary,
    )


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(7, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user
    range_start = _range_start(days)

    total_users = session.exec(
        _apply_user_filters(
            select(func.count(models.User.id)),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    new_users_7d = session.exec(
        _apply_user_filters(
            select(func.count(models.User.id)).where(models.User.created_at >= range_start),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    active_users_7d = session.exec(
        _apply_user_filters(
            select(func.count(models.User.id)).where(models.User.last_login_at >= range_start),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    activated_users_7d = session.exec(
        _apply_user_filters(
            select(func.count(models.User.id)).where(models.User.activated_at >= range_start),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    users_with_decks = session.exec(
        _apply_user_filters(
            select(func.count(func.distinct(models.Document.user_id))).select_from(models.Document).join(
                models.User, models.User.id == models.Document.user_id
            ),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    users_who_studied = session.exec(
        _apply_user_filters(
            select(func.count(func.distinct(models.StudyLog.user_id))).select_from(models.StudyLog).join(
                models.User, models.User.id == models.StudyLog.user_id
            ),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    users_who_completed_quiz = session.exec(
        _apply_user_filters(
            select(func.count(func.distinct(models.QuizAttempt.user_id))).select_from(models.QuizAttempt).join(
                models.User, models.User.id == models.QuizAttempt.user_id
            ),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    decks_created_7d = session.exec(
        _apply_user_filters(
            select(func.count(models.Document.id))
            .select_from(models.Document)
            .join(models.User, models.User.id == models.Document.user_id)
            .where(models.Document.created_at >= range_start),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0
    decks_completed_7d = session.exec(
        _apply_user_filters(
            select(func.count(models.ProductEvent.id))
            .select_from(models.ProductEvent)
            .join(models.User, models.User.id == models.ProductEvent.user_id)
            .where(
                models.ProductEvent.event_name == "deck_processing_completed",
                models.ProductEvent.occurred_at >= range_start,
            ),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            include_internal=include_internal,
        )
    ).one() or 0

    return AnalyticsOverview(
        total_users=total_users,
        new_users_7d=new_users_7d,
        active_users_7d=active_users_7d,
        activated_users_7d=activated_users_7d,
        users_with_decks=users_with_decks,
        users_who_studied=users_who_studied,
        users_who_completed_quiz=users_who_completed_quiz,
        decks_created_7d=decks_created_7d,
        decks_completed_7d=decks_completed_7d,
    )


@router.get("/acquisition", response_model=AcquisitionSummary)
def get_acquisition_summary(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    limit: int = Query(10, ge=1, le=50),
    days: Optional[int] = Query(None, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user
    base_unattributed = select(func.count(models.User.id)).where(models.User.utm_source.is_(None))
    top_sources_stmt = select(models.User.utm_source, func.count(models.User.id)).where(models.User.utm_source.is_not(None))
    top_campaigns_stmt = select(models.User.utm_campaign, func.count(models.User.id)).where(models.User.utm_campaign.is_not(None))

    if days is not None:
        range_start = _range_start(days)
        base_unattributed = base_unattributed.where(models.User.created_at >= range_start)
        top_sources_stmt = top_sources_stmt.where(models.User.created_at >= range_start)
        top_campaigns_stmt = top_campaigns_stmt.where(models.User.created_at >= range_start)

    unattributed_users = session.exec(
        _apply_user_filters(
            base_unattributed,
            provider=provider,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).one() or 0

    top_sources_rows = session.exec(
        _apply_user_filters(
            top_sources_stmt
            .group_by(models.User.utm_source)
            .order_by(func.count(models.User.id).desc(), models.User.utm_source.asc())
            .limit(limit),
            provider=provider,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).all()

    top_campaign_rows = session.exec(
        _apply_user_filters(
            top_campaigns_stmt
            .group_by(models.User.utm_campaign)
            .order_by(func.count(models.User.id).desc(), models.User.utm_campaign.asc())
            .limit(limit),
            provider=provider,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).all()

    return AcquisitionSummary(
        unattributed_users=unattributed_users,
        top_sources=[
            AcquisitionBreakdownItem(source=source, users=count)
            for source, count in top_sources_rows
            if source
        ],
        top_campaigns=[
            AcquisitionBreakdownItem(source=campaign, users=count)
            for campaign, count in top_campaign_rows
            if campaign
        ],
    )


@router.get("/funnel", response_model=AnalyticsFunnel)
def get_analytics_funnel(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(30, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user
    range_start = _range_start(days)

    cohort_filter = (models.User.created_at >= range_start,)
    registered_users = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=cohort_filter,
    )
    created_deck_users = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=cohort_filter + (models.User.first_deck_created_at.is_not(None),),
    )
    studied_users = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=cohort_filter + (models.User.first_study_at.is_not(None),),
    )
    quiz_users = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=cohort_filter + (models.User.first_quiz_at.is_not(None),),
    )
    activated_users = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=cohort_filter + (models.User.activated_at.is_not(None),),
    )

    raw_steps = [
        ("registered", "Cadastro", registered_users),
        ("created_deck", "Criou deck", created_deck_users),
        ("studied", "Estudou", studied_users),
        ("quiz_completed", "Concluiu quiz", quiz_users),
        ("activated", "Ativou", activated_users),
    ]

    steps: list[FunnelStep] = []
    previous_count: int | None = None
    for key, label, users in raw_steps:
        conversion_from_previous = None
        if previous_count and previous_count > 0:
            conversion_from_previous = round((users / previous_count) * 100, 1)

        conversion_from_start = None
        if registered_users > 0:
            conversion_from_start = round((users / registered_users) * 100, 1)

        steps.append(
            FunnelStep(
                key=key,
                label=label,
                users=users,
                conversion_from_previous=conversion_from_previous,
                conversion_from_start=conversion_from_start,
            )
        )
        previous_count = users

    return AnalyticsFunnel(cohort_users=registered_users, steps=steps)


@router.get("/retention", response_model=AnalyticsRetention)
def get_analytics_retention(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user

    one_day = _range_start(1)
    seven_days = _range_start(7)
    thirty_days = _range_start(30)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    active_users_1d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(models.User.last_login_at >= one_day,),
    )
    active_users_7d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(models.User.last_login_at >= seven_days,),
    )
    active_users_30d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(models.User.last_login_at >= thirty_days,),
    )
    returning_users_7d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(
            models.User.last_login_at >= seven_days,
            models.User.created_at < seven_days,
        ),
    )
    returning_users_30d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(
            models.User.last_login_at >= thirty_days,
            models.User.created_at < thirty_days,
        ),
    )
    activation_retention_7d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(
            models.User.activated_at.is_not(None),
            models.User.activated_at <= seven_days_ago,
            models.User.last_login_at >= seven_days,
        ),
    )
    activation_retention_30d = _count_filtered_users(
        session,
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
        extra_where=(
            models.User.activated_at.is_not(None),
            models.User.activated_at <= thirty_days_ago,
            models.User.last_login_at >= thirty_days,
        ),
    )

    return AnalyticsRetention(
        active_users_1d=active_users_1d,
        active_users_7d=active_users_7d,
        active_users_30d=active_users_30d,
        returning_users_7d=returning_users_7d,
        returning_users_30d=returning_users_30d,
        activation_retention_7d=activation_retention_7d,
        activation_retention_30d=activation_retention_30d,
    )


@router.get("/acquisition-performance", response_model=AcquisitionPerformance)
def get_acquisition_performance(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(30, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
    limit: int = Query(8, ge=1, le=20),
):
    del current_user
    range_start = _range_start(days)

    users = session.exec(
        _apply_user_filters(
            select(models.User)
            .where(models.User.created_at >= range_start)
            .order_by(models.User.created_at.desc()),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).all()

    attributed_users = sum(1 for user in users if user.utm_source)

    return AcquisitionPerformance(
        attributed_users=attributed_users,
        top_sources=_build_acquisition_rows(users, field_name="utm_source", limit=limit),
        top_campaigns=_build_acquisition_rows(users, field_name="utm_campaign", limit=limit),
    )


@router.get("/users", response_model=list[AnalyticsUserRow])
def get_analytics_users(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user
    users = session.exec(
        _apply_user_filters(
            select(models.User)
            .order_by(models.User.created_at.desc())
            .limit(limit),
            provider=provider,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            lifecycle_stage=lifecycle_stage,
            is_team=is_team,
            is_test_user=is_test_user,
            is_blocked=is_blocked,
            include_internal=include_internal,
        )
    ).all()

    return [_build_user_row(session, user) for user in users]


@router.get("/users/{user_id}", response_model=AnalyticsUserDetail)
def get_analytics_user_detail(
    user_id: int,
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
):
    del current_user
    user = session.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    base_row = _build_user_row(session, user)

    recent_documents = session.exec(
        select(models.Document)
        .where(models.Document.user_id == user_id)
        .order_by(models.Document.created_at.desc())
        .limit(5)
    ).all()

    recent_events = session.exec(
        select(models.ProductEvent)
        .where(models.ProductEvent.user_id == user_id)
        .order_by(models.ProductEvent.occurred_at.desc())
        .limit(8)
    ).all()
    admin_history = session.exec(
        select(models.ProductEvent)
        .where(
            models.ProductEvent.user_id == user_id,
            models.ProductEvent.event_name.in_(["admin_user_flags_updated", "admin_user_note_added"]),
        )
        .order_by(models.ProductEvent.occurred_at.desc())
        .limit(12)
    ).all()
    admin_notes = session.exec(
        select(models.UserAdminNote)
        .where(models.UserAdminNote.user_id == user_id)
        .order_by(models.UserAdminNote.created_at.desc())
        .limit(20)
    ).all()

    return AnalyticsUserDetail(
        **base_row.model_dump(),
        is_team=user.is_team,
        is_test_user=user.is_test_user,
        is_blocked=user.is_blocked,
        utm_medium=user.utm_medium,
        utm_content=user.utm_content,
        utm_term=user.utm_term,
        referrer=user.referrer,
        landing_page=user.landing_page,
        first_touch_at=user.first_touch_at,
        recent_documents=[
            AnalyticsUserDocumentRow(
                id=document.id or 0,
                title=document.title or document.file_path,
                status=document.status.value,
                created_at=document.created_at,
                total_flashcards=len(document.flashcards),
                has_quiz=document.quiz is not None,
            )
            for document in recent_documents
        ],
        recent_events=[
            AnalyticsUserEventRow(
                event_name=event.event_name,
                occurred_at=event.occurred_at,
                document_id=event.document_id,
                quiz_id=event.quiz_id,
            )
            for event in recent_events
        ],
        admin_history=[_build_admin_history_row(event) for event in admin_history],
        admin_notes=[
            AnalyticsAdminNoteRow(
                id=note.id or 0,
                note=note.note,
                created_at=note.created_at,
                author_user_id=note.author_user_id,
                author_email=(session.get(models.User, note.author_user_id).email if session.get(models.User, note.author_user_id) else None),
                author_username=(session.get(models.User, note.author_user_id).username if session.get(models.User, note.author_user_id) else None),
            )
            for note in admin_notes
        ],
    )


@router.patch("/users/{user_id}", response_model=AnalyticsUserDetail)
def update_analytics_user_admin_state(
    user_id: int,
    payload: AdminUserUpdateRequest,
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
):
    user = session.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    requested_changes = payload.model_dump(exclude_unset=True)
    if not requested_changes:
        return get_analytics_user_detail(user_id=user_id, current_user=current_user, session=session)

    if current_user.id == user_id:
        if requested_changes.get("is_blocked") is True:
            raise HTTPException(status_code=400, detail="Você não pode bloquear a própria conta.")
        if requested_changes.get("is_team") is False:
            raise HTTPException(status_code=400, detail="Você não pode remover seu próprio acesso de equipe.")

    changed_fields: dict[str, bool] = {}
    for field_name, value in requested_changes.items():
        if getattr(user, field_name) != value:
            setattr(user, field_name, value)
            changed_fields[field_name] = value

    if changed_fields:
        session.add(user)
        session.commit()
        session.refresh(user)
        analytics_service.track_product_event(
            session,
            "admin_user_flags_updated",
            user_id=user.id,
            properties={
                "actor_user_id": current_user.id,
                "actor_email": current_user.email,
                "target_user_id": user.id,
                "changed_fields": changed_fields,
            },
        )

    return get_analytics_user_detail(user_id=user_id, current_user=current_user, session=session)


@router.post("/users/{user_id}/notes", response_model=AnalyticsAdminNoteRow)
def create_analytics_user_note(
    user_id: int,
    payload: AdminUserNoteCreateRequest,
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
):
    user = session.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    note_text = payload.note.strip()
    if not note_text:
        raise HTTPException(status_code=400, detail="A nota não pode ficar vazia.")

    note = models.UserAdminNote(
        user_id=user_id,
        author_user_id=current_user.id or 0,
        note=note_text,
    )
    session.add(note)
    session.commit()
    session.refresh(note)

    analytics_service.track_product_event(
        session,
        "admin_user_note_added",
        user_id=user.id,
        properties={
            "actor_user_id": current_user.id,
            "actor_email": current_user.email,
            "target_user_id": user.id,
            "note_id": note.id,
            "note_preview": note_text[:120],
        },
    )

    return AnalyticsAdminNoteRow(
        id=note.id or 0,
        note=note.note,
        created_at=note.created_at,
        author_user_id=note.author_user_id,
        author_email=current_user.email,
        author_username=current_user.username,
    )


# ---------------------------------------------------------------------------
# Routine analytics — response models
# ---------------------------------------------------------------------------

WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]


class RoutineDayOfWeekBreakdown(BaseModel):
    weekday: int
    weekday_label: str
    active_users: int
    total_sessions: int


class RoutineHourBreakdown(BaseModel):
    hour: int
    active_users: int
    total_sessions: int


class RoutineUserBucket(BaseModel):
    label: str
    users: int


class RoutineConsistentUser(BaseModel):
    user_id: int
    username: str
    email: str
    active_days: int
    current_streak: int
    last_active_date: Optional[str] = None


class RoutineOverview(BaseModel):
    period_days: int
    total_users_in_filter: int
    users_with_any_activity: int
    average_active_days: float
    median_active_days: float
    max_active_days: int
    users_active_last_7d: int
    users_active_last_3d: int
    frequency_buckets: list[RoutineUserBucket]
    weekday_breakdown: list[RoutineDayOfWeekBreakdown]
    hour_breakdown: list[RoutineHourBreakdown]
    top_consistent_users: list[RoutineConsistentUser]


class HeatmapDay(BaseModel):
    date: str
    active_users: int
    total_sessions: int
    intensity: int


class RoutineHeatmap(BaseModel):
    start_date: str
    end_date: str
    total_days: int
    days: list[HeatmapDay]


class UserRoutineDayRow(BaseModel):
    date: str
    study_count: int
    quiz_count: int
    login_count: int
    guided_study_count: int
    flashcard_study_minutes: int
    quiz_study_minutes: int
    guided_study_minutes: int
    estimated_study_minutes: int
    total_sessions: int
    intensity: int
    activity_type: str  # "flashcards", "quiz", "guided", "mixed", "login_only", "none"


class UserRoutineDetail(BaseModel):
    user_id: int
    period_days: int
    total_active_days: int
    total_inactive_days: int
    current_streak: int
    longest_streak: int
    average_gap_days: float
    preferred_weekday: str
    preferred_weekday_count: int
    weekday_breakdown: list[RoutineDayOfWeekBreakdown]
    days: list[UserRoutineDayRow]
    days_since_last_activity: Optional[int] = None
    last_activity_date: Optional[str] = None
    engagement_label: str
    engagement_score: float
    total_flashcard_study_minutes: int
    total_quiz_study_minutes: int
    total_guided_study_minutes: int
    total_study_minutes: int


# ---------------------------------------------------------------------------
# Routine analytics — helpers
# ---------------------------------------------------------------------------

def _compute_streak(active_dates: set[date], anchor: date) -> int:
    """Count consecutive active days ending on *anchor* (or the day before)."""
    cursor = anchor if anchor in active_dates else anchor - timedelta(days=1)
    if cursor not in active_dates:
        return 0
    streak = 0
    while cursor in active_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _longest_streak(active_dates: set[date]) -> int:
    if not active_dates:
        return 0
    sorted_dates = sorted(active_dates)
    best = current = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    return best


def _intensity(sessions: int, max_sessions: int) -> int:
    if sessions == 0 or max_sessions == 0:
        return 0
    ratio = sessions / max_sessions
    if ratio >= 0.75:
        return 4
    if ratio >= 0.50:
        return 3
    if ratio >= 0.25:
        return 2
    return 1


def _engagement_label(active_days_14d: int, active_days_30d: int, days_since_creation: int, days_since_last: int | None) -> tuple[str, float]:
    if days_since_creation < 7:
        return "Novo", 0.5
    if days_since_last is not None and days_since_last > 14:
        return "Inativo", 0.0
    rate_14d = active_days_14d / min(14, days_since_creation) if days_since_creation > 0 else 0
    if rate_14d >= 0.80:
        return "Diário", min(1.0, rate_14d)
    if rate_14d >= 0.40:
        return "Regular", round(rate_14d, 2)
    rate_30d = active_days_30d / min(30, days_since_creation) if days_since_creation > 0 else 0
    if rate_30d >= 0.10:
        return "Ocasional", round(rate_30d, 2)
    return "Inativo", 0.0


# ---------------------------------------------------------------------------
# Routine analytics — endpoints
# ---------------------------------------------------------------------------

@router.get("/routine-overview", response_model=RoutineOverview)
def get_routine_overview(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(30, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user

    # Refresh cache lazily as well (belt-and-suspenders; Celery beat is primary)
    analytics_service.refresh_user_activity_days(session, since_days=days + 5)

    range_start = _range_start(days)
    today = _local_today()

    # Filtered user ids
    user_stmt = _apply_user_filters(
        select(models.User),
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
    )
    filtered_users = session.exec(user_stmt).all()
    filtered_user_ids = {u.id for u in filtered_users}
    total_users = len(filtered_user_ids)

    if not filtered_user_ids:
        empty_weekday = [RoutineDayOfWeekBreakdown(weekday=i, weekday_label=WEEKDAY_LABELS[i], active_users=0, total_sessions=0) for i in range(7)]
        empty_hours = [RoutineHourBreakdown(hour=h, active_users=0, total_sessions=0) for h in range(24)]
        return RoutineOverview(
            period_days=days, total_users_in_filter=0, users_with_any_activity=0,
            average_active_days=0, median_active_days=0, max_active_days=0,
            users_active_last_7d=0, users_active_last_3d=0,
            frequency_buckets=[], weekday_breakdown=empty_weekday,
            hour_breakdown=empty_hours, top_consistent_users=[],
        )

    # Query activity days for these users
    activity_rows = session.exec(
        select(models.UserActivityDay)
        .where(
            models.UserActivityDay.user_id.in_(filtered_user_ids),
            models.UserActivityDay.activity_date >= range_start.date(),
        )
    ).all()

    # Per-user active-day count
    from collections import defaultdict
    user_days: dict[int, set[date]] = defaultdict(set)
    weekday_users: dict[int, set[int]] = defaultdict(set)  # weekday -> user ids
    weekday_sessions: dict[int, int] = defaultdict(int)

    for row in activity_rows:
        d = row.activity_date if isinstance(row.activity_date, date) else row.activity_date.date() if hasattr(row.activity_date, 'date') else row.activity_date
        user_days[row.user_id].add(d)
        wd = d.weekday()
        weekday_users[wd].add(row.user_id)
        sessions = row.study_count + row.quiz_count
        weekday_sessions[wd] += sessions

    active_day_counts = [len(ds) for ds in user_days.values()]
    users_with_activity = len(user_days)
    avg_days = round(sum(active_day_counts) / len(active_day_counts), 1) if active_day_counts else 0.0
    med_days = round(median(active_day_counts), 1) if active_day_counts else 0.0
    max_days = max(active_day_counts) if active_day_counts else 0

    # Active last 7d / 3d
    seven_d = today - timedelta(days=7)
    three_d = today - timedelta(days=3)
    users_7d = {uid for uid, ds in user_days.items() if any(d >= seven_d for d in ds)}
    users_3d = {uid for uid, ds in user_days.items() if any(d >= three_d for d in ds)}

    # Frequency buckets
    bucket_ranges = [(1, 2, "1-2 dias"), (3, 5, "3-5 dias"), (6, 10, "6-10 dias"), (11, 20, "11-20 dias"), (21, 999, "21+ dias")]
    buckets = []
    for lo, hi, label in bucket_ranges:
        count = sum(1 for c in active_day_counts if lo <= c <= hi)
        if count > 0:
            buckets.append(RoutineUserBucket(label=label, users=count))

    # Weekday breakdown
    wd_breakdown = [
        RoutineDayOfWeekBreakdown(
            weekday=i,
            weekday_label=WEEKDAY_LABELS[i],
            active_users=len(weekday_users.get(i, set())),
            total_sessions=weekday_sessions.get(i, 0),
        )
        for i in range(7)
    ]

    # Hour breakdown from raw events (UTC)
    hour_stmt = (
        select(
            func.extract("hour", models.ProductEvent.occurred_at).label("h"),
            func.count(func.distinct(models.ProductEvent.user_id)).label("users"),
            func.count().label("cnt"),
        )
        .where(
            models.ProductEvent.occurred_at >= range_start,
            models.ProductEvent.user_id.in_(filtered_user_ids),
        )
        .group_by("h")
        .order_by("h")
    )
    hour_rows = {int(h): (u, c) for h, u, c in session.exec(hour_stmt).all()}
    hour_breakdown = [
        RoutineHourBreakdown(
            hour=h,
            active_users=hour_rows.get(h, (0, 0))[0],
            total_sessions=hour_rows.get(h, (0, 0))[1],
        )
        for h in range(24)
    ]

    # Top consistent users
    user_map = {u.id: u for u in filtered_users}
    ranked = sorted(user_days.items(), key=lambda item: len(item[1]), reverse=True)[:8]
    top_users = []
    for uid, ds in ranked:
        u = user_map.get(uid)
        if not u:
            continue
        sorted_ds = sorted(ds)
        top_users.append(RoutineConsistentUser(
            user_id=uid,
            username=u.username,
            email=u.email,
            active_days=len(ds),
            current_streak=_compute_streak(ds, today),
            last_active_date=sorted_ds[-1].isoformat() if sorted_ds else None,
        ))

    return RoutineOverview(
        period_days=days,
        total_users_in_filter=total_users,
        users_with_any_activity=users_with_activity,
        average_active_days=avg_days,
        median_active_days=med_days,
        max_active_days=max_days,
        users_active_last_7d=len(users_7d),
        users_active_last_3d=len(users_3d),
        frequency_buckets=buckets,
        weekday_breakdown=wd_breakdown,
        hour_breakdown=hour_breakdown,
        top_consistent_users=top_users,
    )


@router.get("/routine-heatmap", response_model=RoutineHeatmap)
def get_routine_heatmap(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(90, ge=7, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
    is_team: Optional[bool] = Query(None),
    is_test_user: Optional[bool] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    include_internal: bool = Query(False),
):
    del current_user
    today = _local_today()
    start = today - timedelta(days=days - 1)

    # Filtered user ids
    user_stmt = _apply_user_filters(
        select(models.User.id),
        provider=provider,
        utm_source=utm_source,
        utm_campaign=utm_campaign,
        lifecycle_stage=lifecycle_stage,
        is_team=is_team,
        is_test_user=is_test_user,
        is_blocked=is_blocked,
        include_internal=include_internal,
    )
    filtered_ids = {row for row in session.exec(user_stmt).all()}

    # Aggregate per-day
    agg_stmt = (
        select(
            models.UserActivityDay.activity_date,
            func.count(func.distinct(models.UserActivityDay.user_id)).label("users"),
            func.sum(models.UserActivityDay.study_count + models.UserActivityDay.quiz_count).label("sessions"),
        )
        .where(
            models.UserActivityDay.user_id.in_(filtered_ids),
            models.UserActivityDay.activity_date >= start,
            models.UserActivityDay.activity_date <= today,
        )
        .group_by(models.UserActivityDay.activity_date)
    )
    day_map: dict[date, tuple[int, int]] = {}
    for d, users, sessions in session.exec(agg_stmt).all():
        day_map[d] = (users or 0, sessions or 0)

    max_sessions = max((s for _, s in day_map.values()), default=0)

    heatmap_days = []
    cursor = start
    while cursor <= today:
        users, sessions = day_map.get(cursor, (0, 0))
        heatmap_days.append(HeatmapDay(
            date=cursor.isoformat(),
            active_users=users,
            total_sessions=sessions,
            intensity=_intensity(sessions, max_sessions),
        ))
        cursor += timedelta(days=1)

    return RoutineHeatmap(
        start_date=start.isoformat(),
        end_date=today.isoformat(),
        total_days=len(heatmap_days),
        days=heatmap_days,
    )


@router.get("/users/{user_id}/routine", response_model=UserRoutineDetail)
def get_user_routine(
    user_id: int,
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(90, ge=7, le=365),
):
    del current_user
    user = session.get(models.User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    today = _local_today()
    start = today - timedelta(days=days - 1)

    # Refresh cache for just this user
    analytics_service.refresh_user_activity_days(session, user_id=user_id, since_days=days + 5)

    rows = session.exec(
        select(models.UserActivityDay)
        .where(
            models.UserActivityDay.user_id == user_id,
            models.UserActivityDay.activity_date >= start,
            models.UserActivityDay.activity_date <= today,
        )
        .order_by(models.UserActivityDay.activity_date.asc())
    ).all()

    active_dates: set[date] = set()
    day_data: dict[date, models.UserActivityDay] = {}
    max_sessions = 0
    for row in rows:
        d = row.activity_date if isinstance(row.activity_date, date) else row.activity_date
        active_dates.add(d)
        day_data[d] = row
        s = row.study_count + row.quiz_count
        if s > max_sessions:
            max_sessions = s

    total_active = len(active_dates)
    user_created_date = analytics_service.to_local_date(user.created_at) if user.created_at else None
    account_age = (today - user_created_date).days if user_created_date else days
    period = min(days, max(account_age, 1))
    total_inactive = max(period - total_active, 0)

    current_str = _compute_streak(active_dates, today)
    longest_str = _longest_streak(active_dates)

    # Average gap
    sorted_dates = sorted(active_dates)
    if len(sorted_dates) >= 2:
        gaps = [(sorted_dates[i] - sorted_dates[i - 1]).days - 1 for i in range(1, len(sorted_dates))]
        avg_gap = round(sum(gaps) / len(gaps), 1) if gaps else 0.0
    else:
        avg_gap = 0.0

    # Weekday breakdown
    from collections import defaultdict as _dd
    wd_count: dict[int, int] = _dd(int)
    wd_sessions: dict[int, int] = _dd(int)
    for d in active_dates:
        wd = d.weekday()
        wd_count[wd] += 1
        row = day_data.get(d)
        if row:
            wd_sessions[wd] += row.study_count + row.quiz_count

    preferred_wd = max(range(7), key=lambda i: wd_count.get(i, 0)) if active_dates else 0
    wd_breakdown = [
        RoutineDayOfWeekBreakdown(
            weekday=i,
            weekday_label=WEEKDAY_LABELS[i],
            active_users=wd_count.get(i, 0),
            total_sessions=wd_sessions.get(i, 0),
        )
        for i in range(7)
    ]

    # Build day-by-day list
    total_flashcard_study_mins = 0
    total_quiz_study_mins = 0
    total_guided_study_mins = 0
    total_study_mins = 0
    day_rows: list[UserRoutineDayRow] = []
    cursor = start
    while cursor <= today:
        row = day_data.get(cursor)
        if row:
            s = row.study_count + row.quiz_count
            mins = row.estimated_study_minutes if hasattr(row, 'estimated_study_minutes') else 0
            guided = row.guided_study_count if hasattr(row, 'guided_study_count') else 0
            flashcard_mins = row.flashcard_study_minutes if hasattr(row, 'flashcard_study_minutes') else 0
            quiz_mins = row.quiz_study_minutes if hasattr(row, 'quiz_study_minutes') else 0
            guided_mins = row.guided_study_minutes if hasattr(row, 'guided_study_minutes') else 0
            total_flashcard_study_mins += flashcard_mins
            total_quiz_study_mins += quiz_mins
            total_guided_study_mins += guided_mins
            total_study_mins += mins

            # Determine activity type
            types_active = []
            if row.study_count > 0:
                types_active.append("flashcards")
            if row.quiz_count > 0:
                types_active.append("quiz")
            if guided > 0:
                types_active.append("guided")

            if len(types_active) > 1:
                act_type = "mixed"
            elif len(types_active) == 1:
                act_type = types_active[0]
            elif row.login_count > 0 or row.event_count > 0:
                act_type = "login_only"
            else:
                act_type = "none"

            day_rows.append(UserRoutineDayRow(
                date=cursor.isoformat(),
                study_count=row.study_count,
                quiz_count=row.quiz_count,
                login_count=row.login_count,
                guided_study_count=guided,
                flashcard_study_minutes=flashcard_mins,
                quiz_study_minutes=quiz_mins,
                guided_study_minutes=guided_mins,
                estimated_study_minutes=mins,
                total_sessions=s,
                intensity=_intensity(s, max_sessions),
                activity_type=act_type,
            ))
        else:
            day_rows.append(UserRoutineDayRow(
                date=cursor.isoformat(),
                study_count=0, quiz_count=0, login_count=0,
                guided_study_count=0,
                flashcard_study_minutes=0,
                quiz_study_minutes=0,
                guided_study_minutes=0,
                estimated_study_minutes=0,
                total_sessions=0, intensity=0, activity_type="none",
            ))
        cursor += timedelta(days=1)

    # Recency
    last_date = sorted_dates[-1] if sorted_dates else None
    days_since = (today - last_date).days if last_date else None

    # Engagement
    fourteen_d = today - timedelta(days=14)
    thirty_d = today - timedelta(days=30)
    active_14d = sum(1 for d in active_dates if d >= fourteen_d)
    active_30d = sum(1 for d in active_dates if d >= thirty_d)
    eng_label, eng_score = _engagement_label(active_14d, active_30d, account_age, days_since)

    return UserRoutineDetail(
        user_id=user_id,
        period_days=days,
        total_active_days=total_active,
        total_inactive_days=total_inactive,
        current_streak=current_str,
        longest_streak=longest_str,
        average_gap_days=avg_gap,
        preferred_weekday=WEEKDAY_LABELS[preferred_wd],
        preferred_weekday_count=wd_count.get(preferred_wd, 0),
        weekday_breakdown=wd_breakdown,
        days=day_rows,
        days_since_last_activity=days_since,
        last_activity_date=last_date.isoformat() if last_date else None,
        engagement_label=eng_label,
        engagement_score=eng_score,
        total_flashcard_study_minutes=total_flashcard_study_mins,
        total_quiz_study_minutes=total_quiz_study_mins,
        total_guided_study_minutes=total_guided_study_mins,
        total_study_minutes=total_study_mins,
    )
