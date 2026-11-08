# Decisiones de diseño

## Colores y jerarquía

Los tokens del tema viven en `frontend/src/styles/globals.css`.

| Color base | Función |
| --- | --- |
| `#EB162C` | Identidad de marca y acento de atención en landing. |
| `#A81A2B` | Vino para énfasis y selección; transmite continuidad con el color de marca con menos brillo. |
| `#6B6B6B` | Gris de marca para texto secundario sobre superficies claras y decoración. No usarlo como texto pequeño encima del fondo lila `#EEE8F2`: su contraste medido es 4.43:1. En esa combinación usar `#5B5B5B` (5.65:1). |
| `#1E8C93` | Acento frío para foco, enlaces/controles y equilibrio de acciones rojas. |
| `#EEE8F2` | Superficie suave y fondos de apoyo, no texto pequeño. |

Blanco y fondos gris/lila claro separan superficies. Texto principal oscuro establece jerarquía; títulos y métricas preceden datos auxiliares. Tipografía Segoe UI/Inter/system, radios de control de 10 px, tarjetas de 16 px, sombra tenue, separación por escala `--spacing-*`. En estado de foco se usa contorno teal de 2 px; `prefers-reduced-motion` reduce animaciones y desplazamiento suave.

## Estados semánticos

- **Error/destructivo:** rojo vino oscuro y mensaje explícito; no depender del color solamente. Acciones destructivas deben confirmar antes de mutar.
- **Éxito:** texto/feedback de confirmación y estado terminado; el teal sirve como acento, no como única señal.
- **Advertencia:** copy y contexto explican el riesgo; la UI no usa color solo para comunicar.
- **Información/carga:** estados con texto/indicador visible y anuncios accesibles cuando corresponde.
- **Estado de vehículo:** etiqueta legible además del marcador diferenciado; moving, stopped y no_signal se representan con colores/íconos distintos.

Las reglas CSS combinan clases y colores por feature; cualquier cambio de tono debe repetirse en contraste de estado real. En el cierre del 8 nov se ejecutó axe en Chromium sobre landing y login locales a 360 × 800: cero violaciones WCAG 2.1 A/AA en esas dos rutas. No se ejecutó lector de pantalla y eso no certifica las demás rutas.

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

Validar con el propietario el acceso y permisos de la cuenta Admin real de evaluación; la cuenta compartida en conversación es de prueba y solo debe desactivarse/rotarse si sigue activa. Probar escrituras con dataset desechable/rollback, revisar cuotas/configuración efectiva del proveedor y completar accesibilidad manual. Evaluar logging/observabilidad centralizada y protección de contraseñas comprometidas si el alcance lo permite.

## Decisiones visuales con ejemplos del código

La paleta pedida por la prueba está definida como tokens de tema al inicio de `frontend/src/styles/globals.css`. Mantenerlos en un punto común evita que cada feature invente un rojo distinto. El rojo `#EB162C` es el acento de marca y llama la atención; el vino `#A81A2B` sirve para énfasis y acciones con peso; el gris `#6B6B6B` da una superficie neutra y texto secundario; el teal `#1E8C93` ofrece el acento frío; el lila `#EEE8F2` separa secciones sin usar blanco en toda la página.

El color nunca comunica por sí solo. Los estados de vehículo tienen nombre textual (`moving`, `stopped`, `no_signal`) además de color/ícono. Los errores llevan mensaje y `role=alert`; las cargas usan `role=status`. `TextField.tsx` asocia label, input y error; `ErrorState.tsx` ofrece una acción de reintento; `ToastProvider.tsx` anuncia feedback temporal. El foco visible se estiliza con `:focus-visible` y teal.

Contraste calculado con la fórmula de luminancia relativa WCAG. Es una medición de combinaciones de color, no una certificación de todas las pantallas:

| Primer plano | Fondo | Ratio aproximado | Lectura |
|---|---|---:|---|
| `#6B6B6B` | `#EEE8F2` | 4.43:1 | No llega a 4.5:1 para texto normal; se corrigió en las superficies de landing que lo necesitaban. |
| `#5B5B5B` | `#EEE8F2` | 5.65:1 | Supera AA para texto normal. |
| `#6B6B6B` | `#FFFFFF` | 5.33:1 | Supera AA para texto normal. |
| `#A81A2B` | `#EEE8F2` | 6.13:1 | Supera AA para texto normal. |
| `#1E8C93` | `#FFFFFF` | 4.02:1 | No usar como texto pequeño sin combinarlo con otro tratamiento; sí puede servir como indicador no textual. |
| `#17151A` | `#EEE8F2` | 15.07:1 | Alto contraste para texto principal. |

Mobile-first significa que la estructura funciona en una pantalla estrecha y luego se amplía con media queries. En landing, el menú móvil usa `details/summary`, tarjetas y CTA se apilan en CSS; en el mapa, Leaflet ocupa el contenedor y el clustering evita saturarlo. En las tablas protegidas, revisar tarjetas y formularios en móvil: una captura sola no certifica las interacciones.

Para explicarlo en defensa: “Los colores tienen papeles semánticos, pero el texto necesita contraste medible. Gris de marca sobre lila daba 4.43:1, justo debajo de AA; oscurecimos ese texto a `#5B5B5B`, manteniendo la paleta. Repetimos axe en landing y login móvil”. Limitar esta afirmación a las dos rutas verificadas.
