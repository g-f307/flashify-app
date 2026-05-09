from datetime import datetime, date, timedelta, timezone
from collections import defaultdict
from typing import Any, Optional

from sqlmodel import Session, select
from sqlalchemy import func as sa_func, text

from . import models


def track_product_event(
    session: Session,
    event_name: str,
    *,
    user_id: Optional[int] = None,
    document_id: Optional[int] = None,
    quiz_id: Optional[int] = None,
    properties: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> models.ProductEvent:
    event = models.ProductEvent(
        event_name=event_name,
        user_id=user_id,
        document_id=document_id,
        quiz_id=quiz_id,
        properties=properties,
    )
    session.add(event)
    if commit:
        session.commit()
        session.refresh(event)
    return event


def update_user_lifecycle_stage(user: models.User) -> bool:
    if user.activated_at is not None:
        next_stage = "activated"
    elif user.first_quiz_at is not None:
        next_stage = "quiz_completed"
    elif user.first_study_at is not None:
        next_stage = "studied"
    elif user.first_deck_created_at is not None:
        next_stage = "created_deck"
    else:
        next_stage = "registered"

    if user.lifecycle_stage == next_stage:
        return False

    user.lifecycle_stage = next_stage
    return True


def mark_user_first_login(
    session: Session,
    user: models.User,
    *,
    occurred_at: Optional[datetime] = None,
    commit: bool = True,
) -> bool:
    occurred_at = occurred_at or datetime.now(timezone.utc)
    changed = False

    if user.first_login_at is None:
        user.first_login_at = occurred_at
        changed = True

    if update_user_lifecycle_stage(user):
        changed = True

    if changed:
        session.add(user)
        if commit:
            session.commit()
            session.refresh(user)

    return changed


def mark_user_first_deck_created(
    session: Session,
    user: models.User,
    *,
    occurred_at: Optional[datetime] = None,
    commit: bool = True,
) -> bool:
    occurred_at = occurred_at or datetime.now(timezone.utc)
    changed = False

    if user.first_deck_created_at is None:
        user.first_deck_created_at = occurred_at
        changed = True

    if user.activated_at is None and user.first_deck_created_at and (user.first_study_at or user.first_quiz_at):
        user.activated_at = user.first_study_at or user.first_quiz_at
        changed = True

    if update_user_lifecycle_stage(user):
        changed = True

    if changed:
        session.add(user)
        if commit:
            session.commit()
            session.refresh(user)

    return changed


def mark_user_first_study(
    session: Session,
    user: models.User,
    *,
    occurred_at: Optional[datetime] = None,
    commit: bool = True,
) -> bool:
    occurred_at = occurred_at or datetime.now(timezone.utc)
    changed = False

    if user.first_study_at is None:
        user.first_study_at = occurred_at
        changed = True

    if user.activated_at is None and user.first_deck_created_at is not None:
        user.activated_at = occurred_at
        changed = True

    if update_user_lifecycle_stage(user):
        changed = True

    if changed:
        session.add(user)
        if commit:
            session.commit()
            session.refresh(user)

    return changed


def mark_user_first_quiz(
    session: Session,
    user: models.User,
    *,
    occurred_at: Optional[datetime] = None,
    commit: bool = True,
) -> bool:
    occurred_at = occurred_at or datetime.now(timezone.utc)
    changed = False

    if user.first_quiz_at is None:
        user.first_quiz_at = occurred_at
        changed = True

    if user.activated_at is None and user.first_deck_created_at is not None:
        user.activated_at = occurred_at
        changed = True

    if update_user_lifecycle_stage(user):
        changed = True

    if changed:
        session.add(user)
        if commit:
            session.commit()
            session.refresh(user)

    return changed


def refresh_user_activity_days(
    session: Session,
    *,
    user_id: Optional[int] = None,
    since_days: int = 90,
) -> int:
    """
    Materialise UserActivityDay rows from StudyLog, QuizAttempt,
    GuidedStudySession and ProductEvent.
    If *user_id* is supplied only that user is refreshed.
    Returns the number of rows upserted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=since_days)

    # --- collect study dates ------------------------------------------------
    study_stmt = select(
        models.StudyLog.user_id,
        sa_func.date(models.StudyLog.studied_at).label("d"),
        sa_func.count().label("cnt"),
    ).where(models.StudyLog.studied_at >= cutoff).group_by(
        models.StudyLog.user_id, text("d")
    )
    if user_id is not None:
        study_stmt = study_stmt.where(models.StudyLog.user_id == user_id)

    # --- collect quiz dates -------------------------------------------------
    quiz_stmt = select(
        models.QuizAttempt.user_id,
        sa_func.date(models.QuizAttempt.completed_at).label("d"),
        sa_func.count().label("cnt"),
    ).where(models.QuizAttempt.completed_at >= cutoff).group_by(
        models.QuizAttempt.user_id, text("d")
    )
    if user_id is not None:
        quiz_stmt = quiz_stmt.where(models.QuizAttempt.user_id == user_id)

    # --- collect guided study sessions --------------------------------------
    guided_stmt = select(
        models.GuidedStudySession.user_id,
        sa_func.date(models.GuidedStudySession.started_at).label("d"),
        sa_func.count().label("cnt"),
        sa_func.sum(
            sa_func.extract(
                "epoch",
                models.GuidedStudySession.last_accessed_at - models.GuidedStudySession.started_at,
            )
        ).label("dur_seconds"),
    ).where(models.GuidedStudySession.started_at >= cutoff).group_by(
        models.GuidedStudySession.user_id, text("d")
    )
    if user_id is not None:
        guided_stmt = guided_stmt.where(models.GuidedStudySession.user_id == user_id)

    # --- collect login events -----------------------------------------------
    login_events = (
        "user_login",
        "user_login_google",
        "user_registered",
        "user_registered_google",
    )
    login_stmt = (
        select(
            models.ProductEvent.user_id,
            sa_func.date(models.ProductEvent.occurred_at).label("d"),
            sa_func.count().label("cnt"),
        )
        .where(
            models.ProductEvent.occurred_at >= cutoff,
            models.ProductEvent.event_name.in_(login_events),
            models.ProductEvent.user_id.is_not(None),
        )
        .group_by(models.ProductEvent.user_id, text("d"))
    )
    if user_id is not None:
        login_stmt = login_stmt.where(models.ProductEvent.user_id == user_id)

    # --- collect all other events -------------------------------------------
    event_stmt = (
        select(
            models.ProductEvent.user_id,
            sa_func.date(models.ProductEvent.occurred_at).label("d"),
            sa_func.count().label("cnt"),
        )
        .where(
            models.ProductEvent.occurred_at >= cutoff,
            models.ProductEvent.user_id.is_not(None),
        )
        .group_by(models.ProductEvent.user_id, text("d"))
    )
    if user_id is not None:
        event_stmt = event_stmt.where(models.ProductEvent.user_id == user_id)

    # --- merge into a dict[user_id, date] -> counts -------------------------
    DayKey = tuple  # (user_id, date)
    merged: dict[DayKey, dict[str, int | float]] = defaultdict(
        lambda: {"login": 0, "study": 0, "quiz": 0, "event": 0, "guided": 0, "minutes": 0.0}
    )

    for uid, d, cnt in session.exec(study_stmt).all():
        merged[(uid, d)]["study"] += cnt
        # Estimate ~0.5 min per flashcard reviewed
        merged[(uid, d)]["minutes"] += cnt * 0.5
    for uid, d, cnt in session.exec(quiz_stmt).all():
        merged[(uid, d)]["quiz"] += cnt
        # Estimate ~2 min per quiz completed
        merged[(uid, d)]["minutes"] += cnt * 2.0
    for uid, d, cnt, dur in session.exec(guided_stmt).all():
        merged[(uid, d)]["guided"] += cnt
        if dur and dur > 0:
            # Cap at 120 min per day to avoid outliers from open tabs
            merged[(uid, d)]["minutes"] += min(float(dur) / 60.0, 120.0)
    for uid, d, cnt in session.exec(login_stmt).all():
        merged[(uid, d)]["login"] += cnt
    for uid, d, cnt in session.exec(event_stmt).all():
        merged[(uid, d)]["event"] += cnt

    if not merged:
        return 0

    # --- delete stale rows for the refresh window then bulk insert ----------
    delete_stmt = (
        models.UserActivityDay.__table__.delete().where(
            models.UserActivityDay.activity_date >= cutoff.date()
        )
    )
    if user_id is not None:
        delete_stmt = delete_stmt.where(models.UserActivityDay.user_id == user_id)
    session.exec(delete_stmt)  # type: ignore[arg-type]

    rows = [
        models.UserActivityDay(
            user_id=uid,
            activity_date=d,
            login_count=int(counts["login"]),
            study_count=int(counts["study"]),
            quiz_count=int(counts["quiz"]),
            event_count=int(counts["event"]),
            guided_study_count=int(counts["guided"]),
            estimated_study_minutes=int(round(counts["minutes"])),
        )
        for (uid, d), counts in merged.items()
    ]
    session.add_all(rows)
    session.commit()
    return len(rows)
