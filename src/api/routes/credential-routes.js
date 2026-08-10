/**
 * Rutas HTTP del formulario de setup de credenciales
 */

import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateSetupToken, saveCredentials } from '../../services/credential-service.js'
import { validateCredentialsAgainstAPIs } from '../../utils/credential-validator.js'
import logger from '../../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../../views/credential-form.html')

const router = Router()

async function renderForm({ token, error = '' }) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{TOKEN}}', token || '')
    .replaceAll('{{ERROR}}', error ? `<div class="error">${error}</div>` : '')
}

function renderErrorPage(message) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Error - Bot Rendiciones</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; justify-content: center; padding: 40px 16px; margin: 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚠️ ${message}</h1>
    <p>Escribí <strong>setup-credentials</strong> de nuevo por WhatsApp para generar un link nuevo.</p>
  </div>
</body>
</html>`
}

// GET /setup?token=xyz → muestra el formulario
router.get('/setup', async (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.status(400).type('html').send(renderErrorPage('Falta el token de configuración'))
  }

  try {
    await validateSetupToken(token)
    const html = await renderForm({ token })
    res.type('html').send(html)
  } catch (error) {
    logger.warn('[CREDENTIAL_ROUTES] Token inválido en GET /setup', { error: error.message })
    res.status(400).type('html').send(renderErrorPage(error.message))
  }
})

// POST /setup/validate → valida contra APIs reales UNA VEZ y guarda si OK
router.post('/setup/validate', async (req, res) => {
  const { token, gpsUsername, gpsPassword, companyUsername, companyPassword } = req.body || {}

  if (!token) {
    return res.status(400).type('html').send(renderErrorPage('Falta el token de configuración'))
  }

  if (!gpsUsername || !gpsPassword || !companyUsername || !companyPassword) {
    return res
      .status(400)
      .type('html')
      .send(await renderForm({ token, error: 'Completá todos los campos.' }))
  }

  try {
    const session = await validateSetupToken(token)

    const result = await validateCredentialsAgainstAPIs({
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    if (!result.valid) {
      const errorText = [result.errors.gps, result.errors.company].filter(Boolean).join(' | ')
      return res.status(400).type('html').send(await renderForm({ token, error: errorText }))
    }

    await saveCredentials(session.phoneNumber, {
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    res
      .type('html')
      .send(
        `<!doctype html><html lang="es"><head><meta charset="UTF-8" /><title>Listo</title>
        <style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;justify-content:center;padding:40px 16px;margin:0;}
        .card{background:#1e293b;border-radius:12px;padding:32px;max-width:420px;text-align:center;}</style>
        </head><body><div class="card"><h1>✅ Credenciales guardadas</h1>
        <p>Ya podés volver a WhatsApp, tus credenciales quedaron activas.</p></div></body></html>`
      )
  } catch (error) {
    logger.error('[CREDENTIAL_ROUTES] Error en POST /setup/validate', { error: error.message })
    res.status(400).type('html').send(await renderForm({ token, error: error.message }))
  }
})

export default router
