import unittest
from types import SimpleNamespace

from app.account_policy import can_access_application


class AccountPolicyTests(unittest.TestCase):
    def test_blocked_user_cannot_access_application(self):
        user = SimpleNamespace(is_active=True, is_blocked=True)

        self.assertFalse(can_access_application(user))

    def test_inactive_user_cannot_access_application(self):
        user = SimpleNamespace(is_active=False, is_blocked=False)

        self.assertFalse(can_access_application(user))

    def test_active_unblocked_user_can_access_application(self):
        user = SimpleNamespace(is_active=True, is_blocked=False)

        self.assertTrue(can_access_application(user))


if __name__ == "__main__":
    unittest.main()
