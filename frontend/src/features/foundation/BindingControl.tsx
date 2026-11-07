import { useState } from "react";

import { ApiError } from "../../services/api/apiError";
import type { Vehicle } from "../vehicles/vehiclesApi";

interface BindingControlProps {
  label: string;
  personId: number;
  unitId: number | null;
  vehicles: Vehicle[];
  isLoadingVehicles: boolean;
  isErrorVehicles: boolean;
  onRetryVehicles: () => void;
  isPending: boolean;
  error: unknown;
  onBind: (unitId: number) => void;
  onUnbind: () => void;
}

export function BindingControl({
  label,
  personId,
  unitId,
  vehicles,
  isLoadingVehicles,
  isErrorVehicles,
  onRetryVehicles,
  isPending,
  error,
  onBind,
  onUnbind,
}: BindingControlProps) {
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [confirmUnbind, setConfirmUnbind] = useState(false);

  return <div className="grid min-w-0 gap-2">
    <span className="text-xs font-medium text-muted">Vinculación</span>
    {unitId !== null ? <>
      <span className="text-sm text-slate-800">Unidad {unitId}</span>
      {confirmUnbind ? <div className="flex flex-wrap gap-2">
        <button className="min-h-10 rounded-control bg-brand-wine px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={() => { onUnbind(); setConfirmUnbind(false); }} type="button">Confirmar desvinculación</button>
        <button className="min-h-10 rounded-control border border-slate-300 px-3 text-xs font-semibold" onClick={() => setConfirmUnbind(false)} type="button">Cancelar</button>
      </div> : <button className="w-fit text-xs font-semibold text-wine-dark underline" onClick={() => setConfirmUnbind(true)} type="button">Desvincular</button>}
    </> : isLoadingVehicles ? <span className="text-sm text-muted">Cargando vehículos…</span> : isErrorVehicles ? <div className="grid justify-items-start gap-1"><span className="text-sm text-wine-dark">No se pudieron cargar los vehículos.</span><button className="text-xs font-semibold text-teal-900 underline" onClick={onRetryVehicles} type="button">Reintentar</button></div> : vehicles.length === 0 ? <span className="text-sm text-muted">No hay vehículos disponibles.</span> : <div className="grid gap-2">
      <label className="sr-only" htmlFor={`binding-${personId}`}>Vehículo para vincular {label}</label>
      <select
        className="min-h-10 rounded-control border border-slate-300 bg-white px-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-teal"
        id={`binding-${personId}`}
        onChange={(event) => setSelectedUnitId(event.target.value)}
        value={selectedUnitId}
      >
        <option value="">Seleccionar vehículo</option>
        {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}
      </select>
      <button
        className="w-fit text-xs font-semibold text-teal-900 underline disabled:opacity-50"
        disabled={!selectedUnitId || isPending}
        onClick={() => onBind(Number(selectedUnitId))}
        type="button"
      >Vincular</button>
    </div>}
    {error ? <p className="text-xs text-wine-dark" role="alert">{error instanceof ApiError ? error.message : "No se pudo actualizar la vinculación."}</p> : null}
  </div>;
}