# 🤖 Bot de Rendición de Viaticos - CLAUDE.md

**Proyecto:** Automatización de rendición de viaticos y gastos de mantenimiento vehicular  
**Autor:** Emanuel Perez  
**Stack:** Node.js + Baileys + Puppeteer + Tesseract.js + PostgreSQL  
**Estado:** Fase 1 - MVP Local  
**Última actualización:** 08/08/2026

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
1️⃣  USUARIO ENVÍA POR WHATSAPP
    "Viaje - 15/01 - Tandil - foto_factura.jpg"
    
2️⃣  BOT BAILEYS RECIBE
    - Parsea: fecha, localidad, descarga foto
    
3️⃣  EXTRAE KMS DEL GPS (Puppeteer)
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
- **Express.js** - Framework HTTP (para futuro)

### Automatización Web
- **Puppeteer** - Control de navegador (GPS + Formulario)
- **Baileys** - Cliente WhatsApp
- **Tesseract.js** - OCR (extrae montos)

### Base de Datos
- **PostgreSQL** - Base de datos relacional (Fases 1-2)
- **Prisma** - ORM + Migrations (versionado tipo Git)

### Utilidades
- **Dotenv** - Variables de entorno
- **Axios** - HTTP requests
- **Winston** - Logging profesional
- **Joi** - Validación de datos
- **Bcrypt** - Encriptación
- **Sharp** - Procesamiento de imágenes

---

## 📁 ESTRUCTURA DEL PROYECTO

```
bot-rendiciones/
├── src/
│   ├── bot/
│   │   ├── whatsapp.js          # Baileys - conexión WhatsApp
│   │   ├── message-parser.js    # Parsea: fecha, localidad, foto
│   │   └── response-handler.js  # Responde al usuario
│   │
│   ├── automation/
│   │   ├── gps-scraper.js       # Puppeteer → Extrae KMs
│   │   ├── company-form.js      # Puppeteer → Completa formulario
│   │   └── browser-pool.js      # Gestiona múltiples navegadores
│   │
│   ├── ocr/
│   │   ├── invoice-parser.js    # Tesseract → OCR de facturas
│   │   └── validators.js        # Valida montos extraídos
│   │
│   ├── db/
│   │   ├── models.js            # Esquema BD
│   │   ├── user.js              # Usuarios + credenciales
│   │   └── rendiciones.js       # Histórico de rendiciones
│   │
│   ├── utils/
│   │   ├── logger.js            # Winston - logs
│   │   ├── error-handler.js     # Manejo de errores
│   │   ├── retry-logic.js       # Reintentos automáticos
│   │   └── file-handler.js      # Manejo de fotos
│   │
│   ├── config/
│   │   ├── env.js               # Variables de entorno
│   │   └── constants.js         # Constantes del proyecto
│   │
│   └── index.js                 # Entry point
│
├── tests/
│   ├── gps.test.js
│   ├── ocr.test.js
│   └── form.test.js
│
├── database/
│   ├── schema.sql               # Estructura BD
│   └── seed.sql                 # Datos iniciales
│
├── docs/
│   ├── API.md                   # Documentación API
│   ├── DEPLOYMENT.md            # Deploy a Railway
│   ├── USER_GUIDE.md            # Guía para usuarios
│   └── TROUBLESHOOTING.md       # Solución de problemas
│
├── sessions/                    # Datos de sesión Baileys
├── downloads/                   # Fotos descargadas
├── logs/                        # Archivos de log
│
├── .env.example
├── .env                         # ⚠️ NEVER COMMIT
├── .gitignore
├── package.json
├── package-lock.json
└── CLAUDE.md                    # Este archivo
```

---

## 🎯 SKILLS DEL BOT (Funcionalidades principales)

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

### Skill 2: Extracción de KMs desde GPS
**Entrada:** Credenciales GPS + Fecha del viaje  
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

### Skill 3: OCR de Facturas (Tesseract)
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

### Skill 4: Automatización de Formulario Empresa
**Entrada:** Datos procesados (KMs, monto, fechas, localidad)  
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

---

### Skill 5: Gestión de Base de Datos Local
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

### Skill 6: Respuesta Inteligente en WhatsApp
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
// Ejemplo: Tabla de usuarios
model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  firstName String?
  gpsUsername String
  gpsPasswordHash String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  rendiciones Rendicion[]
  expenses Expense[]
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
| `User` | Usuarios, credenciales GPS/Empresa |
| `WhatsappSession` | Sesiones de Baileys |
| `Rendicion` | Viajes rendidos |
| `Expense` | Gastos (combustible, mantenimiento, etc) |
| `AuditLog` | Logs de auditoría |
| `ChangeLog` | Historial de cambios |
| `SystemConfig` | Configuración de la app |

---

## 🔑 VARIABLES DE ENTORNO (.env)

```
# WhatsApp Baileys
BAILEYS_SESSION_ID=default

# Base de datos
DB_TYPE=sqlite
DB_PATH=./database/bot.db

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/bot.log

# Timeouts y reintentos
PUPPETEER_TIMEOUT=30000
RETRY_ATTEMPTS=3
RETRY_DELAY=5000

# OCR
TESSERACT_LANG=es
OCR_MIN_CONFIDENCE=0.7

# Rutas
PHOTOS_DIR=./downloads
SESSIONS_DIR=./sessions

# Debug
DEBUG=false
HEADLESS_BROWSER=true
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

# ===== PRISMA & BD =====
# Crear primera migración
npx prisma migrate dev --name init

# Aplicar migrations (después de git pull)
npx prisma migrate deploy

# Ver BD en UI (studio)
npx prisma studio

# Resetear BD completamente (⚠️ elimina datos)
npx prisma migrate reset

# Generar cliente Prisma
npx prisma generate

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
feat(baileys-bot): implement message parser
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
- [ ] Setup Node + Baileys
- [ ] Bot recibe mensajes WhatsApp
- [ ] Parser de mensajes
- [ ] Puppeteer → GPS scraper
- [ ] Tesseract → OCR
- [ ] Puppeteer → Formulario empresa
- [ ] SQLite local
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
| Baileys no se conecta | Eliminar carpeta `sessions/`, reintentar |
| Puppeteer timeout | Aumentar PUPPETEER_TIMEOUT en .env |
| OCR no detecta monto | Mejorar calidad foto, revisar idioma |
| Formulario no se carga | Verificar credenciales, revisar logs |
| **ERROR: DATABASE_URL no definida** | Crear `.env` desde `.env.example` y setear `DATABASE_URL` |
| **ERROR: connect ECONNREFUSED en PostgreSQL** | Verificar que PostgreSQL está corriendo (`sudo service postgresql status`) |
| **ERROR: Migration failed** | Ejecutar `npx prisma migrate reset` para resetear |
| **ERROR: Prisma client desactualizado** | Ejecutar `npx prisma generate` |
| **ERROR: Foreign key constraint fail** | Verificar que user_id existe antes de agregar rendiciones |
| **Credenciales no se encriptan** | Verificar que `bcrypt` se usa en seed.js |
| **Logs muy grandes** | Limitar con `npm run clean:logs` o ajustar `LOG_MAX_FILES` |

---

## 📞 CONTACTO & NOTAS

- **Desarrollador:** Emanuel Perez
- **Empresa:** La Segunda (rendición de viaticos)
- **Estado Actual:** Iniciando desarrollo
- **Próximo paso:** Setup y primer módulo de Baileys

---

**Este documento es vivo - actualizar conforme avanza el desarrollo** ✨
