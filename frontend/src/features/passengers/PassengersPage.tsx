import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyState } from "../../components/feedback/EmptyState";
import { ErrorState } from "../../components/feedback/ErrorState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { TextField } from "../../components/ui/TextField";
import { SortSelect } from "../../components/ui/SortSelect";
import { ApiError } from "../../services/api/apiError";
import { useAuth } from "../auth/AuthProvider";
import { CustomFieldsEditor } from "../foundation/CustomFieldsEditor";
import { ExportCsvButton } from "../foundation/ExportCsvButton";
import { ResourcePicker } from "../foundation/ResourcePicker";
import { listAllResources } from "../foundation/resourcesApi";
import { createPassenger, deletePassenger, listPassengers, setPassengerBinding, updatePassenger } from "./passengersApi";
import type { Passenger, PassengerWritePayload } from "./passengersApi";
import { BindingControl } from "../foundation/BindingControl";
import { listAllVehicles } from "../vehicles/vehiclesApi";

const PAGE_SIZE = 20;

interface PassengerFormValues {
  name: string;
  code: string;
  phone: string;
  timezone: number;
  custom_fields: Record<string, string>;
}

const emptyPassengerForm: PassengerFormValues = {
  name: "",
  code: "",
  phone: "",
  timezone: 0,
  custom_fields: {},
};

