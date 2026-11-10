import unittest

try:
    from pydantic import ValidationError
    from app.schemas import UserCreate, UserPasswordUpdate
except ModuleNotFoundError:
    ValidationError = None
    UserCreate = None
    UserPasswordUpdate = None


@unittest.skipIf(UserCreate is None, "As dependências do backend não estão instaladas no host.")
class SchemaIntegrationTests(unittest.TestCase):
    def test_registration_schema_applies_password_policy(self):
        with self.assertRaises(ValidationError):
            UserCreate(username="student", email="student@example.com", password="short")

    def test_password_change_schema_applies_password_policy(self):
        with self.assertRaises(ValidationError):
            UserPasswordUpdate(current_password="valid-pass", new_password="short")


if __name__ == "__main__":
    unittest.main()
