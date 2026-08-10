# 🤖 Bot de Rendición de Viaticos - CLAUDE.md

**Proyecto:** Automatización de rendición de viaticos y gastos de mantenimiento vehicular  
**Autor:** Emanuel Perez  
**Stack:** Node.js + whatsapp-web.js + Puppeteer + Tesseract.js + PostgreSQL (Docker)  
**Estado:** Fase 1 - MVP Local (gestión de credenciales implementada; GPS/OCR/formulario empresa pendientes)  
**Última actualización:** 10/08/2026

---

## 📋 VISIÓN GENERAL

Bot WhatsApp que automatiza completamente la rendición de viaticos:
- Usuario envía: fecha + localidad + foto factura
- Bot extrae KMs del GPS automáticamente
- Bot carga todo en formulario de empresa
- Bot guarda histórico
- Usuario verifica 1x/mes

**Ahorro:** De 40min a 5min por rendición

---

## 🔄 FLUJO DEL BOT (End-to-End)

```
0️⃣  SETUP DE CREDENCIALES (una sola vez, ✅ implementado)
    Usuario escribe "setup-credentials" → bot genera link (15 min)
    → formulario valida GPS + Empresa UNA VEZ contra las APIs reales
    → si OK, guarda cifrado (AES-256-GCM). Ver "Skill 0" más abajo.

1️⃣  USUARIO ENVÍA POR WHATSAPP
    "Viaje - 15/01 - Tandil - foto_factura.jpg"
    
2️⃣  BOT WHATSAPP-WEB.JS RECIBE
    - Parsea: fecha, localidad, descarga foto
    
3️⃣  EXTRAE KMS DEL GPS (Puppeteer) — ⏳ pendiente de implementar
    - Usa las credenciales guardadas (getCredentialsForBot)
    - Login a: mapas.seguimientoglobal.com
    - Selecciona vehículo
    - Setea fechas
    - Extrae valor de "Distancia: software"
    - Retorna: 147.07 km
    
4️⃣  EXTRAE MONTO DE FOTO (Tesseract OCR)
    - Analiza imagen de factura
    - Identifica valor numérico
    - Retorna: $850
    
5️⃣  CARGA EN FORMULARIO EMPRESA (Puppeteer)
    - Login: app.lasegunda.com.ar
    - Navega: Netpro → Tasadores → Rendición de Gastos
    - Completa: Fechas, Origen, Destino, KM, Vehículo
    - Agrega: Gasto de combustible ($850)
    - Si hay: Gasto de mantenimiento
    - Click: Confirmar Gestión
    
6️⃣  GUARDA EN BD LOCAL
    - Histórico de rendición
    - Logs de operación
    - Foto almacenada
    
7️⃣  RESPONDE EN WHATSAPP
    "✅ Cargado: $850, 147.07km, Tandil - 15/01/2026"
```

---

## 🛠️ STACK TECNOLÓGICO

### Core
- **Node.js v22.22.2** - Runtime JavaScript
- **Express.js** - Sirve el formulario web de setup de credenciales (`src/api/`)

### Automatización Web
- **Puppeteer** - Control de navegador (validación de credenciales ✅; GPS + Formulario ⏳ pendientes)
- **whatsapp-web.js** - Cliente WhatsApp (usa Puppeteer internamente para controlar WhatsApp Web)
- **qrcode / qrcode-terminal** - Generación del QR de vinculación (terminal + archivo `qr.png`)
- **Tesseract.js** - OCR (extrae montos) — ⏳ integración pendiente

### Base de Datos
- **PostgreSQL** - Vía Docker Compose en desarrollo (`docker-compose.yml`, ver `docs/DOCKER_SETUP.md`)
- **Prisma** - ORM + Migrations (versionado tipo Git)

### Utilidades
- **Dotenv / dotenv-cli** - Variables de entorno (ver sección de env vars: viven en `env/`, no en la raíz)
- **Axios** - HTTP requests
- **Winston** - Logging profesional
- **Joi** - Validación de datos
- **Node `crypto` (AES-256-GCM)** - Cifrado reversible de credenciales GPS/Empresa (`src/utils/crypto.js`)
- **Bcrypt** - Dependencia instalada, sin uso actual (las credenciales necesitan ser reversibles para loguear vía Puppeteer, así que no sirve un hash de una vía)
- **Sharp** - Procesamiento de imágenes

