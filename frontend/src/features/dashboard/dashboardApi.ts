import { httpClient } from "../../services/api/httpClient";

export interface FleetDashboard {
  total_vehicles: number;
  moving_vehicles: number;
  stopped_vehicles: number;
  no_signal_vehicles: number;
  vehicles_with_driver: number;
  vehicles_without_driver: number;
  total_drivers: number;
  total_passengers: number;
}

export async function getFleetDashboard(): Promise<FleetDashboard> {
  const response = await httpClient.get<FleetDashboard>("/dashboard");
  return response.data;
}