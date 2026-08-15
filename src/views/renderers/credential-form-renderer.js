import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../credential-form.html')

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

export async function renderCredentialForm({
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

export function renderMessagePage({ title, heading, body }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)} - Bot Rendiciones</title>
  <link rel="stylesheet" href="/static/credential-form.css" />
</head>
<body>
  <div class="card card-message">
    <h1>${heading}</h1>
    <p>${body}</p>
  </div>
</body>
</html>`
}

export function renderErrorPage(message) {
  return renderMessagePage({
    title: 'Error',
    heading: `⚠️ ${escapeHtml(message)}`,
    body: 'Revisá el link que te compartieron.',
  })
}
