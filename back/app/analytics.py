from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Session

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
