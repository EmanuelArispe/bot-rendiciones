/**
 * Error Handler Centralizado
 * Gestiona errores, reintentos, y recuperación
 */

import logger from './logger.js'

/**
 * Tipos de error personalizados
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message)
    this.statusCode = statusCode
    this.context = context
    this.timestamp = new Date()
  }
}

export class GPSError extends AppError {
  constructor(message, context = {}) {
    super(message, 503, { ...context, service: 'GPS' })
    this.name = 'GPSError'
  }
}

export class CompanyFormError extends AppError {
  constructor(message, context = {}) {
    super(message, 503, { ...context, service: 'CompanyForm' })
    this.name = 'CompanyFormError'
  }
}

export class OCRError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, { ...context, service: 'OCR' })
    this.name = 'OCRError'
  }
}

export class WhatsAppError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, { ...context, service: 'WhatsApp' })
    this.name = 'WhatsAppError'
  }
}

export class DatabaseError extends AppError {
  constructor(message, context = {}) {
    super(message, 503, { ...context, service: 'Database' })
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, { ...context, service: 'Validation' })
    this.name = 'ValidationError'
  }
}

/**
 * Reintentos automáticos con backoff exponencial
 * @param {Function} fn - Función a ejecutar
 * @param {Object} options - Opciones de reintento
 * @returns {Promise} Resultado de la función
 */
export async function retryWithBackoff(
  fn,
  options = {}
) {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry = null,
    label = 'Operation',
  } = options

  let lastError
  let delay = delayMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[RETRY] ${label} - Attempt ${attempt}/${maxAttempts}`)
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt < maxAttempts) {
        logger.warn(`[RETRY] ${label} failed, retrying in ${delay}ms`, {
          attempt,
          error: error.message,
        })

        if (onRetry) {
          await onRetry(attempt, error)
        }

        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= backoffMultiplier
      }
    }
  }

  logger.error(`[RETRY] ${label} failed after ${maxAttempts} attempts`, lastError)
  throw lastError
}

/**
 * Ejecuta función con timeout
 * @param {Function} fn - Función a ejecutar
 * @param {number} timeoutMs - Tiempo máximo en ms
 * @param {string} label - Etiqueta para logs
 * @returns {Promise} Resultado de la función
 */
export async function withTimeout(fn, timeoutMs, label = 'Operation') {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
}

/**
 * Maneja errores de Puppeteer
 */
export function handlePuppeteerError(error, context = {}) {
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('Navigation timeout')) {
    return new AppError('Página tardó demasiado en cargar', 504, {
      ...context,
      type: 'TIMEOUT',
    })
  }

  if (errorMessage.includes('Target closed')) {
    return new AppError('Navegador cerrado inesperadamente', 500, {
      ...context,
      type: 'BROWSER_CLOSED',
    })
  }

  if (errorMessage.includes('Execution context was destroyed')) {
    return new AppError('Contexto de ejecución perdido', 500, {
      ...context,
      type: 'CONTEXT_LOST',
    })
  }

  if (errorMessage.includes('Session closed')) {
    return new AppError('Sesión cerrada', 500, {
      ...context,
      type: 'SESSION_CLOSED',
    })
  }

  return new AppError(`Error en Puppeteer: ${errorMessage}`, 500, {
    ...context,
    type: 'PUPPETEER_ERROR',
  })
}

/**
 * Maneja errores de Baileys/WhatsApp
 */
export function handleWhatsAppError(error, context = {}) {
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('login')) {
    return new WhatsAppError('Error de autenticación en WhatsApp', {
      ...context,
      type: 'AUTH_ERROR',
    })
  }

  if (errorMessage.includes('connection')) {
    return new WhatsAppError('Error de conexión a WhatsApp', {
      ...context,
      type: 'CONNECTION_ERROR',
    })
  }

  if (errorMessage.includes('QR')) {
    return new WhatsAppError('Error generando código QR', {
      ...context,
      type: 'QR_ERROR',
    })
  }

  return new WhatsAppError(`Error en WhatsApp: ${errorMessage}`, {
    ...context,
    type: 'WHATSAPP_ERROR',
  })
}

/**
 * Maneja errores de OCR/Tesseract
 */
export function handleOCRError(error, context = {}) {
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('worker')) {
    return new OCRError('Error del worker de Tesseract', {
      ...context,
      type: 'WORKER_ERROR',
    })
  }

  if (errorMessage.includes('language')) {
    return new OCRError('Idioma no disponible para OCR', {
      ...context,
      type: 'LANGUAGE_ERROR',
    })
  }

  if (errorMessage.includes('timeout')) {
    return new OCRError('OCR tardó demasiado', {
      ...context,
      type: 'TIMEOUT',
    })
  }

  return new OCRError(`Error en OCR: ${errorMessage}`, {
    ...context,
    type: 'OCR_ERROR',
  })
}

/**
 * Maneja errores de Base de Datos
 */
export function handleDatabaseError(error, context = {}) {
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('UNIQUE')) {
    return new DatabaseError('Registro duplicado', {
      ...context,
      type: 'DUPLICATE',
    })
  }

  if (errorMessage.includes('FOREIGN KEY')) {
    return new DatabaseError('Referencia a registro no existente', {
      ...context,
      type: 'FOREIGN_KEY',
    })
  }

  if (errorMessage.includes('connection')) {
    return new DatabaseError('Error de conexión a BD', {
      ...context,
      type: 'CONNECTION_ERROR',
    })
  }

  if (errorMessage.includes('timeout')) {
    return new DatabaseError('BD tardó demasiado en responder', {
      ...context,
      type: 'TIMEOUT',
    })
  }

  return new DatabaseError(`Error en BD: ${errorMessage}`, {
    ...context,
    type: 'DATABASE_ERROR',
  })
}

/**
 * Log centralizado de errores
 */
export function logAppError(error, context = {}) {
  if (error instanceof AppError) {
    logger.error(`[${error.name}] ${error.message}`, {
      statusCode: error.statusCode,
      context: error.context,
      ...context,
    })
  } else {
    logger.error(`[UnknownError] ${error.message}`, {
      stack: error.stack,
      ...context,
    })
  }
}

/**
 * Formatea mensaje de error para usuario
 */
export function formatErrorForUser(error) {
  if (error instanceof ValidationError) {
    return `❌ Datos inválidos: ${error.message}`
  }

  if (error instanceof GPSError) {
    return `❌ Error extrayendo datos del GPS: ${error.message}`
  }

  if (error instanceof CompanyFormError) {
    return `❌ Error cargando en sistema: ${error.message}`
  }

  if (error instanceof OCRError) {
    return `❌ Error procesando factura: ${error.message}`
  }

  if (error instanceof DatabaseError) {
    return `❌ Error guardando en base de datos`
  }

  return `❌ Ocurrió un error: ${error.message}`
}
