# Plan de estudio del repositorio

## Cómo usar este plan

Avanza en orden y estudia con el repositorio abierto. No memorices definiciones: lee el flujo, dibújalo con tus palabras y luego confirma la explicación en el código. Cada bloque puede tomar entre 45 y 90 minutos. Puedes parar después de cada criterio de comprensión.

Regla para todos los ejercicios: no copies contraseñas de producción a archivos, terminal o capturas; no ejecutes escrituras de Wialon; usa las pruebas existentes y datos simulados. Una prueba con FakeGateway no es una prueba contra Wialon.

---

## Bloque 1 — Qué hace la plataforma y qué problema resuelve

### Objetivos

- Poder explicar el producto en menos de un minuto.
- Distinguir usuarios del sistema, vehículos y personas operativas.
- Saber qué información vive en Wialon y cuál en PostgreSQL.

### Conceptos esenciales

- **Flota:** conjunto de vehículos de una operación.
- **Telemetría:** datos transmitidos por dispositivos, por ejemplo posición o velocidad.
- **Fuente de verdad:** sistema que manda sobre un tipo de dato. En este proyecto, Wialon manda sobre unidades, conductores, pasajeros, mensajes e historial. PostgreSQL manda sobre cuentas, permisos, sesiones y auditoría.
- **RBAC:** control de acceso basado en roles; al rol se le conceden permisos y los usuarios heredan esos permisos.

La plataforma presenta la flota en lista/mapa, estados y dashboard. Admin administra cuentas; Operator ejecuta operaciones permitidas; Viewer consulta. Las personas y vehículos no se convierten en una copia propia que pueda divergir de Wialon.

### Archivos que debes abrir

- `README.md`: objetivos, stack, límites y enlaces.
- `docs/prueba_tecnica.md`: fuente oficial de requisitos.
- `frontend/src/features/landing/LandingPage.tsx`: presentación pública.
- `backend/app/db/seed.py`: catálogo de permisos y roles.
- `docs/entrega/auditoria-final.md`: qué está demostrado y qué no.

### Ejercicio

En una hoja dibuja dos cajas: Wialon y GPS Control DB. Coloca en cada una los tipos de datos. Luego dibuja qué ve cada rol y lee los permisos en `PERMISSION_CATALOG`.

### Comprueba lo aprendido

**Pregunta:** ¿por qué se guardan usuarios en PostgreSQL y conductores en Wialon?

**Respuesta:** son dominios distintos. La cuenta y sus permisos pertenecen a GPS Control; el conductor de la operación pertenece al recurso Wialon. Guardar una segunda copia durable de conductores podría quedar desactualizada.

**Pregunta:** ¿Viewer es seguro porque React oculta botones?

**Respuesta:** no. React puede ocultar navegación, pero el backend valida permiso en cada endpoint. El usuario puede intentar una URL o request directamente.

### Criterio de comprensión

Puedes explicar usuario de aplicación frente a pasajero/conductor operativo y señalar cuál base es dueña de cada dato.

---

## Bloque 2 — Tecnologías y herramientas

### Objetivos

- Reconocer qué lenguaje y framework ejecuta cada parte.
- Explicar por qué hay herramientas distintas para UI, API, DB y mapa.
- Localizar la versión real sin adivinarla.

### Conceptos esenciales

- **Framework:** estructura lista para resolver tareas comunes de una aplicación.
- **API:** interfaz que permite a dos programas intercambiar solicitudes y respuestas.
- **Base relacional:** almacén de tablas conectadas por identificadores.
- **Build:** transformar el código frontend en archivos estáticos publicados.
- **Lockfile:** fija versiones concretas de dependencias instaladas.

FastAPI/Python es el servidor; React/TypeScript es la UI; PostgreSQL guarda dominio local; SQLAlchemy y Alembic trabajan con sus tablas; Wialon se conecta por HTTP mediante httpx; Leaflet dibuja mapas. Vite construye frontend. Las dependencias se declaran en `backend/requirements.txt` y `frontend/package.json`; npm resuelve el detalle en `package-lock.json`.

### Archivos que debes abrir

