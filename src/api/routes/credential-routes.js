/**
 * Rutas HTTP del formulario de credenciales
 */

import { Router } from 'express'
import {
  saveGpsCredentials,
  saveCompanyCredentials,
  markGpsCredentialsAsInvalid,
  markCompanyCredentialsAsInvalid,
} from '../../services/credential-service.js'
import {
  validateGPS,
  validateCompany,
  validateCredentialsAgainstAPIs,
} from '../../utils/credential-validator.js'
import { requireUser } from '../middleware/require-user.js'
import { renderCredentialForm } from '../../views/renderers/credential-form-renderer.js'
import { renderMessagePage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

async function validateWhicheverIsNeeded(needsGps, needsCompany, credentials) {
  if (needsGps && needsCompany) {
    return validateCredentialsAgainstAPIs(credentials)
  }

  if (needsGps) {
    const gps = await validateGPS(credentials.gpsUsername, credentials.gpsPassword)
    return { valid: gps.success, errors: gps.success ? {} : { gps: gps.error } }
  }

  if (needsCompany) {
    const company = await validateCompany(credentials.companyUsername, credentials.companyPassword)
    return { valid: company.success, errors: company.success ? {} : { company: company.error } }
  }

  return { valid: true, errors: {} }
}

router.get('/app/credenciales', requireUser, async (req, res) => {
  res.type('html').send(await renderCredentialForm({ user: req.user }))
})

router.post('/app/credenciales', requireUser, async (req, res) => {
  const { gpsUsername, gpsPassword, companyUsername, companyPassword } = req.body || {}
  const values = { gpsUsername, companyUsername }

  const gpsAlreadyActive = req.user.gpsCredentialsStatus === 'ACTIVE'
  const companyAlreadyActive = req.user.companyCredentialsStatus === 'ACTIVE'

  const needsGps = !gpsAlreadyActive || Boolean(gpsPassword)
  const needsCompany = !companyAlreadyActive || Boolean(companyPassword)

  if (needsGps && (!gpsUsername || !gpsPassword)) {
    return res
      .status(400)
      .type('html')
      .send(
        await renderCredentialForm({
          user: req.user,
          values,
          error: 'Completá usuario y contraseña de GPS.',
        })
      )
  }

  if (needsCompany && (!companyUsername || !companyPassword)) {
    return res
      .status(400)
      .type('html')
      .send(
        await renderCredentialForm({
          user: req.user,
          values,
          error: 'Completá usuario y contraseña de la empresa.',
        })
      )
  }

  try {
    const result = await validateWhicheverIsNeeded(needsGps, needsCompany, {
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    if (needsGps) {
      if (!result.errors.gps) {
        await saveGpsCredentials(req.user.id, { gpsUsername, gpsPassword })
      } else {
        await markGpsCredentialsAsInvalid(req.user.id, result.errors.gps)
      }
    }

    if (needsCompany) {
      if (!result.errors.company) {
        await saveCompanyCredentials(req.user.id, { companyUsername, companyPassword })
      } else {
        await markCompanyCredentialsAsInvalid(req.user.id, result.errors.company)
      }
    }

    const gpsOk = !needsGps || !result.errors.gps
    const companyOk = !needsCompany || !result.errors.company

    if (gpsOk && companyOk) {
      return res.type('html').send(
        renderMessagePage({
          title: 'Listo',
          heading: '✅ Credenciales guardadas',
          body: `Tus credenciales quedaron activas. <a class="back-link" href="/app">← Volver al menú</a>`,
        })
      )
    }

    res.status(400).type('html').send(
      await renderCredentialForm({
        user: req.user,
        values,
        gpsError: result.errors.gps,
        companyError: result.errors.company,
        gpsOk,
        companyOk,
      })
    )
  } catch (error) {
    logger.error('[CREDENTIAL_ROUTES] Error en POST /app/credenciales', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderCredentialForm({ user: req.user, values, error: error.message }))
  }
})

export default router
