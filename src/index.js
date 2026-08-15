/**
 * Bot de Rendición de Viaticos
 * Entry Point - Inicializa la aplicación
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import logger from './utils/logger.js'
import { loadEnv, validateEnv } from './config/env.js'
import { startServer } from './api/server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: resolve(__dirname, '../env/.env') })

async function main() {
  try {
    logger.info('🚀 Iniciando app de Rendición de Viaticos...')

    loadEnv()
    validateEnv()

    await startServer(process.env.PORT || 3000)

    logger.info('✅ App iniciada exitosamente')
  } catch (error) {
    logger.error('❌ Error al iniciar la aplicación:', error)
    process.exit(1)
  }
}

process.on('SIGINT', () => {
  logger.info('📴 Apagando app...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('📴 Apagando app...')
  process.exit(0)
})

main()
