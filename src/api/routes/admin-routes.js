import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { requireAdmin } from '../middleware/require-admin.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { createUser, getAllUsers, setUserActive, resetPassword } from '../../services/user-service.js'
import { renderCreateUserForm } from '../../views/renderers/create-user-form-renderer.js'
import { renderUsersList } from '../../views/renderers/users-list-renderer.js'
import logger from '../../utils/logger.js'

const router = Router()

router.get('/app/usuarios', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  const users = await getAllUsers()
  res.type('html').send(await renderUsersList({ users, currentUserId: req.user.id }))
}))

router.get('/app/usuarios/nuevo', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  res.type('html').send(await renderCreateUserForm())
}))

router.post('/app/usuarios/nuevo', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, isAdmin } = req.body || {}
  const values = { email, firstName, lastName, isAdmin: isAdmin === 'true' }

  try {
    const user = await createUser({ email, password, firstName, lastName, isAdmin: isAdmin === 'true' })

    res.type('html').send(
      await renderCreateUserForm({ success: `Usuario ${user.email} creado correctamente.` })
    )
  } catch (error) {
    logger.error('[ADMIN_ROUTES] Error en POST /app/usuarios/nuevo', { error: error.message })
    res.status(400).type('html').send(await renderCreateUserForm({ values, error: error.message }))
  }
}))

router.post('/app/usuarios/:id/desactivar', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id)

  if (targetId === req.user.id) {
    const users = await getAllUsers()
    return res
      .status(400)
      .type('html')
      .send(await renderUsersList({ users, currentUserId: req.user.id, error: 'No podés desactivar tu propia cuenta.' }))
  }

  try {
    await setUserActive(targetId, false)
  } catch (error) {
    logger.error('[ADMIN_ROUTES] Error en POST /app/usuarios/:id/desactivar', { error: error.message })
  }

  const users = await getAllUsers()
  res.type('html').send(await renderUsersList({ users, currentUserId: req.user.id }))
}))

router.post('/app/usuarios/:id/activar', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id)

  try {
    await setUserActive(targetId, true)
  } catch (error) {
    logger.error('[ADMIN_ROUTES] Error en POST /app/usuarios/:id/activar', { error: error.message })
  }

  const users = await getAllUsers()
  res.type('html').send(await renderUsersList({ users, currentUserId: req.user.id }))
}))

router.post('/app/usuarios/:id/resetear-password', requireUser, requireAdmin, asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id)

  if (targetId === req.user.id) {
    const users = await getAllUsers()
    return res
      .status(400)
      .type('html')
      .send(
        await renderUsersList({
          users,
          currentUserId: req.user.id,
          error: 'No podés resetear tu propia contraseña desde acá, usá "Cambiar contraseña".',
        })
      )
  }

  let success
  let error

  try {
    const { user, temporaryPassword } = await resetPassword(targetId)
    logger.info(`[ADMIN_ROUTES] Contraseña reseteada: usuario ${user.id} por admin ${req.user.id}`)
    success = `Contraseña de ${user.email} reseteada. Nueva contraseña temporal: ${temporaryPassword} — comunicásela al usuario, no se va a volver a mostrar.`
  } catch (err) {
    logger.error('[ADMIN_ROUTES] Error en POST /app/usuarios/:id/resetear-password', { error: err.message })
    error = err.message
  }

  const users = await getAllUsers()
  res.type('html').send(await renderUsersList({ users, currentUserId: req.user.id, success, error }))
}))

export default router
