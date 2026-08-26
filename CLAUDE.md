# 🚗 App de Rendición de Viáticos - CLAUDE.md

**Proyecto:** Automatización de rendición de viáticos y gastos de mantenimiento vehicular
**Autor:** Emanuel Perez
**Stack:** Node.js + Express + Puppeteer + PostgreSQL (Docker) + Prisma
**Estado:** Fase 1 - MVP Local (login web + credenciales + vehículo + GPS scraper + OCR de facturas implementados; formulario empresa pendiente)
**Última actualización:** 26/08/2026

---

## 📋 VISIÓN GENERAL

⚠️ **El proyecto arrancó pensado como bot de WhatsApp (ver el flujo original más abajo en "Historia"), pero hoy es una webapp de formularios con login propio.** No hay `whatsapp-web.js`, ni parser de mensajes, ni carpeta `src/bot/` en el código actual — eso quedó descartado. Este documento describe el estado real del código, no el plan original.

Webapp que automatiza la rendición de viáticos:
- Usuario se loguea, completa un formulario de rendición (fechas + origen/destino)
- La app extrae los KMs recorridos desde el GPS de la empresa automáticamente (Puppeteer)
- Usuario carga, uno por uno, los gastos del viaje (combustible, peajes, hospedaje, etc) con la
  factura (foto o PDF); el monto se detecta solo (OCR/texto del PDF) o se ingresa a mano
- Usuario carga gastos de mantenimiento con el mismo mecanismo de factura + monto asistido
- Queda un histórico en PostgreSQL
- Pendiente: cargar todo eso en el formulario de la empresa (La Segunda) automáticamente

---

## 🔄 FLUJO ACTUAL (End-to-End)

```
0️⃣  LOGIN (✅ implementado)
    Usuario entra a /login con email + contraseña (creados por un admin)
    → cookie de sesión firmada (accessToken en tabla User)

1️⃣  SETUP DE CREDENCIALES GPS/EMPRESA (✅ implementado)
    Usuario va a /app/credenciales, carga usuario/contraseña de GPS y de Empresa
    → se valida con un login real (Puppeteer) contra mapas.seguimientoglobal.com
      y el SSO de la empresa, UNA VEZ, antes de guardar
    → si OK, se cifra (AES-256-GCM) y se guarda en User (gpsCredentialsStatus/
      companyCredentialsStatus = ACTIVE)
    → si falla, se rechaza con el error puntual, sin guardar nada

2️⃣  CONFIGURAR VEHÍCULO (✅ implementado)
    Usuario va a /app/vehiculo, carga la patente (se guarda en MAYÚSCULAS,
    normalizada porque el GPS scraper matchea por texto exacto) y el modelo

3️⃣  CARGAR RENDICIÓN (✅ implementado, best-effort)
    Usuario va a /app/rendicion, completa fechas + origen/destino
    → se guarda la rendición en BD (status PENDING, kilometers null)
    → en background (sin bloquear la respuesta) se intenta completar el
      kilometraje contra el GPS usando las credenciales guardadas (Skill GPS)
    → si funciona: se actualiza kilometers/gpsRetrievedAt en esa misma rendición
    → si falla (credenciales, timeout, vehículo no encontrado): la rendición
      queda con kilometers null y un job periódico la vuelve a intentar
      (ver Skill GPS más abajo)

3️⃣.5  CARGAR GASTOS DEL VIAJE (✅ implementado, uno a la vez)
    Al guardar la rendición, se redirige a /app/rendicion/:id/gastos
    → el usuario agrega ahí combustible, peajes, hospedaje, etc — un form
      por factura, tantas veces como haga falta ("Terminar" = volver al menú)
    → cada gasto: tipo + fecha + descripción + factura (foto o PDF) + método
      de pago; el monto se detecta solo (ver Skill OCR) o se carga a mano

4️⃣  CARGAR MANTENIMIENTO (✅ implementado)
    Usuario va a /app/mantenimiento, carga fecha + descripción + método de
    pago + factura (foto o PDF, ver Skill OCR) + monto (opcional: si se deja
    vacío, se detecta de la factura)

5️⃣  CARGA EN FORMULARIO EMPRESA (⏳ no implementado)
    No existe automatización de app.lasegunda.com.ar / Netpro / Rendición de
    Gastos. Los datos quedan en la BD local nada más.

6️⃣  ADMINISTRACIÓN (✅ implementado)
    Un usuario con isAdmin=true puede, desde /app/usuarios: crear usuarios,
    activar/desactivar, y resetear la contraseña de cualquier usuario
```

