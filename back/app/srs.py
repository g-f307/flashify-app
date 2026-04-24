# back/app/srs.py
from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlmodel import Session
from . import models

def calculate_sm2(
    quality: int,        # 0=Errei, 1=Quase, 2=Acertei
    ease_factor: float,
    interval: int,
    repetitions: int,
    initial_success_interval: int,
    initial_partial_interval: int = 1,
) -> Tuple[float, int, int]:
    """
    Implementação adaptada do SM-2 para um fluxo mais imediatista.
    O campo legado interval_days passa a representar horas para novos agendamentos.
    Retorna: (novo_ease_factor, novo_interval_em_horas, novas_repetitions)
    """
    if quality == 2:  # Acertou perfeitamente
        if repetitions == 0:
            interval = initial_success_interval
        else:
            interval = max(1, round(max(interval, 1) * ease_factor))
        repetitions += 1
        ease_factor = ease_factor + 0.1
    elif quality == 1:  # Quase acertou / Difícil
        if repetitions == 0:
            interval = initial_partial_interval
        else:
            interval = max(1, round(max(interval, 1) * ease_factor * 0.8))
        repetitions += 1
        ease_factor = ease_factor - 0.15
    else:  # Errou
        repetitions = 0
        interval = 0  # 0 representa 30 minutos no cálculo de next_review
        ease_factor = ease_factor - 0.2

    ease_factor = max(ease_factor, 1.3)
    return ease_factor, interval, repetitions


def next_review_from_interval(interval: int) -> datetime:
    if interval == 0:
        return datetime.now(timezone.utc) + timedelta(minutes=30)
    return datetime.now(timezone.utc) + timedelta(hours=interval)


def update_flashcard_srs(
    session: Session,
    flashcard: models.Flashcard,
    accuracy: float  # 0.0, 0.5, 1.0 vindo do frontend
) -> models.Flashcard:
    """
    Atualiza os campos SRS do flashcard baseado na resposta do usuário.
    """
    quality = 0
    if accuracy >= 1.0:
        quality = 2
    elif accuracy >= 0.5:
        quality = 1

    new_ease, new_interval, new_reps = calculate_sm2(
        quality=quality,
        ease_factor=flashcard.ease_factor,
        interval=flashcard.interval_days,
        repetitions=flashcard.repetitions,
        initial_success_interval=2,
        initial_partial_interval=1,
    )

    flashcard.ease_factor = new_ease
    flashcard.interval_days = new_interval
    flashcard.repetitions = new_reps
    flashcard.next_review = next_review_from_interval(new_interval)

    session.add(flashcard)
    # Não faz commit aqui - o chamador é responsável pelo commit atômico

    return flashcard


def update_question_srs(
    session: Session,
    question: models.Question,
    is_correct: bool
) -> models.Question:
    """
    Atualiza os campos SRS de uma questão de quiz baseada na tentativa de resposta.
    """
    quality = 2 if is_correct else 0
    
    new_ease, new_interval, new_reps = calculate_sm2(
        quality=quality,
        ease_factor=question.ease_factor,
        interval=question.interval_days,
        repetitions=question.repetitions,
        initial_success_interval=1,
    )

    question.ease_factor = new_ease
    question.interval_days = new_interval
    question.repetitions = new_reps
    question.next_review = next_review_from_interval(new_interval)

    session.add(question)
    # Não faz commit aqui - o chamador é responsável pelo commit atômico

    return question
