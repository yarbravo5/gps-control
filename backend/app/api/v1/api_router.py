from fastapi import APIRouter

from app.api.v1 import audit, auth, drivers, passengers, users, vehicles


router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(audit.router)
router.include_router(vehicles.router)
router.include_router(drivers.router)
router.include_router(passengers.router)
