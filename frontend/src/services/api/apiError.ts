import axios from "axios";

export type ApiErrorKind = "http" | "timeout" | "network" | "unknown";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const VALIDATION_FIELDS: Record<string, string> = {
  email: "Correo electrónico",
  name: "Nombre",
  password: "Contraseña temporal",
  new_password: "Nueva contraseña",
  role: "Rol",
};

function describeValidationErrors(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("detail" in data) || !Array.isArray(data.detail)) return null;

  const issues = data.detail.flatMap((issue: unknown) => {
    if (!issue || typeof issue !== "object") return [];
    const entry = issue as { loc?: unknown[]; msg?: unknown };
    if (typeof entry.msg !== "string") return [];

    const fieldName = entry.loc?.at(-1);
    const field = typeof fieldName === "string" ? VALIDATION_FIELDS[fieldName] : undefined;
    const rawMessage = entry.msg.replace(/^Value error,\s*/i, "");
    let message = "no cumple el formato requerido.";
    if (/field required/i.test(rawMessage)) message = "es obligatorio.";
    else if (/email/i.test(rawMessage)) message = "ingresa un correo válido.";
    else if (/at least 8 characters/i.test(rawMessage)) message = "debe tener al menos 8 caracteres.";
    else if (/at most 128 characters/i.test(rawMessage)) message = "no puede superar 128 caracteres.";
    else if (/contraseñ/i.test(rawMessage)) message = rawMessage;
    else if (/nombre/i.test(rawMessage)) message = rawMessage;
    else if (/role|admin.*operator.*viewer/i.test(rawMessage)) message = "selecciona un rol válido.";

    return [field ? `${field}: ${message}` : message];
  });

  return issues.length ? `Revisa los datos ingresados. ${issues.join(" ")}` : null;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "No pudimos procesar la solicitud. Revisa la información e inténtalo de nuevo.",
  401: "Tu sesión no está disponible. Inicia sesión nuevamente.",
  403: "No tienes permiso para realizar esta acción.",
  404: "No encontramos la información solicitada.",
  409: "La información cambió o ya existe. Actualiza e inténtalo nuevamente.",
  422: "Revisa los datos ingresados e inténtalo de nuevo.",
  429: "Hay muchas solicitudes en este momento. Espera un momento e inténtalo de nuevo.",
  500: "Ocurrió un error en el servidor. Inténtalo nuevamente.",
  502: "No pudimos comunicarnos con el servicio de monitoreo. Inténtalo nuevamente.",
};

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new ApiError("El servidor tardó demasiado en responder. Si es la primera visita del día, espera un minuto e inténtalo de nuevo.", "timeout");
    }

    const status = error.response?.status;
    if (status !== undefined) {
      if (status === 422) {
        return new ApiError(
          describeValidationErrors(error.response?.data) ?? "Revisa los datos ingresados e inténtalo de nuevo.",
          "http",
          status,
        );
      }
      return new ApiError(
        STATUS_MESSAGES[status] ?? "No pudimos completar la solicitud. Inténtalo nuevamente.",
        "http",
        status,
      );
    }

    if (error.request) {
      return new ApiError(
        "No pudimos conectarnos con el servidor. Revisa tu conexión o espera a que el servidor gratuito termine de iniciar.",
        "network",
      );
    }
  }

  return new ApiError("Ocurrió un error inesperado. Inténtalo nuevamente.", "unknown");
}