---

## 📁 ESTRUCTURA DEL PROYECTO

Estado real (✅ implementado / ⏳ pendiente):

```
bot-rendiciones/
├── src/
│   ├── bot/
│   │   ├── whatsapp.js            # ✅ whatsapp-web.js - conexión + manejo de mensajes/comandos
│   │   ├── message-parser.js      # ✅ Parsea: fecha, localidad, foto
│   │   └── credential-manager.js  # ✅ Puente bot↔credential-service (setup-credentials, notif. de fallo)
│   │
│   ├── services/
│   │   ├── credential-service.js  # ✅ Token de setup, guardado/lectura cifrada (AES-256-GCM)
│   │   └── credential-audit.js    # ✅ Log de uso de credenciales (GPS/FORM) para debugging
│   │
│   ├── api/
│   │   ├── server.js              # ✅ Servidor Express (formulario de setup)
│   │   └── routes/
│   │       └── credential-routes.js # ✅ GET /setup, POST /setup/validate
│   │
│   ├── views/
│   │   └── credential-form.html   # ✅ Formulario web de setup de credenciales
│   │
│   ├── db/
│   │   └── prisma.js              # ✅ Cliente Prisma singleton
│   │
│   ├── automation/                # ⏳ No existe todavía
│   │   ├── gps-scraper.js         # Puppeteer → Extrae KMs
│   │   ├── company-form.js        # Puppeteer → Completa formulario
│   │   └── browser-pool.js        # Gestiona múltiples navegadores
│   │
│   ├── ocr/                       # ⏳ No existe todavía
│   │   ├── invoice-parser.js      # Tesseract → OCR de facturas
│   │   └── validators.js          # Valida montos extraídos
│   │
│   ├── utils/
│   │   ├── logger.js              # ✅ Winston - logs
│   │   ├── error-handler.js       # ✅ Errores + retryWithBackoff/withTimeout (no hay retry-logic.js separado)
│   │   ├── crypto.js              # ✅ AES-256-GCM encrypt/decrypt (credenciales)
│   │   └── credential-validator.js # ✅ Login real (1 vez) contra GPS/Empresa, usado solo en el setup
│   │
│   ├── config/
│   │   ├── env.js                 # ✅ Variables de entorno
│   │   └── constants.js           # ✅ URLs, selectores Puppeteer, mensajes, timeouts
│   │
│   └── index.js                   # ✅ Entry point (arranca servidor HTTP + bot)
│
├── tests/                         # ⏳ Carpeta vacía, sin tests todavía
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
│
├── docs/
│   ├── DATABASE_SETUP.md
│   └── DOCKER_SETUP.md
│
├── sessions/                     # Datos de sesión whatsapp-web.js (LocalAuth)
├── qr.png                        # QR de vinculación generado en cada login
├── downloads/                    # Fotos descargadas
├── logs/                         # Archivos de log
│
├── env/                          # Variables de entorno (fuera de la raíz)
│   ├── .env                      # ⚠️ NEVER COMMIT (gitignored)
│   └── .env.docker               # Plantilla de referencia (sí se commitea)
│
├── docker-compose.yml            # PostgreSQL local para desarrollo
├── .gitignore
├── package.json
├── package-lock.json
└── CLAUDE.md                     # Este archivo
```

---

## 🎯 SKILLS DEL BOT (Funcionalidades principales)

