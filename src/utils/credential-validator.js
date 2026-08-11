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

/**
 * Intenta un login real contra mapas.seguimientoglobal.com
 */
export async function validateGPS(username, password) {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
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
  } catch (error) {
    logger.warn('[CREDENTIAL_VALIDATOR] Error validando GPS', { error: error.message })
    return { success: false, error: 'No se pudo validar contra el sistema GPS' }
  } finally {
    await browser.close()
  }
}

/**
 * Intenta un login real contra el SSO de la empresa (Keycloak, hubproductores.papps.lasegunda.com.ar)
 */
export async function validateCompany(username, password) {
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
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
  } catch (error) {
    logger.warn('[CREDENTIAL_VALIDATOR] Error validando Company', { error: error.message })
    return { success: false, error: 'No se pudo validar contra el sistema de la empresa' }
  } finally {
    await browser.close()
  }
}

/**
 * Corre ambas validaciones en paralelo, una sola vez
 */
export async function validateCredentialsAgainstAPIs({
  gpsUsername,
  gpsPassword,
  companyUsername,
  companyPassword,
}) {
  const [gps, company] = await Promise.all([
    validateGPS(gpsUsername, gpsPassword),
    validateCompany(companyUsername, companyPassword),
  ])

  return {
    valid: gps.success && company.success,
    errors: {
      ...(gps.success ? {} : { gps: gps.error }),
      ...(company.success ? {} : { company: company.error }),
    },
  }
}
