import { httpClient } from "../../services/api/httpClient";
import type { VehicleStatus } from "../vehicles/vehiclesApi";

export interface HistoryPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading_degrees: number | null;
  heading_cardinal: string | null;
  status: VehicleStatus;
}

export interface VehicleHistory {
  vehicle_id: number;
  start_at: string;
  end_at: string;
  total_points: number;
  points: HistoryPoint[];
}

export async function getVehicleHistory(
  vehicleId: number,
  start: string,
  end: string,
): Promise<VehicleHistory> {
  const response = await httpClient.get<VehicleHistory>(`/vehicles/${vehicleId}/history`, {
    params: { start, end },
  });
  return response.data;
}
