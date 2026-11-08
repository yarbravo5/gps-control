# Tecnologías del proyecto, explicadas

Esta guía describe tecnologías que aparecen en el código o los archivos de dependencias. Las versiones indicadas se comprobaron en `backend/requirements.txt`, `frontend/package-lock.json` y `frontend/package.json` en noviembre de 2026. Los signos `^` en `package.json` son rangos compatibles; el lockfile fija la versión instalada.

## Backend y base de datos

### Python 3.14 y FastAPI 0.162.0

- **Qué es:** Python es el lenguaje del servidor; FastAPI es el framework que recibe HTTP y responde JSON.
- **Para qué y qué resuelve:** expone endpoints, valida contratos y conecta dependencias. Los routers están en `backend/app/api/v1/`; la aplicación y middleware en `backend/app/main.py`.
- **Por qué:** permite construir una API tipada y generar OpenAPI desde schemas. Alternativas: Django REST Framework, Flask o Litestar.
- **Ventaja:** routing y validación claros, buena integración con Pydantic y pruebas HTTP con TestClient. **Límite:** el framework no crea la arquitectura ni garantiza permisos; esos controles están en código propio.
- **Cómo decirlo sencillo:** FastAPI es la recepción del backend: recibe la petición, valida datos, revisa permisos y devuelve la respuesta.

### Pydantic 2.14.3 y pydantic-settings 2.16.2

- **Qué es:** librerías que validan estructuras de datos y configuración.
- **Dónde:** `backend/app/schemas/` define requests/responses; `backend/app/core/config.py` carga variables de ambiente.
- **Por qué:** evita aceptar tipos o formatos inválidos sin validación explícita en cada endpoint. Alternativas: Marshmallow, attrs o validación manual.
- **Ventaja:** validación declarativa y errores consistentes. **Límite:** validar forma no reemplaza autorización ni reglas de negocio.
- **Sencillo:** son formularios automáticos para los datos que entran y salen del backend.

### SQLAlchemy 2.1.8, PostgreSQL y psycopg 3.3.8

- **Qué son:** PostgreSQL es una base relacional; SQLAlchemy mapea tablas a clases Python; psycopg es su controlador de conexión.
- **Para qué:** guardan usuarios, roles/permisos, refresh tokens, auditoría y controles de rate limit. Los modelos están en `backend/app/models/`, repositorios en `backend/app/repositories/` y conexión en `backend/app/db/session.py`.
- **Por qué:** estos datos requieren relaciones y transacciones. Alternativas: Django ORM, SQLModel, SQLite o MySQL.
- **Ventaja:** restricciones relacionales y transacciones; **límite:** requiere gestionar conexión, índices y migraciones. Vehículos/personas no se replican aquí: Wialon es la fuente operativa.
- **Sencillo:** PostgreSQL guarda las cuentas y la seguridad del producto, pero la flota sigue guardada en Wialon.

### Alembic 1.20.1

- **Qué es:** gestor de cambios versionados del esquema SQL.
- **Dónde:** `backend/alembic/`, `backend/alembic.ini`; Docker ejecuta `alembic upgrade head` antes de iniciar Uvicorn.
- **Por qué:** cada migración explica cómo pasar de una versión de tablas a la siguiente. Alternativas: migraciones de Django o Flyway.
- **Ventaja:** cambios reproducibles entre entornos; **límite:** una migración errónea puede afectar datos, así que se revisa antes de producción.
- **Sencillo:** es el historial de instrucciones para actualizar las tablas sin recrear la base de datos.

### Argon2-cffi 25.1.0 y PyJWT 2.15.1

- **Qué son:** Argon2 transforma una contraseña en un hash difícil de revertir; JWT firma tokens con datos y vencimiento.
- **Dónde:** `backend/app/core/security.py`; flujos en `backend/app/services/auth_service.py` y `backend/app/api/v1/auth.py`.
- **Por qué:** nunca se guarda la contraseña en claro; los tokens permiten verificar identidad entre peticiones. Alternativas: bcrypt/scrypt para passwords, sesiones opacas almacenadas en servidor para autenticación.
- **Ventaja:** hash resistente y tokens firmados; **límite:** un JWT no cifra su contenido y no sustituye HTTPS, cookies seguras, revocación y CSRF.
- **Sencillo:** Argon2 guarda una huella de la contraseña; JWT es una credencial firmada con fecha de expiración.

