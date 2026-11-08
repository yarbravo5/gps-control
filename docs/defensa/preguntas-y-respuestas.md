# Preguntas y respuestas para la defensa

## Arquitectura

**¿Por qué separar API, servicio y gateway?**

La API conoce HTTP y permisos, el servicio aplica reglas del caso de uso y el gateway conoce el formato/protocolo Wialon. Así el servicio se prueba con un objeto que cumple su `Protocol` sin acceder a red.

**¿Dónde están SOLID y los patrones?**

Repository concentra SQL local; Gateway/Adapter encapsula Wialon; DTO/Mapper transforma contratos; FastAPI `Depends` inyecta dependencias. Los protocolos reducen acoplamiento y permiten sustitutos, pero no hay una Strategy seleccionable en runtime ni una fábrica; no se debe presentar como si existiera.

**¿Por qué no guardar copia de conductores y vehículos en PostgreSQL?**

Wialon es la fuente de verdad del dominio de flota. La DB local guarda usuarios, roles, sesiones, rate limit y auditoría. Un cache corto de lectura no se considera réplica durable.

## Wialon

**¿Qué pasa si la sesión expira?**

El wrapper de sesión detecta el error de sesión, obtiene un nuevo SID y repite una vez la llamada segura. Errores transitorios de lecturas tienen reintentos acotados con backoff; la caché tiene TTL breve.

**¿Por qué no reintentar una escritura?**

Si hay timeout, puede que Wialon haya aplicado la mutación y solo se haya perdido la respuesta. Repetir podría duplicar o alterar el efecto. Se devuelve un error seguro y se reconcilia consultando el estado antes de intentar de nuevo.

**¿Se probó que una mutación se ve en Wialon?**

No en este ciclo de auditoría: están cubiertas por gateway simulado, pero no se hicieron escrituras en producción. Se necesita un recurso de evaluación desechable y un plan de reversión autorizado.

## Seguridad

**¿Por qué no basta con ocultar acciones en React?**

El frontend mejora UX; la autorización real está en dependencias backend por permiso, denegando por defecto.

**¿Cómo se protege la sesión basada en cookies?**

Refresh rotativo revocable en cookie HttpOnly (Secure en producción); cookie CSRF separada, legible por el cliente para enviarse también como `X-CSRF-Token`; SameSite configurable y access token corto. Logout revoca refresh y las operaciones de cambio de sesión invalidan sesiones.

**¿La credencial de evaluación está lista?**

La cuenta compartida en la conversación era de prueba; la cuenta Admin real de evaluación tiene credenciales distintas y no se compartió. El propietario debe probar en privado que la cuenta real puede iniciar sesión y administrar usuarios. Si la cuenta de prueba sigue activa, debe desactivarse o rotarse; no reutilizarla para evaluación.

**¿Qué queda en OWASP?**

Hay controles para acceso, CSRF, inyección, cookies y auditoría; no hay rate limiting global ni verificación de contraseñas comprometidas. Las variables reales de despliegue no son visibles en el repo.

## UI, datos y pruebas

**¿Cómo se calcula el estado de vehículo?**

La transformación está descrita en README: moving por encima de 3 km/h, stopped en el umbral restante y no_signal si posición inválida o mensaje con más de 600 s. El umbral no señal se configura.

**¿Cómo escalan las rutas?**

El endpoint restringe a 7 días y 5.000 puntos y devuelve error si excede; el usuario debe reducir rango. No se simplifican puntos silenciosamente.

**¿Qué significa el número de pruebas?**

La última ejecución local acreditó 138 pruebas backend y 69 frontend. No se recalculó cobertura backend en esa última ejecución. No hay una suite E2E Playwright mantenida en el repo.

**¿Por qué la respuesta de la auditoría dice “no se certifica todo”?**

Pruebas de código no pueden probar configuración privada, disponibilidad futura, comportamiento con recurso real ni revisión manual accesible. Es mejor separar implementación de evidencia externa.

## Preguntas ampliadas para practicar

En cada pregunta practica primero la respuesta sencilla. Después usa el ejemplo de archivo para apoyar la explicación técnica. Una repregunta no es un guion: el evaluador puede pedir que traces el dato en vivo.

### API, arquitectura y SOLID

**¿Qué diferencia hay entre router y servicio?**

