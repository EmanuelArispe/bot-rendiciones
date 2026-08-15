import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../credential-form.html')

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
