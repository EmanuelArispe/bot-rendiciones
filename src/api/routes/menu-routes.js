import { Router } from 'express'
import { requireUser } from '../middleware/require-user.js'
import { renderMenu } from '../../views/renderers/menu-renderer.js'

const router = Router()

router.get('/app', requireUser, async (req, res) => {
  res.type('html').send(await renderMenu({ token: req.token, user: req.user }))
})

export default router