- **Sencilla:** el router recibe HTTP; el servicio decide qué debe hacer la operación.
- **Técnica:** el router valida contrato, dependencias y códigos HTTP; el servicio expresa reglas de caso de uso y puede recibir un Protocol.
- **Ejemplo/archivo:** `backend/app/api/v1/vehicles.py` llama `backend/app/services/vehicle_service.py`.
- **Repregunta:** ¿dónde pondrías un 404 para una unidad inexistente? Explica qué excepción produce el servicio y quién la convierte a Problem Details.

**¿Para qué sirve un DTO si ya existe un schema de Pydantic?**

- **Sencilla:** DTO transporta datos dentro de la aplicación; schema define lo que entra o sale por HTTP.
- **Técnica:** separar ambos evita usar el contrato público como representación directa de Wialon o SQL y permite mapear cada frontera.
- **Ejemplo/archivo:** `backend/app/dto/vehicle.py`, `backend/app/schemas/vehicle.py`, `backend/app/mappers/vehicle_mapper.py`.
- **Repregunta:** ¿qué pasaría si la respuesta cruda de Wialon llegara a React? El frontend quedaría acoplado a campos/flags externos y podría exponer datos innecesarios.

**¿Dónde aparece inversión de dependencias?**

- **Sencilla:** una regla no construye una conexión concreta; recibe un contrato que explica lo que necesita.
- **Técnica:** `VehicleGateway` Protocol declara operaciones; `vehicle_service` consume el protocolo y las pruebas inyectan un fake.
- **Ejemplo/archivo:** `backend/app/services/vehicle_service.py` y `backend/tests/unit/test_vehicle_service.py`.
- **Repregunta:** ¿eso significa que hay Strategy en producción? No. Hay sustitución por protocolo, pero no selector runtime de algoritmo/proveedor.

**¿Qué diferencia hay entre Repository y Gateway?**

- **Sencilla:** Repository habla con la DB del producto; Gateway habla con un sistema externo.
- **Técnica:** los repositorios usan SQLAlchemy para entidades locales; `WialonClient` traduce operaciones al servicio HTTP de Wialon.
- **Ejemplo/archivo:** `backend/app/repositories/user_repository.py` frente a `backend/app/gateways/wialon/client.py`.
- **Repregunta:** ¿por qué no guardar en el repository la consulta de unidad? Porque Wialon es la fuente de verdad de ese recurso.

### FastAPI y base de datos

**¿Cómo se añade una ruta nueva?**

- **Sencilla:** se escribe un endpoint en el router del dominio, se conecta al servicio y se incluye el router.
- **Técnica:** el endpoint declara método/ruta, response schema y dependencias; `api_router.py` agrupa bajo `/api/v1`.
- **Ejemplo/archivo:** `backend/app/api/v1/api_router.py`, `vehicles.py`, `main.py`.
- **Repregunta:** ¿cómo se protege? Añadir la dependencia que exige el permiso y un test HTTP que pruebe acceso permitido/denegado.

**¿Qué función cumple una migración Alembic?**

- **Sencilla:** actualiza la estructura de las tablas sin borrar y reconstruir toda la DB.
- **Técnica:** cada revisión declara upgrade/downgrade del schema; en el arranque Docker se corre `alembic upgrade head` antes de la app.
- **Ejemplo/archivo:** `backend/alembic/versions/`, `backend/Dockerfile`.
- **Repregunta:** ¿migración crea el usuario Admin? No necesariamente; eso corresponde al seed, separado de la estructura.

**¿Qué datos no viven en PostgreSQL?**

- **Sencilla:** vehículos, posiciones, conductores, pasajeros y mensajes se consultan desde Wialon.
- **Técnica:** SQL conserva usuarios/roles, refresh token hasheado, auditoría y estado de rate limit; cache Wialon es temporal, no una réplica durable.
- **Ejemplo/archivo:** `backend/app/db/models/`, `backend/app/gateways/wialon/client.py`.
- **Repregunta:** ¿qué pasa si una lectura cacheada queda vieja? Vence según TTL breve y se consulta de nuevo; la app define estados de frescura.

### React y manejo de sesión

**¿Qué diferencia hay entre state de React y caché de TanStack Query?**

- **Sencilla:** state guarda la interacción actual; Query mantiene datos que vienen del servidor.
- **Técnica:** filtros/menú pueden ser estado local; resultados de vehículos se consultan mediante query con keys y opciones de retry.
- **Ejemplo/archivo:** `frontend/src/app/providers/AppProviders.tsx`, `features/vehicles/VehiclesPage.tsx`.
- **Repregunta:** ¿por qué no copiar todo el servidor a varios useState? Aumenta duplicación y riesgo de datos desincronizados.

**¿Cómo ocurre refresh de sesión?**

