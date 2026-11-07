import { useQuery } from "@tanstack/react-query";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { ApiError } from "../../services/api/apiError";
import { getFleetDashboard } from "./dashboardApi";

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["fleet-dashboard"],
    queryFn: getFleetDashboard,
  });

  if (dashboardQuery.isPending) {
    return <LoadingState label="Consultando indicadores de la flota" hint="Los datos se consultan desde Wialon." />;
  }
  if (dashboardQuery.isError) {
    return (
      <ErrorState
        description={dashboardQuery.error instanceof ApiError ? dashboardQuery.error.message : "No fue posible consultar los indicadores. Intenta de nuevo."}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  const data = dashboardQuery.data;
  return (
    <div className="grid gap-7">
      {data.total_vehicles === 0 ? (
        <EmptyState
          title="Aún no hay vehículos para resumir"
          description="Cuando Wialon devuelva unidades para esta cuenta, verás aquí su estado y asignaciones."
        />
      ) : null}
      <section aria-label="Indicadores de flota" className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-slate-200 py-5 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Vehículos" value={data.total_vehicles} />
        <Kpi label="En movimiento" value={data.moving_vehicles} />
        <Kpi label="Detenidos" value={data.stopped_vehicles} />
        <Kpi label="Sin señal" value={data.no_signal_vehicles} />
        <Kpi label="Conductores" value={data.total_drivers} />
        <Kpi label="Pasajeros" value={data.total_passengers} />
      </section>
      <div className="grid gap-7 lg:grid-cols-2 lg:gap-10">
        <DistributionChart
          title="Estado de los vehículos"
          description="Distribución actual de la flota"
          total={data.total_vehicles}
          rows={[
            { label: "En movimiento", value: data.moving_vehicles, color: "bg-brand-teal" },
            { label: "Detenidos", value: data.stopped_vehicles, color: "bg-brand-gray" },
            { label: "Sin señal", value: data.no_signal_vehicles, color: "bg-brand-red" },
          ]}
        />
        <DistributionChart
          title="Asignación de conductores"
          description="Vehículos con vínculo activo"
          total={data.total_vehicles}
          rows={[
            { label: "Con conductor", value: data.vehicles_with_driver, color: "bg-brand-teal" },
            { label: "Sin conductor", value: data.vehicles_without_driver, color: "bg-brand-wine" },
          ]}
        />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <dl className="m-0 grid content-start gap-1">
    <dt className="text-xs font-medium text-muted sm:text-sm">{label}</dt>
    <dd className="m-0 text-2xl font-bold tabular-nums text-slate-950">{value.toLocaleString("es-CO")}</dd>
  </dl>;
}

function DistributionChart({
  title,
  description,
  total,
  rows,
}: {
  title: string;
  description: string;
  total: number;
  rows: { label: string; value: number; color: string }[];
}) {
  return <figure aria-label={title} className="m-0 grid content-start gap-4">
    <figcaption>
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </figcaption>
    <div aria-label={`${title}, total ${total}`} className="grid gap-4" role="list">
      {rows.map((row) => {
        const percentage = total > 0 ? Math.min(100, Math.round((row.value / total) * 100)) : 0;
        return <div className="grid gap-1.5" key={row.label} role="listitem">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-800">{row.label}</span>
            <strong className="tabular-nums text-slate-950">{row.value.toLocaleString("es-CO")}</strong>
          </div>
          <div
            aria-label={`${row.label}: ${row.value} de ${total}`}
            aria-valuemax={Math.max(total, 1)}
            aria-valuemin={0}
            aria-valuenow={row.value}
            className="h-2.5 overflow-hidden rounded-full bg-slate-200"
            role="meter"
          >
            <span className={`block h-full rounded-full ${row.color}`} style={{ width: `${percentage}%` }} />
          </div>
        </div>;
      })}
    </div>
  </figure>;
}