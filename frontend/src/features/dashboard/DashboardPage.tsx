import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { ApiError } from "../../services/api/apiError";
import { DashboardIcon } from "./DashboardIcon";
import type { DashboardIconName } from "./DashboardIcon";
import { getFleetDashboard } from "./dashboardApi";

const bogotaDateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

const quickLinks: { label: string; description: string; href: string; permission: string; icon: DashboardIconName }[] = [
  { label: "Explorar vehículos", description: "Ubicación, estado y asignaciones", href: "/app/vehicles", permission: "vehicles:view", icon: "vehicle" },
  { label: "Revisar recorridos", description: "Historial y reproducción de rutas", href: "/app/history", permission: "history:view", icon: "route" },
  { label: "Gestionar usuarios", description: "Cuentas, roles y accesos", href: "/app/admin", permission: "users:manage", icon: "passenger" },
];

export function DashboardPage({ hasPermission = () => true }: { hasPermission?: (permission: string) => boolean }) {
  const dashboardQuery = useQuery({
    queryKey: ["fleet-dashboard"],
    queryFn: getFleetDashboard,
    refetchInterval: () => document.visibilityState === "visible" ? 30_000 : false,
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
  const links = quickLinks.filter((item) => hasPermission(item.permission));

  return (
    <div className="dashboard-content">
      <div className="dashboard-syncbar">
        <div className="dashboard-syncbar__copy">
          <span aria-hidden="true" className="dashboard-live-dot" />
          <span className="dashboard-syncbar__label">Monitoreo conectado</span>
          <span className="dashboard-syncbar__time">Actualizado {bogotaDateTime.format(new Date(data.generated_at))}</span>
        </div>
        <button
          aria-label="Actualizar indicadores de la flota"
          className="dashboard-refresh-button"
          data-pointer-glow="true"
          disabled={dashboardQuery.isFetching}
          onClick={() => void dashboardQuery.refetch()}
          type="button"
        >
          <DashboardIcon className={dashboardQuery.isFetching ? "dashboard-refresh-icon is-spinning" : "dashboard-refresh-icon"} name="refresh" />
          <span>{dashboardQuery.isFetching ? "Actualizando" : "Actualizar"}</span>
        </button>
      </div>

      {data.total_vehicles === 0 ? (
        <EmptyState
          title="Aún no hay vehículos para resumir"
          description="Cuando Wialon devuelva unidades para esta cuenta, verás aquí su estado y asignaciones."
        />
      ) : null}

      <section aria-label="Indicadores de flota" className="dashboard-metrics">
        <Kpi icon="vehicle" label="Vehículos" note="En la flota" tone="red" value={data.total_vehicles} />
        <Kpi icon="moving" label="En movimiento" note="Activos ahora" tone="teal" value={data.moving_vehicles} />
        <Kpi icon="stopped" label="Detenidos" note="Con señal" tone="gray" value={data.stopped_vehicles} />
        <Kpi icon="signal" label="Sin señal" note="Requieren atención" tone="wine" value={data.no_signal_vehicles} />
        <Kpi icon="driver" label="Conductores" note="En operación" tone="teal" value={data.total_drivers} />
        <Kpi icon="passenger" label="Pasajeros" note="Registrados" tone="purple" value={data.total_passengers} />
      </section>

      <section aria-label="Análisis de flota" className="dashboard-analytics">
        <DistributionChart
          icon="vehicle"
          title="Estado de los vehículos"
          description="Distribución actual de la flota"
          total={data.total_vehicles}
          rows={[
            { label: "En movimiento", value: data.moving_vehicles, color: "teal", icon: "moving" },
            { label: "Detenidos", value: data.stopped_vehicles, color: "gray", icon: "stopped" },
            { label: "Sin señal", value: data.no_signal_vehicles, color: "red", icon: "signal" },
          ]}
        />
        <DistributionChart
          icon="driver"
          title="Asignación de conductores"
          description="Vínculos activos en las unidades"
          total={data.total_vehicles}
          rows={[
            { label: "Con conductor", value: data.vehicles_with_driver, color: "teal", icon: "driver" },
            { label: "Sin conductor", value: data.vehicles_without_driver, color: "wine", icon: "passenger" },
          ]}
        />
      </section>

      {links.length ? (
        <section aria-labelledby="dashboard-shortcuts-title" className="dashboard-shortcuts-section">
          <div className="dashboard-section-heading">
            <div><p className="dashboard-section-eyebrow">Siguiente paso</p><h2 id="dashboard-shortcuts-title">Accesos de operación</h2></div>
            <p>Entra directamente a los módulos que tienes habilitados.</p>
          </div>
          <nav aria-label="Accesos rápidos" className="dashboard-shortcuts">
            {links.map((item) => (
              <Link className="dashboard-shortcut" data-pointer-glow="true" key={item.href} to={item.href}>
                <span className="dashboard-shortcut__icon"><DashboardIcon name={item.icon} /></span>
                <span className="dashboard-shortcut__copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                <DashboardIcon className="dashboard-shortcut__arrow" name="arrow" />
              </Link>
            ))}
          </nav>
        </section>
      ) : null}
    </div>
  );
}

function Kpi({
  icon,
  label,
  note,
  tone,
  value,
}: {
  icon: DashboardIconName;
  label: string;
  note: string;
  tone: "red" | "teal" | "gray" | "wine" | "purple";
  value: number;
}) {
  return (
    <article className={`dashboard-metric dashboard-metric--${tone}`}>
      <div className="dashboard-metric__top"><span className="dashboard-metric__icon"><DashboardIcon name={icon} /></span><span className="dashboard-metric__signal">EN VIVO</span></div>
      <dl className="dashboard-metric__data"><dt>{label}</dt><dd>{value.toLocaleString("es-CO")}</dd></dl>
      <p className="dashboard-metric__note">{note}</p>
    </article>
  );
}

function DistributionChart({
  icon,
  title,
  description,
  total,
  rows,
}: {
  icon: DashboardIconName;
  title: string;
  description: string;
  total: number;
  rows: { label: string; value: number; color: string; icon: DashboardIconName }[];
}) {
  return (
    <figure aria-label={title} className="dashboard-chart">
      <figcaption className="dashboard-chart__header">
        <span className="dashboard-chart__icon"><DashboardIcon name={icon} /></span>
        <span><h2>{title}</h2><p>{description}</p></span>
        <span className="dashboard-chart__total"><strong>{total.toLocaleString("es-CO")}</strong><small>Total</small></span>
      </figcaption>
      <div aria-label={`${title}, total ${total}`} className="dashboard-chart__rows" role="list">
        {rows.map((row) => {
          const percentage = total > 0 ? Math.min(100, Math.round((row.value / total) * 100)) : 0;
          return (
            <div className="dashboard-chart-row" key={row.label} role="listitem">
              <div className="dashboard-chart-row__labels">
                <span className="dashboard-chart-row__name"><DashboardIcon name={row.icon} />{row.label}</span>
                <strong>{row.value.toLocaleString("es-CO")}<small>{total > 0 ? ` · ${percentage}%` : ""}</small></strong>
              </div>
              <div
                aria-label={`${row.label}: ${row.value} de ${total}`}
                aria-valuemax={Math.max(total, 1)}
                aria-valuemin={0}
                aria-valuenow={row.value}
                className="dashboard-chart-row__track"
                role="meter"
              >
                <span className={`dashboard-chart-row__bar dashboard-chart-row__bar--${row.color}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
