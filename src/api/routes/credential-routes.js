/**
 * Rutas HTTP del formulario de credenciales
 */

import { Router } from 'express'
import { saveCredentials } from '../../services/credential-service.js'
import { validateCredentialsAgainstAPIs } from '../../utils/credential-validator.js'
import { requireUser } from '../middleware/require-user.js'
import { renderCredentialForm } from '../../views/renderers/credential-form-renderer.js'
import { renderMessagePage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/credenciales', requireUser, async (req, res) => {
  res.type('html').send(await renderCredentialForm({ token: req.token }))
})

router.post('/app/credenciales', requireUser, async (req, res) => {
  const { gpsUsername, gpsPassword, companyUsername, companyPassword } = req.body || {}
  const values = { gpsUsername, companyUsername }

  if (!gpsUsername || !gpsPassword || !companyUsername || !companyPassword) {
    return res
      .status(400)
      .type('html')
      .send(await renderCredentialForm({ token: req.token, values, error: 'Completá todos los campos.' }))
  }

  try {
    const result = await validateCredentialsAgainstAPIs({
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    if (!result.valid) {
      return res.status(400).type('html').send(
        await renderCredentialForm({
          token: req.token,
          values,
          gpsError: result.errors.gps,
          companyError: result.errors.company,
          gpsOk: !result.errors.gps,
          companyOk: !result.errors.company,
        })
      )
    }

    await saveCredentials(req.user.id, {
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Credenciales guardadas',
        body: `Tus credenciales quedaron activas. <a class="back-link" href="/app?token=${req.token}">← Volver al menú</a>`,
      })
    )
  } catch (error) {
    logger.error('[CREDENTIAL_ROUTES] Error en POST /app/credenciales', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderCredentialForm({ token: req.token, values, error: error.message }))
  }
})

export default router
