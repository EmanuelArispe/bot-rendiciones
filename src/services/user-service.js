/**
 * Alta de usuarios, login y resolución por token de sesión
 */

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import * as userRepository from '../db/user-repository.js'
import { DatabaseError, ValidationError } from '../utils/error-handler.js'

const BCRYPT_ROUNDS = 10
const MIN_PASSWORD_LENGTH = 8

function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createUser({ email, password, firstName, lastName, isAdmin = false } = {}) {
  if (!email?.trim()) {
    throw new ValidationError('El email es obligatorio')
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  }

  try {
    return await userRepository.create({
      email: email.trim(),
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      firstName,
      lastName,
      isAdmin,
      accessToken: generateAccessToken(),
    })
  } catch (error) {
    throw new DatabaseError('No se pudo crear el usuario', { cause: error.message })
  }
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await userRepository.findById(userId)

  if (!user) {
    throw new ValidationError('Usuario inválido')
  }

  const currentMatches = await bcrypt.compare(currentPassword || '', user.passwordHash)

  if (!currentMatches) {
    throw new ValidationError('La contraseña actual no es correcta')
  }

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`La contraseña nueva tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  }

  try {
    return await userRepository.update(userId, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
      accessToken: generateAccessToken(),
    })
  } catch (error) {
    throw new DatabaseError('No se pudo cambiar la contraseña', { userId, cause: error.message })
  }
}

export async function authenticate(email, password) {
  const user = await userRepository.findByEmail(email?.trim())

  if (!user) {
    return null
  }

  const passwordMatches = await bcrypt.compare(password || '', user.passwordHash)

  if (!passwordMatches || !user.isActive) {
    return null
  }

  await userRepository.update(user.id, { lastLogin: new Date() })

  return user
}

export function getUserByAccessToken(token) {
  return userRepository.findByAccessToken(token)
}

export function getAllUsers() {
  return userRepository.findAll()
}

export async function setUserActive(userId, isActive) {
  const data = { isActive }

  // Al desactivar, rota el accessToken para que cualquier cookie que ya tenga no siga sirviendo
  if (!isActive) {
    data.accessToken = generateAccessToken()
  }

  try {
    return await userRepository.update(userId, data)
  } catch (error) {
    throw new DatabaseError('No se pudo actualizar el estado del usuario', { userId, cause: error.message })
  }
}

export async function regenerateAccessToken(userId) {
  try {
    return await userRepository.update(userId, { accessToken: generateAccessToken() })
  } catch (error) {
    throw new DatabaseError('No se pudo regenerar el token de sesión', {
      userId,
      cause: error.message,
    })
  }
}
