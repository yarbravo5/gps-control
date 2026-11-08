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

export interface AuditLogPage {
  items: AuditLog[];
  total: number;
  offset: number;
  limit: number;
}

export async function listAuditLogs(offset: number, limit: number, sort = "created_at:desc", query = ""): Promise<AuditLogPage> {
  const [sort_by, sort_order] = sort.split(":");
  const response = await httpClient.get<AuditLogPage>("/audit", { params: { offset, limit, sort_by, sort_order, ...(query ? { q: query } : {}) } });
  return response.data;
}
