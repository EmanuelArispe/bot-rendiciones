import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../login-form.html')

export async function renderLoginForm({ email = '', error = '' } = {}) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{EMAIL}}', escapeHtml(email))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
}
