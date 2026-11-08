from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class FleetDashboardDTO:
    generated_at: datetime
    total_vehicles: int
    moving_vehicles: int
    stopped_vehicles: int
    no_signal_vehicles: int
    vehicles_with_driver: int
    vehicles_without_driver: int
    total_drivers: int
    total_passengers: int
