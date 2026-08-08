/**
 * Constantes del Proyecto
 * URLs, mensajes, patrones, timeouts, etc
 */

// ============================================
// URLS EXTERNAS
// ============================================
export const EXTERNAL_URLS = {
  GPS_LOGIN: 'https://mapas.seguimientoglobal.com/login',
  GPS_MAP: 'https://mapas.seguimientoglobal.com/mapa/google',
  COMPANY_LOGIN: 'https://app.lasegunda.com.ar',
  COMPANY_RENDICION: 'https://app.lasegunda.com.ar/RIND_GASTOS/TopRendicion',
}

// ============================================
// SELECTORES DE PUPPETEER
// ============================================
export const SELECTORS = {
  // GPS
  GPS: {
    LOGIN_USER: 'input[name="username"]',
    LOGIN_PASSWORD: 'input[name="password"]',
    LOGIN_BUTTON: 'button[type="submit"]',
    VEHICLE_LIST: '.vehicle-list',
    VEHICLE_ITEM: '.vehicle-item',
    DATE_FROM: 'input[name="dateFrom"]',
    DATE_TO: 'input[name="dateTo"]',
    VIEW_ROUTE_BUTTON: 'button:contains("Ver recorrido")',
    DISTANCE_FIELD: 'text:contains("Distancia:")',
    KM_VALUE: '.distance-value',
  },

  // EMPRESA (La Segunda)
  COMPANY: {
    LOGIN_USER: 'input#Usuario',
    LOGIN_PASSWORD: 'input#Contraseña',
    LOGIN_COUNTRY: 'select[name="pais"]',
    LOGIN_BUTTON: 'button[type="submit"]',
    NETPRO_BUTTON: 'a:contains("NetPro")',
    MENU_TOGGLE: 'button.menu-toggle',
    TASADORES_OPTION: 'a:contains("Tasadores")',
    RENDICION_OPTION: 'a:contains("Rendición de Gastos")',
    RENDIR_VIAJE_BUTTON: 'button:contains("Rendir Viaje")',
    DATE_FROM: 'input[name="fechaDesde"]',
    DATE_TO: 'input[name="fechaHasta"]',
    ORIGIN_DROPDOWN: 'select[name="origen"]',
    DESTINATION_DROPDOWN: 'select[name="destino"]',
    VEHICLE_DROPDOWN: 'select[name="vehiculo"]',
    KM_FIELD: 'input[name="kmRecorridos"]',
    EXPENSE_TYPE_DROPDOWN: 'select[name="tipoGasto"]',
    EXPENSE_REASON: 'select[name="motivo"]',
    PAYMENT_METHOD: 'select[name="formaPago"]',
    AMOUNT_FIELD: 'input[name="importe"]',
    CONFIRM_BUTTON: 'button:contains("Confirmar Gestión")',
    ADD_EXPENSE_BUTTON: 'button:contains("Agregar Fila")',
  },
}

// ============================================
// MENSAJES DEL BOT
// ============================================
export const MESSAGES = {
  SUCCESS: {
    RENDITION_LOADED: (location, km, amount, date) =>
      `✅ Rendición completada!\n\n📊 Resumen:\n- Localidad: ${location}\n- Fecha: ${date}\n- Distancia: ${km} km\n- Combustible: $${amount}\n\n✅ Estado: Cargado\n\nPuedes verificar en la plataforma.`,

    PROCESSING: '⏳ Procesando tu rendición...',

    CONFIRM_OCR: (amount) =>
      `OCR detectó: $${amount}\n¿Confirmás este monto? (Sí/No)`,
  },

  ERROR: {
    INVALID_FORMAT: '❌ Formato inválido. Usa:\n"Viaje - DD/MM - Localidad - foto"',

    GPS_ERROR: '❌ Error al extraer KMs del GPS. Reintentando...',

    OCR_ERROR: '❌ No se pudo detectar el monto de la factura. Ingresalo manualmente: $___',

    FORM_ERROR: '❌ Error cargando el formulario. Reintentando en 5 minutos...',

    DB_ERROR: '❌ Error guardando en la base de datos.',

    CREDENTIALS_ERROR: '❌ Error de credenciales. Verifica tus datos de acceso.',

    TIMEOUT: '⏱️ Tiempo de espera agotado. Reintentando...',

    GENERIC: '❌ Ocurrió un error. Por favor, intenta nuevamente.',
  },

  WARNING: {
    LOW_OCR_CONFIDENCE: (confidence) =>
      `⚠️ Confianza baja (${(confidence * 100).toFixed(0)}%). Verifica el monto.`,

    MANUAL_REVIEW_NEEDED: '⚠️ Carga pendiente de revisión manual.',
  },
}

