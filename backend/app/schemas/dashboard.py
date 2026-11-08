from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FleetDashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    generated_at: datetime
    total_vehicles: int
    moving_vehicles: int
    stopped_vehicles: int
    no_signal_vehicles: int
    vehicles_with_driver: int
    vehicles_without_driver: int
    total_drivers: int
    total_passengers: int
