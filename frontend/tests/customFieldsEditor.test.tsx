import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { CustomFieldsEditor } from "../src/features/foundation/CustomFieldsEditor";

function EditorHarness() {
  const [fields, setFields] = useState<Record<string, string>>({ grupo: "norte" });
  const [removed, setRemoved] = useState<string[]>([]);
  return <>
    <CustomFieldsEditor fields={fields} onFieldsChange={setFields} onRemovedFieldsChange={setRemoved} removedFields={removed} />
    <output aria-label="Campos eliminados">{removed.join(",")}</output>
  </>;
}

describe("CustomFieldsEditor", () => {
  it("retira un campo de la lista de eliminaciones si el usuario lo vuelve a agregar", () => {
    render(<EditorHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar campo grupo" }));
    expect(screen.getByLabelText("Campos eliminados")).toHaveTextContent("grupo");
    fireEvent.change(screen.getByRole("textbox", { name: "Nuevo campo" }), { target: { value: "grupo" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Valor" }), { target: { value: "sur" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(screen.getByLabelText("Campos eliminados")).toBeEmptyDOMElement();
    expect(screen.getByRole("textbox", { name: "Valor de grupo" })).toHaveValue("sur");
  });
});