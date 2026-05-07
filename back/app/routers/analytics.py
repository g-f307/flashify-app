from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from .. import models, security
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


class AcquisitionBreakdownItem(BaseModel):
    source: str
    users: int


class AcquisitionSummary(BaseModel):
    unattributed_users: int
    top_sources: list[AcquisitionBreakdownItem]
    top_campaigns: list[AcquisitionBreakdownItem]


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


def _range_start(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _apply_user_filters(
    statement,
    *,
    provider: Optional[models.AuthProvider] = None,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    lifecycle_stage: Optional[str] = None,
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
    return statement


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    days: int = Query(7, ge=1, le=365),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
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


@router.get("/users", response_model=list[AnalyticsUserRow])
def get_analytics_users(
    current_user: CurrentTeamUser,
    session: Session = Depends(get_session),
    limit: int = Query(50, ge=1, le=200),
    provider: Optional[models.AuthProvider] = Query(None),
    utm_source: Optional[str] = Query(None),
    utm_campaign: Optional[str] = Query(None),
    lifecycle_stage: Optional[str] = Query(None),
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
            include_internal=include_internal,
        )
    ).all()

    rows: list[AnalyticsUserRow] = []
    for user in users:
        total_decks = session.exec(
            select(func.count(models.Document.id)).where(models.Document.user_id == user.id)
        ).one() or 0
        flashcards_studied = session.exec(
            select(func.count(models.StudyLog.id)).where(models.StudyLog.user_id == user.id)
        ).one() or 0
        quizzes_completed = session.exec(
            select(func.count(models.QuizAttempt.id)).where(models.QuizAttempt.user_id == user.id)
        ).one() or 0

        rows.append(
            AnalyticsUserRow(
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
        )

    return rows