### httpx 0.28.1

- **Qué es:** cliente HTTP de Python.
- **Dónde:** `backend/app/gateways/wialon/client.py` realiza las llamadas a Wialon.
- **Por qué:** el servidor necesita hablar con una API externa sin que el navegador conozca el token de Wialon. Alternativas: requests, aiohttp o un SDK del proveedor.
- **Ventaja:** timeouts y errores HTTP explícitos; **límite:** no conoce por sí solo los métodos de Wialon; el gateway traduce servicios y SID.
- **Sencillo:** es el teléfono del backend para llamar a Wialon; el gateway decide qué decir y cómo interpretar la respuesta.

### pytest 9.2.0 y pytest-cov 7.1.0

- **Qué son:** runner de pruebas y complemento que mide qué líneas se ejecutaron.
- **Dónde:** `backend/tests/`; tests de servicio, gateway, mapper y endpoints.
- **Por qué:** repetir comprobaciones y encontrar regresiones. Alternativas: unittest y coverage.py.
- **Ventaja:** tests rápidos y fixtures reutilizables; **límite:** un test con `FakeGateway` comprueba la lógica local, no que Wialon haya aplicado una escritura real.
- **Sencillo:** son comprobaciones automáticas del código; cada test debe decir claramente si usa un proveedor simulado o real.

## Frontend

### React 19.3.1, TypeScript 7.0.2 y Vite 8.3.6

- **Qué son:** React compone la interfaz por componentes; TypeScript añade tipos al JavaScript; Vite sirve desarrollo y compila el sitio.
- **Dónde:** pantallas en `frontend/src/features/`; arranque en `src/main.tsx`; configuración y scripts en `frontend/package.json`, `vite.config.ts` y `tsconfig.json`.
- **Por qué:** interfaz dividida por dominios y detección de errores de tipos antes de ejecutar. Alternativas: Vue/Svelte/Angular y webpack/Rollup.
- **Ventaja:** componentes reutilizables, tipos para requests y build rápido; **límite:** los tipos TS no validan respuestas en runtime, por eso el backend valida y `Zod` valida formularios.
- **Sencillo:** React dibuja la pantalla, TypeScript ayuda a no confundir datos y Vite prepara los archivos para publicarlos.

### React Router 7.18.5 y TanStack Query 5.106.1

- **Qué son:** Router decide qué pantalla corresponde a la URL; Query administra peticiones, caché y recarga de datos remotos.
- **Dónde:** `frontend/src/app/router/AppRouter.tsx`, `features/auth/RouteGuards.tsx`, `app/providers/AppProviders.tsx` y páginas de features.
- **Por qué:** separa navegación del código de cada vista y evita mantener manualmente estados de red duplicados. Alternativas: navegación propia y estado con hooks/context.
- **Ventaja:** rutas anidadas, carga diferida, loading/error y caché; **límite:** guards frontend solo mejoran UX. El backend debe y sí revisa permisos en cada endpoint.
- **Sencillo:** Router elige la pantalla y Query recuerda/actualiza lo que llega del servidor.

### Axios 1.21.0

- **Qué es:** cliente HTTP de JavaScript.
- **Dónde:** `frontend/src/services/api/httpClient.ts` centraliza URL, cookies, headers, healthcheck, reintento de sesión y errores; las APIs de features lo reutilizan.
- **Por qué:** no repetir reglas de transporte en cada vista. Alternativa: Fetch API nativa.
- **Ventaja:** interceptores y configuración común; **límite:** hay que evitar repetir solicitudes inseguras automáticamente. Refresh está coordinado y las escrituras remotas ambiguas no se reintentan en el gateway.
- **Sencillo:** es el mensajero común desde todas las pantallas hacia la API.

### React Hook Form 7.91.0 y Zod 4.6.7

