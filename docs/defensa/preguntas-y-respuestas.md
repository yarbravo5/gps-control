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

Refresh rotativo revocable, cookie HttpOnly/Secure en producción, SameSite configurable, CSRF por cookie+header y access token corto. Logout revoca refresh y las operaciones de cambio de sesión invalidan sesiones.

**¿La credencial de evaluación está lista?**

Debe rotarse porque el valor anterior se compartió en la conversación. El backend ahora exige 12 caracteres, letra y número para nuevas/cambiadas; hay que usar una clave robusta, única y compartirla solo por correo privado.

**¿Qué queda en OWASP?**

Hay controles para acceso, CSRF, inyección, cookies y auditoría; no hay rate limiting global ni verificación de contraseñas comprometidas. Las variables reales de despliegue no son visibles en el repo.

## UI, datos y pruebas

**¿Cómo se calcula el estado de vehículo?**

La transformación está descrita en README: moving por encima de 3 km/h, stopped en el umbral restante y no_signal si posición inválida o mensaje con más de 600 s. El umbral no señal se configura.

**¿Cómo escalan las rutas?**

El endpoint restringe a 7 días y 5.000 puntos y devuelve error si excede; el usuario debe reducir rango. No se simplifican puntos silenciosamente.

**¿Qué cubre el 81 %?**

Es cobertura global de la suite local backend; el objetivo mínimo es cobertura razonable de lógica de negocio. La suite frontend tiene 68 pruebas. No hay E2E Playwright mantenido como suite del repo.

**¿Por qué la respuesta de la auditoría dice “no se certifica todo”?**

Pruebas de código no pueden probar configuración privada, disponibilidad futura, comportamiento con recurso real ni revisión manual accesible. Es mejor separar implementación de evidencia externa.
