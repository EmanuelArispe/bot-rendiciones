/**
 * Rutas HTTP del formulario de setup de credenciales
 */

import { Router } from 'express'
import { saveCredentials } from '../../services/credential-service.js'
import { getUserByAccessToken } from '../../services/user-service.js'
import { validateCredentialsAgainstAPIs } from '../../utils/credential-validator.js'
import {
  renderCredentialForm,
  renderMessagePage,
  renderErrorPage,
} from '../../views/renderers/credential-form-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

// GET /setup?token=xyz → muestra el formulario
router.get('/setup', async (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).type('html').send(renderErrorPage('Falta el token de acceso'))
  }

  const user = await getUserByAccessToken(token)

  if (!user) {
    logger.warn('[CREDENTIAL_ROUTES] Token inválido en GET /setup')
    return res.status(400).type('html').send(renderErrorPage('Token inválido'))
  }

  res.type('html').send(await renderCredentialForm({ token }))
})

// POST /setup/validate → valida contra APIs reales UNA VEZ y guarda si OK
router.post('/setup/validate', async (req, res) => {
  const { token, gpsUsername, gpsPassword, companyUsername, companyPassword } = req.body || {}

  if (!token) {
    return res.status(400).type('html').send(renderErrorPage('Falta el token de configuración'))
  }

  const values = { gpsUsername, companyUsername }

  if (!gpsUsername || !gpsPassword || !companyUsername || !companyPassword) {
    return res
      .status(400)
      .type('html')
      .send(await renderCredentialForm({ token, values, error: 'Completá todos los campos.' }))
  }

  const user = await getUserByAccessToken(token)

  if (!user) {
    return res.status(400).type('html').send(renderErrorPage('Token inválido'))
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
          token,
          values,
          gpsError: result.errors.gps,
          companyError: result.errors.company,
          gpsOk: !result.errors.gps,
          companyOk: !result.errors.company,
        })
      )
    }

    await saveCredentials(user.id, {
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Credenciales guardadas',
        body: 'Tus credenciales quedaron activas.',
      })
    )
  } catch (error) {
    logger.error('[CREDENTIAL_ROUTES] Error en POST /setup/validate', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderCredentialForm({ token, values, error: error.message }))
  }
})

export default router