// ============================================
// TIPOS DE GASTOS
// ============================================
export const EXPENSE_TYPES = {
  COMBUSTIBLE: 'COMBUSTIBLE',
  MANTENIMIENTO: 'MANTENIMIENTO',
  PEAJE: 'PEAJE',
  ESTACIONAMIENTO: 'ESTACIONAMIENTO',
  HOTELERIA: 'HOTELERIA',
  COMIDA: 'COMIDA',
  OTROS: 'OTROS',
}

// ============================================
// MÉTODOS DE PAGO
// ============================================
export const PAYMENT_METHODS = {
  TARJETA: 'TARJETA',
  EFECTIVO: 'EFECTIVO',
  CHEQUE: 'CHEQUE',
  TRANSFERENCIA: 'TRANSFERENCIA',
}

// ============================================
// PATRONES REGEX
// ============================================
export const PATTERNS = {
  // Formato: "Viaje - 15/01 - Tandil - foto.jpg"
  TRIP_MESSAGE: /viaje\s*-\s*(\d{1,2}\/\d{1,2})\s*-\s*([a-záéíóú\s]+)\s*-/i,

  // Formato: "Mantenimiento - 10/01 - Cambio aceite - $500"
  MAINTENANCE_MESSAGE: /mantenimiento\s*-\s*(\d{1,2}\/\d{1,2})\s*-\s*([^-]+)\s*-\s*\$?(\d+)/i,

  // Extrae número de monto: $850 o 850
  AMOUNT: /\$?\s*(\d+(?:\.\d{2})?)/g,

  // Extrae fecha: 15/01 o 15/01/2026
  DATE: /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/,

  // Email
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Número de teléfono WhatsApp
  PHONE: /^\d{10,15}$/,
}

// ============================================
// TIMEOUTS (en milisegundos)
// ============================================
export const TIMEOUTS = {
  PUPPETEER_DEFAULT: 30000,    // 30s
  PUPPETEER_WAIT: 10000,       // 10s
  OCR_PROCESS: 30000,          // 30s
  WHATSAPP_MESSAGE: 5000,      // 5s
  RETRY_DELAY: 5000,           // 5s
  PAGE_LOAD: 15000,            // 15s
}

// ============================================
// CONFIGURACIÓN DE LOGS
// ============================================
export const LOG_CONFIG = {
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    HTTP: 3,
    DEBUG: 4,
    VERBOSE: 5,
    SILLY: 6,
  },

  COLORS: {
    ERROR: 'red',
    WARN: 'yellow',
    INFO: 'green',
    HTTP: 'cyan',
    DEBUG: 'magenta',
    VERBOSE: 'gray',
    SILLY: 'gray',
  },

  FORMAT: {
    SIMPLE: 'YYYY-MM-DD HH:mm:ss [%s] %message',
    DETAILED: 'YYYY-MM-DD HH:mm:ss [%s] (%function:%line) %message',
  },
}

// ============================================
// CONFIGURACIÓN DE OCR
// ============================================
export const OCR_CONFIG = {
  MIN_CONFIDENCE: 0.75,
  LANGUAGES: ['es', 'es_ES'],
  WORKER_PATH: '/tesseract/worker.min.js',
  MODEL_PATH: '/tesseract/models/',
}

// ============================================
// CONFIGURACIÓN DE PRISMA
// ============================================
export const DATABASE_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
}

// ============================================
// ESTADO DE RENDICIONES
// ============================================
export const RENDITION_STATUS = {
  PENDING: 'PENDING',      // Pendiente carga
  LOADED: 'LOADED',        // Cargado
  CONFIRMED: 'CONFIRMED',  // Confirmado
  ERROR: 'ERROR',          // Error en carga
}

// ============================================
// ESTADOS DE LOGS
// ============================================
export const LOG_STATUS = {
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
}

// ============================================
// CONFIGURACIÓN DE EMAILS (Futuro)
// ============================================
export const EMAIL_CONFIG = {
  FROM: 'bot@rendiciones.com',
  SUBJECT_PREFIX: '[Bot Rendiciones]',
  TEMPLATES: {
    ERROR: 'error-notification.html',
    SUCCESS: 'success-notification.html',
  },
}
