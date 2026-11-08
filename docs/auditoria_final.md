# Auditoría final de `docs/prueba_tecnica.md`

Fecha de revisión: 8 de noviembre de 2026. Estado basado en el código, las pruebas y la configuración del repositorio; “implementado” no implica que el servicio público o una cuenta real hayan sido verificados en esta sesión.

## Resultado por requerimiento

| ID / grupo | Estado | Evidencia o brecha |
| --- | --- | --- |
| INT-01–05 | Implementado | `WialonClient` gestiona sesión; gateway, DTOs, mappers y errores están separados. |
| INT-06 | Parcial | Timeouts explícitos y renovación de sesión; el cliente Wialon no tiene backoff para indisponibilidad ni caché TTL. |
| INT-07 | Bonus no implementado | No hay circuit breaker; la UI permite reintentar y presenta estados de error. |
| Transformación 4.4 | Implementado | UTC/Bogotá, km/h, coordenadas y rumbo están mapeados; `map_vehicle` deriva estados con umbral configurable. |
| RF-01–07 | Implementado en código | Landing pública, auth, RBAC, administración, primer cambio de contraseña y seed por entorno tienen pruebas. El acceso real de Admin en producción se debe reconfirmar antes de entrega. |
| RF-08–20 | Implementado en código | CRUD de personas/campos, bindings, detalle y actualizaciones Wialon tienen servicios, DTOs, feedback y pruebas. RF-18 requiere verificar la detección de duplicados frente a Wialon con recursos reales. |
| RF-21 | Parcial (recomendado) | Guardado con estados y reintento; no usa actualización optimista con rollback. |
| RF-22 | Bonus no implementado | No se detectan conflictos concurrentes de edición. |
| RF-23–27 | Implementado en código | Dashboard, historial/playback, CSV sanitizado y auditoría están conectados; el dashboard y el mapa necesitan una verificación final contra la cuenta desplegada. |
| RF-28 | Implementado en código | Pasajeros tienen búsqueda por servidor, selección de recurso, orden y paginación. |
| ARQ-01, 03, 05–13 | Implementado | Capas, gateway/adapter, DTO/mapper, repositorios, configuración por entorno, migraciones, frontend modular, cliente HTTP, React Query y estados de carga/error. |
| ARQ-02 | Parcial | README ahora incluye ejemplos con archivo y línea de SOLID; esos ejemplos deben revisarse en defensa técnica y mantenerse al día al cambiar las líneas. |
| ARQ-04 | Implementado en código | Errores HTTP, validación y errores internos usan Problem Details (`application/problem+json`). Listados incluyen `items`, `total`, `offset` y `limit`, también usuarios y auditoría; OpenAPI publica esos esquemas. |
| TST-01 | Implementado | `pytest --cov=app` dio 80% total (referencia: 60%); hay módulos puntuales de rutas CRUD con cobertura menor. |
| TST-02 | Parcial | Hay pruebas de RBAC para los tres roles y operaciones críticas, no una matriz automatizada de cada endpoint/permiso. |
| TST-03 | Implementado | 65 pruebas frontend pasan con Vitest y Testing Library. |
| TST-04 | Bonus no implementado | No se encontraron pruebas E2E. |
| SEG-01–05, SEG-08–11 | Implementado en código, con verificación de despliegue pendiente | RBAC, cookies/CSRF, Argon2, validación, headers, logging de auditoría/denegación, host Wialon configurado y excepciones sanitizadas. CORS y headers públicos deben reconfirmarse en producción. |
| SEG-06 | Implementado en CI; primer resultado pendiente | `npm audit --offline` reportó 0 vulnerabilidades. El workflow ahora ejecuta `npm audit --audit-level=high` y `pip-audit -r requirements.txt`; el entorno local no tenía `pip-audit` y falta confirmar el primer resultado de CI. |
| SEG-07 | Parcial | Hay política de contraseña, lockout temporal por cuenta y refresh rotatorio; falta rate limiting distribuido por IP/endpoint. La capa debe elegirse según el proxy y las instancias de despliegue. |
| UX-01 | Parcial | Landing/login se habían comprobado a 360, 768 y 1440 px; listados son tarjetas y el formulario de detalle usa container queries. Falta recorrer todas las vistas autenticadas en esos tamaños con datos reales. |
| UX-02 | Implementado en código | La identidad visual, componentes, estados, navegación y dashboard tienen sistema coherente. |
| UX-03 | Parcial | Etiquetas, foco, semántica, reduced motion y SVG decorativos están atendidos; faltan medición WCAG AA de todos los estados y revisión con teclado/lector de pantalla. |
| UX-04 | Parcial | Hay indicadores de carga, feedback inline, errores útiles, reintentos y confirmaciones destructivas. No hay sistema global de toasts para todas las acciones. |
| UX-05 | Implementado | Rutas y navegación se filtran por permisos y el backend aplica los mismos permisos. |
| UX-06 | Implementado en código | Búsqueda/filtros, orden server-side y paginación están disponibles en vehículos, conductores, pasajeros, usuarios y auditoría. Falta recorrido manual de las combinaciones en producción. |
| UX-07 | Pendiente | No se instaló Lighthouse ni se registró una medición móvil de 85/90/90. El bundle principal sigue sobre 500 kB minificado. |
| UX-08 | Bonus parcial | `prefers-reduced-motion` está contemplado; no hay modo oscuro. |
| BD | Implementado | PostgreSQL, modelos de RBAC/auditoría, migraciones versionadas y seed idempotente. |
| README / docs | Parcial | Incluye enlaces, setup, diagramas, decisiones, seguridad, transformaciones, IA y limitaciones. Faltan capturas requeridas de landing, dashboard, mapa y móvil; Swagger solo se expone fuera de producción. |
| GIT-01, 02, 04, 05 | Implementado | Repositorio público, commits convencionales e incrementales, sin reescritura forzada, lockfiles y `.gitignore`. |
| GIT-03 | Recomendación no seguida | Los cambios se han integrado directamente en `main`; no es requisito obligatorio. |
| DEP-01–03, 05–06 | Configurado; producción por verificar | URLs/configuración públicas, variables de entorno, CORS configurable, Docker Compose y GitHub Actions existen. Esta auditoría no confirmó disponibilidad ni CORS efectivo en vivo. El workflow incluye `pip-audit`/`npm audit`; falta observar su primera ejecución. |
| DEP-04 | Implementado en frontend; falta prueba desplegada | El login reintenta el healthcheck en hasta cuatro intentos con pausas 1/2/4 s y mensaje de arranque; falta probar el ciclo real dormido/despierto. |
| Entrega 10.3 | Pendiente fuera del repositorio | No se envió correo, no se confirma disponibilidad por 15 días ni se incluyen aquí credenciales privadas de Admin. |

