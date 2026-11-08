import { useState } from "react";

import { TextField } from "../../components/ui/TextField";

interface CustomFieldsEditorProps {
  fields: Record<string, string>;
  removedFields: string[];
  onFieldsChange: (fields: Record<string, string>) => void;
  onRemovedFieldsChange: (fields: string[]) => void;
}

export function CustomFieldsEditor({
  fields,
  removedFields,
  onFieldsChange,
  onRemovedFieldsChange,
}: CustomFieldsEditorProps) {
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");

  const removeField = (name: string) => {
    const updated = { ...fields };
    delete updated[name];
    onFieldsChange(updated);
    if (!removedFields.includes(name)) onRemovedFieldsChange([...removedFields, name]);
  };

  const addField = () => {
    const name = newName.trim();
    if (!name) {
      setError("Escribe el nombre del campo.");
      return;
    }
    if (Object.hasOwn(fields, name)) {
      setError("Ese campo ya existe.");
      return;
    }
    if (Object.keys(fields).length >= 50) {
      setError("Wialon permite hasta 50 campos personalizados.");
      return;
    }
    onFieldsChange({ ...fields, [name]: newValue });
    if (removedFields.includes(name)) {
      onRemovedFieldsChange(removedFields.filter((field) => field !== name));
    }
    setNewName("");
    setNewValue("");
    setError("");
  };

  return (
    <fieldset className="grid gap-3 border-t border-slate-200 pt-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Campos personalizados</legend>
      {Object.entries(fields).map(([name, value]) => (
        <div className="custom-fields-row grid min-w-0 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] sm:items-end" key={name}>
          <TextField label="Nombre del campo" readOnly value={name} />
          <TextField label={`Valor de ${name}`} onChange={(event) => onFieldsChange({ ...fields, [name]: event.target.value })} value={value} />
          <button aria-label={`Eliminar campo ${name}`} className="min-h-11 rounded-control px-3 text-sm font-semibold text-wine-dark underline focus-visible:outline-2 focus-visible:outline-brand-teal" onClick={() => removeField(name)} type="button">Eliminar</button>
        </div>
      ))}
      <div className="custom-fields-row grid min-w-0 gap-2 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] sm:items-end">
        <TextField label="Nuevo campo" onChange={(event) => setNewName(event.target.value)} value={newName} />
        <TextField label="Valor" onChange={(event) => setNewValue(event.target.value)} value={newValue} />
        <button className="min-h-11 rounded-control border border-brand-teal px-3 text-sm font-semibold text-teal-900 focus-visible:outline-2 focus-visible:outline-brand-teal" onClick={addField} type="button">Agregar</button>
      </div>
      {error ? <p className="text-sm text-wine-dark" role="alert">{error}</p> : null}
    </fieldset>
  );
}
