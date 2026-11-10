import unittest

from app.password_policy import validate_password


class PasswordSchemaTests(unittest.TestCase):
    def test_registration_rejects_password_shorter_than_eight_characters(self):
        with self.assertRaises(ValueError):
            validate_password("1234567")

    def test_rejects_password_longer_than_bcrypt_byte_limit(self):
        with self.assertRaises(ValueError):
            validate_password("á" * 37)

    def test_accepts_password_with_supported_length(self):
        self.assertEqual(validate_password("valid-pass"), "valid-pass")


if __name__ == "__main__":
    unittest.main()
