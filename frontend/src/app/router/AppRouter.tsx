import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminAccessPage, AppHomePage, ForbiddenPage, ModulePlaceholderPage } from "../../features/auth/AuthPages";
import { AppShell } from "../../features/auth/AppShell";
import { ChangePasswordPage } from "../../features/auth/ChangePasswordPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { PublicOnly, RequireAuth, RequirePermission } from "../../features/auth/RouteGuards";
import { NotFoundPage } from "../../features/foundation/NotFoundPage";
import { LandingPage } from "../../features/landing/LandingPage";
import { VehiclesPage } from "../../features/vehicles/VehiclesPage";

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
            <Route element={<RequirePermission permission="vehicles:view" />}><Route path="vehicles" element={<VehiclesPage />} /></Route>
            <Route element={<RequirePermission permission="drivers:view" />}><Route path="drivers" element={<ModulePlaceholderPage />} /></Route>
            <Route element={<RequirePermission permission="passengers:view" />}><Route path="passengers" element={<ModulePlaceholderPage />} /></Route>
            <Route element={<RequirePermission permission="history:view" />}><Route path="history" element={<ModulePlaceholderPage />} /></Route>
            <Route element={<RequirePermission permission="users:manage" />}><Route path="admin" element={<AdminAccessPage />} /></Route>
          </Route>
        </Route>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="/dashboard" element={<Navigate replace to="/app" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