- **Sencilla:** si access token expira, cliente intenta una renovación usando cookie protegida.
- **Técnica:** Axios interceptor coordina un `refreshInFlight` para compartir una sola renovación y reintenta la petición elegible una vez; refresh/logout no entran en bucle.
- **Ejemplo/archivo:** `frontend/src/services/api/httpClient.ts`, `features/auth/authApi.ts`, `backend/app/api/v1/auth.py`.
- **Repregunta:** ¿qué evita CSRF? El cliente envía token CSRF en header y servidor compara con valor/cookie para requests que cambian sesión/datos.

### Seguridad

**¿Cómo se protege de XSS?**

- **Sencilla:** React escapa texto normal y las cabeceras CSP limitan de dónde salen scripts.
- **Técnica:** no usar HTML crudo para datos de usuarios; CSP en Vercel limita scripts/conexiones y middleware backend añade headers. Una CSP es defensa en profundidad, no sanitiza cualquier string.
- **Ejemplo/archivo:** `frontend/vercel.json`, `backend/app/middleware/security_headers.py`.
- **Repregunta:** ¿un CSP correcto vuelve seguro un `dangerouslySetInnerHTML` arbitrario? No; evitarlo o sanitizar con criterio.

**¿Cómo previene CSV injection?**

- **Sencilla:** algunos programas interpretan una celda que empieza con ciertos símbolos como fórmula.
- **Técnica:** el servicio examina y neutraliza esos prefijos antes de serializar filas; autorización de export también está en backend.
- **Ejemplo/archivo:** `backend/app/services/csv_service.py`, `backend/app/api/v1/exports.py`.
- **Repregunta:** ¿validar solo botón frontend es suficiente? No; endpoint verifica permiso y servicio neutraliza dato.

**¿Cómo evita el código perder campos Wialon?**

- **Sencilla:** relee el objeto, mezcla lo que cambia y conserva lo demás.
- **Técnica:** servicio valida que la respuesta tenga campos requeridos; copia custom fields actuales y aplica claves editadas/eliminaciones explícitas; si faltan datos base, rechaza antes de escribir.
- **Ejemplo/archivo:** `backend/app/services/people_service.py`, `backend/tests/unit/test_people_service.py`.
- **Repregunta:** ¿se comprobó el resultado en cuenta real? No en esta auditoría; los tests usan doubles.

### Pruebas, accesibilidad y operación

**¿Qué demuestra un test de Wialon gateway?**

- **Sencilla:** demuestra cómo el código arma llamadas y traduce respuestas simuladas.
- **Técnica:** assertions contra un transporte/adapter falso prueban mapping, parámetros, errores y la interacción esperada.
- **Ejemplo/archivo:** `backend/tests/unit/test_wialon_gateway.py`.
- **Repregunta:** ¿prueba que el servicio externo guardó el cambio? No; eso necesita integración autorizada, lectura posterior y rollback.

**¿Cómo explicas los resultados de axe sin exagerar?**

- **Sencilla:** landing/login móviles revisados en Chromium no mostraron violaciones automáticas.
- **Técnica:** axe evalúa reglas computables de WCAG; no reemplaza teclado manual de cada ruta ni lector de pantalla.
- **Ejemplo/archivo:** `frontend/tests/landing.test.tsx`, `docs/entrega/auditoria-final.md`.
- **Repregunta:** ¿se usó NVDA/VoiceOver? No. Debe decirse con claridad.

**¿Qué significa que GitHub Actions esté verde?**

- **Sencilla:** los jobs configurados para ese commit terminaron bien.
- **Técnica:** CI corrió backend, frontend y Docker Compose; no verifica credenciales reales, escritura Wialon ni cuotas de alojamiento.
- **Ejemplo/archivo:** `.github/workflows/`, commit público `f0baa41` en el momento de la revisión.
- **Repregunta:** ¿qué prueba Render ejecuta esa revisión? Comparar SHA completo de `/version` con `git rev-parse HEAD`.

**¿Cómo explicas el uso de IA?**

- **Sencilla:** el README declara herramientas de asistencia y tipos de apoyo; el autor debe validar y entender el cambio.
- **Técnica:** el disclosure es declaración del proyecto, no evidencia de autoría individual para cada línea. No se deben inventar tareas ni etapas.
- **Ejemplo/archivo:** `README.md`, sección “Uso de inteligencia artificial”.
- **Repregunta:** ¿puedes explicar este bloque? La mejor respuesta recorre dependencia, regla, test y límite, no memoriza la prosa.
