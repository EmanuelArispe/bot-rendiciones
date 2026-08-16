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

export async function renderRendicionForm({ user, values = {}, error = '' }) {
  const html = await fs.readFile(formPath, 'utf8')

  const originProvinceCode = values.originProvinceCode ?? user.originProvinceCode ?? ''
  const originCity = values.originCity ?? user.originCity ?? ''

  return html
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{TRAVEL_DATE_FROM}}', escapeHtml(values.travelDateFrom))
    .replaceAll('{{TRAVEL_DATE_TO}}', escapeHtml(values.travelDateTo))
    .replaceAll('{{ORIGIN_PROVINCE_OPTIONS}}', renderProvinceOptions(originProvinceCode))
    .replaceAll('{{ORIGIN_CITY}}', escapeHtml(originCity))
    .replaceAll('{{DESTINATION_PROVINCE_OPTIONS}}', renderProvinceOptions(values.destinationProvinceCode))
    .replaceAll('{{DESTINATION_CITY}}', escapeHtml(values.destinationCity))
    .replaceAll('{{DETAILS}}', escapeHtml(values.details))
}
