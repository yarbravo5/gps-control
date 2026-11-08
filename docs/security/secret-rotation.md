# Revision y rotacion de credenciales

## Estado

El propietario confirmo que el token Wialon original fue entregado por GPS
Control y nunca se publico en GitHub ni en archivos versionados. Esta auditoria
no requiere cambiarlo y no se debe reemplazar por este procedimiento.

La rotacion de otras credenciales solo se realiza si el propietario detecta una
exposicion o decide renovarlas desde los paneles de los proveedores. Esta
auditoria no comprobo credenciales ni configuracion de Neon, Render o cuentas
locales.

## Procedimiento si el propietario decide rotar otra credencial

1. **Neon:** si rota la contraseña PostgreSQL, actualizar `DATABASE_URL` en la
   plataforma y configuracion local, conservar TLS y verificar conexion y
   migraciones.
2. **JWT:** usar valores aleatorios distintos por ambiente. La rotacion invalida
   tokens y obliga a iniciar sesion de nuevo.
3. **Administrador:** cambiar la contraseña desde el procedimiento
   administrativo y revocar sesiones. Cambiar solo `ADMIN_PASSWORD` no actualiza
   usuarios ya creados por el seed.

No copiar secretos a tickets, comandos visibles, capturas, documentacion o
historial de shell. Introducirlos directamente en los paneles de proveedores o
en archivos locales ignorados por Git.

## Verificacion posterior

- No rotar ni revocar el token Wialon como parte de esta auditoria.
- Si se rota otra credencial, verificar healthcheck, conexion a PostgreSQL,
  migraciones, login, refresh y logout desde las plataformas correspondientes.
- No registrar una rotacion como completada sin confirmacion del propietario y
  verificacion del servicio.
