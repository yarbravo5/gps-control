import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { listVehicles } from "./vehiclesApi";
import type { Vehicle, VehicleStatus } from "./vehiclesApi";

const PAGE_SIZE = 20;

const statusLabels: Record<VehicleStatus, string> = {
  moving: "En movimiento",
  stopped: "Detenido",
  no_signal: "Sin señal",
};

const statusStyles: Record<VehicleStatus, string> = {
  moving: "border-teal-700/20 bg-teal-50 text-teal-900",
  stopped: "border-slate-300 bg-slate-100 text-slate-700",
  no_signal: "border-red-300 bg-red-50 text-red-900",
};

const bogotaDate = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function VehiclesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [offset, setOffset] = useState(0);
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", query, status, offset],
    queryFn: () => listVehicles({ query, status, offset, limit: PAGE_SIZE }),
  });

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setOffset(0);
  };

  const page = vehiclesQuery.data;
  const firstItem = page && page.total > 0 ? page.offset + 1 : 0;
  const lastItem = page ? Math.min(page.offset + page.items.length, page.total) : 0;

  return (
    <section className="grid gap-6" aria-labelledby="vehicles-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Monitoreo de flota</p>
          <h1 className="text-2xl font-bold text-slate-950" id="vehicles-title">Vehículos</h1>
        </div>
        {page ? <p aria-live="polite" className="text-sm text-muted">{page.total} vehículos en la flota</p> : null}
      </header>

      <form className="grid gap-3 rounded-card border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(12rem,1fr)_12rem_auto] sm:items-end" onSubmit={submitSearch}>
        <TextField
          label="Buscar vehículo"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Nombre del vehículo"
          value={searchInput}
        />
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-slate-800" htmlFor="vehicle-status">Estado</label>
          <select
            className="min-h-11 rounded-control border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            id="vehicle-status"
            onChange={(event) => {
              setStatus(event.target.value as VehicleStatus | "");
              setOffset(0);
            }}
            value={status}
          >
            <option value="">Todos los estados</option>
            <option value="moving">En movimiento</option>
            <option value="stopped">Detenido</option>
            <option value="no_signal">Sin señal</option>
          </select>
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      {vehiclesQuery.isPending ? <LoadingState label="Consultando vehículos" hint="El servicio puede tardar unos segundos en iniciar." /> : null}
      {vehiclesQuery.isError ? (
        <ErrorState
          description={vehiclesQuery.error instanceof ApiError ? vehiclesQuery.error.message : "No fue posible consultar la flota. Intenta de nuevo."}
          onRetry={() => void vehiclesQuery.refetch()}
        />
      ) : null}
      {page && page.items.length === 0 ? (
        <EmptyState
          title={query || status ? "No encontramos vehículos con esos filtros" : "Aún no hay vehículos disponibles"}
          description={query || status ? "Cambia la búsqueda o el estado para consultar otros vehículos." : "La flota aparecerá aquí cuando Wialon devuelva unidades."}
        />
      ) : null}
      {page && page.items.length > 0 ? (
        <>
          <ul aria-label="Vehículos encontrados" className="grid list-none gap-3 p-0">
            {page.items.map((vehicle) => <VehicleItem key={vehicle.id} vehicle={vehicle} />)}
          </ul>
          <nav aria-label="Paginación de vehículos" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p aria-live="polite" className="text-sm text-muted">Mostrando {firstItem}–{lastItem} de {page.total}</p>
            <div className="flex gap-2">
              <Button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} variant="secondary">Anterior</Button>
              <Button disabled={offset + PAGE_SIZE >= page.total} onClick={() => setOffset(offset + PAGE_SIZE)} variant="secondary">Siguiente</Button>
            </div>
          </nav>
        </>
      ) : null}
    </section>
  );
}

function VehicleItem({ vehicle }: { vehicle: Vehicle }) {
  const coordinates = vehicle.latitude !== null && vehicle.longitude !== null
    ? `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`
    : "Sin posición reportada";
  const communication = vehicle.last_communication
    ? bogotaDate.format(new Date(vehicle.last_communication))
    : "Sin comunicación registrada";

  return (
    <li className="rounded-card border border-slate-200 bg-white p-4 sm:p-5">
      <article aria-label={vehicle.name} className="grid gap-4 sm:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,auto))] sm:items-center">
        <div className="grid min-w-0 gap-2">
          <h2 className="truncate font-semibold text-slate-950">{vehicle.name}</h2>
          <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[vehicle.status]}`}>
            {statusLabels[vehicle.status]}
          </span>
        </div>
        <VehicleDetail label="Posición" value={coordinates} />
        <VehicleDetail label="Velocidad" value={vehicle.speed_kmh === null ? "Sin dato" : `${vehicle.speed_kmh} km/h`} />
        <VehicleDetail label="Rumbo · última comunicación" value={`${vehicle.direction ?? "Sin rumbo"} · ${communication}`} />
      </article>
    </li>
  );
}

function VehicleDetail({ label, value }: { label: string; value: string }) {
  return <dl className="m-0 grid gap-1 text-sm"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="m-0 break-words text-slate-800">{value}</dd></dl>;
}