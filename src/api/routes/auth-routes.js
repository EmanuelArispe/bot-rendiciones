import { Router } from 'express'
import { authenticate, getUserByAccessToken, regenerateAccessToken } from '../../services/user-service.js'
import { renderLoginForm } from '../../views/renderers/login-form-renderer.js'
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  CLEAR_SESSION_COOKIE_OPTIONS,
} from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import logger from '../../utils/logger.js'

const router = Router()

async function isLoggedIn(req) {
  const token = req.signedCookies?.[SESSION_COOKIE_NAME]
  return token ? Boolean(await getUserByAccessToken(token)) : false
}

router.get('/', asyncHandler(async (req, res) => {
  res.redirect((await isLoggedIn(req)) ? '/app' : '/login')
}))

router.get('/login', asyncHandler(async (req, res) => {
  if (await isLoggedIn(req)) {
    return res.redirect('/app')
  }

  res.type('html').send(await renderLoginForm())
}))

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).type('html').send(await renderLoginForm({ email, error: 'Completá email y contraseña.' }))
  }

  const user = await authenticate(email, password)

  if (!user) {
    return res
      .status(400)
      .type('html')
      .send(await renderLoginForm({ email, error: 'Email o contraseña incorrectos.' }))
  }

  res.cookie(SESSION_COOKIE_NAME, user.accessToken, SESSION_COOKIE_OPTIONS)
  logger.info(`[AUTH] Login exitoso: usuario ${user.id}`)
  res.redirect('/app')
}))

router.get('/logout', asyncHandler(async (req, res) => {
  const token = req.signedCookies?.[SESSION_COOKIE_NAME]

  if (token) {
    const user = await getUserByAccessToken(token)
    if (user) {
      await regenerateAccessToken(user.id)
      logger.info(`[AUTH] Logout: usuario ${user.id}`)
    }
  }

  res.clearCookie(SESSION_COOKIE_NAME, CLEAR_SESSION_COOKIE_OPTIONS)
  res.redirect('/login')
}))

export default router
