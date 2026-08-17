import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { requireUser } from '../middleware/require-user.js'
import { asyncHandler } from '../middleware/async-handler.js'
import { createMantenimientoExpense } from '../../services/expense-service.js'
import { renderMantenimientoForm } from '../../views/renderers/mantenimiento-form-renderer.js'
import { renderMessagePage, renderErrorPage } from '../../views/renderers/page-renderer.js'
import logger from '../../utils/logger.js'

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
    cb(null, file.mimetype.startsWith('image/'))
  },
})

function handleUpload(req, res, next) {
  upload.single('receipt')(req, res, (error) => {
    if (error) {
      logger.warn('[MANTENIMIENTO_ROUTES] Error subiendo el archivo', { error: error.message })
      return res.status(400).type('html').send(renderErrorPage('No se pudo subir la foto (¿es muy pesada?)'))
    }
    next()
  })
}

const router = Router()

router.get('/app/mantenimiento', requireUser, asyncHandler(async (req, res) => {
  res.type('html').send(await renderMantenimientoForm({}))
}))

router.post('/app/mantenimiento', requireUser, handleUpload, asyncHandler(async (req, res) => {
  const { date, description, amount, paymentMethod } = req.body || {}
  const values = { date, description, amount, paymentMethod }

  try {
    await createMantenimientoExpense(req.user, {
      date,
      description,
      amount,
      paymentMethod,
      receiptPath: req.file ? path.join(process.env.PHOTOS_DIR || './downloads', req.file.filename) : null,
    })

    res.type('html').send(
      renderMessagePage({
        title: 'Listo',
        heading: '✅ Mantenimiento guardado',
        body: `<a class="back-link" href="/app">← Volver al menú</a>`,
      })
    )
  } catch (error) {
    logger.error('[MANTENIMIENTO_ROUTES] Error en POST /app/mantenimiento', { error: error.message })
    res
      .status(400)
      .type('html')
      .send(await renderMantenimientoForm({ values, error: error.message }))
  }
}))

export default router