- `backend/requirements.txt`
- `frontend/package.json`, `frontend/package-lock.json`
- `backend/Dockerfile`, `docker-compose.yml`
- `frontend/vercel.json`
- `docs/defensa/stack-tecnologico.md`

### Ejercicio

Sin ejecutar instalación, encuentra FastAPI, React, TypeScript, Vite, TanStack Query, PostgreSQL y Leaflet. Di para cada uno “qué entra, qué sale y quién lo usa”.

### Comprueba lo aprendido

**Pregunta:** ¿TypeScript valida los datos recibidos del servidor cuando el sitio ya corre?

**Respuesta:** no necesariamente; sus tipos se eliminan al compilar. El backend valida con Pydantic y el frontend valida formularios en runtime con Zod.

**Pregunta:** ¿Leaflet consulta Wialon directamente?

**Respuesta:** no. La pantalla llama a la API del backend; el backend obtiene y transforma los datos y el componente de mapa los dibuja.

### Criterio de comprensión

Puedes abrir los archivos de dependencia y describir la responsabilidad de cada tecnología sin llamarlas indistintamente “la app”.

---

## Bloque 3 — Arquitectura del sistema

### Objetivos

- Seguir una operación desde botón hasta proveedor y regreso.
- Entender router, servicio, gateway, schema, DTO, mapper y repositorio.
- Explicar DI y ejemplos reales de SOLID.

### Conceptos esenciales

- **Capa:** grupo de código con una responsabilidad común.
- **Router:** adapta una solicitud HTTP a una llamada de aplicación.
- **Caso de uso/servicio:** ejecuta una tarea concreta y las reglas del dominio.
- **Gateway/Adapter:** adapta la API externa a las operaciones que el dominio necesita.
- **Schema:** contrato y validación de entrada/salida HTTP.
- **DTO:** forma de datos que una capa entrega a otra.
- **Mapper:** traductor entre forma externa e interna.
- **Repository:** lugar donde se concentran lecturas y escrituras de persistencia.
- **DI:** inyección de dependencias; se entrega a una función el colaborador que necesita.

El router no debería decidir todos los detalles de negocio ni saber el formato de Wialon. El servicio evita acoplar reglas al transporte HTTP. Gateway aísla Wialon. Mapper evita que el frontend dependa de nombres de campos externos. Dependencias de base y usuario llegan por `Depends`; servicios de dominio aceptan Protocols.

### Archivos que debes abrir

- `backend/app/api/v1/vehicles.py`
- `backend/app/services/vehicle_service.py`
- `backend/app/gateways/wialon/client.py`
- `backend/app/gateways/wialon/dto.py`
- `backend/app/mappers/vehicle_mapper.py`
- `backend/app/schemas/vehicle.py`
- `frontend/src/features/vehicles/vehiclesApi.ts`
- `docs/defensa/guia-completa-repositorio.md`

### Ejercicio

Sigue GET vehículos. En cada capa responde: ¿qué recibe?, ¿qué valida?, ¿a quién llama?, ¿qué entrega? No saltes del frontend al gateway.

### Comprueba lo aprendido

**Pregunta:** ¿qué principio permite que `vehicle_service` use una interfaz `VehicleGateway` en lugar de construir `WialonClient`?

**Respuesta:** inversión de dependencias. La regla de negocio depende del contrato de operaciones que necesita. En test se inyecta un fake compatible; en producción FastAPI entrega el cliente real.

**Pregunta:** ¿se usa Strategy en producción?

**Respuesta:** no se ve un selector para escoger una estrategia durante ejecución. Los Protocols permiten sustitución para tests, pero no se debe afirmar que existe un patrón Strategy runtime. El requisito pide Factory/Strategy “donde tenga sentido”; hay un proveedor activo.

### Criterio de comprensión

Puedes volver a dibujar el request sequence y defender qué se rompe si el router acopla HTTP, SQL y Wialon en una sola función.

---

## Bloque 4 — Backend y base de datos

### Objetivos

- Entender cómo arranca FastAPI y dónde se configuran rutas.
- Separar modelo SQL, migración, schema y seed.
- Entender de forma básica autenticación, permiso, sesión y auditoría.

### Conceptos esenciales

