# GPS Control

Sistema de monitoreo de flota construido sobre Wialon, con autenticación por roles, API REST, auditoría y frontend React.

Este repositorio corresponde a la prueba técnica de GPS Control. El backend incluye autenticación, permisos e integración con Wialon; el frontend incluye la landing, el flujo de autenticación, el shell de la aplicación y un listado de vehículos con búsqueda, filtros y paginación del servidor. El mapa, dashboard y demás módulos de gestión del frontend siguen pendientes.

## Enlaces de la entrega

| Recurso | URL |
| --- | --- |
| Aplicación | <https://gps-control-mu.vercel.app> |
| API | <https://gps-control-api-yb.onrender.com> |
| Swagger | <https://gps-control-api-yb.onrender.com/docs> |
| Repositorio | https://github.com/yarbravo5/gps-control |

Despliegue activo en Neon (PostgreSQL), Render (API Docker) y Vercel (SPA). El frontend consume la API mediante el proxy same-origin `/api` de Vercel y GitHub Actions mantiene Render despierto cada 10 minutos.

## Credenciales de prueba

Por seguridad, las credenciales de evaluación se envían en el correo de entrega y no se publican en este repositorio público.

En local, el seed crea el administrador definido por `ADMIN_EMAIL` y `ADMIN_PASSWORD` en `backend/.env`. Los usuarios creados desde la API o desde el panel de administración se crean con `must_change_password=true` y deben cambiar la contraseña en el primer ingreso.

Roles disponibles:

| Rol | Alcance |
| --- | --- |
| `admin` | Acceso total, gestión de usuarios y auditoría |
| `operator` | Gestión operativa de flota, conductores y pasajeros |
| `viewer` | Solo lectura |

## Alcance implementado

### Backend

- Autenticación con access token JWT de vida corta y refresh token rotativo.
- Cookies `HttpOnly`, `Secure` en producción y `SameSite` configurable.
- Protección CSRF con cookie y header `X-CSRF-Token`.
- Bloqueo temporal de login tras intentos fallidos.
- RBAC con permisos granulares y roles `admin`, `operator`, `viewer`.
- Cambio de contraseña, cierre de sesión y cierre de todas las sesiones.
- Registro de auditoría de accesos y operaciones sensibles.
- Consulta de vehículos y estados desde Wialon.
- Historial de recorridos con límites de puntos y validación de ventanas de tiempo.
- CRUD de conductores y pasajeros, campos personalizados y vinculación con unidades.
- Administración de usuarios y restablecimiento de contraseñas.
- Healthcheck para Render y Docker.
- Migraciones con Alembic y seed idempotente.

### Frontend

- Landing responsive con identidad visual de GPS Control.
- Login con validación de formulario y manejo de errores.
- Restauración de sesión, refresh automático, logout y expiración de sesión.
- Guards de autenticación y autorización por permisos.
- Shell de aplicación con navegación responsive y accesible.
- Listado de vehículos conectado al API con búsqueda, filtros por estado y paginación del servidor.
- Mapa OpenStreetMap con clustering, marcadores por estado, selección sincronizada y actualización cada 30 segundos que se pausa con la pestaña oculta.
- Dashboard con KPIs y gráficas calculadas desde vehículos, conductores y pasajeros devueltos por Wialon.
- CRUD de conductores y pasajeros con selección de recurso, búsqueda/paginación, custom fields y vinculación a unidades Wialon.
- Panel Admin para usuarios/roles y reset de contraseña; vista paginada de auditoría exclusiva por permiso.
- Aviso de arranque en frío para el plan gratuito de Render.
- Pruebas de componentes, router, cliente HTTP y flujo de autenticación.

### Pendiente para siguientes iteraciones

- Reproductor de historial de recorridos.
- Campos personalizados de vehículos.
- Exportación CSV (el permiso `export:csv` ya existe en el catálogo).
- Rate limiting global adicional al bloqueo de login.

