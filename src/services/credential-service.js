/**
 * Gestión de credenciales de usuario (GPS + Empresa)
 */

import * as userRepository from '../db/user-repository.js'
import logger from '../utils/logger.js'
import { encrypt, decrypt } from '../utils/crypto.js'
import { DatabaseError } from '../utils/error-handler.js'

export async function saveGpsCredentials(userId, { gpsUsername, gpsPassword }) {
  try {
    await userRepository.update(userId, {
      gpsUsername,
      gpsPasswordEncrypted: encrypt(gpsPassword),
      gpsCredentialsStatus: 'ACTIVE',
      gpsLastValidationSuccess: new Date(),
    })

    logger.info(`[CREDENTIALS] GPS guardado para el usuario ${userId}`)
  } catch (error) {
    throw new DatabaseError('No se pudieron guardar las credenciales de GPS', {
      userId,
      cause: error.message,
    })
  }
}

export async function saveCompanyCredentials(userId, { companyUsername, companyPassword }) {
  try {
    await userRepository.update(userId, {
      companyUsername,
      companyPasswordEncrypted: encrypt(companyPassword),
      companyCredentialsStatus: 'ACTIVE',
      companyLastValidationSuccess: new Date(),
    })

    logger.info(`[CREDENTIALS] Empresa guardado para el usuario ${userId}`)
  } catch (error) {
    throw new DatabaseError('No se pudieron guardar las credenciales de la empresa', {
      userId,
      cause: error.message,
    })
  }
}

export async function markGpsCredentialsAsInvalid(userId, reason) {
  try {
    await userRepository.update(userId, { gpsCredentialsStatus: 'INVALID_CREDENTIALS' })
    logger.warn(`[CREDENTIALS] GPS inválido para el usuario ${userId}: ${reason}`)
  } catch (error) {
    throw new DatabaseError('No se pudo actualizar el estado de credenciales de GPS', {
      userId,
      cause: error.message,
    })
  }
}

export async function markCompanyCredentialsAsInvalid(userId, reason) {
  try {
    await userRepository.update(userId, { companyCredentialsStatus: 'INVALID_CREDENTIALS' })
    logger.warn(`[CREDENTIALS] Empresa inválido para el usuario ${userId}: ${reason}`)
  } catch (error) {
    throw new DatabaseError('No se pudo actualizar el estado de credenciales de la empresa', {
      userId,
      cause: error.message,
    })
  }
}

export async function getGpsCredentials(userId) {
  const user = await userRepository.findById(userId)

  if (!user || user.gpsCredentialsStatus !== 'ACTIVE') {
    return null
  }

  return { gpsUsername: user.gpsUsername, gpsPassword: decrypt(user.gpsPasswordEncrypted) }
}

export async function getCompanyCredentials(userId) {
  const user = await userRepository.findById(userId)

  if (!user || user.companyCredentialsStatus !== 'ACTIVE') {
    return null
  }

  return { companyUsername: user.companyUsername, companyPassword: decrypt(user.companyPasswordEncrypted) }
}
