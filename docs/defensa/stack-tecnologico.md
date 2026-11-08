# Stack tecnológico

## Backend

| Tecnología | Uso en este proyecto |
| --- | --- |
| Python 3.14, FastAPI | API HTTP versionada y contratos OpenAPI. |
| Pydantic 2 | Validación de settings, solicitudes y respuestas. |
| SQLAlchemy 2, PostgreSQL y psycopg 3 | Usuarios, roles, permisos, sesiones refresh, auditoría y límites de login. Vehículos/personas operativas siguen en Wialon. |
| Alembic | Migraciones de base de datos. |
| Argon2, PyJWT | Hash de contraseñas y tokens de sesión. |
| httpx | Comunicación con Wialon mediante un gateway propio. |
| pytest, pytest-cov | Pruebas unitarias y de integración con Wialon simulado. |

## Frontend

| Tecnología | Uso |
| --- | --- |
| React 19, TypeScript, Vite 8 | Interfaz SPA y compilación. |
| React Router | Navegación y guards. |
| TanStack Query | Caché/estado remoto, refetch y sincronización tras mutaciones. |
| Axios | Cliente HTTP centralizado, renovación de sesión y errores. |
| React Hook Form, Zod | Formularios y validación declarativa. |
| Leaflet, React Leaflet y OpenStreetMap | Mapas, marcadores, clustering y recorridos. |
| Tailwind CSS 4 y CSS del producto | Utilidades más sistema visual propio. |
| Vitest, Testing Library, jsdom | Pruebas de componentes y flujos. |

## Despliegue

- Vercel sirve la SPA y proxy same-origin hacia la API.
- Render ejecuta el backend en Docker.
- Neon ofrece PostgreSQL.
- GitHub Actions valida pruebas, auditorías de dependencias y entorno Docker Compose.

## Límites de la validación de stack

Versiones declaradas en `backend/requirements.txt`, `frontend/package.json` y lockfiles. El Docker Compose no pudo ejecutarse localmente porque Docker CLI no está instalado en el entorno auditado; su workflow sí forma parte del repositorio. La configuración secreta actual de los proveedores no fue inspeccionada.
