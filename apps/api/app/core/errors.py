from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError


def problem(status: int, title: str, detail: str, request: Request, **extra: Any) -> JSONResponse:
    body: dict[str, Any] = {
        "type": "about:blank",
        "title": title,
        "status": status,
        "detail": detail,
        "instance": str(request.url.path),
    }
    body.update(extra)
    return JSONResponse(status_code=status, content=body, media_type="application/problem+json")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
        title = {
            401: "Unauthorized",
            403: "Forbidden",
            404: "Not Found",
            409: "Conflict",
            429: "Too Many Requests",
            502: "Bad Gateway",
            503: "Service Unavailable",
        }.get(exc.status_code, "Request Error")
        response = problem(exc.status_code, title, str(exc.detail), request)
        if exc.headers:
            response.headers.update(exc.headers)
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Strip pydantic context (input echo, ctx, urls) so submitted payloads
        # and internals are never reflected back to the client.
        errors = [
            {"loc": item.get("loc", []), "msg": item.get("msg", ""), "type": item.get("type", "")}
            for item in exc.errors()
        ]
        return problem(422, "Validation Error", "Request validation failed", request, errors=errors)

    @app.exception_handler(IntegrityError)
    async def integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
        return problem(409, "Conflict", "The resource conflicts with existing data", request)
