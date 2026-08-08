/**
 * Parser de Mensajes de WhatsApp
 * Extrae datos de rendiciones y mantenimiento
 * 
 * Formatos soportados:
 * - Viaje: "Viaje - DD/MM - Localidad - [foto]"
 * - Mantenimiento: "Mantenimiento - DD/MM - Descripción - $MONTO"
 */

import logger from '../utils/logger.js'
import { PATTERNS } from '../config/constants.js'
import { ValidationError } from '../utils/error-handler.js'

/**
 * Parsea un mensaje de WhatsApp y extrae datos
 * @param {string} messageText - Texto del mensaje
 * @param {Object} message - Objeto mensaje completo de Baileys
 * @returns {Object} { success, data, errors }
 */
export function parseWhatsAppMessage(messageText, message) {
  try {
    if (!messageText || typeof messageText !== 'string') {
      return {
        success: false,
        errors: ['Mensaje vacío o inválido'],
      }
    }

    const cleanText = messageText.trim()
    const timestamp = new Date(message.messageTimestamp * 1000)

    // Intentar parsear como viaje
    const tripResult = parseTripMessage(cleanText, message, timestamp)
    if (tripResult.success) {
      return tripResult
    }

    // Intentar parsear como mantenimiento
    const maintenanceResult = parseMaintenanceMessage(cleanText, message, timestamp)
    if (maintenanceResult.success) {
      return maintenanceResult
    }

    // Formato no reconocido
    return {
      success: false,
      errors: [
        'Formato no reconocido',
        'Usa: "Viaje - DD/MM - Localidad - [foto]"',
        'O: "Mantenimiento - DD/MM - Descripción - $MONTO"',
      ],
    }
  } catch (error) {
    logger.error('Error parseando mensaje:', error)
    return {
      success: false,
      errors: ['Error procesando mensaje'],
    }
  }
}

/**
 * Parsea mensaje de viaje
 * Formato: "Viaje - DD/MM - Localidad - [foto]"
 */
function parseTripMessage(messageText, message, timestamp) {
  try {
    const tripRegex = /viaje\s*-\s*(\d{1,2})\/(\d{1,2})\s*-\s*([^-]+?)\s*-?$/i

    const match = messageText.match(tripRegex)
    if (!match) {
      return { success: false }
    }

    const [, day, month, location] = match
    const year = new Date().getFullYear()

    // Validar fecha
    const date = new Date(year, parseInt(month) - 1, parseInt(day))
    if (isNaN(date.getTime())) {
      return {
        success: false,
        errors: ['Fecha inválida'],
      }
    }

    // Validar localidad
    const cleanLocation = location.trim()
    if (!cleanLocation || cleanLocation.length < 2) {
      return {
        success: false,
        errors: ['Localidad inválida'],
      }
    }

    // Extraer información de foto/media
    const hasMedia = message.message?.imageMessage || message.message?.documentMessage
    const photoInfo = hasMedia
      ? {
          hasPhoto: true,
          mediaType: message.message?.imageMessage ? 'image' : 'document',
          mediaId: message.message?.imageMessage?.fileEncSha256 || message.message?.documentMessage?.fileEncSha256,
        }
      : {
          hasPhoto: false,
        }

    logger.logWhatsApp('TRIP_PARSED', message.key.remoteJid, {
      date: date.toISOString(),
      location: cleanLocation,
      hasPhoto: photoInfo.hasPhoto,
    })

    return {
      success: true,
      data: {
        type: 'trip',
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        location: cleanLocation,
        hasPhoto: photoInfo.hasPhoto,
        mediaInfo: photoInfo,
        userJid: message.key.remoteJid,
        messageId: message.key.id,
        receivedAt: timestamp.toISOString(),
      },
    }
  } catch (error) {
    logger.error('Error parseando mensaje de viaje:', error)
    return { success: false }
  }
}

/**
 * Parsea mensaje de mantenimiento
 * Formato: "Mantenimiento - DD/MM - Descripción - $MONTO"
 */
function parseMaintenanceMessage(messageText, message, timestamp) {
  try {
    const maintenanceRegex = /mantenimiento\s*-\s*(\d{1,2})\/(\d{1,2})\s*-\s*([^-]+?)\s*-\s*\$?\s*(\d+(?:\.\d{2})?)\s*$/i

    const match = messageText.match(maintenanceRegex)
    if (!match) {
      return { success: false }
    }

    const [, day, month, description, amountStr] = match
    const year = new Date().getFullYear()

    // Validar fecha
    const date = new Date(year, parseInt(month) - 1, parseInt(day))
    if (isNaN(date.getTime())) {
      return {
        success: false,
        errors: ['Fecha inválida'],
      }
    }

    // Validar descripción
    const cleanDescription = description.trim()
    if (!cleanDescription || cleanDescription.length < 3) {
      return {
        success: false,
        errors: ['Descripción muy corta'],
      }
    }

    // Validar monto
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > 100000) {
      return {
        success: false,
        errors: ['Monto inválido (debe ser entre $1 y $100.000)'],
      }
    }

    logger.logWhatsApp('MAINTENANCE_PARSED', message.key.remoteJid, {
      date: date.toISOString(),
      description: cleanDescription,
      amount: amount,
    })

    return {
      success: true,
      data: {
        type: 'maintenance',
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        description: cleanDescription,
        amount: amount,
        currency: 'ARS',
        userJid: message.key.remoteJid,
        messageId: message.key.id,
        receivedAt: timestamp.toISOString(),
      },
    }
  } catch (error) {
    logger.error('Error parseando mensaje de mantenimiento:', error)
    return { success: false }
  }
}

/**
 * Extrae monto de un texto
 * Busca patrones como: $850, 850.00, 850 ARS
 */
export function extractAmount(text) {
  if (!text) return null

  const matches = text.match(PATTERNS.AMOUNT)
  if (!matches) return null

  const amount = parseFloat(matches[0].replace(/[$\s]/g, ''))
  return isNaN(amount) ? null : amount
}

/**
 * Extrae fecha de un texto
 * Busca patrones como: 15/01, 15/01/2026
 */
export function extractDate(text) {
  if (!text) return null

  const match = text.match(PATTERNS.DATE)
  if (!match) return null

  const [, day, month, year] = match
  const fullYear = year || new Date().getFullYear()

  const date = new Date(fullYear, parseInt(month) - 1, parseInt(day))
  return isNaN(date.getTime()) ? null : date
}

/**
 * Valida que el formato del mensaje sea correcto
 */
export function validateMessageFormat(messageText, type = 'trip') {
  const errors = []

  if (!messageText || typeof messageText !== 'string') {
    errors.push('Mensaje vacío')
    return { valid: false, errors }
  }

  if (messageText.length > 500) {
    errors.push('Mensaje demasiado largo')
  }

  if (type === 'trip') {
    if (!/viaje/i.test(messageText)) {
      errors.push('Debe comenzar con "Viaje"')
    }
    if (messageText.split('-').length < 3) {
      errors.push('Formato incompleto')
    }
  }

  if (type === 'maintenance') {
    if (!/mantenimiento/i.test(messageText)) {
      errors.push('Debe comenzar con "Mantenimiento"')
    }
    if (messageText.split('-').length < 4) {
      errors.push('Formato incompleto')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
