from typing import Protocol


class AccountState(Protocol):
    is_active: bool
    is_blocked: bool


def can_access_application(user: AccountState) -> bool:
    return bool(user.is_active and not user.is_blocked)
