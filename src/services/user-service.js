/**
 * Alta de usuarios y resolución por token de acceso
 */

import crypto from 'crypto'
import * as userRepository from '../db/user-repository.js'
import { DatabaseError } from '../utils/error-handler.js'

function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createUser({ email, firstName, lastName } = {}) {
  try {
    return await userRepository.create({
      email,
      firstName,
      lastName,
      accessToken: generateAccessToken(),
    })
  } catch (error) {
    throw new DatabaseError('No se pudo crear el usuario', { cause: error.message })
  }
}

export function getUserByAccessToken(token) {
  return userRepository.findByAccessToken(token)
}

export async function regenerateAccessToken(userId) {
  try {
    return await userRepository.update(userId, { accessToken: generateAccessToken() })
  } catch (error) {
    throw new DatabaseError('No se pudo regenerar el token de acceso', {
      userId,
      cause: error.message,
    })
  }
}