## Stack

### Backend

- Python 3.14
- FastAPI
- SQLAlchemy 2
- PostgreSQL 18 con `psycopg` 3
- Alembic
- PyJWT y Argon2
- httpx
- Pytest

### Frontend

- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- React Router 7
- TanStack Query 5
- Axios
- React Hook Form y Zod
- Vitest y Testing Library

### Infraestructura

- Docker y Docker Compose
- GitHub Actions
- Neon PostgreSQL
- Render para la API
- Vercel para el frontend

## Arquitectura

```text
Navegador
   |
   | HTTPS
   v
Vercel (React/Vite)
   |
   | /api/* reescrito al backend
   v
Render (FastAPI en Docker)
   |
   | SQL con TLS
   v
Neon PostgreSQL

Render tambien consulta la API de Wialon por HTTPS.
```

El frontend se sirve desde Vercel y reescribe `/api/*` hacia Render. Esto mantiene frontend y API bajo el mismo origen, permite cookies `SameSite=lax` y evita problemas de cookies cruzadas entre `*.vercel.app` y `*.onrender.com`.

En desarrollo local, el frontend usa `VITE_API_URL=http://localhost:8000/api/v1` y el backend permite CORS desde `http://localhost:5173`.

## Estructura del repositorio

```text
.
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/v1/          # Endpoints HTTP
│   │   ├── core/            # Configuracion, seguridad, dependencias
│   │   ├── db/              # Sesion, seed y migraciones
│   │   ├── gateways/        # Integracion con Wialon
│   │   ├── mappers/         # Conversion entre modelos y respuestas
│   │   ├── models/          # Modelos SQLAlchemy
│   │   ├── repositories/    # Acceso a datos
│   │   ├── schemas/         # Contratos Pydantic
│   │   └── services/        # Reglas de negocio
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/             # Providers y router
│   │   ├── components/      # Componentes reutilizables
│   │   ├── features/        # Auth, landing y modulos de producto
│   │   └── services/        # Cliente HTTP y errores
│   └── tests/
├── docs/
│   └── decisions/           # ADRs
├── docker-compose.yml
└── .github/workflows/
```

## Ejecucion local

### Docker Compose

La forma mas rapida de levantar PostgreSQL y el backend:

```bash
cp .env.example .env
docker compose up --build
```

Servicios:

- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Healthcheck: http://localhost:8000/health
- PostgreSQL en el host: `localhost:5433`

El compose usa valores de desarrollo por defecto. Para usar credenciales reales de Wialon y un secreto JWT propio, edita `.env` a partir de `.env.example`.

Para detener los servicios:

```bash
docker compose down
```

No uses `docker compose down -v` salvo que quieras borrar tambien la base de datos de Docker.

### Backend nativo en Windows

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

Edita `backend/.env` con las credenciales de PostgreSQL y Wialon. La configuracion nativa usa `localhost:5432` por defecto.

### Frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:5173. Para desarrollo local, `VITE_API_URL` debe apuntar a `http://localhost:8000/api/v1`.

## Variables de entorno

La plantilla completa del backend esta en `backend/.env.example`. Las principales variables son:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Opcional. Si existe, tiene prioridad sobre `DB_*`. Se normaliza a `postgresql+psycopg://`. |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexion PostgreSQL cuando no se usa `DATABASE_URL`. |
| `JWT_SECRET` | Firma de tokens. Debe ser un secreto largo y aleatorio en produccion. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Vida del access token. Por defecto 15 minutos. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Vida del refresh token. Por defecto 7 dias. |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` | Bloqueo temporal por intentos fallidos. |
| `COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | Atributos de cookies de sesion. |
| `WIALON_TOKEN`, `WIALON_HOST` | Credenciales de Wialon. El token no se versiona. |
| `WIALON_HTTP_TIMEOUT_SECONDS` | Timeout de llamadas a Wialon. |
| `CORS_ORIGINS` | Origenes permitidos, separados por coma. |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Administrador inicial creado por el seed. |