---

## 🛠️ STACK TECNOLÓGICO

### Core
- **Node.js** (>=20) - Runtime JavaScript, ESM (`"type": "module"`)
- **Express.js** - Toda la app es un servidor de formularios HTML server-rendered (no hay frontend separado, no hay API JSON)

### Automatización Web
- **Puppeteer** - Login/validación de credenciales (✅) y GPS scraper (✅). Formulario de empresa (⏳ no existe)
- **Tesseract.js** - OCR de fotos de facturas (✅, ver `src/ocr/invoice-parser.js`)
- **pdfjs-dist** (`legacy/build`, sin canvas) - Extrae el texto embebido de facturas en PDF (✅, misma ruta que Tesseract)

### Base de Datos
- **PostgreSQL** - Vía Docker Compose en desarrollo (`docker-compose.yml`, ver `docs/DOCKER_SETUP.md`)
- **Prisma** - ORM + Migrations

### Utilidades
- **Dotenv / dotenv-cli** - Variables de entorno (viven en `env/`, no en la raíz)
- **cookie-parser** - Cookie de sesión firmada (login)
- **Multer** - Upload de facturas (foto o PDF), middleware compartido en `receipt-upload.js`
- **Winston (+ winston-daily-rotate-file)** - Logging
- **Joi** - Instalado, sin uso visible todavía (la validación real está a mano en los `*-service.js`)
- **Node `crypto` (AES-256-GCM)** - Cifrado reversible de credenciales GPS/Empresa (`src/utils/crypto.js`)
- **Bcrypt** - Hash de contraseñas de usuario (login de la app, no las credenciales de GPS/Empresa, que necesitan ser reversibles)
- **Sharp / Axios** - Instaladas, sin uso confirmado todavía

---

## 📁 ESTRUCTURA DEL PROYECTO (real, no aspiracional)

