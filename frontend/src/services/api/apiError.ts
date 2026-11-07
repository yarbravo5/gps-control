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
