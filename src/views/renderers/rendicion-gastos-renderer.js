import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'
import { PAYMENT_METHODS } from '../../config/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const formPath = path.join(__dirname, '../rendicion-gastos.html')

// MANTENIMIENTO no está acá: tiene su propio flujo, no se rinde como gasto de viaje
const EXPENSE_TYPE_LABELS = {
  COMBUSTIBLE: 'Combustible',
  PEAJE: 'Peaje',
  ESTACIONAMIENTO: 'Estacionamiento',
  HOTELERIA: 'Hotelería',
  COMIDA: 'Comida',
  OTROS: 'Otros',
}

const PAYMENT_METHOD_LABELS = {
  TARJETA: 'Tarjeta',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  TRANSFERENCIA: 'Transferencia',
}

function renderExpenseTypeOptions(selected) {
  return Object.entries(EXPENSE_TYPE_LABELS)
    .map(([type, label]) => `<option value="${type}"${type === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('')
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

function formatAmount(amount) {
  return Number(amount).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
}

function renderExpenseRow(expense) {
  const label = EXPENSE_TYPE_LABELS[expense.type] ?? expense.type
  return `<li>${escapeHtml(label)} — ${escapeHtml(expense.description)} — ${formatAmount(expense.amount)}</li>`
}

export async function renderRendicionGastosForm({ rendicion, expenses = [], values = {}, error = '', success = '' }) {
  const html = await fs.readFile(formPath, 'utf8')

  const expensesList = expenses.length
    ? `<ul class="expense-list">${expenses.map(renderExpenseRow).join('')}</ul>`
    : '<p class="subtitle">Todavía no cargaste ningún gasto para este viaje.</p>'

  return html
    .replaceAll('{{RENDICION_ID}}', rendicion.id)
    .replaceAll('{{DESTINATION}}', escapeHtml(`${rendicion.destinationCity}, ${rendicion.destinationProvince}`))
    .replaceAll('{{EXPENSES_LIST}}', expensesList)
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{SUCCESS}}', success ? `<div class="field-ok">${escapeHtml(success)}</div>` : '')
    .replaceAll('{{EXPENSE_TYPE_OPTIONS}}', renderExpenseTypeOptions(values.type))
    .replaceAll('{{DATE}}', escapeHtml(values.date))
    .replaceAll('{{DESCRIPTION}}', escapeHtml(values.description))
    .replaceAll('{{AMOUNT}}', escapeHtml(values.amount))
    .replaceAll('{{PAYMENT_METHOD_OPTIONS}}', renderPaymentMethodOptions(values.paymentMethod))
}
