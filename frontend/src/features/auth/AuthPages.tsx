import { Link } from "react-router-dom";
import { Suspense, lazy } from "react";

import { useAuth } from "./AuthProvider";

const DashboardPage = lazy(() => import("../dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));

export function AppHomePage() {
  const { user } = useAuth();
  return <section className="grid gap-6" aria-labelledby="dashboard-title">
    <header>
      <p className="eyebrow">Resumen de operación</p>
      <h1 className="text-2xl font-bold text-slate-950" id="dashboard-title">Panel de control</h1>
      <p className="mt-1 text-sm text-muted">Hola, {user?.name}. Indicadores actuales de la flota.</p>
    </header>
    <Suspense fallback={<div aria-live="polite" className="py-5 text-sm text-muted" role="status">Cargando panel de control…</div>}>
      <DashboardPage />
    </Suspense>
  </section>;
}

export function ForbiddenPage() {
  return <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center"><h1 className="text-3xl font-bold text-slate-950">Acceso denegado</h1><p className="text-muted">Tu cuenta no tiene permiso para ver esta sección.</p><Link className="text-teal-900 underline focus-visible:outline-2 focus-visible:outline-brand-teal" to="/app">Volver al inicio</Link></main>;
}
