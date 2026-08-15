import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'
import { PAYMENT_METHODS } from '../../config/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../mantenimiento-form.html')

const PAYMENT_METHOD_LABELS = {
  TARJETA: 'Tarjeta',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  TRANSFERENCIA: 'Transferencia',
}

function renderPaymentMethodOptions(selected) {
  return Object.values(PAYMENT_METHODS)
    .map(
      (method) =>
        `<option value="${method}"${method === selected ? ' selected' : ''}>${escapeHtml(
          PAYMENT_METHOD_LABELS[method]
        )}</option>`
    )
    .join('')
}

export async function renderMantenimientoForm({ token, values = {}, error = '' }) {
  const html = await fs.readFile(formPath, 'utf8')

  return html
    .replaceAll('{{TOKEN}}', escapeHtml(token))
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{DATE}}', escapeHtml(values.date))
    .replaceAll('{{DESCRIPTION}}', escapeHtml(values.description))
    .replaceAll('{{AMOUNT}}', escapeHtml(values.amount))
    .replaceAll('{{PAYMENT_METHOD_OPTIONS}}', renderPaymentMethodOptions(values.paymentMethod))
}
