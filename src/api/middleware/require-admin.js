import { renderErrorPage } from '../../views/renderers/page-renderer.js'

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).type('html').send(renderErrorPage('No tenés permiso para acceder a esta página'))
  }

  next()
}
