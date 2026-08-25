import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const menuPath = path.join(__dirname, '../menu.html')

export async function renderMenu({ user }) {
  const html = await fs.readFile(menuPath, 'utf8')
  const greeting = user.firstName ? `Hola, ${user.firstName}` : 'Hola'
  const adminMenuItem = user.isAdmin ? '<li><a href="/app/usuarios">👥 Gestionar usuarios</a></li>' : ''

  const gpsWarning =
    user.gpsCredentialsStatus === 'INVALID_CREDENTIALS'
      ? '<p class="warning">⚠️ Tus credenciales de GPS dejaron de funcionar, así que el kilometraje no se está completando solo. <a href="/app/credenciales">Actualizalas acá</a>.</p>'
      : ''

  return html
    .replaceAll('{{GREETING}}', escapeHtml(greeting))
    .replaceAll('{{ADMIN_MENU_ITEM}}', adminMenuItem)
    .replaceAll('{{GPS_WARNING}}', gpsWarning)
}
