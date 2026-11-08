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

- [ ] Rotar la contraseña Admin compartida en esta conversación y confirmar login con la nueva. No enviar la anterior.
- [ ] Preparar contraseña fuerte, única y de 12+ caracteres; enviar por canal privado, nunca en repo/capturas.
- [ ] Confirmar que el repositorio y las URLs públicas siguen accesibles y que el usuario evaluador puede iniciar sesión.
- [ ] Confirmar compromiso real de que los servicios gratuitos permanecerán disponibles al menos 15 días; documentar cualquier límite del plan.
- [ ] Revisar las variables efectivas `CORS_ORIGINS`, `COOKIE_SECURE`, `COOKIE_SAMESITE`, secretos y DB en los paneles del proveedor sin compartir su valor.
- [ ] Si es posible, acordar recurso Wialon de prueba y rollback, y probar create/update/delete/binding con evidencia antes/después. No usar los datos reales actuales sin autorización expresa.
- [ ] Completar pase manual de teclado, zoom, contraste WCAG AA en estados renderizados y lector de pantalla.
- [ ] Revisar que el disclosure IA refleje exactamente el uso real del autor y que puede explicar el código.
- [ ] Confirmar ejecución verde de CI en el commit final; correr `docker compose config`, build/healthcheck en host con Docker.
- [ ] Enviar correo según `docs/entrega/correo-entrega.md` y adjuntar credenciales solo después de la rotación.

## Estado para firma

No marcar como “entrega completa” hasta cerrar los ítems externos pendientes. La matriz con estado técnico está en [auditoria-final.md](auditoria-final.md).
