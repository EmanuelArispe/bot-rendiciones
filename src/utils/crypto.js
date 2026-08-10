/**
 * Cifrado simétrico reversible para credenciales (AES-256-GCM)
 * bcrypt no sirve acá: el bot necesita recuperar la contraseña en texto
 * plano para loguearse en GPS/Empresa vía Puppeteer.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getKey() {
  const secret = process.env.ENCRYPTION_KEY

  if (!secret) {
    throw new Error('ENCRYPTION_KEY no está configurada')
  }

  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [iv, authTag, encrypted].map((buf) => buf.toString('base64')).join('.')
}

export function decrypt(payload) {
  const [ivB64, authTagB64, dataB64] = (payload || '').split('.')

  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error('Payload cifrado inválido')
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
