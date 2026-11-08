import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.api_router import router as api_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.middleware import SecurityHeadersMiddleware, apply_security_headers


logger = logging.getLogger("app.errors")
HTTP_TITLES = {
    400: "Solicitud no válida",
    401: "No autenticado",
    403: "Acceso denegado",
    404: "Recurso no encontrado",
    409: "Conflicto",
    422: "Datos no válidos",
    429: "Demasiadas solicitudes",
    500: "Error interno del servidor",
    502: "Servicio externo no disponible",
}


class ProblemError(BaseModel):
    loc: list[str]
    msg: str
    type: str


class ProblemDetails(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str
    errors: list[ProblemError] | None = None


PROBLEM_RESPONSES = {
    code: {"model": ProblemDetails, "description": "RFC 7807 Problem Details"}
    for code in (400, 401, 403, 404, 409, 422, 429, 500, 502)
}

is_production = settings.environment.strip().lower() == "production"

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
    responses=PROBLEM_RESPONSES,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    response = JSONResponse(
        status_code=500,
        media_type="application/problem+json",
        content=_problem(
            request,
            status_code=500,
            detail="Error interno del servidor.",
        ),
    )
    apply_security_headers(response, path=request.url.path)
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "La solicitud no pudo completarse."
    response = JSONResponse(
        status_code=exc.status_code,
        media_type="application/problem+json",
        content=_problem(request, status_code=exc.status_code, detail=detail),
        headers=exc.headers,
    )
    apply_security_headers(response, path=request.url.path)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    errors = [
        {
            "loc": [str(part) for part in error.get("loc", ())],
            "msg": str(error.get("msg", "Dato no válido.")),
            "type": str(error.get("type", "value_error")),
        }
        for error in exc.errors()
    ]
    response = JSONResponse(
        status_code=422,
        media_type="application/problem+json",
        content={
            **_problem(
                request,
                status_code=422,
                detail="La solicitud contiene datos no válidos.",
            ),
            "errors": errors,
        },
    )
    apply_security_headers(response, path=request.url.path)
    return response


def _problem(request: Request, *, status_code: int, detail: str) -> dict[str, object]:
    try:
        title = HTTP_TITLES.get(status_code, HTTPStatus(status_code).phrase)
    except ValueError:
        title = "Error de solicitud"
    return {
        "type": "about:blank",
        "title": title,
        "status": status_code,
        "detail": detail,
        "instance": request.url.path,
    }


app.include_router(health_router)
app.include_router(api_router, prefix="/api/v1")


def custom_openapi() -> dict[str, object]:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    for path in schema.get("paths", {}).values():
        if not isinstance(path, dict):
            continue
        for operation in path.values():
            if not isinstance(operation, dict):
                continue
            responses = operation.get("responses", {})
            if not isinstance(responses, dict):
                continue
            for response in responses.values():
                if not isinstance(response, dict) or response.get("description") != "RFC 7807 Problem Details":
                    continue
                content = response.get("content", {})
                if isinstance(content, dict) and "application/json" in content:
                    content["application/problem+json"] = content.pop("application/json")
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi
