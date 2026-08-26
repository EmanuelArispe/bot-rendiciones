import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { createRendicion } from '../../services/rendicion-service.js'
import { renderRendicionForm } from '../../views/renderers/rendicion-form-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/rendicion', requireUser, asyncHandler(async (req, res) => {
  res.type('html').send(await renderRendicionForm({ user: req.user }))
}))

router.post('/app/rendicion', requireUser, asyncHandler(async (req, res) => {
  const {
    travelDateFrom,
    travelDateTo,
    originProvinceCode,
    originCity,
    destinationProvinceCode,
    destinationCity,
    details,
  } = req.body || {}

  const values = {
    travelDateFrom,
    travelDateTo,
    originProvinceCode,
    originCity,
    destinationProvinceCode,
    destinationCity,
    details,
  }

  try {
    const rendicion = await createRendicion(req.user, values)

    // El kilometraje se completa solo (background) desde acá en adelante.
    // Ahora el usuario carga los gastos del viaje (combustible, peajes, etc)
    res.redirect(`/app/rendicion/${rendicion.id}/gastos`)
  } catch (error) {
    logger.error('[RENDICION_ROUTES] Error en POST /app/rendicion', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderRendicionForm({ user: req.user, values, error: error.message }))
  }
}))

export default router
