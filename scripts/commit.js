#!/usr/bin/env node

/**
 * Commit Helper Script
 * Crea commits automáticos siguiendo Conventional Commits
 * 
 * Uso: npm run commit
 */

import { execSync } from 'child_process'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const COMMIT_TYPES = ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore']

const SCOPES = [
  'whatsapp-bot',
  'gps-scraper',
  'ocr',
  'form-automation',
  'database',
  'credentials',
  'logger',
  'error-handler',
  'config',
  'api',
  'utils',
  'none',
]

/**
 * Pregunta interactiva
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim())
    })
  })
}

/**
 * Valida que el mensaje tenga máximo 72 caracteres
 */
function validateSummary(summary) {
  if (summary.length > 72) {
    console.error(`❌ Resumen muy largo (${summary.length}/72 caracteres)`)
    return false
  }
  if (summary.length === 0) {
    console.error('❌ El resumen no puede estar vacío')
    return false
  }
  return true
}

/**
 * Valida que el body tenga máximo 72 caracteres por línea
 */
function validateBody(body) {
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 72) {
      console.error(`❌ Línea ${i + 1} muy larga (${lines[i].length}/72 caracteres)`)
      return false
    }
  }
  return true
}

/**
 * Ver cambios staged
 */
function showStagedChanges() {
  try {
    console.log('\n📊 Cambios staged:\n')
    const output = execSync('git diff --cached --stat', { encoding: 'utf8' })
    console.log(output)
  } catch (error) {
    console.error('❌ Error al mostrar cambios:', error.message)
  }
}

/**
 * Verifica si hay cambios staged
 */
function checkStagedChanges() {
  try {
    execSync('git diff --cached --quiet')
    return false // No hay cambios
  } catch {
    return true // Hay cambios
  }
}

/**
 * Main
 */
async function main() {
  console.log('\n🔄 Creador de Commits - Conventional Commits\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Verificar si hay cambios staged
  if (!checkStagedChanges()) {
    console.log('⚠️ No hay cambios staged.')
    console.log('Primero haz: git add .\n')
    rl.close()
    process.exit(1)
  }

  // Mostrar cambios
  showStagedChanges()

  // Seleccionar tipo
  console.log('\n📋 Tipos disponibles:')
  COMMIT_TYPES.forEach((type, i) => {
    console.log(`   ${i + 1}. ${type}`)
  })

  let type = ''
  while (!COMMIT_TYPES.includes(type)) {
    const input = await question(
      `\n👉 Selecciona tipo (1-${COMMIT_TYPES.length}): `
    )
    const index = parseInt(input) - 1
    if (index >= 0 && index < COMMIT_TYPES.length) {
      type = COMMIT_TYPES[index]
    } else {
      console.log('❌ Opción inválida')
    }
  }

  // Seleccionar scope
  console.log('\n📋 Scopes disponibles:')
  SCOPES.forEach((scope, i) => {
    console.log(`   ${i + 1}. ${scope}`)
  })

  let scope = ''
  const scopeInput = await question(
    `\n👉 Selecciona scope (1-${SCOPES.length}) o escribe uno personalizado: `
  )
  const scopeIndex = parseInt(scopeInput) - 1
  if (scopeIndex >= 0 && scopeIndex < SCOPES.length) {
    scope = SCOPES[scopeIndex]
  } else {
    scope = scopeInput
  }

  if (scope === 'none') {
    scope = ''
  }

  // Resumen
  let summary = ''
  while (!validateSummary(summary)) {
    summary = await question(
      '\n👉 Resumen (máx 72 caracteres, lowercase, sin punto):\n   '
    )
    summary = summary.toLowerCase().replace(/\.$/, '')
  }

  // Body (opcional)
  let body = ''
  const needsBody = await question(
    '\n¿Necesita descripción adicional? (s/n): '
  )

  if (needsBody.toLowerCase() === 's') {
    console.log('   (Escribe el body y presiona Ctrl+D cuando termines)')
    let bodyInput = ''
    const bodyLines = []

    let isMultilineMode = false
    while (true) {
      const line = await question('   ')
      if (line === '' && isMultilineMode) break
      if (!isMultilineMode && line === '') continue
      isMultilineMode = true
      bodyLines.push(line)
      if (bodyLines.length > 0 && line === '') break
    }

    body = bodyLines.join('\n').trim()

    if (body && !validateBody(body)) {
      console.log('❌ Body inválido. Intenta de nuevo.')
      process.exit(1)
    }
  }

  // Construir mensaje
  let message = scope ? `${type}(${scope}): ${summary}` : `${type}: ${summary}`

  if (body) {
    message += `\n\n${body}`
  }

  // Mostrar preview
  console.log('\n📝 Mensaje del commit:\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(message)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Confirmar
  const confirm = await question('¿Hacer el commit? (s/n): ')

  if (confirm.toLowerCase() === 's') {
    try {
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
        stdio: 'inherit',
      })
      console.log('\n✅ Commit realizado exitosamente\n')
    } catch (error) {
      console.error('\n❌ Error al hacer el commit:', error.message)
      process.exit(1)
    }
  } else {
    console.log('\n⚠️ Commit cancelado\n')
  }

  rl.close()
}

// Ejecutar
main().catch((error) => {
  console.error('❌ Error:', error.message)
  rl.close()
  process.exit(1)
})
