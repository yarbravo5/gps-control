import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { useAuth } from "./AuthProvider";

const schema = z.object({ email: z.email("Ingresa un correo válido."), password: z.string().min(1, "Ingresa tu contraseña.").max(128, "La contraseña es demasiado larga.") });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [formError, setFormError] = useState<string | null>(null);
  const [showColdStart, setShowColdStart] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (!isSubmitting) { setShowColdStart(false); return; }
    const timer = setTimeout(() => setShowColdStart(true), 5000);
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  if (isLoading) return <p className="p-8 text-center" role="status">Comprobando sesión…</p>;
  if (user) return <Navigate replace to={user.must_change_password ? "/change-password" : "/app"} />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination ?? "/app", { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "No pudimos iniciar sesión. Inténtalo nuevamente.");
    }
  });

  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
    <Card className="w-full max-w-md" title="Iniciar sesión">
      <p className="mb-6 text-sm text-muted">Ingresa con tus credenciales de GPS Control.</p>
      {notice ? <p className="mb-4 text-sm text-teal-900" role="status">{notice}</p> : null}
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <TextField autoComplete="username" error={errors.email?.message} label="Correo electrónico" type="email" {...register("email")} />
        <TextField autoComplete="current-password" error={errors.password?.message} label="Contraseña" type="password" {...register("password")} />
        {formError ? <p className="text-sm text-wine-dark" role="alert">{formError}</p> : null}
        {showColdStart ? <p className="text-sm text-muted" role="status">El servidor gratuito está iniciando. Esto puede tardar hasta un minuto.</p> : null}
        <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Ingresando…" : "Ingresar"}</Button>
      </form>
      <Link className="mt-5 inline-block rounded text-sm text-teal-900 underline focus-visible:outline-2 focus-visible:outline-brand-teal" to="/">Volver a inicio</Link>
    </Card>
  </main>;
}
