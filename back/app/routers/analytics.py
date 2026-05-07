from datetime import datetime, timedelta, timezone
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
