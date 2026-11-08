import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { listAllVehicles } from "../vehicles/vehiclesApi";
import { getVehicleHistory } from "./historyApi";
import type { HistoryPoint } from "./historyApi";

const HistoryMap = lazy(() => import("./HistoryMap").then((module) => ({ default: module.HistoryMap })));

const MAX_HISTORY_RANGE_MS = 7 * 24 * 60 * 60 * 1000;
const PLAYBACK_INTERVAL_MS = 1_000;
const playbackSpeeds = [1, 2, 4] as const;

type PlaybackSpeed = (typeof playbackSpeeds)[number];

const bogotaDateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "America/Bogota",
});

const bogotaDate = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeZone: "America/Bogota",
});

export function validateHistoryRange(startValue: string, endValue: string): string | null {
  if (!startValue || !endValue) return "Selecciona la fecha y hora de inicio y fin.";
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Revisa las fechas ingresadas.";
  }
  if (start >= end) return "La fecha y hora de inicio debe ser anterior a la fecha de fin.";
  if (end.getTime() - start.getTime() > MAX_HISTORY_RANGE_MS) {
    return "El rango máximo de consulta es de 7 días.";
  }
  return null;
}

function toDateTimeLocal(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function createDefaultRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start: toDateTimeLocal(start), end: toDateTimeLocal(end) };
}

function historyErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 422) {
      return "El periodo contiene demasiados puntos. Consulta un rango más corto (máximo 5.000 puntos).";
    }
    if (error.status === 404) {
      return "El vehículo no existe o no está disponible en Wialon.";
    }
    return error.message;
  }
  return "No fue posible consultar el recorrido. Intenta de nuevo.";
}

export function HistoryPage() {
  const [initialRange] = useState(createDefaultRange);
  const [startValue, setStartValue] = useState(initialRange.start);
  const [endValue, setEndValue] = useState(initialRange.end);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [rangeError, setRangeError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);

  const vehiclesQuery = useQuery({
    queryKey: ["history-vehicles"],
    queryFn: () => listAllVehicles({ query: "", status: "" }),
  });
  const historyQuery = useQuery({
    queryKey: ["vehicle-history", selectedVehicleId, range?.start, range?.end],
    queryFn: () => getVehicleHistory(selectedVehicleId as number, range!.start, range!.end),
    enabled: selectedVehicleId !== null && range !== null,
    retry: false,
  });

  const points = historyQuery.data?.points ?? [];
  const currentPoint = points[Math.min(activeIndex, points.length - 1)] ?? null;
  const selectedVehicle = vehiclesQuery.data?.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;

  useEffect(() => {
    setActiveIndex(0);
    setIsPlaying(false);
  }, [historyQuery.data]);

  useEffect(() => {
    if (isPlaying && points.length > 0 && activeIndex >= points.length - 1) {
      setIsPlaying(false);
    }
  }, [activeIndex, isPlaying, points.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, Math.max(points.length - 1, 0)));
    }, PLAYBACK_INTERVAL_MS / speed);
    return () => clearInterval(timer);
  }, [isPlaying, points.length, speed]);

  const submitRange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateHistoryRange(startValue, endValue);
    setRangeError(error ?? "");
    if (error) {
      setRange(null);
      return;
    }
    setRange({
      start: new Date(startValue).toISOString(),
      end: new Date(endValue).toISOString(),
    });
  };

  const togglePlayback = () => {
    if (points.length < 2) return;
    if (!isPlaying && activeIndex >= points.length - 1) setActiveIndex(0);
    setIsPlaying((playing) => !playing);
  };

  const moveTo = (index: number) => {
    setIsPlaying(false);
    setActiveIndex(Math.max(0, Math.min(index, points.length - 1)));
  };

  return (
    <section className="grid gap-6" aria-labelledby="history-title">
      <header>
        <p className="eyebrow">Trazabilidad de la flota</p>
        <h1 className="text-2xl font-bold text-slate-950" id="history-title">Historial de recorridos</h1>
        <p className="mt-1 text-sm text-muted">Consulta posiciones históricas de Wialon, dibuja la ruta y reproduce el recorrido con su velocidad.</p>
      </header>

      {vehiclesQuery.isPending ? <LoadingState label="Cargando vehículos disponibles" /> : null}
      {vehiclesQuery.isError ? (
        <ErrorState
          description={vehiclesQuery.error instanceof ApiError ? vehiclesQuery.error.message : "No fue posible consultar los vehículos."}
          onRetry={() => void vehiclesQuery.refetch()}
        />
      ) : null}
      {vehiclesQuery.data ? (
        <form className="grid gap-3 rounded-card border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,0.8fr)_minmax(12rem,0.8fr)_auto] lg:items-end" onSubmit={submitRange}>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-800" htmlFor="history-vehicle">Vehículo</label>
            <select
              className="min-h-11 rounded-control border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              id="history-vehicle"
              onChange={(event) => setSelectedVehicleId(event.target.value ? Number(event.target.value) : null)}
              value={selectedVehicleId ?? ""}
            >
              <option value="">Selecciona un vehículo</option>
              {vehiclesQuery.data.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>
              ))}
            </select>
          </div>
          <TextField
            label="Desde"
            onChange={(event) => setStartValue(event.target.value)}
            type="datetime-local"
            value={startValue}
          />
          <TextField
            label="Hasta"
            onChange={(event) => setEndValue(event.target.value)}
            type="datetime-local"
            value={endValue}
          />
          <Button disabled={selectedVehicleId === null} type="submit">Consultar historial</Button>
          <p className="text-sm text-muted lg:col-span-4">Rango máximo: 7 días. Los puntos del recorrido se muestran en America/Bogota.</p>
          {rangeError ? <p className="text-sm text-wine-dark lg:col-span-4" role="alert">{rangeError}</p> : null}
        </form>
      ) : null}

      {historyQuery.isPending && range ? <LoadingState label="Consultando historial del vehículo" hint="Wialon puede tardar unos segundos en responder." /> : null}
      {historyQuery.isError ? (
        <ErrorState
          description={historyErrorMessage(historyQuery.error)}
          onRetry={() => void historyQuery.refetch()}
          title="No pudimos cargar el recorrido"
        />
      ) : null}
      {historyQuery.data && historyQuery.data.total_points === 0 ? (
        <EmptyState
          title="Sin puntos en el periodo"
          description="Wialon no devolvió posiciones válidas para el vehículo y el rango seleccionados. Prueba con otro intervalo."
        />
      ) : null}
      {historyQuery.data && historyQuery.data.total_points > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{selectedVehicle?.name ?? `Vehículo ${historyQuery.data.vehicle_id}`}</h2>
              <p aria-live="polite" className="text-sm text-muted">
                {historyQuery.data.total_points.toLocaleString("es-CO")} puntos en el recorrido · {bogotaDate.format(new Date(historyQuery.data.start_at))} a {bogotaDate.format(new Date(historyQuery.data.end_at))}
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.7fr)]">
            <Suspense fallback={<LoadingState label="Preparando mapa del recorrido" />}>
              <HistoryMap activeIndex={activeIndex} points={points} />
            </Suspense>
            <PlaybackPanel
              activeIndex={activeIndex}
              currentPoint={currentPoint}
              isPlaying={isPlaying}
              onMove={moveTo}
              onSpeedChange={setSpeed}
              onTogglePlayback={togglePlayback}
              points={points}
              speed={speed}
            />
          </div>
        </>
      ) : null}
      {range === null && !historyQuery.isPending && !historyQuery.isError ? (
        <p className="text-sm text-muted">Selecciona un vehículo y un rango de fechas para comenzar.</p>
      ) : null}
    </section>
  );
}