```
bot-rendiciones/
├── src/
│   ├── api/
│   │   ├── server.js                 # ✅ Setup de Express + middleware de error centralizado
│   │   ├── middleware/
│   │   │   ├── require-user.js       # ✅ Lee cookie de sesión, carga req.user o redirige a /login
│   │   │   ├── require-admin.js      # ✅ Corta con 403 si req.user no es admin
│   │   │   ├── async-handler.js      # ✅ Envuelve handlers async → next(error) (evita crashear el proceso)
│   │   │   └── receipt-upload.js     # ✅ Multer compartido (foto o PDF) para mantenimiento y gastos de viaje
│   │   └── routes/
│   │       ├── auth-routes.js        # ✅ /, /login, /logout
│   │       ├── menu-routes.js        # ✅ /app (menú principal)
│   │       ├── credential-routes.js  # ✅ /app/credenciales (setup GPS/Empresa)
│   │       ├── profile-routes.js     # ✅ /app/vehiculo, /app/cambiar-password
│   │       ├── rendicion-routes.js   # ✅ /app/rendicion
│   │       ├── rendicion-gasto-routes.js # ✅ /app/rendicion/:id/gastos (gastos del viaje, de a uno)
│   │       ├── mantenimiento-routes.js # ✅ /app/mantenimiento (+ upload de foto/PDF)
│   │       └── admin-routes.js       # ✅ /app/usuarios (alta, activar/desactivar, resetear password)
│   │
│   ├── services/
│   │   ├── user-service.js           # ✅ Alta/login/vehículo/reseteo de password
│   │   ├── credential-service.js     # ✅ Guardar/leer credenciales cifradas, marcar inválidas
│   │   ├── credential-audit.js       # ✅ Log de uso de credenciales (GPS/FORM)
│   │   ├── rendicion-service.js      # ✅ Crear rendición + enriquecer con KMs del GPS (best-effort)
│   │   └── expense-service.js        # ✅ Gastos (mantenimiento + gastos de viaje), monto manual u OCR
│   │
│   ├── jobs/
│   │   └── gps-retry-job.js          # ✅ Reintenta el kilometraje de rendiciones que quedaron sin GPS
│   │
│   ├── automation/
│   │   └── gps-scraper.js            # ✅ Puppeteer → login GPS, selecciona vehículo, extrae KMs
│   │   # company-form.js             # ⏳ No existe (formulario de empresa)
│   │
│   ├── ocr/
│   │   └── invoice-parser.js         # ✅ Monto desde foto (Tesseract) o PDF con texto (pdfjs-dist)
│   │
│   ├── db/
│   │   ├── prisma.js                 # ✅ Cliente Prisma singleton
│   │   ├── user-repository.js        # ✅
│   │   ├── rendicion-repository.js   # ✅
│   │   ├── expense-repository.js     # ✅
│   │   └── credential-usage-repository.js # ✅
│   │
│   ├── views/
│   │   ├── app.css                   # ✅ Estilos compartidos de todos los formularios
│   │   ├── menu.html                 # ✅ Template del menú principal
│   │   └── renderers/                # ✅ Un renderer por página (arma el HTML a partir de templates + datos)
│   │
│   ├── utils/
│   │   ├── logger.js                 # ✅ Winston (exitOnError: false, ver nota en Troubleshooting)
│   │   ├── error-handler.js          # ✅ AppError/GPSError/OCRError/etc + retryWithBackoff/withTimeout
│   │   ├── crypto.js                 # ✅ AES-256-GCM encrypt/decrypt
│   │   └── credential-validator.js   # ✅ Login real (1 vez) contra GPS/Empresa, usado en /app/credenciales
│   │
│   ├── config/
│   │   ├── env.js                    # ✅ Carga y valida variables de entorno
│   │   ├── constants.js              # ✅ URLs, selectores Puppeteer, timeouts, mensajes
│   │   └── company-locations.js      # ✅ Provincias/códigos válidos para origen/destino
│   │
│   └── index.js                      # ✅ Entry point (carga env, arranca servidor HTTP)
│
├── tests/                            # ⏳ Carpeta vacía, sin tests todavía (hay script `npm test` armado)
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
├── downloads/                        # Fotos de comprobantes subidas (mantenimiento)
├── logs/                             # Archivos de log
│
├── env/                              # Variables de entorno (fuera de la raíz)
│   ├── .env                          # ⚠️ NEVER COMMIT (gitignored)
│   └── .env.docker                   # Plantilla de referencia (sí se commitea)
│
├── docker-compose.yml                # PostgreSQL local para desarrollo
├── .gitignore
├── package.json
├── package-lock.json
└── CLAUDE.md                         # Este archivo
```

> Nota: `.claude-instructions` en la raíz es un documento viejo del plan original (bot de WhatsApp) que no se actualizó. No es fuente de verdad — este `CLAUDE.md` sí.

---

## 🎯 FUNCIONALIDADES (estado real)

### Login y sesión (✅ implementado)
`auth-routes.js` + `require-user.js`. Un admin crea los usuarios (no hay auto-registro). Login con email/password (bcrypt) → cookie de sesión firmada (`accessToken` en `User`, rotado en logout/reset de password).

### Gestión de Credenciales GPS/Empresa (✅ implementado)
**Ruta:** `/app/credenciales`
1. Usuario carga usuario/contraseña de GPS y/o Empresa (solo pide las que falten o las que quiera cambiar)
2. `validateWhicheverIsNeeded` (`credential-routes.js`) corre un login real contra `mapas.seguimientoglobal.com` y/o el SSO de la empresa (`src/utils/credential-validator.js`), una sola vez
3. Si valida OK → se cifra con AES-256-GCM (`src/utils/crypto.js`) y se guarda en `User` (`gpsCredentialsStatus`/`companyCredentialsStatus` = `ACTIVE`)
4. Si falla → se marca `INVALID_CREDENTIALS` con el error puntual, sin guardar nada

**Uso posterior (desde el GPS Scraper):**
- `getGpsCredentials(userId)` (`credential-service.js`) devuelve las credenciales ya desencriptadas, o `null` si no hay ninguna activa
- Si fallan al usarse en producción (no en el setup) → `markGpsCredentialsAsInvalid(userId, reason)` + `logCredentialUsage(userId, 'GPS', false, reason)`
- ⚠️ **Debilidad conocida:** hoy no hay ningún aviso al usuario cuando esto pasa. El estado queda en la BD pero nadie se lo comunica (no hay bot, ni email, ni banner en el menú todavía)

