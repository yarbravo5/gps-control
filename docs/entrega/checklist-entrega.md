# Checklist de entrega

## Evidencia que ya está en el repositorio

- [x] Matriz con 82 requisitos: 69 cumplen, 11 parciales, un bonus sin implementar y uno no verificable.
- [x] Guías de arquitectura, tecnologías, diseño, Git, estudio, preguntas y guion de defensa.
- [x] README con URLs, arquitectura, datos, seguridad, IA, limitaciones y capturas.
- [x] `.env.example`, `.gitignore`, lockfiles, Dockerfile, Compose y CI.
- [x] No se hicieron escrituras Wialon ni se guardaron secretos de producción en documentos nuevos.
- [x] Contraseñas nuevas/cambiadas exigen 12 caracteres, letra y número.
- [x] Render `/version` identificó `f0baa41` en `main`; health Render/Vercel 200 y CI backend/frontend/docker-compose exitoso para ese SHA.
- [x] Landing y login locales a 360 px pasan axe WCAG 2.1 A/AA; teclado y foco inspeccionados. No se usó lector de pantalla.

## Antes de enviar el correo — acciones del propietario

- [ ] Iniciar sesión en privado con la cuenta Admin real de evaluación y confirmar rol/permiso de gestión de usuarios. Sus credenciales son distintas de la cuenta de prueba compartida y no fueron compartidas aquí.
- [ ] Si la cuenta Admin de prueba compartida sigue activa, desactivarla o rotarla desde una sesión autorizada. No usarla para la evaluación.
- [ ] Desde la cuenta real, crear un usuario temporal no Admin con cambio obligatorio; comprobar primer login, permisos de Viewer/Operator y denegación de una acción Admin. Luego desactivarlo/eliminarlo.
- [ ] Confirmar el usuario evaluador, destinatario del correo y canal privado para credenciales. No poner contraseña en repo, captura ni este borrador.
- [ ] Consultar los paneles de Render, Neon, Vercel y GitHub Actions: variables necesarias presentes, token de Wialon vigente y margen de cuota. No copiar valores.
- [ ] Confirmar disponibilidad de 15 días solo si el propietario puede asumirla. El keep-alive reduce el cold start, pero no da garantía.
- [ ] Si el propietario autoriza un recurso Wialon desechable, planear prueba con snapshot, lectura, mutación, verificación y restauración. Sin ese recurso, no escribir.
- [ ] Completar teclado/zoom en vistas autenticadas y un pase de lector de pantalla. Esta auditoría no usó NVDA/VoiceOver.
- [ ] Confirmar que el disclosure IA refleja las herramientas realmente utilizadas y que el desarrollador puede explicar el código.
- [ ] En el último commit documental, verificar CI, SHA de Render `/version`, frontend Vercel y estado Git limpio.
- [ ] Completar `docs/entrega/correo-entrega.md` con Admin real validado y URL pública; compartir la contraseña solo por canal privado. No enviar el correo desde este agente.

## Rutina de disponibilidad: 9–24 de noviembre de 2026

- [ ] 9 nov: revisar uso/cuotas y estado de DB en Render, Neon y Vercel; confirmar integración Wialon vigente sin mostrar secretos.
- [ ] 9 nov: confirmar en Actions que `Keep Render warm` sigue habilitado y tiene ejecuciones recientes cada 10 minutos.
- [ ] Cada día: consultar frontend, Render `/health`, Render `/version`; registrar interrupciones y revisar fallos del workflow.
- [ ] Login diario solo si el propietario puede probarlo en privado con la cuenta real; no guardar contraseña en la bitácora.
- [ ] 16 nov: revisar nuevamente horas Render, cómputo/almacenamiento/egress de Neon y límites/pausas Vercel.
- [ ] 24 nov: comprobar frontend, backend, versión y login; informar cualquier interrupción.

Render free puede dormir después de 15 minutos sin tráfico y consume horas mientras permanece activo. El workflow puede retrasarse o deshabilitarse. Neon puede escalar el compute a cero; al volver una conexión despierta. Vercel Hobby puede pausar uso al superar límites. Estos planes no ofrecen una garantía de servicio contractual. Referencias vigentes: [Render Free](https://render.com/docs/free), [Neon Free](https://neon.com/blog/neon-free-plan-1-gb-per-project), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Estado de firma

**Código y despliegue: SÍ CON LIMITACIONES.** No marcar el correo como listo hasta validar en privado la cuenta Admin real, confirmar el periodo de disponibilidad y revisar las acciones externas anteriores. La auditoría requisito por requisito está en [auditoria-final.md](auditoria-final.md).
