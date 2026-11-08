import { Link } from "react-router-dom";
import { Suspense, lazy } from "react";

import { useAuth } from "./AuthProvider";
import { DashboardIcon } from "../dashboard/DashboardIcon";

const DashboardPage = lazy(() => import("../dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));

export function AppHomePage() {
  const { user, hasPermission } = useAuth();
  return <section className="grid gap-6" aria-labelledby="dashboard-title">
    <header className="dashboard-page-intro">
      <div className="dashboard-page-intro__copy">
        <p className="dashboard-page-intro__eyebrow"><span className="dashboard-page-intro__eyebrow-mark"/>CENTRO DE OPERACIONES</p>
        <h1 id="dashboard-title">Tu flota, <span>bajo control.</span></h1>
        <p>Hola, {user?.name}. Aquí tienes una lectura clara de lo que pasa en tu operación.</p>
      </div>
      <div aria-hidden="true" className="dashboard-page-intro__art">
        <span className="dashboard-page-intro__orbit dashboard-page-intro__orbit--outer" />
        <span className="dashboard-page-intro__orbit dashboard-page-intro__orbit--inner" />
        <span className="dashboard-page-intro__art-icon"><DashboardIcon name="dashboard" /></span>
        <span className="dashboard-page-intro__mini dashboard-page-intro__mini--vehicle"><DashboardIcon name="vehicle" /></span>
        <span className="dashboard-page-intro__mini dashboard-page-intro__mini--route"><DashboardIcon name="route" /></span>
      </div>
    </header>
    <Suspense fallback={<div aria-live="polite" className="py-5 text-sm text-muted" role="status">Cargando panel de control…</div>}>
      <DashboardPage hasPermission={hasPermission} />
    </Suspense>
  </section>;
}

export function ForbiddenPage() {
  return <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center"><h1 className="text-3xl font-bold text-slate-950">Acceso denegado</h1><p className="text-muted">Tu cuenta no tiene permiso para ver esta sección.</p><Link className="text-teal-900 underline focus-visible:outline-2 focus-visible:outline-brand-teal" to="/app">Volver al inicio</Link></main>;
}