**Por qué AES y no bcrypt:** bcrypt es un hash de una sola vía; la app necesita recuperar la contraseña en texto plano para loguearse vía Puppeteer, así que se usa cifrado simétrico reversible.

### Vehículo del usuario (✅ implementado)
**Ruta:** `/app/vehiculo`. Guarda patente (`vehicleId`, normalizada a MAYÚSCULAS porque el GPS scraper matchea el DOM por texto exacto) y modelo (`vehicleModel`).

### GPS Scraper — extracción de KMs (✅ implementado, con debilidades)
**Archivo:** `src/automation/gps-scraper.js`, consumido desde `rendicion-service.js`
**Entrada:** credenciales GPS (vía `getGpsCredentials`) + patente del usuario + rango de fechas del viaje
**Proceso:**
1. Abre Puppeteer headless, login en `mapas.seguimientoglobal.com`
2. Abre la tab "Recorridos", selecciona la fila cuyo `<td>` de patente matchea exacto contra `user.vehicleId`
3. Setea rango de fechas (`#FechaIni`/`#FechaFin`, formato `YYYY/MM/DD`)
4. Click en "Ver Recorridos", lee `#distRecor` y parsea el número antes de "km"
5. Reintenta con backoff (`retryWithBackoff`, hasta `RETRY_ATTEMPTS`) salvo que el error sea de credenciales incorrectas (eso no se arregla reintentando)

**Manejo de errores:** ver `enrichWithKilometers` en `rendicion-service.js` — es best-effort, nunca tira: si algo falla, la rendición queda igual que antes (`kilometers: null`, `status: PENDING`) y se loguea en `CredentialUsageLog`.

**Estado real de las 3 debilidades detectadas (25/08/2026):**
| # | Debilidad | Estado |
|---|-----------|--------|
| 1 | El scraping corría **síncrono dentro del request** de `POST /app/rendicion` (el usuario esperaba a que Puppeteer terminara para ver la respuesta) | ✅ Resuelto — ver abajo |
| 2 | Si fallaban los 3 reintentos, el km quedaba `null` para siempre, sin ningún mecanismo para reintentarlo más tarde | ✅ Resuelto — ver abajo |
| 3 | Si las credenciales GPS quedaban `INVALID_CREDENTIALS`, no había ningún aviso al usuario | ✅ Resuelto — ver abajo |

**Cómo quedaron resueltas:**
1. `createRendicion` ya no espera (`await`) a `enrichWithKilometers`: responde apenas la rendición se guarda en BD (`kilometers: null`) y el enriquecimiento corre en background, con su propio `.catch()` defensivo para que un fallo inesperado no tire abajo el proceso (mismo criterio que `fix(api): stop unhandled async errors from crashing the server`)
2. Se agregó `Rendicion.gpsRetryCount` (Prisma) + `src/jobs/gps-retry-job.js`: un `setInterval` (arrancado desde `index.js`) que cada `GPS_RETRY_INTERVAL_MS` busca rendiciones `PENDING` con `kilometers: null` y `gpsRetryCount < GPS_MAX_RETRIES`, y reintenta `enrichWithKilometers` una por una (nunca en paralelo, para no levantar varios Chromium a la vez). Cada intento fallido incrementa `gpsRetryCount`; al llegar al máximo, se deja de reintentar sola (evita reintentar para siempre un error permanente, ej. patente que no existe en el GPS)
3. `renderMenu` muestra un aviso en `/app` cuando `user.gpsCredentialsStatus === 'INVALID_CREDENTIALS'`, con link directo a `/app/credenciales`

### OCR de facturas — monto asistido (✅ implementado)
**Archivo:** `src/ocr/invoice-parser.js`, consumido desde `expense-service.js` (mantenimiento y gastos de viaje)
**Entrada:** archivo ya subido a disco (foto o PDF) + su mimetype
**Proceso:**
1. Si es PDF (`application/pdf`): se extrae el texto embebido con `pdfjs-dist` (`legacy/build`, sin `canvas` — no rendereamos páginas, solo leemos texto). Las facturas electrónicas AFIP casi siempre tienen texto real, no son un escaneo, así que esto alcanza en el caso común
2. Si el PDF no tiene texto (probablemente escaneado) o es una foto: se corre Tesseract.js sobre la imagen
3. En ambos casos, se busca primero una línea con "total"/"importe total"/"total a pagar" (confianza 0.9); si no aparece, se toma el monto más alto encontrado con `$` como heurística (confianza 0.5, y en fotos además se multiplica por la confianza propia de Tesseract)
4. Números en formato argentino (`12.345,67`) se normalizan a `12345.67`

