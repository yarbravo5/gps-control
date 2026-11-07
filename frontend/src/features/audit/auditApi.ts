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

export async function listAuditLogs(offset: number, limit: number): Promise<AuditLog[]> {
  const response = await httpClient.get<AuditLog[]>("/audit", { params: { offset, limit } });
  return response.data;
}