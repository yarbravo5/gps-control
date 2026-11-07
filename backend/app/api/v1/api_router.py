from fastapi import APIRouter

from app.api.v1 import audit, auth, dashboard, drivers, passengers, resources, users, vehicles


router = APIRouter()
router.include_router(auth.router)
router.include_router(dashboard.router)
router.include_router(resources.router)
router.include_router(users.router)
router.include_router(audit.router)
router.include_router(vehicles.router)
router.include_router(drivers.router)
router.include_router(passengers.router)
