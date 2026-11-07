import { httpClient } from "../../services/api/httpClient";

export type VehicleStatus = "moving" | "stopped" | "no_signal";

export interface Vehicle {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  heading_degrees: number | null;
  direction: string | null;
  last_communication: string | null;
  status: VehicleStatus;
}

export interface VehiclePage {
  items: Vehicle[];
  total: number;
  offset: number;
  limit: number;
}

export interface VehicleFilters {
  query: string;
  status: VehicleStatus | "";
  offset: number;
  limit: number;
}

export async function listVehicles(filters: VehicleFilters): Promise<VehiclePage> {
  const response = await httpClient.get<VehiclePage>("/vehicles", {
    params: {
      ...(filters.query ? { q: filters.query } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      offset: filters.offset,
      limit: filters.limit,
    },
  });
  return response.data;
}