### Skill 0: Gestión de Credenciales (✅ implementado)
**Comando:** `setup-credentials` (WhatsApp)
**Setup (primera vez):**
1. Usuario escribe `setup-credentials` → `handleSetupCredentialsCommand` (`src/bot/credential-manager.js`)
2. Bot genera token de un solo uso, válido 15 min (`credential-service.generateSetupToken`), y responde con el link `${APP_URL}/setup?token=...`
3. Usuario completa el formulario (`src/views/credential-form.html`, servido por `src/api/routes/credential-routes.js`) con usuario/contraseña de GPS y de Empresa
4. `POST /setup/validate` corre `validateCredentialsAgainstAPIs` (`src/utils/credential-validator.js`) — login real, **una sola vez**, contra `mapas.seguimientoglobal.com` y `app.lasegunda.com.ar`
5. Si ambas validan OK → se cifran con AES-256-GCM (`src/utils/crypto.js`, clave derivada de `ENCRYPTION_KEY`) y se guardan en `WhatsappSession` (estado `ACTIVE`)
6. Si alguna falla → se rechaza con el error específico, sin guardar nada

**Uso (después, desde GPS Scraper / Form Automation cuando existan):**
- `getCredentialsForBot(phoneNumber)` devuelve las credenciales ya desencriptadas, o `null` si no hay ninguna activa
- Si fallan al usarse en producción (no en el setup) → `handleCredentialFailure(phoneNumber, service, error)` registra el intento (`credential-audit.logCredentialUsage`), marca `credentialsStatus: INVALID_CREDENTIALS` y avisa al usuario por WhatsApp para que vuelva a correr `setup-credentials`

**Por qué AES y no bcrypt:** bcrypt es un hash de una sola vía; el bot necesita recuperar la contraseña en texto plano para loguearse vía Puppeteer, así que se usa cifrado simétrico reversible.

---

### Skill 1: Parseo de Mensajes WhatsApp
**Entrada:** "Viaje - 15/01 - Tandil - foto.jpg" | "Mantenimiento - 10/01 - Cambio aceite - $500"  
**Proceso:**
- Detecta tipo de mensaje (Viaje / Mantenimiento)
- Extrae fecha
- Extrae localidad/descripción
- Descarga foto (si aplica)

**Salida:** Objeto con campos parseados
```javascript
{
  type: "viaje",
  date: "2026-01-15",
  location: "Tandil",
  photo: Buffer,
  messageId: "xxx"
}
```

---

### Skill 2: Extracción de KMs desde GPS (⏳ pendiente de implementar)
**Entrada:** Credenciales GPS (vía `getCredentialsForBot`, ver Skill 0) + Fecha del viaje  
**Proceso:**
1. Abre Puppeteer (navegador headless)
2. Login en mapas.seguimientoglobal.com
3. Selecciona vehículo del usuario
4. Setea rango de fechas
5. Click en "Ver recorrido"
6. Busca elemento: "Distancia: software"
7. Extrae valor numérico

**Salida:** Número de KMs
```javascript
147.07
```

**Manejo de errores:**
- Reintentos x3 si falla conexión
- Timeout si tarda >30s
- Log detallado de cada paso

---

### Skill 3: OCR de Facturas (Tesseract) (⏳ pendiente de implementar)
**Entrada:** Foto de factura/recibo  
**Proceso:**
1. Convierte imagen a texto
2. Busca patrones de números ($XXX)
3. Valida formato de monto
4. Retorna valor con confianza

**Salida:** Monto extraído
```javascript
{
  amount: 850,
  currency: "ARS",
  confidence: 0.95,
  raw: "$850"
}
```

**Validaciones:**
- Si confidence < 0.7 → Pide confirmación al usuario
- Rango: $50 - $100.000 (válidas)

---

### Skill 4: Automatización de Formulario Empresa (⏳ pendiente de implementar)
**Entrada:** Datos procesados (KMs, monto, fechas, localidad) + credenciales vía `getCredentialsForBot`  
**Proceso:**
1. Abre Puppeteer
2. Login app.lasegunda.com.ar
3. Navega: Netpro → Tasadores → Rendición Gastos
4. Click "Rendir Viaje"
5. Completa campos:
   - Fecha Desde/Hasta
   - Origen/Destino (dropdowns)
   - Vehículo (dropdown)
   - Km Rec. en la Gestión
6. Agrega fila de gasto:
   - Tipo: COMBUSTIBLE (dropdown)
   - Motivo: RESOL. SINIES1 (dropdown)
   - Forma Pago: TARJETA (dropdown)
   - Importe: $850
