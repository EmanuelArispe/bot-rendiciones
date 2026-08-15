import * as rendicionRepository from '../db/rendicion-repository.js'
import logger from '../utils/logger.js'
import { ValidationError, DatabaseError } from '../utils/error-handler.js'

export async function createRendicion(userId, { travelDate, origin, destination, details }) {
  const parsedDate = new Date(travelDate)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (!origin?.trim()) {
    throw new ValidationError('El origen es obligatorio')
  }

  if (!destination?.trim()) {
    throw new ValidationError('El destino es obligatorio')
  }

  try {
    const rendicion = await rendicionRepository.create({
      userId,
      travelDate: parsedDate,
      origin: origin.trim(),
      destination: destination.trim(),
      details: details?.trim() || null,
      status: 'PENDING',
    })

    logger.info(`[RENDICION] Creada para el usuario ${userId}`, { rendicionId: rendicion.id })

    return rendicion
  } catch (error) {
    throw new DatabaseError('No se pudo guardar la rendición', {
      userId,
      cause: error.message,
    })
  }
}

export function getRendicionesByUser(userId, limit) {
  return rendicionRepository.findByUserId(userId, limit)
}
