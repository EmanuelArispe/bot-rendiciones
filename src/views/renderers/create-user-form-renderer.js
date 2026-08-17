import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../create-user-form.html')

export async function renderCreateUserForm({ values = {}, error = '', success = '' } = {}) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{SUCCESS}}', success ? `<div class="field-ok">✅ ${escapeHtml(success)}</div>` : '')
    .replaceAll('{{EMAIL}}', escapeHtml(values.email))
    .replaceAll('{{FIRST_NAME}}', escapeHtml(values.firstName))
    .replaceAll('{{LAST_NAME}}', escapeHtml(values.lastName))
    .replaceAll('{{IS_ADMIN_CHECKED}}', values.isAdmin ? 'checked' : '')
}