- **Modelo ORM:** clase Python asociada a una tabla SQL.
- **Migración:** cambio versionado de tablas.
- **Seed:** carga inicial o sincronizada de roles, permisos y usuario Admin configurado.
- **Transacción:** conjunto de operaciones SQL que se confirman juntas o se revierten.
- **JWT:** token firmado que lleva identidad y vencimiento; su contenido no es secreto por estar codificado.
- **Hash de password:** verificación de contraseña sin almacenar el texto original.

`main.py` monta router público `/health`/`/version`, router de producto `/api/v1`, CORS, middleware de cabeceras y excepciones. `api_router.py` agrega los routers del dominio. `models/` declara estructura de tablas; `repositories/` concentra consultas; Alembic versiona; seed carga catálogo. Docker aplica migración y seed antes de iniciar el servidor.

### Archivos que debes abrir

- `backend/app/main.py`, `backend/app/api/v1/api_router.py`
- `backend/app/core/config.py`, `core/dependencies.py`, `core/security.py`
- `backend/app/models/`, `repositories/`, `db/seed.py`, `alembic/`
- `backend/app/services/auth_service.py`
- `backend/app/api/v1/auth.py`, `users.py`

### Ejercicio

Busca un endpoint `@router.get` y otro `@router.post` de usuarios. Sigue la dependencia que exige permiso. Luego dibuja las tablas User → Role → Permissions y RefreshToken → User.

### Comprueba lo aprendido

**Pregunta:** ¿qué se guarda al crear un usuario nuevo?

**Respuesta:** un registro local con hash de password, rol, activo y bandera de cambio obligatorio; se registra el evento de auditoría conforme al servicio. En el primer login debe completar el cambio obligatorio.

**Pregunta:** ¿por qué seed no es migración?

**Respuesta:** migración actualiza estructura de tablas; seed crea o alinea datos iniciales dentro de esa estructura.

### Criterio de comprensión

Puedes explicar qué hace el comando de inicio del Dockerfile en orden y por qué una app no debe abrir Swagger en producción según la configuración actual.

---

## Bloque 5 — Frontend y componentes

### Objetivos

- Entender las rutas, guards y componentes compartidos.
- Explicar cómo un formulario valida y muestra errores.
- Comprender carga, caché y fallos de red.

### Conceptos esenciales

- **Componente:** unidad visual que acepta propiedades y devuelve UI.
- **SPA:** aplicación de una página; React cambia vistas sin recargar el documento entero.
- **Guard:** componente que decide si se puede entrar a una ruta según sesión/permisos.
- **Query/cache:** guarda respuesta remota por un tiempo para no pedirla cada render.
- **Estado:** dato cambiante que React usa para volver a pintar la pantalla.

`AppRouter.tsx` define `/`, `/login`, `/app/vehicles`, etc. `RequireAuth` y `RequirePermission` protegen navegación; backend repite la autorización. Las features separan pantalla y API. `httpClient.ts` concentra proxy/API, cookie credentials, refresh y normalización. `AppProviders` configura Query. `TextField`, `Button`, estados loading/empty/error y toasts evitan que cada página implemente controles distintos.

### Archivos que debes abrir

- `frontend/src/main.tsx`, `src/app/router/AppRouter.tsx`
- `features/auth/RouteGuards.tsx`, `AuthProvider.tsx`
- `services/api/httpClient.ts`, `apiError.ts`
- `features/vehicles/VehiclesPage.tsx`, `vehiclesApi.ts`
- `components/ui/TextField.tsx`, `components/feedback/ErrorState.tsx`

### Ejercicio

En VehiclesPage encuentra el hook que consulta la lista; en `vehiclesApi.ts` localiza URL y parámetros. Sigue el nombre de error desde Axios hasta `ErrorState` o toast.

### Comprueba lo aprendido

**Pregunta:** ¿qué pasa si el backend devuelve 401 en una petición protegida?

**Respuesta:** el cliente intenta el refresh bajo condiciones limitadas. Si refresh falla, limpia tokens locales, notifica expiración y rechaza la solicitud para que la UI guíe al usuario a ingresar otra vez.

**Pregunta:** ¿el menú oculto evita que Viewer use un endpoint de escritura?

**Respuesta:** no. La API verifica permiso en servidor y debe responder 403 incluso si se llama directamente.

