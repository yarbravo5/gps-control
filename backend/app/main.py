import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api_router import router as api_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.middleware import SecurityHeadersMiddleware, apply_security_headers


logger = logging.getLogger("app.errors")

is_production = settings.environment.strip().lower() == "production"

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
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
        content={"detail": "Error interno del servidor."},
    )
    apply_security_headers(response, path=request.url.path)
    return response


app.include_router(health_router)
app.include_router(api_router, prefix="/api/v1")
