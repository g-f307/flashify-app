MIN_PASSWORD_LENGTH = 8
MAX_BCRYPT_PASSWORD_BYTES = 72


def validate_password(password: str) -> str:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError("A senha deve ter pelo menos 8 caracteres.")
    if len(password.encode("utf-8")) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError("A senha deve ter no máximo 72 bytes.")
    return password
