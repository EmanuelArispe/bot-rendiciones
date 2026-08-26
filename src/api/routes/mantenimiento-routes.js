import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { handleReceiptUpload, toReceiptDescriptor } from '../middleware/receipt-upload.js'
import { createMantenimientoExpense } from '../../services/expense-service.js'
import { renderMantenimientoForm } from '../../views/renderers/mantenimiento-form-renderer.js'
import { renderMessagePage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/mantenimiento', requireUser, asyncHandler(async (req, res) => {
  res.type('html').send(await renderMantenimientoForm({}))
}))

router.post('/app/mantenimiento', requireUser, handleReceiptUpload('receipt'), asyncHandler(async (req, res) => {
  const { date, description, amount, paymentMethod } = req.body || {}
  const values = { date, description, amount, paymentMethod }

  try {
    await createMantenimientoExpense(req.user, {
      date,
      description,
      amount,
      paymentMethod,
      receipt: toReceiptDescriptor(req.file),
    })

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Mantenimiento guardado',
        body: `<a class="back-link" href="/app">← Volver al menú</a>`,
      })
    )
  } catch (error) {
    logger.error('[MANTENIMIENTO_ROUTES] Error en POST /app/mantenimiento', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderMantenimientoForm({ values, error: error.message }))
  }
}))

export default router
