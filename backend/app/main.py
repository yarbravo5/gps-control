from fastapi import FastAPI

from app.api.v1.health import router as health_router


app = FastAPI(
    title="GPS Control API",
    version="1.0.0",
)

app.include_router(health_router)
