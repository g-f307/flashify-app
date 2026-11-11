"""Sanitized provider errors; only transient failures are retryable."""


class AIError(Exception):
    retryable = False


class AIConfigurationError(AIError):
    pass


class AIAuthenticationError(AIError):
    pass


class AIInvalidResponseError(AIError):
    pass


class AIRateLimitError(AIError):
    retryable = True

    def __init__(self, message: str, retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class AITimeoutError(AIError):
    retryable = True


class AIProviderUnavailableError(AIError):
    retryable = True
