# Guion de defensa tecnica de GPS Control

Guion para una demostración con el frontend y el repositorio abiertos. Ajusta los minutos a las preguntas; no memorices frases que no puedas demostrar en código. Usa solo la cuenta Admin real que el propietario haya validado. Limita Wialon a lecturas; no modifiques recursos reales.

## Preparación antes de compartir pantalla

1. Abre `https://gps-control-mu.vercel.app` y confirma que carga. Si requiere login, usa solo la cuenta real de evaluación con autorización del propietario; no uses la cuenta de prueba compartida.
2. Abre el repositorio en `main`, README y esta guía. Ten pestañas de GitHub CI, API `/health` y `/version`.
3. Evita datos personales y coordenadas reales al compartir pantalla; no abras `.env`, paneles de secretos ni historial de terminal con contraseñas.
4. Ten disponibles estos archivos: router de vehículos, servicio, gateway, mapper, tests de servicio, RBAC y CSS global.
5. Si Wialon o un proveedor no responde, dilo y muestra tests locales. No afirmes que un mock es producción.

## Versión breve: 15 minutos

| Tiempo | Qué mostrar | Qué decir / concepto | Archivo para abrir | Pregunta posible |
|---|---|---|---|---|
| 0:00–1:00 | Portada/README | “GPS Control muestra flota de Wialon con acceso por roles. Wialon conserva los datos operativos; PostgreSQL conserva identidad y auditoría.” | README, arquitectura | ¿Qué problema resuelve? |
| 1:00–2:00 | Landing | Explica propuesta, módulos y responsive. | `LandingPage.tsx`, `globals.css` | ¿Por qué landing pública? |
| 2:00–4:00 | Login y navegación | Inicia solo con la cuenta aprobada. Explica sesión y que el servidor decide permisos. | `LoginPage.tsx`, `AuthProvider.tsx`, `RouteGuards.tsx`, `auth.py` | ¿Qué impide llamar API directamente? |
| 4:00–5:00 | Roles si el acceso permite | Muestra navegación permitida y explica que backend repite RBAC. No crees usuarios en producción durante la defensa. | `core/dependencies.py`, `seed.py` | ¿Qué puede hacer Viewer? |
| 5:00–6:30 | Dashboard | KPIs salen de respuestas transformadas, no de tablas SQL locales de vehículos. | `DashboardPage.tsx`, `dashboard_service.py` | ¿Cuándo se actualizan? |
| 6:30–8:30 | Lista, detalle y mapa | Filtrar lista, elegir una unidad y observar el resaltado correspondiente. Describe estados, clustering y polling visible. | `VehiclesPage.tsx`, `FleetMap.tsx`, `vehicle_mapper.py` | ¿Cómo se calcula no_signal? |
| 8:30–9:30 | Conductores/pasajeros en modo lectura | Muestra listados y relaciones; explica que la UI ofrece CRUD, pero escrituras reales no se validaron en esta auditoría. | `DriversPage.tsx`, `PassengersPage.tsx`, `people_service.py` | ¿Qué hace un PATCH parcial? |
| 9:30–10:30 | Historial | Elige solo un rango autorizado. Enseña playback y límite 7 días/5000 puntos si hay datos accesibles. No cambies datos. | `HistoryPage.tsx`, `history_service.py` | ¿Por qué hay límite? |
| 10:30–11:15 | Auditoría/CSV | Explica que cambios sensibles se registran; export CSV neutraliza celdas que podrían interpretarse como fórmula. | `AuditPage.tsx`, `csv_service.py` | ¿Quién puede exportar? |
| 11:15–13:00 | Arquitectura | Sigue GET vehículos: UI → API de feature → httpClient → router → servicio → gateway → mapper → schema. Explica DI/Protocol. | `vehiclesApi.ts`, `httpClient.ts`, `vehicles.py`, `vehicle_service.py`, `client.py` | ¿Por qué no llamar Wialon desde React? |
| 13:00–14:00 | Seguridad y pruebas | Muestra un test de RBAC y uno de preservación con fake; di en voz alta que el segundo no es escritura real. | `test_people_rbac.py`, `test_people_service.py` | ¿Qué prueban mocks? |
| 14:00–15:00 | Git, IA, límites | Muestra commit, workflow, disclosure IA. Cierra con que Wialon writes y lector de pantalla siguen sin evidencia. | `git log`, README, auditoría | ¿Qué harías después? |

### Texto inicial sugerido

“Voy a mostrar una operación desde la pantalla hasta Wialon y de vuelta. La app separa su identidad local de los datos de flota. Donde la evidencia es simulada lo voy a indicar; no realicé escrituras de evaluación en la cuenta operativa.”

## Versión completa: 30 minutos

