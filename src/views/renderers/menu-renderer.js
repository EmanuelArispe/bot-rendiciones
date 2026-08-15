import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const menuPath = path.join(__dirname, '../menu.html')

export async function renderMenu({ token, user }) {
  const html = await fs.readFile(menuPath, 'utf8')
  const greeting = user.firstName ? `Hola, ${user.firstName}` : 'Hola'

  return html.replaceAll('{{TOKEN}}', escapeHtml(token)).replaceAll('{{GREETING}}', escapeHtml(greeting))
}