export function PassengersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = hasPermission("passengers:write");
  const canBind = hasPermission("passengers:bind");
  const canExport = hasPermission("export:csv");
  const [resourceId, setResourceId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState("name:asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [form, setForm] = useState<PassengerFormValues>(emptyPassengerForm);
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Passenger | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const resourcesQuery = useQuery({ queryKey: ["wialon-resources"], queryFn: listAllResources });
  const resources = resourcesQuery.data ?? [];
  const selectedResourceId = resourceId ?? resources[0]?.id ?? null;
  const passengersQuery = useQuery({
    queryKey: ["passengers", selectedResourceId, query, offset, sort],
    queryFn: () => listPassengers(selectedResourceId as number, query, offset, PAGE_SIZE, sort),
    enabled: selectedResourceId !== null,
  });
  const page = passengersQuery.data;
  const saveMutation = useMutation({
    mutationFn: ({ selectedResourceId, passengerId, payload }: { selectedResourceId: number; passengerId: number | null; payload: PassengerWritePayload }) =>
      passengerId === null
        ? createPassenger(selectedResourceId, payload)
        : updatePassenger(selectedResourceId, passengerId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      setFormOpen(false);
      setEditingPassenger(null);
      setRemovedFields([]);
      setSuccessMessage(editingPassenger ? "Pasajero actualizado." : "Pasajero creado.");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (passengerId: number) => deletePassenger(selectedResourceId as number, passengerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      setPendingDelete(null);
      setSuccessMessage("Pasajero eliminado.");
    },
  });
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles-for-bindings"],
    queryFn: () => listAllVehicles({ query: "", status: "" }),
    enabled: canBind && selectedResourceId !== null,
  });
  const bindingMutation = useMutation({
    mutationFn: ({ passengerId, unitId, bind }: { passengerId: number; unitId: number; bind: boolean }) =>
      setPassengerBinding(selectedResourceId as number, passengerId, unitId, bind),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["passengers"] }),
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
    setEditingPassenger(null);
    setForm(emptyPassengerForm);
    setRemovedFields([]);
    setSuccessMessage("");
    setFormOpen(true);
  };

  const openEditForm = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    setForm({
      name: passenger.name,
      code: passenger.code,
      phone: "",
      timezone: passenger.timezone,
      custom_fields: { ...passenger.custom_fields },
    });
    setRemovedFields([]);
    setSuccessMessage("");
    setFormOpen(true);
  };

  const savePassenger = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedResourceId === null) return;
    const payload: PassengerWritePayload = {
      name: form.name.trim(),
      code: form.code.trim(),
      phone: form.phone.trim(),
      timezone: form.timezone,
      custom_fields: form.custom_fields,
      ...(removedFields.length ? { remove_custom_fields: removedFields } : {}),
    };
    setSuccessMessage("");
    saveMutation.mutate({ selectedResourceId, passengerId: editingPassenger?.id ?? null, payload });
  };

  return (
    <section aria-labelledby="passengers-title" className="grid gap-5">
      <header>
        <p className="eyebrow">Personas vinculadas</p>
        <h1 className="text-2xl font-bold text-slate-950" id="passengers-title">Pasajeros</h1>
      </header>
      {resourcesQuery.isPending ? <LoadingState label="Consultando recursos Wialon" /> : null}
      {resourcesQuery.isError ? <ErrorState description="No fue posible consultar los recursos Wialon." onRetry={() => void resourcesQuery.refetch()} /> : null}
      {resourcesQuery.data && resources.length === 0 ? <EmptyState title="No hay recursos disponibles" description="La cuenta Wialon no devolvió recursos para consultar pasajeros." /> : null}
      {selectedResourceId !== null ? (
        <>
          {canWrite ? <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm text-teal-900" role="status">{successMessage}</p>
            <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" onClick={openCreateForm} type="button">Nuevo pasajero</button>
          </div> : null}
          {canExport ? <ExportCsvButton kind="passengers" /> : null}
          {formOpen && canWrite ? <form aria-label={editingPassenger ? "Editar pasajero" : "Crear pasajero"} className="grid gap-4 border-y border-slate-200 py-5" onSubmit={savePassenger}>
            <h2 className="text-lg font-semibold text-slate-950">{editingPassenger ? "Editar pasajero" : "Nuevo pasajero"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Nombre" maxLength={150} onChange={(event) => setForm({ ...form, name: event.target.value })} required value={form.name} />
              <TextField label="Código" maxLength={100} onChange={(event) => setForm({ ...form, code: event.target.value })} value={form.code} />
              <TextField label={editingPassenger ? "Teléfono actual" : "Teléfono"} hint={editingPassenger ? "Wialon no devuelve este valor. Confirma el teléfono actual antes de guardar." : undefined} maxLength={50} onChange={(event) => setForm({ ...form, phone: event.target.value })} required value={form.phone} />
              <TextField label="Zona horaria Wialon (minutos)" max={840} min={-720} onChange={(event) => setForm({ ...form, timezone: Number(event.target.value) })} type="number" value={form.timezone} />
            </div>
            <CustomFieldsEditor fields={form.custom_fields} onFieldsChange={(fields) => setForm({ ...form, custom_fields: fields })} onRemovedFieldsChange={setRemovedFields} removedFields={removedFields} />
            {saveMutation.isError ? <p className="text-sm text-wine-dark" role="alert">{saveMutation.error instanceof ApiError ? saveMutation.error.message : "No se pudo guardar el pasajero."}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold disabled:opacity-50" disabled={saveMutation.isPending} type="submit">{saveMutation.isPending ? "Guardando…" : "Guardar"}</button>
              <button className="min-h-11 rounded-control border border-slate-300 px-4 text-sm font-semibold" onClick={() => setFormOpen(false)} type="button">Cancelar</button>
            </div>
          </form> : null}
          {pendingDelete && canWrite ? <section aria-label="Confirmar eliminación" className="grid gap-3 border-y border-red-200 bg-red-50 p-4" role="alert">
            <p className="text-sm text-wine-dark">¿Eliminar al pasajero {pendingDelete.name}? Wialon puede rechazarlo si aún está vinculado.</p>
            {deleteMutation.isError ? <p className="text-sm text-wine-dark">No se pudo eliminar el pasajero. Verifica sus vinculaciones e inténtalo nuevamente.</p> : null}
            <div className="flex gap-2">
              <button className="min-h-11 rounded-control bg-brand-wine px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(pendingDelete.id)} type="button">Confirmar eliminación</button>
              <button className="min-h-11 rounded-control border border-slate-300 px-4 text-sm font-semibold" onClick={() => { setPendingDelete(null); deleteMutation.reset(); }} type="button">Cancelar</button>
            </div>
          </section> : null}
          <div className="grid gap-3 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(14rem,1.3fr)] sm:items-end">
            <ResourcePicker resources={resources} selectedResourceId={selectedResourceId} onChange={(id) => { setResourceId(id); setOffset(0); }} />
            <form className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto] sm:items-end" onSubmit={submitSearch}>
              <TextField label="Buscar pasajero" onChange={(event) => setSearchInput(event.target.value)} value={searchInput} />
              <button className="button-primary min-h-11 rounded-control px-4 text-sm font-semibold" type="submit">Buscar</button>
            </form>
          </div>
          <SortSelect options={[{ value: "name:asc", label: "Nombre (A–Z)" }, { value: "name:desc", label: "Nombre (Z–A)" }, { value: "code:asc", label: "Código (A–Z)" }, { value: "timezone:asc", label: "Zona horaria" }, { value: "vehicle:asc", label: "Vehículo vinculado" }]} onChange={(value) => { setSort(value); setOffset(0); }} value={sort} />
          {passengersQuery.isPending ? <LoadingState label="Consultando pasajeros" /> : null}
          {passengersQuery.isError ? <ErrorState description="No fue posible consultar los pasajeros." onRetry={() => void passengersQuery.refetch()} /> : null}
          {page?.items.length === 0 ? <EmptyState title="No hay pasajeros en este recurso" description={query ? "Cambia el término de búsqueda para consultar otros pasajeros." : "Los pasajeros de Wialon aparecerán aquí."} /> : null}
          {page && page.items.length > 0 ? <>
            <p aria-live="polite" className="text-sm text-muted">{page.total} pasajeros · mostrando {page.offset + 1}–{Math.min(page.offset + page.items.length, page.total)}</p>
            <ul aria-label="Lista de pasajeros" className="grid list-none gap-3 p-0">
              {page.items.map((passenger) => <li className="rounded-card border border-slate-200 bg-white p-4" key={passenger.id}>
                <article className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_repeat(3,minmax(7rem,auto))_minmax(10rem,auto)] xl:items-center">
                  <div className="min-w-0"><h2 className="truncate font-semibold text-slate-950">{passenger.name}</h2><p className="mt-1 text-sm text-muted">Código {passenger.code || "sin código"}</p></div>
                  <PersonDetail label="Vehículo" value={passenger.bound_unit_id === null ? "Sin asignar" : `Unidad ${passenger.bound_unit_id}`} />
                  <PersonDetail label="Zona horaria Wialon" value={`${passenger.timezone} min`} />
                  <PersonDetail label="Campos personalizados" value={String(Object.keys(passenger.custom_fields).length)} />
                  {canBind ? <BindingControl
                    error={bindingMutation.error}
                    isErrorVehicles={vehiclesQuery.isError}
                    isLoadingVehicles={vehiclesQuery.isPending}
                    isPending={bindingMutation.isPending}
                    label={passenger.name}
                    onBind={(unitId) => bindingMutation.mutate({ passengerId: passenger.id, unitId, bind: true })}
                    onRetryVehicles={() => void vehiclesQuery.refetch()}
                    onUnbind={() => {
                      if (passenger.bound_unit_id !== null) bindingMutation.mutate({ passengerId: passenger.id, unitId: passenger.bound_unit_id, bind: false });
                    }}
                    personId={passenger.id}
                    unitId={passenger.bound_unit_id}
                    vehicles={vehicles}
                  /> : null}
                  {canWrite ? <div className="flex gap-2">
                    <button aria-label={`Editar ${passenger.name}`} className="text-sm font-semibold text-teal-900 underline" onClick={() => openEditForm(passenger)} type="button">Editar</button>
                    <button aria-label={`Eliminar ${passenger.name}`} className="text-sm font-semibold text-wine-dark underline" onClick={() => { setPendingDelete(passenger); setSuccessMessage(""); deleteMutation.reset(); }} type="button">Eliminar</button>
                  </div> : null}
                </article>
              </li>)}
            </ul>
            <nav aria-label="Paginación de pasajeros" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
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