**Cómo se usa (`resolveAmount` en `expense-service.js`):**
- Si el usuario tipeó un monto a mano, se usa ese siempre — el OCR nunca lo pisa
- Si lo dejó vacío, se corre el OCR/extracción de texto; si la confianza da `>= OCR_MIN_CONFIDENCE` se usa ese monto (guardando `ocrExtractedAmount`/`ocrConfidence` en `Expense`); si no, se rechaza el formulario pidiendo que lo cargue a mano (no se guarda nada con un monto adivinado)

**⚠️ Gotcha real que costó una tarde:** `TESSERACT_LANGUAGE` tiene que ser el código de tessdata (`spa`), no ISO 639-1 (`es` no existe como paquete → 404 al descargarlo). Ver también la nota de `exitOnError: false` en Troubleshooting: ese fallo puntual tiraba abajo **todo el proceso**, no solo el request, porque el worker de tesseract.js emite el error por fuera de la cadena de promesas.

### Gastos de Mantenimiento (✅ implementado)
**Ruta:** `/app/mantenimiento`. Fecha + descripción + método de pago + factura (foto o PDF, opcional) + monto (opcional: si no se completa, se detecta de la factura vía OCR — ver Skill OCR arriba).

### Gastos del viaje (✅ implementado, uno a la vez)
**Rutas:** `/app/rendicion/:id/gastos` (GET lista + form para agregar, POST agrega uno)
Un viaje puede tener varios gastos de distinto tipo (combustible, peaje, estacionamiento, hotelería, comida, otros — `MANTENIMIENTO` queda afuera, tiene su propio flujo). Al guardar la rendición se redirige acá; el usuario agrega una factura por gasto (mismo mecanismo de monto asistido por OCR que mantenimiento) y repite hasta terminar — no hay un paso explícito de "cerrar", el link "Terminar y volver al menú" alcanza. La ruta valida que la rendición sea del usuario logueado (404 si no).

### Automatización de Formulario Empresa (⏳ no implementado)
No hay `company-form.js` ni nada que suba las rendiciones/gastos a `app.lasegunda.com.ar`. Los selectores en `constants.js` (`SELECTORS.COMPANY`) están escritos pero **sin verificar contra el DOM real** — asumen el portal viejo, previo a la migración a SSO Keycloak (`COMPANY_LOGIN` sí está verificado, apunta al login de Keycloak).

### Administración de usuarios (✅ implementado)
**Ruta:** `/app/usuarios` (requiere `isAdmin`). Alta de usuarios, activar/desactivar, resetear contraseña de cualquier usuario (rota su `accessToken`, cierra sesiones abiertas).

---

## 💾 BASE DE DATOS (PostgreSQL + Prisma)

Ver `prisma/schema.prisma` para el schema completo. Resumen de tablas:

| Tabla | Propósito |
|-------|-----------|
| `User` | Usuario de la app: login, vehículo, credenciales GPS/Empresa cifradas, flags admin/activo |
| `CredentialUsageLog` | Auditoría de uso de credenciales (GPS/FORM, éxito/error) |
| `Rendicion` | Viajes rendidos: fechas, origen/destino, `kilometers`/`gpsRetrievedAt` (llenados por el GPS scraper), `gpsRetryCount` |
| `Expense` | Gastos (combustible, mantenimiento, etc), `ocrExtractedAmount`/`ocrConfidence` completados cuando el monto vino del OCR |
| `AuditLog` | Logs de auditoría genéricos (acción/estado/mensaje) |
| `ChangeLog` | Historial de cambios por entidad/campo |
| `SystemConfig` | Configuración de la app (key/value) |

> A diferencia de versiones anteriores de este documento: **no existe** `WhatsappSession` ni `WhatsappConnection` — las credenciales GPS/Empresa viven directo en `User`, keyed por `userId` (no por número de teléfono).

### Comandos de Prisma

