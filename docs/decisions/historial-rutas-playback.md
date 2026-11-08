# Historial de posiciones y playback

El backend expone `GET /api/v1/vehicles/{vehicle_id}/history?start=...&end=...`.
Las fechas deben incluir zona horaria y se normalizan a UTC. El rol Viewer puede
consultar el endpoint mediante el permiso existente `history:view`.

La integracion usa `messages/load_interval` de Wialon. Ese metodo consulta
mensajes en un intervalo, permite limitar `loadCount` y devuelve el total
encontrado junto con los mensajes cargados. Se solicitan solo mensajes de datos
con posicion (`flags=1`, `flagsMask=0xFF01`). El Gateway convierte esos registros
a DTOs Wialon; el mapper valida coordenadas y transforma UNIX a datetime UTC,
rumbo cardinal y estado de movimiento.

Para mantener el coste predecible, el intervalo maximo es 7 dias y la respuesta
admite hasta 5.000 puntos. El Gateway solicita como maximo 5.001 para detectar
exceso; si hay mas de 5.000, el API responde 422 y pide consultar un periodo mas
corto. Los puntos invalidos se descartan y los restantes se ordenan por fecha
ascendente.

El frontend implementa playback local sin conexion persistente: React solicita
el rango elegido y avanza por `points` en orden cronologico usando un temporizador.
Leaflet dibuja la polilinea y el marcador de posicion actual; la UI presenta los
timestamps UTC en `America/Bogota` y la velocidad del punto.
