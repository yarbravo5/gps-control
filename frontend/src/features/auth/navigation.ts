export interface NavigationItem {
  label: string;
  path: string;
  permission: string;
  section: "operación" | "administración";
}

export const navigationItems: NavigationItem[] = [
  { label: "Panel de control", path: "/app", permission: "dashboard:view", section: "operación" },
  { label: "Vehículos", path: "/app/vehicles", permission: "vehicles:view", section: "operación" },
  { label: "Conductores", path: "/app/drivers", permission: "drivers:view", section: "operación" },
  { label: "Pasajeros", path: "/app/passengers", permission: "passengers:view", section: "operación" },
  { label: "Historial de recorridos", path: "/app/history", permission: "history:view", section: "operación" },
  { label: "Usuarios y roles", path: "/app/admin", permission: "users:manage", section: "administración" },
];

export const roleLabels = { admin: "Administrador", operator: "Operador", viewer: "Visualizador" } as const;
