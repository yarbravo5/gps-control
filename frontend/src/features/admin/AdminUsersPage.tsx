import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { createUser, listUsers, resetUserPassword, updateUser } from "./adminApi";
import type { AdminRole, CreateUserPayload, ManagedUser } from "./adminApi";

const PAGE_SIZE = 25;
const roleLabels: Record<AdminRole, string> = {
  admin: "Administrador",
  operator: "Operador",
  viewer: "Visualizador",
};
type FormMode = "create" | "edit" | "reset";

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<FormMode | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("viewer");
  const [isActive, setIsActive] = useState(true);
  const [success, setSuccess] = useState("");
  const usersQuery = useQuery({
    queryKey: ["managed-users", offset],
    queryFn: () => listUsers(offset, PAGE_SIZE),
  });
  const users = usersQuery.data ?? [];

  const refreshUsers = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ["managed-users"] });
    setMode(null);
    setSelectedUser(null);
    setSuccess(message);
  };
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => refreshUsers("Usuario creado. Debe cambiar la contraseña en su primer ingreso."),
  });
  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: { name: string; role: AdminRole; is_active: boolean } }) => updateUser(userId, payload),
    onSuccess: () => refreshUsers("Usuario actualizado."),
  });
  const resetMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) => resetUserPassword(userId, newPassword),
    onSuccess: () => refreshUsers("Credenciales restablecidas. El usuario deberá cambiar la contraseña al ingresar."),
  });

  const openCreate = () => {
    setSelectedUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("viewer");
    setIsActive(true);
    setSuccess("");
    setMode("create");
  };

  const openEdit = (user: ManagedUser) => {
    setSelectedUser(user);
    setName(user.name);
    setRole(user.role);
    setIsActive(user.is_active);
    setSuccess("");
    setMode("edit");
  };

  const openReset = (user: ManagedUser) => {
    setSelectedUser(user);
    setPassword("");
    setSuccess("");
    setMode("reset");
  };

  const submitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "create") {
      createMutation.mutate({ name: name.trim(), email: email.trim(), password, role });
    } else if (mode === "edit" && selectedUser) {
      updateMutation.mutate({ userId: selectedUser.id, payload: { name: name.trim(), role, is_active: isActive } });
    } else if (mode === "reset" && selectedUser) {
      resetMutation.mutate({ userId: selectedUser.id, newPassword: password });
    }
  };

  const mutationError = createMutation.error ?? updateMutation.error ?? resetMutation.error;
  const mutationPending = createMutation.isPending || updateMutation.isPending || resetMutation.isPending;

  return (
    <section aria-labelledby="admin-users-title" className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Administración</p><h1 className="text-2xl font-bold text-slate-950" id="admin-users-title">Usuarios y roles</h1></div>
        <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" onClick={openCreate} type="button">Crear usuario</button>
      </header>
      {success ? <p aria-live="polite" className="text-sm text-teal-900" role="status">{success}</p> : null}
      {mode ? <form aria-label={mode === "create" ? "Crear usuario" : mode === "edit" ? "Editar usuario" : "Restablecer contraseña"} className="grid gap-3 border-y border-slate-200 py-5" onSubmit={submitForm}>
        <h2 className="text-lg font-semibold text-slate-950">{mode === "create" ? "Nuevo usuario" : mode === "edit" ? `Editar ${selectedUser?.email}` : `Restablecer contraseña de ${selectedUser?.email}`}</h2>
        {mode !== "reset" ? <>
          <TextField label="Nombre" maxLength={150} onChange={(event) => setName(event.target.value)} required value={name} />
          {mode === "create" ? <TextField autoComplete="email" label="Correo electrónico" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /> : null}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-slate-800" htmlFor="managed-user-role">Rol</label>
            <select className="min-h-11 rounded-control border border-slate-300 bg-white px-3 text-slate-900" id="managed-user-role" onChange={(event) => setRole(event.target.value as AdminRole)} value={role}>
              <option value="admin">Administrador</option><option value="operator">Operador</option><option value="viewer">Visualizador</option>
            </select>
          </div>
          {mode === "create" ? <TextField autoComplete="new-password" hint="El usuario deberá cambiarla al iniciar sesión por primera vez." label="Contraseña temporal" maxLength={128} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /> : <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800"><input checked={isActive} onChange={(event) => setIsActive(event.target.checked)} type="checkbox" />Cuenta activa</label>}
        </> : <TextField autoComplete="new-password" label="Nueva contraseña temporal" maxLength={128} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />}
        {mutationError ? <p className="text-sm text-wine-dark" role="alert">{mutationError instanceof ApiError ? mutationError.message : "No se pudo completar la operación."}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold disabled:opacity-50" disabled={mutationPending} type="submit">{mutationPending ? "Guardando…" : mode === "reset" ? "Restablecer" : "Guardar"}</button>
          <button className="min-h-11 rounded-control border border-slate-300 px-4 text-sm font-semibold" onClick={() => setMode(null)} type="button">Cancelar</button>
        </div>
      </form> : null}
      {usersQuery.isPending ? <LoadingState label="Consultando usuarios" /> : null}
      {usersQuery.isError ? <ErrorState description="No fue posible consultar los usuarios." onRetry={() => void usersQuery.refetch()} /> : null}
      {usersQuery.data && users.length === 0 ? <EmptyState title="No hay usuarios en esta página" description="Crea un usuario para asignarle un rol de operación." /> : null}
      {users.length > 0 ? <>
        <ul aria-label="Usuarios del sistema" className="grid list-none gap-3 p-0">
          {users.map((user) => <li className="rounded-card border border-slate-200 bg-white p-4" key={user.id}>
            <article className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(8rem,auto))_auto] sm:items-center">
              <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{user.name}</h2><p className="truncate text-sm text-muted">{user.email}</p></div>
              <UserDetail label="Rol" value={roleLabels[user.role]} />
              <UserDetail label="Estado" value={user.is_active ? "Activo" : "Inactivo"} />
              <UserDetail label="Primer ingreso" value={user.must_change_password ? "Debe cambiar contraseña" : "Completado"} />
              <div className="flex flex-wrap gap-2">
                <button aria-label={`Editar ${user.email}`} className="text-sm font-semibold text-teal-900 underline" onClick={() => openEdit(user)} type="button">Editar</button>
                <button aria-label={`Restablecer contraseña de ${user.email}`} className="text-sm font-semibold text-teal-900 underline" onClick={() => openReset(user)} type="button">Restablecer</button>
              </div>
            </article>
          </li>)}
        </ul>
        <nav aria-label="Paginación de usuarios" className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
          <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={users.length < PAGE_SIZE} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Siguiente</button>
        </nav>
      </> : null}
    </section>
  );
}

function UserDetail({ label, value }: { label: string; value: string }) {
  return <dl className="m-0 grid gap-1 text-sm"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="m-0 text-slate-800">{value}</dd></dl>;
}