7. Click "Confirmar Gestión"
8. Si hay mantenimiento: Agrega segunda fila

**Salida:** Confirmación de carga
```javascript
{
  success: true,
  renditionId: "ABC123",
  timestamp: "2026-01-15T14:30:00Z"
}
```

**Manejo de errores:**
- Reintentos x3 en cada paso
- Capturas de pantalla si falla
- Log de selector HTML usado
- Si el fallo es por login rechazado (no timeout/selector roto) → llamar a `handleCredentialFailure(phoneNumber, 'FORM', error)` (Skill 0), no reintentar con las mismas credenciales

---

### Skill 5: Gestión de Base de Datos Local (⏳ pendiente para rendiciones; Prisma+Docker ya está andando)
**Entrada:** Datos de rendición completada  
**Proceso:**
1. Guarda registro en tabla `rendiciones`
2. Almacena foto en carpeta `downloads`
3. Crea log de auditoría
4. Actualiza historial de usuario

**Salida:** ID de registro guardado
```javascript
{
  id: 1,
  userId: "user@example.com",
  date: "2026-01-15",
  amount: 850,
  kilometers: 147.07,
  status: "cargado"
}
```

---

### Skill 6: Respuesta Inteligente en WhatsApp (✅ `help`/`status`/`setup-credentials` implementados; respuestas de rendición ⏳ pendientes)
**Entrada:** Resultado de toda la automatización  
**Proceso:**
1. Formatea mensaje de confirmación
2. Incluye resumen de carga
3. Agrega emoji según resultado
4. Envía a usuario

**Ejemplos:**

✅ Éxito:
```
✅ Rendición completada!

📊 Resumen:
- Localidad: Tandil
- Fecha: 15/01/2026
- Distancia: 147.07 km
- Combustible: $850
- Estado: ✅ Cargado

Puedes verificar en la plataforma.
```

⚠️ Éxito parcial:
```
⚠️ Cargado con advertencia

- Distancia: 147.07 km ✅
- Monto factura: NO DETECTADO ❌
  Ingresá manualmente: $___

¿Confirmás el monto?
```

❌ Error:
```
❌ Error en la carga

Error: Formulario empresa no responde
Reintentando en 5 minutos...
Te aviso cuando se cargue ✅
```

---

## 💾 BASE DE DATOS (PostgreSQL + Prisma)

### Prisma Schema (Versionado como Git)

El schema se define en `prisma/schema.prisma` y se versionea automáticamente:

```prisma
// Simplificado — ver prisma/schema.prisma para el real
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  firstName String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  rendiciones Rendicion[]
  expenses Expense[]
}

// Credenciales GPS/Empresa: NO están en User. Viven en WhatsappSession,
// keyed por número de WhatsApp (no por userId), cifradas con AES-256-GCM.
// Ver Skill 0 más arriba.
model WhatsappSession {
  id                       Int      @id @default(autoincrement())
  phoneNumber              String   @unique
  gpsUsername              String?
  gpsPasswordEncrypted     String?
  companyUsername          String?
  companyPasswordEncrypted String?
  credentialsStatus        CredentialStatus @default(SETUP_PENDING)
  setupToken               String?  @unique
  setupTokenExpiresAt      DateTime?
}

model Rendicion {
  id          Int       @id @default(autoincrement())
  userId      Int
  travelDate  DateTime
  origin      String
  destination String
  kilometers  Decimal   @db.Decimal(10, 2)
  status      RendicionStatus @default(PENDING)
  createdAt   DateTime  @default(now())
}

model Expense {
  id        Int       @id @default(autoincrement())
  userId    Int
  rendicionId Int?
  type      ExpenseType
  amount    Decimal   @db.Decimal(10, 2)
  createdAt DateTime  @default(now())
}
```

### Migrations (Automático con Prisma)

Cada cambio al schema genera una migración automática:

```bash
# Primera vez
npx prisma migrate dev --name init
→ Crea: prisma/migrations/20260108_init/migration.sql

# Siguiente cambio
npx prisma migrate dev --name add_gps_fields
→ Crea: prisma/migrations/20260108_add_gps_fields/migration.sql

# Ver todas las migrations
ls prisma/migrations/
```