En produccion con el proxy same-origin de Vercel se recomienda:

```text
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=
CORS_ORIGINS=https://tu-app.vercel.app
```

En Neon usa la cadena **Pooled** y conserva `sslmode=require`:

```text
DATABASE_URL=postgresql+psycopg://usuario:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

No subas `.env` ni `.env.local` al repositorio. El workflow de CI rechaza cualquier `.env` real versionado.

## Seguridad

El procedimiento pendiente de rotación de credenciales expuestas está documentado en [docs/security/secret-rotation.md](docs/security/secret-rotation.md). No contiene valores secretos; la revocación debe completarla el propietario en Wialon, Neon y Render.

- Contrasenas hasheadas con Argon2.
- Access tokens JWT de corta duracion.
- Refresh tokens rotativos almacenados como hash en base de datos.
- Cookies `HttpOnly` para refresh y CSRF.
- Validacion CSRF en refresh, logout y cambio de sesion.
- Bloqueo temporal de cuenta tras intentos fallidos.
- RBAC verificado en el backend con permisos por endpoint.
- Auditoria de accesos, cambios de contrasena y operaciones administrativas.
- CORS restringido por variable de entorno.
- Contenedor Docker ejecutado con usuario no root.
- Mensajes de error de Wialon sanitizados para no exponer detalles internos.
- Token Wialon tratado como `SecretStr` en la configuracion y enviado solo al gateway.
- El token Wialon se configura unicamente en `backend/.env` y en las variables secretas de Render. No se envia al frontend, no se registra en logs y no se incluye en el repositorio ni en la documentacion.

Limitaciones de seguridad conocidas:

- No hay rate limiting global; existe bloqueo de login por intentos fallidos.
- La exportacion CSV esta reservada en permisos pero aun no implementada.
- El plan gratuito de Render puede tardar en responder tras un periodo de inactividad.

## API

La API se publica bajo `/api/v1`.

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `POST` | `/auth/login` | Inicia sesion y entrega access token, CSRF y cookies. |
| `POST` | `/auth/refresh` | Rota el refresh token. Requiere `X-CSRF-Token`. |
| `POST` | `/auth/logout` | Revoca la sesion actual. |
| `POST` | `/auth/logout-all` | Revoca todas las sesiones del usuario. |
| `GET` | `/auth/me` | Usuario actual y permisos. |
| `POST` | `/auth/change-password` | Cambia la contrasena e invalida sesiones. |
| `GET` | `/vehicles` | Lista de vehiculos con filtros y paginacion. |
| `GET` | `/vehicles/{id}/history` | Historial de recorridos. |
| `GET` | `/drivers` | Lista de conductores. |
| `POST` | `/drivers` | Crea conductor. |
| `GET` | `/drivers/{id}` | Detalle de conductor. |
| `PATCH` | `/drivers/{id}` | Actualiza conductor. |
| `DELETE` | `/drivers/{id}` | Elimina conductor. |
| `POST` | `/drivers/{id}/bindings` | Vincula conductor a unidad. |
| `DELETE` | `/drivers/{id}/bindings` | Desvincula conductor. |
| `GET` | `/passengers` | Lista de pasajeros. |
| `POST` | `/passengers` | Crea pasajero. |
| `GET` | `/passengers/{id}` | Detalle de pasajero. |
| `PATCH` | `/passengers/{id}` | Actualiza pasajero. |
| `PATCH` | `/passengers/{id}/custom-fields` | Actualiza campos personalizados. |
| `DELETE` | `/passengers/{id}` | Elimina pasajero. |
| `POST` | `/passengers/{id}/bindings` | Vincula pasajero a unidad. |
| `DELETE` | `/passengers/{id}/bindings` | Desvincula pasajero. |
| `GET` | `/users` | Lista de usuarios. |
| `POST` | `/users` | Crea usuario. |
| `PATCH` | `/users/{id}` | Actualiza usuario. |
| `POST` | `/users/{id}/reset-password` | Restablece contrasena. |
| `DELETE` | `/users/{id}` | Elimina usuario. |
| `GET` | `/audit` | Consulta auditoria. |
| `GET` | `/health` | Healthcheck. |

La documentacion interactiva completa esta en `/docs`.

## Pruebas y calidad

Backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

Las pruebas de backend usan SQLite en memoria y no tocan PostgreSQL.

Frontend:

```powershell
cd frontend
npm ci
npm run typecheck
npm test
npm run build
```

El workflow `.github/workflows/docker-compose-ci.yml` valida el compose, rechaza `.env` reales versionados, construye las imagenes, levanta los servicios y espera a que `/health` responda.

## Despliegue

### Neon

1. Crear un proyecto PostgreSQL.
2. Copiar la cadena de conexion **Pooled**.
3. Configurarla en Render como `DATABASE_URL`, conservando `sslmode=require`.

### Render

1. Crear un Web Service desde el repositorio.
2. Runtime Docker.
3. Dockerfile `backend/Dockerfile` y contexto `backend`.
4. Healthcheck `/health`.
5. Configurar las variables de entorno de produccion.
6. El contenedor escucha en `${PORT:-8000}`, por lo que funciona con el puerto inyectado por Render.

### Vercel

1. Importar el repositorio con Root Directory `frontend`.
2. Framework Vite, build `npm run build`, output `dist`.
3. Variable `VITE_API_URL=/api/v1`.
4. El archivo `frontend/vercel.json` reescribe `/api/:path*` hacia Render y mantiene el fallback SPA.

### Arranque en frio

El plan gratuito de Render suspende el servicio tras un periodo de inactividad. Para reducir la espera:

- El frontend muestra un aviso cuando el arranque tarda mas de cinco segundos.
- El login y el refresh usan un timeout extendido de 60 segundos.
- El workflow `.github/workflows/keep-alive.yml` consulta `/health` cada 10 minutos para reducir los arranques en frío.

## Decisiones tecnicas

- [Historial de rutas y playback](docs/decisions/historial-rutas-playback.md)
- Migraciones versionadas con Alembic.
- Seed idempotente de roles, permisos y administrador inicial.
- Separacion por capas: API, servicios, repositorios, mappers y gateways.
- Mensajes de error orientados al usuario sin filtrar detalles internos.
- Proxy same-origin en Vercel para cookies de sesion.

## Uso de inteligencia artificial

Se utilizo IA como asistente durante el desarrollo para diagnostico, revision de codigo, redaccion de pruebas, documentacion y preparacion del despliegue. El autor reviso y valido los cambios, ejecuto las pruebas y tomo las decisiones finales de arquitectura y alcance.

Pautas aplicadas:

- La IA no se uso para generar ni almacenar secretos.
- El token de Wialon se configuro manualmente en variables de entorno, nunca en el repositorio.
- Las respuestas de la IA se contrastaron con el codigo y con pruebas ejecutables.
- Las limitaciones y el alcance pendiente se documentan de forma explicita.

## Estado del proyecto

| Area | Estado |
| --- | --- |
| Autenticacion y sesiones | Completo en backend y frontend |
| RBAC y permisos | Completo en backend; guards en frontend |
| Dashboard | API de métricas protegida y gráficas frontend; pendiente verificar con recursos reales de Wialon en producción |
| Vehiculos y Wialon | Listado, mapa y detalle con conductor/pasajeros integrados |
| Historial de recorridos | Backend completo; reproductor pendiente |
| Conductores y pasajeros | CRUD, custom fields y bindings integrados |
| Usuarios y auditoria | Paneles conectados; auditoría de todas las mutaciones de personas/bindings pendiente |
| Exportacion CSV | Pendiente |
| Despliegue publico | Frontend y backend activos; los commits locales recientes aún no están desplegados |
