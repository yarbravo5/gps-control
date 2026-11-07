# Procedimiento de rotación de secretos

## Estado

Pendiente de ejecución por el propietario de las cuentas externas. Se detectó exposición de credenciales reales en el contexto de trabajo; sus valores no se guardan en este documento, en Git ni en logs.

## Orden recomendado

1. **Wialon:** revocar el token expuesto en la cuenta de Wialon y emitir uno nuevo. Reemplazar `WIALON_TOKEN` en Render y en `backend/.env` local. El token anterior debe dejar de ser válido antes de dar por cerrada la exposición.
2. **Neon:** rotar la contraseña del rol PostgreSQL desde el panel de Neon. Actualizar `DATABASE_URL` en Render y la configuración local correspondiente, conservando TLS y el host/puerto correctos. Verificar conectividad y migraciones antes de cerrar la ventana.
3. **JWT:** configurar un `JWT_SECRET` nuevo, aleatorio y exclusivo por ambiente en Render y local. La rotación invalida access y refresh tokens existentes; todos los usuarios deberán iniciar sesión de nuevo.
4. **Administrador:** cambiar la contraseña del usuario Admin existente mediante un procedimiento administrativo seguro y revocar sus sesiones. Cambiar solo `ADMIN_PASSWORD` no actualiza usuarios ya creados por el seed. Si se usa el reset de contraseña de la API, iniciar la operación desde un dispositivo y sesión confiables y cerrar todas las sesiones al finalizar.

No copiar valores secretos a tickets, comandos visibles, capturas, documentación o historial de shell. Introducirlos directamente en los paneles de cada proveedor o en el archivo local ignorado por Git.

## Verificación posterior

- Confirmar que el token Wialon anterior fue revocado y que el backend consulta Wialon con el nuevo.
- Confirmar healthcheck, conexión a PostgreSQL y estado de migraciones.
- Probar login con el Admin rotado, consultar `/auth/me`, probar refresh y logout; confirmar que la sesión anterior no se puede renovar.
- Revisar logs de Render y GitHub Actions para descartar valores sensibles.
- No registrar la operación como completada hasta verificar los cuatro secretos en sus proveedores.
