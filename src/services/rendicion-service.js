import * as rendicionRepository from '../db/rendicion-repository.js'
import logger from '../utils/logger.js'
import { ValidationError, DatabaseError } from '../utils/error-handler.js'
import { isValidProvinceCode, getProvinceName } from '../config/company-locations.js'

export async function createRendicion(
  user,
  { travelDateFrom, travelDateTo, destinationProvinceCode, destinationCity, details }
) {
  const parsedFrom = new Date(travelDateFrom)
  const parsedTo = new Date(travelDateTo)

  if (Number.isNaN(parsedFrom.getTime()) || Number.isNaN(parsedTo.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (parsedFrom > parsedTo) {
    throw new ValidationError('La fecha desde no puede ser posterior a la fecha hasta')
  }

  if (!user.originProvinceCode || !user.originCity) {
    throw new ValidationError('Tu usuario todavía no tiene un origen configurado')
  }

  if (!isValidProvinceCode(destinationProvinceCode)) {
    throw new ValidationError('Provincia de destino inválida')
  }

  if (!destinationCity?.trim()) {
    throw new ValidationError('La ciudad de destino es obligatoria')
  }

  try {
    const rendicion = await rendicionRepository.create({
      userId: user.id,
      travelDateFrom: parsedFrom,
      travelDateTo: parsedTo,
      originProvinceCode: user.originProvinceCode,
      originProvince: user.originProvince,
      originCity: user.originCity,
      destinationProvinceCode,
      destinationProvince: getProvinceName(destinationProvinceCode),
      destinationCity: destinationCity.trim(),
      details: details?.trim() || null,
      status: 'PENDING',
    })

    logger.info(`[RENDICION] Creada para el usuario ${user.id}`, { rendicionId: rendicion.id })

    return rendicion
  } catch (error) {
    throw new DatabaseError('No se pudo guardar la rendición', {
      userId: user.id,
      cause: error.message,
    })
  }
}

export function getRendicionesByUser(userId, limit) {
  return rendicionRepository.findByUserId(userId, limit)
}
