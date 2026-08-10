/**
 * Bot de Rendición de Viaticos
 * Entry Point - Inicializa la aplicación
 * 
 * Flujo:
 * 1. Carga variables de entorno
 * 2. Inicializa logger
 * 3. Inicializa bot Baileys
 * 4. Escucha mensajes de WhatsApp
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import logger from './utils/logger.js'
import { loadEnv } from './config/env.js'
import { initializeWhatsAppBot } from './bot/whatsapp.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: resolve(__dirname, '../env/.env') })

/**
 * Inicializa la aplicación
 */
async function main() {
  try {
    logger.info('🚀 Iniciando Bot de Rendición de Viaticos...')

    // 1. Cargar variables de entorno
    logger.debug('📋 Cargando variables de entorno...')
    loadEnv()
    logger.info('✅ Variables de entorno cargadas')

    // 2. Verificar configuración crítica
    if (!process.env.DATABASE_URL) {
      throw new Error('❌ DATABASE_URL no está configurada en .env')
    }

    if (!process.env.BAILEYS_SESSION_ID) {
      throw new Error('❌ BAILEYS_SESSION_ID no está configurada en .env')
    }

    logger.info('✅ Configuración validada')

    // 3. Inicializar bot Baileys
    logger.info('🤖 Inicializando bot de WhatsApp...')
    await initializeWhatsAppBot()

    logger.info('✅ Bot iniciado exitosamente')
    logger.info('⏳ Esperando mensajes de WhatsApp...')

  } catch (error) {
    logger.error('❌ Error al iniciar la aplicación:', error)
    process.exit(1)
  }
}

// Manejar señales de termination
process.on('SIGINT', () => {
  logger.info('📴 Apagando bot...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('📴 Apagando bot...')
  process.exit(0)
})

// Iniciar
main()
