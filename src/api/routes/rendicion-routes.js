import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { createRendicion } from '../../services/rendicion-service.js'
import { renderRendicionForm } from '../../views/renderers/rendicion-form-renderer.js'
import { renderMessagePage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/rendicion', requireUser, async (req, res) => {
  res.type('html').send(await renderRendicionForm({ user: req.user }))
})

router.post('/app/rendicion', requireUser, async (req, res) => {
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
    await createRendicion(req.user, values)

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Rendición guardada',
        body: `Queda pendiente hasta que se complete el kilometraje. <a class="back-link" href="/app">← Volver al menú</a>`,
      })
    )
  } catch (error) {
    logger.error('[RENDICION_ROUTES] Error en POST /app/rendicion', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderRendicionForm({ user: req.user, values, error: error.message }))
  }
})

export default router