| Tiempo | Demo y pantalla | Archivo/función | Concepto y explicación sencilla |
|---|---|---|---|
| 0:00–1:30 | Problema, objetivo, límites | README, requisitos | GPS Control da una vista de operación; no reemplaza Wialon como dueño de datos de flota. |
| 1:30–3:00 | Landing desktop/móvil | `LandingPage.tsx`, `globals.css` | Jerarquía visual, responsive, skip link, foco visible y contraste corregido. |
| 3:00–5:00 | Login | `LoginPage.tsx`, `auth.py`, `auth_service.py` | Validación en navegador mejora UX; servidor verifica credenciales, password hash y rate limit. |
| 5:00–6:30 | Sesión/cambio obligatorio | `AuthProvider.tsx`, `ChangePasswordPage.tsx`, `authTokenStore.ts` | Access token corto, refresh por cookie, CSRF; cuenta recién creada debe cambiar password. |
| 6:30–8:00 | Admin/Operator/Viewer | Admin UI, `dependencies.py`, `seed.py` | Guard frontend guía la navegación; backend autoriza cada endpoint por permiso. No crear perfil en vivo salvo autorización expresa. |
| 8:00–9:30 | Dashboard | `DashboardPage.tsx`, `dashboard_service.py` | El servicio consulta gateways, agrega métricas; UI representa estados de carga/error. |
| 9:30–11:30 | Vehículos: filtro/paginación/detalle | `VehiclesPage.tsx`, `vehiclesApi.ts`, `vehicles.py` | Paginación server-side y orden. Explica query params y response schema. |
| 11:30–13:30 | Mapa | `FleetMap.tsx`, `vehicle_mapper.py` | Leaflet/OSM, clustering, sincronización lista/mapa. Mapper valida coordenadas y timestamp; moving si >3 km/h, no_signal si datos inválidos/antiguos. |
| 13:30–15:30 | Conductores y pasajeros lectura | páginas de people, `people_service.py` | Personas/tags viven en recurso de Wialon. Presenta campos/bindings sin mutar datos. |
| 15:30–17:00 | Campos personalizados | `CustomFieldsEditor.tsx`, servicio people/vehicle | Un PATCH parcial debe preservar los demás campos. Enseña test fake que falla seguro cuando no hay estado base. |
| 17:00–18:30 | Historial | `HistoryPage.tsx`, `HistoryMap.tsx`, `history_service.py` | `messages/load_interval`, playback, rango 7 días y máximo 5000 puntos. Lectura real de historial no confirmada en esta auditoría. |
| 18:30–19:30 | Auditoría y CSV | `AuditPage.tsx`, `csv_service.py` | Trazabilidad por permiso y prevención de CSV formula injection. |
| 19:30–22:00 | Arquitectura por capas | `api/v1/vehicles.py`, `vehicle_service.py`, `WialonClient`, mapper y schema | API traduce HTTP; servicio regla; gateway traduce proveedor; mapper traduce datos. Protocol/Depends habilitan sustitutos. |
| 22:00–23:30 | Seguridad | `core/security.py`, cookies, dependencies, middleware, `vercel.json` | Argon2, JWT, cookies, CSRF, CORS, CSP, cabeceras y mínimo privilegio. No afirmar verificación de contraseña comprometida: no existe en el alcance actual. |
| 23:30–25:00 | Pruebas | `backend/tests/`, `frontend/tests/` | Tests backend 138 y frontend 69; TestClient/FakeGateway y Testing Library. Suite verde no demuestra escritura remota. |
| 25:00–26:00 | Git | `git log`, workflows | Commits incrementales, Conventional Commits, push normal y CI. No se puede demostrar ausencia de force push pasado desde un clone. |
| 26:00–27:00 | Decisiones visuales | `decisiones-diseno.md`, `globals.css` | Rojo acento, vino énfasis, teal foco, gris y superficie lila; contraste y estados por texto/icono. |
| 27:00–28:00 | Uso de IA | README | Nombra únicamente herramientas declaradas en el README; explica usos como apoyo y confirma que puedes defender el código. No inventes tareas humanas o automáticas. |
| 28:00–30:00 | Limitaciones y preguntas | Auditoría final | Wialon writes no verificadas, lector de pantalla no ejecutado, cuotas no inspeccionadas y cuenta real debe ser probada por propietario. Agradece preguntas; no prometas SLA. |

## Respuestas técnicas que conviene practicar

- **¿Por qué una capa por responsabilidad?** Para cambiar transporte/proveedor o probar una regla sin reescribir todo. Muestra el Protocol del servicio y la implementación Wialon.
- **¿Por qué no reintentar una escritura?** El proveedor puede haber guardado el cambio y perderse la respuesta; primero se consulta el estado.
- **¿Cómo se prueba RBAC?** TestClient hace request con un usuario/rol de prueba; asserts en 403/200. No es solo botón oculto.
- **¿Qué parte de Wialon se comprobó con datos reales?** Lecturas históricas de unidades, posiciones, recursos y personas. No se acreditaron writes ni lectura real de history en el último pase.
- **¿Cuál fue la corrección reciente?** Contraste/nombres accesibles en la landing y `/version` para conocer SHA de Render sin revelar secretos.
- **¿La cuenta real Admin está comprometida?** No hay evidencia de eso: el propietario aclaró que la cuenta compartida era una cuenta de prueba distinta. El propietario debe verificar la cuenta real de manera privada.

## Cierre de demostración

“La ruta principal está implementada, las pruebas y CI pasan y la revisión desplegada es identificable. Mantengo separada la evidencia simulada de Wialon real. Antes de la evaluación, el propietario debe probar la cuenta Admin real y asumir la disponibilidad del servicio durante el plazo indicado.”