**Ventajas:**
- ✅ Historial completo de cambios (como Git)
- ✅ Rollback automático si falla
- ✅ Type-safe (Prisma genera TypeScript types)
- ✅ Versionable en Git
- ✅ Sincroniza con BD automáticamente

### Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| `User` | Usuarios de la app (perfil, vehículo). Ya no guarda credenciales |
| `WhatsappConnection` | Estado de conexión/sesión de whatsapp-web.js (LocalAuth) |
| `WhatsappSession` | Credenciales GPS/Empresa por número de WhatsApp, cifradas AES-256-GCM + token de setup (Skill 0) |
| `CredentialUsageLog` | Auditoría de uso de credenciales (GPS/FORM, éxito/error) |
| `Rendicion` | Viajes rendidos |
| `Expense` | Gastos (combustible, mantenimiento, etc) |
| `AuditLog` | Logs de auditoría |
| `ChangeLog` | Historial de cambios |
| `SystemConfig` | Configuración de la app |

> ⚠️ Nombres que confunden a propósito: `WhatsappConnection` = sesión de whatsapp-web.js (login del bot). `WhatsappSession` = credenciales GPS/Empresa del usuario (setup-credentials). No son lo mismo.

---

## 🔑 VARIABLES DE ENTORNO

⚠️ Viven en `env/.env` (no en la raíz del proyecto). `env/.env.docker` es la plantilla de referencia versionada en git; `env/.env` es el archivo real y está gitignored. `src/index.js` carga `env/.env` explícitamente con `dotenv`; los comandos Prisma (`npm run db:*`) lo cargan vía `dotenv-cli` — correr `npx prisma ...` directo no encuentra `DATABASE_URL`.

```
# Base de datos (Docker Compose - ver docker-compose.yml)
DATABASE_URL="postgresql://bot_user:secure_password_123@localhost:5432/bot_rendiciones"

# WhatsApp (whatsapp-web.js)
BAILEYS_SESSION_ID=default   # nombre legacy de la var; ver src/config/env.js

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/bot.log

# Timeouts y reintentos
PUPPETEER_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=5000

# OCR
TESSERACT_LANGUAGE=es
OCR_MIN_CONFIDENCE=0.75

# Rutas
PHOTOS_DIR=./downloads
SESSIONS_DIR=./sessions

# Sistemas externos (Skill 0/2/4)
GPS_URL=https://mapas.seguimientoglobal.com/login
COMPANY_URL=https://app.lasegunda.com.ar

# Servidor HTTP (formulario de setup de credenciales)
PORT=3000
APP_URL=http://localhost:3000

# Cifrado de credenciales (AES-256-GCM, ver src/utils/crypto.js)
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=

# Debug
DEBUG=false
```

---

## 📝 GUÍAS PARA CLAUDE (Cómo trabajar en este proyecto)

### Cuando trabajes en un módulo:

1. **Entiende el flujo completo** - Mira CLAUDE.md antes de codificar
2. **Revisa estructura** - Qué carpeta, qué archivo
3. **Sigue patrones existentes** - Usa estilos de código similares
4. **Logging detallado** - Cada operación importante debe logar
5. **Manejo de errores** - Try-catch + reintentos automáticos
6. **Validación** - Valida inputs antes de procesarlos

### Checklist antes de entregar código:

- [ ] Tiene try-catch con logging
- [ ] Valida datos de entrada
- [ ] Tiene reintentos si es necesario
- [ ] Funciona en modo headless
- [ ] Logs claramente identificados
- [ ] No expone credenciales
- [ ] Maneja timeouts

### Comandos útiles:

```bash
# ===== INSTALACIÓN =====
npm install

# ===== DOCKER (PostgreSQL local) =====
# Ver docs/DOCKER_SETUP.md para la guía completa
docker-compose up -d      # Levantar Postgres
docker-compose ps         # Ver estado / healthcheck
docker-compose logs -f postgres
docker-compose down       # Bajar (sin borrar datos, sin -v)

# ===== PRISMA & BD =====
# ⚠️ Usar SIEMPRE los scripts npm (cargan env/.env vía dotenv-cli).
# `npx prisma ...` directo no encuentra DATABASE_URL.

# Crear una migración (pide el nombre como argumento extra)
npm run db:migrate -- --name nombre_de_la_migracion

# Aplicar migrations pendientes sin generar nuevas (después de git pull, o en prod)
npm run db:migrate:prod

# Ver BD en UI (studio)
npm run db:studio

# Resetear BD completamente (⚠️ elimina datos)
npm run db:reset

# Generar cliente Prisma
npm run db:generate

# Seed inicial (datos de prueba)
npm run db:seed

# ===== EJECUCIÓN =====
# Ejecutar bot
npm start

# Modo desarrollo (auto-restart on file change)
npm run dev

# Modo debug (logs verbosos)
npm run debug

# ===== TESTING =====
npm test

# ===== LOGGING & LIMPIEZA =====
# Ver logs en tiempo real
tail -f logs/bot.log

# Limpiar sesiones (cuidado!)
npm run clean:sessions

# Limpiar logs antiguos
npm run clean:logs

# Limpiar fotos descargadas
npm run clean:downloads
```

---

## 📝 CONVENCIÓN DE COMMITS (Git Workflow)

### Formato: Conventional Commits

Antes de hacer commit, ejecutar:

```bash
git diff --cached  # Ver qué está staged
git status         # Confirmar archivos
```

### Formato del mensaje

```
<type>(<optional scope>): <short summary in imperative mood>

<optional body: what changed and why, not how>
```

**Types permitidos:**
- `feat` - Nueva funcionalidad
- `fix` - Bug fix
- `refactor` - Reorganización de código (no cambia funcionalidad)
- `perf` - Mejora de performance
- `test` - Tests
- `docs` - Documentación
- `chore` - Tareas (dependencias, setup, etc)

### Reglas

| Regla | Detalle |
|-------|---------|
| **Summary** | Max 72 caracteres, lowercase, sin punto al final |
| **Body** | Solo cuando el "por qué" no es obvio. Wrap a 72 caracteres |
| **Scope** | Usar cuando sea específico (ej: `feat(gps-scraper)`) |
| **No incluir** | Co-Authored-By, referencias a Claude, atribuciones IA |
| **Base** | Solo derivar de `git diff --cached`, no leer todo el repo |

### Ejemplos ✅

```bash
feat(whatsapp-bot): implement message parser
fix(puppeteer): wait for gps page load
refactor(db): simplify user queries with prisma
perf(ocr): reduce memory usage in image processing
docs(setup): add postgresql installation guide
chore(deps): update prisma to 5.8.0
feat(db-schema): add expense logging table

# Con body cuando el por qué no es obvio:
fix(gps-scraper): extract km from correct element

Previously we were looking for "Distancia" field
but it changed to "Distancia: software". Updated
selector to be more specific to avoid breakage.
```

### Workflow

1. ✅ Hacer cambios en código
2. ✅ `git add .` (o `git add <archivo>`)
3. ✅ `git diff --cached` (revisar qué entra)
4. ✅ Draftar mensaje siguiendo formato
5. ✅ `git commit -m "<mensaje>"`
6. ✅ `git push`

### Ejemplos con scope (recomendado)

```bash
feat(whatsapp-bot): handle media downloads
fix(form-automation): click correct submit button
refactor(ocr-service): extract confidence validation
perf(image-processing): cache tesseract models
test(gps-scraper): add timeout handling
docs(api): document rendicion endpoints
chore(prisma): add new migration for audit logs
```

### Checklist antes de commit

- [ ] Cambios son coherentes y relacionados
- [ ] Mensaje sigue formato (type(scope): summary)
- [ ] Summary: max 72 caracteres, lowercase
- [ ] Body: solo si el "por qué" no es obvio
- [ ] No hay credenciales en el código
- [ ] Tests pasan (cuando aplique)
- [ ] Logs están en DEBUG (no en INFO para desarrollo)

---

## 🚀 FASES DEL DESARROLLO

