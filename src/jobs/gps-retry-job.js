/**
 * Reintenta completar el kilometraje de rendiciones que quedaron sin GPS
 * (ver rendicion-service.js#enrichWithKilometers: es best-effort y no
 * bloquea la creación de la rendición). Corre en background, secuencial
 * -nunca dos scrapes en paralelo- para no levantar varios Chromium a la vez.
 */

import * as rendicionRepository from '../db/rendicion-repository.js'
import { enrichWithKilometers } from '../services/rendicion-service.js'
import logger from '../utils/logger.js'

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000
const DEFAULT_MAX_RETRIES = 5

async function runOnce(maxRetries) {
  const pending = await rendicionRepository.findPendingWithoutKilometers(maxRetries)

  if (pending.length === 0) {
    return
  }

  logger.info(`[GPS_RETRY_JOB] Reintentando kilometraje de ${pending.length} rendición(es)`)

  for (const rendicion of pending) {
    try {
      await enrichWithKilometers(rendicion.user, rendicion)
    } catch (error) {
      logger.error('[GPS_RETRY_JOB] Error inesperado reintentando una rendición', {
        rendicionId: rendicion.id,
        error: error.message,
      })
    }
  }
}

export function startGpsRetryJob() {
  const intervalMs = parseInt(process.env.GPS_RETRY_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10)
  const maxRetries = parseInt(process.env.GPS_MAX_RETRIES || String(DEFAULT_MAX_RETRIES), 10)

  const timer = setInterval(() => {
    runOnce(maxRetries).catch((error) => {
      logger.error('[GPS_RETRY_JOB] Error corriendo el job', { error: error.message })
    })
  }, intervalMs)

  // No debe mantener vivo el proceso por sí solo (el shutdown ya lo maneja SIGINT/SIGTERM)
  timer.unref()

  logger.info(`[GPS_RETRY_JOB] Iniciado (cada ${intervalMs}ms, máximo ${maxRetries} reintentos por rendición)`)

  return timer
}
