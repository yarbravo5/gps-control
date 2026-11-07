export type Role = "admin" | "operator" | "viewer";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  csrf_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  csrf_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
