from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing_extensions import Annotated

from .. import crud, models, schemas, security
from ..analytics import track_product_event
from ..database import get_session


router = APIRouter(prefix="/study-feedback", tags=["Study Feedback"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]


def _validate_document_ownership(
    session: Session,
    current_user: models.User,
    document_id: int | None,
) -> models.Document | None:
    if document_id is None:
        return None

    document = crud.get_document(session, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de estudo não encontrada para este usuário.",
        )
    return document


@router.post("/prompt-view", response_model=schemas.GenerationLimitInfo)
def register_study_feedback_prompt_view(
    payload: schemas.StudyFeedbackPromptViewRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    _validate_document_ownership(session, current_user, payload.document_id)

    if crud.mark_feedback_reward_offer_shown(session, current_user):
        track_product_event(
            session,
            "study_feedback_reward_offer_shown",
            user_id=current_user.id,
            document_id=payload.document_id,
            properties={"session_type": payload.session_type},
        )

    return crud.get_user_generation_info(session, current_user)


@router.post("", response_model=schemas.StudyFeedbackSubmitResponse)
def submit_study_feedback(
    payload: schemas.StudyFeedbackSubmitRequest,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
):
    _validate_document_ownership(session, current_user, payload.document_id)

    reward_applied = crud.grant_feedback_generation_bonus(session, current_user)
    generation_limit = crud.get_user_generation_info(session, current_user)

    normalized_feedback = (payload.feedback or "").strip() or None
    track_product_event(
        session,
        "study_feedback_submitted",
        user_id=current_user.id,
        document_id=payload.document_id,
        properties={
            "session_type": payload.session_type,
            "rating": payload.rating,
            "feedback": normalized_feedback,
            "reward_applied": reward_applied,
        },
    )

    return schemas.StudyFeedbackSubmitResponse(
        reward_applied=reward_applied,
        reward_amount=crud.FEEDBACK_GENERATION_BONUS if reward_applied else 0,
        generation_limit=schemas.GenerationLimitInfo.model_validate(generation_limit),
    )
