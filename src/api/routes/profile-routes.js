import { Router } from 'express'
import { requireUser, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { changePassword, updateVehicle } from '../../services/user-service.js'
import { renderChangePasswordForm } from '../../views/renderers/change-password-form-renderer.js'
import { renderVehicleForm } from '../../views/renderers/vehicle-form-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/cambiar-password', requireUser, asyncHandler(async (req, res) => {
  res.type('html').send(await renderChangePasswordForm())
}))

router.post('/app/cambiar-password', requireUser, asyncHandler(async (req, res) => {
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
}))

router.get('/app/vehiculo', requireUser, asyncHandler(async (req, res) => {
  res.type('html').send(await renderVehicleForm({ user: req.user }))
}))

router.post('/app/vehiculo', requireUser, asyncHandler(async (req, res) => {
  const { vehicleId, vehicleModel } = req.body || {}

  try {
    const updatedUser = await updateVehicle(req.user.id, { vehicleId, vehicleModel })
    logger.info(`[PROFILE_ROUTES] Vehículo actualizado: usuario ${req.user.id}`)
    res.type('html').send(await renderVehicleForm({ user: updatedUser, success: 'Vehículo actualizado correctamente.' }))
  } catch (error) {
    logger.error('[PROFILE_ROUTES] Error en POST /app/vehiculo', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderVehicleForm({ user: req.user, values: { vehicleId, vehicleModel }, error: error.message }))
  }
}))

export default router
