import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppHomePage, ForbiddenPage } from "../../features/auth/AuthPages";
import { AppShell } from "../../features/auth/AppShell";
import { ChangePasswordPage } from "../../features/auth/ChangePasswordPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { PublicOnly, RequireAuth, RequirePermission } from "../../features/auth/RouteGuards";
import { NotFoundPage } from "../../features/foundation/NotFoundPage";
import { LandingPage } from "../../features/landing/LandingPage";
import { LoadingState } from "../../components/feedback/LoadingState";

const DriversPage = lazy(() => import("../../features/drivers/DriversPage").then((module) => ({ default: module.DriversPage })));
const PassengersPage = lazy(() => import("../../features/passengers/PassengersPage").then((module) => ({ default: module.PassengersPage })));
const VehiclesPage = lazy(() => import("../../features/vehicles/VehiclesPage").then((module) => ({ default: module.VehiclesPage })));
const HistoryPage = lazy(() => import("../../features/trip-history/HistoryPage").then((module) => ({ default: module.HistoryPage })));
const AdminUsersPage = lazy(() => import("../../features/admin/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })));
const AuditPage = lazy(() => import("../../features/audit/AuditPage").then((module) => ({ default: module.AuditPage })));

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicOnly />}><Route path="/login" element={<LoginPage />} /></Route>
        <Route element={<RequireAuth />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route element={<RequirePermission permission="dashboard:view" />}><Route index element={<AppHomePage />} /></Route>
            <Route element={<RequirePermission permission="vehicles:view" />}><Route path="vehicles" element={<Suspense fallback={<LoadingState label="Cargando vehículos" />}><VehiclesPage /></Suspense>} /></Route>
            <Route element={<RequirePermission permission="drivers:view" />}><Route path="drivers" element={<Suspense fallback={<LoadingState label="Cargando conductores" />}><DriversPage /></Suspense>} /></Route>
            <Route element={<RequirePermission permission="passengers:view" />}><Route path="passengers" element={<Suspense fallback={<LoadingState label="Cargando pasajeros" />}><PassengersPage /></Suspense>} /></Route>
            <Route element={<RequirePermission permission="history:view" />}><Route path="history" element={<Suspense fallback={<LoadingState label="Cargando historial" />}><HistoryPage /></Suspense>} /></Route>
            <Route element={<RequirePermission permission="users:manage" />}><Route path="admin" element={<Suspense fallback={<LoadingState label="Cargando usuarios" />}><AdminUsersPage /></Suspense>} /></Route>
            <Route element={<RequirePermission permission="audit:view" />}><Route path="audit" element={<Suspense fallback={<LoadingState label="Cargando auditoría" />}><AuditPage /></Suspense>} /></Route>
          </Route>
        </Route>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/dashboard" element={<Navigate replace to="/app" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
