# Checklist de entrega

## Completado en el repositorio

- [x] README con arquitectura, setup, seguridad, datos, límites, IA y capturas.
- [x] Backend y frontend: suite local aprobada; typecheck/build aprobados.
- [x] Lockfiles versionados, `.env.example`, `.gitignore`, Dockerfile y workflows CI.
- [x] Auditoría requisito por requisito y documentos de defensa.
- [x] No se hicieron mutaciones en Wialon ni se incluyeron credenciales en los archivos nuevos.
- [x] Contraseñas nuevas/cambiadas ahora exigen 12 caracteres y al menos una letra y un número.
- [x] Logs de aplicación serializados en JSON.

## Antes de enviar el correo — requiere acción del propietario

- [ ] Follow docs/security/secret-rotation.md: create and verify backup Admin, rotate primary, test new login/role, first-login forced change and RBAC. Do not reuse or send the conversation password.
- [ ] Prepare a unique 12+ character credential and send it only through a private channel; never put it in the repository.
- [ ] Confirm the public repo and URLs are reachable, then test the evaluator Admin login using the rotated credential.
- [ ] Check actual provider quotas/usage and only confirm 15-day availability if the owner can support it.
- [ ] Revisar en los paneles de Render/Neon/Vercel que las variables necesarias existan y cuotas/uso tengan margen; no copiar ni compartir sus valores. El preflight CORS p?blico ya confirm? frontend permitido y origen ajeno rechazado.
- [ ] Si es posible, acordar recurso Wialon de prueba y rollback, y probar create/update/delete/binding con evidencia antes/después. No usar los datos reales actuales sin autorización expresa.
- [ ] Complete keyboard/zoom review of authenticated views and screen-reader review. Local landing/login passed axe WCAG 2.1 A/AA at 360 px; no screen reader was run.
- [ ] Revisar que el disclosure IA refleje exactamente el uso real del autor y que puede explicar el código.
- [ ] Confirmar ejecución verde de CI en el commit final; correr `docker compose config`, build/healthcheck en host con Docker.
- [ ] Enviar correo según `docs/entrega/correo-entrega.md` y adjuntar credenciales solo después de la rotación.

## Estado para firma

Do not send the email until new Admin access and 15-day availability are confirmed. Current decision: YES WITH LIMITATIONS for code; send is conditional on owner actions. See auditoria-final.md.
