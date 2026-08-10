/**
 * Gestión de credenciales de usuario (GPS + Empresa)
 * Setup vía token de un solo uso, guardado cifrado (AES-256-GCM)
 */

import crypto from 'crypto'
import prisma from '../db/prisma.js'
import logger from '../utils/logger.js'
import { encrypt, decrypt } from '../utils/crypto.js'
import { DatabaseError, ValidationError } from '../utils/error-handler.js'
import { getConfig } from '../config/env.js'

const SETUP_TOKEN_TTL_MS = 15 * 60 * 1000

/**
 * Genera un token de configuración válido por 15 minutos
 */
export async function generateSetupToken(phoneNumber) {
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const setupTokenExpiresAt = new Date(Date.now() + SETUP_TOKEN_TTL_MS)

    await prisma.whatsappSession.upsert({
      where: { phoneNumber },
      update: {
        setupToken: token,
        setupTokenExpiresAt,
        credentialsStatus: 'SETUP_PENDING',
      },
      create: {
        phoneNumber,
        setupToken: token,
        setupTokenExpiresAt,
        credentialsStatus: 'SETUP_PENDING',
      },
    })

    const url = `${getConfig('app.url')}/setup?token=${token}`

    logger.info(`[CREDENTIALS] Token de setup generado para ${phoneNumber}`)

    return { token, url, expiresAt: setupTokenExpiresAt }
  } catch (error) {
    throw new DatabaseError('No se pudo generar el token de configuración', {
      phoneNumber,
      cause: error.message,
    })
  }
}

/**
 * Valida que un token exista y no haya expirado
 */
export async function validateSetupToken(token) {
  const session = await prisma.whatsappSession.findUnique({ where: { setupToken: token } })

  if (!session) {
    throw new ValidationError('Token inválido o inexistente')
  }

  if (!session.setupTokenExpiresAt || session.setupTokenExpiresAt < new Date()) {
    throw new ValidationError('El token expiró, generá uno nuevo escribiendo "setup-credentials"')
  }

  return session
}

/**
 * Guarda las credenciales ya validadas contra las APIs reales
 */
export async function saveCredentials(phoneNumber, credentials) {
  const { gpsUsername, gpsPassword, companyUsername, companyPassword } = credentials

  try {
    await prisma.whatsappSession.update({
      where: { phoneNumber },
      data: {
        gpsUsername,
        gpsPasswordEncrypted: encrypt(gpsPassword),
        companyUsername,
        companyPasswordEncrypted: encrypt(companyPassword),
        credentialsStatus: 'ACTIVE',
        lastValidationSuccess: new Date(),
        setupToken: null,
        setupTokenExpiresAt: null,
      },
    })

    logger.info(`[CREDENTIALS] Credenciales guardadas para ${phoneNumber}`)
  } catch (error) {
    throw new DatabaseError('No se pudieron guardar las credenciales', {
      phoneNumber,
      cause: error.message,
    })
  }
}

/**
 * Obtiene las credenciales desencriptadas para uso del bot (GPS/Form)
 * Devuelve null si no hay credenciales activas
 */
export async function getCredentials(phoneNumber) {
  const session = await prisma.whatsappSession.findUnique({ where: { phoneNumber } })

  if (!session || session.credentialsStatus !== 'ACTIVE') {
    return null
  }

  return {
    gpsUsername: session.gpsUsername,
    gpsPassword: decrypt(session.gpsPasswordEncrypted),
    companyUsername: session.companyUsername,
    companyPassword: decrypt(session.companyPasswordEncrypted),
  }
}

/**
 * Marca las credenciales como inválidas tras un fallo de uso real (no de setup)
 */
export async function markCredentialsAsInvalid(phoneNumber, reason) {
  try {
    await prisma.whatsappSession.update({
      where: { phoneNumber },
      data: { credentialsStatus: 'INVALID_CREDENTIALS' },
    })

    logger.warn(`[CREDENTIALS] Credenciales inválidas para ${phoneNumber}: ${reason}`)
  } catch (error) {
    throw new DatabaseError('No se pudo actualizar el estado de credenciales', {
      phoneNumber,
      cause: error.message,
    })
  }
}
