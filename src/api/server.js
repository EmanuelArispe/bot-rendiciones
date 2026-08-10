/**
 * Servidor HTTP para el formulario de setup de credenciales
 */

import express from 'express'
import credentialRoutes from './routes/credential-routes.js'
import logger from '../utils/logger.js'

export function createServer() {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/', credentialRoutes)

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