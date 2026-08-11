/**
 * Rutas HTTP del formulario de setup de credenciales
 */

import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateSetupToken, saveCredentials } from '../../services/credential-service.js'
import { validateCredentialsAgainstAPIs } from '../../utils/credential-validator.js'
import { sendMessage } from '../../bot/whatsapp.js'
import logger from '../../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../../views/credential-form.html')

const router = Router()

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function fieldStatus(error, ok) {
  if (error) return `<div class="field-error">⚠️ ${escapeHtml(error)}</div>`
  if (ok) return `<div class="field-ok">✅ Validado correctamente</div>`
  return ''
}

async function renderForm({
  token,
  values = {},
  error = '',
  gpsError = null,
  companyError = null,
  gpsOk = false,
  companyOk = false,
}) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{TOKEN}}', escapeHtml(token))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{GPS_USERNAME}}', escapeHtml(values.gpsUsername))
    .replaceAll('{{COMPANY_USERNAME}}', escapeHtml(values.companyUsername))
    .replaceAll('{{GPS_STATUS}}', fieldStatus(gpsError, gpsOk))
    .replaceAll('{{COMPANY_STATUS}}', fieldStatus(companyError, companyOk))
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

  const values = { gpsUsername, companyUsername }

  if (!gpsUsername || !gpsPassword || !companyUsername || !companyPassword) {
    return res
      .status(400)
      .type('html')
      .send(await renderForm({ token, values, error: 'Completá todos los campos.' }))
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
      return res.status(400).type('html').send(
        await renderForm({
          token,
          values,
          gpsError: result.errors.gps,
          companyError: result.errors.company,
          gpsOk: !result.errors.gps,
          companyOk: !result.errors.company,
        })
      )
    }

    await saveCredentials(session.phoneNumber, {
      gpsUsername,
      gpsPassword,
      companyUsername,
      companyPassword,
    })

    await sendMessage(
      `${session.phoneNumber}@c.us`,
      `✅ Tus credenciales quedaron guardadas y validadas\n\nYa podés usar el bot para rendir viajes.`
    )

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
    res.status(400).type('html').send(await renderForm({ token, values, error: error.message }))
  }
})

export default router
