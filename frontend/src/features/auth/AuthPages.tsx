import { Link, useLocation } from "react-router-dom";

import { Card } from "../../components/ui/Card";
import { useAuth } from "./AuthProvider";

export function AppHomePage() {
  const { user } = useAuth();
  return <Card title={`Hola, ${user?.name}`}><p className="text-muted">Tu sesión está activa con el rol {user?.role}. Los módulos del sistema se incorporarán en las siguientes fases.</p></Card>;
}

export function AdminAccessPage() {
  return <section className="grid gap-5"><header><p className="eyebrow">Administración</p><h1 className="text-2xl font-bold text-slate-950">Usuarios y roles</h1></header><Card title="Preparado para la siguiente fase"><p className="text-muted">La gestión de usuarios se incorporará en una fase posterior. La autorización de operaciones y datos continúa a cargo del backend.</p></Card></section>;
}

const moduleContent: Record<string, { title: string; description: string }> = {
  "/app/vehicles": { title: "Vehículos", description: "La vista de vehículos se incorporará en una fase posterior." },
  "/app/drivers": { title: "Conductores", description: "La gestión de conductores se incorporará en una fase posterior." },
  "/app/passengers": { title: "Pasajeros", description: "La gestión de pasajeros se incorporará en una fase posterior." },
  "/app/history": { title: "Historial de recorridos", description: "La consulta de recorridos se incorporará en una fase posterior." },
};

export function ModulePlaceholderPage() {
  const { pathname } = useLocation();
  const module = moduleContent[pathname];
  if (!module) return <ForbiddenPage />;
  return <section className="grid gap-5"><header><p className="eyebrow">Módulo de operación</p><h1 className="text-2xl font-bold text-slate-950">{module.title}</h1></header><Card title="Disponible en una siguiente fase"><p className="text-muted">{module.description} Esta pantalla no muestra información simulada.</p></Card></section>;
}

export function ForbiddenPage() {
  return <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center"><h1 className="text-3xl font-bold text-slate-950">Acceso denegado</h1><p className="text-muted">Tu cuenta no tiene permiso para ver esta sección.</p><Link className="text-teal-900 underline focus-visible:outline-2 focus-visible:outline-brand-teal" to="/app">Volver al inicio</Link></main>;
}
