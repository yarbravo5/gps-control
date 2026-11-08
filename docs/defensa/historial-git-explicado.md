# Historial Git explicado

## Alcance de la revisión

El estado comprobado el 8 de noviembre de 2026 es `381d619` en `main`, igual a `origin/main`; el árbol de trabajo estaba limpio. El historial muestra commits incrementales desde la inicialización y mensajes Conventional Commits. Un log visible demuestra el estado actual del grafo, pero no permite probar por sí solo que nunca hubo force-push en el pasado.

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
| `7932ec6`, `1a4a584`, `9c80522` | Feedback, nombres accesibles y revisión responsive | Cambios visibles en accesibilidad y evidencia de UI. |
| `a01f383` | Auditoría y paquete de defensa | Consolida matriz, checklist y documentos de cierre. |
| `9eec780` | Contraste/nombres accesibles en landing y endpoint `/version` | Corrige hallazgos automatizados y permite identificar SHA de Render mediante metadatos no secretos. |
| `f0baa41` | Verificación final de despliegue y cifras | Actualiza documentos tras confirmar el SHA, CI y endpoints; no altera datos operativos. |
| `381d619` | Documentación de cierre y defensa | Añade el plan de estudio, amplía las guías y corrige los documentos de entrega; CI y despliegue se comprobaron después de publicar. |

> Nota: el identificador de commit exacto es la fuente para navegar el cambio. El historial también contiene merge commits de ramas de funciones y commits de documentación/corrección posteriores; no se infiere la existencia de PRs a partir de ellos.

## Ramas visibles

El repositorio local registra ramas de login/seguridad, roles/permisos, Docker y refactor de nombres, además de `main`. Los nombres de ramas sugieren separación por trabajo, pero no prueban revisiones ni PRs. Para la entrega debe usarse la URL pública que aparece en el README y comprobar que apunta al `main` esperado.

## Cómo explicarlo en la defensa

1. Mostrar `git log --oneline --decorate --graph` y explicar la progresión: base, seguridad, integración, features y pulido.
2. Abrir un commit funcional y seguir el mismo cambio entre API, servicio, gateway, UI y pruebas.
3. Explicar que los merge commits preservan las integraciones visibles; no atribuirles una revisión formal que no esté enlazada.
4. Reconocer que un log local no constituye prueba criptográfica de ausencia histórica de force push.

## Conceptos básicos de Git

- **Repositorio:** carpeta de trabajo más base de datos interna `.git`, donde Git conserva snapshots y referencias.
- **Commit:** snapshot identificado por hash, autor, fecha y mensaje. El hash cambia si cambia el contenido o metadatos; no se debe cambiar autoría/fecha para “mejorar” el historial.
- **Rama:** nombre que apunta a un commit. Al crear un commit en una rama, su puntero avanza. `main` es la rama de entrega de este repo.
- **Remote:** alias de un repositorio remoto. Aquí `origin` apunta al repo público GitHub. `origin/main` es la referencia local de lo último que se descargó del remoto; `main` es tu referencia local.
- **Fetch:** descarga objetos y referencias del remoto sin modificar tus archivos. **Pull:** normalmente hace fetch y luego integra (merge o rebase configurado) los commits remotos en tu rama actual.
- **Push:** envía commits locales al remoto. Push ordinario añade commits sin borrar el historial visible. Solo se ejecuta desde la rama correcta después de revisar status y diff.
- **Merge:** une dos líneas de commits y puede crear un merge commit. Un merge visible no demuestra que se haya abierto un Pull Request ni que hubiese revisión formal.
- **Force push:** sobrescribe la referencia remota para que apunte a un historial distinto. Puede ocultar commits previos; no usarlo en la entrega.

## Conventional Commits

Forma habitual: `tipo(alcance opcional): resumen breve`. Ejemplos reales de este repo: `feat(ui): add accessible feedback...` (funcionalidad), `fix(a11y): improve landing...` (corrección) y `docs: record final deployment verification` (documentación). Tipos comunes: `feat` agrega comportamiento, `fix` corrige defecto, `test` cambia pruebas, `docs` cambia documentación, `refactor` reorganiza sin cambiar comportamiento. El mensaje describe el cambio, no demuestra por sí solo que se probó.

## Comandos seguros para leer el estado

Desde la raíz del proyecto:

```bash
git status -sb
git log --oneline --decorate --graph -12
git diff --check
git remote -v
git branch -vv
```

Antes de `git push`, responde: ¿qué archivos cambiarán?, ¿en qué rama estoy?, ¿el commit ya pasó pruebas?, ¿el destino es el remoto autorizado? Nunca uses `git push --force` para corregir un mensaje o reemplazar una entrega ya publicada; crea un commit nuevo.
