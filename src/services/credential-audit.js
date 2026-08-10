/**
 * Auditoría de uso de credenciales (GPS/FORM) para debugging
 */

import prisma from '../db/prisma.js'
import logger from '../utils/logger.js'
import { DatabaseError } from '../utils/error-handler.js'

/**
 * Registra un intento de uso de credenciales guardadas
 */
export async function logCredentialUsage(phoneNumber, service, success, errorMessage = null) {
  try {
    await prisma.credentialUsageLog.create({
      data: { phoneNumber, service, success, errorMessage },
    })

    logger.info(`[CREDENTIAL_AUDIT] ${service} - ${success ? 'OK' : 'FALLÓ'}`, { phoneNumber })
  } catch (error) {
    throw new DatabaseError('No se pudo registrar el uso de credenciales', {
      phoneNumber,
      service,
      cause: error.message,
    })
  }
}

/**
 * Últimos errores de uso de credenciales de un usuario
 */
export async function getCredentialErrors(phoneNumber, limit = 10) {
  return prisma.credentialUsageLog.findMany({
    where: { phoneNumber, success: false },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}
