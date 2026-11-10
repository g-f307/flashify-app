import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@db/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")

try:
    from fastapi import HTTPException
    from app import security
    from app.routers import auth
except ModuleNotFoundError:
    HTTPException = None
    security = None
    auth = None


@unittest.skipIf(security is None, "As dependências do backend não estão instaladas no host.")
class AuthIntegrationTests(unittest.TestCase):
    def test_existing_token_is_rejected_after_account_is_blocked(self):
        user = SimpleNamespace(
            email="blocked@example.com",
            is_active=True,
            is_blocked=True,
        )
        token = security.create_access_token(subject=user.email)

        with patch.object(security.crud, "get_user_by_email", return_value=user):
            with self.assertRaises(HTTPException) as context:
                security.get_current_user(session=object(), token=token)

        self.assertEqual(context.exception.status_code, 403)

    def test_blocked_account_cannot_obtain_new_password_login_token(self):
        user = SimpleNamespace(
            email="blocked@example.com",
            is_active=True,
            is_blocked=True,
            hashed_password="unused",
        )
        request = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"))
        form = SimpleNamespace(username=user.email, password="valid-pass")

        with (
            patch.object(auth, "_check_login_rate_limit"),
            patch.object(auth.crud, "get_user_by_username_or_email", return_value=user),
        ):
            with self.assertRaises(HTTPException) as context:
                auth.login_for_access_token(request, form, session=object())

        self.assertEqual(context.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
