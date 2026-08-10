/**
 * Puente entre el bot de WhatsApp y el servicio de credenciales
 */

import logger from '../utils/logger.js'
import {
  generateSetupToken,
  getCredentials,
  markCredentialsAsInvalid,
} from '../services/credential-service.js'
import { logCredentialUsage } from '../services/credential-audit.js'
import { sendMessage } from './whatsapp.js'
import { formatErrorForUser } from '../utils/error-handler.js'

function normalizePhoneNumber(jidOrNumber) {
  return jidOrNumber.split('@')[0]
}

/**
 * Comando "setup-credentials": genera el link de configuración
 */
export async function handleSetupCredentialsCommand(message) {
  const phoneNumber = normalizePhoneNumber(message.from)

  try {
    const { url, expiresAt } = await generateSetupToken(phoneNumber)
    const minutes = Math.round((expiresAt - new Date()) / 60000)

    await message.reply(
      `🔐 *Configurá tus credenciales*\n\n` +
        `Completá el formulario acá:\n${url}\n\n` +
        `⏱️ El link expira en ${minutes} minutos.`
    )
  } catch (error) {
    logger.error('Error generando token de setup', error)
    await message.reply(formatErrorForUser(error))
  }
}

/**
 * Credenciales listas para usar (desencriptadas) por GPS Scraper / Form Automation
 * Devuelve null si el usuario no tiene credenciales activas
 */
export async function getCredentialsForBot(phoneNumber) {
  return getCredentials(normalizePhoneNumber(phoneNumber))
}

/**
 * Se llama cuando GPS/Form fallan al USAR credenciales guardadas (no en el setup)
 * Registra el error, marca las credenciales como inválidas y avisa al usuario
 */
export async function handleCredentialFailure(phoneNumber, service, errorMessage) {
  const cleanPhone = normalizePhoneNumber(phoneNumber)

  await logCredentialUsage(cleanPhone, service, false, errorMessage)
  await markCredentialsAsInvalid(cleanPhone, errorMessage)

  await sendMessage(
    `${cleanPhone}@c.us`,
    `⚠️ Tus credenciales no funcionan\n\n` +
      `Posible causa: cambiaste la contraseña, la cuenta está bloqueada, o hay un problema temporal.\n\n` +
      `Actualizalas escribiendo: setup-credentials`
  )
}
