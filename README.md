# GPS Control

Sistema de monitoreo de flota construido sobre Wialon, con autenticación por roles, API REST, auditoría y frontend React.

Este repositorio corresponde a la prueba técnica de GPS Control. El backend incluye autenticación, permisos, auditoría e integración con Wialon; el frontend incluye landing, dashboard, mapa de flota, detalle de vehículos, gestión de conductores y pasajeros, administración, auditoría, exportación CSV e historial de recorridos con playback.

## Enlaces de la entrega

| Recurso | URL |
| --- | --- |
| Aplicación | <https://gps-control-mu.vercel.app> |
| API | <https://gps-control-api-yb.onrender.com> |
| Salud/version (metadata no sensible) | /health y /version (commit y branch de Render, sin secretos) |
| Documentación API | Disponible solo en desarrollo: `http://localhost:8000/docs` (deshabilitada en producción) |
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
- Ordenamiento server-side con opciones explícitas en listados de vehículos, conductores, pasajeros, usuarios y auditoría.
- Mapa OpenStreetMap con clustering, marcadores por estado, selección sincronizada y actualización cada 30 segundos que se pausa con la pestaña oculta.
- Dashboard con KPIs y gráficas calculadas desde vehículos, conductores y pasajeros devueltos por Wialon.
- CRUD de conductores y pasajeros con selección de recurso, búsqueda/paginación, custom fields y vinculación a unidades Wialon.
- Panel Admin para usuarios/roles y reset de contraseña; vista paginada de auditoría exclusiva por permiso.
- Exportación CSV de vehículos, conductores y pasajeros con permiso backend `export:csv` y neutralización de fórmulas.
- Aviso de arranque en frío para el plan gratuito de Render.
- Reintentos escalonados del healthcheck antes del login para errores transitorios del arranque en frío.
- Pruebas de componentes, router, cliente HTTP y flujo de autenticación.

### Limitaciones conocidas y siguientes pasos

- El login combina bloqueo por cuenta con límites distribuidos por identidad y peer de conexión. No hay rate limiting global para los demás endpoints; detrás de un proxy, configura `TRUSTED_PROXY_IPS` solo con CIDR verificados.
- El backend limita el historial a siete días y 5.000 puntos por consulta; rangos mayores deben dividirse.
- La auditoría registra mutaciones de vehículos, conductores, pasajeros y administración, además de fallos de login; su consulta es exclusiva del Admin.
- El dashboard incluye la hora UTC de consulta presentada en hora de Bogotá y actualiza sus métricas cada 30 segundos mientras la pestaña está visible. El mapa y la actualización de posiciones están en el módulo de vehículos.
- La interfaz de campos personalizados del vehículo se ajusta al ancho real de su panel; el mapa usa tiles canónicos de OSM y conserva el `Referer` requerido por la política. El cambio de tiles requiere un nuevo despliegue para verse en producción.

## Estado de validacion y trabajo pendiente

- Lighthouse historico de landing mobile: 96/96/96 a 360x800, ejecutado el 8 nov 2026.
- Una revision anterior de Playwright cubrio siete vistas protegidas a 390/768/1440 px. En este cierre axe y teclado en landing/login local a 360 px: cero violaciones WCAG 2.1 A/AA, cero overflow y foco visible. No se uso lector de pantalla; vistas autenticadas requieren pase manual.
- Evidencia de produccion del 8 nov: Admin/login, refresh/logout, dashboard, vehiculos, recursos, conductores, pasajeros, usuarios y auditoria respondieron correctamente; mapa con 62 unidades y 61 posiciones. No hubo mutaciones Wialon. Esta es evidencia historica, no una nueva sesion de esta auditoria.
- Render /version confirmo revision 381d6199ceccbac8a583ce0dc4cf47092ceac92a en main; /health y proxy Vercel respondieron 200. El endpoint /api/v1/auth/me sin sesion devuelve 401, esperado; no prueba por si solo una revision.
- Suites locales de cierre: backend 138 tests, frontend 69; frontend typecheck/build correcto. No se recalculo cobertura backend. La verificacion final de pip-audit y Docker Compose corresponde al CI del commit final. Docker no esta instalado localmente.
- GitHub Actions para el commit 381d619: backend, frontend y docker-compose completaron con conclusion success. Repo publico respondio HTTP 200.
- El plan gratuito de Render puede despertar lentamente; el workflow keep-alive reduce cold starts pero no garantiza disponibilidad.

