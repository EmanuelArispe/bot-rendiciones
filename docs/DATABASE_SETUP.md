# 🗄️ Guía de Setup PostgreSQL + Prisma

---

## 📋 Requisitos Previos

- Node.js v20+
- PostgreSQL 14+ instalado y corriendo
- Git
- Visual Studio Code o WebStorm (opcional)

---

## 🚀 INSTALACIÓN RÁPIDA

### Paso 1: Instalar PostgreSQL (si no lo tienes)

**Windows:**
```bash
# Descargar desde https://www.postgresql.org/download/windows/
# O usar Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
```

### Paso 2: Crear base de datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Dentro de psql:
CREATE DATABASE bot_rendiciones;
CREATE USER bot_user WITH PASSWORD 'secure_password_123';
ALTER ROLE bot_user SET client_encoding TO 'utf8';
ALTER ROLE bot_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE bot_user SET default_transaction_deferrable TO on;
ALTER ROLE bot_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE bot_rendiciones TO bot_user;
\q
```

### Paso 3: Verificar conexión

```bash
psql -U bot_user -d bot_rendiciones -h localhost
# Debería conectarse sin error
# Escribir \q para salir
```

### Paso 4: Configurar .env

```bash
# Copiar template
cp .env.example .env

# Editar .env con tus datos
nano .env  # o abrirlo en editor
```

**Línea importante:**
```
DATABASE_URL="postgresql://bot_user:secure_password_123@localhost:5432/bot_rendiciones"
```

### Paso 5: Instalar dependencias y ejecutar migrations

```bash
# Instalar paquetes
npm install

# Ejecutar migrations (crea tablas automáticamente)
npx prisma migrate dev --name init

# Si todo va bien, verás:
# ✔ Generated Prisma Client (v5.x.x) in X ms
# ✅ 1 migration deployed
```

### Paso 6: Seed inicial (opcional)

```bash
# Cargar datos de prueba
npm run db:seed

# Deberías ver:
# ✅ Usuario creado: emanuel@example.com
# ✅ Rendición creada: 1
# ✅ Gasto de combustible creado: 1
```

### Paso 7: Verificar con Prisma Studio

```bash
# Abrir interfaz web de Prisma
npx prisma studio

# Se abre en http://localhost:5555
# Puedes ver/editar datos en la UI
```

---

## 🔄 WORKFLOW CON PRISMA

### Cuando cambias el schema:

```bash
# 1. Editar prisma/schema.prisma
nano prisma/schema.prisma

# 2. Crear migración automáticamente
npx prisma migrate dev --name mi_cambio

# Prisma:
# - Genera migration.sql
# - Aplica a la BD
# - Regenera Prisma Client

# 3. Git (opcional)
git add prisma/
git commit -m "Add field to User model"
```

### Cuando haces git pull (otros cambios):

```bash
# Si hay nuevas migrations, aplicarlas:
npx prisma migrate deploy

# O si estás en desarrollo:
npx prisma migrate dev
```

### Resetear BD (⚠️ CUIDADO - elimina todo):

```bash
# Eliminar todos los datos y recrear
npx prisma migrate reset

