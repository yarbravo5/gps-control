import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "../../components/feedback/LoadingState";
import { useAuth } from "./AuthProvider";

const coldStartHint = "El servidor gratuito está iniciando. Esto puede tardar hasta un minuto.";

export function RequireAuth() {
  const { isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState hint={coldStartHint} label="Cargando sesión" />;
  if (!user) return <Navigate replace to="/login" state={{ from: location }} />;
  if (user.must_change_password && location.pathname !== "/change-password") return <Navigate replace to="/change-password" />;
  return <Outlet />;
}

export function RequirePermission({ permission }: { permission: string }) {
  const { hasPermission } = useAuth();
  return hasPermission(permission) ? <Outlet /> : <Navigate replace to="/forbidden" />;
}

export function PublicOnly() {
  const { isLoading, user } = useAuth();
  if (isLoading) return <LoadingState hint={coldStartHint} label="Cargando sesión" />;
  if (user) return <Navigate replace to={user.must_change_password ? "/change-password" : "/app"} />;
  return <Outlet />;
}
