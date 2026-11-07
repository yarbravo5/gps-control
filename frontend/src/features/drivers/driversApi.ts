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
): Promise<DriverPage> {
  const response = await httpClient.get<DriverPage>("/drivers", {
    params: { resource_id: resourceId, ...(query ? { q: query } : {}), offset, limit },
  });
  return response.data;
}