- **Qué son:** herramientas para administrar campos y validar valores del formulario.
- **Dónde:** `features/auth/LoginPage.tsx`, cambio de contraseña y formularios de personas; componente compartido en `components/ui/TextField.tsx`.
- **Por qué:** centralizan valores y errores sin escribir handlers repetidos. Alternativas: formularios controlados en React o Formik/Yup.
- **Ventaja:** validación cercana al campo y menos código de estado; **límite:** backend vuelve a validar porque el navegador no es una frontera de seguridad.
- **Sencillo:** RHF recoge lo que el usuario escribe y Zod comprueba si tiene el formato esperado.

### Leaflet 1.9.4, React Leaflet 5.0.0 y OpenStreetMap

- **Qué son:** Leaflet es motor cartográfico JS; React Leaflet conecta ese motor a componentes; OSM aporta tiles/datos cartográficos.
- **Dónde:** `features/vehicles/FleetMap.tsx`, `features/trip-history/HistoryMap.tsx` y estilos de mapa.
- **Por qué:** mapa libre y sin proveedor de pago con tarjeta obligatoria. Alternativas: MapLibre u OpenLayers.
- **Ventaja:** ligero y adecuado para marcadores y polilíneas; **límite:** el servicio público de tiles tiene política y capacidad limitada. Se conserva atribución y se deben respetar sus condiciones.
- **Sencillo:** Leaflet dibuja el mapa; React Leaflet permite controlarlo con React; OSM aporta el fondo de calles.

### Tailwind CSS 4.3.5 y CSS propio

- **Qué son:** Tailwind ofrece clases utilitarias; `globals.css` define tokens, componentes y diseño de GPS Control.
- **Dónde:** `frontend/src/styles/globals.css` y estilos por feature.
- **Por qué:** construir responsive con reglas consistentes sin perder identidad de marca. Alternativas: CSS Modules, Sass o una biblioteca visual.
- **Ventaja:** estilos reutilizables y breakpoints; **límite:** exceso de clases dificulta lectura, por eso layouts complejos usan clases de producto.
- **Sencillo:** Tailwind ayuda a ajustar medidas y espacios; el CSS propio fija los colores y componentes de la marca.

### Vitest 5.1.0, Testing Library 16.3.3 y jsdom 31.0.0

- **Qué son:** runner, utilidades de prueba que interactúan como una persona, y DOM simulado sin navegador gráfico.
- **Dónde:** `frontend/tests/` y scripts de `frontend/package.json`.
- **Por qué:** probar login, navegación, nombres accesibles, errores y vistas rápido. Alternativas: Jest/Enzyme, Playwright o Cypress para navegador real.
- **Ventaja:** pruebas centradas en comportamiento; **límite:** jsdom no representa por completo un navegador, mapa, red, lector de pantalla ni proveedor en producción.
- **Sencillo:** ejecuta componentes en un navegador pequeño simulado; sirve para lógica/UI básica, no para certificar toda la experiencia real.

## Infraestructura y ejecución

| Tecnología | Papel, motivo y límite |
|---|---|
| Docker / Compose | Empaqueta backend y Postgres local para repetir el entorno. Dockerfile usa Python slim y usuario no root; Compose permite levantar servicios juntos. No se ejecutó CLI local; Docker Compose CI sí pasó. |
| GitHub Actions | Ejecuta backend, frontend, auditoría y Compose al publicar. No reemplaza prueba real de usuario ni Wialon. El repositorio público puede usar runners estándar gratuitos según los límites vigentes. |
| Render | Ejecuta backend FastAPI en Docker. En free puede suspender por inactividad y despertar lentamente; salud/versión verificados, uso futuro no garantizado. |
| Neon | PostgreSQL administrado para datos locales del producto. Compute puede escalar a cero; se deben revisar cuotas del proyecto y estado de almacenamiento. |
| Vercel | Sirve el frontend estático y reescribe `/api/*` al backend same-origin. El navegador usa la misma URL de origen para cookies; consumo/plan de la cuenta no se inspeccionó. |

## Comandos de referencia

Desde `frontend`: `npm ci`, `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`. Desde `backend` con virtualenv activado: `pip install -r requirements.txt`, `alembic upgrade head`, `python -m app.db.seed`, `uvicorn app.main:app --reload`, `python -m pytest tests -q`. No compartas archivos `.env`; copia `.env.example` y rellena solo valores locales autorizados.
