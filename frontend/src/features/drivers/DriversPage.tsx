import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { useAuth } from "../auth/AuthProvider";
import { CustomFieldsEditor } from "../foundation/CustomFieldsEditor";
import { ExportCsvButton } from "../foundation/ExportCsvButton";
import { ResourcePicker } from "../foundation/ResourcePicker";
import { listAllResources } from "../foundation/resourcesApi";
import { createDriver, deleteDriver, listDrivers, setDriverBinding, updateDriver } from "./driversApi";
import type { Driver, DriverWritePayload } from "./driversApi";
import { BindingControl } from "../foundation/BindingControl";
import { listAllVehicles } from "../vehicles/vehiclesApi";

const PAGE_SIZE = 20;

interface DriverFormValues {
  name: string;
  code: string;
  description: string;
  phone: string;
  mobile_password: string;
  custom_fields: Record<string, string>;
}

const emptyDriverForm: DriverFormValues = {
  name: "",
  code: "",
  description: "",
  phone: "",
  mobile_password: "",
  custom_fields: {},
};

export function DriversPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = hasPermission("drivers:write");
  const canBind = hasPermission("drivers:bind");
  const canExport = hasPermission("export:csv");
  const [resourceId, setResourceId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverFormValues>(emptyDriverForm);
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Driver | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const resourcesQuery = useQuery({ queryKey: ["wialon-resources"], queryFn: listAllResources });
  const resources = resourcesQuery.data ?? [];
  const selectedResourceId = resourceId ?? resources[0]?.id ?? null;
  const driversQuery = useQuery({
    queryKey: ["drivers", selectedResourceId, query, offset],
    queryFn: () => listDrivers(selectedResourceId as number, query, offset, PAGE_SIZE),
    enabled: selectedResourceId !== null,
  });
  const page = driversQuery.data;
  const saveMutation = useMutation({
    mutationFn: ({ selectedResourceId, driverId, payload }: { selectedResourceId: number; driverId: number | null; payload: DriverWritePayload }) =>
      driverId === null
        ? createDriver(selectedResourceId, { ...payload, mobile_password: payload.mobile_password ?? "" })
        : updateDriver(selectedResourceId, driverId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setFormOpen(false);
      setEditingDriver(null);
      setRemovedFields([]);
      setSuccessMessage(editingDriver ? "Conductor actualizado." : "Conductor creado.");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (driverId: number) => deleteDriver(selectedResourceId as number, driverId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setPendingDelete(null);
      setSuccessMessage("Conductor eliminado.");
    },
  });
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles-for-bindings"],
    queryFn: () => listAllVehicles({ query: "", status: "" }),
    enabled: canBind && selectedResourceId !== null,
  });
  const bindingMutation = useMutation({
    mutationFn: ({ driverId, unitId, bind }: { driverId: number; unitId: number; bind: boolean }) =>
      setDriverBinding(selectedResourceId as number, driverId, unitId, bind),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicle-map"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicle-detail"] }),
      ]);
      setSuccessMessage("Vinculación actualizada.");
    },
  });
  const vehicles = vehiclesQuery.data ?? [];

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    setOffset(0);
  };

  const openCreateForm = () => {
    setEditingDriver(null);
    setForm(emptyDriverForm);
    setRemovedFields([]);
    setSuccessMessage("");
    setFormOpen(true);
  };

  const openEditForm = (driver: Driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name,
      code: driver.code,
      description: driver.description,
      phone: driver.phone,
      mobile_password: "",
      custom_fields: { ...driver.custom_fields },
    });
    setRemovedFields([]);
    setSuccessMessage("");
    setFormOpen(true);
  };

  const saveDriver = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedResourceId === null) return;
    const payload: DriverWritePayload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description,
      phone: form.phone.trim(),
      custom_fields: form.custom_fields,
      ...(form.mobile_password ? { mobile_password: form.mobile_password } : {}),
      ...(removedFields.length ? { remove_custom_fields: removedFields } : {}),
    };
    setSuccessMessage("");
    saveMutation.mutate({ selectedResourceId, driverId: editingDriver?.id ?? null, payload });
  };

  return (
    <section aria-labelledby="drivers-title" className="grid gap-5">
      <header>
        <p className="eyebrow">Equipo operativo</p>
        <h1 className="text-2xl font-bold text-slate-950" id="drivers-title">Conductores</h1>
      </header>
      {resourcesQuery.isPending ? <LoadingState label="Consultando recursos Wialon" /> : null}
      {resourcesQuery.isError ? <ErrorState description="No fue posible consultar los recursos Wialon." onRetry={() => void resourcesQuery.refetch()} /> : null}
      {resourcesQuery.data && resources.length === 0 ? <EmptyState title="No hay recursos disponibles" description="La cuenta Wialon no devolvió recursos para consultar conductores." /> : null}
      {selectedResourceId !== null ? (
        <>
          {canWrite ? <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-teal-900" role="status">{successMessage}</p>
            <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" onClick={openCreateForm} type="button">Nuevo conductor</button>
          </div> : null}
          {canExport ? <ExportCsvButton kind="drivers" /> : null}
          {formOpen && canWrite ? <form aria-label={editingDriver ? "Editar conductor" : "Crear conductor"} className="grid gap-4 border-y border-slate-200 py-5" onSubmit={saveDriver}>
            <h2 className="text-lg font-semibold text-slate-950">{editingDriver ? "Editar conductor" : "Nuevo conductor"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Nombre" maxLength={150} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
              <TextField label="Código" maxLength={100} onChange={(event) => setForm({ ...form, code: event.target.value })} value={form.code} />
              <TextField label="Teléfono" maxLength={50} onChange={(event) => setForm({ ...form, phone: event.target.value })} value={form.phone} />
              <TextField label={editingDriver ? "Nueva contraseña móvil (opcional)" : "Contraseña móvil"} maxLength={100} onChange={(event) => setForm({ ...form, mobile_password: event.target.value })} required={!editingDriver} type="password" value={form.mobile_password} />
              <TextField className="sm:col-span-2" label="Descripción" maxLength={500} onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} />
            </div>
            {editingDriver ? <p className="text-sm text-muted">Wialon puede no devolver la contraseña móvil actual. Si la actualización falla por datos incompletos, ingresa una nueva contraseña móvil para continuar; no se leerá ni expondrá la existente.</p> : null}
            <CustomFieldsEditor fields={form.custom_fields} onFieldsChange={(fields) => setForm({ ...form, custom_fields: fields })} onRemovedFieldsChange={setRemovedFields} removedFields={removedFields} />
            {saveMutation.isError ? <p className="text-sm text-wine-dark" role="alert">{saveMutation.error instanceof ApiError ? saveMutation.error.message : "No se pudo guardar el conductor."}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold disabled:opacity-50" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending ? "Guardando…" : "Guardar"}</button>
              <button className="min-h-11 rounded-control border border-slate-300 px-4 text-sm font-semibold" onClick={() => setFormOpen(false)} type="button">Cancelar</button>
            </div>
          </form> : null}
          {pendingDelete && canWrite ? <section aria-label="Confirmar eliminación" className="grid gap-3 border-y border-red-200 bg-red-50 p-4" role="alert">
            <p className="text-sm text-wine-dark">¿Eliminar al conductor {pendingDelete.name}? Wialon puede rechazarlo si aún está vinculado.</p>
            {deleteMutation.isError ? <p className="text-sm text-wine-dark">No se pudo eliminar el conductor. Verifica sus vinculaciones e inténtalo nuevamente.</p> : null}
            <div className="flex gap-2">
              <button className="min-h-11 rounded-control bg-brand-wine px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(pendingDelete.id)} type="button">Confirmar eliminación</button>
              <button className="min-h-11 rounded-control border border-slate-300 px-4 text-sm font-semibold" onClick={() => { setPendingDelete(null); deleteMutation.reset(); }} type="button">Cancelar</button>
            </div>
          </section> : null}
          <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(14rem,1.3fr)] sm:items-end">
            <ResourcePicker resources={resources} selectedResourceId={selectedResourceId} onChange={(id) => { setResourceId(id); setOffset(0); }} />
            <form className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end" onSubmit={submitSearch}>
              <TextField label="Buscar conductor" onChange={(event) => setSearchInput(event.target.value)} value={searchInput} />
              <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" type="submit">Buscar</button>
            </form>
          </div>
          {driversQuery.isPending ? <LoadingState label="Consultando conductores" /> : null}
          {driversQuery.isError ? <ErrorState description="No fue posible consultar los conductores." onRetry={() => void driversQuery.refetch()} /> : null}
          {page?.items.length === 0 ? <EmptyState title="No hay conductores en este recurso" description={query ? "Cambia el término de búsqueda para consultar otros conductores." : "Los conductores de Wialon aparecerán aquí."} /> : null}
          {page && page.items.length > 0 ? <>
            <p aria-live="polite" className="text-sm text-muted">{page.total} conductores · mostrando {page.offset + 1}–{Math.min(page.offset + page.items.length, page.total)}</p>
            <ul aria-label="Lista de conductores" className="grid list-none gap-3 p-0">
              {page.items.map((driver) => <li className="rounded-card border border-slate-200 bg-white p-4" key={driver.id}>
                <article className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_repeat(3,minmax(7rem,auto))_minmax(10rem,auto)] xl:items-center">
                  <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{driver.name}</h2><p className="mt-1 text-sm text-muted">Código {driver.code || "sin código"}</p></div>
                  <PersonDetail label="Teléfono" value={driver.phone || "Sin dato"} />
                  <PersonDetail label="Vehículo" value={driver.bound_unit_id === null ? "Sin asignar" : `Unidad ${driver.bound_unit_id}`} />
                  <PersonDetail label="Campos personalizados" value={String(Object.keys(driver.custom_fields).length)} />
                  {canBind ? <BindingControl
                    error={bindingMutation.error}
                    isErrorVehicles={vehiclesQuery.isError}
                    isLoadingVehicles={vehiclesQuery.isPending}
                    isPending={bindingMutation.isPending}
                    label={driver.name}
                    onBind={(unitId) => bindingMutation.mutate({ driverId: driver.id, unitId, bind: true })}
                    onRetryVehicles={() => void vehiclesQuery.refetch()}
                    onUnbind={() => {
                      if (driver.bound_unit_id !== null) bindingMutation.mutate({ driverId: driver.id, unitId: driver.bound_unit_id, bind: false });
                    }}
                    personId={driver.id}
                    unitId={driver.bound_unit_id}
                    vehicles={vehicles}
                  /> : null}
                  {canWrite ? <div className="flex gap-2">
                    <button aria-label={`Editar ${driver.name}`} className="text-sm font-semibold text-teal-900 underline" onClick={() => openEditForm(driver)} type="button">Editar</button>
                    <button aria-label={`Eliminar ${driver.name}`} className="text-sm font-semibold text-wine-dark underline" onClick={() => { setPendingDelete(driver); setSuccessMessage(""); deleteMutation.reset(); }} type="button">Eliminar</button>
                  </div> : null}
                </article>
              </li>)}
            </ul>
            <nav aria-label="Paginación de conductores" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <span className="text-sm text-muted">Página {Math.floor(offset / PAGE_SIZE) + 1} de {Math.max(1, Math.ceil(page.total / PAGE_SIZE))}</span>
              <div className="flex gap-2">
                <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} type="button">Anterior</button>
                <button className="min-h-11 rounded-control border border-brand-teal px-4 text-sm font-semibold text-teal-900 disabled:opacity-50" disabled={offset + PAGE_SIZE >= page.total} onClick={() => setOffset(offset + PAGE_SIZE)} type="button">Siguiente</button>
              </div>
            </nav>
          </> : null}
        </>
      ) : null}
    </section>
  );
}

function PersonDetail({ label, value }: { label: string; value: string }) {
  return <dl className="m-0 grid gap-1 text-sm"><dt className="text-xs font-medium text-muted">{label}</dt><dd className="m-0 break-words text-slate-800">{value}</dd></dl>;
}