### Criterio de comprensión

Puedes trazar login, estado autenticado, permiso faltante, carga, error y logout sin decir que “React lo hace automáticamente”.

---

## Bloque 6 — Integración con Wialon

### Objetivos

- Entender el token/SID y el rol del gateway.
- Explicar transformación de unidades y límites del historial.
- Diferenciar mock, lectura real y escritura real.

### Conceptos esenciales

- **SID:** identificador de sesión que Wialon entrega tras autenticarse con token.
- **Retry:** repetir una operación ante una falla transitoria. Es más seguro en lectura que en escritura.
- **Cache TTL:** respuesta guardada temporalmente; TTL es cuánto dura antes de vencer.
- **PATCH parcial:** solo envía campos a cambiar. Si la API remota borra los omitidos, se debe leer y mezclar con cuidado.
- **Mock/Fake:** sustituto local programado para controlar respuestas. No es Wialon.

`WialonClient` obtiene/renueva SID, mapea servicios y traduce errores. El mapper transforma posición, tiempo, velocidad y estado. `history_service.py` limita rango y puntos; la vista `HistoryPage.tsx` reproduce los puntos. Lecturas pueden tener retry/cache según servicio; escrituras no se repiten automáticamente porque un timeout no demuestra que fallaron.

### Archivos que debes abrir

- `backend/app/gateways/wialon/client.py`, `session.py`, `dto.py`
- `backend/app/mappers/vehicle_mapper.py`, `history_mapper.py`, `people_mapper.py`
- `backend/app/services/people_service.py`, `history_service.py`
- `frontend/src/features/trip-history/HistoryPage.tsx`
- `backend/tests/unit/test_wialon_gateway.py`, `test_people_service.py`
- `docs/decisions/historial-rutas-playback.md`

### Ejercicio

Lee `test_driver_custom_field_patch_merges_without_deleting_unmentioned_fields`: anota snapshot de entrada, petición hecha al fake y aserción final. Después lee implementación. No conectes ni escribas a Wialon para este ejercicio.

### Comprueba lo aprendido

**Pregunta:** ¿qué evidencia existe para escribir conductores/pasajeros?

**Respuesta:** código y tests con gateway falso; no se confirmó persistencia por escritura real en la cuenta de evaluación.

**Pregunta:** ¿qué se hace con un timeout durante una escritura?

**Respuesta:** no repetir a ciegas. Consultar el estado y reconciliar porque el proveedor pudo aplicar la mutación y perderse la respuesta.

### Criterio de comprensión

Puedes explicar la diferencia entre el test del gateway, una integración HTTP con fake y una escritura confirmada en Wialon.

---

## Bloque 7 — Seguridad, pruebas, Git y despliegue

### Objetivos

- Entender controles de autenticación/CSRF/RBAC y límites de los tests.
- Leer los workflows y comprobar una revisión desplegada.
- Usar comandos Git de lectura y push normal con cuidado.

### Conceptos esenciales

- **CSRF:** ataque que intenta usar la sesión de cookies desde un sitio ajeno; se protege con token/header y validación en servidor.
- **XSS:** introducir contenido activo en una página. React escapa texto normalmente; CSP limita fuentes de scripts, pero no arregla una inserción insegura en sí.
- **CSV injection:** texto exportado que una hoja de cálculo interpreta como fórmula; `csv_service.py` neutraliza celdas.
- **CI:** tests/build ejecutados automáticamente al cambiar el repo.
- **Deploy:** publicación del artefacto en un proveedor.

Lee cookies y validación CSRF, RBAC backend, sanitización CSV y headers antes de hablar de seguridad. `frontend/vercel.json` tiene rewrites y CSP; `backend/app/main.py` configura origen CORS. El endpoint `/version` publica hash y rama no secretos. La evidencia más fuerte es comparar SHA de `/version` con commit público; HTTP 200 o 401 solos no identifican el código desplegado.

### Archivos que debes abrir

- `backend/app/core/cookies.py`, `core/dependencies.py`, `core/security.py`
- `backend/app/services/csv_service.py`, `middleware/security_headers.py`
- `frontend/vercel.json`, `backend/Dockerfile`, `docker-compose.yml`
- `.github/workflows/`, `docs/entrega/checklist-entrega.md`
- `docs/defensa/historial-git-explicado.md`

