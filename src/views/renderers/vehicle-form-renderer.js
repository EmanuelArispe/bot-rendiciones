import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../vehicle-form.html')

export async function renderVehicleForm({ user, values, error = '', success = '' } = {}) {
  const html = await fs.readFile(formPath, 'utf8')
  const vehicleId = values?.vehicleId ?? user?.vehicleId ?? ''
  const vehicleModel = values?.vehicleModel ?? user?.vehicleModel ?? ''

  return html
    .replaceAll('{{VEHICLE_ID}}', escapeHtml(vehicleId))
    .replaceAll('{{VEHICLE_MODEL}}', escapeHtml(vehicleModel))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{SUCCESS}}', success ? `<div class="field-ok">✅ ${escapeHtml(success)}</div>` : '')
}
