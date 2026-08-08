/**
 * Sistema de Logging con Winston
 * Registra eventos en archivo y consola
 */

import winston from 'winston'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Niveles personalizados de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  verbose: 5,
  silly: 6,
}

// Colores para consola
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  debug: 'magenta',
  verbose: 'gray',
  silly: 'gray',
}

winston.addColors(colors)

/**
 * Formatea mensaje de log
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
)

/**
 * Transportes de Winston
 */
const transports = [
  // Consola (colorida)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...args } = info

        const ts = timestamp.slice(0, 19).replace('T', ' ')

        return `${ts} [${level}]: ${message} ${
          Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
        }`
      }),
    ),
  }),

  // Archivo de error
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Archivo general
  new winston.transports.File({
    filename: path.join(logsDir, 'bot.log'),
    format: format,
    maxsize: 5242880, // 5MB
    maxFiles: 7,
  }),

  // Archivo de combinado
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: format,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
]

/**
 * Logger principal
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
})

/**
 * Métodos de conveniencia
 */

/**
 * Registra error
 * @param {string} message - Mensaje de error
 * @param {Error} error - Objeto de error (opcional)
 */
logger.logError = function (message, error = null) {
  if (error && error instanceof Error) {
    this.error(`${message}\n${error.stack}`)
  } else {
    this.error(message)
  }
}

/**
 * Registra información de rendición
 */
logger.logRendition = function (userId, data) {
  this.info(`[RENDITION] User: ${userId}`, data)
}

/**
 * Registra automatización GPS
 */
logger.logGPS = function (action, data) {
  this.info(`[GPS] ${action}`, data)
}

/**
 * Registra OCR
 */
logger.logOCR = function (action, confidence, data) {
  const level = confidence < 0.75 ? 'warn' : 'info'
  this[level](`[OCR] ${action} (confidence: ${confidence})`, data)
}

/**
 * Registra automatización de formulario
 */
logger.logFormAutomation = function (action, data) {
  this.info(`[FORM] ${action}`, data)
}

/**
 * Registra eventos de WhatsApp
 */
logger.logWhatsApp = function (action, phoneNumber, data) {
  this.info(`[WHATSAPP] ${action} - User: ${phoneNumber}`, data)
}

/**
 * Mide tiempo de ejecución
 */
logger.measureTime = function (label, callback) {
  const start = Date.now()
  return async (...args) => {
    try {
      const result = await callback(...args)
      const duration = Date.now() - start
      this.debug(`[TIMER] ${label} took ${duration}ms`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.error(`[TIMER] ${label} failed after ${duration}ms`, error)
      throw error
    }
  }
}

export default logger
