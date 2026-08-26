import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { handleReceiptUpload, toReceiptDescriptor } from '../middleware/receipt-upload.js'
import * as rendicionRepository from '../../db/rendicion-repository.js'
import { createTripExpense, getExpensesByRendicion } from '../../services/expense-service.js'
import { renderRendicionGastosForm } from '../../views/renderers/rendicion-gastos-renderer.js'
import { renderErrorPage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

async function findOwnRendicion(userId, rendicionId) {
  const rendicion = await rendicionRepository.findById(rendicionId)
  return rendicion && rendicion.userId === userId ? rendicion : null
}

router.get('/app/rendicion/:id/gastos', requireUser, asyncHandler(async (req, res) => {
  const rendicion = await findOwnRendicion(req.user.id, Number(req.params.id))

  if (!rendicion) {
    return res.status(404).type('html').send(renderErrorPage('Rendición no encontrada'))
  }

  const expenses = await getExpensesByRendicion(rendicion.id)
  res.type('html').send(await renderRendicionGastosForm({ rendicion, expenses }))
}))

router.post('/app/rendicion/:id/gastos', requireUser, handleReceiptUpload('receipt'), asyncHandler(async (req, res) => {
  const rendicion = await findOwnRendicion(req.user.id, Number(req.params.id))

  if (!rendicion) {
    return res.status(404).type('html').send(renderErrorPage('Rendición no encontrada'))
  }

  const { type, date, description, amount, paymentMethod } = req.body || {}
  const values = { type, date, description, amount, paymentMethod }

  try {
    await createTripExpense(req.user, rendicion.id, {
      type,
      date,
      description,
      amount,
      paymentMethod,
      receipt: toReceiptDescriptor(req.file),
    })

    const expenses = await getExpensesByRendicion(rendicion.id)
    res.type('html').send(
      await renderRendicionGastosForm({ rendicion, expenses, success: 'Gasto agregado correctamente.' })
    )
  } catch (error) {
    logger.error('[RENDICION_GASTO_ROUTES] Error en POST /app/rendicion/:id/gastos', { error: error.message })
    const expenses = await getExpensesByRendicion(rendicion.id)
    res
      .status(400)
      .type('html')
      .send(await renderRendicionGastosForm({ rendicion, expenses, values, error: error.message }))
  }
}))

export default router