### FASE 1: MVP Local (4-6 semanas)
- [x] Setup Node + whatsapp-web.js
- [x] Bot recibe mensajes WhatsApp
- [x] Parser de mensajes
- [x] Gestión de credenciales (setup-credentials + formulario + validación real + cifrado AES) — Skill 0
- [x] PostgreSQL local vía Docker Compose (reemplaza el plan original de SQLite)
- [ ] Puppeteer → GPS scraper
- [ ] Tesseract → OCR
- [ ] Puppeteer → Formulario empresa (usando `getCredentialsForBot`)
- [ ] Guardar rendiciones/gastos en BD desde el flujo real (hoy solo hay TODO en `whatsapp.js`)
- [ ] Testing exhaustivo

### FASE 2: Cloud + Multi-usuario (2-3 semanas)
- [ ] PostgreSQL en Railway
- [ ] Autenticación de usuarios
- [ ] Deploy a Railway
- [ ] Testing con 2-3 compañeros

### FASE 3: Escalabilidad (1-2 semanas)
- [ ] Onboarding de 10-13 usuarios
- [ ] Monitoreo y alertas
- [ ] Documentación

### FASE 4: Dashboard (futuro)
- [ ] Interfaz web
- [ ] Ver histórico
- [ ] Reportes

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| Bot no se conecta / QR no aparece | Eliminar carpeta `sessions/`, reintentar (revisar también `qr.png` generado) |
| QR expira antes de escanear | Reintentar; el QR de whatsapp-web.js expira a los ~60s |
| Puppeteer timeout | Aumentar `PUPPETEER_TIMEOUT` en `env/.env` |
| OCR no detecta monto | Mejorar calidad foto, revisar idioma (⏳ OCR aún no está integrado) |
| Formulario empresa no se carga | ⏳ Módulo no implementado todavía (ver Skill 4) |
| **ERROR: DATABASE_URL no definida** | Las env vars viven en `env/.env`, no en la raíz. Verificar que existe y correr Prisma vía `npm run db:*` (usan `dotenv-cli`); `npx prisma ...` directo no la encuentra |
| **ERROR: connect ECONNREFUSED en PostgreSQL** | Verificar que Docker Desktop está corriendo y `docker-compose up -d` levantó el contenedor (`docker-compose ps` debe decir `healthy`) |
| **Docker Desktop no responde (`unable to get image ...`)** | Abrir Docker Desktop y esperar a que el daemon esté listo antes de `docker-compose up -d` |
| **`prisma migrate dev` pide confirmación interactiva y se cuelga** | Pasa con cambios ambiguos de modelos (ej. rename vs drop+create). Generar el SQL a mano con `npx dotenv -e env/.env -- npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`, guardarlo en `prisma/migrations/<timestamp>_<nombre>/migration.sql` y aplicar con `npm run db:migrate:prod` |
| **ERROR: Migration failed** | Ejecutar `npm run db:reset` para resetear (⚠️ elimina datos) |
| **ERROR: Prisma client desactualizado** | Ejecutar `npm run db:generate` |
| **ERROR: Foreign key constraint fail** | Verificar que `userId`/`phoneNumber` existe antes de agregar rendiciones o logs de credenciales |
| **Usuario ve "⚠️ Tus credenciales no funcionan"** | Es esperado tras un fallo de uso real (Skill 0); pedirle que reenvíe `setup-credentials` para regenerar el link y re-validar |
| **Token de setup-credentials expirado** | Dura 15 minutos; el usuario debe volver a escribir `setup-credentials` |
| **Logs muy grandes** | Limitar con `npm run clean:logs` o ajustar `LOG_MAX_FILES` |

---

## 📞 CONTACTO & NOTAS

- **Desarrollador:** Emanuel Perez
- **Empresa:** La Segunda (rendición de viaticos)
- **Estado Actual:** Bot de WhatsApp + gestión de credenciales (setup, cifrado AES, validación real) funcionando end-to-end sobre PostgreSQL en Docker
- **Próximo paso:** Implementar GPS Scraper y Formulario Empresa (Skills 2 y 4), consumiendo las credenciales ya guardadas vía `getCredentialsForBot`

---

**Este documento es vivo - actualizar conforme avanza el desarrollo** ✨
