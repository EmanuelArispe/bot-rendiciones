/**
 * Auditoría de uso de credenciales (GPS/FORM) para debugging
 */

import prisma from '../db/prisma.js'
import logger from '../utils/logger.js'
import { DatabaseError } from '../utils/error-handler.js'

export async function logCredentialUsage(userId, service, success, errorMessage = null) {
  try {
    await prisma.credentialUsageLog.create({
      data: { userId, service, success, errorMessage },
    })

    logger.info(`[CREDENTIAL_AUDIT] ${service} - ${success ? 'OK' : 'FALLÓ'}`, { userId })
  } catch (error) {
    throw new DatabaseError('No se pudo registrar el uso de credenciales', {
      userId,
      service,
      cause: error.message,
    })
  }
}

export async function getCredentialErrors(userId, limit = 10) {
  return prisma.credentialUsageLog.findMany({
    where: { userId, success: false },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
}
