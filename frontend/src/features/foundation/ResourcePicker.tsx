import type { ResourceSummary } from "./resourcesApi";

interface ResourcePickerProps {
  resources: ResourceSummary[];
  selectedResourceId: number | null;
  onChange: (resourceId: number) => void;
}

export function ResourcePicker({ resources, selectedResourceId, onChange }: ResourcePickerProps) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-sm font-medium text-slate-800" htmlFor="wialon-resource">Recurso Wialon</label>
      <select
        className="min-h-11 w-full rounded-control border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
        id="wialon-resource"
        onChange={(event) => onChange(Number(event.target.value))}
        value={selectedResourceId ?? ""}
      >
        {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
      </select>
    </div>
  );
}