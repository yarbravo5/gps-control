export interface SortOption {
  value: string;
  label: string;
}

export function SortSelect({
  label = "Ordenar por",
  options,
  value,
  onChange,
}: {
  label?: string;
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-800">
      {label}
      <select
        className="min-h-11 w-full min-w-0 rounded-control border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
