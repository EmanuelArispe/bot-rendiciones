/**
 * Auditoría de uso de credenciales (GPS/FORM) para debugging
 */

import * as credentialUsageRepository from '../db/credential-usage-repository.js'
import logger from '../utils/logger.js'
import { DatabaseError } from '../utils/error-handler.js'

export async function logCredentialUsage(userId, service, success, errorMessage = null) {
  try {
    await credentialUsageRepository.create({ userId, service, success, errorMessage })

    logger.info(`[CREDENTIAL_AUDIT] ${service} - ${success ? 'OK' : 'FALLÓ'}`, { userId })
  } catch (error) {
    throw new DatabaseError('No se pudo registrar el uso de credenciales', {
      userId,
      service,
      cause: error.message,
    })
  }
}

export function getCredentialErrors(userId, limit = 10) {
  return credentialUsageRepository.findFailuresByUserId(userId, limit)
}
