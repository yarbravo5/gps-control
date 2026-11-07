import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../services/api/apiError";
import { useAuth } from "./AuthProvider";

const schema = z.object({
  email: z.email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña.").max(128, "La contraseña es demasiado larga."),
});
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

  return (
    <main className="login-screen">
      <section aria-label="Acceso a GPS Control" className="login-panel">
        <div aria-label="GPS Control: monitoreo para cada recorrido" className="login-visual">
          <div className="login-visual__brand" aria-label="GPS Control">
            <span className="login-visual__mark" aria-hidden="true">G</span>
            <span>GPS <strong>CONTROL</strong></span>
          </div>
          <div className="login-visual__glow" aria-hidden="true" />
          <img alt="" aria-hidden="true" className="login-passenger" src="/images/login-driver-profile.svg" />
          <p className="login-visual__caption">Cada recorrido, más cerca.</p>
          <span className="login-visual__line" aria-hidden="true" />
        </div>

        <div className="login-form-side">
          <div className="login-form-wrap">
            <p className="login-eyebrow">GPS CONTROL</p>
            <h1 id="login-title">Hola de nuevo</h1>
            <p className="login-intro">Ingresa a tu cuenta para continuar.</p>
            {notice ? <p className="login-notice" role="status">{notice}</p> : null}
            <form className="login-form" onSubmit={onSubmit} noValidate aria-labelledby="login-title">
              <TextField autoComplete="username" error={errors.email?.message} label="Correo electrónico" type="email" placeholder="nombre@empresa.com" {...register("email")} />
              <TextField autoComplete="current-password" error={errors.password?.message} label="Contraseña" type="password" placeholder="Ingresa tu contraseña" {...register("password")} />
              {formError ? <p className="login-error" role="alert">{formError}</p> : null}
              {showColdStart ? <p className="login-hint" role="status">El servidor gratuito está iniciando. Esto puede tardar hasta un minuto.</p> : null}
              <Button className="login-submit" disabled={isSubmitting} type="submit">{isSubmitting ? "Ingresando…" : "Ingresar"}</Button>
            </form>
            <p className="login-back"><Link to="/">Volver a inicio</Link></p>
          </div>
          <p className="login-form-footer">Seguimiento claro para una operación en movimiento.</p>
        </div>
      </section>
    </main>
  );
}
