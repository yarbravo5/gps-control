# GPS Control

Sistema de monitoreo de flota con Wialon, autenticación por roles, mapa, historial de recorridos, exportación CSV y auditoría.

## Requisitos

- Python 3.14
- Node.js 22 o superior
- PostgreSQL 18
- Docker opcional para levantar backend y base de datos

## Ejecución con Docker

La forma más rápida de levantar el backend y PostgreSQL:

```bash
docker compose up --build
```

Servicios:

- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Healthcheck: http://localhost:8000/health
- PostgreSQL en el host: `localhost:5433`

El Compose usa valores de desarrollo por defecto. Para cambiar la configuración, crea un archivo `.env` en la raíz del proyecto con las variables de `backend/.env.example` y vuelve a ejecutar:

```bash
docker compose up --build
```

La base de datos de Docker usa el volumen `gps_control_postgres_data`. No comparte datos con la instalación nativa de PostgreSQL en el puerto `5432`.

Para detener los servicios:

```bash
docker compose down
```

No uses `docker compose down -v` salvo que quieras borrar también la base de datos de Docker.

## Ejecución nativa en Windows

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edita `backend/.env` con las credenciales reales de PostgreSQL y Wialon. Luego:

```powershell
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload
```

La configuración nativa usa `localhost:5432`, por lo que no debes cambiar tu base actual si ya está funcionando.

## Variables de entorno

La plantilla está en `backend/.env.example`. Las principales son:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`
- `WIALON_TOKEN`, `WIALON_HOST`
- `CORS_ORIGINS`
- `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`

No subas el archivo `.env` al repositorio.

## Validación

El workflow `.github/workflows/docker-compose-ci.yml` construye y levanta el Compose en GitHub Actions, espera a que `/health` responda y luego elimina únicamente la base temporal del runner.

## Estado del proyecto

- RBAC: roles `admin`, `operator`, `viewer` y permisos por rol.
- Autenticación y módulos funcionales: en desarrollo.
- Frontend: en construcción.
