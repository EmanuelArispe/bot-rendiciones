import { Router } from 'express'
import { requireUser, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../middleware/require-user.js'
import { changePassword } from '../../services/user-service.js'
import { renderChangePasswordForm } from '../../views/renderers/change-password-form-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/cambiar-password', requireUser, async (req, res) => {
  res.type('html').send(await renderChangePasswordForm())
})

router.post('/app/cambiar-password', requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}

  try {
    const updatedUser = await changePassword(req.user.id, currentPassword, newPassword)

    res.cookie(SESSION_COOKIE_NAME, updatedUser.accessToken, SESSION_COOKIE_OPTIONS)
    logger.info(`[PROFILE_ROUTES] Contraseña cambiada: usuario ${req.user.id}`)
    res.type('html').send(await renderChangePasswordForm({ success: 'Contraseña actualizada correctamente.' }))
  } catch (error) {
    logger.error('[PROFILE_ROUTES] Error en POST /app/cambiar-password', { error: error.message })
    res.status(400).type('html').send(await renderChangePasswordForm({ error: error.message }))
  }
})

export default router
