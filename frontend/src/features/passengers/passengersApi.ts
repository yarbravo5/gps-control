import { httpClient } from "../../services/api/httpClient";

export interface Passenger {
  id: number;
  resource_id: number;
  name: string;
  code: string;
  timezone: number;
  custom_fields: Record<string, string>;
  bound_unit_id: number | null;
}

export interface PassengerPage {
  items: Passenger[];
  total: number;
  offset: number;
  limit: number;
}

export async function listPassengers(
  resourceId: number,
  query: string,
  offset: number,
  limit: number,
): Promise<PassengerPage> {
  const response = await httpClient.get<PassengerPage>("/passengers", {
    params: { resource_id: resourceId, ...(query ? { q: query } : {}), offset, limit },
  });
  return response.data;
}

export interface PassengerWritePayload {
  name: string;
  code: string;
  phone: string;
  timezone: number;
  custom_fields: Record<string, string>;
  remove_custom_fields?: string[];
}

export async function createPassenger(resourceId: number, payload: PassengerWritePayload) {
  const response = await httpClient.post<Passenger>("/passengers", {
    resource_id: resourceId,
    ...payload,
  });
  return response.data;
}

export async function updatePassenger(
  resourceId: number,
  passengerId: number,
  payload: PassengerWritePayload,
) {
  const response = await httpClient.patch<Passenger>(`/passengers/${passengerId}`, payload, {
    params: { resource_id: resourceId },
  });
  return response.data;
}

export async function deletePassenger(resourceId: number, passengerId: number): Promise<void> {
  await httpClient.delete(`/passengers/${passengerId}`, { params: { resource_id: resourceId } });
}

export async function setPassengerBinding(
  resourceId: number,
  passengerId: number,
  unitId: number,
  bind: boolean,
): Promise<void> {
  const url = `/passengers/${passengerId}/bindings`;
  const payload = { resource_id: resourceId, unit_id: unitId };
  if (bind) await httpClient.post(url, payload);
  else await httpClient.delete(url, { data: payload });
}