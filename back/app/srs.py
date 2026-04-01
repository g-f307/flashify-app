# back/app/srs.py
from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlmodel import Session
from . import models

def calculate_sm2(
    quality: int,        # 0=Errei, 1=Quase, 2=Acertei
    ease_factor: float,
    interval: int,
    repetitions: int
) -> Tuple[float, int, int]:
    """
    Implementação avançada do algoritmo SM-2.
    Retorna: (novo_ease_factor, novo_interval, novas_repetitions)
    """
    if quality == 2:  # Acertou perfeitamente
        if repetitions == 0:
            interval = 3
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease_factor)
        repetitions += 1
        ease_factor = ease_factor + 0.1
    elif quality == 1:  # Quase acertou / Difícil
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 2
        else:
            interval = round(interval * ease_factor * 0.8)
        repetitions += 1
        ease_factor = ease_factor - 0.15
    else:  # Errou
        repetitions = 0
        interval = 0  # 0 dias representará 12 horas no cálculo de next_review
        ease_factor = ease_factor - 0.2

    ease_factor = max(ease_factor, 1.3)
    return ease_factor, interval, repetitions


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
        repetitions=flashcard.repetitions
    )

    flashcard.ease_factor = new_ease
    flashcard.interval_days = new_interval
    flashcard.repetitions = new_reps
    
    if new_interval == 0:
        flashcard.next_review = datetime.now(timezone.utc) + timedelta(hours=12)
    else:
        flashcard.next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

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
        repetitions=question.repetitions
    )

    question.ease_factor = new_ease
    question.interval_days = new_interval
    question.repetitions = new_reps
    
    if new_interval == 0:
        question.next_review = datetime.now(timezone.utc) + timedelta(hours=12)
    else:
        question.next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

    session.add(question)
    # Não faz commit aqui - o chamador é responsável pelo commit atômico

    return question
