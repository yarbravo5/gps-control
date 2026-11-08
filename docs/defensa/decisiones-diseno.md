# Decisiones de diseño

## Colores y jerarquía

Los tokens del tema viven en `frontend/src/styles/globals.css`.

| Color base | Función |
| --- | --- |
| `#EB162C` | Identidad de marca y acento de atención en landing. |
| `#A81A2B` | Vino para énfasis y selección; transmite continuidad con el color de marca con menos brillo. |
| `#6B6B6B` | Texto secundario y elementos informativos; el texto pequeño usa un tono más oscuro (`#5B5B5B`). |
| `#1E8C93` | Acento frío para foco, enlaces/controles y equilibrio de acciones rojas. |
| `#EEE8F2` | Superficie suave y fondos de apoyo, no texto pequeño. |

Blanco y fondos gris/lila claro separan superficies. Texto principal oscuro establece jerarquía; títulos y métricas preceden datos auxiliares. Tipografía Segoe UI/Inter/system, radios de control de 10 px, tarjetas de 16 px, sombra tenue, separación por escala `--spacing-*`. En estado de foco se usa contorno teal de 2 px; `prefers-reduced-motion` reduce animaciones y desplazamiento suave.

## Estados semánticos

- **Error/destructivo:** rojo vino oscuro y mensaje explícito; no depender del color solamente. Acciones destructivas deben confirmar antes de mutar.
- **Éxito:** texto/feedback de confirmación y estado terminado; el teal sirve como acento, no como única señal.
- **Advertencia:** copy y contexto explican el riesgo; la UI no usa color solo para comunicar.
- **Información/carga:** estados con texto/indicador visible y anuncios accesibles cuando corresponde.
- **Estado de vehículo:** etiqueta legible además del marcador diferenciado; moving, stopped y no_signal se representan con colores/íconos distintos.

Las reglas CSS combinan clases y colores por feature; cualquier cambio de tono debe repetirse en contraste de estado real. axe automatizado cubrió pantallas registradas en README, pero no certifica navegación manual ni lector de pantalla.

## Responsive y mapas

La navegación se vuelve drawer; listados operativos se convierten en tarjetas y formularios se apilan. El mapa ocupa el ancho disponible y usa clustering; seleccionar lista y marcador sincroniza detalle. Leaflet con tiles de OpenStreetMap evita proveedor de mapas con tarjeta obligatoria y conserva atribución. La política de tiles requiere respetar atribución, cabeceras y límites.

## Decisiones técnicas y supuestos

1. Wialon es fuente de verdad de flota/personas; PostgreSQL guarda identidad y auditoría.
2. Los datos Wialon incompletos se conservan como nulos/listas vacías; ante actualizaciones parciales de persona, el backend vuelve a leer y mezcla campos para evitar borrados accidentales.
3. Las lecturas Wialon se pueden reintentar y cachear brevemente; una escritura no se repite de forma automática porque un timeout no revela si el proveedor aplicó el cambio.
4. El historial usa `messages/load_interval`, intervalo máximo de siete días y 5.000 puntos para acotar memoria/payload. Si excede, se solicita un rango menor en lugar de truncar silenciosamente.
5. La hora de API queda UTC; la presentación convierte a `America/Bogota`.
6. Viewer debe poder leer dashboard, flota, personas e historial, pero no editar ni exportar ni administrar usuarios/auditoría.
7. OpenAPI se habilita en desarrollo y se deshabilita en producción.
8. `Protocol` y gateways permiten sustituir integraciones por dobles en pruebas. No hay un selector runtime de Strategy/Factory; el despliegue actual usa un gateway Wialon.
9. La política temporal de contraseñas nuevas es 12 caracteres, una letra y un número. Se recomienda passphrase larga y única; no hay verificación contra un catálogo de contraseñas comprometidas.
10. La evaluación no autoriza mutar el recurso Wialon real. Para verificar persistencia se necesita un recurso de prueba cuyo propietario permita crear/editar/eliminar y revertir datos.

## Mejoras pendientes

Validar credencial Admin de entrega con una rotación privada, probar escrituras con dataset desechable/rollback, revisar CORS y variables efectivas del proveedor, y completar accesibilidad manual. Evaluar logging/observabilidad centralizada y protección de contraseñas comprometidas si el alcance lo permite.
