import { httpClient } from "../../services/api/httpClient";

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export async function listAuditLogs(offset: number, limit: number, sort = "created_at:desc"): Promise<AuditLog[]> {
  const [sort_by, sort_order] = sort.split(":");
  const response = await httpClient.get<AuditLog[]>("/audit", { params: { offset, limit, sort_by, sort_order } });
  return response.data;
}
