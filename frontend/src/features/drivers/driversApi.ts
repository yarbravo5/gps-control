import { httpClient } from "../../services/api/httpClient";

export interface Driver {
  id: number;
  resource_id: number;
  name: string;
  code: string;
  description: string;
  phone: string;
  custom_fields: Record<string, string>;
  bound_unit_id: number | null;
}

export interface DriverPage {
  items: Driver[];
  total: number;
  offset: number;
  limit: number;
}

export async function listDrivers(
  resourceId: number,
  query: string,
  offset: number,
  limit: number,
  sort = "name:asc",
): Promise<DriverPage> {
  const [sort_by, sort_order] = sort.split(":");
  const response = await httpClient.get<DriverPage>("/drivers", {
    params: { resource_id: resourceId, ...(query ? { q: query } : {}), offset, limit, sort_by, sort_order },
  });
  return response.data;
}

export interface DriverWritePayload {
  name: string;
  code: string;
  description: string;
  phone: string;
  mobile_password?: string;
  custom_fields: Record<string, string>;
  remove_custom_fields?: string[];
}

export async function createDriver(resourceId: number, payload: Omit<DriverWritePayload, "remove_custom_fields">) {
  const response = await httpClient.post<Driver>("/drivers", { resource_id: resourceId, ...payload });
  return response.data;
}

export async function updateDriver(resourceId: number, driverId: number, payload: DriverWritePayload) {
  const response = await httpClient.patch<Driver>(`/drivers/${driverId}`, payload, {
    params: { resource_id: resourceId },
  });
  return response.data;
}

export async function deleteDriver(resourceId: number, driverId: number): Promise<void> {
  await httpClient.delete(`/drivers/${driverId}`, { params: { resource_id: resourceId } });
}

export async function setDriverBinding(
  resourceId: number,
  driverId: number,
  unitId: number,
  bind: boolean,
): Promise<void> {
  const url = `/drivers/${driverId}/bindings`;
  const payload = { resource_id: resourceId, unit_id: unitId };
  if (bind) await httpClient.post(url, payload);
  else await httpClient.delete(url, { data: payload });
}
