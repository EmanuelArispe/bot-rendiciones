/**
 * Configuración de Variables de Entorno
 * Carga y valida todas las variables del archivo .env
 */

import logger from '../utils/logger.js'

/**
 * Valida que una variable exista
 * @param {string} key - Nombre de la variable
 * @param {string} defaultValue - Valor por defecto (opcional)
 * @returns {string} Valor de la variable o default
 */
function getEnvVar(key, defaultValue = null) {
  const value = process.env[key]

  if (!value && !defaultValue) {
    logger.warn(`⚠️ Variable de entorno ${key} no definida`)
    return null
  }

  return value || defaultValue
}

/**
 * Carga todas las variables de entorno
 */
export function loadEnv() {
  const env = {
    // Base de datos
    database: {
      url: getEnvVar('DATABASE_URL'),
    },

    // Puppeteer
    puppeteer: {
      headless: getEnvVar('PUPPETEER_HEADLESS', 'true') === 'true',
      timeout: parseInt(getEnvVar('PUPPETEER_TIMEOUT', '30000')),
      sandbox: getEnvVar('PUPPETEER_SANDBOX', 'true') === 'true',
      executablePath: getEnvVar('PUPPETEER_EXECUTABLE_PATH', ''),
    },

    // OCR / Tesseract
    ocr: {
      language: getEnvVar('TESSERACT_LANGUAGE', 'es'),
      minConfidence: parseFloat(getEnvVar('OCR_MIN_CONFIDENCE', '0.75')),
      timeout: parseInt(getEnvVar('OCR_TIMEOUT', '30000')),
    },

    // Reintentos
    retry: {
      attempts: parseInt(getEnvVar('RETRY_ATTEMPTS', '3')),
      delay: parseInt(getEnvVar('RETRY_DELAY', '5000')),
      operationTimeout: parseInt(getEnvVar('OPERATION_TIMEOUT', '60000')),
    },

    // Rutas
    paths: {
      photos: getEnvVar('PHOTOS_DIR', './downloads'),
      logs: getEnvVar('LOGS_DIR', './logs'),
      logFile: getEnvVar('LOG_FILE', './logs/bot.log'),
      screenshots: getEnvVar('SCREENSHOTS_DIR', './screenshots'),
    },

    // Logging
    logging: {
      level: getEnvVar('LOG_LEVEL', 'info'),
      toFile: getEnvVar('LOG_TO_FILE', 'true') === 'true',
      maxFiles: parseInt(getEnvVar('LOG_MAX_FILES', '7')),
      maxSize: getEnvVar('LOG_MAX_SIZE', '20m'),
    },

    // Debug
    debug: {
      enabled: getEnvVar('DEBUG', 'false') === 'true',
      puppeteer: getEnvVar('PUPPETEER_DEBUG', 'false') === 'true',
      screenshotOnError: getEnvVar('SCREENSHOT_ON_ERROR', 'true') === 'true',
    },

    // App config
    app: {
      port: parseInt(getEnvVar('PORT', '3000')),
      url: getEnvVar('APP_URL', 'http://localhost:3000'),
      env: getEnvVar('NODE_ENV', 'development'),
    },

    // Notificaciones
    notifications: {
      adminEmail: getEnvVar('ADMIN_EMAIL'),
      errorWebhook: getEnvVar('ERROR_WEBHOOK_URL'),
    },

    // Seguridad
    security: {
      encryptionKey: getEnvVar('ENCRYPTION_KEY'),
      sessionSecret: getEnvVar('SESSION_SECRET'),
    },
  }

  return env
}

/**
 * Valida que todas las variables críticas estén configuradas
 * @throws {Error} Si falta alguna variable crítica
 */
export function validateEnv() {
  const criticalVars = [
    'DATABASE_URL',
    'PUPPETEER_TIMEOUT',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ]

  const missing = criticalVars.filter((v) => !process.env[v])

  if (missing.length > 0) {
    const message = `Variables críticas no configuradas: ${missing.join(', ')}`
    logger.error(`❌ ${message}`)
    throw new Error(message)
  }

  logger.info('✅ Todas las variables críticas están configuradas')
}
