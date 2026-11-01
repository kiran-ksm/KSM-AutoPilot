"""
Domain exceptions used across Lambda functions.

Raising these from business logic allows handler functions to catch them and
return appropriate HTTP status codes without repeating error-handling logic.
"""


class KsmBaseError(Exception):
    """Base class for all KSM domain errors."""
    def __init__(self, message: str, status_code: int = 500, code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


class NotFoundError(KsmBaseError):
    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", status_code=404, code="NOT_FOUND")


class ValidationError(KsmBaseError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400, code="VALIDATION_ERROR")


class AuthorizationError(KsmBaseError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403, code="FORBIDDEN")


class ConflictError(KsmBaseError):
    def __init__(self, message: str):
        super().__init__(message, status_code=409, code="CONFLICT")