```bash
# ⚠️ Usar SIEMPRE los scripts npm (cargan env/.env vía dotenv-cli)
npm run db:migrate -- --name nombre_de_la_migracion   # nueva migración
npm run db:migrate:prod                                # aplicar pendientes (prod real, DATABASE_URL ya en el entorno)
npx dotenv -e env/.env -- npx prisma migrate deploy    # lo mismo, pero en local contra el Postgres de Docker
npm run db:studio                                      # UI de la BD
npm run db:reset                                       # ⚠️ resetea todo
npm run db:generate                                    # regenerar cliente Prisma
npm run db:seed                                        # seed inicial
```

---

## 🔑 VARIABLES DE ENTORNO

Viven en `env/.env` (no en la raíz). `env/.env.docker` es la plantilla versionada; `env/.env` es el archivo real, gitignored. `src/index.js` carga `env/.env` explícitamente con `dotenv`; la mayoría de los comandos Prisma (`npm run db:*`) lo cargan vía `dotenv-cli` — **excepto `db:migrate:prod`** (`prisma migrate deploy` a secas), pensado para un entorno real donde `DATABASE_URL` ya la inyecta el hosting. Para correrlo en local contra el Postgres de Docker, hay que envolverlo a mano: `npx dotenv -e env/.env -- npx prisma migrate deploy`.

```
# Base de datos
DATABASE_URL="postgresql://bot_user:secure_password_123@localhost:5432/bot_rendiciones"

# Puppeteer
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
PUPPETEER_SANDBOX=true
PUPPETEER_EXECUTABLE_PATH=""

# OCR (Tesseract + pdfjs-dist para PDF con texto)
# ⚠️ Código de tessdata, NO ISO 639-1: "es" no existe como paquete y tira 404
TESSERACT_LANGUAGE="spa"
OCR_MIN_CONFIDENCE=0.75
OCR_TIMEOUT=30000

# Reintentos
RETRY_ATTEMPTS=3
RETRY_DELAY=5000
OPERATION_TIMEOUT=60000

# Reintento periódico de kilometraje GPS (ver src/jobs/gps-retry-job.js)
GPS_RETRY_INTERVAL_MS=900000   # 15 min
GPS_MAX_RETRIES=5

# Rutas
PHOTOS_DIR="./downloads"
LOGS_DIR="./logs"
LOG_FILE="./logs/bot.log"

# Logging
LOG_LEVEL="info"
LOG_TO_FILE=true
LOG_MAX_FILES=7
LOG_MAX_SIZE="20m"

# Debug
DEBUG=false
PUPPETEER_DEBUG=false
SCREENSHOT_ON_ERROR=true
SCREENSHOTS_DIR="./screenshots"

# App
PORT=3000
APP_URL="http://localhost:3000"
NODE_ENV="development"

# Notificaciones (futuro, sin usar todavía)
ADMIN_EMAIL="admin@example.com"
ERROR_WEBHOOK_URL=""

# Seguridad
# Cifra (AES-256-GCM) las credenciales GPS/Empresa. Generar con:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=
# Firma la cookie de sesión de login. Distinta de ENCRYPTION_KEY a propósito.
SESSION_SECRET=
```

---

## 📝 GUÍAS PARA CLAUDE (Cómo trabajar en este proyecto)

### Cuando trabajes en un módulo:

1. **Entiende el flujo real** - Mira este CLAUDE.md antes de codificar, y si algo no cuadra con el código, confiá en el código
2. **Sigue patrones existentes** - `*-routes.js` finito y delgado → `*-service.js` con la lógica/validación → `*-repository.js` con Prisma. Cada request async va envuelto en `asyncHandler`
3. **Logging con prefijo** - `logger.info('[MODULO] mensaje', { contexto })`, mismo estilo que el resto del código
4. **Manejo de errores** - Usar las clases de `error-handler.js` (`ValidationError`, `DatabaseError`, `GPSError`, etc); nunca dejar una promesa async sin `.catch`/`asyncHandler` (ver `fix(api): stop unhandled async errors from crashing the server` — un unhandled rejection tira abajo todo el proceso)
5. **Validación** - A mano en el `*-service.js` correspondiente (no hay una capa de Joi todavía pese a estar instalado)

### Checklist antes de entregar código:

