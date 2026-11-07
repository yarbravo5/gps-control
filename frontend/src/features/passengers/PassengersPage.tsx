import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { TextField } from "../../components/ui/TextField";
import { ResourcePicker } from "../foundation/ResourcePicker";
import { listAllResources } from "../foundation/resourcesApi";
import { listPassengers } from "./passengersApi";

const PAGE_SIZE = 20;

export function PassengersPage() {
  const [resourceId, setResourceId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const resourcesQuery = useQuery({ queryKey: ["wialon-resources"], queryFn: listAllResources });
  const resources = resourcesQuery.data ?? [];
  const selectedResourceId = resourceId ?? resources[0]?.id ?? null;
  const passengersQuery = useQuery({
    queryKey: ["passengers", selectedResourceId, query, offset],
    queryFn: () => listPassengers(selectedResourceId as number, query, offset, PAGE_SIZE),
    enabled: selectedResourceId !== null,
  });
  const page = passengersQuery.data;

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setOffset(0);
  };

  return (
    <section aria-labelledby="passengers-title" className="grid gap-5">
      <header>
        <p className="eyebrow">Personas vinculadas</p>
        <h1 className="text-2xl font-bold text-slate-950" id="passengers-title">Pasajeros</h1>
      </header>
      {resourcesQuery.isPending ? <LoadingState label="Consultando recursos Wialon" /> : null}
      {resourcesQuery.isError ? <ErrorState description="No fue posible consultar los recursos Wialon." onRetry={() => void resourcesQuery.refetch()} /> : null}
      {resourcesQuery.data && resources.length === 0 ? <EmptyState title="No hay recursos disponibles" description="La cuenta Wialon no devolvió recursos para consultar pasajeros." /> : null}
      {selectedResourceId !== null ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(14rem,1.3fr)] sm:items-end">
            <ResourcePicker resources={resources} selectedResourceId={selectedResourceId} onChange={(id) => { setResourceId(id); setOffset(0); }} />
            <form className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end" onSubmit={submitSearch}>
              <TextField label="Buscar pasajero" onChange={(event) => setSearchInput(event.target.value)} value={searchInput} />
              <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" type="submit">Buscar</button>
            </form>
          </div>
          {passengersQuery.isPending ? <LoadingState label="Consultando pasajeros" /> : null}
          {passengersQuery.isError ? <ErrorState description="No fue posible consultar los pasajeros." onRetry={() => void passengersQuery.refetch()} /> : null}
          {page?.items.length === 0 ? <EmptyState title="No hay pasajeros en este recurso" description={query ? "Cambia el término de búsqueda para consultar otros pasajeros." : "Los pasajeros de Wialon aparecerán aquí."} /> : null}
          {page && page.items.length > 0 ? <>
            <p aria-live="polite" className="text-sm text-muted">{page.total} pasajeros · mostrando {page.offset + 1}–{Math.min(page.offset + page.items.length, page.total)}</p>
            <ul aria-label="Lista de pasajeros" className="grid list-none gap-3 p-0">
              {page.items.map((passenger) => <li className="rounded-card border border-slate-200 bg-white p-4" key={passenger.id}>
                <article className="grid gap-3 sm:grid-cols-[minmax(10rem,1fr)_repeat(3,minmax(7rem,auto))] sm:items-center">
                  <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{passenger.name}</h2><p className="mt-1 text-sm text-muted">Código {passenger.code || "sin código"}</p></div>
                  <PersonDetail label="Vehículo" value={passenger.bound_unit_id === null ? "Sin asignar" : `Unidad ${passenger.bound_unit_id}`} />
                  <PersonDetail label="Zona horaria Wialon" value={`${passenger.timezone} min`} />
                  <PersonDetail label="Campos personalizados" value={String(Object.keys(passenger.custom_fields).length)} />
                </article>
              </li>)}
            </ul>
            <nav aria-label="Paginación de pasajeros" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <span className="text-sm text-muted">Página {Math.floor(offset / PAGE_SIZE) + 1} de {Math.max(1, Math.ceil(page.total / PAGE_SIZE))}</span>
              <div className="flex gap-2">
                <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
                <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset + PAGE_SIZE >= page.total} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Siguiente</button>
              </div>
            </nav>
          </> : null}
        </>
      ) : null}
    </section>
  );
}

function PersonDetail({ label, value }: { label: string; value: string }) {
  return <dl className="m-0 grid gap-1 text-sm"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="m-0 break-words text-slate-800">{value}</dd></dl>;
}