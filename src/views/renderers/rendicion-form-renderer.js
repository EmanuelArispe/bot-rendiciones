import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../rendicion-form.html')

export async function renderRendicionForm({ token, values = {}, error = '' }) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{TOKEN}}', escapeHtml(token))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{TRAVEL_DATE}}', escapeHtml(values.travelDate))
    .replaceAll('{{ORIGIN}}', escapeHtml(values.origin))
    .replaceAll('{{DESTINATION}}', escapeHtml(values.destination))
    .replaceAll('{{DETAILS}}', escapeHtml(values.details))
}