function PlaybackPanel({
  points,
  activeIndex,
  currentPoint,
  isPlaying,
  speed,
  onMove,
  onTogglePlayback,
  onSpeedChange,
}: {
  points: HistoryPoint[];
  activeIndex: number;
  currentPoint: HistoryPoint | null;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onMove: (index: number) => void;
  onTogglePlayback: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}) {
  return (
    <section aria-label="Controles de reproducción" className="grid content-start gap-4 border-y border-slate-200 py-4 xl:border-y-0 xl:border-l xl:pl-5">
      <div>
        <p className="eyebrow">Reproducción</p>
        <h2 className="text-lg font-semibold text-slate-950">Detalle del recorrido</h2>
      </div>
      {currentPoint ? (
        <div aria-live="polite" className="grid gap-2 rounded-card bg-purple-soft p-4">
          <p className="text-xs font-semibold text-muted">Punto {activeIndex + 1} de {points.length.toLocaleString("es-CO")}</p>
          <p className="text-sm font-semibold text-slate-950">{bogotaDateTime.format(new Date(currentPoint.timestamp))}</p>
          <dl className="m-0 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Velocidad</dt>
              <dd className="m-0 font-semibold text-slate-900">{currentPoint.speed_kmh === null ? "Sin dato" : `${currentPoint.speed_kmh} km/h`}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rumbo</dt>
              <dd className="m-0 font-semibold text-slate-900">{currentPoint.heading_cardinal ?? "Sin dato"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Latitud</dt>
              <dd className="m-0 font-semibold text-slate-900">{currentPoint.latitude.toFixed(5)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Longitud</dt>
              <dd className="m-0 font-semibold text-slate-900">{currentPoint.longitude.toFixed(5)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button aria-label="Punto anterior" disabled={activeIndex === 0} onClick={() => onMove(activeIndex - 1)} variant="secondary">Anterior</Button>
        <Button aria-label={isPlaying ? "Pausar reproducción" : "Reproducir recorrido"} disabled={points.length < 2} onClick={onTogglePlayback}>
          {isPlaying ? "Pausar" : "Reproducir"}
        </Button>
        <Button aria-label="Punto siguiente" disabled={activeIndex >= points.length - 1} onClick={() => onMove(activeIndex + 1)} variant="secondary">Siguiente</Button>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="history-position">Posición del recorrido</label>
        <input
          aria-label="Posición del recorrido"
          disabled={points.length < 2}
          id="history-position"
          max={Math.max(points.length - 1, 0)}
          min={0}
          onChange={(event) => onMove(Number(event.target.value))}
          type="range"
          value={activeIndex}
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-slate-800" htmlFor="history-speed">Velocidad de reproducción</label>
        <select
          className="min-h-11 rounded-control border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          id="history-speed"
          onChange={(event) => onSpeedChange(Number(event.target.value) as PlaybackSpeed)}
          value={speed}
        >
          {playbackSpeeds.map((value) => <option key={value} value={value}>{value}x</option>)}
        </select>
      </div>
    </section>
  );
}
