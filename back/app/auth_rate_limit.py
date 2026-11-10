import hashlib


class RateLimitExceeded(Exception):
    def __init__(self, retry_after_seconds: int):
        super().__init__("Muitas tentativas de autenticação.")
        self.retry_after_seconds = retry_after_seconds


class LoginRateLimiter:
    def __init__(self, redis_client, *, limit: int, window_seconds: int):
        self.redis_client = redis_client
        self.limit = limit
        self.window_seconds = window_seconds

    @staticmethod
    def _key(client_host: str, identifier: str) -> str:
        normalized = f"{client_host.strip()}:{identifier.strip().casefold()}"
        digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        return f"flashify:auth:login:{digest}"

    def check(self, client_host: str, identifier: str) -> None:
        key = self._key(client_host, identifier)
        pipeline = self.redis_client.pipeline(transaction=True)
        pipeline.incr(key)
        pipeline.expire(key, self.window_seconds)
        attempts, _ = pipeline.execute()

        if int(attempts) > self.limit:
            raise RateLimitExceeded(self.window_seconds)

    def reset(self, client_host: str, identifier: str) -> None:
        self.redis_client.delete(self._key(client_host, identifier))
