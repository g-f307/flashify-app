from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence, TypeVar

T = TypeVar("T")


def _priority_bucket(item: object) -> int:
    """
    Ordena os itens por prioridade de estudo:
    0 = errou, 1 = quase acertou, 2 = acertou, 3 = item novo.
    """
    next_review = getattr(item, "next_review", None)
    if next_review is None:
        return 3

    repetitions = getattr(item, "repetitions", 0)
    interval_days = getattr(item, "interval_days", 0)

    if repetitions == 0:
        return 0

    if repetitions == 1 and interval_days <= 2:
        return 1

    return 2


def _priority_sort_key(indexed_item: tuple[int, T]) -> tuple[int, int, int]:
    index, item = indexed_item
    bucket = _priority_bucket(item)
    next_review = getattr(item, "next_review", None)
    next_review_ts = int(next_review.timestamp()) if next_review else 0
    return bucket, next_review_ts, index


def order_for_start(items: Sequence[T]) -> list[T]:
    """
    Mantém a ordem original quando tudo ainda é novo.
    Quando já existe histórico, prioriza os itens mais difíceis.
    """
    ordered_items = list(items)
    if not ordered_items:
        return ordered_items

    has_history = any(getattr(item, "next_review", None) is not None for item in ordered_items)
    if not has_history:
        return ordered_items

    return [item for _, item in sorted(enumerate(ordered_items), key=_priority_sort_key)]


def order_due_for_review(items: Sequence[T]) -> list[T]:
    """
    Filtra os itens vencidos e os ordena pela mesma prioridade do fluxo de início.
    """
    now = datetime.now(timezone.utc)
    due_items = [
        item
        for item in items
        if getattr(item, "next_review", None) is not None and getattr(item, "next_review") <= now
    ]
    return order_for_start(due_items)
