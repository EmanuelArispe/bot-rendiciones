import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { escapeHtml } from './page-renderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const listPath = path.join(__dirname, '../users-list.html')

function renderRow(user, currentUserId) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—'
  const role = user.isAdmin ? 'Admin' : 'Usuario'
  const status = user.isActive
    ? '<span class="field-ok">Activo</span>'
    : '<span class="field-error">Inactivo</span>'

  let action = ''
  if (user.id !== currentUserId) {
    action = user.isActive
      ? `<form method="POST" action="/app/usuarios/${user.id}/desactivar"><button type="submit" class="danger-button">Desactivar</button></form>`
      : `<form method="POST" action="/app/usuarios/${user.id}/activar"><button type="submit">Activar</button></form>`
    action += `<form method="POST" action="/app/usuarios/${user.id}/resetear-password" onsubmit="return confirm('¿Resetear la contraseña de este usuario?')"><button type="submit">Resetear contraseña</button></form>`
  }

  return `<tr>
    <td>${escapeHtml(user.email)}</td>
    <td>${escapeHtml(name)}</td>
    <td>${role}</td>
    <td>${status}</td>
    <td>${action}</td>
  </tr>`
}

export async function renderUsersList({ users, currentUserId, error = '', success = '' }) {
  const html = await fs.readFile(listPath, 'utf8')

  return html
    .replaceAll('{{ERROR}}', error ? `<div class="error">${escapeHtml(error)}</div>` : '')
    .replaceAll('{{SUCCESS}}', success ? `<div class="field-ok">✅ ${escapeHtml(success)}</div>` : '')
    .replaceAll('{{USER_ROWS}}', users.map((user) => renderRow(user, currentUserId)).join(''))
}
