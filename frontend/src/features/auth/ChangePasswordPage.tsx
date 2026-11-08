import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { useAuth } from "./AuthProvider";

const schema = z.object({ current_password: z.string().min(1, "Ingresa la contraseña actual."), new_password: z.string().min(12, "Usa al menos 12 caracteres.").max(128, "Usa máximo 128 caracteres.").regex(/\p{L}/u, "Incluye una letra.").regex(/\p{N}/u, "Incluye un número."), confirm_password: z.string() }).refine((data) => data.new_password === data.confirm_password, { path: ["confirm_password"], message: "Las contraseñas no coinciden." }).refine((data) => data.new_password !== data.current_password, { path: ["new_password"], message: "Elige una contraseña diferente." });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await changePassword({ current_password: values.current_password, new_password: values.new_password });
      navigate("/login", { replace: true, state: { notice: "Contraseña actualizada. Inicia sesión con tu nueva contraseña." } });
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No pudimos cambiar la contraseña.");
    }
  });
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
    <Card className="w-full max-w-md" title="Cambia tu contraseña">
      <p className="mb-5 text-sm text-muted">Por seguridad, debes actualizar tu contraseña antes de continuar.</p>
      <form className="grid gap-5" onSubmit={submit} noValidate>
        <TextField autoComplete="current-password" error={errors.current_password?.message} label="Contraseña actual" type="password" {...register("current_password")} />
        <TextField autoComplete="new-password" error={errors.new_password?.message} hint="Mínimo 12 caracteres, con letras y números." label="Nueva contraseña" type="password" {...register("new_password")} />
        <TextField autoComplete="new-password" error={errors.confirm_password?.message} label="Confirma la nueva contraseña" type="password" {...register("confirm_password")} />
        {message ? <p role="alert" className="text-sm text-wine-dark">{message}</p> : null}
        <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Guardando…" : "Actualizar contraseña"}</Button>
      </form>
    </Card>
  </main>;
}
