import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'
import { PROVINCES } from '../../config/company-locations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../rendicion-form.html')

function renderProvinceOptions(selectedCode) {
  return PROVINCES.map(
    (province) =>
      `<option value="${province.code}"${province.code === selectedCode ? ' selected' : ''}>${escapeHtml(
        province.name
      )}</option>`
  ).join('')
}

export async function renderRendicionForm({ token, user, values = {}, error = '' }) {
  const html = await fs.readFile(formPath, 'utf8')
  const originLabel = `${user.originProvince} - ${user.originCity}`

  return html
    .replaceAll('{{TOKEN}}', escapeHtml(token))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{ORIGIN_LABEL}}', escapeHtml(originLabel))
    .replaceAll('{{TRAVEL_DATE_FROM}}', escapeHtml(values.travelDateFrom))
    .replaceAll('{{TRAVEL_DATE_TO}}', escapeHtml(values.travelDateTo))
    .replaceAll('{{PROVINCE_OPTIONS}}', renderProvinceOptions(values.destinationProvinceCode))
    .replaceAll('{{DESTINATION_CITY}}', escapeHtml(values.destinationCity))
    .replaceAll('{{DETAILS}}', escapeHtml(values.details))
}
