export type DashboardIconName =
  | "dashboard"
  | "vehicle"
  | "moving"
  | "stopped"
  | "signal"
  | "driver"
  | "passenger"
  | "route"
  | "refresh"
  | "menu"
  | "close"
  | "arrow";

export function DashboardIcon({
  name,
  className = "",
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const shared = {
    "aria-hidden": true as const,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "dashboard":
      return <svg {...shared}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="4" rx="1.5"/><rect x="13.5" y="10.5" width="7" height="10" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/></svg>;
    case "vehicle":
      return <svg {...shared}><path d="M4 14.5 5.5 9h13l1.5 5.5v4H4z"/><path d="m6 9 1.5-3h9L18 9M4 14.5h16M7 18.5v1M17 18.5v1"/><circle cx="7" cy="14.5" r="1"/><circle cx="17" cy="14.5" r="1"/></svg>;
    case "moving":
      return <svg {...shared}><path d="M4 12h13M12 6l6 6-6 6"/><path d="M5 6v12"/></svg>;
    case "stopped":
      return <svg {...shared}><circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5v5M14.5 9.5v5"/></svg>;
    case "signal":
      return <svg {...shared}><path d="M4 18.5h2M8 15v3.5M12 11v7.5M16 7v11.5M20 4v14.5"/></svg>;
    case "driver":
    case "passenger":
      return <svg {...shared}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.4-3.2 2.3-5 5.5-5s5.1 1.8 5.5 5z"/><path d="M15 5.2a3.2 3.2 0 0 1 0 6.1M17 14.4c2.1.7 3.2 2.2 3.5 4.6h-4"/></svg>;
    case "route":
      return <svg {...shared}><circle cx="6" cy="18" r="2.3"/><circle cx="18" cy="6" r="2.3"/><path d="M8 18h2.5a4 4 0 0 0 4-4V10a4 4 0 0 1 4-4"/></svg>;
    case "refresh":
      return <svg {...shared}><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A6.8 6.8 0 0 1 18 7l2 5M4 12l2 5a6.8 6.8 0 0 0 11.9-2"/></svg>;
    case "menu":
      return <svg {...shared}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case "close":
      return <svg {...shared}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "arrow":
      return <svg {...shared}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
  }
}
