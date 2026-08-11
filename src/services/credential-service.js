/**
 * Gestión de credenciales de usuario (GPS + Empresa)
 */

import prisma from '../db/prisma.js'
import logger from '../utils/logger.js'
import { encrypt, decrypt } from '../utils/crypto.js'
import { DatabaseError } from '../utils/error-handler.js'

export async function saveCredentials(userId, credentials) {
  const { gpsUsername, gpsPassword, companyUsername, companyPassword } = credentials

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gpsUsername,
        gpsPasswordEncrypted: encrypt(gpsPassword),
        companyUsername,
        companyPasswordEncrypted: encrypt(companyPassword),
        credentialsStatus: 'ACTIVE',
        lastValidationSuccess: new Date(),
      },
    })

    logger.info(`[CREDENTIALS] Credenciales guardadas para el usuario ${userId}`)
  } catch (error) {
    throw new DatabaseError('No se pudieron guardar las credenciales', {
      userId,
      cause: error.message,
    })
  }
}

export async function getCredentials(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user || user.credentialsStatus !== 'ACTIVE') {
    return null
  }

  return {
    gpsUsername: user.gpsUsername,
    gpsPassword: decrypt(user.gpsPasswordEncrypted),
    companyUsername: user.companyUsername,
    companyPassword: decrypt(user.companyPasswordEncrypted),
  }
}

export async function markCredentialsAsInvalid(userId, reason) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { credentialsStatus: 'INVALID_CREDENTIALS' },
    })

    logger.warn(`[CREDENTIALS] Credenciales inválidas para el usuario ${userId}: ${reason}`)
  } catch (error) {
    throw new DatabaseError('No se pudo actualizar el estado de credenciales', {
      userId,
      cause: error.message,
    })
  }
}
