import { useMutation } from "@tanstack/react-query";

import { downloadCsv } from "./resourcesApi";
import type { ExportKind } from "./resourcesApi";

const labels: Record<ExportKind, string> = {
  vehicles: "vehículos",
  drivers: "conductores",
  passengers: "pasajeros",
};

export function ExportCsvButton({ kind }: { kind: ExportKind }) {
  const exportMutation = useMutation({
    mutationFn: () => downloadCsv(kind),
    onSuccess: (blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `gps-control-${kind}.csv`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    },
  });

  return <div className="grid justify-items-start gap-1">
    <button
      className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-55"
      disabled={exportMutation.isPending}
      onClick={() => exportMutation.mutate()}
      type="button"
    >{exportMutation.isPending ? "Preparando CSV…" : `Exportar ${labels[kind]} CSV`}</button>
    {exportMutation.isError ? <p className="text-sm text-wine-dark" role="alert">No fue posible exportar los datos. Inténtalo nuevamente.</p> : null}
  </div>;
}