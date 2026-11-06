# Historial de posiciones y playback

El backend expone `GET /api/v1/vehicles/{vehicle_id}/history?start=...&end=...`.
Las fechas deben incluir zona horaria y se normalizan a UTC. El rol Viewer puede
consultar el endpoint mediante el permiso existente `history:view`.

La integración usa `messages/load_interval` de Wialon. Ese método consulta
mensajes en un intervalo, permite limitar `loadCount` y devuelve el total
encontrado junto con los mensajes cargados. Se solicitan solo mensajes de datos
con posición (`flags=1`, `flagsMask=0xFF01`). El Gateway convierte esos registros
a DTOs Wialon; el mapper valida coordenadas y transforma UNIX a datetime UTC,
rumbo cardinal y estado de movimiento.

Para mantener el coste predecible, el intervalo máximo es 7 días y la respuesta
admite hasta 5.000 puntos. El Gateway solicita como máximo 5.001 para detectar
exceso; si hay más de 5.000, el API responde 422 y pide consultar un periodo más
corto. Los puntos inválidos se descartan y los restantes se ordenan por fecha
ascendente.

El playback futuro no necesita una conexión persistente: React solicitará el
rango elegido y avanzará por `points` en orden cronológico usando un temporizador
local. Leaflet dibujará la polilínea y el marcador de posición actual; la UI
convertirá los timestamps UTC a `America/Bogota`.
