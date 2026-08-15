import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { renderMessagePage, escapeHtml } from '../../views/renderers/page-renderer.js'

const router = Router()

router.get('/app/rendicion', requireUser, (req, res) => {
  res.type('html').send(
    renderMessagePage({
      title: 'Cargar rendición',
      heading: '🚧 Próximamente',
      body: `Esta pantalla todavía no está lista. <a class="back-link" href="/app?token=${escapeHtml(req.token)}">← Volver al menú</a>`,
    })
  )
})

export default router
