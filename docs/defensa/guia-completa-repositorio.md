# Guía completa del repositorio

## Recorrido de una petición de flota

1. `frontend/src/features/vehicles/VehiclesPage.tsx` obtiene datos paginados mediante `vehiclesApi.ts` y TanStack Query.
2. `frontend/src/services/api/httpClient.ts` centraliza URL, cookies/CSRF, renovación y errores.
3. `backend/app/api/v1/vehicles.py` valida entrada y permiso antes de llamar al servicio.
4. `backend/app/services/vehicle_service.py` aplica búsqueda, filtro, orden y paginación; trabaja contra el protocolo `VehicleGateway`.
5. `backend/app/gateways/wialon/client.py` traduce las operaciones propias a servicios Wialon, gestiona sesión, errores, reintentos seguros de lectura y caché breve.
6. `backend/app/gateways/wialon/dto.py` y `backend/app/mappers/vehicle_mapper.py` validan y convierten los datos externos a DTOs propios.
7. La respuesta regresa por schemas Pydantic y React actualiza lista/mapa.

## Carpetas

| Ruta | Propósito |
| --- | --- |
| `backend/app/api/v1/` | Presentación HTTP, permisos y contratos de endpoint. |
| `backend/app/services/` | Casos de uso y reglas del dominio. |
| `backend/app/repositories/` | Persistencia local SQLAlchemy. |
| `backend/app/models/` | Tablas y relaciones. |
| `backend/app/gateways/wialon/` | Adaptador, sesión, DTOs y errores del proveedor. |
| `backend/app/mappers/`, `backend/app/dto/`, `backend/app/schemas/` | Transformación y contratos propios. |
| `backend/alembic/` | Historial de esquema SQL. |
| `backend/tests/` | Unitarias e integración HTTP con dobles/mock del proveedor. |
| `frontend/src/features/` | Vistas organizadas por dominio funcional. |
| `frontend/src/services/api/` | Transporte API y normalización de fallos. |
| `frontend/src/components/` | Controles visuales/feedback compartidos. |
| `frontend/tests/` | Pruebas de router, auth y vistas. |
| `docs/` | Requisitos, decisiones, evidencia y defensa. |

## Persistencia local vs. remota

La aplicación guarda cuentas locales, roles/permisos, refresh token hasheados, auditoría y contadores de rate limit. Los vehículos, mensajes, conductores y pasajeros se consultan desde Wialon; no se replican como fuente de verdad en PostgreSQL. Las lecturas tienen caché breve en memoria; escrituras remotas no se reintentan automáticamente por ambigüedad del resultado.

## Seguridad y roles

El seed define permisos granulares y tres roles (`admin`, `operator`, `viewer`). Las rutas de frontend ajustan navegación, mientras que las dependencias de backend autorizan cada endpoint. Admin gestiona cuentas y auditoría; operator ejecuta operaciones permitidas; viewer tiene lectura. Pruebas relevantes: `backend/tests/integration/test_people_rbac.py`, `test_exports_rbac.py`, `test_dashboard_rbac.py`, `test_audit_rbac.py`.

## Pruebas documentadas

- Backend cierre: 138 tests passed; la cobertura no se recalculo en esa actualizacion.
- Frontend: 15 archivos, 68 tests passed; typecheck y build correctos.
- CI declara `pip-audit`, `npm audit`, pruebas, build y validación/arranque Docker Compose.
- No hay linter configurado en scripts de frontend; la revisión con lector de pantalla requiere una persona.