### Ejercicio

Lee el workflow principal e identifica qué instala, qué prueba y qué valida. Ejecuta solo tests locales autorizados; no uses secretos productivos. Usa `git status -sb`, `git log --oneline -5`, `git diff --check` para inspección.

### Comprueba lo aprendido

**Pregunta:** ¿qué demuestra que Render actual ejecuta el SHA entregado?

**Respuesta:** comparar el SHA completo que devuelve `/version` con `git rev-parse HEAD` o el hash del commit público. `/health` solo demuestra que un proceso responde.

**Pregunta:** ¿keep-alive garantiza 15 días?

**Respuesta:** no. Solo envía requests periódicos; límites, pausas, errores del proveedor y cuota pueden interrumpir el servicio.

### Criterio de comprensión

Puedes identificar un control en backend, su test, su límite y qué prueba operativa faltaría.

---

## Bloque 8 — Defensa técnica y preguntas difíciles

### Objetivos

- Explicar decisiones sin memorizar discursos.
- Ser honesto sobre cobertura y límites.
- Responder una pregunta técnica recorriendo código.

### Conceptos esenciales

- **Evidencia:** observación o test que respalda una afirmación.
- **Cobertura:** porcentaje de código ejecutado por tests, no medida automática de funcionalidad correcta.
- **Limitación:** comportamiento que el producto no promete o no pudo verificarse.
- **ADR:** decisión de arquitectura documentada con contexto y consecuencias.

Una buena respuesta tiene cuatro pasos: respuesta corta, razón, ejemplo de archivo/test y límite. Si no sabes, explica cómo lo averiguarías sin inventar una decisión.

### Archivos que debes abrir

- `docs/defensa/guion-defensa-tecnica.md`
- `docs/defensa/preguntas-y-respuestas.md`
- `docs/defensa/decisiones-diseno.md`
- `docs/entrega/auditoria-final.md`
- Un router, un service, un gateway, un mapper y sus tests.

### Ejercicio

Graba una explicación de dos minutos del flujo de lista de vehículos. Después explica una limitación: no se han hecho escrituras Wialon reales; tests usan mocks. Repite sin leer y verifica cada afirmación en el código.

### Preguntas de comprobación

**¿Por qué no reintentar escrituras?** Porque la respuesta puede perderse después de que el proveedor aplicó el cambio; repetir podría duplicarlo.

**¿Qué diferencia hay entre schema y modelo?** Schema valida contrato HTTP; modelo representa tabla SQL. Algunos campos se parecen, pero tienen responsabilidades distintas.

**¿Qué aprendiste de axe?** Automatización encontró problemas de contraste/nombres; se corrigieron; el pase actual cubre landing/login local, pero no lector de pantalla ni todas las rutas.

### Criterio de comprensión

Puedes responder cinco preguntas al azar con código real y distinguir lo implementado de lo comprobado fuera del código.

---

## Glosario rápido

| Palabra | Explicación sencilla |
|---|---|
| Backend | Programa servidor que valida y aplica reglas. |
| Frontend | Interfaz que la persona ve y usa. |
| Endpoint | URL y método HTTP que ejecuta una acción. |
| Permiso | Acción concreta que el usuario puede realizar. |
| DTO | Forma tipada para mover datos entre capas. |
| Mapper | Código que cambia datos de un formato a otro. |
| Mock | Sustituto de test que simula una dependencia. |
| Deploy | Publicación de una versión en un host. |
| Commit | Snapshot del código identificado por hash. |
| Rollback | Restaurar una versión anterior o el dato previo de una mutación. |

## Orden de repaso el día de la defensa

1. Ejecuta las URLs públicas y comprueba login solo con la cuenta real que el propietario haya validado.
2. Abre esta guía, README, tablero de prueba y repo antes de compartir pantalla.
3. Demuestra consultas de lectura; no crees/edites/borres en Wialon en una defensa sin dataset autorizado.
4. Explica un flujo, una decisión de seguridad, un test y una limitación.
5. Si se pide una mutación externa, explica que hace falta recurso de prueba y plan de restauración; no improvises sobre la flota real.
