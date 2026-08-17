/**
 * Extracción de kilómetros recorridos desde mapas.seguimientoglobal.com (Puppeteer)
 */

import puppeteer from 'puppeteer'
import { EXTERNAL_URLS, SELECTORS, TIMEOUTS } from '../config/constants.js'
import { GPSError, retryWithBackoff } from '../utils/error-handler.js'
import logger from '../utils/logger.js'

async function launchBrowser() {
  return puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

function toGpsDate(date) {
  const parsed = date instanceof Date ? date : new Date(date)
  const yyyy = parsed.getFullYear()
  const mm = String(parsed.getMonth() + 1).padStart(2, '0')
  const dd = String(parsed.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

async function login(page, username, password) {
  await page.goto(EXTERNAL_URLS.GPS_LOGIN, {
    waitUntil: 'networkidle2',
    timeout: TIMEOUTS.PUPPETEER_DEFAULT,
  })

  await page.waitForSelector(SELECTORS.GPS.LOGIN_USER, { timeout: TIMEOUTS.PUPPETEER_WAIT })
  await page.type(SELECTORS.GPS.LOGIN_USER, username)
  await page.type(SELECTORS.GPS.LOGIN_PASSWORD, password)

  await Promise.all([
    page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUTS.PUPPETEER_DEFAULT })
      .catch(() => null),
    page.click(SELECTORS.GPS.LOGIN_BUTTON),
  ])

  const stillOnLogin = await page.$(SELECTORS.GPS.LOGIN_USER)

  if (stillOnLogin) {
    throw new GPSError('Usuario o contraseña incorrectos en GPS')
  }
}

async function openRecorridosTab(page) {
  await page.waitForSelector(SELECTORS.GPS.RECORRIDOS_TAB, { timeout: TIMEOUTS.PUPPETEER_WAIT })
  // Click nativo vía DOM en vez del click simulado por mouse de Puppeteer: el link
  // no siempre tiene una posición/tamaño clickeable apenas carga la página
  await page.$eval(SELECTORS.GPS.RECORRIDOS_TAB, (el) => el.click())
  await page.waitForSelector(SELECTORS.GPS.VEHICLE_CHECKBOX, { timeout: TIMEOUTS.PUPPETEER_WAIT })
}

async function selectVehicle(page, vehiclePlate) {
  const found = await page.evaluate(
    (rowSelector, plateCellSelector, checkboxSelector, plate) => {
      const row = Array.from(document.querySelectorAll(rowSelector)).find((candidate) => {
        const plateCell = candidate.querySelector(plateCellSelector)
        return plateCell?.textContent.trim() === plate
      })

      const checkbox = row?.querySelector(checkboxSelector)

      if (!checkbox) {
        return false
      }

      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    },
    SELECTORS.GPS.VEHICLE_ROW,
    SELECTORS.GPS.VEHICLE_PLATE_CELL,
    SELECTORS.GPS.VEHICLE_CHECKBOX,
    vehiclePlate
  )

  if (!found) {
    throw new GPSError(`No se encontró el vehículo "${vehiclePlate}" en el GPS`)
  }
}

async function setDateRange(page, dateFrom, dateTo) {
  await page.evaluate(
    (fromSelector, toSelector, fromValue, toValue) => {
      const setValue = (selector, value) => {
        const el = document.querySelector(selector)
        el.value = value
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }

      setValue(fromSelector, fromValue)
      setValue(toSelector, toValue)
    },
    SELECTORS.GPS.DATE_FROM,
    SELECTORS.GPS.DATE_TO,
    toGpsDate(dateFrom),
    toGpsDate(dateTo)
  )
}

async function runSearchAndReadDistance(page) {
  await page.$eval(SELECTORS.GPS.VIEW_ROUTE_BUTTON, (el) => el.click())
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: TIMEOUTS.PUPPETEER_DEFAULT }).catch(() => null)
  await page.waitForSelector(SELECTORS.GPS.DISTANCE_FIELD, { timeout: TIMEOUTS.PUPPETEER_WAIT })

  const rawText = await page.$eval(SELECTORS.GPS.DISTANCE_FIELD, (el) => el.childNodes[0]?.textContent ?? el.textContent)

  const match = rawText.match(/([\d.,]+)\s*km/i)

  if (!match) {
    throw new GPSError(`No se pudo leer la distancia del GPS (texto recibido: "${rawText.trim()}")`)
  }

  return parseFloat(match[1].replace(',', '.'))
}

async function scrapeOnce(gpsUsername, gpsPassword, vehicleId, dateFrom, dateTo) {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()

    await login(page, gpsUsername, gpsPassword)
    await openRecorridosTab(page)
    await selectVehicle(page, vehicleId)
    await setDateRange(page, dateFrom, dateTo)
    const kilometers = await runSearchAndReadDistance(page)

    logger.info(`[GPS_SCRAPER] Distancia extraída: ${kilometers} km`, { vehicleId })

    return kilometers
  } finally {
    await browser.close()
  }
}

/**
 * Extrae los kilómetros recorridos por un vehículo en un rango de fechas
 * @param {Object} params
 * @param {string} params.gpsUsername
 * @param {string} params.gpsPassword
 * @param {string} params.vehicleId - patente del vehículo (ej: "AC767UI")
 * @param {Date|string} params.dateFrom
 * @param {Date|string} params.dateTo
 * @returns {Promise<number>} kilómetros recorridos
 */
export async function getKilometers({ gpsUsername, gpsPassword, vehicleId, dateFrom, dateTo }) {
  const run = () => scrapeOnce(gpsUsername, gpsPassword, vehicleId, dateFrom, dateTo)

  try {
    return await run()
  } catch (error) {
    // Credenciales inválidas no se arreglan reintentando
    if (error.message?.includes('incorrectos')) {
      throw error
    }

    logger.warn('[GPS_SCRAPER] Primer intento falló, reintentando', { error: error.message })

    return retryWithBackoff(run, {
      maxAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      delayMs: TIMEOUTS.RETRY_DELAY,
      label: 'GPS scraper',
    })
  }
}
