import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { createRendicion } from '../../services/rendicion-service.js'
import { renderRendicionForm } from '../../views/renderers/rendicion-form-renderer.js'
import { renderMessagePage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/rendicion', requireUser, async (req, res) => {
  res.type('html').send(await renderRendicionForm({ token: req.token }))
})

router.post('/app/rendicion', requireUser, async (req, res) => {
  const { travelDate, origin, destination, details } = req.body || {}
  const values = { travelDate, origin, destination, details }

  try {
    await createRendicion(req.user.id, { travelDate, origin, destination, details })

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Rendición guardada',
        body: `Queda pendiente hasta que se complete el kilometraje. <a class="back-link" href="/app?token=${req.token}">← Volver al menú</a>`,
      })
    )
  } catch (error) {
    logger.error('[RENDICION_ROUTES] Error en POST /app/rendicion', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderRendicionForm({ token: req.token, values, error: error.message }))
  }
})

export default router
