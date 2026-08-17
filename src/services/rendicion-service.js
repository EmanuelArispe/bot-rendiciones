import * as rendicionRepository from '../db/rendicion-repository.js'
import logger from '../utils/logger.js'
import { ValidationError, DatabaseError } from '../utils/error-handler.js'
import { isValidProvinceCode, getProvinceName } from '../config/company-locations.js'
import { getGpsCredentials, markGpsCredentialsAsInvalid } from './credential-service.js'
import { logCredentialUsage } from './credential-audit.js'
import { getKilometers } from '../automation/gps-scraper.js'

function validateLocation(provinceCode, city, label) {
  if (!isValidProvinceCode(provinceCode)) {
    throw new ValidationError(`Provincia de ${label} inválida`)
  }

  if (!city?.trim()) {
    throw new ValidationError(`La ciudad de ${label} es obligatoria`)
  }
}

/**
 * Intenta completar los km de la rendición contra el GPS. Best-effort: nunca
 * tira, si algo falla la rendición queda igual que antes (pendiente)
 */
async function enrichWithKilometers(user, rendicion) {
  try {
    if (!user.vehicleId) {
      logger.info(`[RENDICION] Usuario ${user.id} sin vehículo configurado, se omite el GPS`, {
        rendicionId: rendicion.id,
      })
      return rendicion
    }

    const credentials = await getGpsCredentials(user.id)

    if (!credentials) {
      logger.info(`[RENDICION] Usuario ${user.id} sin credenciales GPS activas, se omite el GPS`, {
        rendicionId: rendicion.id,
      })
      return rendicion
    }

    const kilometers = await getKilometers({
      gpsUsername: credentials.gpsUsername,
      gpsPassword: credentials.gpsPassword,
      vehicleId: user.vehicleId,
      dateFrom: rendicion.travelDateFrom,
      dateTo: rendicion.travelDateTo,
    })

    await logCredentialUsage(user.id, 'GPS', true)

    const updated = await rendicionRepository.update(rendicion.id, {
      kilometers,
      gpsRetrievedAt: new Date(),
    })

    logger.info(`[RENDICION] Kilometraje completado desde el GPS`, { rendicionId: rendicion.id, kilometers })

    return updated
  } catch (error) {
    logger.error(`[RENDICION] No se pudo obtener el kilometraje del GPS`, {
      userId: user.id,
      rendicionId: rendicion.id,
      error: error.message,
    })

    try {
      await logCredentialUsage(user.id, 'GPS', false, error.message)

      if (error.message?.includes('incorrectos')) {
        await markGpsCredentialsAsInvalid(user.id, error.message)
      }
    } catch (auditError) {
      logger.error('[RENDICION] Falló el registro de auditoría de GPS', { error: auditError.message })
    }

    return rendicion
  }
}

export async function createRendicion(
  user,
  {
    travelDateFrom,
    travelDateTo,
    originProvinceCode,
    originCity,
    destinationProvinceCode,
    destinationCity,
    details,
  }
) {
  const parsedFrom = new Date(travelDateFrom)
  const parsedTo = new Date(travelDateTo)

  if (Number.isNaN(parsedFrom.getTime()) || Number.isNaN(parsedTo.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (parsedFrom > parsedTo) {
    throw new ValidationError('La fecha desde no puede ser posterior a la fecha hasta')
  }

  validateLocation(originProvinceCode, originCity, 'origen')
  validateLocation(destinationProvinceCode, destinationCity, 'destino')

  try {
    const rendicion = await rendicionRepository.create({
      userId: user.id,
      travelDateFrom: parsedFrom,
      travelDateTo: parsedTo,
      originProvinceCode,
      originProvince: getProvinceName(originProvinceCode),
      originCity: originCity.trim(),
      destinationProvinceCode,
      destinationProvince: getProvinceName(destinationProvinceCode),
      destinationCity: destinationCity.trim(),
      details: details?.trim() || null,
      status: 'PENDING',
    })

    logger.info(`[RENDICION] Creada para el usuario ${user.id}`, { rendicionId: rendicion.id })

    return await enrichWithKilometers(user, rendicion)
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
