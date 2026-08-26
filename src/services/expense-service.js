import * as expenseRepository from '../db/expense-repository.js'
import logger from '../utils/logger.js'
import { ValidationError, DatabaseError } from '../utils/error-handler.js'
import { PAYMENT_METHODS, EXPENSE_TYPES } from '../config/constants.js'
import { extractAmountFromReceipt } from '../ocr/invoice-parser.js'

// Tipos que tiene sentido rendir como gasto de un viaje. MANTENIMIENTO tiene
// su propio flujo (createMantenimientoExpense), no está atado a una rendición.
const TRIP_EXPENSE_TYPES = new Set([
  EXPENSE_TYPES.COMBUSTIBLE,
  EXPENSE_TYPES.PEAJE,
  EXPENSE_TYPES.ESTACIONAMIENTO,
  EXPENSE_TYPES.HOTELERIA,
  EXPENSE_TYPES.COMIDA,
  EXPENSE_TYPES.OTROS,
])

/**
 * Si el usuario tipeó un monto, se usa ese (nunca se pisa con OCR). Si lo dejó
 * vacío, se intenta leer de la factura subida; si el OCR falla o da baja
 * confianza, se le pide al usuario que lo cargue a mano en vez de adivinar.
 */
async function resolveAmount({ manualAmount, receipt }) {
  const parsedManual = manualAmount != null && manualAmount !== '' ? Number(manualAmount) : null

  if (parsedManual != null) {
    if (!Number.isFinite(parsedManual) || parsedManual <= 0) {
      throw new ValidationError('El monto tiene que ser un número mayor a cero')
    }

    return { amount: parsedManual, ocrExtractedAmount: null, ocrConfidence: null }
  }

  if (!receipt) {
    throw new ValidationError('Ingresá el monto o subí la factura para detectarlo automáticamente')
  }

  let result
  try {
    result = await extractAmountFromReceipt(receipt.path, receipt.mimetype)
  } catch (error) {
    logger.error('[EXPENSE] Error corriendo OCR sobre la factura', { error: error.message })
    throw new ValidationError('No pudimos leer la factura. Ingresá el monto manualmente.')
  }

  const minConfidence = parseFloat(process.env.OCR_MIN_CONFIDENCE || '0.75')

  if (result.amount == null || result.confidence < minConfidence) {
    logger.warn('[EXPENSE] OCR con confianza insuficiente', {
      amount: result.amount,
      confidence: result.confidence,
      source: result.source,
    })
    throw new ValidationError('No pudimos detectar el monto de la factura automáticamente. Ingresalo manualmente.')
  }

  logger.info('[EXPENSE] Monto detectado por OCR', {
    amount: result.amount,
    confidence: result.confidence,
    source: result.source,
  })

  return { amount: result.amount, ocrExtractedAmount: result.amount, ocrConfidence: result.confidence }
}

export async function createMantenimientoExpense(user, { date, description, amount, paymentMethod, receipt }) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (!description?.trim()) {
    throw new ValidationError('La descripción es obligatoria')
  }

  if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    throw new ValidationError('Método de pago inválido')
  }

  const resolvedAmount = await resolveAmount({ manualAmount: amount, receipt })

  try {
    const expense = await expenseRepository.create({
      userId: user.id,
      type: 'MANTENIMIENTO',
      expenseDate: parsedDate,
      description: description.trim(),
      amount: resolvedAmount.amount,
      paymentMethod,
      receiptPath: receipt?.relativePath || null,
      ocrExtractedAmount: resolvedAmount.ocrExtractedAmount,
      ocrConfidence: resolvedAmount.ocrConfidence,
    })

    logger.info(`[EXPENSE] Mantenimiento creado para el usuario ${user.id}`, { expenseId: expense.id })

    return expense
  } catch (error) {
    throw new DatabaseError('No se pudo guardar el gasto', {
      userId: user.id,
      cause: error.message,
    })
  }
}

export async function createTripExpense(user, rendicionId, { type, date, description, amount, paymentMethod, receipt }) {
  if (!TRIP_EXPENSE_TYPES.has(type)) {
    throw new ValidationError('Tipo de gasto inválido')
  }

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (!description?.trim()) {
    throw new ValidationError('La descripción es obligatoria')
  }

  if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    throw new ValidationError('Método de pago inválido')
  }

  const resolvedAmount = await resolveAmount({ manualAmount: amount, receipt })

  try {
    const expense = await expenseRepository.create({
      userId: user.id,
      rendicionId,
      type,
      expenseDate: parsedDate,
      description: description.trim(),
      amount: resolvedAmount.amount,
      paymentMethod,
      receiptPath: receipt?.relativePath || null,
      ocrExtractedAmount: resolvedAmount.ocrExtractedAmount,
      ocrConfidence: resolvedAmount.ocrConfidence,
    })

    logger.info(`[EXPENSE] Gasto de viaje creado para el usuario ${user.id}`, { expenseId: expense.id, rendicionId })

    return expense
  } catch (error) {
    throw new DatabaseError('No se pudo guardar el gasto', {
      userId: user.id,
      rendicionId,
      cause: error.message,
    })
  }
}

export function getExpensesByUser(userId, limit) {
  return expenseRepository.findByUserId(userId, limit)
}

export function getExpensesByRendicion(rendicionId) {
  return expenseRepository.findByRendicionId(rendicionId)
}