- [ ] Rutas envueltas en `asyncHandler`
- [ ] Errores tipados (`ValidationError`/`DatabaseError`/etc), no `Error` genérico
- [ ] Logging con prefijo `[MODULO]`
- [ ] Puppeteer en modo headless por default, respeta `PUPPETEER_TIMEOUT`
- [ ] No expone credenciales en logs ni en HTML
- [ ] Si agrega un job en background, nunca deja una promesa sin manejar (mismo criterio que los route handlers)

### Comandos útiles:

```bash
# ===== INSTALACIÓN =====
npm install

# ===== DOCKER (PostgreSQL local) =====
docker-compose up -d
docker-compose ps
docker-compose logs -f postgres
docker-compose down

# ===== PRISMA & BD =====
npm run db:migrate -- --name nombre_de_la_migracion
npm run db:migrate:prod
npm run db:studio
npm run db:reset
npm run db:generate
npm run db:seed

# ===== EJECUCIÓN =====
npm start          # producción
npm run dev        # auto-restart (node --watch)
npm run debug      # logs verbosos (NODE_DEBUG=*)

# ===== TESTING =====
npm test           # node --test tests/**/*.test.js (carpeta vacía por ahora)

# ===== LINT / FORMAT =====
npm run lint
npm run format

# ===== LIMPIEZA =====
npm run clean:logs
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

**Types permitidos:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`

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
feat(rendicion): fill kilometers from GPS on creation
fix(gps-scraper): extract km from correct element
refactor(db): simplify user queries with prisma
perf(gps-scraper): reuse browser across GPS retry attempts
docs(setup): add postgresql installation guide
chore(deps): update prisma to 5.8.0

# Con body cuando el por qué no es obvio:
fix(api): stop unhandled async errors from crashing the server

