/**
 * Validación de credenciales contra las APIs reales (GPS + Empresa)
 * Se usa UNA SOLA VEZ, en el formulario de setup. No se reintenta acá:
 * si el login falla en producción se maneja en credential-manager.js.
 */

import puppeteer from 'puppeteer'
import { EXTERNAL_URLS, SELECTORS, TIMEOUTS } from '../config/constants.js'
import logger from './logger.js'

async function launchBrowser() {
  return puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

function toValidationResult(promise, label, genericError) {
  return promise.catch((error) => {
    logger.warn(`[CREDENTIAL_VALIDATOR] Error validando ${label}`, { error: error.message })
    return { success: false, error: genericError }
  })
}

/**
 * Intenta un login real contra mapas.seguimientoglobal.com en la pestaña dada
 */
async function attemptGPSLogin(page, username, password) {
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

  // Heurística: si el campo de usuario del login sigue presente, el login falló
  const stillOnLogin = await page.$(SELECTORS.GPS.LOGIN_USER)

  if (stillOnLogin) {
    return { success: false, error: 'Usuario o contraseña incorrectos en GPS' }
  }

  return { success: true }
}

/**
 * Intenta un login real contra el SSO de la empresa (Keycloak) en la pestaña dada
 */
async function attemptCompanyLogin(page, username, password) {
  await page.goto(EXTERNAL_URLS.COMPANY_LOGIN, {
    waitUntil: 'networkidle2',
    timeout: TIMEOUTS.PUPPETEER_DEFAULT,
  })

  await page.waitForSelector(SELECTORS.COMPANY.LOGIN_USER, { timeout: TIMEOUTS.PUPPETEER_WAIT })
  await page.type(SELECTORS.COMPANY.LOGIN_USER, username)
  await page.type(SELECTORS.COMPANY.LOGIN_PASSWORD, password)

  await Promise.all([
    page
      .waitForNavigation({ waitUntil: 'networkidle2', timeout: TIMEOUTS.PUPPETEER_DEFAULT })
      .catch(() => null),
    page.click(SELECTORS.COMPANY.LOGIN_BUTTON),
  ])

  const stillOnLogin = await page.$(SELECTORS.COMPANY.LOGIN_USER)

  if (stillOnLogin) {
    return { success: false, error: 'Usuario o contraseña incorrectos en el sistema de la empresa' }
  }

  return { success: true }
}

/**
 * Valida solo GPS (lanza y cierra su propio browser)
 */
export async function validateGPS(username, password) {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
    return await toValidationResult(
      attemptGPSLogin(page, username, password),
      'GPS',
      'No se pudo validar contra el sistema GPS'
    )
  } finally {
    await browser.close()
  }
}

/**
 * Valida solo Empresa (lanza y cierra su propio browser)
 */
export async function validateCompany(username, password) {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
    return await toValidationResult(
      attemptCompanyLogin(page, username, password),
      'Company',
      'No se pudo validar contra el sistema de la empresa'
    )
  } finally {
    await browser.close()
  }
}

/**
 * Corre ambas validaciones en paralelo, una sola vez, compartiendo un único
 * browser (una pestaña por sistema) en vez de lanzar dos procesos completos
 */
export async function validateCredentialsAgainstAPIs({
  gpsUsername,
  gpsPassword,
  companyUsername,
  companyPassword,
}) {
  const browser = await launchBrowser()

  try {
    const [gpsPage, companyPage] = await Promise.all([browser.newPage(), browser.newPage()])

    const [gps, company] = await Promise.all([
      toValidationResult(
        attemptGPSLogin(gpsPage, gpsUsername, gpsPassword),
        'GPS',
        'No se pudo validar contra el sistema GPS'
      ),
      toValidationResult(
        attemptCompanyLogin(companyPage, companyUsername, companyPassword),
        'Company',
        'No se pudo validar contra el sistema de la empresa'
      ),
    ])

    return {
      valid: gps.success && company.success,
      errors: {
        ...(gps.success ? {} : { gps: gps.error }),
        ...(company.success ? {} : { company: company.error }),
      },
    }
  } finally {
    await browser.close()
  }
}