## Limpieza del repositorio

- Eliminé `frontend/src/components/ui/Badge.tsx`: `rg` no encontró consumidores; el componente no participaba en ninguna vista.
- Eliminé `frontend/dist`, cinco capturas locales `.qa-*.png` y `backend/.coverage`. Eran artefactos ignorados y regenerables, no fuentes del proyecto.
- No encontré otros módulos de `src` sin referencias ni directorios fuente vacíos. Conservé `docs/prueba_tecnica.md`, assets usados, configuraciones de entorno y dependencias locales.
- Intenté retirar `.pytest_cache` de raíz/backend/frontend, pero Windows respondió “Acceso denegado”. Son cachés ignoradas, no archivos versionados; se dejan intactas.

## Plan final, en orden

1. **Completar verificación funcional de producción.** Tras publicar estos commits, comprobar health, login Admin, RBAC de los tres roles, tiles OSM, CRUD Wialon, dashboard, filtros/orden/paginación y arranque en frío. Criterio: recorrido reproducible sin errores 4xx/5xx inesperados y tiles servidos con `Referer` válido.
2. **Cerrar UX-01/UX-03 y UX-06 visualmente.** Recorrer rutas autenticadas a 360, 768 y 1440 px; medir contrastes WCAG AA y teclado/lector de pantalla. Criterio: sin overflow/solapes, ratio mínimo 4.5:1 para texto normal y evidencia registrada.
3. **Optimizar y medir UX-07.** Analizar el bundle y cargar componentes/paquetes con separación si mejora el resultado; ejecutar Lighthouse móvil sobre la landing desplegada. Criterio: rendimiento ≥85, accesibilidad ≥90, buenas prácticas ≥90 y reporte/captura en README.
4. **Completar autenticación y observar auditorías.** Confirmar el primer CI con `pip-audit` y `npm audit`; decidir limitador compartido (DB/servicio compatible) para rate limiting, conservar lockout por cuenta. Criterio: CI publica resultado sin vulnerabilidades conocidas y pruebas de límites/expiración pasan sin confiar en cabeceras IP no verificadas.
5. **Completar entrega documental.** Añadir capturas reales de landing, dashboard, mapa y móvil; revisar referencias SOLID; enviar URL y credenciales Admin por el canal privado de entrega y confirmar periodo de disponibilidad.

