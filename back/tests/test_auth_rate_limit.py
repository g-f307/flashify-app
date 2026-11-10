import unittest

from app.auth_rate_limit import LoginRateLimiter, RateLimitExceeded


class FakePipeline:
    def __init__(self, store):
        self.store = store
        self.key = None

    def incr(self, key):
        self.key = key
        return self

    def expire(self, key, _window_seconds):
        self.key = key
        return self

    def execute(self):
        self.store[self.key] = self.store.get(self.key, 0) + 1
        return [self.store[self.key], True]


class FakeRedis:
    def __init__(self):
        self.store = {}

    def pipeline(self, transaction=True):
        self.transaction = transaction
        return FakePipeline(self.store)

    def delete(self, key):
        self.store.pop(key, None)


class LoginRateLimiterTests(unittest.TestCase):
    def test_rejects_attempt_after_configured_limit(self):
        limiter = LoginRateLimiter(FakeRedis(), limit=2, window_seconds=300)

        limiter.check("127.0.0.1", "user@example.com")
        limiter.check("127.0.0.1", "user@example.com")

        with self.assertRaises(RateLimitExceeded):
            limiter.check("127.0.0.1", "user@example.com")

    def test_successful_login_resets_counter(self):
        limiter = LoginRateLimiter(FakeRedis(), limit=1, window_seconds=300)
        limiter.check("127.0.0.1", "user@example.com")

        limiter.reset("127.0.0.1", "user@example.com")

        limiter.check("127.0.0.1", "user@example.com")

    def test_identifier_is_not_exposed_in_storage_key(self):
        redis = FakeRedis()
        limiter = LoginRateLimiter(redis, limit=2, window_seconds=300)

        limiter.check("127.0.0.1", "Private.User@example.com")

        stored_key = next(iter(redis.store))
        self.assertNotIn("private.user@example.com", stored_key.lower())


if __name__ == "__main__":
    unittest.main()
