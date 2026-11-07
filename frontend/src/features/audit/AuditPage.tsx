import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { listAuditLogs } from "./auditApi";

const PAGE_SIZE = 25;
const bogotaDate = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function AuditPage() {
  const [offset, setOffset] = useState(0);
  const auditQuery = useQuery({
    queryKey: ["audit-logs", offset],
    queryFn: () => listAuditLogs(offset, PAGE_SIZE),
  });
  const logs = auditQuery.data ?? [];

  return (
    <section aria-labelledby="audit-title" className="grid gap-5">
      <header><p className="eyebrow">Administración</p><h1 className="text-2xl font-bold text-slate-950" id="audit-title">Registro de auditoría</h1></header>
      {auditQuery.isPending ? <LoadingState label="Consultando eventos de auditoría" /> : null}
      {auditQuery.isError ? <ErrorState description="No fue posible consultar el registro de auditoría." onRetry={() => void auditQuery.refetch()} /> : null}
      {auditQuery.data && logs.length === 0 ? <EmptyState title="No hay eventos de auditoría" description="Los cambios registrados aparecerán en esta lista." /> : null}
      {logs.length > 0 ? <>
        <p aria-live="polite" className="text-sm text-muted">Eventos {offset + 1}–{offset + logs.length}</p>
        <ul aria-label="Eventos de auditoría" className="grid list-none gap-3 p-0">
          {logs.map((log) => <li className="border-b border-slate-200 py-3" key={log.id}>
            <article className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_repeat(3,minmax(8rem,auto))] sm:items-center">
              <div className="min-w-0"><h2 className="break-words font-semibold text-slate-950">{log.action}</h2><p className="mt-1 text-sm text-muted">{log.entity ?? "Evento del sistema"}{log.entity_id ? ` · ${log.entity_id}` : ""}</p></div>
              <AuditDetail label="Actor" value={log.user_id === null ? "Sistema" : `Usuario #${log.user_id}`} />
              <AuditDetail label="Fecha (Bogotá)" value={bogotaDate.format(new Date(log.created_at))} />
            </article>
          </li>)}
        </ul>
        <nav aria-label="Paginación de auditoría" className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
          <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={logs.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Siguiente</button>
        </nav>
      </> : null}
    </section>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return <dl className="m-0 grid gap-1 text-sm"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="m-0 break-words text-slate-800">{value}</dd></dl>;
}