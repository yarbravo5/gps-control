# Guion de defensa técnica (15–30 minutos)

## Secuencia sugerida (20 minutos)

| Minutos | Qué mostrar | Qué explicar |
| --- | --- | --- |
| 0–2 | README, landing y despliegue | Problema resuelto, usuarios objetivo y alcance. |
| 2–5 | Login, cambio de contraseña y navegación por rol | Access/refresh, CSRF, guards UX y permisos reales en backend. |
| 5–8 | Flota, dashboard y mapa | Datos transformados; estados y sincronía; polling en pestaña visible. |
| 8–12 | Conductores/pasajeros y campos | Wialon como fuente de verdad; merge de campos existentes; no reintentar escrituras ambiguas. |
| 12–15 | Código gateway→servicio→API y un test | Capas, DI por protocolo, DTO/mappers y mock de Wialon. |
| 15–18 | Historial, CSV y auditoría | Límites de consulta, playback, CSV injection, trazabilidad. |
| 18–20 | CI, seguridad y limitaciones | 136/68 pruebas, cobertura, rotación de admin y requisitos externos pendientes. |

Para 15 minutos, mostrar solo una operación completa (listar vehículo) desde UI a gateway y un test RBAC. Para 30, ampliar con inspección de migración, retry de sesión Wialon y errores Problem Details.

## Recorrido de código recomendado

1. `backend/app/api/v1/vehicles.py` — contrato y autorización.
2. `backend/app/services/vehicle_service.py` — filtros y reglas.
3. `backend/app/gateways/wialon/client.py` — protocolo externo/sesión.
4. `backend/app/mappers/vehicle_mapper.py` — unidades/tiempo/estado.
5. `frontend/src/features/vehicles/VehiclesPage.tsx` — query, filtros, detalle.
6. `backend/tests/integration/test_people_rbac.py` y un test unitario de servicio — prueba de límites.

## Declaraciones que deben ser honestas

- No se hizo escritura contra Wialon durante esta auditoría; mocks prueban lógica, pero no confirman el efecto externo actual.
- La clave Admin que se compartió en la conversación debe rotarse antes de entregarla a evaluadores.
- La revisión manual de teclado/lector de pantalla y la configuración secreta de despliegue no se pueden afirmar a partir de pruebas automatizadas o el código.
- Strategy/Factory no se usa como selector runtime; se inyectan gateways compatibles en servicios/pruebas.