### Evidencia Lighthouse móvil — landing a 360 px

![Captura de la landing pública en viewport móvil de 360 px](docs/screenshots/landing-mobile-360.jpg)

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

El frontend se sirve desde Vercel y reescribe `/api/*` y `/health` hacia Render. Esto mantiene frontend y API bajo el mismo origen, permite cookies `SameSite=lax` y evita problemas de cookies cruzadas entre `*.vercel.app` y `*.onrender.com`. Antes de enviar credenciales, el login consulta `/health` con un timeout ampliado para dar tiempo al plan gratuito de Render a despertar.

En desarrollo local, el frontend usa `VITE_API_URL=http://localhost:8000/api/v1` y el backend permite CORS desde `http://localhost:5173`.

## Modelo de datos

```mermaid
erDiagram
    ROLES ||--o{ USERS : asigna
    ROLES ||--o{ ROLE_PERMISSIONS : incluye
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : concede
    USERS ||--o{ REFRESH_TOKENS : mantiene
    USERS o|--o{ AUDIT_LOGS : realiza
```

`users.role_id` asigna un rol; `role_permissions` materializa la relación muchos a muchos entre roles y permisos. Las sesiones refresh pertenecen a un usuario y se revocan o expiran. Los registros de auditoría conservan su evento aunque el usuario se elimine (`user_id` nullable).

## Arquitectura y patrones (ARQ-01 a ARQ-03, ARQ-08)

