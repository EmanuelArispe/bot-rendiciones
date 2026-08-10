# 🐳 Docker Setup - PostgreSQL (Desarrollo)

Este documento explica cómo levantar PostgreSQL en Docker para desarrollar el bot de rendición de viáticos localmente.

---

## 1. Instalar Docker Desktop

1. Descargar Docker Desktop para Windows: https://www.docker.com/products/docker-desktop/
2. Ejecutar el instalador y reiniciar la PC si lo pide.
3. Abrir Docker Desktop y esperar a que el ícono de la ballena quede estable (Docker Engine corriendo).
4. Verificar la instalación desde una terminal (PowerShell o Git Bash):

```bash
docker --version
docker compose version
```

> Si `docker compose version` falla, usar `docker-compose version` (versión standalone). Los comandos de esta guía funcionan con ambas variantes: `docker compose ...` o `docker-compose ...`.

---

## 2. Levantar los servicios

Desde la raíz del proyecto (`bot-rendiciones/`), donde está `docker-compose.yml`:

```bash
# Levantar en segundo plano
docker-compose up -d

# Ver el estado de los contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f postgres

# Ver logs sin seguir (snapshot)
docker-compose logs postgres
```

Esperar a que `docker-compose ps` muestre el contenedor `bot-rendiciones-postgres` como `healthy`.

Para detener los servicios (sin borrar datos):

```bash
docker-compose stop
```

Para volver a levantarlos:

```bash
docker-compose start
```

Para bajar los contenedores (sin borrar volúmenes):

```bash
docker-compose down
```

---

## 3. Configurar el `.env` del proyecto

Las variables de entorno viven en la carpeta `env/` (fuera de la raíz). Copiar la variable `DATABASE_URL` desde `env/.env.docker` a tu `env/.env` real:

```
DATABASE_URL="postgresql://bot_user:secure_password_123@localhost:5432/bot_rendiciones"
```

Luego aplicar las migraciones de Prisma contra el Postgres de Docker. Los scripts `db:*` de `package.json` ya cargan `env/.env` automáticamente con `dotenv-cli`:

```bash
npm run db:migrate
npm run db:generate
```

---

## 4. Acceso a psql desde terminal

Conectarse directamente al contenedor de Postgres:

```bash
docker exec -it bot-rendiciones-postgres psql -U bot_user -d bot_rendiciones
```

Comandos útiles dentro de `psql`:

```sql
\dt              -- listar tablas
\d "User"        -- describir una tabla
\du              -- listar usuarios/roles
\l               -- listar bases de datos
\q               -- salir
```

También se puede conectar desde el host (si tenés `psql` instalado localmente) usando el puerto publicado:

```bash
psql -h localhost -p 5432 -U bot_user -d bot_rendiciones
```

---

## 5. Comandos útiles

### Backup de la base de datos

```bash
docker exec -t bot-rendiciones-postgres pg_dump -U bot_user -d bot_rendiciones > backup.sql
```

Backup en formato comprimido (recomendado para bases más grandes):

```bash
docker exec -t bot-rendiciones-postgres pg_dump -U bot_user -d bot_rendiciones -F c > backup.dump
```

### Restore de la base de datos

Desde un `.sql` plano:

```bash
cat backup.sql | docker exec -i bot-rendiciones-postgres psql -U bot_user -d bot_rendiciones
```

Desde un `.dump` comprimido:

```bash
docker exec -i bot-rendiciones-postgres pg_restore -U bot_user -d bot_rendiciones --clean --if-exists < backup.dump
```

### Resetear la base de datos completamente (⚠️ borra datos)

```bash
docker-compose down -v   # borra también el volumen postgres_data
docker-compose up -d
npx prisma migrate dev
```

### Ver uso de recursos del contenedor

```bash
docker stats bot-rendiciones-postgres
```

### Entrar a una shell del contenedor

```bash
docker exec -it bot-rendiciones-postgres sh
```

---

## 6. Troubleshooting

| Problema | Solución |
|----------|----------|
| `docker-compose up` falla con "port is already allocated" | Otro proceso está usando el puerto 5432. Verificar con `netstat -ano \| findstr 5432` (PowerShell) y detener ese proceso, o cambiar el puerto publicado en `docker-compose.yml` (ej. `"5433:5432"`) y actualizar `DATABASE_URL`. |
| El contenedor queda como `unhealthy` | Revisar logs con `docker-compose logs postgres`. Suele deberse a un volumen corrupto de una versión anterior de Postgres; probar `docker-compose down -v` y levantar de nuevo. |
| `ECONNREFUSED` al conectar desde la app | Verificar que el contenedor esté `healthy` (`docker-compose ps`) y que `DATABASE_URL` en `.env` apunte a `localhost:5432` (no al nombre del servicio `postgres`, que solo resuelve dentro de la red de Docker). |
| `password authentication failed for user "bot_user"` | El volumen `postgres_data` ya existía con credenciales distintas (Postgres solo aplica `POSTGRES_USER`/`POSTGRES_PASSWORD` la primera vez que se crea el volumen). Ejecutar `docker-compose down -v` para recrear el volumen desde cero. |
| Cambios en `docker-compose.yml` no toman efecto | Ejecutar `docker-compose up -d --force-recreate`. |
| Docker Desktop no arranca / "Docker Engine stopped" | Reiniciar Docker Desktop. En Windows, verificar que WSL2 esté actualizado (`wsl --update`) y que la virtualización esté habilitada en BIOS. |
| Prisma no encuentra la base de datos | Confirmar que `DATABASE_URL` en `.env` coincide exactamente con las credenciales de `docker-compose.yml` (`bot_user` / `secure_password_123` / `bot_rendiciones`). |
| Quiero limpiar todo Docker del proyecto | `docker-compose down -v --rmi local` (borra contenedores, volúmenes e imágenes construidas localmente). |

---

## 7. Resumen de credenciales (desarrollo local)

| Variable | Valor |
|----------|-------|
| Usuario | `bot_user` |
| Password | `secure_password_123` |
| Base de datos | `bot_rendiciones` |
| Host | `localhost` |
| Puerto | `5432` |
| Connection string | `postgresql://bot_user:secure_password_123@localhost:5432/bot_rendiciones` |

⚠️ Estas credenciales son solo para desarrollo local. Nunca usarlas en producción ni commitear un `.env` con credenciales reales.