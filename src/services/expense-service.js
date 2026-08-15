import * as expenseRepository from '../db/expense-repository.js'
import logger from '../utils/logger.js'
import { ValidationError, DatabaseError } from '../utils/error-handler.js'
import { PAYMENT_METHODS } from '../config/constants.js'

export async function createMantenimientoExpense(
  user,
  { date, description, amount, paymentMethod, receiptPath }
) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ValidationError('Fecha inválida')
  }

  if (!description?.trim()) {
    throw new ValidationError('La descripción es obligatoria')
  }

  const parsedAmount = Number(amount)

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new ValidationError('El monto tiene que ser un número mayor a cero')
  }

  if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    throw new ValidationError('Método de pago inválido')
  }

  try {
    const expense = await expenseRepository.create({
      userId: user.id,
      type: 'MANTENIMIENTO',
      expenseDate: parsedDate,
      description: description.trim(),
      amount: parsedAmount,
      paymentMethod,
      receiptPath: receiptPath || null,
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

export function getExpensesByUser(userId, limit) {
  return expenseRepository.findByUserId(userId, limit)
}