- **Responsabilidad única:** [`auth.py`](backend/app/api/v1/auth.py#L36) convierte HTTP a una operación de autenticación; [`auth_service.py`](backend/app/services/auth_service.py#L46) concentra sus reglas; [`user_repository.py`](backend/app/repositories/user_repository.py#L18) realiza consultas de usuarios.
- **Open/Closed e inversión de dependencias:** [`DashboardGateway`](backend/app/services/dashboard_service.py#L12) abstrae la lectura de métricas. El caso de uso [`get_fleet_dashboard`](backend/app/services/dashboard_service.py#L20) no depende del cliente HTTP concreto; las pruebas usan [`FakeDashboardGateway`](backend/tests/unit/test_dashboard_service.py#L17) para sustituir Wialon sin cambiar el servicio.
- **Segregación de interfaces:** cada protocolo de servicio declara el conjunto de operaciones que consume ese dominio; por ejemplo, `DashboardGateway` solo ofrece las consultas de métricas.
- **Sustitución de Liskov:** los gateways de prueba implementan el protocolo esperado por el servicio y se usan en los mismos casos de uso que el gateway real.
- **Repository:** `user_repository.py` concentra consultas SQLAlchemy para usuarios y roles.
- **Adapter/Gateway:** `WialonClient` encapsula HTTP, sesión y errores del proveedor.
- **DTO/Mapper:** `backend/app/gateways/wialon/dto.py` y `backend/app/mappers/vehicle_mapper.py` convierten respuestas externas a contratos propios.
- **Inyección de dependencias:** FastAPI `Depends` conecta sesiones y gateways con endpoints; facilita pruebas con sustitutos.
- **Sustitución de gateways en pruebas:** los `Protocol` por caso de uso permiten que las pruebas inyecten dobles compatibles sin acoplarse al cliente Wialon. No hay una selección de estrategia en tiempo de ejecución ni una Factory explícita; el requisito se considera parcial porque el despliegue usa un gateway único.

Las rutas frontend separan vistas por feature, y [`httpClient.ts`](frontend/src/services/api/httpClient.ts) centraliza cookies, renovación de sesión y normalización de errores.

## Modelo de amenazas (SEG-04)

| Amenaza | Control implementado |
| --- | --- |
| Usuario sin permiso accede a datos o acciones administrativas | Dependencias de autorización por endpoint y permisos en backend; las rutas frontend también se protegen. |
| Robo o repetición de sesión | Access JWT de corta duración, refresh rotativo revocable, cookies HttpOnly/Secure y protección CSRF. |
| Inyección por entradas, SQL o exportaciones | Esquemas Pydantic, ORM parametrizado y neutralización de fórmulas CSV. |
| Exposición de tokens Wialon | Secretos fuera del repositorio y del frontend; configuración `SecretStr`; sanitización de errores. |
| Ataques al navegador o carga de contenido | CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy` configurados en el despliegue. |
| Fuerza bruta de contraseñas | Bloqueo temporal tras fallos consecutivos; no hay limitador global de solicitudes. |

### Controles por categoría de seguridad

| Categoría | Control aplicado y limitación conocida |
| --- | --- |
| SEG-01 Control de acceso | Permisos verificados en endpoints y guards de rutas; CORS se configura por origen. |
| SEG-02 Criptografía | Argon2, access token de vida corta, refresh rotatorio en cookies HttpOnly/Secure en producción y HTTPS desplegado. |
| SEG-03 Inyección | Esquemas Pydantic, SQLAlchemy parametrizado, salida React escapada y saneamiento CSV. |
| SEG-04 Diseño inseguro | Amenazas y mitigaciones resumidas en la tabla anterior; permisos de mínimo privilegio. |
| SEG-05 Configuración | CSP, HSTS, X-Content-Type-Options, X-Frame-Options y políticas de Referrer; Swagger deshabilitado en producción. |
| SEG-06 Componentes | Lockfiles versionados; `npm audit --offline --audit-level=high` reportó cero vulnerabilidades en esta revisión local. CI ejecuta `npm audit --audit-level=high` y `pip-audit` en cada push a `main`. |
| SEG-07 Identidad | Límite de login compartido por identidad/origen y bloqueo temporal; contraseñas nuevas con mínimo 12 caracteres, una letra y un número; sesión rotatoria y CSRF. No hay rate limiting global ni consulta a una lista de contraseñas comprometidas. La cuenta de prueba compartida debe desactivarse o rotarse si sigue activa; la cuenta real de evaluación es distinta y el propietario debe validar sus credenciales antes de compartirlas. |
| SEG-08 Integridad | Dependencias fijadas, CI, DTOs de Wialon validados y mapeo a contratos propios. |
| SEG-09 Registro | Auditoría de operaciones y fallos de login; denegaciones de permiso registradas sin token, contraseña ni IP. |
| SEG-10 Excepciones/SSRF | Host Wialon proviene de configuración; respuestas de error no exponen stack traces ni datos internos. |
| SEG-11 CSRF | Token CSRF requerido en operaciones con refresh cookie, cierre de sesión y cambio de sesión. |

## Identidad visual y accesibilidad

La paleta central está definida en `frontend/src/styles/globals.css`: rojo `#eb162c` para marca, rojo oscuro `#d51429` y vino `#a81a2b` para acciones/énfasis, gris `#6b6b6b` para secundarios, teal `#1e8c93` para foco y acentos, púrpura pálido `#eee8f2` para fondos y vino oscuro `#751324` para texto destacado. Los fondos claros usan texto oscuro. El cumplimiento de contraste WCAG debe medirse sobre los estados renderizados antes de declararlo; los colores de marca por sí solos no constituyen evidencia de conformidad.

La explicación de jerarquía, estados semánticos, tokens, contraste y decisiones responsive está en [docs/defensa/decisiones-diseno.md](docs/defensa/decisiones-diseno.md). La matriz final de auditoría registra también qué comprobaciones de accesibilidad siguen necesitando revisión manual.

## Transformación de datos de Wialon

- El mapper convierte timestamps UNIX a UTC; la UI presenta las fechas en `America/Bogota`.
- La velocidad se expone como `speed_kmh`; coordenadas no finitas o fuera de latitud ±90°/longitud ±180° se descartan.
- El rumbo se convierte en ocho sectores cardinales (N, NE, E, SE, S, SO, O, NO).
- El estado es `moving` por encima de 3 km/h, `stopped` hasta ese umbral y `no_signal` cuando la posición no es válida o el último mensaje tiene más de 600 segundos (configurable).
- Campos no disponibles se representan como `null` o listas vacías en los contratos tipados.

## Diseño responsive (UX-01)

- La interfaz se verifica desde 360 px de ancho, con 768 px como referencia de tablet y 1440 px como escritorio.
- En móvil, la navegación de la aplicación se recoge en un botón; los listados operativos se muestran como tarjetas apiladas en vez de tablas comprimidas, y los formularios pasan a una columna.
- El hero público apila texto e ilustración hasta 680 px; entre 681 y 780 px deja crecer su altura según el contenido para evitar solapamientos. A 390 px o menos, sus beneficios también se apilan.
- Los mapas conservan controles táctiles y ancho completo. En móvil reducen su altura según el viewport, mientras el historial pone los controles de reproducción debajo del mapa.
- La landing y el login se comprobaron en Chrome con viewports de 360, 768 y 1440 px. No hubo desbordamiento horizontal del documento en esas medidas.

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
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS`, `LOGIN_RATE_LIMIT_IDENTITY_REQUESTS`, `LOGIN_RATE_LIMIT_SOURCE_REQUESTS` | Límites de inicio de sesión compartidos por la base de datos. |
| `TRUSTED_PROXY_IPS` | CIDR de proxies confiables; vacío ignora `X-Forwarded-For` para identificar la IP. Configurar solo con rangos verificados. |
| `COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | Atributos de cookies de sesion. |
| `WIALON_TOKEN`, `WIALON_HOST` | Credenciales de Wialon. El token no se versiona. |
| `WIALON_HTTP_TIMEOUT_SECONDS` | Timeout de llamadas a Wialon. |
| `WIALON_RETRY_ATTEMPTS`, `WIALON_RETRY_BASE_DELAY_SECONDS`, `WIALON_READ_CACHE_TTL_SECONDS` | Reintentos acotados de lecturas y TTL de caché Wialon en memoria. Las escrituras no se reintentan. |
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

El procedimiento de revisión de credenciales está documentado en [docs/security/secret-rotation.md](docs/security/secret-rotation.md). No contiene valores secretos. Según el contexto confirmado para esta entrega, el token Wialon original no fue publicado ni expuesto y no debe reemplazarse.

- Contrasenas hasheadas con Argon2.
- Las contraseñas nuevas y cambiadas requieren al menos 12 caracteres, una letra y un número.
- Los logs del backend se emiten como JSON con hora UTC, nivel, logger y mensaje, sin serializar tokens, cookies ni cuerpos de petición.
- Access tokens JWT de corta duracion.
- Refresh tokens rotativos almacenados como hash en base de datos.
- Cookie de refresh `HttpOnly`; cookie CSRF legible por el cliente para copiar su valor a `X-CSRF-Token`. Ambas usan `Secure` en producción y `SameSite` configurable.
- Validacion CSRF en refresh, logout y cambio de sesion.
- Bloqueo temporal de cuenta tras intentos fallidos.
- Rate limiting compartido en base de datos para el login, con claves HMAC y cabeceras reenviadas ignoradas salvo proxies explícitamente confiables.
- RBAC verificado en el backend con permisos por endpoint.
- Auditoria de accesos, cambios de contrasena y operaciones administrativas.
- CORS restringido por variable de entorno.
- Contenedor Docker ejecutado con usuario no root.
- Mensajes de error de Wialon sanitizados para no exponer detalles internos.
- Token Wialon tratado como `SecretStr` en la configuracion y enviado solo al gateway.
- El token Wialon se configura unicamente en `backend/.env` y en las variables secretas de Render. No se envia al frontend, no se registra en logs y no se incluye en el repositorio ni en la documentacion.

Limitaciones de seguridad conocidas:

- No hay rate limiting global; existe bloqueo de login por intentos fallidos.
- La exportación CSV neutraliza fórmulas y aplica el permiso `export:csv` en el backend.
- El plan gratuito de Render puede tardar en responder tras un periodo de inactividad.

## API

La API se publica bajo `/api/v1`. El enlace Swagger de entrega solo está disponible si el ambiente permite OpenAPI; en producción puede estar deshabilitado por configuración.

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
| `GET` | `/exports/{kind}` | Exporta vehículos, conductores o pasajeros en CSV. |
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

Los errores HTTP, de validación y del servidor siguen Problem Details (RFC 7807) con `application/problem+json`; los errores 422 incluyen una lista `errors` por campo. La documentación OpenAPI está disponible en `/docs` en desarrollo y se deshabilita en producción. La documentación interactiva completa está en `/docs` cuando el ambiente lo permite.

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
- Antes de enviar el login, el healthcheck reintenta fallos transitorios con pausas de 1, 2 y 4 segundos (máximo cuatro intentos).
- El workflow `.github/workflows/keep-alive.yml` consulta `/health` cada 10 minutos para reducir los arranques en frío.

## Decisiones tecnicas

- [Historial de rutas y playback](docs/decisions/historial-rutas-playback.md)
- Migraciones versionadas con Alembic.
- Seed idempotente de roles, permisos y administrador inicial.
- Separacion por capas: API, servicios, repositorios, mappers y gateways.
- Mensajes de error orientados al usuario sin filtrar detalles internos.
- Proxy same-origin en Vercel para cookies de sesion.
- Supuestos, límites y decisiones de alcance: [docs/defensa/decisiones-diseno.md](docs/defensa/decisiones-diseno.md).
- Revisión requisito por requisito: [docs/entrega/auditoria-final.md](docs/entrega/auditoria-final.md).
- Guía de recorrido del código y preparación para la defensa: [docs/defensa/guia-completa-repositorio.md](docs/defensa/guia-completa-repositorio.md) y [docs/defensa/guion-defensa-tecnica.md](docs/defensa/guion-defensa-tecnica.md).
- Material de estudio progresivo de ocho bloques: [docs/defensa/plan-de-estudio.md](docs/defensa/plan-de-estudio.md). También hay [preguntas y respuestas](docs/defensa/preguntas-y-respuestas.md), [stack tecnológico explicado](docs/defensa/stack-tecnologico.md) y [historial Git explicado](docs/defensa/historial-git-explicado.md).

## Uso de inteligencia artificial

Este README declara el uso de OpenAI ChatGPT y Codex como asistentes para orientación, diagnóstico, revisión, implementación puntual, pruebas y documentación. Esta declaración no atribuye líneas o decisiones personales específicas que no estén registradas. El desarrollador debe validar el contenido, entender el código que presente y corregir el disclosure si también utilizó GitHub Copilot, OpenCode u otra herramienta.

Pautas aplicadas:

- No se documenta que la IA haya generado o almacenado secretos.
- El token de Wialon se configuro manualmente en variables de entorno, nunca en el repositorio.
- El desarrollador debe contrastar las sugerencias con el código y pruebas antes de defenderlas.
- Las limitaciones y el alcance pendiente se documentan de forma explicita.

## Estado del proyecto

Verificación local y de producción realizada el 8 de noviembre de 2026. Las capturas del dashboard y el mapa usan datos sintéticos para no publicar información operativa de la cuenta Wialon.

| Area | Estado |
| --- | --- |
| Autenticacion y sesiones | Completo en backend y frontend |
| RBAC y permisos | Completo en backend; guards en frontend |
| Dashboard | API de métricas y gráficas verificadas con recursos de Wialon en producción |
| Vehiculos y Wialon | Listado, mapa y detalle con conductor/pasajeros integrados |
| Historial de recorridos | Backend y reproducción en frontend implementados; límite de 5.000 puntos por consulta |
| Conductores y pasajeros | CRUD, custom fields y bindings integrados |
| Usuarios y auditoria | Paneles conectados; mutaciones de personas, vinculaciones, campos y usuarios auditadas |
| Exportacion CSV | Descarga conectada para vehículos, conductores y pasajeros; saneamiento central y RBAC backend |
| Despliegue publico | Frontend y healthcheck respondieron HTTP 200; login Admin y endpoints de lectura protegidos respondieron correctamente. Confirmar disponibilidad antes de cada evaluación |

La contraseña de la cuenta usada para la prueba se compartió en esta conversación. Rótala antes de entregar esa cuenta a evaluadores y envía la nueva credencial por un canal privado.

La auditoría completa diferencia cumplimiento local de evidencia externa y deja explícitos los pasos de cierre en [docs/entrega/checklist-entrega.md](docs/entrega/checklist-entrega.md). El README no certifica como terminado el ciclo de entrega hasta cerrar esos pasos.

### Capturas de la aplicación

![Dashboard con datos de muestra](docs/screenshots/dashboard-desktop.png)

![Mapa de vehículos con datos de muestra](docs/screenshots/map-desktop.png)

![Mapa de vehículos en vista móvil de 390 px con datos de muestra](docs/screenshots/map-mobile-390.png)
