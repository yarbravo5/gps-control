import { httpClient } from "../../services/api/httpClient";

export type VehicleStatus = "moving" | "stopped" | "no_signal";

export interface VehicleCustomField {
  id: number;
  name: string;
  value: string;
}

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
  custom_fields: VehicleCustomField[];
}

export interface VehicleCustomFieldInput {
  id?: number | null;
  name: string;
  value: string;
}

export interface VehicleCustomFieldsUpdatePayload {
  fields: VehicleCustomFieldInput[];
  remove_field_ids?: number[];
}

export interface VehicleDriver {
  id: number;
  name: string;
  phone: string | null;
}

export interface VehiclePassenger {
  id: number;
  name: string;
  code: string;
}

export interface VehicleDetail extends Vehicle {
  drivers: VehicleDriver[];
  passengers: VehiclePassenger[];
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

export async function listAllVehicles(
  filters: Pick<VehicleFilters, "query" | "status">,
): Promise<Vehicle[]> {
  const vehicles: Vehicle[] = [];
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await listVehicles({ ...filters, offset, limit });
    vehicles.push(...page.items);
    total = page.total;
    if (page.items.length === 0) break;
    offset += page.items.length;
  }

  return vehicles;
}

export async function getVehicle(vehicleId: number): Promise<VehicleDetail> {
  const response = await httpClient.get<VehicleDetail>(`/vehicles/${vehicleId}`);
  return response.data;
}

export async function updateVehicleCustomFields(
  vehicleId: number,
  payload: VehicleCustomFieldsUpdatePayload,
): Promise<VehicleDetail> {
  const response = await httpClient.patch<VehicleDetail>(
    `/vehicles/${vehicleId}/custom-fields`,
    payload,
  );
  return response.data;
}