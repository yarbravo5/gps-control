# Historial Git explicado

## Alcance de la revisión

Se revisó el grafo visible de `main` hasta `9c80522`, que coincide con `origin/main` en el punto de auditoría. El historial contiene más de un commit, mantiene desarrollo incremental entre el 4 y el 8 de noviembre de 2026 y utiliza mensajes mayormente convencionales. Este análisis no puede demostrar que nunca se ejecutó un force push remoto.

## Hitos

| Commit | Cambio | Por qué importa |
| --- | --- | --- |
| `2672407` | Inicialización | Crea el repositorio. |
| `398521d`, `556ce85` | Arquitectura y PostgreSQL/Alembic | Prepara separación backend y persistencia con migraciones. |
| `1130ed7`, `f19027d` | RBAC, autenticación y auditoría | Agrega roles/permisos y sesiones administrables. |
| `9d3d9b0` | Docker y CI | Añade entorno reproducible y automatización. |
| `e534578`, `eca3393` | Gateway Wialon, vehículos, conductores y pasajeros | Introduce integración y operaciones de personas/unidades. |
| `b0f4e7a`, `481a823` | Historial y playback | Consulta puntos de ruta y los reproduce en el mapa. |
| `acee642`, `6ddf18c`, `906e43f` | Mapa, dashboard y gestión operativa | Añade visualización de flota y paneles de personas. |
| `972f4cc`, `6826b37`, `94a866f` | Administración, CSV y auditoría de mutaciones | Completa funciones administrativas y trazabilidad. |
| `caca4c9`, `8b421c4` | Cabeceras y rate limiting | Endurece controles de seguridad. |
| `ce9537d` | Reintentos y caché de lecturas Wialon | Reduce fallos transitorios y consultas repetidas sin repetir escrituras. |
| `7932ec6`, `1a4a584`, `9c80522` | UX accesible, nombres accesibles y evidencia responsive | Corrige feedback/navegación y documenta verificaciones recientes. |

> Nota: el identificador de commit exacto es la fuente para navegar el cambio. El historial también contiene merge commits de ramas de funciones y commits de documentación/corrección posteriores; no se infiere la existencia de PRs a partir de ellos.

## Ramas visibles

El repositorio local registra ramas de login/seguridad, roles/permisos, Docker y refactor de nombres, además de `main`. Los nombres de ramas sugieren separación por trabajo, pero no prueban revisiones ni PRs. Para la entrega debe usarse la URL pública que aparece en el README y comprobar que apunta al `main` esperado.

## Cómo explicarlo en la defensa

1. Mostrar `git log --oneline --decorate --graph` y explicar la progresión: base, seguridad, integración, features y pulido.
2. Abrir un commit funcional y seguir el mismo cambio entre API, servicio, gateway, UI y pruebas.
3. Explicar que los merge commits preservan las integraciones visibles; no atribuirles una revisión formal que no esté enlazada.
4. Reconocer que un log local no constituye prueba criptográfica de ausencia histórica de force push.