# Te pedirá confirmación
```

---

## 📊 ESTRUCTURA DE TABLAS

### User (Usuarios)
Almacena info de usuarios + credenciales encriptadas

**Campos principales:**
- `id` - PK
- `email` - Único
- `firstName`, `lastName` - Nombre completo
- `gpsUsername`, `gpsPasswordHash` - Credenciales GPS (encriptadas)
- `companyUsername`, `companyPasswordHash` - Credenciales empresa
- `vehicleId`, `vehicleModel` - Datos del vehículo
- `isActive` - Si está activo
- `createdAt`, `updatedAt` - Timestamps

### Rendicion (Viajes rendidos)
Cada rendición es un viaje con sus datos

**Campos principales:**
- `id` - PK
- `userId` - FK a User
- `travelDate` - Fecha del viaje
- `origin`, `destination` - De/Hacia dónde
- `kilometers` - KMs extraídos del GPS
- `vehicleUsed` - Vehículo usado en este viaje
- `status` - PENDING, LOADED, CONFIRMED, ERROR
- `renditionId` - ID en sistema empresa
- `createdAt`, `updatedAt`

### Expense (Gastos)
Cada gasto asociado a una rendición

**Campos principales:**
- `id` - PK
- `userId`, `rendicionId` - Relaciones
- `type` - COMBUSTIBLE, MANTENIMIENTO, etc
- `amount` - Monto en ARS
- `paymentMethod` - TARJETA, EFECTIVO, etc
- `receiptPath` - Ruta a foto de factura
- `ocrExtractedAmount` - Monto extraído por OCR
- `ocrConfidence` - Confianza del OCR (0-1)
- `loadedToSystem` - Si se cargó en sistema

### AuditLog (Logs)
Historial completo de operaciones

**Campos principales:**
- `id` - PK
- `userId`, `rendicionId`, `expenseId` - Relaciones
- `action` - GPS_EXTRACTED, OCR_PROCESSED, FORM_LOADED, etc
- `status` - SUCCESS, WARNING, ERROR
- `message` - Descripción
- `details` - JSON con info extra
- `createdAt`

---

## 🔐 SEGURIDAD

### Credenciales Encriptadas

Las contraseñas se guardan **hashidas con bcrypt**, no en texto plano:

```javascript
// Al crear usuario:
const hashedPassword = await bcrypt.hash(password, 10)
user.gpsPasswordHash = hashedPassword

// Al verificar:
const isValid = await bcrypt.compare(inputPassword, user.gpsPasswordHash)
```

### Variables Sensibles

NUNCA commitear:
- `.env` (credenciales DB)
- `sessions/` (tokens de Baileys)
- Archivos con `.key`, `.pem`

Usar `.gitignore` para evitarlo.

---

## 🌩️ MIGRATE A RAILWAY (Cloud)

Cuando quieras subir a production en Railway:

### 1. Crear proyecto en Railway

```bash
# Instalar CLI de Railway
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway init
```

### 2. Agregar PostgreSQL

En dashboard de Railway:
- Click "+ New Service"
- Seleccionar PostgreSQL
- Railway configura todo automáticamente

### 3. Variables de entorno

Railway asigna `DATABASE_URL` automáticamente.

Puedes agregar el resto en "Variables":
```
PUPPETEER_TIMEOUT=30000
LOG_LEVEL=info
BAILEYS_SESSION_ID=production
```

### 4. Deploy

```bash
# Ver status
railway status

# Ver logs
railway logs

# Deploy
railway up
```

---

## 📝 COMANDOS MÁS USADOS

```bash
# Ver estado BD
npx prisma db push

# Studio (UI web)
npx prisma studio

# Ver migrations
ls prisma/migrations/

# Generar tipos
npx prisma generate

# Ver BD en SQL
psql -U bot_user -d bot_rendiciones

# Dentro de psql:
\dt              # Ver tablas
\d users         # Ver estructura de tabla
SELECT * FROM users;  # Query
\q              # Salir
```

---

## 🆘 PROBLEMAS COMUNES

### "DATABASE_URL not found"
```bash
# Falta .env
cp .env.example .env
# Edita DATABASE_URL
```

### "Connection refused"
```bash
# PostgreSQL no está corriendo
# Windows: buscar "PostgreSQL 15" en servicios
# Mac: brew services start postgresql@15
# Linux: sudo service postgresql start
```

### "Migration failed"
```bash
# Problema de schema
# Opciones:
npx prisma migrate resolve --rolled-back <nombre>
npx prisma migrate reset  # ⚠️ Elimina todo
```

### "Prisma Client outdated"
```bash
npx prisma generate
npm install @prisma/client@latest
```

---

## ✅ CHECKLIST DE SETUP

- [ ] PostgreSQL instalado y corriendo
- [ ] BD `bot_rendiciones` creada
- [ ] Usuario `bot_user` creado con permisos
- [ ] `.env` configurado con `DATABASE_URL`
- [ ] `npm install` ejecutado
- [ ] `npx prisma migrate dev` ejecutado (migración inicial)
- [ ] Prisma Studio funciona (`npx prisma studio`)
- [ ] Datos de prueba cargados (`npm run db:seed`)
- [ ] Conexión a BD verificada

¡Listo! Ya estás preparado para empezar. 🚀
