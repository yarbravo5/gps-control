import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/feedback/ToastProvider";
import { ApiError } from "../../services/api/apiError";
import { CustomFieldsEditor } from "../foundation/CustomFieldsEditor";
import { updateVehicleCustomFields } from "./vehiclesApi";
import type { VehicleCustomField, VehicleCustomFieldsUpdatePayload, VehicleDetail } from "./vehiclesApi";

interface VehicleCustomFieldsProps {
  vehicleId: number;
  fields: VehicleCustomField[];
  onSaved: () => void;
}

type SaveStatus = "idle" | "saving" | "error";

function toRecord(fields: VehicleCustomField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.name, field.value]));
}

export function VehicleCustomFields({ vehicleId, fields, onSaved }: VehicleCustomFieldsProps) {
  const queryClient = useQueryClient();
  const notify = useToast();
  const [formFields, setFormFields] = useState<Record<string, string>>(() => toRecord(fields));
  const [removedFields, setRemovedFields] = useState<string[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "saving" || status === "error") return;
    setFormFields(toRecord(fields));
    setRemovedFields([]);
  }, [fields, status]);

  const originalFields = new Map(fields.map((field) => [field.name, field.value]));
  const hasChanges = removedFields.length > 0
    || Object.entries(formFields).some(([name, value]) => originalFields.get(name) !== value);

  const buildPayload = (): VehicleCustomFieldsUpdatePayload => {
    const idsByName = new Map(fields.map((field) => [field.name, field.id]));
    const updates = Object.entries(formFields)
      .filter(([name, value]) => originalFields.get(name) !== value)
      .map(([name, value]) => {
        const id = idsByName.get(name);
        return id ? { id, name, value } : { name, value };
      });
    const removeIds = removedFields
      .map((name) => idsByName.get(name))
      .filter((id): id is number => typeof id === "number");
    return { fields: updates, remove_field_ids: removeIds };
  };

  const save = async () => {
    if (!hasChanges) return;
    setStatus("saving");
    setError("");
    const queryKey = ["vehicle-detail", vehicleId];
    const previousDetail = queryClient.getQueryData<VehicleDetail>(queryKey);
    const payload = buildPayload();
    if (previousDetail) {
      const removedIds = new Set(payload.remove_field_ids ?? []);
      const updatesById = new Map(
        payload.fields.filter((field) => typeof field.id === "number").map((field) => [field.id as number, field]),
      );
      const updatedFields = previousDetail.custom_fields
        .filter((field) => !removedIds.has(field.id))
        .map((field) => {
          const update = updatesById.get(field.id);
          return update ? { ...field, name: update.name, value: update.value } : field;
        });
      const newFields = payload.fields
        .filter((field) => typeof field.id !== "number")
        .map((field, index) => ({ id: -(Date.now() + index + 1), name: field.name, value: field.value }));
      queryClient.setQueryData<VehicleDetail>(queryKey, {
        ...previousDetail,
        custom_fields: [...updatedFields, ...newFields],
      });
    }
    try {
      await updateVehicleCustomFields(vehicleId, payload);
      setRemovedFields([]);
      setStatus("idle");
      notify("Campos personalizados actualizados.");
      onSaved();
    } catch (cause) {
      if (previousDetail) queryClient.setQueryData(queryKey, previousDetail);
      setStatus("error");
      setError(cause instanceof ApiError
        ? cause.message
        : "No fue posible guardar los campos personalizados. Intenta de nuevo.");
    }
  };

  const handleFieldsChange = (next: Record<string, string>) => {
    setFormFields(next);
    setStatus("idle");
    setError("");
  };

  const handleRemovedFieldsChange = (next: string[]) => {
    setRemovedFields(next);
    setStatus("idle");
    setError("");
  };

  return (
    <div className="grid gap-3">
      <CustomFieldsEditor
        fields={formFields}
        onFieldsChange={handleFieldsChange}
        onRemovedFieldsChange={handleRemovedFieldsChange}
        removedFields={removedFields}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={!hasChanges || status === "saving"} onClick={() => void save()} variant="secondary">
          {status === "saving" ? "Guardando…" : "Guardar campos"}
        </Button>
      </div>
      {status === "error" ? (
        <div className="grid justify-items-start gap-2">
          <p className="text-sm text-wine-dark" role="alert">{error}</p>
          <Button onClick={() => void save()} variant="secondary">Reintentar</Button>
        </div>
      ) : null}
    </div>
  );
}
