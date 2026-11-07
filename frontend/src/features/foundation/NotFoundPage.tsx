import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl content-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-wine">Error 404</p>
      <h1 className="text-3xl font-bold text-slate-950">No encontramos esta página</h1>
      <p className="text-muted">Verifica la dirección o vuelve a la pantalla base.</p>
      <Link className="mx-auto rounded-control px-4 py-2 font-semibold text-teal-900 underline decoration-brand-teal underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-teal" to="/">
        Volver al inicio
      </Link>
    </main>
  );
}
