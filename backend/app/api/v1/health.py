import os

from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/version")
def deployment_version() -> dict[str, str | None]:
    """Expose non-sensitive deployment metadata supplied by the hosting platform."""
    return {
        "commit": os.getenv("RENDER_GIT_COMMIT"),
        "branch": os.getenv("RENDER_GIT_BRANCH"),
    }
