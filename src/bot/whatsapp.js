/**
 * Bot de WhatsApp usando Baileys
 * Escucha mensajes y dispara procesamiento de rendiciones
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  isJidBroadcast,
} from 'baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { parseWhatsAppMessage } from './message-parser.js'
import { handleWhatsAppError, logAppError } from '../utils/error-handler.js'
import { MESSAGES } from '../config/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Estado global del bot
let sock = null
let isConnected = false

/**
 * Inicializa bot Baileys
 */
export async function initializeWhatsAppBot() {
  try {
    const sessionsDir = path.join(process.cwd(), process.env.SESSIONS_DIR || 'sessions')

    logger.info('🔐 Autenticando con WhatsApp...')

    // Cargar autenticación
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir)

    // Crear socket
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: process.env.DEBUG === 'true' ? 'debug' : 'error' }),
      shouldIgnoreJid: (jid) => isJidBroadcast(jid),
      browser: ['Bot Rendiciones', 'Chrome', '120.0'],
      version: [2, 2407, 4],
    })

    // Guardar credenciales después de cada cambio
    sock.ev.on('creds.update', saveCreds)

    // Manejo de conexión
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        logger.info('📱 Escanea el código QR en tu terminal para conectar WhatsApp')
      }

      if (connection === 'connecting') {
        logger.info('⏳ Conectando a WhatsApp...')
      }

      if (connection === 'open') {
        isConnected = true
        logger.info('✅ Bot conectado a WhatsApp exitosamente!')
        logger.info(`📱 ID: ${sock.user.id}`)
      }

      if (connection === 'close') {
        isConnected = false

        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          // Reconectar automáticamente
          logger.warn('⚠️ Conexión perdida, reintentando...')
          setTimeout(initializeWhatsAppBot, 3000)
        } else {
          logger.error('❌ Sesión cerrada. Por favor, escanea el QR nuevamente.')
        }
      }
    })

    // Escuchar mensajes
    sock.ev.on('messages.upsert', handleNewMessages)

    // Manejo de errores
    sock.ev.on('error', (error) => {
      logger.error('❌ Error en socket:', error)
    })

    logger.info('🤖 Bot de WhatsApp inicializado correctamente')
  } catch (error) {
    const appError = handleWhatsAppError(error)
    logAppError(appError)
    throw appError
  }
}

/**
 * Maneja nuevos mensajes
 */
async function handleNewMessages({ messages, type }) {
  try {
    if (type !== 'notify') return

    for (const message of messages) {
      // Ignorar si no tiene contenido
      if (!message.message) continue

      // Ignorar transmisiones
      if (message.key.remoteJid === 'status@broadcast') continue

      // Ignorar si es del bot
      if (message.key.fromMe) continue

      logger.logWhatsApp('NEW_MESSAGE', message.key.remoteJid, {
        type: message.message.conversation ? 'text' : 'media',
      })

      // Procesar mensaje
      await processMessage(message)
    }
  } catch (error) {
    logger.error('Error procesando mensajes:', error)
  }
}

/**
 * Procesa un mensaje individual
 */
async function processMessage(message) {
  try {
    const from = message.key.remoteJid
    const messageId = message.key.id
    const timestamp = message.messageTimestamp

    // Extraer texto del mensaje
    let messageText = ''
    if (message.message?.conversation) {
      messageText = message.message.conversation
    } else if (message.message?.extendedTextMessage?.text) {
      messageText = message.message.extendedTextMessage.text
    }

    logger.debug(`Mensaje recibido: "${messageText}"`)

    // Comando: "help" o "ayuda"
    if (/^(help|ayuda|\?)$/i.test(messageText)) {
      await sendHelp(from)
      return
    }

    // Comando: "status" o "estado"
    if (/^(status|estado)$/i.test(messageText)) {
      await sendStatus(from)
      return
    }

    // Parsear mensaje de rendición
    const parsedMessage = parseWhatsAppMessage(messageText, message)

    if (parsedMessage.success) {
      logger.info('✅ Mensaje parseado correctamente', parsedMessage.data)

      // Enviar confirmación de recepción
      await sendMessage(
        from,
        MESSAGES.SUCCESS.PROCESSING
      )

      // TODO: Aquí irá la lógica de procesamiento de rendición
      // - Extraer KMs del GPS
      // - OCR de factura
      // - Cargar en formulario empresa
      // - Guardar en BD
      // - Enviar confirmación

      logger.info('⏳ Procesamiento de rendición pendiente de implementar')
    } else {
      // Mensaje inválido
      logger.warn('❌ Formato de mensaje inválido', {
        message: messageText,
        errors: parsedMessage.errors,
      })

      await sendMessage(from, MESSAGES.ERROR.INVALID_FORMAT)
    }
  } catch (error) {
    logger.error('Error procesando mensaje individual:', error)
    const from = message.key.remoteJid
    await sendMessage(from, MESSAGES.ERROR.GENERIC)
  }
}

/**
 * Envía un mensaje de texto
 */
export async function sendMessage(to, text) {
  try {
    if (!sock || !isConnected) {
      throw new Error('Bot no está conectado')
    }

    await sock.sendMessage(to, { text })
    logger.debug(`Mensaje enviado a ${to}: ${text}`)
  } catch (error) {
    const appError = handleWhatsAppError(error, { to, text })
    logAppError(appError)
  }
}

/**
 * Envía mensaje de ayuda
 */
async function sendHelp(from) {
  const helpText = `🤖 *Bot de Rendición de Viaticos*

*Cómo usarme:*

1️⃣ *Rendir un viaje:*
   Viaje - DD/MM - Localidad - [foto factura]
   
   Ejemplo:
   Viaje - 15/01 - Tandil - [foto]

2️⃣ *Rendir mantenimiento:*
   Mantenimiento - DD/MM - Descripción - $MONTO
   
   Ejemplo:
   Mantenimiento - 10/01 - Cambio aceite - $500

*Comandos:*
- help / ayuda - Ver esta ayuda
- status / estado - Ver estado actual
- ver rendiciones - Ver historial

*¿Dudas?* 
Escribí "status" para ver estado actual.`

  await sendMessage(from, helpText)
}

/**
 * Envía estado del bot
 */
async function sendStatus(from) {
  const statusText = `✅ *Estado del Bot*

Estado: ${isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
Sesión: ${sock?.user?.name || 'No inicializada'}

Estoy listo para procesar tus rendiciones. 
¿Necesitas ayuda? Escribe "help"`

  await sendMessage(from, statusText)
}

/**
 * Obtiene el estado de conexión
 */
export function isWhatsAppConnected() {
  return isConnected && sock !== null
}

/**
 * Obtiene datos del usuario
 */
export function getBotUser() {
  return sock?.user || null
}

/**
 * Desconecta el bot
 */
export async function disconnectBot() {
  try {
    if (sock) {
      await sock.logout()
      sock = null
      isConnected = false
      logger.info('✅ Bot desconectado correctamente')
    }
  } catch (error) {
    logger.error('Error desconectando bot:', error)
  }
}
