/**
 * Upload de comprobantes (foto o PDF) compartido entre mantenimiento y los
 * gastos de un viaje. Guarda en PHOTOS_DIR con nombre único.
 */

import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import logger from '../../utils/logger.js'
import { renderErrorPage } from '../../views/renderers/page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const photosDir = path.join(__dirname, '../../..', process.env.PHOTOS_DIR || './downloads')

const upload = multer({
  storage: multer.diskStorage({
    destination: photosDir,
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname)}`
      cb(null, uniqueName)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf')
  },
})

export function handleReceiptUpload(fieldName) {
  const middleware = upload.single(fieldName)

  return function (req, res, next) {
    middleware(req, res, (error) => {
      if (error) {
        logger.warn('[RECEIPT_UPLOAD] Error subiendo el archivo', { error: error.message })
        return res
          .status(400)
          .type('html')
          .send(renderErrorPage('No se pudo subir la factura (¿es muy pesada o un formato no soportado?)'))
      }
      next()
    })
  }
}

/**
 * Arma el descriptor de comprobante que consumen los servicios de gastos a
 * partir del req.file de Multer (undefined si no se subió nada)
 */
export function toReceiptDescriptor(file) {
  if (!file) {
    return null
  }

  return {
    path: file.path,
    mimetype: file.mimetype,
    relativePath: path.join(process.env.PHOTOS_DIR || './downloads', file.filename),
  }
}
