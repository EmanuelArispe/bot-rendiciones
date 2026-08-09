/**
 * Bot de WhatsApp usando whatsapp-web.js
 * Escucha mensajes y dispara procesamiento de rendiciones
 */

import pkg from 'whatsapp-web.js'
const { Client, LocalAuth, MessageMedia } = pkg
import qrcode from 'qrcode'
import QrcodeTerminal from 'qrcode-terminal'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { parseWhatsAppMessage } from './message-parser.js'
import { handleWhatsAppError, logAppError } from '../utils/error-handler.js'
import { MESSAGES } from '../config/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Estado global del bot
let client = null
let isConnected = false

/**
 * Inicializa bot con whatsapp-web.js
 */
export async function initializeWhatsAppBot() {
  try {
    const sessionsDir = path.join(process.cwd(), process.env.SESSIONS_DIR || 'sessions')

    logger.info('🔐 Inicializando WhatsApp Web Bot...')

    // Crear cliente
    client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'bot-rendiciones',
        dataPath: sessionsDir,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    })

    // Evento: QR necesario
    client.on('qr', (qr) => {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      logger.info('📱 NUEVO QR CODE - Escanea con WhatsApp')
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Mostrar en terminal
      try {
        QrcodeTerminal.generate(qr, { small: true })
      } catch (e) {
        logger.debug('Error mostrando QR en terminal:', e.message)
      }

      // Guardar QR en archivo
      try {
        qrcode.toFile(
          path.join(process.cwd(), 'qr.png'),
          qr,
          { width: 300 },
          (err) => {
            if (!err) {
              logger.info('📄 QR guardado en: qr.png')
            }
          }
        )
      } catch (e) {
        logger.debug('Error guardando QR a archivo:', e.message)
      }

      logger.info('⏳ Esperando que escanees el código con tu teléfono...')
      logger.info('⏱️ Tienes 60 segundos antes de que expire')
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    })

    // Evento: Cliente listo
    client.on('ready', () => {
      isConnected = true
      logger.info('✅ ¡Bot conectado exitosamente a WhatsApp!')
      logger.info(`📱 Número: ${client.info.wid.user}`)
      logger.info(`👤 Nombre: ${client.info.pushname}`)
      logger.info('🤖 Bot listo para recibir mensajes')
      logger.info('⏳ Escuchando nuevos mensajes...\n')
    })

    // Evento: Nuevo mensaje
    client.on('message', async (message) => {
      try {
        await handleNewMessage(message)
      } catch (error) {
        logger.error('Error procesando mensaje:', error)
      }
    })

    // Evento: Mensaje de autenticación
    client.on('authenticated', () => {
      logger.info('✅ Autenticación completada')
    })

    // Evento: Autenticación fallida
    client.on('auth_failure', (msg) => {
      logger.error('❌ Fallo de autenticación:', msg)
      isConnected = false
    })

    // Evento: Desconexión
    client.on('disconnected', (reason) => {
      isConnected = false
      logger.warn(`⚠️ Bot desconectado: ${reason}`)
      logger.info('📝 Reconectando en 10 segundos...')

      // Reintentar conexión
      setTimeout(() => {
        logger.info('🔄 Reintentando conexión...')
        client.initialize()
      }, 10000)
    })

    // Evento: Error
    client.on('error', (error) => {
      logger.error('❌ Error en cliente:', error)
    })

    // Iniciar cliente
    logger.info('🔄 Iniciando cliente de WhatsApp...')
    await client.initialize()

    logger.info('✅ Bot de WhatsApp inicializado correctamente')
  } catch (error) {
    const appError = handleWhatsAppError(error)
    logAppError(appError)
    throw appError
  }
}

/**
 * Maneja un nuevo mensaje
 */
async function handleNewMessage(message) {
  try {
    // Ignorar mensajes del grupo (por ahora)
    if (message.from.includes('@g.us')) {
      logger.debug('Ignorando mensaje de grupo')
      return
    }

    // Ignorar si es del bot
    if (message.fromMe) {
      logger.debug('Ignorando mensaje propio')
      return
    }

    const from = message.from
    const phoneNumber = from.split('@')[0]

    logger.logWhatsApp('NEW_MESSAGE', phoneNumber, {
      type: message.type,
      hasMedia: message.hasMedia,
      text: message.body.substring(0, 50),
    })

    // Comando: help
    if (/^(help|ayuda|\?)$/i.test(message.body)) {
      await sendHelp(message)
      return
    }

    // Comando: status
    if (/^(status|estado)$/i.test(message.body)) {
      await sendStatus(message)
      return
    }

    // Parsear mensaje de rendición
    const messageObj = {
      key: { remoteJid: from, id: message.id, fromMe: false },
      message: { conversation: message.body },
      messageTimestamp: Math.floor(Date.now() / 1000),
    }

    const parsedMessage = parseWhatsAppMessage(message.body, messageObj)

    if (parsedMessage.success) {
      logger.info('✅ Mensaje parseado correctamente', parsedMessage.data)

      // Enviar confirmación
      await sendMessage(message, MESSAGES.SUCCESS.PROCESSING)

      // TODO: Aquí irá la lógica de procesamiento
      // - Extraer KMs del GPS
      // - OCR de factura
      // - Cargar en formulario empresa
      // - Guardar en BD

      logger.info('⏳ Procesamiento de rendición pendiente de implementar')
    } else {
      logger.warn('❌ Formato inválido', {
        message: message.body,
        errors: parsedMessage.errors,
      })

      await sendMessage(message, MESSAGES.ERROR.INVALID_FORMAT)
    }
  } catch (error) {
    logger.error('Error procesando mensaje:', error)
    await sendMessage(message, MESSAGES.ERROR.GENERIC)
  }
}

/**
 * Envía un mensaje de texto
 */
export async function sendMessage(messageOrTo, text) {
  try {
    if (!client || !isConnected) {
      throw new Error('Bot no está conectado')
    }

    let to = messageOrTo
    if (messageOrTo.from) {
      to = messageOrTo.from
    }

    await client.sendMessage(to, text)
    logger.debug(`Mensaje enviado a ${to}`)
  } catch (error) {
    const appError = handleWhatsAppError(error, { to: messageOrTo })
    logAppError(appError)
  }
}

/**
 * Envía mensaje de ayuda
 */
async function sendHelp(message) {
  const helpText = `🤖 *Bot de Rendición de Viaticos*

*¿Cómo usarme?*

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

*¿Dudas?* 
Escribí "status" para ver estado actual.`

  await sendMessage(message, helpText)
}

/**
 * Envía estado del bot
 */
async function sendStatus(message) {
  const statusText = `✅ *Estado del Bot*

Estado: ${isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
Sesión: ${client?.info?.wid?.user || 'No inicializada'}

Estoy listo para procesar tus rendiciones.
¿Necesitas ayuda? Escribe "help"`

  await sendMessage(message, statusText)
}

/**
 * Obtiene el estado de conexión
 */
export function isWhatsAppConnected() {
  return isConnected && client !== null
}

/**
 * Obtiene datos del usuario del bot
 */
export function getBotUser() {
  return client?.info?.wid || null
}

/**
 * Desconecta el bot
 */
export async function disconnectBot() {
  try {
    if (client) {
      await client.logout()
      await client.destroy()
      client = null
      isConnected = false
      logger.info('✅ Bot desconectado correctamente')
    }
  } catch (error) {
    logger.error('Error desconectando bot:', error)
  }
}
