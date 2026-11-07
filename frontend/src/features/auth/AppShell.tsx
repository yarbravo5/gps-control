import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { useAuth } from "./AuthProvider";
import { navigationItems, roleLabels } from "./navigation";

export function AppShell() {
  const { user, logout, hasPermission } = useAuth();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const navigate = useNavigate();

  const signOut = async () => {
    try { await logout(); } catch { /* La sesión local se limpia aunque el servidor no responda. */ }
    navigate("/login", { replace: true });
  };
  const visibleItems = navigationItems.filter((item) => hasPermission(item.permission));

  return <div className="min-h-screen bg-[#f7f4f8] text-slate-950">
    <a className="skip-link" href="#contenido-app">Saltar al contenido</a>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button aria-controls="app-navigation" aria-expanded={mobileNavigationOpen} aria-label={mobileNavigationOpen ? "Cerrar navegación" : "Abrir navegación"} className="mobile-nav-toggle" onClick={() => setMobileNavigationOpen((open) => !open)} type="button"><span aria-hidden="true" className="text-xl leading-none">{mobileNavigationOpen ? "×" : "☰"}</span></button>
          <NavLink aria-label="GPS Control, panel de control" className="flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-brand-teal" to="/app"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-brand-red-action font-black text-white">G</span><span className="text-sm font-extrabold tracking-tight sm:text-base">GPS <span className="text-brand-wine">Control</span></span></NavLink>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-semibold text-slate-900">{user?.name}</p><p className="text-xs text-muted">{user ? roleLabels[user.role] : ""}</p></div>
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-purple-soft text-sm font-bold text-wine-dark">{user?.name.slice(0, 1).toLocaleUpperCase()}</span>
          <Button aria-label="Cerrar sesión" className="min-h-10 px-3 text-xs sm:px-4 sm:text-sm" onClick={() => void signOut()} variant="secondary"><span className="sm:hidden">Salir</span><span className="hidden sm:inline">Cerrar sesión</span></Button>
        </div>
      </div>
    </header>

    <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
      <aside className={`${mobileNavigationOpen ? "block" : "hidden"} app-sidebar md:block`} id="app-navigation">
        <div className="mb-5 border-b border-slate-200 px-4 pb-4 sm:hidden"><p className="font-semibold text-slate-900">{user?.name}</p><p className="mt-1 text-sm text-muted">{user ? roleLabels[user.role] : ""}</p></div>
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Menú principal</p>
        <nav aria-label="Secciones de la aplicación" className="grid gap-1">
          {visibleItems.filter((item) => item.section === "operación").map((item) => <NavItem item={item} key={item.path} onNavigate={() => setMobileNavigationOpen(false)} />)}
        </nav>
        {visibleItems.some((item) => item.section === "administración") ? <><p className="mt-7 px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Administración</p><nav aria-label="Administración" className="grid gap-1">{visibleItems.filter((item) => item.section === "administración").map((item) => <NavItem item={item} key={item.path} onNavigate={() => setMobileNavigationOpen(false)} />)}</nav></> : null}
        <div className="mt-8 rounded-xl border border-teal-900/10 bg-teal-50 p-3"><p className="text-xs font-semibold text-teal-950">Acceso por permisos</p><p className="mt-1 text-xs leading-5 text-teal-900">Las opciones visibles corresponden a los permisos de tu cuenta.</p></div>
      </aside>
      <main className="min-h-[calc(100vh-4rem)] min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-9" id="contenido-app"><Outlet /></main>
    </div>
  </div>;
}

function NavItem({ item, onNavigate }: { item: (typeof navigationItems)[number]; onNavigate: () => void }) {
  return <NavLink end={item.path === "/app"} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal motion-reduce:transition-none ${isActive ? "bg-purple-soft text-wine-dark" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"}`} to={item.path}><span aria-hidden="true" className="grid size-6 place-items-center text-base text-brand-teal">{navGlyphs[item.path] ?? "•"}</span>{item.label}</NavLink>;
}

const navGlyphs: Record<string, string> = { "/app": "⌂", "/app/vehicles": "◇", "/app/drivers": "♙", "/app/passengers": "♧", "/app/history": "↝", "/app/admin": "⚙" };
