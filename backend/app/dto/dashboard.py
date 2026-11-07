from dataclasses import dataclass


@dataclass(frozen=True)
class FleetDashboardDTO:
    total_vehicles: int
    moving_vehicles: int
    stopped_vehicles: int
    no_signal_vehicles: int
    vehicles_with_driver: int
    vehicles_without_driver: int
    total_drivers: int
    total_passengers: int