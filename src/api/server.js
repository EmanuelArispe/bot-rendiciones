/**
 * Servidor HTTP de la webapp
 */

import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth-routes.js'
import menuRoutes from './routes/menu-routes.js'
import credentialRoutes from './routes/credential-routes.js'
import rendicionRoutes from './routes/rendicion-routes.js'
import mantenimientoRoutes from './routes/mantenimiento-routes.js'
import adminRoutes from './routes/admin-routes.js'
import profileRoutes from './routes/profile-routes.js'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const viewsDir = path.join(__dirname, '../views')

export function createServer() {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser(process.env.SESSION_SECRET))

  app.use('/static', express.static(viewsDir))
  app.use('/', authRoutes)
  app.use('/', menuRoutes)
  app.use('/', credentialRoutes)
  app.use('/', rendicionRoutes)
  app.use('/', mantenimientoRoutes)
  app.use('/', adminRoutes)
  app.use('/', profileRoutes)

  return app
}

export function startServer(port) {
  const app = createServer()

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`🌐 Servidor de formularios escuchando en puerto ${port}`)
      resolve(server)
    })
  })
}
