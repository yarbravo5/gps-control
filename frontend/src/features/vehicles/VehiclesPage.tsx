import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { getVehicle, listAllVehicles, listVehicles } from "./vehiclesApi";
import type { Vehicle, VehicleDetail, VehicleStatus } from "./vehiclesApi";

const FleetMap = lazy(() => import("./FleetMap").then((module) => ({ default: module.FleetMap })));

const PAGE_SIZE = 20;
const LIVE_REFRESH_INTERVAL_MS = 30_000;

export function getVehiclePollingInterval(
  visibilityState: DocumentVisibilityState,
): number | false {
  return visibilityState === "visible" ? LIVE_REFRESH_INTERVAL_MS : false;
}

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
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", query, status, offset],
    queryFn: () => listVehicles({ query, status, offset, limit: PAGE_SIZE }),
    refetchInterval: () => getVehiclePollingInterval(document.visibilityState),
    refetchIntervalInBackground: false,
  });
  const fleetQuery = useQuery({
    queryKey: ["vehicle-map", query, status],
    queryFn: () => listAllVehicles({ query, status }),
    refetchInterval: () => getVehiclePollingInterval(document.visibilityState),
    refetchIntervalInBackground: false,
  });
  const detailQuery = useQuery({
    queryKey: ["vehicle-detail", selectedVehicleId],
    queryFn: () => getVehicle(selectedVehicleId as number),
    enabled: selectedVehicleId !== null,
  });

  useEffect(() => {
    const refreshVisibleFleet = () => {
      if (document.visibilityState === "visible") {
        void Promise.all([fleetQuery.refetch(), vehiclesQuery.refetch()]);
      }
    };
    document.addEventListener("visibilitychange", refreshVisibleFleet);
    return () => document.removeEventListener("visibilitychange", refreshVisibleFleet);
  }, [fleetQuery.refetch, vehiclesQuery.refetch]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setOffset(0);
  };

  const page = vehiclesQuery.data;
  const fleet = fleetQuery.data ?? [];
  const firstItem = page && page.total > 0 ? page.offset + 1 : 0;
  const lastItem = page ? Math.min(page.offset + page.items.length, page.total) : 0;

  const selectVehicle = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    const selectedIndex = fleet.findIndex((vehicle) => vehicle.id === vehicleId);
    if (selectedIndex >= 0) setOffset(Math.floor(selectedIndex / PAGE_SIZE) * PAGE_SIZE);
  };

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        {fleetQuery.isPending ? <LoadingState label="Cargando posiciones de la flota" /> : null}
        {fleetQuery.isError ? (
          <ErrorState
            description="No fue posible actualizar las posiciones. La lista de vehículos sigue disponible."
            onRetry={() => void fleetQuery.refetch()}
          />
        ) : null}
        {fleetQuery.data ? (
          <Suspense fallback={<LoadingState label="Preparando mapa de la flota" />}>
            <FleetMap
              onSelectVehicle={selectVehicle}
              selectedVehicleId={selectedVehicleId}
              vehicles={fleet}
            />
          </Suspense>
        ) : null}
        {selectedVehicleId !== null ? (
          <SelectedVehicle
            detail={detailQuery.data}
            error={detailQuery.isError}
            isLoading={detailQuery.isPending}
            onRetry={() => void detailQuery.refetch()}
            vehicle={fleet.find((vehicle) => vehicle.id === selectedVehicleId) ?? null}
          />
        ) : (
          <p className="self-center px-2 text-sm text-muted">Selecciona un marcador o vehículo para sincronizar su ubicación.</p>
        )}
      </div>

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
            {page.items.map((vehicle) => (
              <VehicleItem
                key={vehicle.id}
                onSelect={() => selectVehicle(vehicle.id)}
                selected={vehicle.id === selectedVehicleId}
                vehicle={vehicle}
              />
            ))}
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

function VehicleItem({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: () => void;
}) {
  const coordinates = vehicle.latitude !== null && vehicle.longitude !== null
    ? `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`
    : "Sin posición reportada";
  const communication = vehicle.last_communication
    ? bogotaDate.format(new Date(vehicle.last_communication))
    : "Sin comunicación registrada";

  return (
    <li className={`rounded-card border bg-white p-4 sm:p-5 ${selected ? "border-brand-teal ring-2 ring-brand-teal/20" : "border-slate-200"}`}>
      <article aria-label={vehicle.name} className="grid gap-4 sm:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,auto))] sm:items-center">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <h2 className="truncate font-semibold text-slate-950">{vehicle.name}</h2>
            <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[vehicle.status]}`}>
              {statusLabels[vehicle.status]}
            </span>
          </div>
          <Button aria-pressed={selected} className="shrink-0 px-3 text-xs" onClick={onSelect} variant={selected ? "primary" : "secondary"}>
            {selected ? "Seleccionado" : "Ubicar"}
          </Button>
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

function SelectedVehicle({
  vehicle,
  detail,
  error,
  isLoading,
  onRetry,
}: {
  vehicle: Vehicle | null;
  detail: VehicleDetail | undefined;
  error: boolean;
  isLoading: boolean;
  onRetry: () => void;
}) {
  if (!vehicle) {
    return <p className="self-center px-2 text-sm text-muted">El vehículo seleccionado ya no aparece en los resultados actuales.</p>;
  }
  return (
    <aside aria-label="Detalle del vehículo seleccionado" aria-live="polite" className="grid content-start gap-3 border-y border-slate-200 py-4 xl:border-y-0 xl:border-l xl:pl-5">
      <p className="eyebrow">Vehículo seleccionado</p>
      <h2 className="text-lg font-semibold text-slate-950">{vehicle.name}</h2>
      <p className="text-sm text-muted">{statusLabels[vehicle.status]} · {vehicle.speed_kmh === null ? "Velocidad sin dato" : `${vehicle.speed_kmh} km/h`}</p>
      <p className="text-sm text-muted">{vehicle.latitude === null || vehicle.longitude === null ? "Sin posición válida" : `${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}`}</p>
      {isLoading ? <p aria-live="polite" className="text-sm text-muted">Consultando personas vinculadas…</p> : null}
      {error ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm text-wine-dark" role="alert">No fue posible consultar las personas vinculadas.</p>
          <Button onClick={onRetry} variant="secondary">Reintentar</Button>
        </div>
      ) : null}
      {detail && detail.drivers.length > 0 ? (
        <div className="grid gap-1 text-sm">
          <h3 className="font-semibold text-slate-900">Conductor asignado</h3>
          {detail.drivers.map((driver) => (
            <p className="m-0 text-muted" key={`${driver.id}-${driver.name}`}>
              {driver.name}{driver.phone ? ` · ${driver.phone}` : ""}
            </p>
          ))}
        </div>
      ) : null}
      {detail && detail.drivers.length === 0 ? <p className="text-sm text-muted">No hay conductor vinculado a este vehículo.</p> : null}
      {detail && detail.passengers.length > 0 ? <div className="grid gap-1 text-sm">
        <h3 className="font-semibold text-slate-900">Pasajeros asignados</h3>
        {detail.passengers.map((passenger) => <p className="m-0 text-muted" key={passenger.id}>{passenger.name}{passenger.code ? ` · ${passenger.code}` : ""}</p>)}
      </div> : null}
      {detail && detail.passengers.length === 0 ? <p className="text-sm text-muted">No hay pasajeros vinculados a este vehículo.</p> : null}
    </aside>
  );
}