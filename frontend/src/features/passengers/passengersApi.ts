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