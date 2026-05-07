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