Every route handler ran unguarded async DB calls. If Postgres was
unreachable mid-request, the rejected promise had no catch, so Node
terminated the whole process. Wrap every async handler with
asyncHandler(), forwarding errors to a centralized error middleware.
```

### Workflow

1. ✅ Hacer cambios en código
2. ✅ `git add .` (o `git add <archivo>`)
3. ✅ `git diff --cached` (revisar qué entra)
4. ✅ Draftar mensaje siguiendo formato
5. ✅ `git commit -m "<mensaje>"`
6. ✅ `git push`

### Checklist antes de commit

- [ ] Cambios son coherentes y relacionados
- [ ] Mensaje sigue formato (type(scope): summary)
- [ ] Summary: max 72 caracteres, lowercase
- [ ] Body: solo si el "por qué" no es obvio
- [ ] No hay credenciales en el código
- [ ] Tests pasan (cuando aplique)

---

## 🚀 FASES DEL DESARROLLO

### FASE 1: MVP Local
- [x] Setup Node + Express (webapp de formularios, sin frontend separado)
- [x] Login de usuarios (bcrypt + cookie de sesión firmada)
- [x] PostgreSQL local vía Docker Compose + Prisma
- [x] Gestión de credenciales GPS/Empresa (validación real + cifrado AES)
- [x] Vehículo del usuario (patente + modelo)
- [x] GPS Scraper (Puppeteer) integrado a la creación de rendiciones
- [x] Reintento en background del kilometraje + aviso al usuario si las credenciales GPS quedan inválidas
- [x] Gastos de mantenimiento (factura + monto asistido por OCR)
- [x] Gastos del viaje: varios por rendición, uno a la vez, con factura (foto o PDF)
- [x] OCR de facturas (Tesseract para fotos, pdfjs-dist para texto de PDF) con fallback a carga manual
- [x] Administración de usuarios (alta, activar/desactivar, resetear password)
- [ ] Puppeteer → Formulario empresa (La Segunda)
- [ ] Testing (la carpeta `tests/` está vacía)

### FASE 2: Cloud + Multi-usuario
- [ ] PostgreSQL en Railway (u otro hosting)
- [ ] Deploy de la webapp
- [ ] Testing con 2-3 compañeros

### FASE 3: Escalabilidad
- [ ] Onboarding de 10-13 usuarios
- [ ] Monitoreo y alertas
- [ ] Documentación

### FASE 4: Dashboard (futuro)
- [ ] Histórico y reportes más ricos que la lista simple actual

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| **ERROR: DATABASE_URL no definida** | Las env vars viven en `env/.env`, no en la raíz. Correr Prisma vía `npm run db:*` (usan `dotenv-cli`); `npx prisma ...` directo no la encuentra |
| **ERROR: connect ECONNREFUSED en PostgreSQL** | Verificar que Docker Desktop está corriendo y `docker-compose up -d` levantó el contenedor (`docker-compose ps` debe decir `healthy`) |
| **Docker Desktop no responde (`unable to get image ...`)** | Abrir Docker Desktop y esperar a que el daemon esté listo antes de `docker-compose up -d` |
| **`prisma migrate dev` pide confirmación interactiva y se cuelga** | Generar el SQL a mano con `npx dotenv -e env/.env -- npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script`, guardarlo en `prisma/migrations/<timestamp>_<nombre>/migration.sql` y aplicar con `npm run db:migrate:prod` |
| **ERROR: Migration failed** | `npm run db:reset` (⚠️ elimina datos) |
| **ERROR: Prisma client desactualizado** | `npm run db:generate` |
| **Puppeteer timeout (login o GPS scraper)** | Aumentar `PUPPETEER_TIMEOUT` en `env/.env`; revisar si el sitio de GPS/Empresa cambió de DOM (ver `SELECTORS` en `constants.js`) |
| **Usuario ve "⚠️ Tus credenciales de GPS no funcionan" en el menú** | Esperado tras un fallo real de uso (no del setup); pedirle que vuelva a `/app/credenciales` y las recargue |
| **Una rendición se queda sin kilometraje** | Revisar `CredentialUsageLog` (service GPS) y `Rendicion.gpsRetryCount`. Si llegó a `GPS_MAX_RETRIES`, el job dejó de reintentar sola — hay que revisar el error de fondo (credenciales, patente no encontrada, DOM del GPS cambiado) antes de que sirva reintentar a mano |
| **No se pudo subir la factura (mantenimiento o gastos de viaje)** | Límite de 10MB (Multer) y solo `image/*` o `application/pdf` (`receipt-upload.js`); revisar `PHOTOS_DIR` |
| **Sesión no persiste / redirige siempre a /login** | Revisar `SESSION_SECRET` en `env/.env` (firma la cookie) y que el usuario esté `isActive` |
| **"No pudimos detectar el monto de la factura automáticamente"** | Esperado si el OCR no encontró un monto plausible o dio baja confianza (`OCR_MIN_CONFIDENCE`) — pedirle al usuario que lo cargue a mano. Si pasa siempre con facturas legibles, revisar `TESSERACT_LANGUAGE` (debe ser `spa`, no `es`) |
| **El servidor se cae solo al procesar una factura por OCR** | Si volvés a ver esto, probablemente `TESSERACT_LANGUAGE` quedó mal seteado (código ISO en vez de código de tessdata) — el worker de tesseract.js falla al bajar el paquete de idioma con un error que **no pasa por una promesa rechazada**, así que ni `try/catch` ni `asyncHandler` lo agarran; sin `exitOnError: false` en `logger.js` (`src/utils/logger.js`) esto tira abajo TODO el proceso, no solo el request. Ya está mitigado, pero si aparece un crash nuevo de este estilo, sospechar de otra librería con el mismo patrón (emite error por un EventEmitter/Worker en vez de rechazar una promesa) |

---

## 📌 HISTORIA (para contexto, ya no vigente)

El proyecto arrancó planeado como bot de WhatsApp (`whatsapp-web.js`, parser de mensajes, respuestas automáticas) con setup de credenciales vía link temporal enviado por WhatsApp. Ese enfoque se abandonó en favor de una webapp con login propio — más simple de operar y desplegar para un puñado de usuarios. Si ves referencias al bot de WhatsApp en `.claude-instructions` u otros documentos viejos, son del plan original y no reflejan el código actual.

---

## 📞 CONTACTO & NOTAS

- **Desarrollador:** Emanuel Perez
- **Empresa:** La Segunda (rendición de viáticos)
- **Estado Actual:** Webapp de formularios funcionando end-to-end sobre PostgreSQL/Prisma: login, credenciales GPS/Empresa cifradas y validadas, vehículo, rendiciones con kilometraje automático (con reintento en background), gastos de viaje y de mantenimiento con monto asistido por OCR (foto o PDF)
- **Próximo paso:** Automatizar la carga de todo esto (rendición + gastos) en el formulario de la empresa (La Segunda)

---

**Este documento es vivo - actualizar conforme avanza el desarrollo** ✨
