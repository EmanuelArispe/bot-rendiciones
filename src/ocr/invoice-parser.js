/**
 * Extrae el monto de una factura para asistir la carga de gastos (mantenimiento
 * y gastos de viaje). Dos fuentes posibles:
 *  - PDF con capa de texto (factura electrónica AFIP: casi nunca es un escaneo,
 *    así que se lee el texto directo, sin OCR)
 *  - Foto (o PDF escaneado sin texto, que cae acá igual aunque no lo procesamos
 *    como imagen: ver extractAmountFromReceipt)
 */

import path from 'path'
import fs from 'fs/promises'
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import logger from '../utils/logger.js'
import { OCRError } from '../utils/error-handler.js'

// pdfjs-dist necesita rutas file:// absolutas para su worker y sus fuentes
// estándar cuando corre en Node (no las resuelve solo, a diferencia del browser)
const require = createRequire(import.meta.url)
const pdfjsDistDir = path.join(path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')), '..', '..')

pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href
const STANDARD_FONT_DATA_URL = pathToFileURL(path.join(pdfjsDistDir, 'standard_fonts') + path.sep).href

// Sin esto, tesseract.js cachea el paquete de idioma descargado (ej.
// spa.traineddata) en el cwd del proceso
const TESSERACT_CACHE_PATH = path.join(process.cwd(), '.cache', 'tesseract')

const MIN_AMOUNT = 50
const MAX_AMOUNT = 10_000_000

// "Importe Total: $ 12.345,67" / "TOTAL A PAGAR $12345.67" / "Total: 850"
const TOTAL_LINE_PATTERN =
  /(?:importe\s*total|total\s*a\s*pagar|monto\s*total|total\s*general|^\s*total)\D{0,20}?\$?\s*([\d.,]+)/im
const ANY_AMOUNT_PATTERN = /\$\s*([\d.,]+)/g

// Formato argentino: "." separa miles, "," separa decimales (12.345,67 -> 12345.67)
function normalizeArgentineNumber(raw) {
  const cleaned = raw.replace(/[^\d.,]/g, '')

  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replaceAll(',', '.'))
  }

  return parseFloat(cleaned)
}

function isPlausibleAmount(amount) {
  return Number.isFinite(amount) && amount >= MIN_AMOUNT && amount <= MAX_AMOUNT
}

function parseAmountFromText(text) {
  const totalMatch = text.match(TOTAL_LINE_PATTERN)

  if (totalMatch) {
    const amount = normalizeArgentineNumber(totalMatch[1])

    if (isPlausibleAmount(amount)) {
      return { amount, confidence: 0.9, raw: totalMatch[0].trim() }
    }
  }

  // Sin una línea de "total" reconocible: nos quedamos con el monto más alto
  // encontrado (heurística válida para tickets/facturas cortas)
  const candidates = [...text.matchAll(ANY_AMOUNT_PATTERN)]
    .map((match) => normalizeArgentineNumber(match[1]))
    .filter(isPlausibleAmount)

  if (candidates.length === 0) {
    return { amount: null, confidence: 0, raw: '' }
  }

  const amount = Math.max(...candidates)
  return { amount, confidence: 0.5, raw: `$${amount}` }
}

async function extractTextFromPdf(buffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    useSystemFonts: true,
    disableFontFace: true,
  })

  try {
    const doc = await loadingTask.promise
    let text = ''

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      text += `${content.items.map((item) => item.str).join(' ')}\n`
    }

    return text
  } finally {
    await loadingTask.destroy()
  }
}

async function extractFromPdf(filePath) {
  const buffer = await fs.readFile(filePath)

  let text
  try {
    text = await extractTextFromPdf(buffer)
  } catch (error) {
    throw new OCRError('No se pudo leer el PDF', { type: 'PDF_PARSE_ERROR', cause: error.message })
  }

  if (!text?.trim()) {
    logger.warn('[OCR] PDF sin capa de texto (probablemente escaneado); no se puede leer el monto automáticamente')
    return { amount: null, confidence: 0, raw: '', source: 'PDF_TEXT' }
  }

  return { ...parseAmountFromText(text), source: 'PDF_TEXT' }
}

async function extractFromImage(filePath) {
  const language = process.env.TESSERACT_LANGUAGE || 'spa'

  let result
  try {
    result = await Tesseract.recognize(filePath, language, { cachePath: TESSERACT_CACHE_PATH })
  } catch (error) {
    throw new OCRError('No se pudo procesar la imagen con OCR', { type: 'TESSERACT_ERROR', cause: error.message })
  }

  const parsed = parseAmountFromText(result.data.text || '')
  const tesseractConfidence = (result.data.confidence ?? 0) / 100

  return {
    amount: parsed.amount,
    // Combina qué tan reconocible fue el patrón de monto con qué tan segura
    // estuvo Tesseract del texto en general
    confidence: parsed.amount != null ? parsed.confidence * tesseractConfidence : 0,
    raw: parsed.raw,
    source: 'OCR',
  }
}

/**
 * @param {string} filePath - archivo ya guardado en disco
 * @param {string} mimeType
 * @returns {Promise<{amount: number|null, confidence: number, raw: string, source: 'PDF_TEXT'|'OCR'}>}
 */
export async function extractAmountFromReceipt(filePath, mimeType) {
  if (mimeType === 'application/pdf') {
    return extractFromPdf(filePath)
  }

  return extractFromImage(filePath)
}
