import { getUserByAccessToken } from '../../services/user-service.js'
import { renderErrorPage } from '../../views/renderers/page-renderer.js'

export async function requireUser(req, res, next) {
  const token = req.method === 'GET' ? req.query.token : req.body?.token

  if (!token) {
    return res.status(400).type('html').send(renderErrorPage('Falta el token de acceso'))
  }

  const user = await getUserByAccessToken(token)

  if (!user) {
    return res.status(400).type('html').send(renderErrorPage('Token inválido'))
  }

  req.user = user
  req.token = token
  next()
}
