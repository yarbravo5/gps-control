import { httpClient } from "../../services/api/httpClient";

export type AdminRole = "admin" | "operator" | "viewer";

export interface ManagedUser {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: AdminRole;
}

export async function listUsers(offset: number, limit: number): Promise<ManagedUser[]> {
  const response = await httpClient.get<ManagedUser[]>("/users", { params: { offset, limit } });
  return response.data;
}

export async function createUser(payload: CreateUserPayload): Promise<ManagedUser> {
  const response = await httpClient.post<ManagedUser>("/users", payload);
  return response.data;
}

export async function updateUser(userId: number, payload: Partial<Pick<ManagedUser, "name" | "role" | "is_active">>): Promise<ManagedUser> {
  const response = await httpClient.patch<ManagedUser>(`/users/${userId}`, payload);
  return response.data;
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<ManagedUser> {
  const response = await httpClient.post<ManagedUser>(`/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
  return response.data;
}