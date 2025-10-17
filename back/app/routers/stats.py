# back/app/routers/stats.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from typing_extensions import Annotated
from typing import List, Optional

from .. import models, security
from ..database import get_session

router = APIRouter(prefix="/stats", tags=["Stats"])
CurrentUser = Annotated[models.User, Depends(security.get_current_user)]

class FlashcardStats(models.SQLModel):
    known: int
    learning: int
    total: int
    progress_percentage: float

class QuizStatSummary(models.SQLModel):
    last_score: Optional[float] = None
    average_score: Optional[float] = None
    total_attempts: int

class DeckStatsResponse(models.SQLModel):
    flashcards: FlashcardStats
    quiz: Optional[QuizStatSummary] = None

@router.get("/document/{document_id}", response_model=DeckStatsResponse)
def get_document_stats(
    document_id: int,
    current_user: CurrentUser,
    session: Session = Depends(get_session)
):
    """
    Obtém estatísticas detalhadas para um documento (deck), incluindo flashcards e quizzes.
    """
    document = session.get(models.Document, document_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado.")

    # --- CORREÇÃO APLICADA AQUI ---
    # A lógica foi reescrita para usar o modelo 'StudyLog' em vez de um modelo inexistente.
    
    total_flashcards = len(document.flashcards)

    # Obter os IDs de todos os flashcards do documento
    flashcard_ids = [fc.id for fc in document.flashcards if fc.id is not None]
    
    studied_flashcards_count = 0
    if flashcard_ids:
        # Contar quantos flashcards distintos foram estudados pelo utilizador para este deck
        studied_flashcards_count = session.exec(
            select(func.count(func.distinct(models.StudyLog.flashcard_id)))
            .where(
                models.StudyLog.user_id == current_user.id,
                models.StudyLog.flashcard_id.in_(flashcard_ids)
            )
        ).one()

    known_flashcards = studied_flashcards_count
    learning_flashcards = total_flashcards - known_flashcards
    flashcard_progress = (known_flashcards / total_flashcards) * 100 if total_flashcards > 0 else 0

    flashcard_stats = FlashcardStats(
        known=known_flashcards,
        learning=learning_flashcards,
        total=total_flashcards,
        progress_percentage=round(flashcard_progress, 2)
    )

    # Estatísticas do Quiz (lógica existente mantida)
    quiz_stats = None
    if document.quiz:
        statement = select(models.QuizAttempt).where(
            models.QuizAttempt.quiz_id == document.quiz.id,
            models.QuizAttempt.user_id == current_user.id
        ).order_by(models.QuizAttempt.completed_at.desc())
        
        attempts = session.exec(statement).all()
        
        total_attempts = len(attempts)
        last_score = attempts[0].score if total_attempts > 0 else None
        
        average_score = None
        if total_attempts > 0:
            total_score = sum(attempt.score for attempt in attempts)
            average_score = round(total_score / total_attempts, 2)

        quiz_stats = QuizStatSummary(
            last_score=last_score,
            average_score=average_score,
            total_attempts=total_attempts
        )
        
    return DeckStatsResponse(flashcards=flashcard_stats, quiz=quiz_stats)